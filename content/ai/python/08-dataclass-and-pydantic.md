---
title: dataclass 与 pydantic
date: 2026-09-05
tags: [Python]
summary: dataclass 装饰器免手写样板，pydantic 在此之上加边界校验与序列化——LLM 应用的输入输出全靠它把不可信文本变成可信结构。
---

这两者解决同一件事的不同层：**省掉数据类的样板代码**。`@dataclass` 是标准库的"自动生成 `__init__/__repr__/__eq__`"；pydantic 的 `BaseModel` 在此之上加**运行时校验和（反）序列化**。类比前端：dataclass ≈ 一个纯 TS interface（只有形状），pydantic ≈ zod（schema 即校验即类型）。

## @dataclass：消灭样板

```python title="dataclass-demo.py"
from dataclasses import dataclass, field

@dataclass
class Chunk:
    text: str
    score: float = 0.0
    tags: list[str] = field(default_factory=list)   # 可变默认值的正确姿势

c = Chunk("向量检索……", 0.82)
print(c)                 # 自动 __repr__
print(c == Chunk("向量检索……", 0.82))    # True —— 自动 __eq__（按字段值）
```

`field(default_factory=list)` 就是为绕开[可变默认参数坑](03-functions-and-scope.md)设计的。`@dataclass(frozen=True)` 得到不可变实例（可哈希、可进 set）。数据只在**可信边界内**流动时，dataclass 足够。

## pydantic：数据一进来就要验

LLM 应用的典型数据流：用户输入（不可信）→ 模型输出（更不可信的"结构化 JSON"）→ 业务逻辑（需要可信结构）。pydantic 站在边界上：

```python title="pydantic-demo.py"
from pydantic import BaseModel, Field, ValidationError

class Citation(BaseModel):
    doc_id: str
    quote: str

class Answer(BaseModel):
    question: str
    answer: str
    citations: list[Citation] = []
    confidence: float = Field(ge=0, le=1)     # 约束：0~1

# 模型吐出来的原始 JSON（可能是函数调用返回、可能是 parse 出的文本）
raw = {"question": "什么是 RAG", "answer": "检索增强生成",
       "citations": [{"doc_id": "a1", "quote": "……"}], "confidence": 0.9}

ans = Answer.model_validate(raw)      # 校验 + 转型 + 嵌套解析一步完成
print(ans.confidence)                 # 0.9 —— 此时类型是可信的 float
print(ans.model_dump_json())          # 序列化回 JSON

Answer.model_validate({"question": "x", "answer": "y", "confidence": 7})
# ValidationError: confidence 必须在 0~1 —— 坏数据进不来
```

关键价值：**校验失败的报错是结构化、带字段路径的**，写重试逻辑（让模型照着报错修正 JSON）时直接把错误信息喂回去就行。

## 怎么选

| 场景 | 用 |
|---|---|
| 内部可信数据、纯内存结构 | `@dataclass` |
| API 请求体/响应体（FastAPI 原生集成） | pydantic |
| LLM 结构化输出的解析与校验 | pydantic（`model_validate` + 重试） |
| 配置文件/环境变量加载 | pydantic-settings |

两者可共存：核心领域模型用 dataclass，边界处用 pydantic 收口再转 dataclass；小项目全程 pydantic 也没问题。pydantic v2 用 Rust 重写了校验核心，性能不再是顾虑。

## 参考与延伸

- [pydantic 官方文档](https://docs.pydantic.dev/)（英文；概念 models / fields / validators 三章即可覆盖日常）
- [dataclasses 官方文档（中文）](https://docs.python.org/zh-cn/3/library/dataclasses.html)
