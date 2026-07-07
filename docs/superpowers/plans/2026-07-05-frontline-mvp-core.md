# Frontline MVP Core Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 Unity 3D 中实现《前线》的第一阶段核心可玩闭环：灰盒地图、营地产兵、拖拽派兵、路径移动、基础战斗和占领。

**Architecture:** 先把规则层写成可测试的纯 C# 类，再用 Unity MonoBehaviour 做场景桥接。核心数据通过小型模型类和 ScriptableObject 逐步承载，避免把规则写死在场景物体脚本里。

**Tech Stack:** Unity 3D、C#、Unity Test Framework、NUnit、ScriptableObject、MonoBehaviour。

---

## 范围说明

这份计划只覆盖 MVP 第一阶段核心闭环，不覆盖完整 GDD 的所有系统。

本计划实现：

- 兵种与克制伤害计算。
- 营地生产、驻军、占领。
- 节点路径图和最短路径。
- 单营地派兵命令。
- Unity 灰盒场景运行桥接。
- 鼠标拖拽派兵和滚轮缩放的最小版本。

后续应拆成独立计划的系统：

- 简单 AI。
- Roguelite 三选一升级。
- 战略层战区聚合拖拽。
- 反滚雪球。
- 完整 UI 与反馈。
- 数值调试和美术替换。

本计划假设实现时已经有一个 Unity 3D 项目，且以下路径都相对于 Unity 项目根目录。

---

## 文件结构

创建以下文件：

- `Assets/Scripts/Frontline/Core/TeamId.cs`：阵营枚举。
- `Assets/Scripts/Frontline/Core/UnitTypeId.cs`：兵种枚举。
- `Assets/Scripts/Frontline/Core/UnitStats.cs`：兵种数值结构。
- `Assets/Scripts/Frontline/Core/DamageMatrix.cs`：克制关系。
- `Assets/Scripts/Frontline/Core/CombatCalculator.cs`：伤害计算。
- `Assets/Scripts/Frontline/Core/PathGraph.cs`：营地节点图。
- `Assets/Scripts/Frontline/Core/RoutePlanner.cs`：最短路径查询。
- `Assets/Scripts/Frontline/Core/CampModel.cs`：营地规则模型。
- `Assets/Scripts/Frontline/Core/CampProduction.cs`：产兵逻辑。
- `Assets/Scripts/Frontline/Core/CaptureResolver.cs`：占领判定。
- `Assets/Scripts/Frontline/Core/DispatchPlanner.cs`：派兵数量计算。
- `Assets/Scripts/Frontline/Runtime/CampRuntime.cs`：Unity 营地桥接。
- `Assets/Scripts/Frontline/Runtime/UnitAgent.cs`：Unity 单位移动与基础战斗。
- `Assets/Scripts/Frontline/Runtime/FrontlineInput.cs`：鼠标选择与拖拽派兵。
- `Assets/Scripts/Frontline/Runtime/TopDownCameraController.cs`：俯视镜头缩放。
- `Assets/Scripts/Frontline/Runtime/MvpGameBootstrap.cs`：灰盒地图启动器。
- `Assets/Tests/EditMode/Frontline/CombatCalculatorTests.cs`：伤害测试。
- `Assets/Tests/EditMode/Frontline/RoutePlannerTests.cs`：路径测试。
- `Assets/Tests/EditMode/Frontline/CampProductionTests.cs`：产兵测试。
- `Assets/Tests/EditMode/Frontline/CaptureResolverTests.cs`：占领测试。
- `Assets/Tests/EditMode/Frontline/DispatchPlannerTests.cs`：派兵测试。
- `tools/run-editmode-tests.ps1`：Unity EditMode 测试脚本。

---

### Task 1: 测试脚本与目录骨架

**Files:**

- Create: `tools/run-editmode-tests.ps1`
- Create folders: `Assets/Scripts/Frontline/Core`
- Create folders: `Assets/Scripts/Frontline/Runtime`
- Create folders: `Assets/Tests/EditMode/Frontline`

- [ ] **Step 1: 创建目录**

Run:

```powershell
New-Item -ItemType Directory -Force -Path `
  'Assets/Scripts/Frontline/Core', `
  'Assets/Scripts/Frontline/Runtime', `
  'Assets/Tests/EditMode/Frontline', `
  'tools'
```

Expected: PowerShell 创建这些目录，已有目录不会报错。

- [ ] **Step 2: 创建测试运行脚本**

Create `tools/run-editmode-tests.ps1`:

```powershell
param(
  [string]$ProjectPath = (Resolve-Path ".").Path,
  [string]$ResultsPath = "TestResults/EditMode.xml"
)

if (-not $env:UNITY_EXE) {
  Write-Error "UNITY_EXE environment variable is required. Set it to the full path of Unity.exe before running tests."
  exit 1
}

New-Item -ItemType Directory -Force -Path (Split-Path $ResultsPath) | Out-Null

& $env:UNITY_EXE `
  -batchmode `
  -quit `
  -projectPath $ProjectPath `
  -runTests `
  -testPlatform EditMode `
  -testResults $ResultsPath

exit $LASTEXITCODE
```

- [ ] **Step 3: 验证脚本缺少 Unity 路径时会失败**

Run:

```powershell
Remove-Item Env:UNITY_EXE -ErrorAction SilentlyContinue
.\tools\run-editmode-tests.ps1
```

Expected: FAIL，并显示 `UNITY_EXE environment variable is required`。

- [ ] **Step 4: Commit**

```bash
git add tools/run-editmode-tests.ps1
git commit -m "chore: add Unity editmode test runner"
```

---

### Task 2: 兵种数据与伤害计算

**Files:**

- Create: `Assets/Scripts/Frontline/Core/TeamId.cs`
- Create: `Assets/Scripts/Frontline/Core/UnitTypeId.cs`
- Create: `Assets/Scripts/Frontline/Core/UnitStats.cs`
- Create: `Assets/Scripts/Frontline/Core/DamageMatrix.cs`
- Create: `Assets/Scripts/Frontline/Core/CombatCalculator.cs`
- Test: `Assets/Tests/EditMode/Frontline/CombatCalculatorTests.cs`

