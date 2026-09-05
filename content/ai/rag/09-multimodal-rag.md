---
title: 多模态 RAG：图片与表格进知识库
date: 2026-09-05
tags: [RAG]
summary: 语料里最难的两种内容——图表和扫描件，纯文本管线全丢。三条路线：描述化、多模态 embedding、多模态直读，按预算与准确率要求选。
---

真实语料（PDF 报告、技术文档、扫描件）里，价值密度最高的往往是**图表和版式内容**——趋势图、架构图、表格、公式。纯文本管线在这一步就全丢了。多模态 RAG 解决"这些内容怎么进库、怎么被检索、怎么被引用"。

## 三条路线

**路线一：描述化（caption-based，默认起点）**

用多模态模型给每张图生成详尽文字描述，把描述文本当作 chunk 走常规文本 RAG：

```python title="caption-pipeline.py"
from openai import OpenAI
client = OpenAI()

def caption_image(image_b64: str) -> str:
    return client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": [
            {"type": "text", "text": "详尽描述这张图表：图表类型、坐标轴、"
             "数据趋势、关键数值、结论。供纯文本检索系统使用。"},
            {"type": "image_url", "image_url": {"url": image_b64}},
        ]}],
    ).choices[0].message.content
```

- 优点：底座就是普通 RAG，零架构改动；检索、引用、评测全复用
- 缺点：描述有损——细节数值、图表内部空间关系会丢；caption 质量决定上限
- 关键：caption 的 prompt 要为**检索场景**写（把图中实体名、数值、单位说全，方便字面命中 + 语义匹配）

**路线二：多模态 embedding（CLIP 类）**

图文共用一个向量空间，图片直接以图检索：

- 优点：不经文字转述，"找一张类似的架构图"这类查询天然支持
- 缺点：CLIP 类模型对长文本/精细语义弱，中文场景模型选择少；和文本 RAG 是两套检索体系，融合要自己做（RRF，见 [hybrid 检索](04-retrieval-and-rerank.md)）
- 适合：以图找图、素材库、PPT 检索；不适合：精确问答

**路线三：多模态直读（VLM 端到端）**

检索命中的 chunk 直接把**原图**给多模态 LLM（GPT-4o / Qwen-VL / Claude），模型自己读图作答：

```python title="vlm-answer.py"
messages = [{"role": "user", "content": [
    {"type": "text", "text": f"根据图表回答：{question}"},
    {"type": "image_url", "image_url": {"url": f"data:image/png;base64,{hit_image_b64}"}},
]}]
```

- 优点：无损——模型看的是原图
- 缺点：每次请求都要传图（token 贵、延迟高）；上下文窗口被图片 token 占用
- 姿势：路线一做检索（caption 文本便宜），命中后路线三做精读——**caption 找到它，VLM 读透它**，两层各干各的强项

## 落地顺序建议

1. **PDF 解析先行**：先把版式解出来（文本/表格/图片分区），工具如 markitdown、MinerU（中文文档友好）；解析质量是这一章所有路线的地基
2. 表格 → 转成 Markdown/描述文本（表格天然适合描述化）
3. 图片 → 路线一 caption 入库；查询明显是"找图"再补路线二
4. 高价值图表（报告核心图）→ 命中时用路线三精读

评测照旧：构造"问题 → 应命中的图表"的评测对，三条路线的改动都跑同一把尺子（见[评测先行](../evaluation/01-evaluation-first.md)）。

## 参考与延伸

- [multimodal RAG（LlamaIndex 示例）](https://docs.llamaindex.ai/en/stable/examples/multi_modal/)
- [MinerU（中文 PDF 解析开源项目）](https://github.com/opendatalab/MinerU)
