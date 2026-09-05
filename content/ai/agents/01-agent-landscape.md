---
title: Agent 生态全景：产品、框架与平台
date: 2026-09-05
tags: [Agent生态]
summary: 把"热门 Agent"放进一张地图——框架是造 Agent 的库，产品是解决任务的完整应用，平台是可视化搭建场；评估任何一个 Agent 都用同一组维度。
---

学完[设计模式](../agent/01-workflow-vs-agent.md)和[手写循环](../agent/03-minimal-agent-loop.md)之后，看热门 Agent 项目会有一种"拆解玩具"的乐趣。这一章就干这件事。开篇先把生态分成三层，避免概念混淆。

## 三层生态

| 层 | 是什么 | 代表 | 本站位置 |
|---|---|---|---|
| **框架** | 造 Agent 的库/SDK：状态管理、工具协议、编排 | LangGraph、AutoGen、CrewAI | [Agent框架](../agent/09-langgraph.md) |
| **产品/项目** | 用 Agent 能力解决具体任务的完整应用 | OpenHands、Manus、MetaGPT | 本章主角 |
| **平台** | 可视化搭建 + 托管运维的一站式场 | Dify、Coze、n8n | [平台篇](05-agent-platforms.md) |

一个项目可能跨层（AutoGen 既是框架也有应用生态；Dify 平台里能搭 Agent），但问"它是哪层"永远是理解它的第一步。**框架讲机制，产品讲取舍，平台讲效率**——本章看产品时，最关心的就是它们替用户做了哪些取舍。

## 评估一个 Agent 的五个维度

面对任何新 Agent（包括自己搭的），用同一组问题拆：

1. **任务边界**：垂直（编程、研究）还是通用（任何事）？垂直的几乎总是更好用——工具集和 prompt 都为领域调过
2. **自主度**：站在 [workflow → agent 光谱](../agent/01-workflow-vs-agent.md)的哪一侧？多数"爆款"其实是精心设计的 workflow + 少量自主决策，纯自由 Agent 极少
3. **工具与上下文设计**：工具列表长什么样？system prompt 怎么管状态？（这是下一节的拆解入口）
4. **可控性**：计划能不能预览？执行能不能暂停/纠正？（human-in-the-loop 的实现质量）
5. **成本与安全**：一次任务烧多少 token？执行环境是否隔离（沙箱/容器）？

## 拆解开源 Agent 的正确姿势

开源 Agent 最大的学习价值是可以直接读源码。别从入口文件顺着读，按这个顺序：

1. **先找 system prompt**——整个 Agent 的架构哲学浓缩在这几百字里（角色设定、工具使用纪律、终止条件），通常在 prompts 目录或常量文件里
2. **再看工具定义**——工具列表和参数 schema 就是这个 Agent 的"能力边界宣言"（对照 [function calling 篇](../agent/06-function-calling.md)的写法纪律）
3. **最后看主循环**——你会反复发现一件事：剥掉工程包装，核心几乎都是[最小循环](../agent/03-minimal-agent-loop.md)的变体。这不是巧合，是 Agent 的本质就这么简单

读到"这步我也能写"的地方，学习目标就达成了。

## 本章速览

| 项目 | 类别 | 一句话 |
|---|---|---|
| OpenHands | 编程 | 开源编程 Agent 顶流，事件流 + 沙箱 |
| SWE-agent | 编程 | 学术系代表，提出 Agent-Computer Interface 概念 |
| Aider | 编程 | 终端结对编程，git 原生集成 |
| Cline | 编程 | VS Code 内的 Agent，plan/act 双模式 |
| Claude Code / Codex / OpenCode / pi / Grok Build | 编程 · CLI | 终端 Agent 浪潮，见 [CLI 篇](06-cli-agents.md) |
| Manus | 通用执行 | 2025 爆款（闭源），虚拟机里的执行型 Agent |
| Open Interpreter | 通用执行 | 本地代码执行解题的鼻祖 |
| browser-use | 浏览器 | 把浏览器变成 Agent 工具的库 |
| MetaGPT | 多智能体 | "AI 软件公司"，角色分工流水线 |
| gpt-researcher | 研究 | 深度研究 Agent 的开源代表 |
| Dify / Coze Studio / FastGPT | 平台 | 可视化搭建与托管 |

后面四篇按类别逐一拆。

## 参考与延伸

- [datawhalechina/Agent-Learning-Hub（中文 · Agent 学习路线）](https://github.com/datawhalechina/Agent-Learning-Hub)
- [Anthropic · Building Effective Agents](https://www.anthropic.com/research/building-effective-agents)（评估维度的原始框架）
