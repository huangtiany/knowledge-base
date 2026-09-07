---
title: 类型注解：typing、Protocol 与 pyright
date: 2026-09-05
tags: [Python]
summary: 注解不改变运行时行为，但换来 IDE 补全、静态检查和自文档化；Protocol 让鸭子类型也能被类型系统描述。对照 TS 的类型系统理解最快。
---

Python 的类型注解是**可选的静态层**：解释器完全忽略它们，运行时行为零变化（这点和 TS 编译擦除类型一样）。价值全在编辑器补全、静态查错（pyright/mypy）和让函数签名自解释。现代 Python 库（pydantic、FastAPI、LangChain）大量把注解当"配置语言"用，注解本身就是框架读取的输入。

这篇分七步：先建立"注解不生效"的运行时心智，再学写法（变量→函数→容器→字典形状→函数参数→泛型→ Protocol），最后让 pyright 真正跑起来。

## 0. 先建立心智：注解是"给工具看的注释"

初学者最大的误解是以为写了注解 Python 就会帮你拦错。不会。看这个实验：

```python title="annotation-ignored.py"
def embed(text: str) -> int:
    return len(text)

print(embed("hello"))   # 5 —— 正常
print(embed(12345))     # ❓ 传入 int，按注解"应该"报错？

# 实际输出：报错 TypeError: object of type 'int' has no len()
# 注意：报错来自 len() 内部，而不是"注解检查"
# 如果函数体是 return 42，传什么都不会报错
def noop(text: str) -> int:
    return 42

print(noop(12345))      # 42 —— 完全不报错，注解被无视
```

结论只有一句话：**注解运行时零作用，作用全在写代码时**——编辑器根据它补全、pyright 根据它提前报错、读者根据它理解函数。接受这一点，后面所有工具才有意义。

对照 TS 理解：`tsc` 编译后类型被擦除，`.js` 里没有类型；Python 则是连编译这步都没有，从一开始就擦除了。

## 1. 基础写法：变量、参数、返回值

写法就三种位置，冒号表"是什么"，箭头表"返回什么"：

```python title="basics.py"
# 1. 变量注解：名字: 类型 = 值
chunk_id: str = "a1"
score: float = 0.82

# 2. 函数注解：参数: 类型，-> 返回类型
def embed(texts: list[str], model: str = "bge-large-zh") -> list[list[float]]:
    return [[0.1] * 1024 for _ in texts]

# 3. 不写也行：没注解的参数就是"未知类型"，检查器不会管你
def loose(x):
    return x
```

读法：`texts: list[str]` 读作"texts 是一个元素为 str 的 list"；`-> list[list[float]]` 读作"返回 float 矩阵"。默认值写法和无注解时完全一样，只是中间插了个 `: 类型`。

一个 AI 味很浓的完整签名：

```python title="signature.py"
def retrieve(query: str, top_k: int = 5) -> list[dict]:
    """query 必传 str，top_k 可选，返回一堆字典。"""
    ...
```

光看这一行，不用读函数体就知道怎么调、传什么、拿回什么——这就是"自文档化"。参数越多，这个收益越大。

## 2. 容器怎么写：list / dict / set / tuple / 或 None

现代写法（3.9+）直接用内置泛型，不用再 `from typing import List, Dict`（老教程里常见，新代码别学）：

```python title="containers.py"
# 列表、字典、集合：方括号里写元素类型
tags: list[str] = ["rag", "llm"]
scores: dict[str, float] = {"a.md": 0.82}
seen: set[str] = {"a1"}

# 元组：每个位置的类型逐个写（长度固定）
point: tuple[str, float] = ("a.md", 0.82)

# 可空：str | None 表示"str 或者 None"，3.10+ 语法
maybe: str | None = None

def find_chunk(doc_id: str) -> dict | None:
    if doc_id == "a1":
        return {"id": "a1", "text": "……"}
    return None   # 找不到就返回 None，注解里必须写出来
```

几个高频问答：

- `str | None` 和老写法 `Optional[str]` 完全等价。新代码用 `|`，只在读老代码时认识 `Optional` 即可。`Union[str, int]` 同理等价于 `str | int`。
- `dict` 后面不写方括号就是"不知道键值类型"，等于 `dict[Any, Any]`。能写就写，`dict[str, str]` 比光秃秃的 `dict` 对补全帮助大得多。
- `Any` 是"放弃检查"：任何值都符合，检查器闭嘴。`object` 是"只知道它是个对象"：什么都能装，但用之前要先 `isinstance` 收窄（见第 6 节）。拿不准时用 `Any` 先跑起来，比瞎写一个错类型强。

TS 对照表，一眼映射：

| TS | Python | 说明 |
|---|---|---|
| `string[]` | `list[str]` | 数组/列表 |
| `Record<string, number>` | `dict[str, float]` | 字典 |
| `string \| null` | `str \| None` | 可空 |
| `type V = number[]` | `Vector = list[float]` | 别名（下节） |

