using System.Collections;
using System.Collections.Generic;
using UnityEngine;
public class Matrix
{
    private readonly double[,] data;

    public int Rows => data.GetLength(0);
    public int Cols => data.GetLength(1);



    public Matrix(int rows, int cols)
    {
        data = new double[rows, cols];
    }

    public static Matrix operator *(Matrix a, Matrix b)
    {
        Matrix result = new Matrix(a.Rows, b.Cols);
        for (int i = 0; i < a.Rows; i++) 
        {
            for (int j = 0; j < b.Cols; j++)
            {
                double sum = 0;
                for (int k = 0; k < a.Cols; k++)
                {
                    sum += a.data[i, k] * b.data[k, j];
                }
                result.data[i, j] = sum;
            }
        }
        return result;
    }

}

public class TransformMatrices
{
   public static Matrix ModelTransfor(Vector3 position, Vector3 rotation, Vector3 scale)
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
        Matrix rotationX = new Matrix(4, 4);
        rotationX.data = new double[,] {
            { 1, 0, 0, 0 },
            { 0, Mathf.Cos(radX), -Mathf.Sin(radX), 0 },
            { 0, Mathf.Sin(radX), Mathf.Cos(radX), 0 },
            { 0, 0, 0, 1 }
        };
        Matrix rotationY = new Matrix(4, 4);
        rotationY.data = new double[,] {
            { Mathf.Cos(radY), 0, Mathf.Sin(radY), 0 },
            { 0, 1, 0, 0 },
            { -Mathf.Sin(radY), 0, Mathf.Cos(radY), 0 },
            { 0, 0, 0, 1 }
        };
        Matrix rotationZ = new Matrix(4, 4);
        rotationZ.data = new double[,] {
            { Mathf.Cos(radZ), -Mathf.Sin(radZ), 0, 0 },
            { Mathf.Sin(radZ), Mathf.Cos(radZ), 0, 0 },
            { 0, 0, 1, 0 },
            { 0, 0, 0, 1 }
        };

        return rotationZ * rotationY * rotationX;
    }

    private static Matrix CreateModelScalingMatrix(Vector3 scale)
    {
        Matrix scalingMatrix = new Matrix(4, 4);
        scalingMatrix.data = new double[,] {
            { scale.x, 0, 0, 0 },
            { 0, scale.y, 0, 0 },
            { 0, 0, scale.z, 0 },
            { 0, 0, 0, 1 }
        };
        return scalingMatrix;
    }

    private static Matrix CreateModelTranslationMatrix(Vector3 position)
    {
        Matrix translationMatrix = new Matrix(4, 4);
        translationMatrix.data = new double[,] {
            { 1, 0, 0, position.x },
            { 0, 1, 0, position.y },
            { 0, 0, 1, position.z },
            { 0, 0, 0, 1 }
        };
        return translationMatrix;
    }

}
