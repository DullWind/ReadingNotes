using UnityEngine;
public class TransformMatrices
{
   public static Matrix ModelTransform(Vector3 position, Vector3 rotation, Vector3 scale)
    {
        Matrix res = new Matrix(4, 4);
        Matrix translationMatrix = CreateModelTranslationMatrix(position);
        Matrix rotationMatrix = CreateModelRotationMatrix(rotation);
        Matrix scalingMatrix = CreateModelScalingMatrix(scale);

        return translationMatrix * rotationMatrix * scalingMatrix;
    }

// unity z_x_y
    private static Matrix CreateModelRotationMatrix(Vector3 scale)
    {
        float radX = SimplyMath.DegreesToRadians(scale.x);
        float radY = SimplyMath.DegreesToRadians(scale.y);
        float radZ = SimplyMath.DegreesToRadians(scale.z);
        Matrix rotationX = new Matrix(new double[,] {
            { 1, 0, 0, 0 },
            { 0, Mathf.Cos(radX), -Mathf.Sin(radX), 0 },
            { 0, Mathf.Sin(radX), Mathf.Cos(radX), 0 },
            { 0, 0, 0, 1 }
        });
        Matrix rotationY = new Matrix(new double[,] {
            { Mathf.Cos(radY), 0, Mathf.Sin(radY), 0 },
            { 0, 1, 0, 0 },
            { -Mathf.Sin(radY), 0, Mathf.Cos(radY), 0 },
            { 0, 0, 0, 1 }
        });
        Matrix rotationZ = new Matrix(new double[,] {
            { Mathf.Cos(radZ), -Mathf.Sin(radZ), 0, 0 },
            { Mathf.Sin(radZ), Mathf.Cos(radZ), 0, 0 },
            { 0, 0, 1, 0 },
            { 0, 0, 0, 1 }
        });

        return rotationZ * rotationY * rotationX;
    }

    private static Matrix CreateModelScalingMatrix(Vector3 scale)
    {
        Matrix scalingMatrix = new Matrix(new double[,] {
            { scale.x, 0, 0, 0 },
            { 0, scale.y, 0, 0 },
            { 0, 0, scale.z, 0 },
            { 0, 0, 0, 1 }
        });
        return scalingMatrix;
    }

    private static Matrix CreateModelTranslationMatrix(Vector3 position)
    {
        Matrix translationMatrix = new Matrix(new double[,] {
            { 1, 0, 0, position.x },
            { 0, 1, 0, position.y },
            { 0, 0, 1, position.z },
            { 0, 0, 0, 1 }
        });
        return translationMatrix;
    }

}
