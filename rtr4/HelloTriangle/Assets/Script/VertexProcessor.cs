using UnityEngine;

public class VertexProcessor
{
    private static Vector3 goPos, goRotation = new Vector3(0, 0, 0);
    private static  Vector3 goScale = new Vector3(1, 1, 1);

    private static  Vector3 cameraPos = new Vector3(3, 2, 1);
    private static  Vector3 cameraRotation = new Vector3(0, 0, 0);
    public static Matrix ModelTransformMatrix()
    {
        return TransformMatrices.ModelTransform(goPos, goRotation, goScale);
    }

    public static Matrix ViewTransformMatrix()
    {
        return TransformMatrices.ViewTransform(cameraPos, cameraRotation);
    }
    public static Triangle ProcessTriangle(Triangle triangle)
    {
        var modelMatrix = ModelTransformMatrix();
        var viewMatrix = ViewTransformMatrix();
        var resMatrix = viewMatrix * modelMatrix;
        triangle.a = (resMatrix * new Matrix(triangle.a)).ToVector3();
        triangle.b = (resMatrix * new Matrix(triangle.b)).ToVector3();
        triangle.c = (resMatrix * new Matrix(triangle.c)).ToVector3();
        return triangle;
    }
    
}
