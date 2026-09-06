---
title: FastAPI：依赖注入与 SSE 流式
date: 2026-09-05
tags: [Python]
summary: 把 LLM 封装成服务的标准做法：类型即接口、依赖注入管配置与客户端、SSE 把 token 流式推给前端。
---

LLM 服务化默认选 FastAPI：原生 async 支撑并发吞吐，pydantic 类型即校验（结构化输出直通），自动生成 OpenAPI 文档（前端/联调直接看），StreamingResponse 一行开流。下文聚焦其中最高频的三件事：类型化接口、依赖注入、流式响应。

## 类型即接口

```python title="app-basic.py"
from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI(title="格致问答 API")

class AskIn(BaseModel):
    question: str
    top_k: int = 4

class Cite(BaseModel):
    doc_id: str
    quote: str

class AskOut(BaseModel):
    answer: str
    citations: list[Cite]

@app.post("/ask", response_model=AskOut)
def ask(body: AskIn) -> AskOut:
    answer, cites = answer_question(body.question, body.top_k)
    return AskOut(answer=answer, citations=[Cite(**c) for c in cites])
```

请求体自动用 pydantic 校验（坏请求自动 422），响应自动序列化，`/docs` 自动出交互式文档。启动：`uv run fastapi dev`（开发热重载）/ `uv run fastapi run`（生产）。

## 依赖注入：管住配置、客户端和切面

```python title="deps.py"
import os
from functools import lru_cache
from fastapi import Depends
from openai import OpenAI
from pydantic import BaseModel

class Settings(BaseModel):
    openai_api_key: str
    qdrant_url: str = "http://localhost:6333"

@lru_cache
def get_settings() -> Settings:
    return Settings(**os.environ)             # 启动时读环境变量，缓存单例

def get_client(settings: Settings = Depends(get_settings)) -> OpenAI:
    return OpenAI(api_key=settings.openai_api_key)   # 依赖可以级联：client 依赖 settings
```

`Depends` 的价值在测试：`app.dependency_overrides[get_client] = lambda: fake_client` 一行把真客户端换成 mock，[pytest](10-pytest-basics.md) 里不调真实 API 就能跑集成测试。鉴权、限流、trace 注入同样通过 Depends 实现。

## SSE 流式：token 一个个推给前端

LLM 体验的分水岭在流式——非流式接口要等完整答案，流式接口首字延迟 < 1s：

```python title="stream.py"
from fastapi.responses import StreamingResponse

async def stream_answer(question: str):
    stream = await client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": question}],
        stream=True,                          # SDK 侧开流
    )
    async for chunk in stream:                # 每个 chunk 含增量 token
        delta = chunk.choices[0].delta.content or ""
        if delta:
            yield f"data: {json.dumps({'delta': delta}, ensure_ascii=False)}\n\n"
    yield "data: [DONE]\n\n"                  # SSE 结束标记

@app.post("/ask/stream")
async def ask_stream(body: AskIn):
    return StreamingResponse(
        stream_answer(body.question),
        media_type="text/event-stream",       # SSE 协议的 content-type
    )
```

前端用 `EventSource`（GET）或 fetch + ReadableStream（POST）消费 `data:` 帧。要点：`ensure_ascii=False` 保中文不被转义、每个事件以空行结尾、结束发哨兵帧 `[DONE]`（对齐 OpenAI 的约定）。

## 三个工程习惯

- **超时与取消**：给上游 LLM 调用设 `timeout`；客户端断开时 FastAPI 会取消协程，长任务记得处理 `asyncio.CancelledError`
- **流式也要收口**：流里每个 chunk 无法整体校验，但可以在流结束后再做完整性检查（引用是否存在等）
- **密钥只在环境变量**：通过 [Depends 注入](#依赖注入管住配置客户端和切面)，任何情况下不落代码不落日志

## 参考与延伸

- [FastAPI 官方文档（中文）](https://fastapi.tiangolo.com/zh/)（先读「用户指南」前半部分 + Async 部分）
- [OpenAI Python SDK · streaming](https://github.com/openai/openai-python#streaming-responses)
