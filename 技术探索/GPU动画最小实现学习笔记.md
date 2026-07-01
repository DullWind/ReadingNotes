# GPU 动画最小实现学习笔记

## 背景

这次探索的目标是从 0 理解并实现一个最小 GPU 动画流程，不复用项目现成的 GPU Baker、ECS Baker 或 Previewer。实验对象是：

```text
Assets/AnimRes/beboo/curlsprout_lv1/curlsprout_lv1_LOD1.prefab
```

最终实验代码放在：

```text
Assets/wyzTestScene/
```

核心文件：

```text
Assets/wyzTestScene/Editor/GpuAnimationDemoSceneBuilder.cs
Assets/wyzTestScene/WyzGpuAnimationPlayer.cs
Assets/wyzTestScene/WyzGpuSkinningDemo.shader
```

生成菜单：

```text
Tools/wyzTestScene/Build Curlsprout GPU Idle Scene
```

当前实现支持：

- 离线烘焙多个 animation clip。
- 把骨骼矩阵写入一张矩阵贴图。
- 把每个顶点的骨骼索引和权重写入 UV 通道。
- 用自写 shader 在 vertex stage 做 GPU skinning。
- 在 Inspector 中进行无过渡硬切换动画。

当前不支持：

- 动画过渡混合。
- normal/tangent 蒙皮。
- 光照、阴影、法线贴图。
- ECS / Entities Graphics。
- 原项目 GPU Baker / Previewer。

## CPU Skinning 在做什么

普通 `SkinnedMeshRenderer` 的核心工作是：每帧根据骨骼姿态重新计算 mesh 顶点位置。

一个顶点可能受多根骨骼影响。概念公式是：

```text
animatedVertex =
    boneMatrix0 * bindVertex * weight0 +
    boneMatrix1 * bindVertex * weight1 +
    ...
```

其中：

- `bindVertex`：mesh 绑定姿势下的原始顶点位置。
- `boneMatrix`：某一帧某根骨骼对该 mesh 的变换矩阵。
- `weight`：该骨骼对这个顶点的影响权重。

传统 `SkinnedMeshRenderer` 运行时需要：

```text
Animator 更新骨骼层级
SkinnedMeshRenderer 读取 bones / bindposes / boneWeights
CPU 或底层渲染管线完成 skinning
```

GPU 动画的核心思想是把其中一部分提前算好，运行时让 shader 根据查表结果计算顶点位置。

## GPU 动画拆分了哪些数据

GPU 动画把原本运行时要用的数据拆成三块。

### 1. 每帧骨骼矩阵

离线阶段采样每个 clip 的每一帧，得到每根骨骼的矩阵：

```csharp
var matrix = rendererWorldToLocal * bone.localToWorldMatrix * bindpose;
```

这表示：

```text
mesh 本地空间顶点
    -> bindpose 转到绑定姿势下的骨骼空间
    -> bone.localToWorldMatrix 转到当前帧世界空间
    -> rendererWorldToLocal 转回 mesh renderer 本地空间
```

这一步保留了骨骼层级的结果。骨骼父子关系并没有被忽略，而是在离线采样时已经由 Unity 计算进 `bone.localToWorldMatrix` 里。

### 2. 顶点绑定关系

每个顶点受哪些骨骼影响、权重是多少，来自原始 mesh 的 `boneWeights`。

普通 shader 不能直接方便地读取 `SkinnedMeshRenderer` 的 bone weights，所以我们把它转存到 UV 通道。

当前实验使用：

```text
uv1 = (boneIndex0, weight0, boneIndex1, weight1)
uv2 = (boneIndex2, weight2, boneIndex3, weight3)
uv3 = (0, 0, 0, 0)
```

项目原版可以支持 6 个骨骼影响，所以 `uv3` 可用于：

```text
uv3 = (boneIndex4, weight4, boneIndex5, weight5)
```

### 3. 当前播放状态

运行时每帧只需要告诉 shader 当前播放到哪一帧。

