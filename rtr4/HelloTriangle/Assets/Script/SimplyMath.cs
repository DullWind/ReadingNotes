using UnityEngine;

public static class SimplyMath
{
    private const float Pi = 3.14159265358979323846f;

    public static float DegreesToRadians(float degrees)
    {
        return degrees * (Pi / 180f);
    }

    public static float RadiansToDegrees(float radians)
    {
        return radians * (180f / Pi);
    }


}