## 3. 给形状起名：类型别名、Literal、TypedDict

当同一个复杂类型出现第三次，就该起个别名。别名不是新类型，只是**外号**：

```python title="alias.py"
Vector = list[float]              # 别名：Vector 就是 list[float] 的外号
DocScores = dict[str, float]      # 文档 id → 分数

def embed(text: str) -> Vector: ...
def rerank(scores: DocScores) -> DocScores: ...
```

`Literal` 限定"只能是这几个字面量"，像字符串字面量联合。写检索模式、模型选项时最常用：

```python title="literal.py"
from typing import Literal

Mode = Literal["dense", "hybrid", "rerank"]

def retrieve(query: str, mode: Mode = "dense") -> list[str]:
    ...

retrieve("什么是 RAG", mode="dense")    # ✅
retrieve("什么是 RAG", mode="sparse")   # ❌ pyright 报错：不在字面量里
```

运行时 `mode="sparse"` 照样能跑（再次记住第 0 节），但编辑器会当场红线标出来，发版前就被拦下。

`TypedDict` 描述"就是个 dict，但键和值的形状固定"——LLM 返回 JSON 时极常用：

```python title="shapes.py"
from typing import TypedDict

class Chunk(TypedDict):
    id: str
    text: str
    score: float

def show(c: Chunk):
    print(c["text"].upper())   # 编辑器知道 c["text"] 是 str，能补全 .upper()
    # print(c["title"])        # ❌ pyright 报错：Chunk 没有这个键

show({"id": "a1", "text": "hello", "score": 0.9})  # ✅ 还是普通 dict
```

`TypedDict` 描述"就是个 dict，但键和值的形状固定"，LLM 返回 JSON 时极常用。要类、要方法校验、要序列化，用 pydantic 的 `BaseModel`（见[下一篇](08-dataclass-and-pydantic.md)），TypedDict 只管"形状声明"。

注意三件事：

1. `Chunk(...)` 构造出来还是普通 `dict`，没有方法、没有校验，只是"形状说明书"。
2. 要类、要方法、要运行时校验、要序列化，用 pydantic 的 `BaseModel`（见[下一篇](08-dataclass-and-pydantic.md)）。`TypedDict` 只管"长什么样"，不管"对不对"。
3. 可选键用 `total=False` 或 `NotRequired`（3.11+），别用 `| None` 混淆"键缺失"和"值为 None"：

```python title="typeddict-optional.py"
from typing import NotRequired, TypedDict

class Hit(TypedDict):
    id: str
    text: str
    score: NotRequired[float]   # 可有可无；有的话必须是 float
```

## 4. 函数当参数：Callable

排序 key、回调函数、重试 wrapper，凡是"传一个函数进来"都用 `Callable`。写法是 `Callable[[入参类型...], 返回类型]`：

```python title="callable.py"
from collections.abc import Callable

def top_k(
    scores: list[float],
    k: int,
    key: Callable[[float], float] = lambda s: s,
) -> list[float]:
    return sorted(scores, key=key, reverse=True)[:k]
```

对应 TS 的 `(x: number) => number`。入参列表也是个 list：无参就是 `Callable[[], str]`（一个无参返 str 的函数），多参就是 `Callable[[str, int], bool]`。

AI 场景实例——给 LLM 调用包一层重试，`func` 是"任意可调用"：

```python title="callable-retry.py"
from collections.abc import Callable

def with_retry(func: Callable[..., str], prompt: str) -> str:
    # Callable[..., str]：参数不管，只关心"返回 str"
    for _ in range(3):
        try:
            return func(prompt)
        except Exception:
            continue
    raise RuntimeError("重试耗尽")
```

## 5. 泛型：写一个能"记住类型"的函数

看这个最简的 top_k，不过滤、只截断：

```python title="generic-why.py"
from typing import TypeVar

T = TypeVar("T")   # T 是"某个未知类型"的占位符

def top_k(items: list[T], k: int) -> list[T]:
    return items[:k]

names: list[str] = top_k(["a.md", "b.md"], 1)   # T 被推断为 str，返回 list[str]
vecs: list[float] = top_k([0.1, 0.9], 1)        # T 被推断为 float
```

为什么不用 `Any`？对比：

```python title="generic-vs-any.py"
from typing import Any

def top_k_any(items: list[Any], k: int) -> list[Any]:
    return items[:k]

r = top_k_any(["a.md"], 1)
# r 的类型是 list[Any] —— 编辑器不知道元素是 str，没有补全
```

`Any` 版本"进去是什么、出来就忘了"；泛型版本"进去是 str、出来还是 str"，类型信息被**保留**下来。规则：**输入和输出是同一种"未知类型"时，用 TypeVar；真的什么都行、不关心时，才用 Any**。

