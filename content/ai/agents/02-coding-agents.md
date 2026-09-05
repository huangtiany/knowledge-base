---
title: 编程 Agent：OpenHands、SWE-agent、Aider 与 Cline
date: 2026-09-05
tags: [Agent生态]
summary: 编程是 Agent 最先跑通的任务形态，因为代码自带验证闭环——编译、测试、运行结果就是最诚实的奖励信号。四个开源代表各讲一个核心设计。
---

编程 Agent 是整个 Agent 生态里最成熟的物种，原因值得先说透：**任务自带验证闭环**。写出来的代码能不能编译、测试过不过、程序跑不跑得通——奖励信号免费、客观、即时。其他领域（写报告、做调研）都没有这么好的"判卷器"。这也是为什么 SWE-bench 能成为 Agent 的事实基准。

## OpenHands：事件流 + 沙箱的平台化

OpenHands（原名 OpenDevin，All-Hands-AI）是开源编程 Agent 的顶流：浏览器界面里给一个任务，Agent 在**容器沙箱**里自主操作——读写文件、跑命令、起服务、装依赖，甚至浏览网页。

架构上最值得看的是**事件流（Event Stream）架构**：Agent、用户、执行环境的一切交互都记为事件流（action / observation 交替），Agent 每一步基于完整事件历史决策。这个抽象让回放、调试、多 Agent 协作都变得自然——想改进 OpenHands 的人，通常从读它的事件类型定义开始。

SWE-bench 成绩常年位居开源前列，是"能不能干活"的试金石。

## SWE-agent：工具接口本身是研究贡献

SWE-agent（普林斯顿 NLP 组）的论文标题就是它的贡献：**Agent-Computer Interface（ACI）**。核心洞察：给 Agent 的工具接口设计，和人机交互设计一样重要——文件查看器一次显示太多行，Agent 会迷路；linter 报错信息组织得好，Agent 修复率显著上升。

它把"接口设计"当成了可实验、可优化的对象：搜索工具怎么返回结果（带上下文窗口的 grep）、文件编辑器怎么限制视图（防上下文爆炸），都做过消融实验。读它的仓库，重点不是循环（那是标准[最小循环](../agent/03-minimal-agent-loop.md)），是**每个工具的返回格式设计**。

## Aider：终端结对编程的极简主义

Aider 走的是另一极：不要沙箱、不要界面，就是一个终端命令——你说需求，它直接改你的仓库。两个设计点特别值得学：

- **repo map**：用代码语义分析生成仓库的结构化地图塞进上下文，让 Agent 不读全库也知道该去哪改（上下文工程的教科书案例，对照[上下文窗口篇](../llm-basics/02-context-window-and-tokens.md)）
- **git 原生**：每次修改自动 commit，改坏了一键回滚——用"每步可撤销"换"试错的胆量"，这个取舍对所有 Agent 都成立

## Cline：住在 IDE 里的 Agent

Cline（VS Code 插件，原 Claude Dev）把 Agent 带进编辑器：读文件、改代码、跑终端命令、截图浏览器，全部在 IDE 内完成且**每一步请求确认**（可切换自动批准）。它的 plan/act 双模式是可控性的范本——计划阶段只读不动手（列出要改哪些文件），确认后切执行阶段（见[评估维度里的"可控性"](01-agent-landscape.md)）。它还是早期积极支持 MCP 客户端的工具（见 [MCP 篇](../agent/07-mcp-protocol.md)）。

## 共性观察

四个项目四个形态（平台/研究/终端/IDE），剥开看共性：

- **核心循环全是"编辑 → 运行 → 读反馈 → 再编辑"**，差异只在执行环境的隔离级别（无沙箱 → 容器 → 云端虚拟机）
- **上下文工程是主要护城河**：repo map、事件流裁剪、文件视图限制——都是"往有限窗口里塞对的东西"
- **确认机制决定安全感**：每步确认（Cline）vs 全自动（OpenHands 沙箱内）vs 按操作分级（Aider 只对 git 外的操作确认）

闭源侧（Claude Code）与开源 CLI 一族（Codex、OpenCode、pi）在 2025 年后汇聚成了终端 Agent 浪潮，且形态演化出值得单独拆的新东西——权限模型、记忆机制、harness 分野，见[下一篇：CLI 编程 Agent 浪潮](06-cli-agents.md)。

## 参考与延伸

- [All-Hands-AI/OpenHands](https://github.com/All-Hands-AI/OpenHands)
- [SWE-agent/SWE-agent](https://github.com/SWE-agent/SWE-agent)
- [Aider-AI/aider](https://github.com/Aider-AI/aider)
- [cline/cline](https://github.com/cline/cline)
