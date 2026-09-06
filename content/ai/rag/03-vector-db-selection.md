---
title: 向量库选型：Chroma / Qdrant / pgvector
date: 2026-09-05
tags: [RAG]
summary: 先问自己的规模和过滤需求，再选库：10 万条以下大多数向量库都够用，选型真正的分野在元数据过滤、运维成本和是否已有 Postgres。
---

向量库做三件事：存向量、算近似最近邻（ANN）、**按元数据过滤**。前两件所有库都大同小异（HNSW 索引），真正的选型分野在第三件和运维形态。先给结论，再给理由。

## 结论先行

| 场景 | 推荐 |
|---|---|
| 原型/单机 demo、语料 < 10 万 | **Chroma**（`pip install` 即用，零部署） |
| 生产服务、需要复杂过滤 + 高并发 | **Qdrant**（自托管或云，性能与过滤能力均衡） |
| 已有 Postgres、数据量中等、不想多运维一个组件 | **pgvector** |
| 亿级/多租户/复杂混合查询 | Milvus / Elasticsearch / 云厂商专用方案 |

**量级参考**：百万条 1024 维向量，内存占用约 4~6 GB（fp32），HNSW 检索毫秒级；多数个人/团队项目的语料量级根本到不了"库的性能成为瓶颈"的程度。选型错误更常发生在**过滤能力和数据形态**上，而不是 QPS 上。

## 三个候选的取舍

**Chroma**：嵌入式优先。`pip install chromadb` 后直接在进程内用，数据落本地目录。原型期体验最好；但分布式、高级过滤、权限都弱，项目做大后通常要迁移。

**Qdrant**：面向生产。payload 过滤（结构化元数据 + 向量混合查询）设计最完善，Rust 实现，内存/磁盘两种模式，有云服务也能 docker 自托管。RAG 服务化的稳妥默认项：

```python title="qdrant-basic.py"
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, PointStruct, Filter, FieldCondition, MatchValue

client = QdrantClient("http://localhost:6333")
client.recreate_collection("kb", vectors_config=VectorParams(size=1024, distance=Distance.COSINE))

client.upsert("kb", points=[PointStruct(id=i, vector=v.tolist(),
              payload={"source": src, "lang": lang}) for i, (v, src, lang) in enumerate(points)])

hits = client.query_points("kb", query=query_vec, limit=5,
    query_filter=Filter(must=[FieldCondition(key="lang", match=MatchValue(value="zh"))]))
```

**pgvector**：把你已有的 Postgres 变成向量库。SQL 一套语法做完向量检索 + 关系过滤 + JOIN 业务表，运维零新增组件；代价是亿级规模下 ANN 性能和内存管理不如专用库（HNSW 索引可部分弥补）。**团队已有 Postgres 运维经验时，它是被低估的默认选项**。

## 过滤：被低估的决定因素

真实 RAG 查询几乎都带结构化条件："只在 2024 年后的文档里搜"、"只搜本站 Markdown"。这个需求决定了：

- 元数据要**入库时就作为 payload 存好**（来源、日期、语言、章节），切块策略一篇说的元数据丢失问题到这里无法补救
- "先向量检索后过滤"和"过滤后检索"结果不同（后者才是对的，但有的实现做不好），选型时用自己的过滤条件实测

## 什么时候其实不需要向量库

语料只有几十条、一次性：直接 numpy 矩阵暴力点积（见 [numpy 会用级](../python/14-numpy-pandas-essentials.md)），毫秒内出结果，引入向量库纯属过度工程。向量库的价值从"内存装不下"或"过滤+并发"开始。

## 参考与延伸

- [Qdrant 文档](https://qdrant.tech/documentation/)
- [Chroma 文档](https://docs.trychroma.com/)
- [pgvector GitHub](https://github.com/pgvector/pgvector)