日常够用的泛型就这一招。`key` 函数带上就是完整版：

```python title="generics.py"
from collections.abc import Callable
from typing import TypeVar

T = TypeVar("T")

def top_k(items: list[T], k: int, key: Callable[[T], float]) -> list[T]:
    return sorted(items, key=key, reverse=True)[:k]

top_k(["a.md", "b.md"], 1, key=len)     # T 自动推断为 str
top_k([{"s": 0.1}], 1, key=lambda d: d["s"])
```

## 6. Protocol：给鸭子类型补一张"行为说明书"

## Protocol：鸭子类型的类型化表达

[第一篇](01-syntax-and-types.md)说过 Python 是鸭子类型：不问"你是什么"，只问"你能做什么"。`Protocol`（结构化子类型）就是把"能做什么"写下来，让检查器也能看懂：

```python title="protocol.py"
from typing import Protocol

class Embedder(Protocol):                 # 不需要任何类继承它
    def embed(self, texts: list[str]) -> list[list[float]]: ...

def build_index(embedder: Embedder, docs: list[str]):
    return embedder.embed(docs)

# 任何具有 embed() 方法签名的类都自动满足 Embedder：
class BGEService:
    def embed(self, texts: list[str]) -> list[list[float]]:
        return [[0.1] for _ in texts]

class OpenAIService:                      # 继承关系完全不同，也照样通过
    def embed(self, texts: list[str]) -> list[list[float]]:
        return [[0.2] for _ in texts]

build_index(BGEService(), ["a"])    # ✅
build_index(OpenAIService(), ["a"]) # ✅ 运行时零耦合，检查器也放行
```

这等价于 TS 的 interface + 结构化兼容。写检索器、Embedder、LLM 客户端的抽象时，定义一个 Protocol 比继承 ABC 轻得多。

对比三种"抽象"手段：

| 手段 | 怎么满足 | 代价 |
|---|---|---|
| 继承基类 | `class B(Base)` | 强耦合，第三方类改不了 |
| ABC 抽象基类 | 继承 + 实现抽象方法 | 还是要继承 |
| `Protocol` | 长得像就行，不用继承 | 零耦合，推荐 |

这等价于 TS 的 interface + 结构化兼容。写检索器、Embedder、LLM 客户端的抽象时，定义一个 Protocol 比继承 ABC 轻得多。

补两句避坑：Protocol 默认只在静态检查时生效，`isinstance(x, Embedder())` 会报错；要运行时也 `isinstance`，得加 `@runtime_checkable` 装饰，且只检查"有没有这个方法"，不检查签名。

## 7. 收窄：把"可能是 None"变成"一定是 str"

注解写完 `str | None`，用之前要"收窄"（narrowing）——告诉检查器"这里之后不可能是 None"。三种惯用写法：

```python title="narrow.py"
def render(text: str | None) -> str:
    # 写法一：早退（推荐）——先把 None 打发走
    if text is None:
        return ""
    # 到这里，检查器知道 text 一定是 str
    return text.strip().upper()

def render2(text: str | None) -> str:
    # 写法二：assert —— 测试/脚本里常见，-O 优化会 strip 掉，生产慎用
    assert text is not None, "text 不应为 None"
    return text.strip()

def render3(payload: dict | list) -> int:
    # 写法三：isinstance —— 联合类型各自处理
    if isinstance(payload, dict):
        return len(payload)
    return len(payload)   # 这里一定是 list
```

LLM 返回的 JSON（`dict | None`、`str | int` 混杂）几乎每处都要收窄。养成习惯：**边界上先 `is None` / `isinstance` 判断，再干活**，pyright 的红线会少一半。

## 8. pyright：让注解真正"生效"

注解本身只是数据，要配一个静态检查器才有价值：

```bash
uv add --dev pyright
uv run pyright            # 或装 VS Code 的 Pylance 扩展（内置 pyright）
```

严格度从 `basic` 起步（默认），不要一上来 `strict`：

```json title="pyrightconfig.json"
{
  "typeCheckingMode": "basic",
  "include": ["content", "src"]
}
```

- `basic`：只查明显的（调不存在的方法、Literal 写错、必传参数没传）。
- `strict`：连"没注解的函数"都报错，适合新项目，老项目迁移容易报错过多。

工程建议：**新文件加注解，旧代码顺手加**，与 ruff 格式化一起构成最低限度的工程习惯。pyright 报错会带有行号和字段路径，顺着"期望什么、实际给了什么"排查即可。

## 参考与延伸

- [Python 官方文档（中文）· typing](https://docs.python.org/zh-cn/3/library/typing.html)
- [mypy 文档](https://mypy.readthedocs.io/)（另一款主流检查器，本站示例用 pyright，两者选一即可）
- [pyright 配置文档](https://microsoft.github.io/pyright/#/configuration)（typeCheckingMode 各档区别）
