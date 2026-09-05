---
title: 类型注解：typing、Protocol 与 pyright
date: 2026-09-05
tags: [Python]
summary: 注解不改变运行时行为，但换来 IDE 补全、静态检查和自文档化；Protocol 让鸭子类型也能被类型系统描述。对照 TS 的类型系统理解最快。
---

Python 的类型注解是**可选的静态层**：解释器完全忽略它们，运行时行为零变化（这点和 TS 编译擦除类型一样）。价值全在编辑器补全、静态查错（pyright/mypy）和让函数签名自解释。现代 Python 库（pydantic、FastAPI、LangChain）大量把注解当"配置语言"用——这注解已经不只是注释，是框架的输入。

## 基础注解：变量、参数、返回值

```python title="basics.py"
def embed(texts: list[str], model: str = "bge-large-zh") -> list[list[float]]:
    return [[0.1] * 1024 for _ in texts]

chunk: dict[str, str] = {"id": "a1", "text": "……"}
maybe: str | None = None            # 联合类型，3.10+ 语法，等价 Optional[str]
```

`list[str]`、`dict[str, int]` 直接用内置泛型（3.9+），不必再 `from typing import List`。TS 的 `string | null` ↔ Python 的 `str | None`，心智完全对应。

## 类型别名、TypedDict 与 Literal

```python title="shapes.py"
from typing import Literal, TypedDict

Vector = list[float]                          # 类型别名

class Chunk(TypedDict):                       # 结构化的 dict 形状
    id: str
    text: str
    score: float

Mode = Literal["dense", "hybrid"]             # 限定取值，像字符串字面量联合

def retrieve(query: str, mode: Mode = "dense") -> list[Chunk]: ...
```

`TypedDict` 描述"就是个 dict，但键和值的形状固定"——LLM 返回 JSON 时极常用。要类、要方法校验、要序列化，用 pydantic 的 `BaseModel`（见[下一篇](08-dataclass-and-pydantic.md)），TypedDict 只管"形状声明"。

## 泛型、Callable 与 TypeVar

```python title="generics.py"
from collections.abc import Callable
from typing import TypeVar

T = TypeVar("T")

def top_k(items: list[T], k: int, key: Callable[[T], float]) -> list[T]:
    return sorted(items, key=key, reverse=True)[:k]

top_k(["a.md", "b.md"], 1, key=len)     # T 自动推断为 str
```

`Callable[[入参类型], 返回类型]` 描述可调用对象，对应 TS 的 `(x: A) => B`。日常够用的泛型就这些；Pydantic 的泛型模型、Protocol 的运行时检查等高级用法遇到再查。

## Protocol：给鸭子类型补一张"行为说明书"

`Protocol`（结构化子类型）是"走起来像鸭子就算鸭子"的类型化表达——不看继承关系，只看有没有方法：

```python title="protocol.py"
from typing import Protocol

class Embedder(Protocol):                 # 不需要任何类继承它
    def embed(self, texts: list[str]) -> list[list[float]]: ...

def build_index(embedder: Embedder, docs: list[str]):
    return embedder.embed(docs)

# 任何长着 embed() 方法签名的类都自动满足 Embedder：
class BGEService:
    def embed(self, texts: list[str]) -> list[list[float]]: ...

build_index(BGEService(), ["a"])          # 静态检查通过，运行时零耦合
```

这等价于 TS 的 interface + 结构化兼容——写检索器、Embedder、LLM 客户端的抽象时，定义一个 Protocol 比继承 ABC 轻得多。

## pyright：让注解真正"生效"

注解本身只是数据，要配一个静态检查器才有价值：

```bash
uv add --dev pyright
uv run pyright            # 或装 VS Code 的 Pylance 扩展（内置 pyright）
```

严格度可以从 `basic` 起步，不要一上来 `strict` 逼死自己。工程建议：**新文件加注解，旧代码顺手加**，与 ruff 格式化一起构成最低限度的工程习惯。

## 参考与延伸

- [Python 官方文档（中文）· typing](https://docs.python.org/zh-cn/3/library/typing.html)
- [mypy 文档](https://mypy.readthedocs.io/)（另一款主流检查器，本站示例用 pyright，两者选一即可）
