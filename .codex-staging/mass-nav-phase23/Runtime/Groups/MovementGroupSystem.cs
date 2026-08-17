using System;
using MassNavigation.Core;
using MassNavigation.Navigation;
using MassNavigation.Spatial;
using UnityEngine;

namespace MassNavigation.Groups
{
    public sealed class MovementGroupSystem
    {
        private readonly MassUnitStorage storage;
        private readonly MovementGroup[] groups;
        private readonly int[] freeGroupIds;
        private readonly int[] propagationSnapshot;
        private readonly int[] queryResults;
        private int freeGroupCount;

        public MovementGroupSystem(
            MassUnitStorage storage,
            int maxGroups,
            float baseRadius = 2f,
            float growth = 0.6f,
            float maxRadius = 12f)
        {
            this.storage = storage ?? throw new ArgumentNullException(nameof(storage));
            if (maxGroups <= 0)
            {
                throw new ArgumentOutOfRangeException(nameof(maxGroups));
            }

            if (baseRadius < 0f)
            {
                throw new ArgumentOutOfRangeException(nameof(baseRadius));
            }

            if (growth < 0f)
            {
                throw new ArgumentOutOfRangeException(nameof(growth));
            }

            if (maxRadius < baseRadius)
            {
                throw new ArgumentOutOfRangeException(nameof(maxRadius));
            }

            BaseRadius = baseRadius;
            Growth = growth;
            MaxRadius = maxRadius;
            groups = new MovementGroup[maxGroups];
            freeGroupIds = new int[maxGroups];
            propagationSnapshot = new int[storage.Capacity];
            queryResults = new int[storage.Capacity];
            freeGroupCount = maxGroups;

            for (var i = 0; i < maxGroups; i++)
            {
                groups[i] = new MovementGroup(i);
                freeGroupIds[i] = maxGroups - i - 1;
            }
        }

        public float BaseRadius { get; }

        public float Growth { get; }

        public float MaxRadius { get; }

        public int ActiveGroupCount { get; private set; }

        public int CreateGroup(int leaderUnitId, FlowField flowField)
        {
            if (!storage.IsValid(leaderUnitId))
            {
                throw new ArgumentOutOfRangeException(nameof(leaderUnitId));
            }

            if (flowField == null)
            {
                throw new ArgumentNullException(nameof(flowField));
            }

            if (freeGroupCount == 0)
            {
                return MassUnitStorage.InvalidId;
            }

            DetachFromCurrentGroup(leaderUnitId);
            var groupId = freeGroupIds[--freeGroupCount];
            var group = groups[groupId];
            group.IsActive = true;
            group.Team = storage.Teams[leaderUnitId];
            group.TargetCell = flowField.TargetCell;
            group.FlowField = flowField;
            group.MemberCount = 1;
            storage.GroupIds[leaderUnitId] = groupId;
            storage.States[leaderUnitId] = UnitState.Moving;
            ActiveGroupCount++;
            return groupId;
        }

        public bool TryGetGroup(int groupId, out MovementGroup group)
        {
            if ((uint)groupId < (uint)groups.Length && groups[groupId].IsActive)
            {
                group = groups[groupId];
                return true;
            }

            group = null;
            return false;
        }

        public bool TryAddMember(int groupId, int unitId)
        {
            if (!TryGetGroup(groupId, out var group) || !storage.IsValid(unitId))
            {
                return false;
            }

            if (storage.States[unitId] != UnitState.Idle || storage.Teams[unitId] != group.Team)
            {
                return false;
            }

            if (storage.GroupIds[unitId] != MassUnitStorage.InvalidId)
            {
                return false;
            }

            storage.GroupIds[unitId] = groupId;
            storage.States[unitId] = UnitState.Moving;
            group.MemberCount++;
            return true;
        }

        public bool RemoveMember(int unitId)
        {
            if (!storage.IsValid(unitId))
            {
                return false;
            }

            var groupId = storage.GroupIds[unitId];
            if (!TryGetGroup(groupId, out var group))
            {
                storage.GroupIds[unitId] = MassUnitStorage.InvalidId;
                return false;
            }

            storage.GroupIds[unitId] = MassUnitStorage.InvalidId;
            group.MemberCount--;
            if (group.MemberCount <= 0)
            {
                ReleaseGroup(groupId);
            }

            return true;
        }

        public int PropagateAll(ISpatialQuery spatialQuery)
        {
            if (spatialQuery == null)
            {
                throw new ArgumentNullException(nameof(spatialQuery));
            }

            var recruited = 0;
            for (var groupId = 0; groupId < groups.Length; groupId++)
            {
                if (groups[groupId].IsActive)
                {
                    recruited += PropagateGroup(groupId, spatialQuery);
                }
            }

            return recruited;
        }

        public int PropagateGroup(int groupId, ISpatialQuery spatialQuery)
        {
            if (spatialQuery == null)
            {
                throw new ArgumentNullException(nameof(spatialQuery));
            }

            if (!TryGetGroup(groupId, out var group))
            {
                return 0;
            }

            var snapshotCount = 0;
            for (var unitId = 0; unitId < storage.Capacity; unitId++)
            {
                if (!storage.IsValid(unitId)
                    || storage.GroupIds[unitId] != groupId
                    || storage.States[unitId] != UnitState.Moving)
                {
                    continue;
                }

                propagationSnapshot[snapshotCount++] = unitId;
            }

            var radius = CalculateInfluenceRadius(group.MemberCount);
            var recruited = 0;
            for (var i = 0; i < snapshotCount; i++)
            {
                var sourceId = propagationSnapshot[i];
                var candidateCount = spatialQuery.QueryRadius(storage.Positions[sourceId], radius, queryResults);
                for (var candidateIndex = 0; candidateIndex < candidateCount; candidateIndex++)
                {
                    if (TryAddMember(groupId, queryResults[candidateIndex]))
                    {
                        recruited++;
                    }
                }
            }

            return recruited;
        }

        public float CalculateInfluenceRadius(int memberCount)
        {
            if (memberCount <= 1)
            {
                return BaseRadius;
            }

            return Mathf.Min(MaxRadius, BaseRadius + Growth * Mathf.Sqrt(memberCount - 1f));
        }

        private void DetachFromCurrentGroup(int unitId)
        {
            var oldGroupId = storage.GroupIds[unitId];
            if (TryGetGroup(oldGroupId, out var oldGroup))
            {
                storage.GroupIds[unitId] = MassUnitStorage.InvalidId;
                oldGroup.MemberCount--;
                if (oldGroup.MemberCount <= 0)
                {
                    ReleaseGroup(oldGroupId);
                }
            }
            else
            {
                storage.GroupIds[unitId] = MassUnitStorage.InvalidId;
            }
        }

        private void ReleaseGroup(int groupId)
        {
            var group = groups[groupId];
            if (!group.IsActive)
            {
                return;
            }

            group.IsActive = false;
            group.MemberCount = 0;
            group.FlowField = null;
            group.TargetCell = default;
            freeGroupIds[freeGroupCount++] = groupId;
            ActiveGroupCount--;
        }
    }
}