实验中使用 `_AnimationState` 的第一行：

```text
_AnimationState[0] = (blend, frameLerp, frameIndex, 0)
```

含义：

- `blend`：这一路动画的权重。硬切换时恒为 1。
- `frameLerp`：当前帧到下一帧的插值比例。
- `frameIndex`：矩阵贴图中的全局帧编号。

## 为什么矩阵贴图宽度是 bones.Length * 3

一个骨骼矩阵是 4x4：

```text
row0 = x x x x
row1 = x x x x
row2 = x x x x
row3 = 0 0 0 1
```

矩阵最后一行通常固定为 `(0, 0, 0, 1)`，shader 可以直接补出来，不必存。

一张 RGBAHalf 贴图的一个像素能存 4 个 half float，也就是一行矩阵。

所以：

```text
一根骨骼一帧 = 3 个像素
一帧所有骨骼 = bones.Length * 3 个像素
```

因此：

```csharp
var width = bones.Length * 3;
```

贴图高度则是总帧数：

```text
x = boneIndex * 3 + rowIndex
y = frameIndex
```

shader 中读取矩阵行：

```hlsl
return _AnimatedBoneMatrices.Load(int3(boneIndex * 3 + rowIndex, frameIndex, 0));
```

## 为什么用 Load 而不是 Sample

`_AnimatedBoneMatrices` 是数据表，不是颜色图。

`Sample` 使用 0 到 1 的 UV 坐标，并可能受：

- 过滤模式。
- mipmap。
- wrap/clamp。
- 半像素偏移。

影响。对颜色贴图这是正常的，但对矩阵数据是危险的，因为线性过滤可能把两行矩阵混在一起。

`Load` 使用整数像素坐标，精确读取指定 texel：

```hlsl
_AnimatedBoneMatrices.Load(int3(x, y, 0))
```

所以矩阵贴图必须用 `Load`。

## bindposes 是什么

代码：

```csharp
var bindposes = skinnedMeshRenderer.sharedMesh.bindposes;
```

`bindpose` 可以理解为：

```text
mesh 绑定姿势下的本地空间 -> 某根骨骼绑定姿势下的骨骼空间
```

完整矩阵：

```csharp
rendererWorldToLocal * bone.localToWorldMatrix * bindpose
```

意义：

```text
先用 bindpose 抵消绑定姿势
再用当前帧 bone.localToWorldMatrix 套用动画后的骨骼姿势
最后转回 renderer 本地空间
```

正常情况下：

```csharp
skinnedMeshRenderer.bones.Length == sharedMesh.bindposes.Length
```

实验代码里做了显式校验，如果不匹配直接抛错，不静默跳过：

```csharp
if (bones.Length != bindposes.Length)
{
    throw new InvalidOperationException(
        $"Bones/bindposes mismatch: bones={bones.Length}, bindposes={bindposes.Length}");
}
```

## 离线烘焙流程

入口：

```csharp
Tools/wyzTestScene/Build Curlsprout GPU Idle Scene
```

虽然菜单名还保留 Idle Scene，但当前已经烘焙多个 clip。

核心流程：

```text
加载 source prefab
实例化 source prefab
收集 AnimatorController.animationClips
为每个 clip 生成 WyzGpuClipInfo
逐帧 SampleAnimation
写入骨骼矩阵贴图
复制 mesh，并把 boneWeights 写入 uv1/uv2/uv3
创建自定义 shader 材质
创建普通 MeshRenderer prefab
创建 demo scene
```

### 收集动画

`idle` 排在第一位，其余按名字排序：

```csharp
Array.Sort(sourceClips, (a, b) =>
{
    if (string.Equals(a.name, IdleClipName, StringComparison.OrdinalIgnoreCase)) return -1;
    if (string.Equals(b.name, IdleClipName, StringComparison.OrdinalIgnoreCase)) return 1;
    return string.Compare(a.name, b.name, StringComparison.OrdinalIgnoreCase);
});
```

