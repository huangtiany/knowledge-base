---
title: dataclass 与 pydantic
date: 2026-09-05
tags: [Python]
summary: dataclass 装饰器免手写样板，pydantic 在此之上加边界校验与序列化，LLM 应用的输入输出靠它把不可信文本变成可信结构。
---

这两者解决同一件事的不同层：**省掉数据类的样板代码**。`@dataclass` 是标准库的"自动生成 `__init__/__repr__/__eq__`"；pydantic 的 `BaseModel` 在此之上加**运行时校验和（反）序列化**。类比前端：dataclass ≈ 一个纯 TS interface（只有形状），pydantic ≈ zod（schema 即校验即类型）。

## 0. 痛点：裸 dict 维护成本高

RAG 场景里到处是"文本 + 分数 + 标签"这样的结构。第一反应是用 dict：

```python title="pain-dict.py"
c = {"text": "向量检索……", "score": 0.82, "tags": ["rag"]}

print(c["text"])     # 取值靠字符串 key
print(c["socre"])    # ❌ 手滑拼错 key，KeyError，编辑器无法提前提示
# c.score            # ❌ dict 不支持点号访问
```

字段一多，`c["..."]` 容易拼错，重构改名也不方便。若手写类：

```python title="pain-class.py"
class Chunk:
    def __init__(self, text: str, score: float = 0.0, tags=None):
        self.text = text
        self.score = score
        self.tags = tags if tags is not None else []

    def __repr__(self):
        return f"Chunk(text={self.text!r}, score={self.score!r}, tags={self.tags!r})"

    def __eq__(self, other):
        if not isinstance(other, Chunk):
            return NotImplemented
        return (self.text, self.score, self.tags) == (other.text, other.score, other.tags)

c = Chunk("向量检索……", 0.82)
print(c)                            # Chunk(text='向量检索……', score=0.82, tags=[])
print(c == Chunk("向量检索……", 0.82))  # True
```

三个字段就要十余行样板代码：`__init__` 赋值、`__repr__` 打印、`__eq__` 比较。dataclass 的作用就是消除这些样板代码。

## 1. @dataclass：省掉样板

```python title="dataclass-demo.py"
from dataclasses import dataclass, field

@dataclass
class Chunk:
    text: str
    score: float = 0.0
    tags: list[str] = field(default_factory=list)   # 可变默认值的标准写法

c = Chunk("向量检索……", 0.82)
print(c)                 # 自动 __repr__：Chunk(text='向量检索……', score=0.82, tags=[])
print(c == Chunk("向量检索……", 0.82))    # True —— 自动 __eq__（按字段值）
```

`@dataclass` 就干一件事：**根据字段声明，自动生成 `__init__`、`__repr__`、`__eq__`**。字段冒号后面的是[类型注解](07-type-annotations.md)，dataclass 拿它决定参数顺序和默认值，运行时依然不校验（下节验证）。

### 默认值：不可变直接给，可变用 default_factory

```python title="dataclass-default.py"
from dataclasses import dataclass, field

@dataclass
class Bad:
    tags: list[str] = []        # ❌ 直接跑就报错
# ValueError: mutable default <class 'list'> for field tags is not allowed

@dataclass
class Good:
    tags: list[str] = field(default_factory=list)  # ✅ 每次实例化调一次 list()
    score: float = 0.0                             # 不可变（数字/字符串/None）直接给

a, b = Good(), Good()
a.tags.append("x")
print(b.tags)   # [] —— a、b 是两个独立的 list，互不影响
```

原理和[可变默认参数坑](03-functions-and-scope.md)同一个：如果允许 `= []`，所有实例会共享同一个 list。而 `default_factory=list` 是"每次创建实例时调一次 `list()` 现造"，天然隔离。`dict`、`set` 同理用 `field(default_factory=dict)`。

### frozen：不可变实例，可哈希可进 set

```python title="dataclass-frozen.py"
from dataclasses import dataclass

@dataclass(frozen=True)
class DocID:
    source: str
    doc_id: str

d = DocID("wiki", "a1")
# d.doc_id = "a2"     # ❌ FrozenInstanceError：冻住了，不能改
print(hash(d))        # ✅ 可哈希，能当 dict key、能进 set
print({d, d})         # 去重生效
```

普通 dataclass（可变）是不可哈希的（`__hash__` 被置空），要进 set、当缓存 key 就加 `frozen=True`。代价是字段全只读，适合"一经创建不再改"的 ID、配置、坐标类对象。

数据只在**可信边界内**流动时（函数内部传参、内存里的中间结构），dataclass 足够，又轻又快。

## 2. dataclass 的天花板：它不验证

亲手打破幻想——注解写 `str`，传 `int` 照样收：

```python title="dataclass-nocheck.py"
from dataclasses import dataclass

@dataclass
class Chunk:
    text: str
    score: float = 0.0

c = Chunk(text=12345, score="很高")   # ❌ 类型全错，但不报错
print(c)                              # Chunk(text=12345, score='很高')
print(c.text.upper())                 # AttributeError：int 没有 .upper()，炸在下游
```

dataclass 只管"省样板"，不管"对不对"。错误在构造时悄悄溜进来，在很远的下游才爆炸，堆栈和病因隔了十万八千里。

所以规则是：**数据从不可信的地方进来（用户输入、模型输出的 JSON、API 请求体），必须有人站在门口验**。这个人就是 pydantic。

