---
title: 上下文窗口与 token 计算
date: 2026-09-05
tags: [LLM基础]
summary: 窗口不是"能塞多少字"是"能塞多少 token"，token 费钱又占位——算得准、截得聪明，是 RAG 和 Agent 的成本与质量分界线。
---

"128K 上下文"听上去能塞下一本书，实际使用中你会先撞上三堵墙：**算不准 token**、**中间内容被忽略**、**费用爆炸**。这篇把三堵墙都拆开看。

## token 是什么：文本的最小计费单位

模型不认字，认 token——词表里的原子单位。英文约 1 token ≈ 0.75 词；中文约 1 个汉字 ≈ 0.6~1 token（常用字经常一字一 token，生僻字可能被拆成多字节）。**代码、JSON、非英语文本普遍比直觉更费 token**。

算 token 不要猜，用 tokenizer 算：

```python title="count.py"
from transformers import AutoTokenizer

tok = AutoTokenizer.from_pretrained("Qwen/Qwen2.5-7B-Instruct")
text = "检索增强生成（RAG）通过先检索后生成来缓解幻觉。"
print(len(tok(text)["input_ids"]))     # 精确 token 数
```

不同模型词表不同，跨模型对比时用对应 tokenizer。在线速查可用 OpenAI/HF 的 tokenizer playground。粗估口诀：**中文 1 字 ≈ 1 token，英文 1 词 ≈ 1.3 token，JSON 再上浮 30%**。

## 窗口的真实结构：不是一条等长的跑道

上下文窗口（如 128K）是 prompt + 输出**共享**的预算，而且各段的"待遇"不同：

- **system prompt**：每请求都发、每请求都计费，常驻
- **对话历史**：逐轮累积，是长对话费用爆炸的主因
- **检索内容（RAG）**：每请求注入的大块文本
- **输出**：预留出 max_tokens 的空间

关键事实（"lost in the middle"现象，2023 年起多个研究复现）：模型对**开头和结尾**的上下文利用率最高，**中段**内容容易被忽略。所以 RAG 组装 prompt 时：指令放最前，**最重要的检索结果放最后（紧贴生成位置）**，不是无脑按分数排。

## 截断策略：三选一的决策树

塞不下时按场景选策略，别无脑截断：

1. **压历史**（对话场景）：旧轮次摘要化——用一次便宜的调用来把 20 轮历史压成 5 句，保住任务状态
2. **选内容**（RAG 场景）：top_k 少放几条、每条 chunk 截短；或先 rerank 再取前几条（见[检索与重排](../rag/04-retrieval-and-rerank.md)）——窗口永远优先给"最相关"而不是"更多"
3. **硬截断**：最后手段。截在句子/段落边界，别腰斩；截完在结尾标一句"（前文已截断）"让模型知情

```python title="budget.py"
def fit_context(system: str, history: list[str], retrieved: str,
                budget: int = 12000) -> str:
    """按优先级分配 token 预算：system > 检索内容 > 历史摘要"""
    used = count_tokens(system) + count_tokens(retrieved)
    kept: list[str] = []
    for turn in reversed(history):              # 从最近的往回保留
        cost = count_tokens(turn)
        if used + cost > budget:
            break
        kept.insert(0, turn)
        used += cost
    return system + "\n".join(kept) + "\n" + retrieved
```

## 费用心法

计费按输入 + 输出 token 分开算，输入通常是输出的几倍到几十倍（RAG 里每请求都重发检索内容）。三个降本杠杆按性价比排：**缓存**（同样的 system/前缀，各家用 KV cache 折扣或显式 prompt cache）、**少塞**（rerank 后少放 chunk）、**换模型**（简单任务路由到小模型）。

## 参考与延伸

- [HuggingFace · Transformers 文档（中文）· tokenizer](https://huggingface.co/docs/transformers/zh/main_classes/tokenizer)
- [Anthropic · Contextual Retrieval](https://www.anthropic.com/engineering/contextual-retrieval)（其中对 prompt 组装位置策略有实践讨论）
