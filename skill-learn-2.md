---
type: Note
---
# skill-learn

---

## name: continual-learning
description: 通过委托 `agents-memory-updater` 进行 transcript 挖掘和 `AGENTS.md` 更新，来编排持续学习流程。
disable-model-invocation: true

# 持续学习

通过把记忆更新流程委托给一个 subagent，让 `AGENTS.md` 保持最新。

## 触发条件

当用户要求挖掘过去的聊天、维护 `AGENTS.md`，或运行 continual-learning 循环时使用。

## 工作流

1. 调用 `agents-memory-updater`。
2. 返回 updater 的结果。

## 约束

- 父 skill 只负责流程编排。
- 不要在父流程里挖掘 transcripts 或编辑文件。
- 不要绕过 subagent。
