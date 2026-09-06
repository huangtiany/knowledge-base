---
title: asyncio：并发调用 LLM 的基础
date: 2026-09-05
tags: [Python]
summary: 事件循环、协程、gather 与信号量限流：把串行调 100 次 embedding 改成并发调用，十几秒内全部返回。
---

LLM 应用是典型的 **IO 密集**：一次 embedding 调用大部分时间在等网络回包，CPU 空闲等待。asyncio 用单线程事件循环把等待时间重叠起来，100 个请求的吞吐能差出一个数量级。事件循环模型可以直接对照 JS 的 async/await，概念同构，语法几乎一样，区别在 Python 显式区分协程函数与普通函数。

## 协程基础：async def / await / asyncio.run

```python title="hello-async.py"
import asyncio

async def embed_one(text: str) -> list[float]:
    await asyncio.sleep(0.1)              # 用 sleep 模拟一次网络 IO
    return [0.0] * 1024

async def main():
    result = await embed_one("你好")       # await：让出控制权等结果
    print(len(result))

asyncio.run(main())                        # 程序入口：启动事件循环
```

规则两条，JS 里同样成立：

1. `async def` 定义协程函数，调用它**不执行**，返回协程对象（对应 JS 调用 async 函数返回 Promise）
2. `await` 只能出现在 `async def` 里；await 一个协程才会真正执行它

Python 的特别之处：**忘了 await 不报错，只会得到一个什么都没执行的协程对象**，看到 `<coroutine object ...> never awaited` 警告就是这回事。JS 里 `await` 可选导致的问题一样存在，只是报错形态不同。

## 并发：gather 与 TaskGroup

```python title="gather.py"
import asyncio, time

async def embed_one(text: str, delay: float = 0.1) -> list[float]:
    await asyncio.sleep(delay)
    return [0.0] * 1024

async def main():
    texts = [f"doc-{i}" for i in range(20)]

    t0 = time.perf_counter()
    vectors = await asyncio.gather(*(embed_one(t) for t in texts))
    print(f"{len(vectors)} 个，耗时 {time.perf_counter() - t0:.2f}s")
    # 串行要 2.0s，并发约 0.1s，20 倍吞吐

asyncio.run(main())
```

`gather` 传一组协程，全部完成后按**原顺序**返回结果列表。3.11+ 更推荐 `asyncio.TaskGroup`（一个失败取消全部，异常处理更干净）；批量场景 gather 简单够用。注意别用 `time.sleep()`：它会阻塞整个事件循环，异步代码里的一切等待都要用 await 版本。

## 信号量限流：并发数不是越多越好

API 有速率限制，直接开 1000 并发只会收到 429：

```python title="semaphore.py"
import asyncio

async def embed_all(texts: list[str], concurrency: int = 10):
    sem = asyncio.Semaphore(concurrency)          # 最多 10 个同时在飞

    async def worker(text: str) -> list[float]:
        async with sem:                            # 拿到信号量才执行
            return await embed_one(text)

    return await asyncio.gather(*(worker(t) for t in texts))
```

`async with sem` 保证任意时刻只有 N 个协程在等响应，其余排队。LLM 应用并发抓取、批量 embedding、跑评测集，这个模式可以直接复用。

## 什么时候不用 asyncio

- CPU 密集（本地推理、大矩阵运算）：事件循环帮不上忙，那是 multiprocessing/向量化的事
- 脚本就发一两个请求：直接用同步 SDK，不必为此引入整套异步
- 用到异步库就得全链路异步：`async def` 里调同步阻塞函数（如 `time.sleep`、同步 HTTP 客户端）会卡死事件循环，SDK 选型时确认有 async 版本（openai.AsyncOpenAI、httpx.AsyncClient）

## 参考与延伸

- [Python 官方文档（中文）· asyncio](https://docs.python.org/zh-cn/3/library/asyncio.html)
- [Real Python · Async IO in Python: A Complete Walkthrough](https://realpython.com/async-io-python/)
