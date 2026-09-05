---
title: AI / Agent 知识地图
date: 2026-09-05
tags: [路线图]
summary: AI/Agent 模块的知识体系与学习主线——写成一篇笔记，点亮一个链接。
---

这张地图是 AI / Agent 模块的知识体系：每个 h2 是一章，对应标签清单里的一个章级标签；章下面的小节是规划中的笔记主题。它既是组织结构，也是学习路线——主题在笔记写成之前只是纯文本，写成一篇，回这里点亮一个链接。

## 定位与主线

定位是**混合偏应用**：主线是做出可用的 RAG 与 Agent 应用，原理作为支线按需下钻。原则三步：先会用 → 能解释 → 遇到瓶颈再下钻。

依赖主线：

- **Python → RAG → Agent**：Python 速通后进入 RAG；检索是 Agent 最常用的工具，RAG 是 Agent 的前置
- **LLM 基础**是支线，穿插在调参与排错的过程里，不单独立期
- **评测与可观测**横切 RAG 和 Agent——没有评测的优化是玄学
- 主线以**项目实战**收尾；**微调**在主线之外，是后续的扩展方向

## Python 与 AI 工程

标签：`Python`。目标：以 AI 工程师的方式掌握 Python——会写、会组织工程、会把模型包成服务。

### 基础段：整体语法

会编程的人快速建立全貌，一篇篇小笔记过，不求深：

- 变量与基本类型，动态类型与鸭子类型，None 语义
- 四大容器：list / tuple / dict / set 与推导式
- 控制流与函数：参数传递、`*args` / `**kwargs`、lambda、作用域
- 类与 OOP：`__init__`、继承、dunder 方法
- 模块与包、异常处理、f-string、文件 IO

### 进阶段：工程习惯

- uv / venv / pyproject 工具链
- 类型注解：typing、Protocol、pyright
- dataclass 与 pydantic
- 装饰器、with 上下文管理器、生成器
- pytest 入门

### 工程段：服务化

嵌入 RAG 实战里学，现学现用，不单独立期：

- asyncio：事件循环、并发调用 LLM、限流
- pydantic 结构化校验（对接 LLM 结构化输出）
- FastAPI：依赖注入、SSE 流式
- numpy / pandas 会用级
- PyTorch 读懂级：加载模型跑通 demo

## LLM 基础（支线）

标签：`LLM基础`。按"调参、排错遇到什么补什么"推进，推理侧优先——这些是 RAG 与 Agent 调优天天碰的东西：

- 采样参数：temperature、top_p、max_tokens、stop
- 上下文窗口与 token 计算、截断策略
- KV cache 与量化速览：vLLM、Ollama
- 结构化输出的底层机制
- 训练侧只留一篇全景：预训练 → SFT → RLHF

## RAG

标签：`RAG`。基础管线是第一优先；评测紧随其后（见「评测与可观测」一章）；前沿专题列方向，不锁死。

### 基础管线

- chunking 策略：固定窗口、递归、语义切分
- embedding 选型：bge / m3e / OpenAI 的取舍
- 向量库选型：Chroma / Qdrant / pgvector
- 检索策略：hybrid（BM25 + 向量）、rerank 重排
- 生成侧：prompt 组装、引用溯源、幻觉缓解

### 前沿专题

- agentic RAG
- GraphRAG
- 长上下文 vs RAG
- 多模态 RAG

## Agent

三个标签：`Agent设计模式`、`工具调用/MCP`、`Agent框架`。路线是模式主线：先理解设计模式、手写最小循环，再深入一个框架——不先学框架，是让框架只解决它该解决的问题。

### 设计模式

- workflow vs agent 的边界
- 五个基础模式：prompt chaining、routing、并行、orchestrator-workers、evaluator-optimizer
- 手写最小工具循环（不用框架）
- 记忆与状态：短期 / 长期
- 多智能体：什么时候才值得

### 工具调用与 MCP

- function calling 规范
- MCP 协议：server / client
- 写一个自己的 MCP server

### 框架

- LangGraph：状态机模型、checkpointing、human-in-the-loop
- 对照阅读不开笔记：OpenAI Agents SDK、CrewAI

## 评测与可观测

标签：`评测与可观测`。横切章——RAG 和 Agent 的笔记会反复指回来：

- 评测先行原则
- RAGAS：faithfulness、answer relevancy、context 指标
- Agent evals：轨迹评估、LLM-as-judge 的坑
- Langfuse：trace 与成本统计

## 项目实战

标签：`项目实战`。每条主线以实战收尾；站上只记过程、踩坑与复盘，代码不放站上。

- 实战一 · 格致问答：语料就是本站 `content/` 的 Markdown，FastAPI 服务化 + 流式 + 引用溯源——RAG 收尾，Python 工程段在这里现学现用
- 实战二 · 工具 Agent：集成知识库检索与 MCP 工具的真实 Agent——Agent 收尾

## 微调（扩展方向）

标签：`微调`。主线之外：等真实需求出现再解锁，在那之前它只以"待学习"的灰组存在于路线图上。

- LoRA / QLoRA
- embedding 微调
- 数据集准备

## 进度点亮

- 地图里的规划主题一律先写纯文本；写成对应笔记后，回来把文本替换成互链，relbox 会自动把它收进"相关笔记"
- 每个章级标签：有笔记即点亮，没有就是栏目页里的灰色"待学习"组——标签清单本身就是路线图
