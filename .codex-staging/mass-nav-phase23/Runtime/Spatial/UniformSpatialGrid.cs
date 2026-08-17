using System;
using System.Collections.Generic;
using MassNavigation.Core;
using UnityEngine;

namespace MassNavigation.Spatial
{
    public sealed class UniformSpatialGrid : ISpatialQuery
    {
        private sealed class Bucket
        {
            private int[] ids = new int[4];

            public int Count { get; private set; }

            public int this[int index] => ids[index];

            public void Clear()
            {
                Count = 0;
            }

            public void Add(int unitId)
            {
                if (Count == ids.Length)
                {
                    Array.Resize(ref ids, ids.Length * 2);
                }

                ids[Count++] = unitId;
            }
        }

        private readonly Dictionary<long, Bucket> buckets;
        private readonly List<Bucket> usedBuckets;
        private MassUnitStorage storage;

        public UniformSpatialGrid(float cellSize, int expectedUnitCount, Vector3 origin)
        {
            if (cellSize <= 0f)
            {
                throw new ArgumentOutOfRangeException(nameof(cellSize));
            }

            if (expectedUnitCount < 0)
            {
                throw new ArgumentOutOfRangeException(nameof(expectedUnitCount));
            }

            CellSize = cellSize;
            Origin = origin;
            var expectedBuckets = Mathf.Max(4, expectedUnitCount / 4);
            buckets = new Dictionary<long, Bucket>(expectedBuckets);
            usedBuckets = new List<Bucket>(expectedBuckets);
        }

        public UniformSpatialGrid(float cellSize, int expectedUnitCount)
            : this(cellSize, expectedUnitCount, Vector3.zero)
        {
        }

        public float CellSize { get; }

        public Vector3 Origin { get; }

        public int OccupiedBucketCount => usedBuckets.Count;

        public void Rebuild(MassUnitStorage source)
        {
            storage = source ?? throw new ArgumentNullException(nameof(source));
            for (var i = 0; i < usedBuckets.Count; i++)
            {
                usedBuckets[i].Clear();
            }

            usedBuckets.Clear();

            for (var unitId = 0; unitId < source.Capacity; unitId++)
            {
                if (!source.IsValid(unitId))
                {
                    continue;
                }

                var cell = WorldToCell(source.Positions[unitId]);
                var key = Encode(cell.x, cell.y);
                if (!buckets.TryGetValue(key, out var bucket))
                {
                    bucket = new Bucket();
                    buckets.Add(key, bucket);
                }

                if (bucket.Count == 0)
                {
                    usedBuckets.Add(bucket);
                }

                bucket.Add(unitId);
            }
        }

        public int QueryRadius(Vector3 center, float radius, int[] resultIds)
        {
            if (storage == null)
            {
                throw new InvalidOperationException("Rebuild must be called before querying the spatial grid.");
            }

            if (radius < 0f)
            {
                throw new ArgumentOutOfRangeException(nameof(radius));
            }

            if (resultIds == null)
            {
                throw new ArgumentNullException(nameof(resultIds));
            }

            if (resultIds.Length == 0)
            {
                return 0;
            }

            var min = WorldToCell(new Vector3(center.x - radius, center.y, center.z - radius));
            var max = WorldToCell(new Vector3(center.x + radius, center.y, center.z + radius));
            var radiusSquared = radius * radius;
            var resultCount = 0;

            for (var y = min.y; y <= max.y; y++)
            {
                for (var x = min.x; x <= max.x; x++)
                {
                    if (!buckets.TryGetValue(Encode(x, y), out var bucket) || bucket.Count == 0)
                    {
                        continue;
                    }

                    for (var i = 0; i < bucket.Count; i++)
                    {
                        var unitId = bucket[i];
                        if (!storage.IsValid(unitId))
                        {
                            continue;
                        }

                        var delta = storage.Positions[unitId] - center;
                        var distanceSquared = delta.x * delta.x + delta.z * delta.z;
                        if (distanceSquared > radiusSquared)
                        {
                            continue;
                        }

                        resultIds[resultCount++] = unitId;
                        if (resultCount == resultIds.Length)
                        {
                            return resultCount;
                        }
                    }
                }
            }

            return resultCount;
        }

        public bool TryFindNearest(Vector3 center, float radius, out int unitId)
        {
            if (storage == null)
            {
                throw new InvalidOperationException("Rebuild must be called before querying the spatial grid.");
            }

            if (radius < 0f)
            {
                throw new ArgumentOutOfRangeException(nameof(radius));
            }

            var min = WorldToCell(new Vector3(center.x - radius, center.y, center.z - radius));
            var max = WorldToCell(new Vector3(center.x + radius, center.y, center.z + radius));
            var bestDistanceSquared = radius * radius;
            unitId = MassUnitStorage.InvalidId;

            for (var y = min.y; y <= max.y; y++)
            {
                for (var x = min.x; x <= max.x; x++)
                {
                    if (!buckets.TryGetValue(Encode(x, y), out var bucket) || bucket.Count == 0)
                    {
                        continue;
                    }

                    for (var i = 0; i < bucket.Count; i++)
                    {
                        var candidateId = bucket[i];
                        if (!storage.IsValid(candidateId))
                        {
                            continue;
                        }

                        var delta = storage.Positions[candidateId] - center;
                        var distanceSquared = delta.x * delta.x + delta.z * delta.z;
                        if (distanceSquared > bestDistanceSquared)
                        {
                            continue;
                        }

                        if (distanceSquared == bestDistanceSquared && unitId != MassUnitStorage.InvalidId && candidateId >= unitId)
                        {
                            continue;
                        }

                        bestDistanceSquared = distanceSquared;
                        unitId = candidateId;
                    }
                }
            }

            return unitId != MassUnitStorage.InvalidId;
        }

        private Vector2Int WorldToCell(Vector3 position)
        {
            return new Vector2Int(
                Mathf.FloorToInt((position.x - Origin.x) / CellSize),
                Mathf.FloorToInt((position.z - Origin.z) / CellSize));
        }

        private static long Encode(int x, int y)
        {
            return ((long)x << 32) | (uint)y;
        }
    }
}
