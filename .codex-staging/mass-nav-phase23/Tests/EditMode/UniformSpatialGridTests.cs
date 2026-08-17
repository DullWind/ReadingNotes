using MassNavigation.Core;
using MassNavigation.Spatial;
using NUnit.Framework;
using UnityEngine;

namespace MassNavigation.Tests.EditMode
{
    public sealed class UniformSpatialGridTests
    {
        [Test]
        public void RadiusQuery_CrossesBucketsWithoutDuplicates()
        {
            var storage = new MassUnitStorage(4);
            storage.TryCreate(new Vector3(0.9f, 0f, 0f), TeamId.Player, out var first);
            storage.TryCreate(new Vector3(1.1f, 0f, 0f), TeamId.Player, out var second);
            storage.TryCreate(new Vector3(-0.9f, 0f, 0f), TeamId.Player, out var third);
            storage.TryCreate(new Vector3(3f, 0f, 0f), TeamId.Player, out _);
            var grid = new UniformSpatialGrid(1f, storage.Capacity);
            var results = new int[4];
            grid.Rebuild(storage);
            var count = grid.QueryRadius(Vector3.zero, 1.2f, results);
            Assert.That(count, Is.EqualTo(3));
            CollectionAssert.AreEquivalent(new[] { first, second, third }, new[] { results[0], results[1], results[2] });
        }

        [Test]
        public void FindNearest_UsesXZDistanceAndNegativeCells()
        {
            var storage = new MassUnitStorage(2);
            storage.TryCreate(new Vector3(-1.1f, 50f, -1.1f), TeamId.Player, out var nearest);
            storage.TryCreate(new Vector3(1.5f, 0f, 1.5f), TeamId.Player, out _);
            var grid = new UniformSpatialGrid(1f, storage.Capacity);
            grid.Rebuild(storage);
            Assert.That(grid.TryFindNearest(new Vector3(-1f, 0f, -1f), 3f, out var result), Is.True);
            Assert.That(result, Is.EqualTo(nearest));
            Assert.That(grid.TryFindNearest(new Vector3(20f, 0f, 20f), 1f, out _), Is.False);
        }

        [Test]
        public void Rebuild_MovesUnitWithoutRetainingOldBucketEntry()
        {
            var storage = new MassUnitStorage(1);
            storage.TryCreate(Vector3.zero, TeamId.Player, out var id);
            var grid = new UniformSpatialGrid(1f, storage.Capacity);
            var results = new int[1];
            grid.Rebuild(storage);
            storage.Positions[id] = new Vector3(10f, 0f, 0f);
            grid.Rebuild(storage);
            Assert.That(grid.QueryRadius(Vector3.zero, 1f, results), Is.Zero);
            Assert.That(grid.QueryRadius(new Vector3(10f, 0f, 0f), 1f, results), Is.EqualTo(1));
        }
    }
}
