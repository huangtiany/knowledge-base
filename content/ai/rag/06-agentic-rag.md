---
title: Agentic RAG：检索作为工具
date: 2026-09-05
tags: [RAG]
summary: 经典 RAG 是"检索一次然后回答"的流水线，agentic RAG 让模型自己决定"要不要检索、查什么、够不够、要不要再查"，代价与收益的边界要想清楚。
---

经典 RAG 是固定流水线：query → 检索一次 → 塞进 prompt → 生成。它假设**每次查询都需要检索、检索一次就够**。两个假设都不总成立。Agentic RAG 把检索从固定工序变成模型可调用的工具，由模型自己决策。

## 流水线 vs Agent：决策点的差别

| | 经典 RAG | Agentic RAG |
|---|---|---|
| 要不要检索 | 总是检索 | 模型判断（闲聊不检索） |
| 查什么 | 原始 query 直接用 | 模型改写/拆解/多轮查询 |
| 够不够 | 一次即定 | 模型自查，不够再查 |
| 延迟/成本 | 低且固定 | 高且不可预测 |
| 可调试性 | 每步确定 | 需要轨迹追踪（见 [Agent evals](../evaluation/03-agent-evals.md)） |

```python title="minimal-agentic-rag.py"
tools = [{
    "type": "function",
    "function": {
        "name": "search_docs",
        "description": "在知识库中检索资料。简单事实用一次查询；对比类问题拆成多次。",
        "parameters": {"type": "object", "properties": {
            "query": {"type": "string", "description": "检索查询词"},
        }, "required": ["query"]},
    },
}]

messages = [{"role": "system",
             "content": "你是知识库助手。需要事实依据时调用 search_docs，"
                        "资料充分后作答并标注来源；检索不到就直说。"}]
messages.append({"role": "user", "content": question})

while True:
    resp = client.chat.completions.create(
        model="gpt-4o-mini", messages=messages, tools=tools)
    msg = resp.choices[0].message
    if not msg.tool_calls:                # 模型认为资料够了，直接输出答案
        break
    messages.append(msg)
    for tc in msg.tool_calls:             # 执行检索，把结果喂回去
        args = json.loads(tc.function.arguments)
        hits = search_docs(args["query"])
        messages.append({"role": "tool", "tool_call_id": tc.id,
                         "content": json.dumps(hits, ensure_ascii=False)})
```

这就是全部骨架：模型在循环里自己决定"查、再查还是停止"。完整版看[手写最小工具循环](../agent/03-minimal-agent-loop.md)。

## 什么时候值得上 Agentic RAG

**值得**的信号：

- 查询**多跳**：如"A 和 B 哪个更适合我们的场景"，需要先查 A 再查 B 再对比
- 查询**意图模糊**：需要先检索试探再改写查询（query rewriting 天然适合放进循环）
- 知识库**分区多**：选哪个库/哪个检索器本身就是决策

**不值得**的信号（保持经典流水线）：

- 90% 的查询是简单事实问答，多出来的每次 LLM 决策调用都是纯延迟开销
- 对延迟敏感（用户等不了多轮检索）
- 没有评测体系兜底：多轮决策的错误会复合，没评测的 agentic RAG 比流水线更不可控

## 实践注意

- **检索器 description 是最重要的 prompt**：模型靠它决定"这个工具什么时候用、查询怎么写"，写得像 API 文档而不是一句话
- **给循环设上限**（如最多 5 次工具调用），防模型陷入"检索死循环"
- **每轮检索结果带来源**，答案的引用才可延续（见[生成与引用](05-generation-and-citations.md)）
- 复杂度升级顺序：**query 改写 → 多轮检索循环 → 多检索器路由 → 多 Agent 协作**。每上一级前先确认下一级真的不够用，参考 [workflow vs agent 的边界](../agent/01-workflow-vs-agent.md)

## 参考与延伸

- [Anthropic · Building Effective Agents](https://www.anthropic.com/research/building-effective-agents)（什么时候该用 Agent 的判断框架）
- [LlamaIndex · Agents 文档](https://docs.llamaindex.ai/en/stable/module_guides/deploying/agents/)
