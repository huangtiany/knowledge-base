---
title: Chunking 策略：切块决定检索上限
date: 2026-09-05
tags: [RAG]
summary: RAG 效果的上限在切块时就基本确定：chunk 切坏了，后面 embedding、检索、生成全在错误的输入上优化。
---

RAG 管线的第一步是把文档切成 chunk（块）。embedding 模型是给 chunk 做表示的，chunk 边界错了，语义就碎了，后面全链路都在错误的输入上优化。这也是"RAG 效果不好先查切块"的原因。

## 核心矛盾：检索与生成对 chunk 的要求不同

- **检索时**：chunk 要被 embedding 成向量，得**语义完整、自包含**，半句话的向量没有意义
- **生成时**：chunk 要作为上下文喂给模型，得**信息密度高、不重复**，太碎浪费窗口（见[上下文窗口](../llm-basics/02-context-window-and-tokens.md)），太长稀释重点

切块就是在"完整"和"密度"之间找平衡点，而且这个平衡点随语料类型变化。

## 切分策略：从最简单到最贵

**1. 固定大小切**：按字符/token 数硬切 + overlap 重叠。实现简单，只当基线。`overlap`（相邻块重叠 10-20%）是为了语义连续性，代价是存储翻倍和检索重复。

**2. 递归切分（recursive character splitting，事实上的默认选择）**：按分隔符层级递归，先按段落切，超长再按句子，再按字符。尽量保留自然边界。LangChain/LlamaIndex 的默认策略，**没有强理由时用这个**：

```python title="recursive-split.py"
from langchain_text_splitters import RecursiveCharacterTextSplitter

splitter = RecursiveCharacterTextSplitter(
    chunk_size=500,          # 目标长度（字符或 token，看实现）
    chunk_overlap=50,        # 重叠
    separators=["\n\n", "\n", "。", "，", ""],   # 中文注意加"。"，否则句子被硬切
)
chunks = splitter.split_text(long_text)
```

**3. 结构感知切**：Markdown 按标题层级、代码按函数边界、HTML 按 DOM。**优先用**：本站语料就是 Markdown，按 `##` 切天然语义完整。文档解析器（如 markitdown）+ 结构切分的组合，效果通常好于通用切分。

**4. 语义切分**：按句子算 embedding，相邻句相似度骤降处断开，"语义边界"就是话题转换处。效果好但要多跑一遍 embedding，成本高；默认档效果调不上去时再用。

## 中文语料的三个特别注意

- 分隔符列表里必须有中文标点（`。`、`；`），默认英文标点会把句子从中间切断
- 中文一个字 ≈ 1 token（见 [token 计算](../llm-basics/02-context-window-and-tokens.md)），chunk_size 按 token 定时直接用字数估
- 中文术语密度高，同样的 512 token，中文信息量大于英文，chunk 可以略小

## 标准解法：小块检索，大块生成（small-to-big）

这个矛盾的业界标准解法是**让两个用途解耦**：索引和检索用**小块**（语义聚焦，向量准），命中后喂给模型的却是它**所属的大块**（父章节、整节甚至整文档），向量精度和上下文完整性各取所需。

```python title="small-to-big.py"
# 索引：小块（子 chunk）建向量，元数据里存父块 id
# 检索：query 命中子 chunk → 按 parent_id 取回父块 → 喂给模型
```

[长上下文与 RAG](08-long-context-vs-rag.md)里"检索粒度放宽到文档"是这套思路的极端版：检索定位（准）+ 整节阅读（全）。几乎所有生产 RAG 都在这两个粒度之间取舍，纯"检索什么喂什么"反而是少数。

## 常见反模式

- **只按 chunk_size 硬切**：把"3.2.1 节标题"和它的正文切成两块，标题块的向量毫无意义 → 结构感知或加 overlap
- **表格被切散**：表格切碎后行列关系全丢 → 表格整块保留，或转成描述文本
- **元数据丢失**：切块后不记录来源文档/章节/页码 → 生成时的引用溯源（见[生成与引用](05-generation-and-citations.md)）没有数据可用

## 调优方法：先建评测集

切块参数（大小/overlap/策略）没有万能默认值，做法是固定一小批"问题→标准出处"评测对，换参数跑命中率。这是[评测先行](../evaluation/01-evaluation-first.md)在 RAG 里的第一个应用。

## 参考与延伸

- [LangChain · Text splitters](https://python.langchain.com/docs/concepts/text_splitters/)
- [Anthropic · Contextual Retrieval](https://www.anthropic.com/engineering/contextual-retrieval)（给每个 chunk 生成上下文前缀，切块领域的必读实践）
- [datawhalechina/llm-universe · 搭建知识库章节](https://github.com/datawhalechina/llm-universe)
