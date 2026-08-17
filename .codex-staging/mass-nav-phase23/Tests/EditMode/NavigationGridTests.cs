using MassNavigation.Core;
using MassNavigation.Navigation;
using NUnit.Framework;
using UnityEngine;

namespace MassNavigation.Tests.EditMode
{
    public sealed class NavigationGridTests
    {
        [Test]
        public void WorldCellConversion_UsesXZAndClampsOutsideMap()
        {
            var grid = new NavigationGrid(new Vector3(10f, 2f, 20f), 4, 3, 2f);
            Assert.That(grid.WorldToCell(new Vector3(12.1f, 99f, 24.1f)), Is.EqualTo(new Vector2Int(1, 2)));
            Assert.That(grid.WorldToCell(new Vector3(-50f, 0f, 200f)), Is.EqualTo(new Vector2Int(0, 2)));
            Assert.That(grid.CellToWorldCenter(new Vector2Int(1, 2)), Is.EqualTo(new Vector3(13f, 2f, 25f)));
        }

        [Test]
        public void Walkability_BlocksFriendlyAndNeutralButAllowsEnemyBuilding()
        {
            var grid = new NavigationGrid(Vector3.zero, 4, 1, 1f);
            grid.SetBuildingCell(new Vector2Int(0, 0), 10, TeamId.Player);
            grid.SetBuildingCell(new Vector2Int(1, 0), 11, TeamId.Neutral);
            grid.SetBuildingCell(new Vector2Int(2, 0), 12, TeamId.Enemy);
            Assert.That(grid.IsWalkable(new Vector2Int(0, 0), TeamId.Player), Is.False);
            Assert.That(grid.IsWalkable(new Vector2Int(1, 0), TeamId.Player), Is.False);
            Assert.That(grid.IsWalkable(new Vector2Int(2, 0), TeamId.Player), Is.True);
            Assert.That(grid.IsWalkable(new Vector2Int(0, 0), TeamId.Enemy), Is.True);
        }

        [Test]
        public void RemovingBuilding_ClearsMatchingCellsAndBumpsVersion()
        {
            var grid = new NavigationGrid(Vector3.zero, 3, 2, 1f);
            grid.SetBuildingFootprint(5, TeamId.Player, Vector2Int.zero, new Vector2Int(2, 2));
            var occupiedVersion = grid.Version;
            Assert.That(grid.RemoveBuilding(5), Is.True);
            Assert.That(grid.GetBuildingId(Vector2Int.zero), Is.EqualTo(NavigationGrid.NoBuilding));
            Assert.That(grid.Version, Is.EqualTo(occupiedVersion + 1));
            Assert.That(grid.RemoveBuilding(5), Is.False);
        }
    }
}
