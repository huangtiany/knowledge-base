---
title: 长上下文 vs RAG
date: 2026-09-05
tags: [RAG]
summary: 窗口都 1M token 了，还要 RAG 吗？窗口解决的是塞得下，RAG 解决的是找得到、答得准、付得起——两者不是替代关系。
---

自打上下文窗口从 8K 涨到 128K 再到 1M，这个问题每隔几个月就会被问一遍。答案至今没变过：**不是替代关系**。但"为什么不是"，值得拆开讲清楚——这决定了你什么时候可以省掉 RAG。

## 三本账

**质量账：塞得下 ≠ 用得上。** 窗口大小是"能处理的最大 token 数"，不是"有效利用率"。lost in the middle（见[上下文窗口](../llm-basics/02-context-window-and-tokens.md)）在长窗口下依然存在，且长上下文的"大海捞针"测试通常用的是"针很显眼"的构造题——真实任务的干扰文档会显著拉低利用率。相关度过滤这件事，检索器比注意力做得好。

**成本账：token 是按量计费的。** 1M token 的 prompt，每次请求都要全额付费（prompt cache 能缓解前缀复用，但 query 在变的场景省不了多少）。而 RAG 只发 top-k 个 chunk（几千 token）。查询频繁的场景，差价是数量级的。

**延迟账：prefill 时间随 prompt 长度线性涨**（见 [KV cache](../llm-basics/03-kv-cache-and-quantization.md)）。百万 token 的 prefill 是秒级到十秒级；RAG 的检索是毫秒级 + 几千 token 的 prefill。

## 一张决策表

| 场景 | 用什么 |
|---|---|
| 单文档问答、文档 < 窗口 1/3、查询不频繁 | **直接塞窗口**（省掉整套 RAG 基建） |
| 单文档、但会频繁反复问 | 长上下文 + prompt cache |
| 跨文档检索、文档量增长 | **RAG** |
| 需要引用溯源、权限过滤 | **RAG**（引用需要 chunk 粒度，见[生成与引用](05-generation-and-citations.md)） |
| 文档超长且查询固定于局部 | RAG 检索定位 + 长窗口读全节（**两者组合**） |

## 组合才是常态

真实系统的常见形态是分层的：**RAG 负责找，长窗口负责读**。检索定位到相关文档/章节后，不必只喂 top-k 个碎 chunk——如果相关文档整体只有几万 token，直接整文档塞进去，让模型在完整语境里作答。检索粒度从 chunk 放宽到文档，恰好还缓解了切块切碎语义的问题（见 [chunking](01-chunking-strategies.md)）。

反过来，长上下文也改变了 RAG 的设计参数：窗口够大意味着 top_k 可以放宽（从 5 放到 20）、召回可以激进（宁多勿漏）——反正后面模型"读得下"。这会简化 rerank 的调参压力，但不取消它（相关度过滤仍影响质量与成本）。

## 实用判断流程

1. 语料一次性且 < 窗口一半 → 直接长上下文，结束
2. 语料增长/多来源/要引用 → RAG
3. 已有 RAG 且窗口很富余 → 放宽 top_k、提高检索粒度，而不是删掉 RAG

## 参考与延伸

- [Anthropic · Contextual Retrieval](https://www.anthropic.com/engineering/contextual-retrieval)（大窗口时代 RAG 该怎么升级）
- [Google · Long context vs RAG 博客](https://cloud.google.com/blog/products/ai-machine-learning/ai-explanations-blending-learned-memory-and-conditional-memory)（厂商视角的对比框架）
