---
title: 装饰器、with 与生成器
date: 2026-09-05
tags: [Python]
summary: 装饰器包装函数，with 包装资源生命周期，生成器包装惰性序列。LLM SDK 源码里三者随处可见。
---

装饰器分开函数逻辑与横切逻辑，with 分开使用逻辑与资源生命周期，生成器分开生产逻辑与消费节奏。三者都是把一件事的"做什么"和"怎么管"分开。

前置依赖：装饰器就是[闭包](03-functions-and-scope.md)的应用（外层记住原函数、内层推迟执行）；`with` 用到类的 [dunder 协议](04-classes-and-dunder.md)。如果那两篇还没读，先读再回来看，阻力减半。

装饰器是接收函数、返回函数的函数，`@` 只是语法糖：

# Part A. 装饰器：不改动函数本体加行为

## A0. 痛点：每个函数都要计时，重贴一遍样板？

```python title="pain-repeat.py"
import time

def embed_batch(texts):
    t0 = time.perf_counter()          # ← 样板 1
    result = [[0.0] * 1024 for _ in texts]
    print(f"耗时 {time.perf_counter() - t0:.2f}s")  # ← 样板 2
    return result

def rerank(query, docs):
    t0 = time.perf_counter()          # ← 同样的两行又贴一遍
    result = sorted(docs)[:3]
    print(f"耗时 {time.perf_counter() - t0:.2f}s")
    return result
```

函数越多，计时、重试、打日志、鉴权的样板贴得越多。改一次逻辑（比如把 `print` 换成写日志文件）要改 N 处。想要的是：**业务函数只写业务，横切逻辑统一加**。

## A1. 最小装饰器：@ 只是"赋值"的糖

装饰器本质就是"接收函数、返回函数"的普通函数。先看不用 `@` 的版本，理解后再加糖：

```python title="decorator-desugar.py"
import functools, time

def timed(func):
    @functools.wraps(func)            # 先忽略这行，A3 讲
    def wrapper(*args, **kwargs):     # 先忽略 *args，A2 讲
        t0 = time.perf_counter()
        result = func(*args, **kwargs)  # 调用原函数
        print(f"{func.__name__} 耗时 {time.perf_counter() - t0:.2f}s")
        return result
    return wrapper

def embed_batch(texts: list[str]):
    time.sleep(0.1)                   # 模拟调用 embedding API
    return [[0.0] * 1024 for _ in texts]

embed_batch = timed(embed_batch)      # ← 装饰器的真身：包一层、赋回去
embed_batch(["a", "b"])               # 调用的是 wrapper，内部再调原函数
```

加上 `@` 之后完全等价，只是少写一行赋值：

```python title="decorator.py"
@timed                                  # embed_batch = timed(embed_batch)
def embed_batch(texts: list[str]) -> list[list[float]]:
    time.sleep(0.1)
    return [[0.0] * 1024 for _ in texts]
```

计时、重试、缓存、鉴权这类横切逻辑全部走装饰器，LLM SDK 里的 `@retry`、FastAPI 里的 `@app.get` 都是它。带参数的装饰器是"三层函数"（收参数→收函数→收调用），读懂即可，手写频率低。

关键心智只有两句：

1. **`timed(embed_batch)` 在定义时执行一次**（import / def 跑到那行时）。它只做包装，不调业务逻辑。
2. **`wrapper(...)` 在每次调用时执行**。计时、打印都发生在这里。

用打印亲手验证：

```python title="decorator-timing.py"
def deco(func):
    print(f"包装 {func.__name__}")    # 定义时打印一次
    def wrapper(*a, **k):
        print("调用前")               # 每次调用都打印
        return func(*a, **k)
    return wrapper

@deco
def hi():
    print("业务逻辑")

print("--- 定义结束 ---")
hi()
hi()
# 输出：
# 包装 hi
# --- 定义结束 ---
# 调用前 / 业务逻辑
# 调用前 / 业务逻辑
```

如果"包装"打印了但"调用前"没打印，说明函数只被定义、从没被调用——排查"装饰器不生效"先看这个。

## A2. wrapper 为什么必须是 (*args, **kwargs)

因为装饰器要能包**任意签名**的函数。写死了参数就只能包一种：

```python title="decorator-args.py"
# ❌ 只能包无参函数，包 embed_batch(texts) 直接 TypeError
def timed_narrow(func):
    def wrapper():
        return func()
    return wrapper

# ✅ 透传一切：位置参数进 args 元组，关键字参数进 kwargs 字典
def timed(func):
    def wrapper(*args, **kwargs):
        return func(*args, **kwargs)
    return wrapper
```

这就是[函数篇](03-functions-and-scope.md)的打包/解包：定义处 `*args` 打包、调用 `func(*args)` 解包，原样透传。这是装饰器的固定套路，背下来。