这样生成场景后默认播放 `idle`。

### 生成 clip 元数据

每个 clip 记录：

```csharp
public struct WyzGpuClipInfo
{
    public string name;
    public int startFrame;
    public int frameCount;
    public float sampleFrameRate;
    public bool loop;
}
```

`startFrame` 是该 clip 在矩阵贴图中的起始 y 坐标。

例如：

```text
idle   startFrame = 0
move   startFrame = idle.frameCount
attack startFrame = idle.frameCount + move.frameCount
```

### 为什么 frameCount 要 +1

代码：

```csharp
var frameCount = Mathf.Max(2, Mathf.FloorToInt(clips[i].length * SampleFrameRate) + 1);
```

原因是：

```text
N 个采样间隔需要 N + 1 个采样点
```

shader 播放时会读取：

```text
frameIndex
frameIndex + 1
```

用来做帧间插值。如果不多采最后一帧，最后一个插值区间就没有终点，容易越界或少一段动画。

## BakeMesh 的作用

`BakeMesh` 不烘动画帧，而是烘顶点和骨骼的绑定关系。

原始 `SkinnedMeshRenderer` 的 mesh 里有：

```text
boneWeights
bindposes
```

普通 `MeshRenderer` 的 shader 更容易读取：

```text
position
uv0
uv1
uv2
uv3
```

所以 `BakeMesh` 把 boneWeights 转存到 UV 通道：

```csharp
uv1[i] = new Vector4(weights.boneIndex0, weights.weight0, weights.boneIndex1, weights.weight1);
uv2[i] = new Vector4(weights.boneIndex2, weights.weight2, weights.boneIndex3, weights.weight3);
uv3[i] = Vector4.zero;
```

然后：

```csharp
mesh.SetUVs(1, uv1);
mesh.SetUVs(2, uv2);
mesh.SetUVs(3, uv3);
```

最后清掉原始 skinning 数据：

```csharp
mesh.bindposes = Array.Empty<Matrix4x4>();
mesh.boneWeights = Array.Empty<BoneWeight>();
```

因为新 mesh 不再给 `SkinnedMeshRenderer` 使用，而是给普通 `MeshFilter + MeshRenderer` 使用。

## UV 为什么能存骨骼数据

UV 最常见用途是贴图坐标，尤其是：

```text
uv0 = (x, y)
```

但在 shader 中，UV 通道本质上是“每个顶点附带的自定义数据”。

Unity Mesh 支持多个 UV 通道：

```text
TEXCOORD0
TEXCOORD1
TEXCOORD2
TEXCOORD3
...
```

在实验 shader 中：

```hlsl
float2 uv : TEXCOORD0;
float4 uv1 : TEXCOORD1;
float4 uv2 : TEXCOORD2;
float4 uv3 : TEXCOORD3;
```

其中：

- `uv` / `TEXCOORD0`：仍然用于采样颜色贴图。
- `uv1/uv2/uv3`：用于存骨骼索引和权重。

每个 `float4` 可以存两组：

```text
boneIndex + weight
```

因此：

```text
uv1 = 两根骨骼
uv2 = 两根骨骼
uv3 = 两根骨骼
```

当前实验只使用 Unity 旧 `BoneWeight` 的 4 个骨骼影响，所以 `uv3` 为空。

## Shader 结构

文件：

```text
Assets/wyzTestScene/WyzGpuSkinningDemo.shader
```

这是一个最小 URP shader，只做：

- 顶点阶段 GPU skinning。
- 片元阶段采样 `_BaseMap`。

不做：

- 光照。
- 阴影。
- normal/tangent skinning。
- 法线贴图。

### 贴图声明

```hlsl
TEXTURE2D(_BaseMap);
SAMPLER(sampler_BaseMap);
TEXTURE2D(_AnimatedBoneMatrices);
```

`_BaseMap` 是颜色贴图，用 `SAMPLE_TEXTURE2D` 采样，所以需要 sampler。