- [ ] **Step 1: 写失败测试**

Create `Assets/Tests/EditMode/Frontline/CombatCalculatorTests.cs`:

```csharp
using Frontline.Core;
using NUnit.Framework;

namespace Frontline.Tests.EditMode
{
    public sealed class CombatCalculatorTests
    {
        [Test]
        public void CalculateDamage_UsesBaseDamageWhenNoCounter()
        {
            var attacker = UnitTypeId.Infantry;
            var defender = UnitTypeId.Infantry;

            float damage = CombatCalculator.CalculateDamage(10f, attacker, defender, DamageMatrix.Default);

            Assert.AreEqual(10f, damage);
        }

        [Test]
        public void CalculateDamage_AppliesCounterMultiplier()
        {
            float damage = CombatCalculator.CalculateDamage(12f, UnitTypeId.Spearman, UnitTypeId.Cavalry, DamageMatrix.Default);

            Assert.AreEqual(21f, damage);
        }

        [Test]
        public void DefaultStats_ContainFourUnitTypes()
        {
            Assert.AreEqual(100f, UnitStats.Default(UnitTypeId.Infantry).Health);
            Assert.AreEqual(110f, UnitStats.Default(UnitTypeId.Spearman).Health);
            Assert.AreEqual(70f, UnitStats.Default(UnitTypeId.Archer).Health);
            Assert.AreEqual(90f, UnitStats.Default(UnitTypeId.Cavalry).Health);
        }
    }
}
```

- [ ] **Step 2: 运行测试确认失败**

Run:

```powershell
.\tools\run-editmode-tests.ps1
```

Expected: FAIL，错误包含 `The type or namespace name 'Frontline' could not be found`。

- [ ] **Step 3: 写最小实现**

Create `Assets/Scripts/Frontline/Core/TeamId.cs`:

```csharp
namespace Frontline.Core
{
    public enum TeamId
    {
        Neutral = 0,
        Player = 1,
        Enemy = 2
    }
}
```

Create `Assets/Scripts/Frontline/Core/UnitTypeId.cs`:

```csharp
namespace Frontline.Core
{
    public enum UnitTypeId
    {
        Infantry = 0,
        Spearman = 1,
        Archer = 2,
        Cavalry = 3
    }
}
```

Create `Assets/Scripts/Frontline/Core/UnitStats.cs`:

```csharp
namespace Frontline.Core
{
    public readonly struct UnitStats
    {
        public UnitStats(float health, float attack, float attacksPerSecond, float range, float moveSpeed)
        {
            Health = health;
            Attack = attack;
            AttacksPerSecond = attacksPerSecond;
            Range = range;
            MoveSpeed = moveSpeed;
        }

        public float Health { get; }
        public float Attack { get; }
        public float AttacksPerSecond { get; }
        public float Range { get; }
        public float MoveSpeed { get; }

        public static UnitStats Default(UnitTypeId type)
        {
            switch (type)
            {
                case UnitTypeId.Infantry:
                    return new UnitStats(100f, 10f, 1.0f, 1.5f, 3.0f);
                case UnitTypeId.Spearman:
                    return new UnitStats(110f, 12f, 0.9f, 1.8f, 2.4f);
                case UnitTypeId.Archer:
                    return new UnitStats(70f, 8f, 1.1f, 6.0f, 2.8f);
                case UnitTypeId.Cavalry:
                    return new UnitStats(90f, 11f, 1.0f, 1.5f, 4.2f);
                default:
                    return new UnitStats(100f, 10f, 1.0f, 1.5f, 3.0f);
            }
        }
    }
}
```

Create `Assets/Scripts/Frontline/Core/DamageMatrix.cs`:

```csharp
namespace Frontline.Core
{
    public readonly struct DamageMatrix
    {
        public DamageMatrix(float counterMultiplier)
        {
            CounterMultiplier = counterMultiplier;
        }

        public float CounterMultiplier { get; }

        public static DamageMatrix Default => new DamageMatrix(1.75f);

        public bool DoesCounter(UnitTypeId attacker, UnitTypeId defender)
        {
            return attacker == UnitTypeId.Spearman && defender == UnitTypeId.Cavalry
                || attacker == UnitTypeId.Archer && defender == UnitTypeId.Spearman
                || attacker == UnitTypeId.Cavalry && defender == UnitTypeId.Archer;
        }
    }
}
```

Create `Assets/Scripts/Frontline/Core/CombatCalculator.cs`:

```csharp
namespace Frontline.Core
{
    public static class CombatCalculator
    {
        public static float CalculateDamage(float baseDamage, UnitTypeId attacker, UnitTypeId defender, DamageMatrix matrix)
        {
            return matrix.DoesCounter(attacker, defender)
                ? baseDamage * matrix.CounterMultiplier
                : baseDamage;
        }
    }
}
```

- [ ] **Step 4: 运行测试确认通过**

Run:

```powershell
.\tools\run-editmode-tests.ps1
```

Expected: PASS，`CombatCalculatorTests` 全部通过。

- [ ] **Step 5: Commit**

```bash
git add Assets/Scripts/Frontline/Core Assets/Tests/EditMode/Frontline/CombatCalculatorTests.cs
git commit -m "feat: add unit stats and combat calculation"
```

---

### Task 3: 路径图与最短路径

**Files:**

- Create: `Assets/Scripts/Frontline/Core/PathGraph.cs`
- Create: `Assets/Scripts/Frontline/Core/RoutePlanner.cs`
- Test: `Assets/Tests/EditMode/Frontline/RoutePlannerTests.cs`

- [ ] **Step 1: 写失败测试**

Create `Assets/Tests/EditMode/Frontline/RoutePlannerTests.cs`:

