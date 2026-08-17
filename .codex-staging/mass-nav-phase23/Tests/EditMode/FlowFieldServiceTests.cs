using MassNavigation.Core;
using MassNavigation.Navigation;
using NUnit.Framework;
using UnityEngine;

namespace MassNavigation.Tests.EditMode
{
    public sealed class FlowFieldServiceTests
    {
        [Test]
        public void StraightField_PointsTowardSharedTargetAndReusesSameKey()
        {
            var grid = new NavigationGrid(Vector3.zero, 4, 1, 1f);
            var service = new FlowFieldService(grid);
            var first = service.GetOrCreate(new Vector2Int(3, 0), TeamId.Player);
            var second = service.GetOrCreate(new Vector2Int(3, 0), TeamId.Player);
            Assert.That(first, Is.SameAs(second));
            Assert.That(first.GetDirection(new Vector2Int(0, 0)), Is.EqualTo(Vector3.right));
            Assert.That(service.CacheCount, Is.EqualTo(1));
        }

        [Test]
        public void EnemyBuilding_RemainsDirectWhileFriendlyBuildingIsAvoided()
        {
            var enemyGrid = new NavigationGrid(Vector3.zero, 3, 3, 1f);
            enemyGrid.SetBuildingCell(new Vector2Int(1, 1), 1, TeamId.Enemy);
            var enemyField = new FlowFieldService(enemyGrid).GetOrCreate(new Vector2Int(2, 1), TeamId.Player);
            var friendlyGrid = new NavigationGrid(Vector3.zero, 3, 3, 1f);
            friendlyGrid.SetBuildingCell(new Vector2Int(1, 1), 2, TeamId.Player);
            var friendlyField = new FlowFieldService(friendlyGrid).GetOrCreate(new Vector2Int(2, 1), TeamId.Player);
            Assert.That(enemyField.GetDirection(new Vector2Int(0, 1)), Is.EqualTo(Vector3.right));
            Assert.That(friendlyField.GetDirection(new Vector2Int(0, 1)), Is.Not.EqualTo(Vector3.right));
            Assert.That(friendlyField.GetIntegrationCost(new Vector2Int(1, 1)), Is.EqualTo(FlowField.UnreachableCost));
        }

        [Test]
        public void DiagonalGap_DoesNotCutBetweenBlockedOrthogonalCells()
        {
            var grid = new NavigationGrid(Vector3.zero, 2, 2, 1f);
            grid.SetBuildingCell(new Vector2Int(1, 0), 1, TeamId.Player);
            grid.SetBuildingCell(new Vector2Int(0, 1), 2, TeamId.Player);
            var field = new FlowFieldService(grid).GetOrCreate(new Vector2Int(1, 1), TeamId.Player);
            Assert.That(field.GetDirection(Vector2Int.zero), Is.EqualTo(Vector3.zero));
            Assert.That(field.GetIntegrationCost(Vector2Int.zero), Is.EqualTo(FlowField.UnreachableCost));
        }

        [Test]
        public void CacheKey_DiffersByTeamAndNavigationVersion()
        {
            var grid = new NavigationGrid(Vector3.zero, 3, 1, 1f);
            var service = new FlowFieldService(grid);
            var player = service.GetOrCreate(new Vector2Int(2, 0), TeamId.Player);
            var enemy = service.GetOrCreate(new Vector2Int(2, 0), TeamId.Enemy);
            grid.SetBuildingCell(new Vector2Int(1, 0), 9, TeamId.Player);
            var changed = service.GetOrCreate(new Vector2Int(2, 0), TeamId.Player);
            Assert.That(enemy, Is.Not.SameAs(player));
            Assert.That(changed, Is.Not.SameAs(player));
            Assert.That(service.CacheCount, Is.EqualTo(3));
        }
    }
}
