---
title: Embedding 模型选型
date: 2026-09-05
tags: [RAG]
summary: 中文场景的选型决策树：本地 bge 系起步、评测说话、指令前缀别搞反、维度与成本的关系没有想象中大。
---

Embedding 模型把文本映射成向量，"语义相近 → 向量相近"。选型决策每次 RAG 项目都要重做一次，这篇沉淀一个可复用的决策树。原理（为什么归一化后点积=余弦相似度）不展开，聚焦工程选择。

## 候选与第一决策：本地 vs API

| 模型 | 维度 | 中文 | 部署 | 定位 |
|---|---|---|---|---|
| bge-large-zh-v1.5 | 1024 | 强 | 本地可跑（GPU/CPU 慢些） | **中文默认起点** |
| bge-m3 | 1024 | 强（多语） | 本地 | 需要长文本（8K）/多语言 |
| gte / e5 系列 | 768~1024 | 中上 | 本地 | 备选 |
| OpenAI text-embedding-3-small/large | 1536/3072 | 中上 | 仅 API | 免运维、多语混合语料 |
| Cohere embed-multilingual | 1024 | 中上 | 仅 API | 检索质量口碑好 |

**决策树**：纯中文/中文为主 → 本地 `bge-large-zh-v1.5` 起步；多语混合或不想管 GPU → API（text-embedding-3-small 起步）；本地跑不动 → bge 的 ONNX/int8 量化版或升 API。中文场景 API 相对本地 bge 的质量差距，往往小于"选型后从不评测"带来的差距。

## 评测：唯一可信的依据

C-MTEB/MTEB 榜单看个大概，**自己的评测集才是真理**——你的语料领域（法律/医疗/代码）、query 风格、chunk 长度都和榜单不同。最小做法：

```python title="mini-eval.py"
import numpy as np

def hit_at_k(q_emb, doc_embs, gold_idx, k=5):
    s = doc_embs @ q_emb                    # 已归一化，点积即余弦
    return gold_idx in np.argsort(s)[::-1][:k]

# 20~50 条「问题 → 正确出处 chunk」就能拉开候选模型的差距
hits = [hit_at_k(q, D, g) for q, D, g in eval_cases]
print(f"hit@5 = {np.mean(hits):.2%}")
```

50 条评测对换一个模型选择，是 RAG 工程里回报率最高的半小时（评测体系见[评测先行](../evaluation/01-evaluation-first.md)）。

## 细节三则（都容易翻车）

**指令前缀**：bge-zh 系列查询侧要加指令前缀（如"为这个句子生成表示以用于检索相关文章："），**文档侧不加**。直觉解释：让 query 向量对齐到"检索意图"的子空间，doc 保持原语义空间——两侧不对称是设计出来的，加反了/都加了都会掉点。

```python title="bge-usage.py"
from sentence_transformers import SentenceTransformer

model = SentenceTransformer("BAAI/bge-large-zh-v1.5")
instruction = "为这个句子生成表示以用于检索相关文章："
q_emb = model.encode([instruction + query], normalize_embeddings=True)
d_emb = model.encode(docs, normalize_embeddings=True)     # 文档不加前缀
```

**归一化别省**：`normalize_embeddings=True`（或手动除以模长），之后点积 = 余弦相似度，阈值和排序才有稳定语义。

**一致性与迁移成本**：换 embedding 模型 = 全库重算向量 + 阈值重标定。所以 embedding 模型一旦选定，"换"的成本远高于 LLM 换模型——选型时多花半天评测，值得。

## 与向量库的关系

Embedding 决定"向量的语义质量"，向量库决定"检索的效率与过滤能力"——两者正交，选型互不绑定（见[向量库选型](03-vector-db-selection.md)）。

## 参考与延伸

- [FlagEmbedding（bge 系列 · 中文 README）](https://github.com/FlagOpen/FlagEmbedding)
- [MTEB 榜单（检索任务排序）](https://huggingface.co/spaces/mteb/leaderboard)