```csharp
using System.Collections.Generic;
using Frontline.Core;
using NUnit.Framework;

namespace Frontline.Tests.EditMode
{
    public sealed class RoutePlannerTests
    {
        [Test]
        public void FindRoute_ReturnsShortestNodePath()
        {
            var graph = new PathGraph();
            graph.AddUndirectedEdge("PlayerBase", "NorthPost");
            graph.AddUndirectedEdge("NorthPost", "EnemyBase");
            graph.AddUndirectedEdge("PlayerBase", "Center");
            graph.AddUndirectedEdge("Center", "EnemyBase");

            IReadOnlyList<string> route = RoutePlanner.FindRoute(graph, "PlayerBase", "EnemyBase");

            CollectionAssert.AreEqual(new[] { "PlayerBase", "NorthPost", "EnemyBase" }, route);
        }

        [Test]
        public void FindRoute_ReturnsEmptyWhenNoPathExists()
        {
            var graph = new PathGraph();
            graph.AddUndirectedEdge("A", "B");
            graph.AddNode("C");

            IReadOnlyList<string> route = RoutePlanner.FindRoute(graph, "A", "C");

            Assert.AreEqual(0, route.Count);
        }
    }
}
```

- [ ] **Step 2: 运行测试确认失败**

Run:

```powershell
.\tools\run-editmode-tests.ps1
```

Expected: FAIL，错误包含 `The type or namespace name 'PathGraph' could not be found`。

- [ ] **Step 3: 写最小实现**

Create `Assets/Scripts/Frontline/Core/PathGraph.cs`:

```csharp
using System.Collections.Generic;

namespace Frontline.Core
{
    public sealed class PathGraph
    {
        private readonly Dictionary<string, List<string>> edges = new Dictionary<string, List<string>>();

        public void AddNode(string nodeId)
        {
            if (!edges.ContainsKey(nodeId))
            {
                edges.Add(nodeId, new List<string>());
            }
        }

        public void AddUndirectedEdge(string a, string b)
        {
            AddNode(a);
            AddNode(b);
            AddDirectedEdge(a, b);
            AddDirectedEdge(b, a);
        }

        public IReadOnlyList<string> GetNeighbors(string nodeId)
        {
            return edges.TryGetValue(nodeId, out var neighbors)
                ? neighbors
                : new List<string>();
        }

        public bool Contains(string nodeId)
        {
            return edges.ContainsKey(nodeId);
        }

        private void AddDirectedEdge(string from, string to)
        {
            if (!edges[from].Contains(to))
            {
                edges[from].Add(to);
            }
        }
    }
}
```

Create `Assets/Scripts/Frontline/Core/RoutePlanner.cs`:

```csharp
using System.Collections.Generic;

namespace Frontline.Core
{
    public static class RoutePlanner
    {
        public static IReadOnlyList<string> FindRoute(PathGraph graph, string start, string goal)
        {
            if (!graph.Contains(start) || !graph.Contains(goal))
            {
                return new List<string>();
            }

            var frontier = new Queue<string>();
            var cameFrom = new Dictionary<string, string>();
            frontier.Enqueue(start);
            cameFrom[start] = string.Empty;

            while (frontier.Count > 0)
            {
                string current = frontier.Dequeue();
                if (current == goal)
                {
                    break;
                }

                foreach (string next in graph.GetNeighbors(current))
                {
                    if (cameFrom.ContainsKey(next))
                    {
                        continue;
                    }

                    cameFrom[next] = current;
                    frontier.Enqueue(next);
                }
            }

            if (!cameFrom.ContainsKey(goal))
            {
                return new List<string>();
            }

            var path = new List<string>();
            string cursor = goal;
            while (!string.IsNullOrEmpty(cursor))
            {
                path.Add(cursor);
                cursor = cameFrom[cursor];
            }

            path.Reverse();
            return path;
        }
    }
}
```

- [ ] **Step 4: 运行测试确认通过**

Run:

```powershell
.\tools\run-editmode-tests.ps1
```

Expected: PASS，`RoutePlannerTests` 全部通过。

- [ ] **Step 5: Commit**

```bash
git add Assets/Scripts/Frontline/Core/PathGraph.cs Assets/Scripts/Frontline/Core/RoutePlanner.cs Assets/Tests/EditMode/Frontline/RoutePlannerTests.cs
git commit -m "feat: add path graph route planning"
```

---

### Task 4: 营地产兵与占领规则

**Files:**

- Create: `Assets/Scripts/Frontline/Core/CampModel.cs`
- Create: `Assets/Scripts/Frontline/Core/CampProduction.cs`
- Create: `Assets/Scripts/Frontline/Core/CaptureResolver.cs`
- Test: `Assets/Tests/EditMode/Frontline/CampProductionTests.cs`
- Test: `Assets/Tests/EditMode/Frontline/CaptureResolverTests.cs`

- [ ] **Step 1: 写产兵失败测试**

Create `Assets/Tests/EditMode/Frontline/CampProductionTests.cs`:

```csharp
using Frontline.Core;
using NUnit.Framework;

namespace Frontline.Tests.EditMode
{
    public sealed class CampProductionTests
    {
        [Test]
        public void Tick_AddsUnitWhenIntervalCompletes()
        {
            var camp = new CampModel("PlayerBase", TeamId.Player, UnitTypeId.Infantry, 8f, 6);

            CampProduction.Tick(camp, 8f);

            Assert.AreEqual(1, camp.StoredUnits);
        }

        [Test]
        public void Tick_DoesNotExceedStorageLimit()
        {
            var camp = new CampModel("PlayerBase", TeamId.Player, UnitTypeId.Infantry, 8f, 1);
            CampProduction.Tick(camp, 8f);
            CampProduction.Tick(camp, 8f);

            Assert.AreEqual(1, camp.StoredUnits);
        }
    }
}
```

- [ ] **Step 2: 写占领失败测试**

Create `Assets/Tests/EditMode/Frontline/CaptureResolverTests.cs`:

```csharp
using Frontline.Core;
using NUnit.Framework;

namespace Frontline.Tests.EditMode
{
    public sealed class CaptureResolverTests
    {
        [Test]
        public void ResolveCapture_ChangesOwnerWhenDefendersAreCleared()
        {
            var camp = new CampModel("Center", TeamId.Neutral, UnitTypeId.Spearman, 11f, 4);

            CaptureResolver.ResolveCapture(camp, TeamId.Player, defenderCount: 0);

            Assert.AreEqual(TeamId.Player, camp.Owner);
            Assert.AreEqual(0f, camp.ProductionProgress);
        }

        [Test]
        public void ResolveCapture_KeepsOwnerWhenDefendersRemain()
        {
            var camp = new CampModel("Center", TeamId.Neutral, UnitTypeId.Spearman, 11f, 4);

            CaptureResolver.ResolveCapture(camp, TeamId.Player, defenderCount: 2);

            Assert.AreEqual(TeamId.Neutral, camp.Owner);
        }
    }
}
```

