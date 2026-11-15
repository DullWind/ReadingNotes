using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using static PrimitiveAssembly;

public class Pipeline : MonoBehaviour
{
    // Start is called before the first frame update

    Vector3[] vertices =
    {
        new Vector3(-1, -1, 0), // v0
        new Vector3( 1, -1, 0), // v1
        new Vector3(-1,  1, 0), // v2
    };

    int[] indices = { 0, 1, 2 };   



    void Start()
    {
        List<Triangle> triangles = AssembleTriangleList(vertices, indices);
        for (int i = 0; i < triangles.Count; i++)
        {
            triangles[i] = VertexProcessor.ProcessTriangle(triangles[i]);
        }

    }

    // Update is called once per frame
    void Update()
    {
        
    }
}
