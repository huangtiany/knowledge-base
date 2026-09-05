---
title: 评测先行：没有评测的优化是玄学
date: 2026-09-05
tags: [评测与可观测]
summary: 换 embedding 掉点了还是升点了？新 prompt 更好了吗？没有一组固定评测对，这些问题永远靠感觉。评测先行的最小实践：50 个用例、三个指标、一次基线。
---

这是横切章的第一篇，也是整个体系的价值观声明：**在优化任何东西之前，先有能客观判断"变好还是变坏"的尺子**。RAG 调参、Agent 改 prompt、换模型、上 rerank——每一步的依据都应该是同一把尺子上的读数。

## 为什么"感觉变好了"不可信

- **选择性记忆**：新 prompt 跑了三个查询都更好，第四十个失败的你没注意
- **任务漂移**：这次测试用的查询和上次不同，对比无效
- **单点归因**：整体变好可能掩盖某类问题变差（中文好了，代码查询崩了）

评测集的作用是把"测试"从随意的点按变成**固定、可重复的回归测试**——对 RAG/Agent，它就是单元测试（见 [pytest](../python/10-pytest-basics.md) 之于普通代码）。

## 最小评测集：50 个用例起步

从真实/预期查询里攒：

```yaml title="eval-cases.yaml 结构示意"
# 一行 = 一个用例，三种类型都该有
- question: "向量检索的原理是什么"
  gold_doc: "rag/01-chunking-strategies"     # 应命中的出处（检索评测用）
  must_contain: ["向量", "相似度"]            # 答案必须包含的关键信息（生成评测用）
- question: "怎么申请退款"                     # 知识库没有的——负例
  expect_refusal: true
```

组成比例建议：**常规问题 60% + 边界/刁钻问题 25% + 应拒答负例 15%**。负例（库里没有的问题）尤其重要——它测的是"模型敢不敢说不知道"（见[生成与引用](../rag/05-generation-and-citations.md)）。

## 三层指标，对应三层失败

**1. 检索层**：hit@k（标准答案是否在 top-k 里）、MRR（标准答案排多前）。只测检索器，与生成无关——换 chunking/embedding/rerank 时看这里。

**2. 生成层（规则判定）**：must_contain 命中、引用编号合法、负例是否拒答。程序可判，零成本。

**3. 生成层（模型判定）**：faithfulness（答案是否忠于资料）、relevance（答没答到点上）——LLM-as-judge，标准工具是 RAGAS（见[下一篇](02-ragas.md)）。有噪声，要抽样人工校准。

```python title="eval-runner.py"
import json

def run_eval(cases: list[dict], pipeline) -> dict:
    results = {"hit@5": [], "must_contain": [], "refusal_ok": []}
    for c in cases:
        hits, answer = pipeline(c["question"])
        results["hit@5"].append(c["gold_doc"] in hits)
        if "must_contain" in c:
            results["must_contain"].append(
                all(kw in answer for kw in c["must_contain"]))
        if c.get("expect_refusal"):
            results["refusal_ok"].append(refused(answer))
    return {k: f"{sum(v) / len(v):.0%}" if v else "-" for k, v in results.items()}
```

## 工作流：基线 → 改动 → 回归

1. **先跑基线**：最朴素的流水线（固定切分 + 单路向量检索 + 直接生成）在全量评测集上的分数——这是之后所有改动的对照组
2. **每次只改一件事**：上 rerank、换 chunking、改 prompt 各自单独跑回归——同时改两件事，分数变化无法归因
3. **分数要入库**：每次评测结果（日期 + 改动 + 三层分数）记下来，效果趋势一目了然
4. **评测集持续长大**：线上每个真实失败案例，修完后沉淀成一个新评测用例——评测集就是你系统的"病历本"

## 与可观测的分工

评测回答"质量如何"（离线、事前），可观测回答"这次运行发生了什么"（在线、事后）——两者互补而非替代（见 [Langfuse](04-langfuse.md)）。

## 参考与延伸

- [Anthropic · Building Effective Agents](https://www.anthropic.com/research/building-effective-agents)（评测在 Agent 开发流程中的位置）
- [OpenAI · Evaluating abstractions](https://cookbook.openai.com/examples/evaluation)（OpenAI Cookbook 的评测方法系列）
