---
title: 从零理解 Attention：一篇写给自己的笔记
date: 2026-08-28
tags: [LLM基础]
summary: Q、K、V 的直觉，缩放点积为什么除以 √dk
---

读一个长句子时，并不是每个词都同等重要。"它"指代的是谁，往往要到几个词之前去找。注意力机制做的事，就是让模型在处理每个位置时，**按需回头查看其他位置**，并给相关的位置更高的话语权。

## 注意力到底在解决什么问题

CNN 用卷积核看局部，RNN 顺着序列往前挪，都有"看不远、看不快"的问题。Attention 的思路不同：**直接在任意两个位置之间建立连接**，距离不再重要，连接的强度由内容决定。

> 一句话版本：Attention 是一次"带权重的查表"——用查询去匹配所有的键，按匹配程度加权取回值。

### 从查字典到查表

把查字典的过程抽象成三步：拿着什么去查（Query）、字典里有什么线索（Key）、查到的是什么（Value）。普通字典是"键完全匹配才返回"，Attention 把它软化为"键越相似，权重越大"。

## Q、K、V 三个矩阵

每个 token 的向量经过三个不同的投影，得到三份副本：**Query**（我在找什么）、**Key**（我能提供什么线索）、**Value**（我实际携带的信息）。匹配发生在 Q 和 K 之间，信息从 V 取出。

$$
\mathrm{Attention}(Q, K, V) = \mathrm{softmax}\left( \frac{QK^{T}}{\sqrt{d_k}} \right) V
$$

三个投影矩阵 $W_Q$、$W_K$、$W_V$ 是可学习参数——这就是"注意力有东西可学"的原因。

## 缩放因子为什么是 √dk

维度越高，点积的方差越大，softmax 容易被推到饱和区，梯度几乎为零。除以 $\sqrt{d_k}$ 把方差拉回 1，这是它在数学上的全部作用。用代码验证一遍比看十遍公式有效：

```python title="attention_demo.py"
import numpy as np

def softmax(x):
    e = np.exp(x - x.max(axis=-1, keepdims=True))
    return e / e.sum(axis=-1, keepdims=True)

def attention(Q, K, V):
    d_k = Q.shape[-1]
    scores = Q @ K.T / np.sqrt(d_k)   # 缩放点积：方差拉回 1
    return softmax(scores) @ V

Q, K, V = (np.random.randn(4, 64) for _ in range(3))
print(attention(Q, K, V).shape)      # (4, 64)
```

### 不缩放会怎样

把 `np.sqrt(d_k)` 一行注释掉再跑：`d_k = 64` 时点积标准差约为 8，softmax 输出几乎退化为 one-hot，梯度消失。缩放不是经验参数，是方差归一化。

## 多头：并行地关注不同关系

单个注意力头只能表达一种"关注模式"。把 Q、K、V 切成 h 份分别计算再拼接，每一头可以专注不同的语言现象——有的头盯语法依存，有的头盯指代链。多头不增加太多计算量，却让表达力成倍上升。

## 和 RAG 有什么关系

RAG 里的"相似度检索"用的是另一套注意力：query 向量与文档向量的点积。理解了缩放点积，向量检索的余弦相似度、重排序的打分，都在同一个数学框架里，没有新东西。下一步打算把 [Embedding 模型选型速记](../rag/embedding-notes.md)里留的问题补上。