还有一句容易漏的：**`return result` 必须写**。`wrapper` 里调了 `func` 却不 `return`，调用方拿到的永远是 `None`。排查"加了装饰器返回值变 None"先查这个。

## A3. functools.wraps：别把函数的"身份证"弄丢

不加 `wraps` 的包装有个隐形 bug：原函数的名字、文档全被 `wrapper` 盖掉了：

```python title="decorator-wraps.py"
import functools

def no_wraps(func):
    def wrapper(*a, **k):
        """wrapper 的文档"""
        return func(*a, **k)
    return wrapper

def with_wraps(func):
    @functools.wraps(func)   # 把 __name__、__doc__ 等从原函数拷过来
    def wrapper(*a, **k):
        """wrapper 的文档"""
        return func(*a, **k)
    return wrapper

@no_wraps
def embed_a(texts): """embed 文档"""
@with_wraps
def embed_b(texts): """embed 文档"""

print(embed_a.__name__)  # 'wrapper' —— 名字丢了，报错堆栈、日志全显示 wrapper
print(embed_b.__name__)  # 'embed_b' —— 保住了
```

规则：**自己写的装饰器，内层 `wrapper` 上永远加 `@functools.wraps(func)`**。一行成本，保住函数名、文档字符串、`help()` 显示。不加的话，日志里十个函数全叫 `wrapper`，排错时想哭。

## A4. 带参数的装饰器：三层函数

`@retry(times=2)` 比 `@timed` 多了一层括号。拆开看，它分两步执行：

```python title="decorator-params.py"
import functools, time

def retry(times: int = 3):
    """第一层：收装饰器自己的参数，返回真正的装饰器"""
    def deco(func):
        """第二层：收被装饰的函数，返回包装"""
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            """第三层：收调用参数，真正干活"""
            for i in range(times):
                try:
                    return func(*args, **kwargs)
                except Exception:
                    if i == times - 1:
                        raise
                    time.sleep(1)
        return wrapper
    return deco

@retry(times=2)                       # 两步：retry(times=2) 先返回 deco，再 deco(embed)
def call_llm(prompt, model="gpt-4o-mini"):
    ...
```

 desugar 写法帮你看清顺序：

```python
call_llm = retry(times=2)(call_llm)
#         ↑① 先执行：拿到 times=2，返回 deco
#                          ↑② 再执行：包上函数，返回 wrapper
```

三层各跑在什么时候，背这句就行：**外层（参数）在定义时跑，中层（包函数）在定义时跑，内层（调业务）在每次调用时跑**。读懂即可，手写带参装饰器的频率远低于阅读（LLM SDK 里的 `@retry`、限流装饰器都是这个形状）。

## A5. 叠放与开箱即用

多个装饰器从下往上包，执行时从上往下进：

```python title="decorator-stack.py"
@deco_a        # embed = deco_a(deco_b(embed))
@deco_b
def embed(texts): ...
# 调用顺序：deco_a.wrapper → deco_b.wrapper → 业务
```

日常直接用的现成装饰器（认出它们，不用手写）：

```python title="decorator-builtin.py"
import functools

@functools.lru_cache(maxsize=1024)
def embed_cached(text: str) -> tuple:
    ...  # 相同 text 只调一次 API，后面走内存缓存。RAG 评测、回归测试省钱神器
    # 注意：参数必须可哈希（str 可以，list 不行），且函数应是纯的（同样输入同样输出）

# @property：把方法伪装成属性，见[类篇](04-classes-and-dunder.md)
# @contextmanager：把生成器变成 with 工具，见本篇 Part B
# @app.get("/search")：FastAPI 路由，本质也是"登记函数信息再原样返回"
```

# Part B. with 与上下文管理器：资源的确定性释放

## B0. 痛点：try...finally 写三遍就烦了

文件、网络连接、数据库事务都有同样的生命周期：**打开 → 用 → 无论成败都要关**。手写版：

```python title="pain-finally.py"
f = open("corpus.txt", encoding="utf-8")
try:
    text = f.read()          # 中间抛异常也会跳到 finally
finally:
    f.close()                # 保证关闭
```

逻辑只有一行 `f.read()`，样板占四行。`with` 把"保证关闭"收进协议里：

```python title="context.py"
with open("corpus.txt", encoding="utf-8") as f:
    text = f.read()
# 此刻 f 已关闭：正常走完会关，中途抛异常也会关
```

心智对照：`with` ≈ TS `try...finally` 的声明式版本。但协议化之后**任何库都能定义自己的 with 语义**：数据库事务（退出时 commit/rollback）、HTTP 客户端（退出时关连接池）、临时目录（退出时删文件）。

## B1. 文件读写的三个工程坑

`with open(...)` 是 `with` 最常见的落地，三个坑一次讲清：

