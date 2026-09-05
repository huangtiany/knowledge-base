---
title: RAGAS：RAG 评测的标准指标
date: 2026-09-05
tags: [评测与可观测]
summary: faithfulness 管不胡说、answer relevancy 管答得对题、context precision/recall 管检索给没给对——四个指标把"RAG 哪一环坏了"定位出来。
---

[评测先行](01-evaluation-first.md)说了要分层测，RAGAS 是把"分层"工程化的标准工具：用 LLM-as-judge 把 RAG 的失败定位到检索或生成的具体环节。这篇讲清四个核心指标的语义、怎么算、噪声怎么控。

## 四个指标各管一段

RAGAS 的精髓在于把一次 RAG 回答拆成「检索 → 生成」两段分别问责：

| 指标 | 问的问题 | 用到的数据 | 坏了怪谁 |
|---|---|---|---|
| **Context Precision** | 检索到的 chunk 里，相关的排前面了吗 | query + 检索结果 | 检索/排序 |
| **Context Recall** | 该有的信息都检索到了吗 | query + 检索结果 + 标准答案 | 检索/切块/embedding |
| **Faithfulness** | 答案是否忠于检索内容（不胡编） | 检索结果 + 答案 | 生成侧 |
| **Answer Relevancy** | 答案答到点子上了吗 | query + 答案 | 生成/prompt |

典型读法（这是 RAGAS 最大的价值）：

- faithfulness 低、context recall 高 → **检索没问题，生成在编造**——压 temperature、加"不知道就明说"、上引用校验（见[生成与引用](../rag/05-generation-and-citations.md)）
- context recall 低 → **根子在人库或检索**——查 chunking、换 embedding、补 hybrid（检索层药方，见[检索与重排](../rag/04-retrieval-and-rerank.md)）
- answer relevancy 低但 faithfulness 高 → 模型老实但没答对题——改 prompt/改检索 query，不是幻觉问题

## 最小可用

```python title="ragas-mini.py"
from ragas import evaluate
from ragas.metrics import (
    faithfulness, answer_relevancy, context_precision, context_recall,
)
from datasets import Dataset

ds = Dataset.from_dict({
    "question":     ["向量检索的原理是什么"],
    "answer":       [generated_answer],
    "contexts":     [retrieved_chunks],          # 检索到的 chunk 列表
    "ground_truth": ["基于Embedding的语义相似度检索……"],   # 标准答案（recall 需要）
})

report = evaluate(ds, metrics=[faithfulness, answer_relevancy,
                               context_precision, context_recall])
```

LLM-as-judge 的实现细节：每个指标背后是若干"裁判调用"（faithfulness 把答案拆成原子陈述逐条比对 context；relevancy 反向生成问题比对原 query 的嵌入相似度）。**裁判模型用强模型**（和被评测的可以不同），裁判质量决定指标可信度。

## LLM-as-judge 的噪声与控制

Judge 本身是模型，就有不确定性和偏好：

- **抽样校准**：对 20~30 个 judge 结果人工复核，一致率 < 80% 说明指标/prompt 要调
- **同判员跑全程**：一次优化周期内 judge 配置冻结，否则分数不可比
- **绝对值别迷信，趋势才作数**：faithfulness 从 0.72 → 0.85 是真改进；"0.85 高不高"没有标准答案
- **position bias**：多选项对比类 judge（A/B 择优）要交换顺序跑两遍

## 嵌进工作流

- RAGAS 跑**离线回归**：每次改动 chunking/embedding/prompt 后全量跑，分数入库对比
- 与[评测先行的自建评测集](01-evaluation-first.md)互补：自己的用例集 + RAGAS 的标准指标 + 规则指标（引用校验、负例拒答），三层组成完整回归
- 线上持续监控不靠 RAGAS（每个回答都要跑裁判，太贵）——靠采样（1% 抽检）+ 可观测埋点（见 [Langfuse](04-langfuse.md)）

## 参考与延伸

- [RAGAS 文档](https://docs.ragas.io/)
- [explodinggradients/ragas 仓库](https://github.com/explodinggradients/ragas)
- [RAGAS 论文](https://arxiv.org/abs/2309.15217)（指标设计的原始推导）
