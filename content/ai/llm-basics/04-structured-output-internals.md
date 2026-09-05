---
title: 结构化输出的底层机制
date: 2026-09-05
tags: [LLM基础]
summary: 知道 constrained decoding 在 token 采样层怎么"禁止"模型写错 JSON，才能判断哪些结构化需求能落地、哪些会翻车。
---

[pydantic 对接结构化输出](../python/12-pydantic-structured-output.md)讲了工程侧怎么用，这篇往下一层：模型是怎么被"逼着"输出合法 JSON 的。懂机制，才能预判哪些 schema 会翻车。

## 回顾采样循环：约束插在哪

生成第 N 个 token 时：模型给出全词表的概率分布 → 采样参数决定挑选策略 → 挑出的 token 拼回上下文。**constrained decoding（受限解码）在"挑选"这一步动手**：用一个和 schema（JSON Schema）等价的语法自动机，把"继续输出仍是合法 JSON"的 token 保留、其余 token 的概率直接置零。

也就是说：模型仍然在想它的"下一步"，但它只能在合法候选里选。这就是为什么 constrained decoding 能做到字段 100% 覆盖——**不是运气好，是非法 token 根本没资格被采样**。

```text
schema: {"name": str, "age": int}
输出到 {"name": "格", "age": 时 ←
        此位置合法的只有数字 token：0-9、- 等
        "引号"、"假" 等一切非法 token 概率被置 0}
```

## 工程推论：三条直接从机制得出的规则

**一、schema 是文法，不是建议。** 模型无法"违反"它，但也无法跳出它——你要的字段它一定给（哪怕瞎编），这就是为什么 description 和 few-shot 仍然重要：约束管合法性，语义质量还是要靠提示。

**二、复杂 schema 会撞墙。** JSON Schema 编译成自动机后，过深的嵌套、大量 oneOf/anyOf 会让约束状态机爆炸——各实现（OpenAI structured outputs、outlines、xgrammar）都有深度/规模上限，超了直接报错或降级。拍平 schema 是第一优化。

**三、约束只保语法不保语义。** `"confidence": 999` 合法（是个数字）但不合业务；枚举外的字符串进不来，但"枚举内选错"约束管不了。语义校验归 pydantic 的 validator 和业务层。

## 两条工程通道的机制差异

| | constrained（structured outputs） | JSON mode / 自由生成 + 解析 |
|---|---|---|
| 约束位置 | 采样层（token 级置零） | 仅提示词约定 |
| 字段覆盖 | ~100% | 可能漏字段 |
| 解析失败 | 几乎不会 | 常见（截断、尾随文本） |
| schema 复杂度 | 有上限 | 无所谓 |
| 适用 | API 支持的主流模型 | 本地小模型、不支持的平台 |

本地模型的对应生态：**outlines / xgrammar / llama.cpp 的 grammar（GBNF）**——vLLM 里 `guided_json` 参数背后就是 xgrammar。Ollama 也支持 `format` 参数喂 JSON schema。也就是说 constrained decoding 不是闭源 API 特权，自建推理同样能用。

## 什么时候别用结构化输出

- 输出本身就是自然语言（答案正文）——强行 JSON 化会伤害文风与推理质量
- 需要"先推理再作答"的复杂任务——强制每步都是合法 JSON 会挤压思考空间；解法是 schema 里留 `reasoning` 字段（先写理由再给结论），而不是禁止它想

## 参考与延伸

- [OpenAI · Structured Outputs](https://platform.openai.com/docs/guides/structured-outputs)（开篇即讲 constrained decoding 原理）
- [outlines 文档](https://dottxt-ai.github.io/outlines/)（开源受限解码库，机制讲得最透）
- [XGrammar 论文](https://arxiv.org/abs/2411.15100)（vLLM 采用的高性能实现）
