using System;
using UnityEngine;

namespace MassNavigation.Navigation
{
    public sealed class FlowField
    {
        public const int UnreachableCost = int.MaxValue;

        private readonly int[] integrationCosts;
        private readonly Vector2[] directions;

        internal FlowField(
            NavigationGrid grid,
            FlowFieldKey key,
            Vector2Int resolvedTargetCell,
            int[] integrationCosts,
            Vector2[] directions)
        {
            Grid = grid ?? throw new ArgumentNullException(nameof(grid));
            Key = key;
            TargetCell = resolvedTargetCell;
            this.integrationCosts = integrationCosts ?? throw new ArgumentNullException(nameof(integrationCosts));
            this.directions = directions ?? throw new ArgumentNullException(nameof(directions));
        }

        public NavigationGrid Grid { get; }

        public FlowFieldKey Key { get; }

        public Vector2Int TargetCell { get; }

        public int GetIntegrationCost(Vector2Int cell)
        {
            return Grid.IsInBounds(cell) ? integrationCosts[Grid.GetIndex(cell)] : UnreachableCost;
        }

        public Vector3 GetDirection(Vector2Int cell)
        {
            if (!Grid.IsInBounds(cell))
            {
                return Vector3.zero;
            }

            var direction = directions[Grid.GetIndex(cell)];
            return new Vector3(direction.x, 0f, direction.y);
        }

        public Vector3 SampleDirection(Vector3 worldPosition)
        {
            if (!Grid.TryWorldToCell(worldPosition, out var cell))
            {
                return Vector3.zero;
            }

            return GetDirection(cell);
        }
    }
}