- [ ] **Step 3: 运行测试确认失败**

Run:

```powershell
.\tools\run-editmode-tests.ps1
```

Expected: FAIL，错误包含 `The type or namespace name 'CampModel' could not be found`。

- [ ] **Step 4: 写最小实现**

Create `Assets/Scripts/Frontline/Core/CampModel.cs`:

```csharp
namespace Frontline.Core
{
    public sealed class CampModel
    {
        public CampModel(string id, TeamId owner, UnitTypeId producedUnit, float productionInterval, int storageLimit)
        {
            Id = id;
            Owner = owner;
            ProducedUnit = producedUnit;
            ProductionInterval = productionInterval;
            StorageLimit = storageLimit;
            StoredUnits = 0;
            ProductionProgress = 0f;
        }

        public string Id { get; }
        public TeamId Owner { get; private set; }
        public UnitTypeId ProducedUnit { get; }
        public float ProductionInterval { get; }
        public int StorageLimit { get; }
        public int StoredUnits { get; private set; }
        public float ProductionProgress { get; private set; }

        public void AddProductionProgress(float deltaSeconds)
        {
            ProductionProgress += deltaSeconds;
        }

        public void ResetProductionProgress()
        {
            ProductionProgress = 0f;
        }

        public void AddStoredUnit()
        {
            if (StoredUnits < StorageLimit)
            {
                StoredUnits++;
            }
        }

        public int RemoveUnits(int count)
        {
            int removed = count > StoredUnits ? StoredUnits : count;
            StoredUnits -= removed;
            return removed;
        }

        public void ChangeOwner(TeamId owner)
        {
            Owner = owner;
            StoredUnits = 0;
            ResetProductionProgress();
        }
    }
}
```

Create `Assets/Scripts/Frontline/Core/CampProduction.cs`:

```csharp
namespace Frontline.Core
{
    public static class CampProduction
    {
        public static void Tick(CampModel camp, float deltaSeconds)
        {
            if (camp.Owner == TeamId.Neutral || camp.StoredUnits >= camp.StorageLimit)
            {
                return;
            }

            camp.AddProductionProgress(deltaSeconds);

            while (camp.ProductionProgress >= camp.ProductionInterval && camp.StoredUnits < camp.StorageLimit)
            {
                camp.AddStoredUnit();
                camp.ResetProductionProgress();
            }
        }
    }
}
```

Create `Assets/Scripts/Frontline/Core/CaptureResolver.cs`:

```csharp
namespace Frontline.Core
{
    public static class CaptureResolver
    {
        public static void ResolveCapture(CampModel camp, TeamId attacker, int defenderCount)
        {
            if (attacker == TeamId.Neutral || defenderCount > 0)
            {
                return;
            }

            camp.ChangeOwner(attacker);
        }
    }
}
```

- [ ] **Step 5: 运行测试确认通过**

Run:

```powershell
.\tools\run-editmode-tests.ps1
```

Expected: PASS，`CampProductionTests` 和 `CaptureResolverTests` 全部通过。

- [ ] **Step 6: Commit**

```bash
git add Assets/Scripts/Frontline/Core/CampModel.cs Assets/Scripts/Frontline/Core/CampProduction.cs Assets/Scripts/Frontline/Core/CaptureResolver.cs Assets/Tests/EditMode/Frontline/CampProductionTests.cs Assets/Tests/EditMode/Frontline/CaptureResolverTests.cs
git commit -m "feat: add camp production and capture rules"
```

---

### Task 5: 派兵数量计算

**Files:**

- Create: `Assets/Scripts/Frontline/Core/DispatchPlanner.cs`
- Test: `Assets/Tests/EditMode/Frontline/DispatchPlannerTests.cs`

- [ ] **Step 1: 写失败测试**

Create `Assets/Tests/EditMode/Frontline/DispatchPlannerTests.cs`:

```csharp
using Frontline.Core;
using NUnit.Framework;

namespace Frontline.Tests.EditMode
{
    public sealed class DispatchPlannerTests
    {
        [Test]
        public void CalculateDispatchCount_DefaultUsesHalfRoundedDown()
        {
            Assert.AreEqual(3, DispatchPlanner.CalculateDispatchCount(7, DispatchMode.Default));
        }

        [Test]
        public void CalculateDispatchCount_AllUsesAllUnits()
        {
            Assert.AreEqual(7, DispatchPlanner.CalculateDispatchCount(7, DispatchMode.All));
        }

        [Test]
        public void Dispatch_RemovesUnitsFromCamp()
        {
            var camp = new CampModel("PlayerBase", TeamId.Player, UnitTypeId.Infantry, 8f, 6);
            CampProduction.Tick(camp, 8f);
            CampProduction.Tick(camp, 8f);

            int removed = DispatchPlanner.Dispatch(camp, DispatchMode.All);

            Assert.AreEqual(2, removed);
            Assert.AreEqual(0, camp.StoredUnits);
        }
    }
}
```

- [ ] **Step 2: 运行测试确认失败**

Run:

```powershell
.\tools\run-editmode-tests.ps1
```

Expected: FAIL，错误包含 `The name 'DispatchPlanner' does not exist`。

- [ ] **Step 3: 写最小实现**

Create `Assets/Scripts/Frontline/Core/DispatchPlanner.cs`:

```csharp
namespace Frontline.Core
{
    public enum DispatchMode
    {
        Default = 0,
        All = 1
    }

    public static class DispatchPlanner
    {
        public static int CalculateDispatchCount(int storedUnits, DispatchMode mode)
        {
            if (storedUnits <= 0)
            {
                return 0;
            }

            if (mode == DispatchMode.All)
            {
                return storedUnits;
            }

            int half = storedUnits / 2;
            return half < 1 ? 1 : half;
        }

        public static int Dispatch(CampModel camp, DispatchMode mode)
        {
            int count = CalculateDispatchCount(camp.StoredUnits, mode);
            return camp.RemoveUnits(count);
        }
    }
}
```

