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
