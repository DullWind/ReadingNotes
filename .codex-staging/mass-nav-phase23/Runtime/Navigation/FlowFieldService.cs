using System;
using System.Collections.Generic;
using MassNavigation.Core;
using UnityEngine;

namespace MassNavigation.Navigation
{
    public sealed class FlowFieldService
    {
        private const int StraightCost = 10;
        private const int DiagonalCost = 14;

        private static readonly int[] NeighborX = { -1, 0, 1, -1, 1, -1, 0, 1 };
        private static readonly int[] NeighborY = { -1, -1, -1, 0, 0, 1, 1, 1 };

        private readonly NavigationGrid grid;
        private readonly Dictionary<FlowFieldKey, FlowField> cache = new Dictionary<FlowFieldKey, FlowField>();
        private readonly MinHeap heap;

        public FlowFieldService(NavigationGrid grid)
        {
            this.grid = grid ?? throw new ArgumentNullException(nameof(grid));
            heap = new MinHeap(Mathf.Max(16, grid.CellCount));
        }

        public int CacheCount => cache.Count;

        public FlowField GetOrCreate(Vector2Int requestedTargetCell, TeamId team)
        {
            var clampedTarget = grid.ClampCell(requestedTargetCell);
            var key = new FlowFieldKey(clampedTarget, team, grid.Version);
            if (cache.TryGetValue(key, out var existing))
            {
                return existing;
            }

            var targetCell = FindNearestWalkable(clampedTarget, team);
            var costs = new int[grid.CellCount];
            var directions = new Vector2[grid.CellCount];
            for (var i = 0; i < costs.Length; i++)
            {
                costs[i] = FlowField.UnreachableCost;
            }

            BuildIntegrationField(targetCell, team, costs);
            BuildDirectionField(team, costs, directions);

            var field = new FlowField(grid, key, targetCell, costs, directions);
            cache.Add(key, field);
            return field;
        }

        public FlowField GetOrCreate(Vector3 requestedTargetWorld, TeamId team)
        {
            return GetOrCreate(grid.WorldToCell(requestedTargetWorld), team);
        }

        public void ClearCache()
        {
            cache.Clear();
        }

        private Vector2Int FindNearestWalkable(Vector2Int target, TeamId team)
        {
            if (grid.IsWalkable(target, team))
            {
                return target;
            }

            var maxRadius = Mathf.Max(grid.Width, grid.Height);
            for (var radius = 1; radius <= maxRadius; radius++)
            {
                var minX = Mathf.Max(0, target.x - radius);
                var maxX = Mathf.Min(grid.Width - 1, target.x + radius);
                var minY = Mathf.Max(0, target.y - radius);
                var maxY = Mathf.Min(grid.Height - 1, target.y + radius);

                for (var x = minX; x <= maxX; x++)
                {
                    var bottom = new Vector2Int(x, minY);
                    if (grid.IsWalkable(bottom, team))
                    {
                        return bottom;
                    }

                    var top = new Vector2Int(x, maxY);
                    if (maxY != minY && grid.IsWalkable(top, team))
                    {
                        return top;
                    }
                }

                for (var y = minY + 1; y < maxY; y++)
                {
                    var left = new Vector2Int(minX, y);
                    if (grid.IsWalkable(left, team))
                    {
                        return left;
                    }

                    var right = new Vector2Int(maxX, y);
                    if (maxX != minX && grid.IsWalkable(right, team))
                    {
                        return right;
                    }
                }
            }

            return target;
        }

        private void BuildIntegrationField(Vector2Int target, TeamId team, int[] costs)
        {
            if (!grid.IsWalkable(target, team))
            {
                return;
            }

            heap.Clear();
            var targetIndex = grid.GetIndex(target);
            costs[targetIndex] = 0;
            heap.Push(targetIndex, 0);

            while (heap.TryPop(out var currentIndex, out var queuedCost))
            {
                if (queuedCost != costs[currentIndex])
                {
                    continue;
                }

                var current = grid.GetCell(currentIndex);
                for (var i = 0; i < NeighborX.Length; i++)
                {
                    var next = new Vector2Int(current.x + NeighborX[i], current.y + NeighborY[i]);
                    if (!CanTraverse(current, next, team))
                    {
                        continue;
                    }

                    var stepCost = NeighborX[i] != 0 && NeighborY[i] != 0 ? DiagonalCost : StraightCost;
                    var nextCost = queuedCost + stepCost;
                    var nextIndex = grid.GetIndex(next);
                    if (nextCost >= costs[nextIndex])
                    {
                        continue;
                    }

                    costs[nextIndex] = nextCost;
                    heap.Push(nextIndex, nextCost);
                }
            }
        }

