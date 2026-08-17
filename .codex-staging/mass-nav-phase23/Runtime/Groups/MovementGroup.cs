using MassNavigation.Core;
using MassNavigation.Navigation;
using UnityEngine;

namespace MassNavigation.Groups
{
    public sealed class MovementGroup
    {
        internal MovementGroup(int id)
        {
            Id = id;
        }

        public int Id { get; }

        public bool IsActive { get; internal set; }

        public TeamId Team { get; internal set; }

        public Vector2Int TargetCell { get; internal set; }

        public FlowField FlowField { get; internal set; }

        public int MemberCount { get; internal set; }
    }
}
