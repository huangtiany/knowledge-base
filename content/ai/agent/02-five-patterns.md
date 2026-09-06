---
title: 五个基础模式：可复用的 Agentic 结构
date: 2026-09-05
tags: [Agent设计模式]
summary: prompt chaining、routing、并行化、orchestrator-workers、evaluator-optimizer 五个模式覆盖绝大多数 LLM 应用的结构设计，成本与适用场景各不相同。
---

这五个模式出自 Anthropic《Building Effective Agents》，是用模型搭系统的经验总结。它们全是 **workflow**（控制流由开发者写死），可调试、可预测正来自这一点。看懂这五个，市面上大多数"XX Agent 框架"的架构图都能在其中找到对应结构。

## 1. Prompt Chaining（链式）：拆步骤，逐段过

把一个大任务拆成固定顺序的子任务，前一步输出作为后一步输入。生成文档 → 生成 → 核对格式 → 润色，每步一个简单调用。

- **适用**：任务能线性分解，中间步骤有明确"合格标准"
- **注意**：中间步骤加"程序化闸门"（校验，不通过就重试或终止），链条越长越要防错误传播
- **代价**：延迟线性叠加

## 2. Routing（路由）：先分类，再分流

一个廉价的分类调用，把输入分发给专门的下游处理（不同的 prompt、不同的模型、不同的业务函数）。

```python title="routing.py"
from pydantic import BaseModel
from typing import Literal

class Intent(BaseModel):
    kind: Literal["faq", "kb_search", "chitchat"]

def handle(user_input: str) -> str:
    intent: Intent = classify(user_input)        # 小模型 + 结构化输出，便宜
    match intent.kind:
        case "kb_search": return rag_pipeline(user_input)
        case "faq":       return faq_lookup(user_input)
        case _:           return small_talk(user_input)
```

- **适用**：输入类型混杂，混在一个 prompt 里互相干扰
- **价值**：下游各自简化（每条分支的 prompt 只管一种事）+ 成本优化（简单问题路由到小模型，见[上下文与成本](../llm-basics/02-context-window-and-tokens.md)）

## 3. Parallelization（并行）：分头做，汇总

互不依赖的子任务并发执行：多文档摘要、多种视角评审、批量打分。工程上就是 [asyncio 并发](../python/11-asyncio-concurrency.md) + LLM 调用。

- **适用**：子任务独立、可以同时跑
- **变体**：sectioning（拆分处理）与 voting（同一问题跑多次取多数或共识，提升单点可靠性，代价是 N 倍成本）

## 4. Orchestrator-Workers（编排者-执行者）：动态拆任务

一个"编排者"模型先看任务，**动态**决定拆成哪些子任务、分给哪些 worker，最后汇总。与 chaining 的区别：**拆法不预先写死**，由模型现场决定（每个 worker 做什么由 orchestrator 生成）。

- **适用**：子任务数量/内容事先不可知（"对这批文档，需要改哪里就派谁改哪里"）
- **边界**：拆解仍由模型决策，已接近真 Agent 的形态，控制不住时退回 chaining

## 5. Evaluator-Optimizer（评估者-优化者）：生成-评审-改进循环

一个模型生成，另一个（或同模型换视角）按明确标准评审并给反馈，循环到达标：

```python title="eval-loop.py"
for _ in range(max_rounds):
    draft = generate(task, feedback)            # 带上上轮反馈
    verdict = evaluate(draft, rubric)            # 明确评分标准
    if verdict.passed:
        return draft
    feedback = verdict.suggestions
```

- **适用**：存在**清晰可表达的评判标准**（格式规范、事实核对）
- **不适用**：标准模糊的品味问题，评审模型自己也说不清"哪里不好"，循环只会空转

## 怎么用这五个模式

五个模式**可以组合使用**：真实系统常是组合态（routing 分流后，kb_search 分支内部是 chaining，其并行步骤用 parallelization）。设计顺序：先画数据流草图，对每个节点问"这步能预先画出来吗"，能就是 workflow 模式，不能才考虑真 Agent（见 [workflow vs agent](01-workflow-vs-agent.md)）。

## 参考与延伸

- [Anthropic · Building Effective Agents](https://www.anthropic.com/research/building-effective-agents)（五个模式的原始出处，配图清晰）
- [datawhalechina/llm-cookbook（中文 · 吴恩达课程合集，含应用开发模式）](https://github.com/datawhalechina/llm-cookbook)
