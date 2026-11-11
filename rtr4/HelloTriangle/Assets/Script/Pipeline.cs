using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using static PrimitiveAssembly;

public class Pipeline : MonoBehaviour
{
    // Start is called before the first frame update

    Vertex[] vertices =
    {
        new Vertex(-1, -1, 0), // v0
        new Vertex( 1, -1, 0), // v1
        new Vertex(-1,  1, 0), // v2
    };

    int[] indices = { 0, 1, 2 };   


    void Start()
    {
        List<Triangle> triangles = AssembleTriangleList(vertices, indices);
    }

    // Update is called once per frame
    void Update()
    {
        
    }
}
