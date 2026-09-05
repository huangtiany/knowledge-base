---
title: Embedding 模型选型速记
date: 2026-08-15
tags: [RAG]
summary: bge / m3e / openai，中文场景下的取舍与一个待验证的困惑
---

给 RAG 选 embedding 模型，本质是在**检索质量、推理成本、部署约束**三者间做取舍。这篇先记结论，实验细节以后补。

## 三个候选的粗对比

| 模型 | 维度 | 中文 | 部署 |
|---|---|---|---|
| bge-large-zh | 1024 | 强 | 本地可跑 |
| m3e-base | 768 | 中 | 本地可跑 |
| openai text-embedding-3-small | 1536 | 中上 | 仅 API |

> 只收真正用得上的结论：中文优先本地 bge，效果不够再上 API。

## 相似度用什么度量

向量归一化之后，点积与余弦相似度等价。归一化这步别省：

```python title="embed_demo.py"
import numpy as np

def normalize(v):
    return v / np.linalg.norm(v, axis=-1, keepdims=True)

q = normalize(np.random.randn(1, 1024))
docs = normalize(np.random.randn(20, 1024))
scores = q @ docs.T          # (1, 20)
print(scores.argmax())       # 最相似文档的下标
```

## 一个还没想明白的问题

为什么 bge 系列要给 query 加指令前缀（"为这个句子生成表示……"）而 doc 不加？直觉是让 query 向量对齐到"检索意图"的子空间，但没有找到严格的论证。这和 [Attention 笔记](../llm-basics/attention-notes.md)里的不对称投影 $W_Q \neq W_K$ 会不会是同一件事？