## 3. pydantic：数据一进来就要验

LLM 应用的典型数据流：用户输入（不可信）→ 模型输出（更不可信的"结构化 JSON"）→ 业务逻辑（需要可信结构）。pydantic 用在边界处：

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

# 模型输出的原始 JSON（可能来自函数调用返回，或 parse 出的文本）
raw = {"question": "什么是 RAG", "answer": "检索增强生成",
       "citations": [{"doc_id": "a1", "quote": "……"}], "confidence": 0.9}

ans = Answer.model_validate(raw)      # 校验 + 转型 + 嵌套解析一步完成
print(ans.confidence)                 # 0.9 —— 此时类型是可信的 float
print(ans.citations[0].doc_id)        # 'a1' —— 嵌套 dict 自动变成 Citation 对象
print(ans.model_dump_json())          # 序列化回 JSON

Answer.model_validate({"question": "x", "answer": "y", "confidence": 7})
# ValidationError: confidence 必须在 0~1，非法数据被拦截

```python title="pydantic-error.py"
from pydantic import ValidationError

try:
    Answer.model_validate({"question": "x", "answer": "y", "confidence": 7})
except ValidationError as e:
    print(e)
# 1 validation error for Answer
# confidence
#   Input should be less than or equal to 1 [type=less_than_equal, input_value=7, input_type=int]
```

关键价值有三层：

1. **拦**：`confidence=7` 进不来，构造即合法，不合法即报错。
2. **转**：嵌套 dict 自动转成子模型，`"0.9"` 字符串能按宽松模式转成 `0.9`（v2 默认 lax；要严用 `StrictFloat` / `model_config = ConfigDict(strict=True)`）。
3. **报**：报错是结构化的（哪个字段、什么规则、实际给了什么），写重试逻辑（让模型照着报错修正 JSON）时直接把错误信息传给模型即可（见[结构化输出篇](12-pydantic-structured-output.md)）。

### 常用约束与自定义校验

`Field` 管单字段的范围格式，`field_validator` 管复合逻辑：

```python title="pydantic-field.py"
from pydantic import BaseModel, Field, field_validator

class ChunkIn(BaseModel):
    text: str = Field(min_length=1, description="检索文本，不能为空")
    score: float = Field(ge=0, le=1, description="相似度分数")
    source: str = "wiki"

    @field_validator("text")
    @classmethod
    def strip_text(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("text 去空格后不能为空")
        return v

ChunkIn.model_validate({"text": "  hi  ", "score": 0.9})  # text 自动变成 'hi'
```

`description` 在[结构化输出](12-pydantic-structured-output.md)里会被直接注入给模型，写得越清楚模型输出越稳。常用的有 `ge/le`（数值范围）、`min_length/max_length`（长度）、`pattern`（正则）。

### 进与出：validate / dump 一对

```python title="pydantic-io.py"
ans = Answer.model_validate(raw_dict)          # 进：dict → 对象
ans2 = Answer.model_validate_json(raw_json)    # 进：JSON 字符串 → 对象

ans.model_dump()        # 出：对象 → dict（给业务逻辑 / FastAPI 返回）
ans.model_dump_json()   # 出：对象 → JSON 字符串（写回响应 / 存库）
```

`model_dump()` 产出的是深拷贝的普通 dict。

## 4. 怎么选：可信走 dataclass，不可信走 pydantic

| 场景 | 用 | 为什么 |
|---|---|---|
| 内部可信数据、纯内存结构 | `@dataclass` | 零依赖、轻量，省掉样板 |
| 需要不可变/可哈希（进 set、当缓存 key） | `@dataclass(frozen=True)` | 自带 `__hash__` |
| API 请求体/响应体（FastAPI 原生集成） | pydantic | FastAPI 直接拿它做校验 + 生成 OpenAPI 文档 |
| LLM 结构化输出的解析与校验 | pydantic（`model_validate` + 重试） | 结构化拦截不合规 JSON |
| 配置文件/环境变量加载 | pydantic-settings | 类型 + 默认值 + 环境变量一站式 |

两者可共存：核心领域模型用 dataclass 保持轻量，边界处用 pydantic 校验后再转换：

```python title="coexist.py"
from dataclasses import dataclass
from pydantic import BaseModel

class AnswerIn(BaseModel):          # 边界：校验
    question: str
    confidence: float = 0.0

@dataclass(frozen=True)            # 内部：不可变领域对象
class Answer:
    question: str
    confidence: float

raw = {"question": "什么是 RAG", "confidence": 0.9, "extra": "忽略"}
checked = AnswerIn.model_validate(raw)   # 先验
core = Answer(**checked.model_dump())    # 再转内部模型
print(core)  # Answer(question='什么是 RAG', confidence=0.9)
```

pydantic v2 用 Rust 重写了校验核心，性能不再是顾虑；常规 API / RAG 流量下，校验开销相对模型调用和向量检索可以忽略。

## 参考与延伸

- [pydantic 官方文档](https://docs.pydantic.dev/)（英文；概念 models / fields / validators 三章即可覆盖日常）
- [dataclasses 官方文档（中文）](https://docs.python.org/zh-cn/3/library/dataclasses.html)
- 本站续篇：[pydantic 对接 LLM 结构化输出](12-pydantic-structured-output.md)（重试循环、constrained decoding 两条通道）
