---
title: 生成侧：Prompt 组装、引用溯源与幻觉缓解
date: 2026-09-05
tags: [RAG]
summary: 检索只是半场，生成侧决定用户看到什么——上下文怎么摆、引用怎么标、"没找到就说没找到"怎么写进 prompt。
---

检索到了好的 chunk，生成侧做错三件事照样翻车：上下文摆放失当、没有引用机制、prompt 不允许模型说"不知道"。这篇收 RAG 管线的最后一棒。

## Prompt 组装：位置就是权重

上次实验结论（lost in the middle，见[上下文窗口](../llm-basics/02-context-window-and-tokens.md)）：模型对**首尾**内容利用率最高。组装模板据此设计：

```python title="assemble.py"
def build_prompt(question: str, hits: list[dict]) -> str:
    context = "\n\n".join(
        f"[{i+1}] (来源: {h['source']})\n{h['text']}"
        for i, h in enumerate(hits)
    )
    return f"""基于以下资料回答问题。

资料（每段开头 [n] 是引用编号，回答时必须标注）：
{context}

规则：
1. 只依据上面的资料回答；资料不足以回答时，明确说"资料中没有相关信息"。
2. 每个关键结论后标注引用编号，如 [2]。
3. 不要编造资料中不存在的内容。

问题：{question}"""
```

三个设计点：编号先行（生成时才能标 `[n]`）、**规则声明禁止编造并给出"不知道"的出路**、问题放最尾（紧贴生成位置）。检索结果多时，把 rerank 分数最高的放最后。

## 引用溯源：让每个字有出处

引用不是"显得可信"的装饰，是**可验证性**的工程实现，也是排查错误检索的调试入口：

```python title="citation.py"
class Cite(BaseModel):
    ref: int = Field(description="引用的资料编号")
    quote: str = Field(description="支撑该句的原文字句，逐字引用")

class Answer(BaseModel):
    answer: str
    citations: list[Cite]

def verify_citations(ans: Answer, hits: list[dict]) -> Answer:
    """后验校验：引用编号是否真实存在、quote 是否真在原文里（防引用幻觉）"""
    valid = {i + 1: h["text"] for i, h in enumerate(hits)}
    ok = [c for c in ans.citations
          if c.ref in valid and fuzzy_contains(c.quote, valid[c.ref])]
    return ans.model_copy(update={"citations": ok})
```

两级引用架构的取舍：**段落级引用**（标 chunk 编号）简单可靠，是默认；**句子级引用**（quote 逐字对应原文）可信度更高但要后验校验 + 重试，成本上去一截。落地顺序：先段落级，用户反馈"不敢信"再升级。

## 幻觉缓解：三道防线

幻觉 = 模型输出了资料里没有/与资料矛盾的内容。防线按层：

1. **prompt 层**：显式授权"可以说不知道"——不给出路，模型就自己编一条。上面的模板规则 1 是必写项
2. **生成参数层**：抽取/引用场景 `temperature` 压到 0~0.3（见[采样参数](../llm-basics/01-sampling-parameters.md)）
3. **校验层**：生成后机器校验——引用编号存在性、quote 对原文的包含性、必要时让另一个 LLM 当裁判比对答案与资料（faithfulness 评测，见 [RAGAS](../evaluation/02-ragas.md)）

**根因排查优先于防线堆叠**：答案错时先问"是不是检索没找对"（hit 不中）还是"检索对了但生成歪了"（生成层幻觉）——两者的药方完全不同。这正是评测要把 retrieval 和 generation 分开测的原因。

## 参考与延伸

- [Anthropic · Contextual Retrieval](https://www.anthropic.com/engineering/contextual-retrieval)（引用与上下文增强的组合实践）
- [datawhalechina/llm-universe · 搭建 RAG 应用章节](https://github.com/datawhalechina/llm-universe)
