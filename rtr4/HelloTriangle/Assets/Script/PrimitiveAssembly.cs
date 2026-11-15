using System;
using System.Collections.Generic;
using UnityEngine;

public class PrimitiveAssembly
{
    public static List<Triangle> AssembleTriangleList(Vector3[] vertices, int[] indices)
    {
        if (indices.Length % 3 != 0)
        {
            Debug.LogError("Indices length must be a multiple of 3.");
        }
        var triangleList = new List<Triangle>();
        for (int i = 0; i < indices.Length; i += 3)
        {
            var triangle = new Triangle();
            triangle.a = vertices[indices[i]];
            triangle.b = vertices[indices[i + 1]];
            triangle.c = vertices[indices[i + 2]];
            triangleList.Add(triangle);
        }
        return triangleList;
    }
    
}