`_AnimatedBoneMatrices` 是数据贴图，用 `Load` 精确读取，不需要 sampler。

### CBUFFER

```hlsl
CBUFFER_START(UnityPerMaterial)
    float4 _BaseMap_ST;
    float _EnableAnimation;
    float4x4 _AnimationState;
CBUFFER_END
```

含义：

- `_BaseMap_ST`：Unity 自动用于贴图 tiling/offset。
- `_EnableAnimation`：是否启用 GPU 动画。
- `_AnimationState`：当前播放帧状态。

### 读取矩阵

```hlsl
float4 LoadMatrixRow(int boneIndex, int frameIndex, int rowIndex)
{
    return _AnimatedBoneMatrices.Load(int3(boneIndex * 3 + rowIndex, frameIndex, 0));
}
```

### 读取骨骼索引和权重

```hlsl
float2 GetBoneWeight(float4 uv1, float4 uv2, float4 uv3, int index)
```

这会根据 `index` 从 `uv1/uv2/uv3` 取出一组：

```text
(boneIndex, weight)
```

### 单帧 skinning

```hlsl
float3 SkinFrame(float3 position, float4 uv1, float4 uv2, float4 uv3, int frameIndex)
```

它对最多 6 组骨骼影响做加权：

```text
result += boneMatrix * position * weight
```

### 帧间插值

```hlsl
float3 fromFrame = SkinFrame(position, uv1, uv2, uv3, frameIndex);
float3 toFrame = SkinFrame(position, uv1, uv2, uv3, frameIndex + 1);
return lerp(fromFrame, toFrame, frameLerp) * blend;
```

这使 30 FPS 采样的动画在任意渲染帧率下仍然能平滑播放。

### 输出到屏幕

```hlsl
output.positionHCS = TransformObjectToHClip(positionOS);
```

把模型本地空间坐标转换到裁剪空间。

片元阶段：

```hlsl
return SAMPLE_TEXTURE2D(_BaseMap, sampler_BaseMap, input.uv);
```

采样颜色贴图并输出颜色。

## WyzGpuAnimationPlayer

文件：

```text
Assets/wyzTestScene/WyzGpuAnimationPlayer.cs
```

职责：

- 保存 clip 元数据。
- 记录当前播放 clip。
- 每帧计算当前全局帧。
- 写 `_AnimationState` 和 `_EnableAnimation`。

### 硬切换

```csharp
public void Play(int clipIndex)
{
    currentClipIndex = Mathf.Clamp(clipIndex, 0, clips.Length - 1);
    ResetPlayTime();
}
```

切换时直接更换 `currentClipIndex` 并重置播放时间，不做混合。

### 每帧计算

```csharp
var clip = clips[currentClipIndex];
var sample = time * speed * clip.sampleFrameRate;
var sampleFloor = Mathf.FloorToInt(sample);
```

循环动画：

```csharp
localFrame = sampleFloor % (clip.frameCount - 1);
transition = sample - sampleFloor;
```

非循环动画：

```csharp
localFrame = Mathf.Clamp(sampleFloor, 0, clip.frameCount - 2);
transition = sampleFloor >= clip.frameCount - 1 ? 1f : sample - sampleFloor;
```

全局帧：

```csharp
var frame = clip.startFrame + localFrame;
```

写入 shader：

```csharp
var animationState = Matrix4x4.zero;
animationState.SetRow(0, new Vector4(1f, transition, frame, 0f));
```

使用 `MaterialPropertyBlock`：

```csharp
renderer.GetPropertyBlock(_propertyBlock);
_propertyBlock.SetFloat(EnableAnimationId, 1f);
_propertyBlock.SetMatrix(AnimationStateId, animationState);
renderer.SetPropertyBlock(_propertyBlock);
```

这样不会修改 shared material，也不会给每个 renderer 复制材质实例。

## MaterialPropertyBlock 的作用

`MaterialPropertyBlock` 用于给单个 renderer 设置独立材质参数。

不直接改：

