---
title: 采样参数：temperature、top_p 与 stop
date: 2026-09-05
tags: [LLM基础]
summary: 模型每一步输出的其实是一个概率分布——采样参数就是从分布里挑 token 的策略。调参调的不是玄学，是这个分布的形状。
---

RAG 和 Agent 调优天天碰这些参数，但很多人只知道"temperature 高了会更随机"。要真正会用，得先看一眼模型每一步在输出什么。

## 模型每一步输出的是分布

LLM 生成第 N 个 token 时，做的事是：对词表里**每个** token 打一个分（logit），softmax 成概率分布。比如下一步的概率可能是 `"检索"` 0.31、`"向量"` 0.22、`"是"` 0.10……采样参数决定**怎么从这个分布里挑出那一个 token**。

```python
completion = client.chat.completions.create(
    model="gpt-4o-mini",
    messages=[...],
    temperature=0.2,      # 采样策略
    top_p=1.0,
    max_tokens=1024,      # 硬上限
    stop=["\n\n"],        # 提前终止
    seed=42,              # 尽量可复现（不保证跨请求严格一致）
)
```

## temperature：分布的"锐度旋钮"

temperature $T$ 对 logits 除以 $T$ 再 softmax：

$$
P_i = \frac{\exp(z_i / T)}{\sum_j \exp(z_j / T)}
$$

- $T \to 0$：分布无限尖锐，几乎必然取最大概率 token（"贪心解码"）。API 惯例 `temperature=0` 就是这个近似——**但注意它仍是采样，不保证逐字节可复现**，浮点并行归约的非确定性还在
- $T = 1$：原始分布，模型训练时"认为"的自然分布
- $T > 1$：分布抹平，冷门 token 被放大，输出开始"发散"

实用直觉：**抽取/分类/代码 → 0~0.3**（要稳定）；**文案/头脑风暴 → 0.7~1.0**（要多样）；Agent 的工具调用环节压到 0~0.2（工具选择要果断）。

## top_p：按概率质量截断（nucleus sampling）

top_p 不看 token 数量，看**累计概率**：把 token 按概率降序排列，只从累计概率达到 p 的最小集合里采样。`top_p=0.9` 表示"只从贡献前 90% 概率质量的候选里挑"——候选数量是自适应的：分布尖锐时候选少，平坦时候选多。

**top_p 和 temperature 二选一调，别同时动**——它们都在改同一件事（截断分布），叠加调试会让你永远不知道是哪个参数起的作用。工程惯例：固定 `top_p=1`（或官方默认），只调 temperature。

## max_tokens 与 stop：硬性控制

- `max_tokens`：输出 token 硬上限。到了就截断，**截断的 JSON 解析必挂**（见[结构化输出](../python/12-pydantic-structured-output.md)的坑清单），结构化调用宁可放宽
- `stop`：遇到这些字符串就提前停。最实用的场景： few-shot 输出后用分隔符截断，防止模型"续写示例"

## 一个被高估、一个被低估

**被高估**：用 temperature 精确控制"创造力"。它只改采样分布，不改模型的"知识"——觉得输出平庸，先改 prompt（给例子、给标准），再考虑温度。

**被低估**：`seed` + `temperature=0` 做评测对比时的"尽力复现"；以及很多本地推理框架暴露的 `repeat_penalty`（惩罚重复 token）——长文本循环复读时的第一调试旋钮。

## 两个例外场景

**惩罚参数（presence / frequency penalty）**：对"已出现过的 token"降权（presence 只判有无，frequency 按出现次数加重），是 OpenAI 风格 API 里对抗复读的官方旋钮，等价于本地框架的 repeat_penalty。注意它们同样**只是采样期手段**——要模型"别翻来覆去说同一件事"，改 prompt 结构比加惩罚更治本。

**推理模型不吃这一套**：o1/R1 这类"先思考再作答"的模型，采样发生在内部推理与最终作答多个阶段，**API 层直接不接受（或忽略）temperature/top_p**——传了要么报错要么无效。用这类模型时把采样参数从调用代码里拿掉，控制"输出稳定性"的手段换成 prompt 约束。

## 参考与延伸

- [OpenAI 文档 · Temperature 与 top_p](https://platform.openai.com/docs/api-reference/chat/create)
- [HuggingFace · 如何生成文本（中文翻译）](https://huggingface.co/blog/zh/how-to-generate)