- [ ] **Step 4: 运行测试确认通过**

Run:

```powershell
.\tools\run-editmode-tests.ps1
```

Expected: PASS，`DispatchPlannerTests` 全部通过。

- [ ] **Step 5: Commit**

```bash
git add Assets/Scripts/Frontline/Core/DispatchPlanner.cs Assets/Tests/EditMode/Frontline/DispatchPlannerTests.cs
git commit -m "feat: add dispatch planning rules"
```

---

### Task 6: Unity 营地和单位运行时桥接

**Files:**

- Create: `Assets/Scripts/Frontline/Runtime/CampRuntime.cs`
- Create: `Assets/Scripts/Frontline/Runtime/UnitAgent.cs`

- [ ] **Step 1: 创建营地运行时脚本**

Create `Assets/Scripts/Frontline/Runtime/CampRuntime.cs`:

```csharp
using System.Collections.Generic;
using Frontline.Core;
using UnityEngine;

namespace Frontline.Runtime
{
    public sealed class CampRuntime : MonoBehaviour
    {
        [SerializeField] private string campId = "Camp";
        [SerializeField] private TeamId owner = TeamId.Neutral;
        [SerializeField] private UnitTypeId producedUnit = UnitTypeId.Infantry;
        [SerializeField] private float productionInterval = 8f;
        [SerializeField] private int storageLimit = 6;
        [SerializeField] private Transform unitSpawnPoint;

        private readonly List<UnitAgent> garrison = new List<UnitAgent>();
        private CampModel model;

        public string CampId => campId;
        public TeamId Owner => model.Owner;
        public UnitTypeId ProducedUnit => model.ProducedUnit;
        public int StoredUnits => model.StoredUnits;
        public Transform UnitSpawnPoint => unitSpawnPoint != null ? unitSpawnPoint : transform;

        private void Awake()
        {
            model = new CampModel(campId, owner, producedUnit, productionInterval, storageLimit);
        }

        private void Update()
        {
            CampProduction.Tick(model, Time.deltaTime);
        }

        public int Dispatch(DispatchMode mode)
        {
            return DispatchPlanner.Dispatch(model, mode);
        }

        public void RegisterGarrison(UnitAgent unit)
        {
            if (!garrison.Contains(unit))
            {
                garrison.Add(unit);
            }
        }

        public void UnregisterGarrison(UnitAgent unit)
        {
            garrison.Remove(unit);
        }

        public void ResolveCapture(TeamId attacker)
        {
            CaptureResolver.ResolveCapture(model, attacker, garrison.Count);
        }
    }
}
```

- [ ] **Step 2: 创建单位运行时脚本**

Create `Assets/Scripts/Frontline/Runtime/UnitAgent.cs`:

```csharp
using System.Collections.Generic;
using Frontline.Core;
using UnityEngine;

namespace Frontline.Runtime
{
    public sealed class UnitAgent : MonoBehaviour
    {
        [SerializeField] private TeamId team = TeamId.Player;
        [SerializeField] private UnitTypeId unitType = UnitTypeId.Infantry;
        [SerializeField] private float stopDistance = 0.15f;

        private readonly Queue<Vector3> path = new Queue<Vector3>();
        private UnitStats stats;
        private float health;

        public TeamId Team => team;
        public UnitTypeId UnitType => unitType;
        public bool IsAlive => health > 0f;

        private void Awake()
        {
            stats = UnitStats.Default(unitType);
            health = stats.Health;
        }

        private void Update()
        {
            MoveAlongPath();
        }

        public void Initialize(TeamId newTeam, UnitTypeId newUnitType)
        {
            team = newTeam;
            unitType = newUnitType;
            stats = UnitStats.Default(unitType);
            health = stats.Health;
        }

        public void SetPath(IReadOnlyList<Vector3> points)
        {
            path.Clear();
            for (int i = 0; i < points.Count; i++)
            {
                path.Enqueue(points[i]);
            }
        }

        public void TakeDamage(float damage)
        {
            health -= damage;
            if (health <= 0f)
            {
                Destroy(gameObject);
            }
        }

        private void MoveAlongPath()
        {
            if (path.Count == 0)
            {
                return;
            }

            Vector3 target = path.Peek();
            Vector3 delta = target - transform.position;
            if (delta.magnitude <= stopDistance)
            {
                path.Dequeue();
                return;
            }

            Vector3 step = delta.normalized * stats.MoveSpeed * Time.deltaTime;
            transform.position += step;
            transform.forward = delta.normalized;
        }
    }
}
```

- [ ] **Step 3: 编译检查**

Run:

```powershell
.\tools\run-editmode-tests.ps1
```

Expected: PASS，且 Unity 编译不报错。

- [ ] **Step 4: Commit**

```bash
git add Assets/Scripts/Frontline/Runtime/CampRuntime.cs Assets/Scripts/Frontline/Runtime/UnitAgent.cs
git commit -m "feat: add camp and unit runtime bridge"
```

---

### Task 7: 灰盒地图启动器

**Files:**

- Create: `Assets/Scripts/Frontline/Runtime/MvpGameBootstrap.cs`

- [ ] **Step 1: 创建灰盒启动脚本**

Create `Assets/Scripts/Frontline/Runtime/MvpGameBootstrap.cs`:

