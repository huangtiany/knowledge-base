---
title: 装饰器、with 与生成器
date: 2026-09-05
tags: [Python]
summary: 三个"高级语法"其实是一件事的三种包装：装饰器包装函数，with 包装资源生命周期，生成器包装惰性序列——LLM SDK 源码里全是它们。
---

这三个概念常被并列成"Python 进阶三件套"。它们的共同点：都是**把一件事的"做什么"和"怎么管"分开**——函数逻辑与横切逻辑（装饰器）、使用逻辑与资源生命周期（with）、生产逻辑与消费节奏（生成器）。

## 装饰器：不改动函数本体加行为

装饰器是"接收函数、返回函数"的函数，`@` 只是语法糖：

```python title="decorator.py"
import functools, time

def timed(func):
    @functools.wraps(func)            # 保留原函数的 __name__/docstring
    def wrapper(*args, **kwargs):
        t0 = time.perf_counter()
        result = func(*args, **kwargs)
        print(f"{func.__name__} 耗时 {time.perf_counter() - t0:.2f}s")
        return result
    return wrapper

@timed                                  # embed_batch = timed(embed_batch)
def embed_batch(texts: list[str]) -> list[list[float]]:
    time.sleep(0.5)                     # 模拟调用 embedding API
    return [[0.0] * 1024 for _ in texts]
```

计时、重试、缓存、鉴权这类横切逻辑全部走装饰器——LLM SDK 里的 `@retry`、FastAPI 里的 `@app.get` 都是它。带参数的装饰器是"三层函数"（收参数→收函数→收调用），读懂即可，手写频率低。

## with 与上下文管理器：资源的确定性释放

`with` 保证退出代码块时**无论正常还是异常**都执行清理：

```python title="context.py"
# 内置用法：文件自动关闭
with open("corpus.txt", encoding="utf-8") as f:
    text = f.read()
# 此刻 f 已关闭，即使上面抛了异常

# 自己写：实现 __enter__/__exit__ 两个协议方法
class Timer:
    def __enter__(self):
        self.t0 = time.perf_counter()
        return self
    def __exit__(self, exc_type, exc, tb):
        print(f"耗时 {time.perf_counter() - self.t0:.2f}s")
        return False                    # False=异常继续抛，True=吞掉

with Timer():
    embed_batch(["a", "b"])
```

日常更推荐 `contextlib` 的写法，几行搞定：

```python title="contextlib.py"
from contextlib import contextmanager

@contextmanager
def timer(label: str):
    t0 = time.perf_counter()
    yield                               # yield 之前 = __enter__，之后 = __exit__
    print(f"{label} 耗时 {time.perf_counter() - t0:.2f}s")
```

心智对照：`with` 之于资源，约等于 TS `try...finally` 的声明式版本，但协议化之后任何库都能定义自己的 with 语义（数据库事务、HTTP 客户端、临时目录）。

## 生成器：惰性序列

含 `yield` 的函数就是生成器：调用不执行，每次 `next()` 跑到下一个 yield 暂停。价值是**惰性**——不把整个数据集装进内存：

```python title="generator.py"
def iter_chunks(path: str, size: int = 512):
    """逐段读取大文本，按字符数切块——RAG 语料预处理的雏形"""
    buf = []
    with open(path, encoding="utf-8") as f:
        for line in f:
            buf.append(line)
            if sum(map(len, buf)) >= size:
                yield "".join(buf)      # 产出一个 chunk，然后暂停
                buf = []
    if buf:
        yield "".join(buf)

for chunk in iter_chunks("corpus.txt"):
    embed(chunk)                        # 内存里永远只有一个 chunk
```

对照 JS：Python 生成器函数 ≈ JS generator function（`function*` + `yield`），概念完全同构。生成器表达式 `(f(x) for x in xs)` 是列表推导式的惰性版，聚合函数（sum/max）可直接消费。

## 参考与延伸

- [Python 官方文档（中文）· contextlib](https://docs.python.org/zh-cn/3/library/contextlib.html)
- [Python - 100 天从新手到大师 · 生成器与装饰器](https://github.com/jackfrued/Python-100-Days)
