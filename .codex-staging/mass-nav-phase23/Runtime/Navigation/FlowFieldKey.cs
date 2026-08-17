using System;
using MassNavigation.Core;
using UnityEngine;

namespace MassNavigation.Navigation
{
    public readonly struct FlowFieldKey : IEquatable<FlowFieldKey>
    {
        public FlowFieldKey(Vector2Int targetCell, TeamId team, int navigationVersion)
        {
            TargetCell = targetCell;
            Team = team;
            NavigationVersion = navigationVersion;
        }

        public Vector2Int TargetCell { get; }

        public TeamId Team { get; }

        public int NavigationVersion { get; }

        public bool Equals(FlowFieldKey other)
        {
            return TargetCell == other.TargetCell && Team == other.Team && NavigationVersion == other.NavigationVersion;
        }

        public override bool Equals(object obj)
        {
            return obj is FlowFieldKey other && Equals(other);
        }

        public override int GetHashCode()
        {
            unchecked
            {
                var hash = TargetCell.GetHashCode();
                hash = (hash * 397) ^ (int)Team;
                hash = (hash * 397) ^ NavigationVersion;
                return hash;
            }
        }

        public static bool operator ==(FlowFieldKey left, FlowFieldKey right)
        {
            return left.Equals(right);
        }

        public static bool operator !=(FlowFieldKey left, FlowFieldKey right)
        {
            return !left.Equals(right);
        }
    }
}
