---
title: pydantic 对接 LLM 结构化输出
date: 2026-09-05
tags: [Python]
summary: 把模型输出的文本变成类型可信的对象：schema 设计、JSON mode / function calling 两种通道、解析失败的重试循环。
---

LLM 的原生输出只有一种类型：**文本**。结构化输出（抽取字段、分类标签、评分）的全部工程，就是把文本可靠地变成 `BaseModel`。校验器定义见 [dataclass 与 pydantic](08-dataclass-and-pydantic.md)，本文聚焦它如何嵌入 LLM 调用链。

## 先定义 schema：字段即提示词

```python title="schema.py"
from typing import Literal
from pydantic import BaseModel, Field

class ExtractedFact(BaseModel):
    entity: str = Field(description="文本中的核心实体名称")
    category: Literal["人物", "机构", "技术", "其他"] = Field(description="实体类别")
    evidence: str = Field(description="支撑判断的原文片段，逐字引用")
    confidence: float = Field(ge=0, le=1, description="抽取置信度")
```

`description` 会直接进入模型上下文：OpenAI structured outputs 把每个字段的 description 注入给模型。**schema 写得越像文档，输出越稳**：给字段起清楚的名字、写清取值含义、用 Literal 限定枚举、用 ge/le 限定范围，都是在提示模型。

## 两条通道：JSON mode 与 SDK 内建

**通道一：SDK 内建的 structured output**（首选，2024.8 后 OpenAI / 2024 后各家主流 SDK 都支持）：

```python title="native.py"
from openai import OpenAI
client = OpenAI()

completion = client.chat.completions.parse(
    model="gpt-4o-mini",
    messages=[{"role": "user", "content": "从这段话抽取事实：……"}],
    response_format=ExtractedFact,        # 直接给 pydantic 类
)
fact = completion.choices[0].message.parsed   # 出来就是 ExtractedFact 实例
```

原理是 constrained decoding：把 schema 编译成语法约束，模型**在生成层面**不可能产出不合 schema 的 token——不是"生成完再验证"，而是"生成时就写不出错的"。字段覆盖率近乎 100%，但 schema 复杂度有上限（嵌套太深/联合类型过多会被拒绝）。

**通道二：JSON mode + 自己解析**（兜底，不支持 constrained decoding 的模型/本地模型用）：

```python title="json-mode.py"
import json
completion = client.chat.completions.create(
    model="qwen2.5:7b",                   # 本地 Ollama 模型示例
    response_format={"type": "json_object"},
    messages=[{"role": "user", "content": "……只输出 JSON"}],
)
fact = ExtractedFact.model_validate_json(completion.choices[0].message.content)
```

## 重试循环：把校验错误喂回给模型

非 constrained 通道必然遇到解析失败，标准解法是把 pydantic 的报错作为反馈再请求：

```python title="retry-loop.py"
def extract_with_retry(text: str, retries: int = 2) -> ExtractedFact:
    messages = [{"role": "user", "content": f"抽取事实，输出 JSON：{text}"}]
    for _ in range(retries + 1):
        raw = client.chat.completions.create(
            model="qwen2.5:7b",
            response_format={"type": "json_object"},
            messages=messages,
        ).choices[0].message.content
        try:
            return ExtractedFact.model_validate_json(raw)
        except ValidationError as e:
            messages.append({"role": "assistant", "content": raw})
            messages.append({"role": "user",
                             "content": f"JSON 不合法：{e}。修正后重新输出。"})
    raise RuntimeError("结构化输出重试耗尽")
```

这个循环值得写成项目里的通用工具，所有非 constrained 的结构化调用都用它。

## 常见坑

- **枚举值漂移**：模型输出"科技公司"而 schema 要"机构"。用 Literal + description 写明全部合法值；仍漂移时在 prompt 里给 few-shot
- **长文本截断 JSON**：`max_tokens` 给小了，JSON 会被截断，解析必然失败。结构化调用把 max_tokens 放宽
- **过度嵌套**：三层以上的嵌套 schema 两个通道都容易失败，优先拍平
- **别把业务校验混进 schema**：pydantic 管数据形状，"这个日期不能是周末"这类业务规则放业务层

## 参考与延伸

- [OpenAI · Structured Outputs 文档](https://platform.openai.com/docs/guides/structured-outputs)（constrained decoding 的机制说明）
- [pydantic 官方文档 · JSON parsing](https://docs.pydantic.dev/latest/concepts/json/)
- [datawhalechina/llm-universe · 结构化输出章节](https://github.com/datawhalechina/llm-universe)
