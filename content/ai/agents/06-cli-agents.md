---
title: CLI 编程 Agent 浪潮：Claude Code、Codex、OpenCode、pi 与 Grok Build
date: 2026-09-05
tags: [Agent生态]
summary: 2025 年后终端编程 Agent 兴起：Claude Code 引爆，开源世界一年内跟上。各家的循环相同，竞争点在权限模型、记忆机制和 harness 打磨。
---

[编程 Agent 篇](02-coding-agents.md)的四强（OpenHands、SWE-agent、Aider、Cline）是 2024–2025 初的开源经典。这之后，最活跃的形态换成了**终端 CLI Agent**：Claude Code 引爆，开源世界在一年内跟进了 Codex CLI、OpenCode、pi、Grok Build、DeepSeek Harness。本文覆盖这一波。

## 为什么是终端

形态竞争里终端胜出，四个理由：

- **LLM 直接当接口**：不用开发 GUI，所有交互都是自然语言 + 命令输出，harness 可以做到很薄
- **贴近开发者真实工作流**：终端本来就是开发者主场，Agent 输出直接接管道、脚本、CI
- **权限语义天然清晰**：命令行里"读 / 写 / 执行"的边界用确认弹窗分级就行（对照 Cline 的做法，但更轻）
- **可组合**：无头模式（headless）让 Agent 变成管道里的一个命令，CLI Agent 因此天然能被其他 Agent 调用

## Claude Code：闭源标杆，学理念不学代码

Claude Code（Anthropic，闭源）定义了这一波的产品范式。代码拆不了，但三个设计决策公开可见且影响深远：

- **权限分级确认**：读操作自动放行，写文件和执行命令按风险分级确认，把[可控性](01-agent-landscape.md)做成默认体验而非设置项
- **CLAUDE.md 项目记忆**：把项目惯例写成仓库里的一个 Markdown 文件，每轮自动注入上下文，是[记忆与状态](../agent/04-memory-and-state.md)的极简实现：记忆就是文件，用户可以直接编辑
- **扩展机制**：技能（skills）、子 Agent、MCP 支持；核心保持薄，能力靠扩展点扩展

它证明了 Agent 产品的竞争焦点不在"用了什么模型"（各家模型差距在收窄），而在 **harness 打磨**：上下文管理、工具质量、确认体验。

## Codex CLI 与 OpenCode：开源外壳的两条路线

**Codex CLI**（OpenAI，[openai/codex](https://github.com/openai/codex)）把官方编程 Agent 的外壳开源：本地 CLI 与云端任务双形态，审批模式分级（只读建议 / 自动编辑 / 全自动）。它的开源决定影响深远：后面会看到，连竞品的工具实现都移植自它。

**OpenCode**（[anomalyco/opencode](https://github.com/anomalyco/opencode)，MIT，约 20 万星）走供应商中立的路线：不绑定任何模型厂商，任意模型即插即用。设计上值得注意的是**双内置 Agent**：`build`（默认全权限开发）与 `plan`（只读分析，拒绝编辑文件）用 Tab 一键切换，把"先看后动"做成了原语；`@general` 子 Agent 处理多步检索类杂务。对照 Cline 的 plan/act，同一思想的不同实现。

## pi：极简 harness 的代表

pi（[earendil-works/pi](https://github.com/earendil-works/pi)，MIT，约 10 万星，Mario Zechner 主导）把"harness（马具）"这个词用回了本义：**连接模型与环境的贴合层，除此之外什么都不做**。

Monorepo 拆得干净：`pi-ai`（统一多供应商 LLM API）、`pi-agent-core`（带工具调用与状态管理的运行时）、`pi-tui`（差分渲染终端 UI）、`pi-coding-agent`（CLI 本体）。每块独立成库，都是[手写最小循环](../agent/03-minimal-agent-loop.md)的生产级实现。

两个反直觉决策值得记住：

- **无内置权限系统**：pi 以启动用户的全部权限运行，README 明确让你自己用容器 / micro-VM 沙箱隔离，它认为不该在应用层做安全（对照 Claude Code 的应用层权限分级，两种路线）
- **供应链加固清单**：锁死精确版本、`--ignore-scripts` 安装、生命周期脚本白名单，把 npm 供应链风险当作头等问题，这在 Agent 项目里少见

它还是"self-extensible coding agent"：Agent 能给自己写工具。读源码学 Agent 结构，pi 是当前最清晰的参考。

## Grok Build 与 DeepSeek Harness：模型厂商下场

**Grok Build**（xAI，[xai-org/grok-build](https://github.com/xai-org/grok-build)，Apache-2.0，Rust）是 xAI 的终端编程 Agent：全屏 TUI，三种运行形态（交互 TUI / 无头模式进 CI / 经 Agent Client Protocol 嵌入编辑器），扩展支持 MCP、skills、hooks、插件。一个值得注意的细节：README 明说部分工具实现**移植自 openai/codex 和 sst/opencode**，harness 层互相借鉴已是常态，开源外壳正在形成公共基础。

**DeepSeek Harness**（[deepseek-ai/deepseek-harness](https://github.com/deepseek-ai/deepseek-harness)，"dsh"）是 DeepSeek 官方的 Agent harness，主打"**一切皆插件**"架构。它的信号意义大于项目本身：**模型厂商开始进入 Agent 运行时层**。模型厂商的 harness 天然倾向优化自家模型，而 OpenCode、pi 走中立路线，这个分野会是未来两年 harness 层的主线。

## 对照表

| | 开源 | 模型绑定 | 权限模型 | 形态 |
|---|---|---|---|---|
| Claude Code | ✗ | Anthropic | 应用层分级确认 | CLI |
| Codex CLI | ✓（外壳） | OpenAI 优先 | 审批模式分级 | CLI + 云端 |
| OpenCode | ✓ MIT | 中立 | build/plan 双 Agent 切换 | CLI + 桌面 Beta |
| pi | ✓ MIT | 中立 | **无**（交给沙箱） | CLI + 库 |
| Grok Build | ✓ Apache-2.0 | xAI | 沙箱 + 检查点 | TUI / 无头 / ACP |
| DeepSeek Harness | ✓ | DeepSeek | 插件化 | harness 工具包 |

## 收尾观察

1. **循环没变，变的是三件事**：权限模型、记忆机制、扩展点。CLI 浪潮的竞争全在这三处（对照[最小循环](../agent/03-minimal-agent-loop.md)，核心依旧只有 60 行）
2. **harness 层两大阵营**：模型厂商绑定（官方 harness）vs 供应商中立（OpenCode/pi），选型时先确定这一层
3. **选型速记**：只用自家模型，官方 harness 体验最贴合；要多模型自由，选 OpenCode 或 pi；要读源码学结构，pi 和 codex 最清晰

## 参考与延伸

- [openai/codex](https://github.com/openai/codex)
- [anomalyco/opencode](https://github.com/anomalyco/opencode)
- [earendil-works/pi](https://github.com/earendil-works/pi)
- [xai-org/grok-build](https://github.com/xai-org/grok-build)
- [deepseek-ai/deepseek-harness](https://github.com/deepseek-ai/deepseek-harness)
