using UnityEngine;

namespace MassNavigation.Spatial
{
    public interface ISpatialQuery
    {
        int QueryRadius(Vector3 center, float radius, int[] resultIds);

        bool TryFindNearest(Vector3 center, float radius, out int unitId);
    }
}
