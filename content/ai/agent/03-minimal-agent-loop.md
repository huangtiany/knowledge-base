---
title: 手写最小 Agent 循环（不用框架）
date: 2026-09-05
tags: [Agent设计模式]
summary: 一个 while 循环 + 工具注册表就是 Agent 的全部骨架——不用框架手写一遍，才知道 LangGraph 们到底在替你做什么。
---

Agent 的本质小到让人失望：**模型在循环里反复调用工具，直到它决定收手**。这篇用 60 行代码把这个骨架写完整。先手写再上框架，否则你无法分辨框架的哪些复杂度是必要的。

## 骨架：工具注册表 + while 循环

```python title="agent-loop.py"
import json
from openai import OpenAI

client = OpenAI()

# ---- 1. 工具就是普通函数，注册表 = {名字: (schema, 实现)} ----
def search_docs(query: str) -> str:
    """在知识库检索资料（实现可以是向量检索，见 RAG 章）"""
    return json.dumps({"hits": [f"关于「{query}」的检索结果……"]}, ensure_ascii=False)

def calculator(expression: str) -> str:
    return str(eval(expression))            # demo 专用，生产用 ast 安全求值

TOOLS = {"search_docs": search_docs, "calculator": calculator}
TOOL_SCHEMAS = [{
    "type": "function",
    "function": {
        "name": name,
        "description": (fn.__doc__ or "").strip(),     # description 直接取 docstring
        "parameters": {
            "type": "object",
            "properties": {"query": {"type": "string"}} if name == "search_docs"
            else {"expression": {"type": "string"}},
            "required": list({"search_docs": ["query"], "calculator": ["expression"]}[name]),
        },
    },
} for name, fn in TOOLS.items()]

# ---- 2. 循环：模型决策 → 执行工具 → 结果回填 → 重复 ----
def run_agent(task: str, max_turns: int = 8) -> str:
    messages = [
        {"role": "system", "content": "你是工具助手。需要事实就查，需要计算就算；"
                                      "信息足够后直接给出最终回答，不要多余解释。"},
        {"role": "user", "content": task},
    ]
    for _ in range(max_turns):                  # 上限：防失控循环
        msg = client.chat.completions.create(
            model="gpt-4o-mini", messages=messages,
            tools=TOOL_SCHEMAS,
        ).choices[0].message
        if not msg.tool_calls:                  # 模型不再调工具 = 任务完成
            return msg.content
        messages.append(msg)
        for tc in msg.tool_calls:
            fn = TOOLS[tc.function.name]
            result = fn(**json.loads(tc.function.arguments))
            messages.append({"role": "tool", "tool_call_id": tc.id,
                             "content": str(result)})
    raise RuntimeError("达到最大轮数，Agent 未收敛")
```

就这么多。四根柱子：**工具注册表**（名字→实现+schema）、**schema 声明**（模型靠它知道有什么工具、怎么传参）、**决策循环**（tool_calls 空了就收手）、**结果回填**（role=tool 消息）。

## 这 60 行里藏着的全部要点

**工具 description 是最重要的 prompt。** 模型全靠 schema 里的 `description` 判断"什么时候用这个工具、参数怎么填"。写工具文档要像写给新同事的 API 说明：什么时候该用、什么时候不该用、参数什么格式。

**参数解析是信任边界。** `json.loads(tc.function.arguments)` 可能解析失败、参数可能不符合预期——每个工具实现内部要做参数校验（pydantic），失败时**把错误信息作为 tool result 返回**而不是抛异常终止：

```python title="error-as-result.py"
def safe_call(fn, args_json: str) -> str:
    try:
        return str(fn(**json.loads(args_json)))
    except Exception as e:
        return json.dumps({"error": str(e)})   # 让模型看到错误，自行调整
```

模型看到 `{"error": "query 不能为空"}` 会自己修正参数重试——错误信息是给模型的反馈，这是 Agent 自愈能力的来源。

**终止条件必须有界。** `max_turns` 防死循环（模型反复检索同一个 query）；工具侧也应有自己的超时。收手判断靠模型"不再调用工具"，它不收手就是你的 prompt 或工具有问题。

**状态就是 messages 列表。** 整个 Agent 的"记忆"就是不断追加的消息历史——理解这一点，[记忆与状态](04-memory-and-state.md)讲的所有问题（历史太长怎么办）都只是对这条列表的管理策略。

## 现在再来看框架

LangGraph 解决的是这个骨架长大后的痛点：状态持久化（循环崩了能恢复）、条件边与人工介入（循环中途暂停等人审批）、可视化与并发分支。如果这些痛点你还没有，60 行就是最好的架构；有了，再看 [LangGraph：状态机模型](09-langgraph.md)。

## 参考与延伸

- [Anthropic · Building Effective Agents](https://www.anthropic.com/research/building-effective-agents)（agent 循环的伪代码出处）
- [OpenAI · Function Calling 指南](https://platform.openai.com/docs/guides/function-calling)
