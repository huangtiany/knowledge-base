---
title: Workflow vs Agent：边界与选择
date: 2026-09-05
tags: [Agent设计模式]
summary: Workflow 由开发者编排模型调用，Agent 由模型自己决定下一步调用什么工具，大部分生产系统应该用前者。判断标准就一条：决策路径能不能预先画出来。
---

先回答一个问题：**什么时候根本不该用 Agent**。Anthropic 的《Building Effective Agents》对这个问题给出了目前最明确的立场，本章以它为主要依据。

## 一条分界线

- **Workflow（工作流）**：开发者预先定义好控制流，固定步骤、固定顺序，模型是流程中被调用的一个环节。决策路径**可以预先画成流程图**
- **Agent**：开发者只给目标和工具，控制流由模型在循环里自己决定：下一步调什么工具、调几次、何时停止，都是模型现场决策。决策路径**画不出来，只能事后看轨迹**

注意两者没有"低级/高级"之分，取舍在**可预测性 vs 灵活性**之间：

| | Workflow | Agent |
|---|---|---|
| 可预测性/可调试性 | 高（每步确定） | 低（轨迹不确定） |
| 延迟与成本 | 低、可预算 | 高、不可预算 |
| 能处理的任务 | 步骤可枚举的 | 步骤无法预先枚举的 |
| 失败模式 | 单点失败 | 决策错误复合放大 |

## 默认 Workflow，理由是工程性的

Agent 每多一次自主决策，就多一层不确定性：错误决策会流入下一步被放大，调试对象从日志变成轨迹，评测要从结果扩展到过程（见 [Agent evals](../evaluation/03-agent-evals.md)）。Anthropic 的原话大意：**大多数场景下，用可组合的 workflow 加最小的组件就能获得最好效果，Agent 留给真正开放式的问题**。

反过来，Agent 值得上的信号：

- 任务步骤**无法预先枚举**（"调研这个问题并写报告"，步骤取决于发现）
- 需要在**运行时根据中间结果改变计划**（搜到 A 线索后决定转向 B）
- 步骤数量级大且分支多，手写流程图的维护成本超过 Agent 的不可控成本

一个自检问题：这个任务的每一步，我现在能画在流程图上吗？能，就用 workflow；不能、且不是因为偷懒，才考虑 Agent。

## 上限与下限

- **下限**：很多"要用 Agent"的需求，其实一段精心写的 prompt 加一个函数调用就能解决。先跑通零 Agent 版本，再谈升级；它既是基线（见[评测先行](../evaluation/01-evaluation-first.md)），也常是终点
- **上限**：即使上了 Agent，也**限制决策自由度**：工具列表收窄、循环设上限、关键步骤加 human-in-the-loop。Agent 的工程不是"放权"，是"放多少权"

## 在本知识体系中的位置

下一篇[五个基础模式](02-five-patterns.md)讲 workflow 侧的可复用结构（它们也是 Agent 的组成部分）；[手写最小循环](03-minimal-agent-loop.md)才进入真 Agent。按这个顺序学完，再回到本文的判断标准做选型。

## 参考与延伸

- [Anthropic · Building Effective Agents](https://www.anthropic.com/research/building-effective-agents)（本章与本章后续多篇的总纲，必读）
- [datawhalechina/Agent-Learning-Hub（中文 · Agent 学习路线与资料库）](https://github.com/datawhalechina/Agent-Learning-Hub)
