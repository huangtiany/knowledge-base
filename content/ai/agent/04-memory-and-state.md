---
title: 记忆与状态：短期、长期与共享状态
date: 2026-09-05
tags: [Agent设计模式]
summary: Agent 的"记忆"没有魔法：短期记忆就是 messages 列表，长期记忆是外置存储的读写策略，共享状态是结构化的任务进度——分别管理，别混为一谈。
---

"Agent 有记忆吗"是个误导性的问题——模型本身每次调用都是失忆的，所谓记忆全是**你把什么信息重新塞进上下文**。把记忆拆成三类分别设计，问题就清晰了。

## 短期记忆：messages 列表的管理问题

[最小循环](03-minimal-agent-loop.md)里说过：Agent 的工作记忆就是 messages 列表。问题只有一个——列表越滚越长，撞上窗口预算（见[上下文窗口](../llm-basics/02-context-window-and-tokens.md)）。管理策略三选一：

1. **滑窗截断**：丢最老的轮次。最简单，丢上下文也最狠——适合工具调用多的执行型 Agent（中间 tool result 用完即弃）
2. **摘要压缩**：历史快满时，用一次廉价调用把旧轮次压成摘要塞回 system。保任务状态，多一次延迟
3. **结构化提炼**：不用原始对话，每轮把关键信息（任务、已完成的步骤、重要发现）写入一个结构化"任务状态"对象——见下一节，这是 Agent 场景的最优解

工具轮次的记忆优化有个实用技巧：**历史里的 tool result 可以替换成摘要**（"已检索 3 次，确认 X 成立"），原始检索文本只在最近一轮保留——省 token 又不丢结论。

## 共享状态：结构化的任务进度

复杂任务不该靠"翻聊天记录"找进度，而是维护一个显式状态对象：

```python title="state.py"
from pydantic import BaseModel

class TaskState(BaseModel):
    goal: str                                # 任务目标，不变
    plan: list[str] = []                     # 计划步骤
    done: list[str] = []                     # 已完成及结论
    findings: dict[str, str] = {}            # 关键发现（实体 → 结论）
    pending: str | None = None               # 当前进行中

def render(state: TaskState) -> str:
    """每轮把状态渲染进 system——模型永远知道'干到哪了'"""
    return f"目标：{state.goal}\n已完成：{state.done}\n发现：{state.findings}"
```

每轮把 `render(state)` 注入上下文，模型的每次决策都带着全局视角；状态更新由每轮的结构化输出驱动（pydantic 校验）。LangGraph 的 State 核心就是这件事的框架化（见 [LangGraph](09-langgraph.md)）。

## 长期记忆：外置存储 + 检索策略

跨会话的"记住用户偏好/上次结论"，本质是**外部存储 + 按需检索注入**，和 RAG 是同一套机制（见[chunking 到引用](../rag/01-chunking-strategies.md)），区别只在数据形态：

| 存储 | 形态 | 写入时机 | 检索方式 | 适合记什么 |
|---|---|---|---|---|
| 向量库 | 记忆条目（带时间/来源） | 会话结束或关键节点 | 语义检索 top-k | 偏好、事实、历史结论 |
| 结构化档案 | JSON profile | 明确触发（用户说"记住"） | 全量注入（小） | 用户画像、设置 |
| 文件/数据库 | 工作产物 | 任务完成时 | 路径/ID 引用 | 报告、代码、中间产物 |

写入侧比检索侧更容易做错。两条纪律：

- **写入口径宁窄勿宽**：让模型自主判断"什么值得记"会造成记忆库垃圾化；只记用户显式声明的偏好 + 任务级结论
- **记忆要可衰减**：带时间戳和置信度，检索时新旧加权，过期内容要有淘汰机制——不做衰减的记忆库三个月后就全是噪音

## 一个反直觉的提醒

记忆系统的第一性问题是"**这条信息以后用得上吗**"，而不是"存在哪"。先用最土的方案（滑窗 + 一个 profile JSON）跑通任务，等[评测](../evaluation/03-agent-evals.md)显示"模型不知道某件该知道的事"的失败案例积累起来了，再上记忆架构——记忆是长出来的，不是先建的。

## 参考与延伸

- [Anthropic · Building Effective Agents](https://www.anthropic.com/research/building-effective-agents)（state 管理riff 部分）
- [LangGraph · Persistence 文档](https://langchain-ai.github.io/langgraph/concepts/persistence/)（框架化的状态持久化方案）
