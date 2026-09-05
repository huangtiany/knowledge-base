---
title: Embedding 微调：检索领域的定制化
date: 2026-09-05
tags: [微调]
summary: 当通用 embedding 模型在你的领域"分不清近义文档"时，用检索对比学习微调它——数据便宜（LLM 合成正负例）、见效快、是 RAG 调优的隐藏大招。
---

通用 embedding 模型（bge 等）对通用语料训练，**领域内**的细微区别（两个相似但含义不同的产品条款）常常分不开。检索场景的领域微调（sentence embedding fine-tuning）是所有微调里**性价比最高**的一种：样本可以 LLM 合成、训练几分钟到几小时、直接提升 RAG 检索命中率。

## 什么时候值得做

先看信号（判定方法见[评测先行](../evaluation/01-evaluation-first.md)）：

- hit@k 评测里，**该命中的 chunk 排名总在 5~20 名**（相关但压不过相似干扰项）——典型的"领域语义不够分"信号
- 语料术语密度高（法律、医疗、内部产品名、代码 API 名），通用模型没见过这些词的领域用法
- hybrid + rerank（见[检索与重排](../rag/04-retrieval-and-rerank.md)）都上了还不达标，且失败案例集中在"相似文档排错序"

**不值得**的信号：hit@k 已经 95%+；失败案例其实是切块切碎导致（先修 chunking）；负例查询过多（那该修拒答不是 embedding）。

## 训练数据：三件套与合成

对比学习训练需要三元组（或 pair 对）：**query、正例（相关文档）、负例（不相关/困难负例）**。真实标注贵，标准做法是 LLM 合成 + 程序化增强：

```text
正例来源：拿领域文档喂 LLM —— "为这段文档生成 3 个用户会问的问题"
困难负例：检索 top-20 里"排名靠前但不相关"的 chunk（最难的负例）
简单负例：随机采样其他文档
```

**困难负例是效果的关键**——只用随机负例训练，模型学会的只是"主题不同"，而你要它学会的是"同主题但语义不同"。几百到几千条三元组就能见效，这和 LLM 微调（要数千到数万条）成本完全不同量级。

## 训练：SentenceTransformers 三行起

```python title="train-embedding.py"
from sentence_transformers import SentenceTransformer, InputExample, losses
from torch.utils.data import DataLoader

model = SentenceTransformer("BAAI/bge-large-zh-v1.5")
examples = [InputExample(texts=[q, pos, neg]) for q, pos, neg in triples]
loader = DataLoader(examples, shuffle=True, batch_size=16)

loss = losses.MultipleNegativesRankingLoss(model)   # 检索任务标准损失
model.fit(train_objectives=[(loader, loss)], epochs=2, warmup_steps=100)
model.save("bge-gezhi")
```

要点：**批次内其他样本自动充当负例**（in-batch negatives，所以 batch_size 别太小）；lr 用模型推荐的小学习率；训练后**必须跑同一评测集对比**——旧模型 92% → 新模型 96% 才算数，同时抽查通用查询别退化（灾难性遗忘）。

## 上线与混合

新模型全库重算向量（见[向量库](../rag/03-vector-db-selection.md)），阈值得重标定。上线策略推荐灰度：新旧双路同时检索，RRF 融合（见 [hybrid 检索](../rag/04-retrieval-and-rerank.md)），观察一周评测指标再切换。

## 参考与延伸

- [FlagEmbedding（bge 微调脚本与中文说明）](https://github.com/FlagOpen/FlagEmbedding)
- [SentenceTransformers · Training 文档](https://sbert.net/docs/sentence_transformer/training_overview.html)
