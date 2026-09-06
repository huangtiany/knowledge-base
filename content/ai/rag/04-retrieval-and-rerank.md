---
title: 检索策略：hybrid 检索与重排
date: 2026-09-05
tags: [RAG]
summary: 纯向量检索输在"精确词匹配"，hybrid 检索补上，rerank 负责最后的精排。"粗召回 + 精排序"的两段式是现代 RAG 的标准架构。
---

前两篇解决向量从哪来、存到哪；本文解决怎么查得准。现代 RAG 检索的标准架构是两段式：**召回（recall）求全，重排（rerank）求准**。

## 纯向量检索的三类失败

1. **专有名词/型号**：embedding 是"模糊语义"，`bge-large-zh` 和 `bge-m3` 的向量可能很近，但查询"bge-large-zh 的维度"要的是精确匹配这个词
2. **罕见缩写/代码**：训练语料里没见过的 token，向量质量差
3. **长 query 稀释**：query 一长，向量被多个意图平均，什么都沾一点什么都不准

根因：向量检索擅长"意思相近"，不擅长"字面精确"。补法是加入字面匹配。

## Hybrid 检索：BM25 + 向量

BM25 是经典的关键词打分算法（TF-IDF 的改进），对**精确词命中**极强。混合检索把两路结果融合（常用 RRF，Reciprocal Rank Fusion）：

```text
RRF 融合分数 = Σ 1 / (k + rank_i)     # k 常取 60，每路结果按名次贡献分数
```

```python title="hybrid-rrf.py"
def rrf_fuse(result_lists: list[list[str]], k: int = 60) -> list[str]:
    scores: dict[str, float] = {}
    for results in result_lists:                  # 向量一路、BM25 一路、……
        for rank, doc_id in enumerate(results):
            scores[doc_id] = scores.get(doc_id, 0) + 1 / (k + rank)
    return sorted(scores, key=scores.get, reverse=True)

fused = rrf_fuse([vector_hits, bm25_hits])        # 各路只要 top 20 名次即可
```

RRF 的好处是**两路分数无需归一化**（BM25 分数和余弦相似度不可比，但名次可比）。中文 BM25 注意分词（jieba）与停用词。实现上 Qdrant/Elasticsearch 都内置了 hybrid 查询接口，通常不必手写融合。

经验配置：**向量 + BM25 默认组合**；代码/型号/术语密集的语料，BM25 权重该更高。

## Rerank：最后 1 公里的精排

两段式架构里，召回阶段（向量/BM25）追求"正确答案大概率在 top 50"，重排阶段用**交叉编码器（cross-encoder）**把"query 和每个候选拼在一起"精细打分，取 top 5。

```python title="rerank.py"
from sentence_transformers import CrossEncoder

reranker = CrossEncoder("BAAI/bge-reranker-v2-m3")
pairs = [(query, doc.text) for doc in candidates]      # 召回的 20~50 条
scores = reranker.predict(pairs)
top = [doc for _, doc in sorted(zip(scores, candidates), reverse=True)][:5]
```

为什么 cross-encoder 更准：双塔（bi-encoder）把 query 和 doc **各自独立**编码成向量，交互信息有限；cross-encoder 让两者在模型内部逐层交互，能捕捉细粒度的匹配关系。代价是每对都要过一次模型，全库逐对计算不可行，所以只能当"精排"，不能当"召回"。

**双塔召回 + 交叉重排**的本质：让"快而糙"的负责召回、"慢而准"的负责精排。这一架构从搜索引擎时代就是标准做法，RAG 只是重新发明了它。

## 参数的先后顺序

调检索效果，按这个顺序动，每次只动一个：

1. **召回口径**：hybrid 开不开、top_n 召回多少（20~100）
2. **重排**：bge-reranker 接上，取 top 3~5
3. **回看切块**：还不好，问题多半在 chunk 切碎了（见[chunking](01-chunking-strategies.md)）
4. **换 embedding**：最后才动它，因为要全库重建

## 参考与延伸

- [FlagEmbedding · bge-reranker（中文说明）](https://github.com/FlagOpen/FlagEmbedding)
- [Qdrant · Hybrid Queries](https://qdrant.tech/documentation/concepts/hybrid-queries/)
- [Anthropic · Contextual Retrieval](https://www.anthropic.com/engineering/contextual-retrieval)（hybrid + rerank + 上下文增强的组合实践）
