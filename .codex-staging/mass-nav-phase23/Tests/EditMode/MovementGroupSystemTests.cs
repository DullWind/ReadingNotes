using MassNavigation.Core;
using MassNavigation.Groups;
using MassNavigation.Navigation;
using MassNavigation.Spatial;
using NUnit.Framework;
using UnityEngine;

namespace MassNavigation.Tests.EditMode
{
    public sealed class MovementGroupSystemTests
    {
        [Test]
        public void InfluenceRadius_GrowsAndStopsAtMaximum()
        {
            var storage = new MassUnitStorage(1);
            var groups = new MovementGroupSystem(storage, 1, 2f, 0.6f, 12f);
            Assert.That(groups.CalculateInfluenceRadius(1), Is.EqualTo(2f));
            Assert.That(groups.CalculateInfluenceRadius(10), Is.EqualTo(3.8f).Within(0.001f));
            Assert.That(groups.CalculateInfluenceRadius(100000), Is.EqualTo(12f));
        }

        [Test]
        public void Propagation_UsesOnlyMovingMembersFromCycleStart()
        {
            var storage = new MassUnitStorage(3);
            storage.TryCreate(Vector3.zero, TeamId.Player, out var leader);
            storage.TryCreate(new Vector3(1.5f, 0f, 0f), TeamId.Player, out var firstWave);
            storage.TryCreate(new Vector3(3.6f, 0f, 0f), TeamId.Player, out var secondWave);
            var spatial = new UniformSpatialGrid(1f, storage.Capacity);
            spatial.Rebuild(storage);
            var groups = new MovementGroupSystem(storage, 2);
            var groupId = groups.CreateGroup(leader, CreateField(TeamId.Player));
            Assert.That(groups.PropagateGroup(groupId, spatial), Is.EqualTo(1));
            Assert.That(storage.States[firstWave], Is.EqualTo(UnitState.Moving));
            Assert.That(storage.States[secondWave], Is.EqualTo(UnitState.Idle));
            Assert.That(groups.PropagateGroup(groupId, spatial), Is.EqualTo(1));
            Assert.That(storage.States[secondWave], Is.EqualTo(UnitState.Moving));
        }

        [Test]
        public void AttackingMember_DoesNotPropagate()
        {
            var storage = new MassUnitStorage(2);
            storage.TryCreate(Vector3.zero, TeamId.Player, out var leader);
            storage.TryCreate(Vector3.right, TeamId.Player, out var candidate);
            var spatial = new UniformSpatialGrid(1f, storage.Capacity);
            spatial.Rebuild(storage);
            var groups = new MovementGroupSystem(storage, 1);
            var groupId = groups.CreateGroup(leader, CreateField(TeamId.Player));
            storage.States[leader] = UnitState.Attacking;
            Assert.That(groups.PropagateGroup(groupId, spatial), Is.Zero);
            Assert.That(storage.States[candidate], Is.EqualTo(UnitState.Idle));
        }

        [Test]
        public void RemovingLastMember_ReleasesAndReusesGroupSlot()
        {
            var storage = new MassUnitStorage(1);
            storage.TryCreate(Vector3.zero, TeamId.Player, out var leader);
            var groups = new MovementGroupSystem(storage, 1);
            var firstId = groups.CreateGroup(leader, CreateField(TeamId.Player));
            Assert.That(groups.RemoveMember(leader), Is.True);
            Assert.That(groups.ActiveGroupCount, Is.Zero);
            Assert.That(groups.TryGetGroup(firstId, out _), Is.False);
            Assert.That(groups.CreateGroup(leader, CreateField(TeamId.Player)), Is.EqualTo(firstId));
        }

        private static FlowField CreateField(TeamId team)
        {
            var grid = new NavigationGrid(Vector3.zero, 8, 2, 1f);
            return new FlowFieldService(grid).GetOrCreate(new Vector2Int(7, 0), team);
        }
    }
}
