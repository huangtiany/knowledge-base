---
title: Langfuse：Trace 与成本统计
date: 2026-09-05
tags: [评测与可观测]
summary: 上线之后每一笔 LLM 调用都该有迹可查：trace 看一次请求的完整调用树，成本统计看钱花在哪，评分回流把线上数据变成评测集。
---

评测（离线，事前把关）和可观测（在线，事后追查）是互补的两半。Langfuse 是开源 LLM 可观测的事实标准之一：接入成本低（SDK 埋点）、与 OpenAI SDK/LangGraph 原生集成、trace/成本/评测回流三件套齐全。

## Trace：一次请求的完整调用树

LLM 应用的一次用户请求背后是一棵调用树（RAG = 检索 + 生成；Agent = N 轮循环）。trace 把这棵树完整录下来——每个 span 记录输入、输出、耗时、token、模型：

```python title="langfuse-openai.py"
from langfuse.openai import AsyncOpenAI     # 一行替换，自动埋点
from openai import AsyncOpenAI as _         # 原来的 import 删掉

client = AsyncOpenAI()                      # 之后所有调用自动上报
```

```python title="langfuse-manual.py"
# 非标准调用（自研工具、向量检索）手动包 span
from langfuse import Langfuse

lf = Langfuse()

with lf.start_as_current_span(name="rag_search") as span:
    span.update(input={"query": query, "top_k": 5})
    hits = vector_search(query)
    span.update(output={"n_hits": len(hits), "ids": [h.id for h in hits]})
```

排查场景：用户报"答错了" → 按 session_id 找到那次 trace → 看检索给了什么、prompt 是什么、模型输出什么 → 失败在检索还是生成一眼定位（对应[评测的三层失败](01-evaluation-first.md)，从离线搬到线上）。

## 成本统计：钱花在哪、花得值不值

Langfuse 按模型单价自动算每个 span 的费用，聚合成两个视角：

- **按请求**：哪类请求最贵？通常是"检索内容塞太多"或"Agent 轮数失控"（见[上下文成本](../llm-basics/02-context-window-and-tokens.md)）
- **按维度**：按用户/功能/模型分组聚合——小模型路由（见[路由模式](../agent/02-five-patterns.md)）的省钱效果，用数据说话

成本异常是最容易先被发现的故障信号：某天单请求成本 ×3，往往意味着检索退化（context 暴涨）或循环失控。

## 评分回流：线上数据喂评测集

可观测和评测的闭环——线上 trace 打标后回流成评测资产：

1. **用户反馈**：点赞/点踩挂在 session 上，差评的 trace 进入人工复核队列
2. **人工标注**：复核结论（检索失败/生成幻觉/拒答过敏）写成标签
3. **沉淀用例**：每个确认的失败案例转化为[评测集](01-evaluation-first.md)的一条用例——线上病历本持续变厚

这一步是[评测先行](01-evaluation-first.md)说的"评测集就是病历本"的线上实现。

## 接入与选型

```bash
uv add langfuse
export LANGFUSE_PUBLIC_KEY=... LANGFUSE_SECRET_KEY=... LANGFUSE_HOST=...
```

自托管（docker compose，数据不出内网）或用 Langfuse Cloud 免费额度。同类选项：LangSmith（LangChain 官方，与 LangGraph 集成最深，见其文档）、Arize Phoenix（开源，评测向）。选择标准：**用了 LangGraph 就优先试 LangSmith，否则 Langfuse 的开源自托管更省心**。

## 参考与延伸

- [Langfuse 文档](https://langfuse.com/docs)
- [LangSmith 文档](https://docs.smith.langchain.com/)
- [Langfuse · OpenAI SDK 集成](https://langfuse.com/docs/opentelemetry/example-python-openai)