```csharp
using System.Collections.Generic;
using Frontline.Core;
using UnityEngine;

namespace Frontline.Runtime
{
    public sealed class MvpGameBootstrap : MonoBehaviour
    {
        [SerializeField] private CampRuntime campPrefab;
        [SerializeField] private UnitAgent unitPrefab;
        [SerializeField] private Material playerMaterial;
        [SerializeField] private Material enemyMaterial;
        [SerializeField] private Material neutralMaterial;

        private readonly Dictionary<string, CampRuntime> camps = new Dictionary<string, CampRuntime>();
        private readonly PathGraph graph = new PathGraph();

        public IReadOnlyDictionary<string, CampRuntime> Camps => camps;
        public PathGraph Graph => graph;

        private void Start()
        {
            CreateCamp("PlayerBase", new Vector3(-12f, 0f, 0f), TeamId.Player, UnitTypeId.Infantry);
            CreateCamp("NorthPost", new Vector3(-4f, 0f, 5f), TeamId.Neutral, UnitTypeId.Archer);
            CreateCamp("Center", new Vector3(0f, 0f, 0f), TeamId.Neutral, UnitTypeId.Cavalry);
            CreateCamp("SouthPost", new Vector3(-4f, 0f, -5f), TeamId.Neutral, UnitTypeId.Spearman);
            CreateCamp("EnemyBase", new Vector3(12f, 0f, 0f), TeamId.Enemy, UnitTypeId.Infantry);

            Connect("PlayerBase", "NorthPost");
            Connect("PlayerBase", "Center");
            Connect("PlayerBase", "SouthPost");
            Connect("NorthPost", "Center");
            Connect("SouthPost", "Center");
            Connect("Center", "EnemyBase");
        }

        public void SpawnDispatchedUnits(CampRuntime source, string targetCampId, int count)
        {
            if (!camps.ContainsKey(targetCampId))
            {
                return;
            }

            var nodeRoute = RoutePlanner.FindRoute(graph, source.CampId, targetCampId);
            if (nodeRoute.Count == 0)
            {
                return;
            }

            var points = new List<Vector3>();
            for (int i = 0; i < nodeRoute.Count; i++)
            {
                points.Add(camps[nodeRoute[i]].transform.position);
            }

            for (int i = 0; i < count; i++)
            {
                var spawnPosition = source.UnitSpawnPoint.position + new Vector3(i * 0.3f, 0f, 0f);
                var unit = Instantiate(unitPrefab, spawnPosition, Quaternion.identity);
                unit.Initialize(source.Owner, source.ProducedUnit);
                unit.SetPath(points);
            }
        }

        private void CreateCamp(string id, Vector3 position, TeamId owner, UnitTypeId producedUnit)
        {
            var camp = Instantiate(campPrefab, position, Quaternion.identity);
            camp.name = id;
            camps[id] = camp;
            graph.AddNode(id);
            ApplyMaterial(camp.gameObject, owner);
        }

        private void Connect(string a, string b)
        {
            graph.AddUndirectedEdge(a, b);
            Debug.DrawLine(camps[a].transform.position, camps[b].transform.position, Color.white, 999f);
        }

        private void ApplyMaterial(GameObject campObject, TeamId owner)
        {
            var renderer = campObject.GetComponentInChildren<Renderer>();
            if (renderer == null)
            {
                return;
            }

            if (owner == TeamId.Player)
            {
                renderer.material = playerMaterial;
            }
            else if (owner == TeamId.Enemy)
            {
                renderer.material = enemyMaterial;
            }
            else
            {
                renderer.material = neutralMaterial;
            }
        }
    }
}
```

- [ ] **Step 2: 修正 CampRuntime 允许启动器设置 ID 和阵营**

Modify `Assets/Scripts/Frontline/Runtime/CampRuntime.cs` by adding this method inside the class:

```csharp
public void Initialize(string newCampId, TeamId newOwner, UnitTypeId newProducedUnit)
{
    campId = newCampId;
    owner = newOwner;
    producedUnit = newProducedUnit;
    model = new CampModel(campId, owner, producedUnit, productionInterval, storageLimit);
}
```

Modify `MvpGameBootstrap.CreateCamp` to call it:

```csharp
camp.Initialize(id, owner, producedUnit);
```

- [ ] **Step 3: 编译检查**

Run:

```powershell
.\tools\run-editmode-tests.ps1
```

Expected: PASS，且 Unity 编译不报错。

- [ ] **Step 4: Commit**

```bash
git add Assets/Scripts/Frontline/Runtime/MvpGameBootstrap.cs Assets/Scripts/Frontline/Runtime/CampRuntime.cs
git commit -m "feat: add MVP greybox map bootstrap"
```

---

### Task 8: 鼠标拖拽派兵与镜头缩放

**Files:**

- Create: `Assets/Scripts/Frontline/Runtime/FrontlineInput.cs`
- Create: `Assets/Scripts/Frontline/Runtime/TopDownCameraController.cs`

- [ ] **Step 1: 创建输入脚本**

Create `Assets/Scripts/Frontline/Runtime/FrontlineInput.cs`:

```csharp
using Frontline.Core;
using UnityEngine;

namespace Frontline.Runtime
{
    public sealed class FrontlineInput : MonoBehaviour
    {
        [SerializeField] private Camera mainCamera;
        [SerializeField] private MvpGameBootstrap bootstrap;
        [SerializeField] private LayerMask campMask;

        private CampRuntime selectedCamp;

        private void Awake()
        {
            if (mainCamera == null)
            {
                mainCamera = Camera.main;
            }
        }

        private void Update()
        {
            if (Input.GetMouseButtonDown(0))
            {
                selectedCamp = RaycastCamp();
            }

            if (Input.GetMouseButtonUp(0) && selectedCamp != null)
            {
                CampRuntime targetCamp = RaycastCamp();
                if (targetCamp != null && targetCamp != selectedCamp)
                {
                    DispatchMode mode = Input.GetKey(KeyCode.LeftShift) || Input.GetKey(KeyCode.RightShift)
                        ? DispatchMode.All
                        : DispatchMode.Default;

                    int count = selectedCamp.Dispatch(mode);
                    bootstrap.SpawnDispatchedUnits(selectedCamp, targetCamp.CampId, count);
                }

                selectedCamp = null;
            }
        }

        private CampRuntime RaycastCamp()
        {
            Ray ray = mainCamera.ScreenPointToRay(Input.mousePosition);
            if (Physics.Raycast(ray, out RaycastHit hit, 500f, campMask))
            {
                return hit.collider.GetComponentInParent<CampRuntime>();
            }

            return null;
        }
    }
}
```

- [ ] **Step 2: 创建镜头缩放脚本**

Create `Assets/Scripts/Frontline/Runtime/TopDownCameraController.cs`:

