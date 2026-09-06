---
title: numpy / pandas 会用级
date: 2026-09-05
tags: [Python]
summary: 只学 LLM 工程里真正高频的那一层：向量运算与相似度计算（numpy），表格清洗与聚合（pandas）。不覆盖数据科学的完整体系。
---

数据科学教程往往以"数据分析"为目标，覆盖面很广；LLM 工程师对 numpy/pandas 的需求窄得多：**向量运算 + 相似度计算**（numpy）和**语料表格的清洗、过滤、统计**（pandas）。本文只整理会用级的用法。

## numpy：向量就是一维数组

embedding 在 numpy 里就是一个 `(n, dim)` 的二维数组（n 条向量，每条 dim 维）：

```python title="vectors.py"
import numpy as np

V = np.random.randn(1000, 1024).astype("float32")   # 1000 条 1024 维向量
q = np.random.randn(1024).astype("float32")          # 1 条查询向量

# 归一化后点积 = 余弦相似度（详见 embedding 选型篇）
Vn = V / np.linalg.norm(V, axis=1, keepdims=True)    # 每行除以自身模长
qn = q / np.linalg.norm(q)
scores = Vn @ qn                                     # (1000,) 一行算完所有相似度
top5 = np.argsort(scores)[::-1][:5]                  # 相似度最高的 5 个下标
```

重点理解**广播**：形状对不上的数组之间运算，numpy 自动沿缺失维度扩展（`(1000,1024)` 与 `(1024,)` 相除，后者被当作 `(1,1024)` 广播到每行）。向量化写法比 for 循环快几十倍，原因是循环跑在 Python 层，向量化运算跑在 C 层。

```python title="broadcast.py"
a = np.array([[1, 2], [3, 4]])     # (2, 2)
b = np.array([10, 20])             # (2,)
a + b                              # [[11,22],[13,24]]，b 广播到每行
```

高频操作：`np.array / astype / shape / reshape`、`norm / dot / @`、`argsort / argmax`、`concatenate`、布尔掩码 `V[scores > 0.8]`。

## pandas：表格思维处理语料

pandas 的核心对象 DataFrame，一张带列名的表。LLM 工程里它是"语料管理器"：

```python title="corpus.py"
import pandas as pd

df = pd.DataFrame([
    {"doc_id": "a1", "text": "……", "lang": "zh", "tokens": 812, "quality": 0.9},
    {"doc_id": "a2", "text": "……", "lang": "en", "tokens": 124, "quality": 0.4},
    {"doc_id": "a3", "text": "",   "lang": "zh", "tokens": 0,   "quality": 0.0},
])

# 过滤：留中文、非空、质量达标的
kept = df[(df.lang == "zh") & (df.tokens > 50) & (df.quality > 0.5)]

# 统计：按语言聚合
df.groupby("lang").agg(n=("doc_id", "count"), avg_tokens=("tokens", "mean"))

# 排序取头部
df.nlargest(3, "quality")[["doc_id", "quality"]]
```

高频操作清单：`read_csv / read_parquet / to_parquet`（parquet 对大语料比 csv 快且省）、布尔掩码过滤、`assign` 派生新列、`groupby + agg`、`value_counts`、`merge`（两张表按键拼接）、`isna / dropna / fillna`。

## 两个工程提醒

- **pandas 不是生产管线**：它是探索和批处理工具。数据规则确定之后（比如清洗规则），要迁移成纯 Python/数据库流水线，pandas 留在 notebook 和脚本层
- **大表小心 `apply`**：逐行 apply 是 Python 层循环，能用列运算（向量化）就用列运算，实在不行 `tqdm` 加个进度条再接受它的慢

## 参考与延伸

- [NumPy 中文文档](https://www.numpy.org.cn/)（重点：broadcasting 与线性代数两章）
- [joyful-pandas（Datawhale 中文 pandas 教程）](https://github.com/datawhalechina/joyful-pandas)