```python title="io.py"
from pathlib import Path

docs = Path("content/ai")            # ① pathlib 面向对象路径，优于字符串拼接
md_files = sorted(docs.rglob("*.md"))

with open(md_files[0], encoding="utf-8") as f:  # ② encoding 必须显式写
    text = f.read()

Path("out.jsonl").write_text("hello\n", encoding="utf-8")  # 小文件可一行写完
```

1. **`encoding="utf-8"` 必须显式写**——默认编码随系统区域设置（简中 Windows 是 GBK），读 UTF-8 的 Markdown 会直接 `UnicodeDecodeError`。这是 Windows 开发 Python 的第一坑，写 RAG 语料加载代码时尤其高频。
2. **大文件按行流式读，不要一次 `read()`**：`for line in f` 是逐行惰性读取，内存里永远只有一行（原理见 Part C 生成器，文件对象本身就是迭代器）。
   ```python title="io-stream.py"
   with open("corpus.txt", encoding="utf-8") as f:
       for line in f:          # 一行一行来，10GB 文件也不爆内存
           process(line)
   ```
3. **路径用 `pathlib.Path`**：`Path("a") / "b" / "c.md"` 自动处理斜杠，比 `"a" + "/" + "b"` 跨平台；`rglob("*.md")` 递归找文件，一行顶 `os.walk` 十行。

## B2. 自写上下文管理器：__enter__ / __exit__

任何实现了这两个 dunder 方法的类都能 `with`。以前面的计时器为例：

```python title="context-timer.py"
import time

class Timer:
    def __enter__(self):
        self.t0 = time.perf_counter()
        return self              # as 后面的变量就是这个返回值
    def __exit__(self, exc_type, exc, tb):
        # exc_type/exc/tb：块内没异常就全是 None；有异常就是异常信息
        print(f"耗时 {time.perf_counter() - self.t0:.2f}s")
        return False             # False=异常继续往外抛（默认）；True=吞掉异常

with Timer():
    embed_batch(["a", "b"])

with Timer() as t:               # as t 接住 __enter__ 的返回值
    print(type(t))               # <class 'Timer'>
```

`return True` 吞异常是双刃剑：只有"重试、降级"这种明确要吞的场景才用，普通清理逻辑永远 `return False`（或直接不写 `return`，默认就是 `False`）。吞了异常还不打日志，等于把错误藏起来，排错地狱预定。

## B3. 日常写法：@contextmanager（生成器的第一次应用）

手写类要两个方法，`contextlib` 把这事压缩到一个函数——`yield` 之前是 `__enter__`，之后是 `__exit__`：

```python title="contextlib.py"
from contextlib import contextmanager
import time

@contextmanager
def timer(label: str):
    t0 = time.perf_counter()
    try:
        yield                        # ← with 块的代码在这里执行
    finally:
        print(f"{label} 耗时 {time.perf_counter() - t0:.2f}s")

with timer("embedding"):
    embed_batch(["a", "b"])
```

可以把它当作 TS `try...finally` 的声明式版本，但协议化之后任何库都能定义自己的 with 语义（数据库事务、HTTP 客户端、临时目录）。

注意这个 `try...finally` 不能省：块内一抛异常清理代码容易被跳过。**`@contextmanager` 的标准骨架是 `try: yield finally: 清理`**。

`yield` 还能带值，对应 `as` 接到的东西（文件 `open` 的 `as f` 就是这么来的）：

```python title="contextlib-value.py"
@contextmanager
def connect(db_url: str):
    conn = {"url": db_url, "open": True}
    try:
        yield conn        # as 后面的变量就是这个 conn
    finally:
        conn["open"] = False   # 退出时关连接

with connect("sqlite:///rag.db") as conn:
    print(conn["url"])
# 此刻 conn["open"] 已是 False
```

多资源同开写一行就行：`with open("a") as fa, open("b") as fb:`。标准库现成的：`tempfile.TemporaryDirectory()`（退出自动删目录）、`threading.Lock()`（退出自动解锁）、`asyncio.Semaphore` 的 `async with`（见[并发篇](11-asyncio-concurrency.md)）。

# Part C. 生成器：惰性序列

## C0. 痛点：数据装不进内存

```python title="pain-memory.py"
nums = [i * i for i in range(10_000_00)]  # 列表推导：一次性全算完、全放内存
total = sum(nums)                          # 其实只想要个总数，中间列表是浪费
```

列表是"先全造出来，再消费"；生成器是"要一个、算一个"。文件对象 `for line in f` 能读大文件不爆内存，靠的正是这个。

## C1. 最小生成器：调用不执行，next 才走一步

函数里出现 `yield`，它就变成"生成器函数"：**调用时一行都不执行，只返回生成器对象；每次 `next()` 跑到下一个 `yield` 暂停**，局部变量全部冻住：

