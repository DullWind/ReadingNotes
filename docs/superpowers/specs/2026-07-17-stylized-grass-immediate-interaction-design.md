# Unity 风格化草立即回弹交互设计

日期：2026-07-17

## 1. 范围

在现有 `StylizedGrassForward.shader` 风场基础上增加球形交互压草，并提供 Unity C# 组件将交互源数据传给 Shader。

本次实现包含：

- 最多 8 个同时生效的球形交互源；
- 草叶在交互半径内朝远离交互源中心的方向弯曲；
- 少量向下位移形成压平感；
- 根部固定、叶尖最大位移；
- 交互源离开后下一帧立即回弹；
- 多交互源重叠时使用最强影响；
- Scene 视图交互半径 Gizmo。

本次不包含：

- RenderTexture、Compute Shader 或额外摄像机；
- 压痕残留、逐渐恢复或永久状态；
- 碰撞检测、物理力或 CPU 端草叶修改；
- `ShadowCaster`、`DepthOnly` 等新增 Pass；
- 超过 8 个交互源的动态缓冲区。

## 2. 组件边界

### 2.1 `GrassInteractor`

挂载在角色、敌人或其他需要压草的物体上，职责为：

- 保存半径和强度；
- 启用时注册到静态集合；
- 禁用或销毁时注销；
- 在 Scene 视图绘制半径 Gizmo；
- 向 Manager 提供只读位置、半径和强度。

Inspector 参数：

- `Radius`：XZ 平面影响半径，最小值大于零；
- `Strength`：最大水平弯曲量；
- `HeightOffset`：交互中心相对 Transform 的高度偏移，仅用于可视化和未来扩展；当前 Shader 只使用 XZ。

### 2.2 `GrassInteractionManager`

场景中只允许一个激活实例，职责为：

- 在 `LateUpdate` 收集激活交互源；
- 按距离当前主摄像机由近到远选择最多 8 个；没有主摄像机时保持稳定的注册顺序；
- 将交互数据上传到 Shader 全局数组；
- 设置有效交互源数量；
- 禁用或销毁时把数量清零，使草立即恢复。

Shader 全局数据：

```text
_GrassInteractorCount
_GrassInteractors[8]
```

每个 `float4` 的布局为：

```text
(centerWS.x, centerWS.z, radius, strength)
```

## 3. Shader 参数

材质增加以下局部参数：

- `_InteractionBendPower`：UV 高度到交互弯曲权重的指数；
- `_InteractionPushDown`：水平弯曲同时向下压低的比例；
- `_InteractionMaxDistance`：单个交互源允许产生的最大位移，用于保护异常输入。

交互源位置、半径和强度使用 Shader 全局参数，不写入材质资产，因此同一场景内所有使用该 Shader 的草共享交互状态。

## 4. 顶点交互算法

对每个原始世界空间顶点，在最多 8 个交互源中寻找影响最强者。

水平距离与基础衰减：

```text
offsetXZ = positionWS.xz - interactorCenterXZ
distance = length(offsetXZ)
falloff = saturate(1 - distance / radius)
falloff = falloff * falloff * (3 - 2 * falloff)
influence = falloff * strength
```

仅当 `influence` 大于当前最佳值时更新最佳方向和强度。这样重叠交互源不会直接叠加导致异常大位移。

方向处理：

- 正常情况下使用 `normalize(offsetXZ)`，使草朝远离中心的方向弯曲；
- 顶点恰好位于中心时使用世界 X 正方向，避免除零与 NaN。

高度权重：

```text
bendWeight = pow(saturate(uv.y), InteractionBendPower)
```

最终交互位移：

```text
horizontal = bestDirection * min(bestInfluence, InteractionMaxDistance)
vertical = -length(horizontal) * InteractionPushDown
interactionWS = float3(horizontal.x, vertical, horizontal.y) * bendWeight
```

## 5. 与风场的组合

顶点最终位置为：

```text
positionWS = originalPositionWS
           + windDisplacementWS
           + interactionDisplacementWS
```

风场与交互都使用原始世界空间位置计算，避免一种位移改变另一种效果的采样坐标。颜色块噪声继续使用原始世界空间位置，防止颜色随草叶移动滑动。

本阶段不重建弯曲后的法线，继续使用现有向上混合法线。

## 6. 生命周期与降级

- 没有 Manager：全局计数默认为零，草只受风影响；
- 没有 Interactor：Manager 每帧上传计数零，草立即恢复；
- Interactor 禁用或销毁：从注册集合移除；
- Manager 禁用或销毁：清空全局计数；
- 多个 Manager：后启用者禁用自身并输出一次明确警告；
- 非法半径或强度：C# 端在 `OnValidate` 中限制为非负值，Shader 端再次保护除零；
- 超过 8 个交互源：只上传离主摄像机最近的 8 个，不刷每帧警告。

## 7. 性能边界

- Shader 使用固定上限 8 的顶点循环；
- 当有效数量为零时尽早返回零位移；
- C# 复用固定数组，不在 `LateUpdate` 中创建托管数组；
- 对少量交互源使用简单排序或无分配选择，避免每帧 GC；
- 不增加片元阶段计算和纹理采样。

## 8. 验收标准

1. 没有交互源时，画面与当前风场版本一致。
2. 角色进入半径后，草朝远离角色的方向弯曲并略微压低。
3. 根部 `UV V=0` 不发生交互位移，叶尖位移最大。
4. 角色离开范围后，草下一帧恢复为仅受风影响的状态。
5. 两个交互源重叠时，位移使用最强者，不出现双倍弹飞。
6. 同时存在超过 8 个交互源时，只处理选出的 8 个且无 GC 峰值。
7. 零半径、零强度和中心重合不产生 NaN、闪烁或顶点飞散。
8. 禁用 Manager 后所有草立即停止交互变形。
9. Unity 2021.3 + URP 12.1.10 批处理导入无 Shader 或 C# 编译错误。

## 9. 验证场景步骤

1. 在任意场景对象上添加 `GrassInteractionManager`。
2. 在角色对象上添加 `GrassInteractor`，设置可见半径和强度。
3. 播放场景，分别从草簇外部、边缘和中心穿过。
4. 复制 Interactor，验证重叠与最多 8 个限制。
5. 运行 Profiler，确认 `LateUpdate` 无每帧 GC Alloc。
6. 禁用 Interactor 和 Manager，确认即时回弹与全局数据清理。
