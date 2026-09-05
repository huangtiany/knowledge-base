---
title: LangGraph：状态机模型
date: 2026-09-05
tags: [Agent框架]
summary: LangGraph 把 Agent 表达成"状态 + 图"：节点是步骤，边是控制流，State 是唯一事实源——先手写循环再学它，每一步都知道它在替你做什么。
---

Agent 章唯一深入学习的框架选 LangGraph（选型理由见[知识地图](../roadmap.md)）。前提是你已经[手写过最小循环](03-minimal-agent-loop.md)——这样每个抽象都能对上"它替代了我哪 30 行代码"。

## 核心模型：State + Node + Edge

LangGraph 把 Agent 表达成**图**：

- **State**（状态）：一个全局的"唯一事实源"，通常是 TypedDict/pydantic——所有节点的输入输出都汇入它
- **Node**（节点）：接收 State、返回 State 增量的函数（一个节点 = 一次 LLM 调用或一个工具步骤）
- **Edge**（边）：固定的流转；**条件边**（conditional edge）按 State 内容动态决定下一个节点——这就是"决策"的落点

```python title="minimal-graph.py"
from typing import Literal, TypedDict
from langgraph.graph import StateGraph, MessagesState, START, END

class AgentState(MessagesState):          # 内置 messages 管理的自定义 State
    retrieved: list[str]

def decide(state: AgentState) -> Literal["search", "answer"]:
    """条件边：模型判断要不要检索——决策被显式化为一个图节点"""
    if not state["retrieved"] and needs_search(state["messages"][-1].content):
        return "search"
    return "answer"

def search(state: AgentState):
    return {"retrieved": rag_search(last_query(state))}

def answer(state: AgentState):
    return {"messages": [llm_answer(state)]}

g = StateGraph(AgentState)
g.add_node("search", search)
g.add_node("answer", answer)
g.add_edge(START, "answer")               # 入口
g.add_conditional_edges("answer", decide, {"search": "search", "answer": END})
g.add_edge("search", "answer")
app = g.compile()

app.invoke({"messages": [("user", "站里有哪些 RAG 笔记？")]})
```

对照[手写循环](03-minimal-agent-loop.md)：**State ≈ messages 列表 + 任务状态，节点 ≈ 循环体里的步骤，条件边 ≈ while 里的 if**。LangGraph 没有引入新概念，它把循环里的隐式控制流变成了显式、可检查的图。

## 三件框架真正替你做的事

**1. Checkpointing（持久化）**：`compile(checkpointer=...)` 把每一步 State 存进存储（内存/SQLite/Postgres）。两个直接收益：**崩溃恢复**（长任务从中断点续跑）和 **time-travel**（回到历史某节点重新分支）。

**2. Human-in-the-loop**：`interrupt()` 在任意节点暂停图执行，等待人审批后 `resume`——工具调用确认门（见 [function calling 安全](06-function-calling.md)）的框架化实现，状态由 checkpointer 托管，不用自己写暂停恢复逻辑。

**3. 流式与可观测**：`app.stream(...)` 按节点/token 流式输出；与 LangSmith/Langfuse 集成看每次运行的图轨迹（见[可观测](../evaluation/04-langfuse.md)）。

## 什么时候用、什么时候不用

**用**：状态复杂（多字段共享状态）、流程有分支与回边（检索-评审-改写循环）、需要人审/断点恢复、多 Agent 编排（每个 Agent 是一个子图）。

**不用/后用**：单循环 + 两三个工具的最小 Agent——手写 60 行更透明；纯 workflow 的固定流水线——直接写代码，图是负担。判断依据回到 [workflow vs agent](01-workflow-vs-agent.md)。

## 学习路径建议

1. 官方 Quickstart 跑通 → 2. 把[手写循环](03-minimal-agent-loop.md)翻译成图（体会差异）→ 3. 加 checkpointer + interrupt（感受持久化的价值）→ 4. 子图与多 Agent → 5. 中文教程选 Datawhale《easy-langent》入门 + 中文站查 API。

## 参考与延伸

- [LangGraph 官方文档](https://langchain-ai.github.io/langgraph/)
- [datawhalechina/easy-langent（中文 · LangChain/LangGraph 实战教程）](https://github.com/datawhalechina/easy-langent)
- [LangChain 中文站 · LangGraph](https://github.langchain.ac.cn/langgraph/)