```python title="generator-min.py"
def counter():
    print("开始")
    yield 1          # 跑到这里暂停，把 1 交出去
    print("继续")
    yield 2
    print("结束")

g = counter()
print("已创建，未执行")   # 上面三行里"开始"还没打印，证明调用没执行

print(next(g))  # 开始 → 1
print(next(g))  # 继续 → 2
```

输出顺序展示了执行过程：`print("开始")` 不是在 `counter()` 那行打印的，而是在第一次 `next(g)` 时。**生成器函数 = 可暂停的函数**，`yield` 是暂停点与产出点。对照 JS：Python 生成器函数与 JS `function*` + `yield` 概念同构。

`for` 循环会自动 `next` 直到遇到 `StopIteration`：

```python title="generator-for.py"
for x in counter():   # 自动 next，遇到 StopIteration 自动停
    print(f"拿到 {x}")
```

## C2. 两个特性：一次性与无长度

```python title="generator-once.py"
def gen():
    yield from [1, 2, 3]

g = gen()
print(list(g))   # [1, 2, 3] —— 第一次正常
print(list(g))   # [] —— 第二次是空的，生成器只能消费一次
```

```python title="generator-nolen.py"
g = (x * x for x in range(10))  # 生成器表达式，没有 len、不能 g[3]
# len(g)     # ❌ TypeError
# g[3]       # ❌ TypeError
import itertools
print(list(itertools.islice(g, 3)))  # ✅ 取前 3 个：[0, 1, 4]
```

生成器是一次性消费流，没有 `len`、不支持随机索引，消费完即耗尽。需要反复遍历或随机访问时，小数据可转换为 `list`，大数据则重新创建生成器。

## C3. 生成器表达式：列表推导的惰性版

方括号换成圆括号，内存占用从 O(n) 降到 O(1)：

```python title="generator-expr.py"
squares_list = [x * x for x in range(1_000_000)]  # 列表：占用大量内存
squares_gen = (x * x for x in range(1_000_000))   # 生成器：要一个算一个

total = sum(x * x for x in range(1_000_000))      # 聚合函数直接消费
best = max(len(d) for d in ["a.md", "bb.md"])     # sum/max/min 都支持
```

`sum(... for ...)`、`any(... for ...)` 中省略方括号的形式即为生成器表达式。

## C4. 实战：RAG 惰性管线

每一段都是生成器（`yield`），段与段用 `for` 串联。数据流水线逐 chunk 处理，**内存中始终保持极低占用**：

```python title="generator.py"
def iter_chunks(path: str, size: int = 512):
    """逐段读取大文本，按字符数切块（RAG 语料预处理的雏形）"""
    buf = []
    with open(path, encoding="utf-8") as f:   # Part B 的 with + 逐行读
        for line in f:                        # 文件本身就是惰性的，一行一行来
            buf.append(line)
            if sum(map(len, buf)) >= size:
                yield "".join(buf)      # 产出一个 chunk，然后暂停
                buf = []
    if buf:
        yield "".join(buf)

def iter_filtered(chunks, min_len: int = 10):
    for c in chunks:                  # 上一段的产出是这一段的输入
        if len(c.strip()) >= min_len:
            yield c.strip()

for chunk in iter_filtered(iter_chunks("corpus.txt")):
    embed(chunk)                      # 内存里永远只有一个 chunk
```

这就是"生产逻辑与消费节奏分开"：`iter_chunks` 只管怎么切，`for` 只管一次消费一个。对比"先全读进 list 再循环"，10GB 语料下就是"能跑"和"爆内存"的区别。

`yield from` 是把子生成器的货直接转交，读到时认识即可：`yield from [1, 2, 3]` 等价于逐个 `yield`。`send()`/`throw()` 双向通信是高级用法，asyncio 之前时代的残留，日常遇到再查。

## 三者关系回收

- 装饰器 = 包函数：`@timed` 即 `f = timed(f)`；定义时包装、调用时生效；`wrapper(*args, **kwargs)` + `return` + `@functools.wraps` 是固定三件套；带参装饰器是三层（参数→函数→调用）
- with = 包生命周期：正常/异常都清理；手写类实现 `__enter__/__exit__`（吞异常才 `return True`）；日常用 `@contextmanager`，骨架永远 `try: yield finally: 清理`
- 生成器 = 包节奏：`yield` 即暂停+交货；调用不执行、`next` 走一步、`for` 自动消费；一次性、无 len；`(x for x in ...)` 是惰性版推导，管线式串起来处理大数据

## 参考与延伸

- [Python 官方文档（中文）· contextlib](https://docs.python.org/zh-cn/3/library/contextlib.html)
- [Python - 100 天从新手到大师 · 生成器与装饰器](https://github.com/jackfrued/Python-100-Days)
- [Real Python · Primer on Python Decorators](https://realpython.com/primer-on-python-decorators/)（英文，三层装饰器图解最好的一篇）
