---
title: Workflow vs Agent：边界与选择
date: 2026-09-05
tags: [Agent设计模式]
summary: Workflow 是你编排模型，Agent 是模型自己编排工具调用——大部分生产系统应该用前者。判断标准就一条：决策路径可不可以预先画出来。
---

Agent 章第一篇先解决一个价值观问题：**什么时候根本不该用 Agent**。Anthropic 的《Building Effective Agents》是当前最清醒的表态，这篇以它为纲。

## 一条分界线

- **Workflow（工作流）**：开发者预先定义好控制流——固定步骤、固定顺序，模型是流程中被调用的"智能节点"。决策路径**可以预先画成流程图**
- **Agent**：开发者只给目标和工具，控制流由模型在循环里自己决定——下一步调什么工具、调几次、何时收手，都是模型现场决策。决策路径**画不出来，只能事后看轨迹**

注意这不是"低级/高级"的关系，是**可预测性 vs 灵活性**的取舍：

| | Workflow | Agent |
|---|---|---|
| 可预测性/可调试性 | 高（每步确定） | 低（轨迹不确定） |
| 延迟与成本 | 低、可预算 | 高、不可预算 |
| 能处理的任务 | 步骤可枚举的 | 步骤无法预先枚举的 |
| 失败模式 | 单点失败 | 决策错误复合放大 |

## 默认 Workflow，理由是工程性的

Agent 每多一次自主决策，就多一层不确定性：错误决策会流入下一步被放大，调试要看"轨迹"而不是"日志"，评测要评"过程"而不只是"结果"（见 [Agent evals](../evaluation/03-agent-evals.md)）。Anthropic 的原话大意：**大多数场景下，用可组合的 workflow + 最小子集就能赢，Agent 留给真正开放式的问题**。

反过来，Agent 值得上的信号：

- 任务步骤**无法预先枚举**（"调研这个问题并写报告"——步骤取决于发现）
- 需要在**运行时根据中间结果改变计划**（搜到 A 线索后决定转向 B）
- 步骤数量级大且分支多，手写流程图的维护成本超过 Agent 的不可控成本

一个诚实的自检问题：**"这个任务的每一步，我现在能画在流程图上吗？"** 能 → workflow。不能，且不是因为偷懒 → 才考虑 Agent。

## 上限与下限

- **下限**：很多"要用 Agent"的需求，其实一段精心写的 prompt + 一个函数调用就解决了——先跑通零 Agent 版本，再谈升级。它既是基线（见[评测先行](../evaluation/01-evaluation-first.md)），也常是终点
- **上限**：即使上了 Agent，也**限制决策自由度**——工具列表收窄、循环设上限、关键步骤加 human-in-the-loop。Agent 的工程不是"放权"，是"放多少权"

## 在本知识体系中的位置

下一篇[五个基础模式](02-five-patterns.md)讲的都是 workflow 侧的可复用结构（它们也是 Agent 的积木）；[手写最小循环](03-minimal-agent-loop.md)才进入真 Agent。学完后回到这篇的判断标准做选型——顺序是"先有积木，再做决定"。

## 参考与延伸

- [Anthropic · Building Effective Agents](https://www.anthropic.com/research/building-effective-agents)（本章与本章后续多篇的总纲，必读）
- [datawhalechina/Agent-Learning-Hub（中文 · Agent 学习路线与资料库）](https://github.com/datawhalechina/Agent-Learning-Hub)