```csharp
renderer.sharedMaterial
```

因为会影响所有共享该材质的对象，也可能污染资源。

不使用：

```csharp
renderer.material
```

因为会隐式实例化材质，增加内存和管理成本。

GPU 动画中很多角色可以共享：

```text
mesh
material
_AnimatedBoneMatrices
```

但每个实例有不同：

```text
_AnimationState
```

因此 `MaterialPropertyBlock` 很适合存每个实例的播放状态。

## 无过渡切换的实现

无过渡切换本质上就是换当前读取的帧区间。

烘焙贴图中：

```text
idle   frames 0..N
move   frames N+1..M
attack frames M+1..K
```

运行时切换到某个 clip：

```csharp
currentClipIndex = newIndex;
ResetPlayTime();
```

之后每帧：

```csharp
frame = clips[currentClipIndex].startFrame + localFrame;
```

shader 不需要知道动画名，只需要读 `_AnimationState[0][2]` 得到当前全局帧。

## Inspector 切换

文件：

```text
Assets/wyzTestScene/Editor/WyzGpuAnimationPlayerEditor.cs
```

提供：

- `Hard Switch Preview` 下拉框。
- `Restart Current Clip` 按钮。

选择下拉框时：

```csharp
player.Play(newClipIndex);
```

这就是硬切。

## 当前实现的限制

### 1. 只做位置蒙皮

Shader 目前只改变 position：

```hlsl
float3 positionOS = ApplyGpuAnimation(...);
```

没有对 normal/tangent 做 skinning，所以如果接入光照，光照方向可能不准确。

### 2. 只支持硬切换

当前 `_AnimationState` 只用第一行：

```text
row0 = (1, frameLerp, frameIndex, 0)
```

如果要做过渡，需要使用多行，例如：

```text
row0 = 新动画权重、帧、插值
row1 = 旧动画权重、帧、插值
```

shader 中再对多行动画结果加权求和。

### 3. 当前只使用 4 骨骼权重

`BakeMesh` 读取 Unity 旧 `BoneWeight`：

```text
boneIndex0..3
weight0..3
```

因此最多 4 个骨骼影响。shader 支持 6 组，但当前 `uv3` 为空。

如果需要 6 或更多骨骼权重，需要读取 `BoneWeight1` / `GetAllBoneWeights()`。

### 4. Shader 是 unlit

当前片元阶段只是采样颜色：

```hlsl
return SAMPLE_TEXTURE2D(_BaseMap, sampler_BaseMap, input.uv);
```

没有做 URP 光照、阴影和法线贴图。

## 后续可扩展方向

### 动画过渡

扩展 `_AnimationState` 多行，让 shader 同时读取旧动画和新动画。

```text
result = oldPose * oldWeight + newPose * newWeight
```

### normal/tangent 蒙皮

在 shader 中对 normal/tangent 使用矩阵的旋转部分做同样的权重混合。

### 支持更多骨骼权重

使用：

```csharp
mesh.GetBonesPerVertex()
mesh.GetAllBoneWeights()
```

将更多权重写到更多 UV 或其它顶点数据通道。

### 批量实例化

多个实例共享：

```text
mesh
material
matrix texture
```

每个实例通过 `MaterialPropertyBlock` 写不同 `_AnimationState`。

### 接入正式渲染

把当前 unlit shader 改为 URP lit，补光照、阴影、法线和材质属性。

## 一句话总结

这次实现把 `SkinnedMeshRenderer` 的运行时骨骼蒙皮拆成了三个部分：

```text
离线：采样骨骼矩阵 -> 写入矩阵贴图
离线：提取顶点骨骼权重 -> 写入 UV 通道
运行时：写入当前帧状态 -> shader 查表并计算顶点位置
```

无过渡切换的关键是：

```text
多个 clip 顺序拼进同一张矩阵贴图
每个 clip 记录 startFrame / frameCount
切换时只改变 currentClipIndex
shader 继续按 frameIndex 查表
```
