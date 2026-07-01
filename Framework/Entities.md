### 项目设置
1. disable Unity's [Domain Reload](https://docs.unity3d.com/Manual/ConfigurableEnterPlayMode.html) setting.
	1. ProjectSetting-> Editor -> EnterPlayMode
### 组件
1. 托管组件 
	2. `ICloneable` 会实现深拷贝
	3. `IDisposable` 在销毁时会消耗内部对象。
3. 非托管组件
	1.  [Blittable types  可复制类型](https://docs.microsoft.com/en-us/dotnet/framework/interop/blittable-and-non-blittable-types)（在托管内存和非托管内存布局完全一致，可直接按位复制）
		1. - 在非托管侧分配临时缓冲/结构。
		2. 按签名和属性把每个字段/参数转换并拷贝过去（如 string→LPWSTR/LPSTR，bool→WINBOOL/1字节布尔，char 依 CharSet，decimal→DECIMAL，数组→按 LPArray/SAFEARRAY 规则逐元素编组）
		3. 调用完成后，若参数为 out/ref 或带 [Out]，把非托管缓冲再拷回托管对象/结构
		4. 释放临时非托管分配。
		`bool`
	2. `char`
	3. `BlobAssetReference<T>`
	4. `Collections.FixedString`
	5. [Fixed array](https://docs.microsoft.com/en-us/dotnet/csharp/language-reference/keywords/fixed-statement)
### 系统
1. 也分为托管[`SystemBase`](https://docs.unity3d.com/Packages/com.unity.entities@1.3/api/Unity.Entities.SystemBase.html)
2. 和非托管[`ISystem`](https://docs.unity3d.com/Packages/com.unity.entities@1.3/api/Unity.Entities.ISystem.html)
### JOB
1. 跑在 Job 线程上的代码与数据”必须是非托管/可按位拷贝、无托管引用；Burst 时要求更严格（不可调用托管方法、不可分配托管内存）
### 结构变化
以下都会导致结构变化
1. 创建或销毁实体
2. 添加或移除组件
3. 设置共享组件值。
在job 中发生结构变化会导致同步点。同步点会在一段时间内限制你使用作业系统中所有可用的工作线程

### 实际运行
1. 进入 Play 或对 SubScene 进行烘焙时，会自动调用两类“烘焙相关代码
	1. 所有继承 Baker<TAuthoring> 的类的 Bake(authoring) 
	2. 所有标记为BakingSystem 的系统（在 Baking World 中运行）的 OnUpdate
2. IJobEntity 会根据 Execute 方法的参数自动生成查询，这是通过 Source Generator（源代码生成器） 实现的。
3. 系统的执行顺序由“系统组 SystemGroup”决定
	1. Window > DOTS > Systems ：可看到所有 SystemGroup 与 System 的实时排序与层级。
	2. 下面的代码可以用来控制顺序
	[UpdateInGroup(typeof(SimulationSystemGroup))]
	[UpdateBefore(typeof(BSystem))]

