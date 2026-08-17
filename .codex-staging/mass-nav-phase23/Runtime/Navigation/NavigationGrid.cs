using System;
using MassNavigation.Core;
using UnityEngine;

namespace MassNavigation.Navigation
{
    public sealed class NavigationGrid
    {
        public const int NoBuilding = -1;

        private readonly int[] buildingIds;
        private readonly TeamId[] buildingTeams;

        public NavigationGrid(Vector3 origin, int width, int height, float cellSize)
        {
            if (width <= 0)
            {
                throw new ArgumentOutOfRangeException(nameof(width));
            }

            if (height <= 0)
            {
                throw new ArgumentOutOfRangeException(nameof(height));
            }

            if (cellSize <= 0f)
            {
                throw new ArgumentOutOfRangeException(nameof(cellSize));
            }

            Origin = origin;
            Width = width;
            Height = height;
            CellSize = cellSize;
            buildingIds = new int[width * height];
            buildingTeams = new TeamId[width * height];

            for (var i = 0; i < buildingIds.Length; i++)
            {
                buildingIds[i] = NoBuilding;
            }
        }

        public Vector3 Origin { get; }

        public int Width { get; }

        public int Height { get; }

        public int CellCount => buildingIds.Length;

        public float CellSize { get; }

        public int Version { get; private set; }

        public Vector2Int WorldToCell(Vector3 worldPosition)
        {
            var x = Mathf.FloorToInt((worldPosition.x - Origin.x) / CellSize);
            var y = Mathf.FloorToInt((worldPosition.z - Origin.z) / CellSize);
            return ClampCell(new Vector2Int(x, y));
        }

        public bool TryWorldToCell(Vector3 worldPosition, out Vector2Int cell)
        {
            var x = Mathf.FloorToInt((worldPosition.x - Origin.x) / CellSize);
            var y = Mathf.FloorToInt((worldPosition.z - Origin.z) / CellSize);
            cell = new Vector2Int(x, y);
            return IsInBounds(cell);
        }

        public Vector3 CellToWorldCenter(Vector2Int cell)
        {
            cell = ClampCell(cell);
            return new Vector3(
                Origin.x + (cell.x + 0.5f) * CellSize,
                Origin.y,
                Origin.z + (cell.y + 0.5f) * CellSize);
        }

        public Vector2Int ClampCell(Vector2Int cell)
        {
            return new Vector2Int(
                Mathf.Clamp(cell.x, 0, Width - 1),
                Mathf.Clamp(cell.y, 0, Height - 1));
        }

        public bool IsInBounds(Vector2Int cell)
        {
            return (uint)cell.x < (uint)Width && (uint)cell.y < (uint)Height;
        }

        public int GetIndex(Vector2Int cell)
        {
            if (!IsInBounds(cell))
            {
                throw new ArgumentOutOfRangeException(nameof(cell));
            }

            return cell.y * Width + cell.x;
        }

        public Vector2Int GetCell(int index)
        {
            if ((uint)index >= (uint)CellCount)
            {
                throw new ArgumentOutOfRangeException(nameof(index));
            }

            return new Vector2Int(index % Width, index / Width);
        }

        public bool IsWalkable(Vector2Int cell, TeamId movingTeam)
        {
            if (!IsInBounds(cell))
            {
                return false;
            }

            var index = GetIndex(cell);
            if (buildingIds[index] == NoBuilding)
            {
                return true;
            }

            var buildingTeam = buildingTeams[index];
            return buildingTeam != TeamId.Neutral && buildingTeam != movingTeam;
        }

        public int GetBuildingId(Vector2Int cell)
        {
            return IsInBounds(cell) ? buildingIds[GetIndex(cell)] : NoBuilding;
        }

        public TeamId GetBuildingTeam(Vector2Int cell)
        {
            return IsInBounds(cell) ? buildingTeams[GetIndex(cell)] : TeamId.Neutral;
        }

        public void SetBuildingCell(Vector2Int cell, int buildingId, TeamId team)
        {
            if (!IsInBounds(cell))
            {
                throw new ArgumentOutOfRangeException(nameof(cell));
            }

            if (buildingId < 0)
            {
                throw new ArgumentOutOfRangeException(nameof(buildingId));
            }

            var index = GetIndex(cell);
            if (buildingIds[index] == buildingId && buildingTeams[index] == team)
            {
                return;
            }

            buildingIds[index] = buildingId;
            buildingTeams[index] = team;
            Version++;
        }

        public void SetBuildingFootprint(int buildingId, TeamId team, Vector2Int minInclusive, Vector2Int maxExclusive)
        {
            if (buildingId < 0)
            {
                throw new ArgumentOutOfRangeException(nameof(buildingId));
            }

            var minX = Mathf.Clamp(minInclusive.x, 0, Width);
            var minY = Mathf.Clamp(minInclusive.y, 0, Height);
            var maxX = Mathf.Clamp(maxExclusive.x, 0, Width);
            var maxY = Mathf.Clamp(maxExclusive.y, 0, Height);
            var changed = false;

            for (var y = minY; y < maxY; y++)
            {
                for (var x = minX; x < maxX; x++)
                {
                    var index = y * Width + x;
                    if (buildingIds[index] == buildingId && buildingTeams[index] == team)
                    {
                        continue;
                    }

                    buildingIds[index] = buildingId;
                    buildingTeams[index] = team;
                    changed = true;
                }
            }

            if (changed)
            {
                Version++;
            }
        }

        public bool RemoveBuilding(int buildingId)
        {
            var changed = false;
            for (var i = 0; i < buildingIds.Length; i++)
            {
                if (buildingIds[i] != buildingId)
                {
                    continue;
                }

                buildingIds[i] = NoBuilding;
                buildingTeams[i] = TeamId.Neutral;
                changed = true;
            }

            if (changed)
            {
                Version++;
            }

            return changed;
        }
    }
}