```csharp
using UnityEngine;

namespace Frontline.Runtime
{
    public sealed class TopDownCameraController : MonoBehaviour
    {
        [SerializeField] private float zoomSpeed = 12f;
        [SerializeField] private float minHeight = 10f;
        [SerializeField] private float maxHeight = 35f;

        private void Update()
        {
            float scroll = Input.mouseScrollDelta.y;
            if (Mathf.Abs(scroll) < 0.01f)
            {
                return;
            }

            Vector3 position = transform.position;
            position.y = Mathf.Clamp(position.y - scroll * zoomSpeed * Time.deltaTime, minHeight, maxHeight);
            transform.position = position;
        }
    }
}
```

- [ ] **Step 3: 编译检查**

Run:

```powershell
.\tools\run-editmode-tests.ps1
```

Expected: PASS，且 Unity 编译不报错。

- [ ] **Step 4: Unity 场景装配**

In Unity Editor:

1. Create scene `Assets/Scenes/MvpGreybox.unity`.
2. Add a Plane at `(0, 0, 0)` scaled to `(4, 1, 3)`.
3. Create a camp prefab with a Cylinder, Collider, and `CampRuntime`.
4. Create a unit prefab with a Capsule and `UnitAgent`.
5. Add an empty GameObject named `GameBootstrap` and attach `MvpGameBootstrap`.
6. Assign camp prefab, unit prefab, and simple red/blue/gray materials.
7. Add an empty GameObject named `Input` and attach `FrontlineInput`.
8. Assign `Camera.main`, `GameBootstrap`, and the camp layer mask.
9. Set the camera position to `(0, 24, -18)` and rotation to `(55, 0, 0)`.
10. Attach `TopDownCameraController` to the camera.

Expected: Press Play, camps spawn in a small greybox network.

- [ ] **Step 5: Manual smoke test**

In Play Mode:

1. Wait until `PlayerBase` stores at least 1 unit.
2. Drag from `PlayerBase` to `Center`.
3. Confirm units spawn and move along the route.
4. Hold Shift and drag from `PlayerBase` to `EnemyBase`.
5. Confirm all stored units dispatch.
6. Scroll mouse wheel.
7. Confirm camera height changes.

Expected: Core movement loop works without console errors.

- [ ] **Step 6: Commit**

```bash
git add Assets/Scripts/Frontline/Runtime/FrontlineInput.cs Assets/Scripts/Frontline/Runtime/TopDownCameraController.cs Assets/Scenes/MvpGreybox.unity
git commit -m "feat: add MVP input and camera controls"
```

---

### Task 9: 基础运行时战斗与占领闭环

**Files:**

- Modify: `Assets/Scripts/Frontline/Runtime/UnitAgent.cs`
- Modify: `Assets/Scripts/Frontline/Runtime/CampRuntime.cs`

- [ ] **Step 1: 修改 UnitAgent 支持自动接敌攻击**

Replace `Assets/Scripts/Frontline/Runtime/UnitAgent.cs` with:

```csharp
using System.Collections.Generic;
using Frontline.Core;
using UnityEngine;

namespace Frontline.Runtime
{
    public sealed class UnitAgent : MonoBehaviour
    {
        private static readonly List<UnitAgent> ActiveUnits = new List<UnitAgent>();

        [SerializeField] private TeamId team = TeamId.Player;
        [SerializeField] private UnitTypeId unitType = UnitTypeId.Infantry;
        [SerializeField] private float stopDistance = 0.15f;

        private readonly Queue<Vector3> path = new Queue<Vector3>();
        private UnitStats stats;
        private float health;
        private float attackTimer;
        private UnitAgent currentTarget;

        public TeamId Team => team;
        public UnitTypeId UnitType => unitType;
        public bool IsAlive => health > 0f;

        private void Awake()
        {
            stats = UnitStats.Default(unitType);
            health = stats.Health;
        }

        private void OnEnable()
        {
            if (!ActiveUnits.Contains(this))
            {
                ActiveUnits.Add(this);
            }
        }

        private void OnDisable()
        {
            ActiveUnits.Remove(this);
        }

        private void Update()
        {
            if (!IsAlive)
            {
                return;
            }

            currentTarget = FindTargetInRange();
            if (currentTarget != null)
            {
                AttackCurrentTarget();
                return;
            }

            MoveAlongPath();
        }

        public void Initialize(TeamId newTeam, UnitTypeId newUnitType)
        {
            team = newTeam;
            unitType = newUnitType;
            stats = UnitStats.Default(unitType);
            health = stats.Health;
        }

        public void SetPath(IReadOnlyList<Vector3> points)
        {
            path.Clear();
            for (int i = 0; i < points.Count; i++)
            {
                path.Enqueue(points[i]);
            }
        }

        public void TakeDamage(float damage)
        {
            health -= damage;
            if (health <= 0f)
            {
                Destroy(gameObject);
            }
        }

        private UnitAgent FindTargetInRange()
        {
            UnitAgent best = null;
            float bestDistance = float.MaxValue;

            for (int i = 0; i < ActiveUnits.Count; i++)
            {
                UnitAgent candidate = ActiveUnits[i];
                if (candidate == null || candidate == this || !candidate.IsAlive || candidate.Team == team)
                {
                    continue;
                }

                float distance = Vector3.Distance(transform.position, candidate.transform.position);
                if (distance <= stats.Range && distance < bestDistance)
                {
                    best = candidate;
                    bestDistance = distance;
                }
            }

            return best;
        }

        private void AttackCurrentTarget()
        {
            attackTimer -= Time.deltaTime;
            if (attackTimer > 0f)
            {
                return;
            }

            float damage = CombatCalculator.CalculateDamage(stats.Attack, unitType, currentTarget.UnitType, DamageMatrix.Default);
            currentTarget.TakeDamage(damage);
            attackTimer = 1f / stats.AttacksPerSecond;
        }

        private void MoveAlongPath()
        {
            if (path.Count == 0)
            {
                return;
            }

            Vector3 target = path.Peek();
            Vector3 delta = target - transform.position;
            if (delta.magnitude <= stopDistance)
            {
                path.Dequeue();
                return;
            }

            Vector3 step = delta.normalized * stats.MoveSpeed * Time.deltaTime;
            transform.position += step;
            transform.forward = delta.normalized;
        }
    }
}
```

- [ ] **Step 2: 修改 CampRuntime 支持触发区占领**

