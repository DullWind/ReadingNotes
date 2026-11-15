using System;
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

    public Matrix(double[,] values)
    {
        data = (double[,])values.Clone();
    }

    public Matrix(Vector3 vector)
    {
        data = new double[4, 1];
        data[0, 0] = vector.x;
        data[1, 0] = vector.y;
        data[2, 0] = vector.z;
        data[3, 0] = 1;
    }

    public Vector3 ToVector3()
    {
        double w = data[3, 0];
        return new Vector3((float)(data[0, 0] / w),
                           (float)(data[1, 0] / w),
                           (float)(data[2, 0] / w));
    }

    public Matrix Inverse()
    {
        if (Rows != Cols || Rows == 0)
            Debug.LogError("Rows != Cols");

        int size = Rows;
        double[,] augmented = new double[size, size * 2];
        for (int row = 0; row < size; row++)
        {
            for (int col = 0; col < size; col++)
                augmented[row, col] = data[row, col];
            augmented[row, size + row] = 1;
        }

        for (int col = 0; col < size; col++)
        {
            int pivotRow = col;
            double pivotAbs = Math.Abs(augmented[col, col]);
            for (int row = col + 1; row < size; row++)
            {
                double candidate = Math.Abs(augmented[row, col]);
                if (candidate > pivotAbs)
                {
                    pivotAbs = candidate;
                    pivotRow = row;
                }
            }

            if (pivotAbs == 0 || double.IsNaN(pivotAbs))
                Debug.LogError("The matrix has no inverse");

            if (pivotRow != col)
            {
                for (int index = 0; index < size * 2; index++)
                {
                    double value = augmented[col, index];
                    augmented[col, index] = augmented[pivotRow, index];
                    augmented[pivotRow, index] = value;
                }
            }

            double pivot = augmented[col, col];
            for (int index = 0; index < size * 2; index++)
                augmented[col, index] /= pivot;

            for (int row = 0; row < size; row++)
            {
                if (row == col)
                    continue;

                double factor = augmented[row, col];
                for (int index = 0; index < size * 2; index++)
                    augmented[row, index] -= factor * augmented[col, index];
            }
        }

        double[,] inverse = new double[size, size];
        for (int row = 0; row < size; row++)
            for (int col = 0; col < size; col++)
                inverse[row, col] = augmented[row, size + col];

        return new Matrix(inverse);
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
