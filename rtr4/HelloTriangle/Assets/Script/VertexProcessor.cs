using UnityEngine;

public class VertexProcessor
{
    public static Matrix ModelTransformMatrix()
    {
        Vector3 position = new Vector3(0, 0, 0);
        Vector3 rotation = new Vector3(0, 0, 0);
        Vector3 scale = new Vector3(1, 1, 1);

        return TransformMatrices.ModelTransform(position, rotation, scale);
    }
    public static Triangle ProcessTriangle(Triangle triangle)
    {
        var modelMatrix = ModelTransformMatrix();
        triangle.a = (modelMatrix * new Matrix(triangle.a)).ToVector3();
        triangle.b = (modelMatrix * new Matrix(triangle.b)).ToVector3();
        triangle.c = (modelMatrix * new Matrix(triangle.c)).ToVector3();
        return triangle;
    }
    
}