Replace `Assets/Scripts/Frontline/Runtime/CampRuntime.cs` with:

```csharp
using System.Collections.Generic;
using Frontline.Core;
using UnityEngine;

namespace Frontline.Runtime
{
    public sealed class CampRuntime : MonoBehaviour
    {
        [SerializeField] private string campId = "Camp";
        [SerializeField] private TeamId owner = TeamId.Neutral;
        [SerializeField] private UnitTypeId producedUnit = UnitTypeId.Infantry;
        [SerializeField] private float productionInterval = 8f;
        [SerializeField] private int storageLimit = 6;
        [SerializeField] private Transform unitSpawnPoint;

        private readonly List<UnitAgent> nearbyUnits = new List<UnitAgent>();
        private CampModel model;

        public string CampId => campId;
        public TeamId Owner => model.Owner;
        public UnitTypeId ProducedUnit => model.ProducedUnit;
        public int StoredUnits => model.StoredUnits;
        public Transform UnitSpawnPoint => unitSpawnPoint != null ? unitSpawnPoint : transform;

        private void Awake()
        {
            model = new CampModel(campId, owner, producedUnit, productionInterval, storageLimit);
        }

        private void Update()
        {
            CampProduction.Tick(model, Time.deltaTime);
            RemoveDeadUnits();
            ResolveRuntimeCapture();
        }

        private void OnTriggerEnter(Collider other)
        {
            var unit = other.GetComponentInParent<UnitAgent>();
            if (unit != null && !nearbyUnits.Contains(unit))
            {
                nearbyUnits.Add(unit);
            }
        }

        private void OnTriggerExit(Collider other)
        {
            var unit = other.GetComponentInParent<UnitAgent>();
            if (unit != null)
            {
                nearbyUnits.Remove(unit);
            }
        }

        public void Initialize(string newCampId, TeamId newOwner, UnitTypeId newProducedUnit)
        {
            campId = newCampId;
            owner = newOwner;
            producedUnit = newProducedUnit;
            model = new CampModel(campId, owner, producedUnit, productionInterval, storageLimit);
        }

        public int Dispatch(DispatchMode mode)
        {
            return DispatchPlanner.Dispatch(model, mode);
        }

        public void RegisterGarrison(UnitAgent unit)
        {
            if (!nearbyUnits.Contains(unit))
            {
                nearbyUnits.Add(unit);
            }
        }

        public void UnregisterGarrison(UnitAgent unit)
        {
            nearbyUnits.Remove(unit);
        }

        private void RemoveDeadUnits()
        {
            for (int i = nearbyUnits.Count - 1; i >= 0; i--)
            {
                if (nearbyUnits[i] == null || !nearbyUnits[i].IsAlive)
                {
                    nearbyUnits.RemoveAt(i);
                }
            }
        }

        private void ResolveRuntimeCapture()
        {
            TeamId attacker = TeamId.Neutral;
            int defenders = 0;
            int attackers = 0;

            for (int i = 0; i < nearbyUnits.Count; i++)
            {
                UnitAgent unit = nearbyUnits[i];
                if (unit.Team == model.Owner)
                {
                    defenders++;
                }
                else if (unit.Team != TeamId.Neutral)
                {
                    attacker = unit.Team;
                    attackers++;
                }
            }

            if (attackers > 0 && defenders == 0)
            {
                CaptureResolver.ResolveCapture(model, attacker, defenders);
            }
        }
    }
}
```

- [ ] **Step 3: Unity 场景碰撞设置**

In Unity Editor:

1. Ensure unit prefab has a `Collider`.
2. Ensure unit prefab has a `Rigidbody`.
3. Set unit `Rigidbody` to `Is Kinematic = true`.
4. Ensure camp prefab has a child trigger collider named `CaptureZone`.
5. Set `CaptureZone` collider `Is Trigger = true`.
6. Make the trigger radius large enough to cover the camp area.

Expected: Units entering a camp trigger are counted as nearby units.

- [ ] **Step 4: Manual combat and capture smoke test**

In Play Mode:

1. Wait for `PlayerBase` to produce units.
2. Drag units from `PlayerBase` to `Center`.
3. Use Inspector to set `Center` owner to `Neutral` and keep no defending units near it.
4. Confirm arriving player units change `Center` owner to `Player`.
5. Spawn or move enemy units near player units.
6. Confirm units stop and attack when in range.
7. Confirm damaged units disappear when health reaches 0.

Expected: A player can dispatch units, units fight enemies, and empty camps can change owner.

- [ ] **Step 5: Commit**

```bash
git add Assets/Scripts/Frontline/Runtime/UnitAgent.cs Assets/Scripts/Frontline/Runtime/CampRuntime.cs
git commit -m "feat: add basic runtime combat and capture"
```

---

## Self-Review

Spec coverage:

- Unity 3D and C# are covered by runtime scripts and scene setup.
- Greybox map is covered by `MvpGameBootstrap`.
- Camp production and storage are covered by `CampModel` and `CampProduction`.
- Drag dispatch is covered by `DispatchPlanner` and `FrontlineInput`.
- Path movement is covered by `PathGraph`, `RoutePlanner`, and `UnitAgent`.
- Basic combat math is covered by `CombatCalculator`.
- Runtime unit combat is covered by `UnitAgent`.
- Capture rules are covered by `CaptureResolver`.
- Runtime camp capture is covered by `CampRuntime`.

Separate plans will cover:

- Simple AI.
- Roguelite upgrades.
- Anti-snowball rules.
- Strategic-layer territory aggregation.
- Full UI.

Placeholder scan:

- 没有未填写的占位段落。
- 没有空泛的“以后补充”步骤。
- 测试代码引用的方法和类型都在本计划中定义。
- 所有代码片段使用的核心类型都先于调用处出现。

Type consistency:

- `TeamId`, `UnitTypeId`, `UnitStats`, `DamageMatrix`, and `CombatCalculator` are introduced before runtime scripts use them.
- `CampModel`, `CampProduction`, `CaptureResolver`, and `DispatchPlanner` are introduced before `CampRuntime` uses them.
- `PathGraph` and `RoutePlanner` are introduced before `MvpGameBootstrap` uses them.