        private void BuildDirectionField(TeamId team, int[] costs, Vector2[] directions)
        {
            for (var index = 0; index < costs.Length; index++)
            {
                if (costs[index] == FlowField.UnreachableCost || costs[index] == 0)
                {
                    directions[index] = Vector2.zero;
                    continue;
                }

                var current = grid.GetCell(index);
                var bestScore = int.MaxValue;
                var bestDirection = Vector2.zero;
                for (var i = 0; i < NeighborX.Length; i++)
                {
                    var next = new Vector2Int(current.x + NeighborX[i], current.y + NeighborY[i]);
                    if (!CanTraverse(current, next, team))
                    {
                        continue;
                    }

                    var nextCost = costs[grid.GetIndex(next)];
                    if (nextCost == FlowField.UnreachableCost)
                    {
                        continue;
                    }

                    var stepCost = NeighborX[i] != 0 && NeighborY[i] != 0 ? DiagonalCost : StraightCost;
                    var score = nextCost + stepCost;
                    if (nextCost >= costs[index] || score >= bestScore)
                    {
                        continue;
                    }

                    bestScore = score;
                    bestDirection = new Vector2(NeighborX[i], NeighborY[i]).normalized;
                }

                directions[index] = bestDirection;
            }
        }

        private bool CanTraverse(Vector2Int from, Vector2Int to, TeamId team)
        {
            if (!grid.IsWalkable(to, team))
            {
                return false;
            }

            var dx = to.x - from.x;
            var dy = to.y - from.y;
            if (dx == 0 || dy == 0)
            {
                return true;
            }

            return grid.IsWalkable(new Vector2Int(from.x + dx, from.y), team)
                && grid.IsWalkable(new Vector2Int(from.x, from.y + dy), team);
        }

        private sealed class MinHeap
        {
            private int[] indices;
            private int[] priorities;
            private int count;

            public MinHeap(int capacity)
            {
                indices = new int[capacity];
                priorities = new int[capacity];
            }

            public void Clear()
            {
                count = 0;
            }

            public void Push(int index, int priority)
            {
                EnsureCapacity(count + 1);
                var cursor = count++;
                while (cursor > 0)
                {
                    var parent = (cursor - 1) / 2;
                    if (priorities[parent] <= priority)
                    {
                        break;
                    }

                    indices[cursor] = indices[parent];
                    priorities[cursor] = priorities[parent];
                    cursor = parent;
                }

                indices[cursor] = index;
                priorities[cursor] = priority;
            }

            public bool TryPop(out int index, out int priority)
            {
                if (count == 0)
                {
                    index = -1;
                    priority = 0;
                    return false;
                }

                index = indices[0];
                priority = priorities[0];
                count--;
                if (count == 0)
                {
                    return true;
                }

                var tailIndex = indices[count];
                var tailPriority = priorities[count];
                var cursor = 0;
                while (true)
                {
                    var left = cursor * 2 + 1;
                    if (left >= count)
                    {
                        break;
                    }

                    var right = left + 1;
                    var child = right < count && priorities[right] < priorities[left] ? right : left;
                    if (priorities[child] >= tailPriority)
                    {
                        break;
                    }

                    indices[cursor] = indices[child];
                    priorities[cursor] = priorities[child];
                    cursor = child;
                }

                indices[cursor] = tailIndex;
                priorities[cursor] = tailPriority;
                return true;
            }

            private void EnsureCapacity(int required)
            {
                if (required <= indices.Length)
                {
                    return;
                }

                var newCapacity = Mathf.Max(required, indices.Length * 2);
                Array.Resize(ref indices, newCapacity);
                Array.Resize(ref priorities, newCapacity);
            }
        }
    }
}
