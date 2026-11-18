using UnityEngine;
using System;
using System.Collections.Generic;
public class VertexProcessor
{
    private static Vector3 goPos, goRotation = new Vector3(0, 0, 0);
    private static  Vector3 goScale = new Vector3(1, 1, 1);

    private static  Vector3 cameraPos = new Vector3(0, 0, -3);
    private static  Vector3 cameraRotation = new Vector3(0, 0, 0);

    private static float verticalFovDegrees = 90;

    private static float aspect = 1;

    private static float near = 0.1f;

    private static float far = 100;

    private static float width = 800;

    private static float height = 600;
    public static Matrix ModelTransformMatrix()
    {
        return TransformMatrices.ModelTransform(goPos, goRotation, goScale);
    }

    public static Matrix ViewTransformMatrix()
    {
        return TransformMatrices.ViewTransform(cameraPos, cameraRotation);
    }

    public static Matrix ProjectionTransformMatrix()
    {
        return TransformMatrices.PerspectiveProjection(verticalFovDegrees, aspect, near, far);
    }

    private static Matrix Interpolate(Matrix a, Matrix b, double t)
    {
        var values = new double[4, 1];
        for (int row = 0; row < 4; row++)
            values[row, 0] = a[row, 0] + t * (b[row, 0] - a[row, 0]);

        return new Matrix(values);
    }

    private static readonly Func<Matrix, double>[] ClipPlanes =
    {
        p => p[3, 0] + p[0, 0], // 左
        p => p[3, 0] - p[0, 0], // 右
        p => p[3, 0] + p[1, 0], // 下
        p => p[3, 0] - p[1, 0], // 上
        p => p[3, 0] + p[2, 0], // 近
        p => p[3, 0] - p[2, 0], // 远
    };

    public static List<Triangle> ClipTransform(Matrix a, Matrix b, Matrix c)
    {

        var polygon = new List<Matrix> { a, b, c };
        for (int i = 0; i < ClipPlanes.Length; i++)
        {
            polygon = ClipAgainstPlane(polygon, ClipPlanes[i]);
            if (polygon.Count == 0)
            {
                return new List<Triangle>();
            }
        }
        var result = new List<Triangle>();
        for (int i = 1; i < polygon.Count - 1; i++)
        {
            // 这里理论上还要保留w，在光栅化的时候用来插值像素的属性
            result.Add(new Triangle
            {
                a = polygon[0].ToVector3(),
                b = polygon[i].ToVector3(),
                c = polygon[i + 1].ToVector3()
            });
        }
        return result;
    }

    private static List<Matrix> ClipAgainstPlane(List<Matrix> polygon, Func<Matrix, double> distance)
    {
        var result = new List<Matrix>();
        if (polygon.Count == 0)
            return result;

        Matrix previous = polygon[polygon.Count - 1];
        double previousDistance = distance(previous);

        foreach (Matrix current in polygon)
        {
            double currentDistance = distance(current);
            bool previousInside = previousDistance >= 0;
            bool currentInside = currentDistance >= 0;

            if (previousInside != currentInside &&
                previousDistance != 0 && currentDistance != 0)
            {
                double t = previousDistance /
                        (previousDistance - currentDistance);
                result.Add(Interpolate(previous, current, t));
            }

            if (currentInside)
                result.Add(current);

            previous = current;
            previousDistance = currentDistance;
        }

        return result;
    }

    public static List<Triangle> ScreenTransform(List<Triangle> triangle, float width, float height)
    {
        var result = new List<Triangle>();
        for (int i = 0; i < triangle.Count; i++)
        {
            var curTriangle = triangle[i];
            curTriangle.a = new Vector3((curTriangle.a.x + 1) * width / 2, (curTriangle.a.y + 1) * height / 2, curTriangle.a.z);
            curTriangle.b = new Vector3((curTriangle.b.x + 1) * width / 2, (curTriangle.b.y + 1) * height / 2, curTriangle.b.z);
            curTriangle.c = new Vector3((curTriangle.c.x + 1) * width / 2, (curTriangle.c.y + 1) * height / 2, curTriangle.c.z);
            result.Add(curTriangle);
        }
        return result;
    }


    public static List<Triangle> ProcessTriangle(Triangle triangle)
    {
        var modelMatrix = ModelTransformMatrix();
        var viewMatrix = ViewTransformMatrix();
        var projectionMatrix = ProjectionTransformMatrix();
        var resMatrix = projectionMatrix * viewMatrix * modelMatrix;
        var aPoint = (resMatrix * new Matrix(triangle.a));
        var bPoint = (resMatrix * new Matrix(triangle.b));
        var cPoint = (resMatrix * new Matrix(triangle.c));
        var clipTriangle = ClipTransform(aPoint, bPoint, cPoint);
        var resTriange = ScreenTransform(clipTriangle, width, height);
        return resTriange;
    }

}
