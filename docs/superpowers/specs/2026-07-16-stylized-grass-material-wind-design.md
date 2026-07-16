# Unity 风格化草材质风场设计

日期：2026-07-16

## 1. 范围

在现有 `StylizedGrassForward.shader` 的 `UniversalForward` Pass 中加入由材质面板控制的顶点风动画。

本次实现包含：

- 连续的低频环境风；
- 使用世界空间程序噪声形成的移动阵风；
- 由原始 UV 的 V 坐标控制根部固定、叶尖最大弯曲；
- 不同对象之间连续且同步的世界空间风浪；
- 示例材质中的默认风参数。

本次不包含：

- Unity `Wind Zone` 或 C# 全局风控制器；
- 噪声贴图；
- 角色交互、压草和恢复；
- `ShadowCaster`、`DepthOnly` 或其他新增 Pass；
- 法线随弯曲重建。

因此本阶段草叶本体会随风移动，但投射阴影不会同步变形。该限制会在后续增加 `ShadowCaster` Pass 时解决。

## 2. 实现路线

采用“两层程序风”：

1. 环境风使用世界空间周期波，提供持续、幅度较小的摆动。
2. 阵风复用现有 `ValueNoise`，沿风向滚动采样坐标，形成尺度明显大于单簇草的移动风浪。

不使用噪声图。这样无需新增纹理资源和片元纹理采样，并且现有程序噪声可以在顶点阶段计算。

## 3. 材质参数

Shader 增加以下属性：

- `_WindDirection`：XZ 平面风向，使用 Vector 的 X/Z 分量。
- `_WindStrength`：环境风最大水平位移。
- `_WindSpeed`：环境风时间速度。
- `_WindScale`：环境风世界空间波长控制。
- `_GustStrength`：阵风额外水平位移。
- `_GustSpeed`：阵风噪声沿风向移动的速度。
- `_GustScale`：阵风噪声的世界空间块尺寸。
- `_BendPower`：UV 高度到弯曲权重的指数。

默认参数以轻微持续摆动和中等阵风为目标，不让叶尖穿过根部或大幅翻转。

示例材质保存全部新增参数，确保升级 Shader 后可直接看到风动画。

## 4. 顶点数据约定

草叶使用 UV0 的 V 坐标表示高度：

- 根部顶点：`V = 0`；
- 中间顶点：`0 < V < 1`；
- 叶尖顶点：`V = 1`。

弯曲权重为：

```text
bendWeight = pow(saturate(uv.y), BendPower)
```

根部权重始终为零。模型至少应在根部和叶尖各有一排顶点；增加中间分段会让弯曲轮廓更自然。

## 5. 风场计算

### 5.1 风向

读取 `_WindDirection.xz` 并归一化。若长度接近零，回退到世界空间 X 正方向，避免除零或静默产生无效向量。

### 5.2 环境风

环境风相位由世界空间 XZ、风向和时间组成：

```text
ambientPhase = dot(positionWS.xz, windDirection) / WindScale
             + time * WindSpeed
ambient = sin(ambientPhase) * WindStrength
```

为避免所有草形成完全相同的直线波，可用垂直于风向的世界坐标增加一项较弱的相位扰动，但不增加第二套噪声计算。

### 5.3 阵风

阵风采样坐标沿风向移动：

```text
gustUV = (positionWS.xz - windDirection * time * GustSpeed) / GustScale
gust = smoothstep(gustThreshold, 1, ValueNoise(gustUV)) * GustStrength
```

`smoothstep` 将连续噪声集中成较清晰的风浪带。阵风只增加同一风向上的弯曲，不产生随机方向抖动。

### 5.4 最终位移

```text
windAmount = ambient + gust
displacementWS = float3(windDirection.x, 0, windDirection.y)
               * windAmount
               * bendWeight
```

位移在世界空间计算，再用于生成裁剪空间位置。光照、雾、阴影接收和颜色变化使用变形后的世界空间位置，避免草叶移动后出现明显的空间错位。

## 6. Shader 数据流调整

现有顶点阶段流程调整为：

1. 将对象空间位置转换为原始世界空间位置；
2. 计算 UV 弯曲权重；
3. 计算环境风和阵风；
4. 得到变形后的世界空间位置；
5. 使用变形位置计算 `positionCS`、`positionWS`、雾和主光阴影坐标；
6. 保留原始世界坐标用于大尺度色差，防止颜色纹理随草叶弯曲滑动。

为避免重复计算，风函数拆为独立的 HLSL 函数，顶点入口只负责组织数据。

## 7. 参数保护和降级

- `_WindScale` 与 `_GustScale` 在 Shader 中限制为不小于一个极小正数，避免除零。
- 零风向使用世界 X 正方向回退。
- 所有强度为零时，输出位置必须与当前无风版本一致。
- 风动画不依赖噪声贴图；没有外部资源缺失风险。
- 位移不修改对象 Transform，也不影响 CPU 端包围盒；测试阶段需保证 Mesh Bounds 足以覆盖最大叶尖位移，避免被错误剔除。

## 8. 验收标准

1. `_WindStrength = 0` 且 `_GustStrength = 0` 时，画面与无风版本一致。
2. 根部顶点在所有风参数下保持不动。
3. 叶尖位移大于中间段，弯曲随 UV 高度连续变化。
4. 放置多个使用同材质的草对象时，风浪在世界空间连续，不按对象重新开始。
5. 修改风向后，草的水平摆动方向同步改变。
6. 环境风关闭、只开阵风时，能看到成片移动而不是每片草独立抖动。
7. 材质未指定任何噪声纹理也能正常运行。
8. Shader 中不出现交互、Compute Shader 或 `Wind Zone` 依赖。

## 9. 验证方法

- 使用当前草簇模型和 `StylizedGrassExample.mat` 观察 Scene/Game 视图。
- 分别测试无风、仅环境风、仅阵风和两者叠加四种状态。
- 复制草对象并改变位置，检查世界空间风浪连续性。
- 将 `_WindDirection` 设为零，确认回退方向有效且无 NaN。
- 将两个尺度参数设到 Inspector 允许的最小值，确认无渲染异常。
- 使用 Frame Debugger 或材质 Inspector 确认仍然只有现有 `UniversalForward` Pass。
