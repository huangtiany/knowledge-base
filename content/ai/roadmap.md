---
title: AI / Agent 知识地图
date: 2026-09-05
tags: [路线图]
summary: AI/Agent 模块的知识体系与学习主线：每个主题对应一篇笔记，每章末尾附本章资源。
related: false
---

这张地图是 AI / Agent 模块的知识体系：每个 h2 是一章，对应标签清单里的一个章级标签；章下面的小节是笔记主题，全部已写成互链（除了项目实战两篇，等真实进展后补写）。它既是目录，也是学习路线，按主线顺序读即可。

## 定位与主线

定位是**混合偏应用**：主线是做出可用的 RAG 与 Agent 应用，原理作为支线按需下钻。原则三步：先会用 → 能解释 → 遇到瓶颈再下钻。

依赖主线：

- **Python → RAG → Agent**：Python 速通后进入 RAG；检索是 Agent 最常用的工具，RAG 是 Agent 的前置
- **LLM 基础**是支线，穿插在调参与排错的过程里，不单独立期
- **评测与可观测**横切 RAG 和 Agent：没有评测，优化效果无从验证
- 主线以**项目实战**收尾；**微调**在主线之外，是后续的扩展方向

## Python 与 AI 工程

标签：`Python`。目标：像 AI 工程师一样掌握 Python，会写、会组织工程、会把模型包成服务。

### 基础段：整体语法

- [变量、基本类型与 None](python/01-syntax-and-types.md)
- [四大容器与推导式](python/02-containers-and-comprehensions.md)
- [函数、参数与作用域](python/03-functions-and-scope.md)
- [类与 OOP：__init__、继承与 dunder 方法](python/04-classes-and-dunder.md)
- [模块与包、异常处理、f-string 与文件 IO](python/05-modules-errors-io.md)

### 进阶段：工程习惯

- [uv 与 pyproject 工具链](python/06-uv-and-pyproject.md)
- [类型注解：typing、Protocol 与 pyright](python/07-type-annotations.md)
- [dataclass 与 pydantic](python/08-dataclass-and-pydantic.md)
- [装饰器、with 与生成器](python/09-decorators-context-generators.md)
- [pytest 入门](python/10-pytest-basics.md)

### 工程段：服务化

嵌入 RAG 实战里学，现学现用：

- [asyncio：并发调用 LLM 的刚需](python/11-asyncio-concurrency.md)
- [pydantic 对接 LLM 结构化输出](python/12-pydantic-structured-output.md)
- [FastAPI：依赖注入与 SSE 流式](python/13-fastapi-service.md)
- [numpy / pandas 会用级](python/14-numpy-pandas-essentials.md)
- [PyTorch 读懂级：加载模型跑通 demo](python/15-pytorch-read-level.md)

### 本章资源

- [Python 官方教程（中文）](https://docs.python.org/zh-cn/3/tutorial/) —— 基础段根据地
- [Python-100-Days](https://github.com/jackfrued/Python-100-Days) —— 中文系统教程，查漏
- [uv 官方文档](https://docs.astral.sh/uv/) —— 工具链
- [mypy 文档](https://mypy.readthedocs.io/) —— 类型检查
- [pytest-chinese-doc](https://github.com/luizyao/pytest-chinese-doc) —— 中文 pytest 手册
- [pydantic 文档](https://docs.pydantic.dev/) —— 校验中枢
- [FastAPI 官方文档（中文）](https://fastapi.tiangolo.com/zh/) —— 服务化
- [NumPy 官方文档](https://numpy.org/doc/stable/) —— 向量运算
- [joyful-pandas](https://github.com/datawhalechina/joyful-pandas) —— pandas 中文教程
- [Thorough-Pytorch](https://github.com/datawhalechina/thorough-pytorch) —— PyTorch 中文教程
- [HuggingFace Transformers 文档（中文）](https://huggingface.co/docs/transformers/zh) —— 模型库

## LLM 基础（支线）

标签：`LLM基础`。按"调参、排错遇到什么补什么"推进，推理侧优先：

- [采样参数：temperature、top_p 与 stop](llm-basics/01-sampling-parameters.md)
- [上下文窗口与 token 计算](llm-basics/02-context-window-and-tokens.md)
- [KV cache 与量化速览：vLLM 与 Ollama](llm-basics/03-kv-cache-and-quantization.md)
- [结构化输出的底层机制](llm-basics/04-structured-output-internals.md)
- [训练侧全景：预训练 → SFT → RLHF](llm-basics/05-pretraining-to-rlhf.md)

### 本章资源

- [HuggingFace Transformers 文档（中文）](https://huggingface.co/docs/transformers/zh) —— tokenizer/量化/Trainer
- [vLLM 官方文档](https://docs.vllm.ai/) —— 生产推理
- [Ollama](https://github.com/ollama/ollama) —— 本地模型
- [OpenAI · Structured Outputs](https://platform.openai.com/docs/guides/structured-outputs) —— 受限解码
- [happy-llm](https://github.com/datawhalechina/happy-llm) —— 中文从零构建
- [llm-course](https://github.com/mlabonne/llm-course) —— 英文全景路线
- [Karpathy · Zero to Hero](https://karpathy.ai/zero-to-hero.html) —— 必读视频课

## RAG

标签：`RAG`。基础管线第一优先，评测紧随其后，前沿专题按需取用。

### 基础管线

- [Chunking 策略：切块决定检索上限](rag/01-chunking-strategies.md)
- [Embedding 模型选型](rag/02-embedding-selection.md)
- [向量库选型：Chroma / Qdrant / pgvector](rag/03-vector-db-selection.md)
- [检索策略：hybrid 检索与重排](rag/04-retrieval-and-rerank.md)
- [生成侧：Prompt 组装、引用溯源与幻觉缓解](rag/05-generation-and-citations.md)

### 前沿专题

- [Agentic RAG：检索作为工具](rag/06-agentic-rag.md)
- [GraphRAG：知识图谱补向量检索的短板](rag/07-graphrag.md)
- [长上下文 vs RAG](rag/08-long-context-vs-rag.md)
- [多模态 RAG：图片与表格进知识库](rag/09-multimodal-rag.md)

### 本章资源

- [llm-universe](https://github.com/datawhalechina/llm-universe) —— 中文动手教程
- [FlagEmbedding（bge）](https://github.com/FlagOpen/FlagEmbedding) —— embedding/reranker
- [Qdrant 文档](https://qdrant.tech/documentation/) —— 生产向量库
- [Chroma 文档](https://docs.trychroma.com/) —— 零部署向量库
- [LlamaIndex 文档](https://docs.llamaindex.ai/) —— RAG 生态最全
- [Anthropic · Contextual Retrieval](https://www.anthropic.com/engineering/contextual-retrieval) —— 必读实践

## Agent

三个标签：`Agent设计模式`、`工具调用/MCP`、`Agent框架`。路线是模式主线：先理解设计模式、手写最小循环，再深入一个框架。

### 设计模式

- [Workflow vs Agent：边界与选择](agent/01-workflow-vs-agent.md)
- [五个基础模式：可复用的 Agentic 结构](agent/02-five-patterns.md)
- [手写最小 Agent 循环（不用框架）](agent/03-minimal-agent-loop.md)
- [记忆与状态：短期、长期与共享状态](agent/04-memory-and-state.md)
- [多智能体：什么时候才值得](agent/05-multi-agent.md)

### 工具调用与 MCP

- [Function Calling：模型与工具的标准接口](agent/06-function-calling.md)
- [MCP 协议：工具接入的 USB-C](agent/07-mcp-protocol.md)
- [实战：写一个自己的 MCP Server](agent/08-build-mcp-server.md)

### 框架

- [LangGraph：状态机模型](agent/09-langgraph.md)
- 对照阅读不开笔记：OpenAI Agents SDK、CrewAI

### 本章资源

- [Anthropic · Building Effective Agents](https://www.anthropic.com/research/building-effective-agents) —— 章总纲
- [Agent-Learning-Hub](https://github.com/datawhalechina/Agent-Learning-Hub) —— 中文路线图
- [LangGraph 官方文档](https://langchain-ai.github.io/langgraph/) —— 深入框架
- [LangChain 中文站 · LangGraph](https://github.langchain.ac.cn/langgraph/) —— 中文镜像
- [easy-langent](https://github.com/datawhalechina/easy-langent) —— 中文实战
- [MCP 官方文档](https://modelcontextprotocol.io) —— 协议权威
- [mcp-for-beginners（中文）](https://github.com/microsoft/mcp-for-beginners) —— 微软课程
- [modelcontextprotocol/servers](https://github.com/modelcontextprotocol/servers) —— 官方 Server 合集
- [awesome-mcp-servers（中文版）](https://github.com/punkpeye/awesome-mcp-servers) —— Server 清单

## Agent 生态（热门项目）

标签：`Agent生态`。看别人怎么做 Agent：先有[设计模式](agent/01-workflow-vs-agent.md)与[手写循环](agent/03-minimal-agent-loop.md)的底子，再拆热门项目：

- [Agent 生态全景：产品、框架与平台](agents/01-agent-landscape.md)
- [编程 Agent：OpenHands、SWE-agent、Aider 与 Cline](agents/02-coding-agents.md)
- [通用与计算机操作 Agent：Manus、Open Interpreter 与 browser-use](agents/03-computer-use-agents.md)
- [多智能体应用：MetaGPT 与 ChatDev](agents/04-multi-agent-apps.md)
- [平台与低代码：Dify、Coze Studio、FastGPT 与 n8n](agents/05-agent-platforms.md)
- [CLI 编程 Agent 浪潮：Claude Code、Codex、OpenCode、pi 与 Grok Build](agents/06-cli-agents.md)

### 本章资源

- [OpenHands](https://github.com/All-Hands-AI/OpenHands) —— 编程 Agent 顶流
- [SWE-agent](https://github.com/SWE-agent/SWE-agent) —— 工具接口研究
- [Aider](https://github.com/Aider-AI/aider) —— 终端结对编程
- [Cline](https://github.com/cline/cline) —— IDE 内 Agent
- [Codex CLI](https://github.com/openai/codex) —— OpenAI 官方开源外壳
- [OpenCode](https://github.com/anomalyco/opencode) —— 供应商中立旗手
- [Pi Agent Harness](https://github.com/earendil-works/pi) —— 极简 harness 标本
- [Grok Build](https://github.com/xai-org/grok-build) —— xAI 官方（Rust）
- [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) —— 一切皆插件
- [Open Interpreter](https://github.com/OpenInterpreter/open-interpreter) —— 代码即动作
- [browser-use](https://github.com/browser-use/browser-use) —— 浏览器 Agent 库
- [OpenManus](https://github.com/FoundationAgents/OpenManus) —— Manus 开源复现
- [MetaGPT](https://github.com/FoundationAgents/MetaGPT) —— 多智能体软件公司
- [ChatDev](https://github.com/OpenBMB/ChatDev) —— 轻量多智能体标本
- [gpt-researcher](https://github.com/assafelovic/gpt-researcher) —— 深度研究 Agent
- [Dify](https://github.com/langgenius/dify) —— 开源 LLMOps 平台
- [Coze Studio](https://github.com/coze-dev/coze-studio) —— 扣子开源版
- [FastGPT](https://github.com/labring/FastGPT) —— 中文知识库问答
- [n8n](https://github.com/n8n-io/n8n) —— 自动化工作流

## 评测与可观测

标签：`评测与可观测`。此章横切 RAG 和 Agent，两边的笔记会反复指回来：

- [评测先行：用评测驱动优化](evaluation/01-evaluation-first.md)
- [RAGAS：RAG 评测的标准指标](evaluation/02-ragas.md)
- [Agent evals：轨迹评估与 LLM-as-judge 的坑](evaluation/03-agent-evals.md)
- [Langfuse：Trace 与成本统计](evaluation/04-langfuse.md)

### 本章资源

- [RAGAS 文档](https://docs.ragas.io/) —— RAG 评测指标
- [DeepEval](https://github.com/confident-ai/deepeval) —— pytest 风格评测
- [Langfuse 文档](https://langfuse.com/docs) —— 开源可观测
- [LangSmith 文档](https://docs.smith.langchain.com/) —— LangGraph 深度集成
- [OpenAI Cookbook](https://cookbook.openai.com/) —— 官方最佳实践

## 项目实战

标签：`项目实战`。每条主线以实战收尾；站上只记过程、踩坑与复盘，代码不放站上。**实战两篇留待真实进展后补写**：

- 实战一 · 格致问答：语料就是本站 `content/` 的 Markdown，FastAPI 服务化 + 流式 + 引用溯源，作为 RAG 收尾；Python 工程段在这里现学现用
- 实战二 · 工具 Agent：集成知识库检索与 MCP 工具的真实 Agent，作为 Agent 收尾

## 微调（扩展方向）

标签：`微调`。主线之外：参考资料已备齐，等真实需求出现再动手。

- [LoRA / QLoRA：微调的工程形态](finetune/01-lora-and-qlora.md)
- [Embedding 微调：检索领域的定制化](finetune/02-embedding-finetuning.md)
- [微调数据集准备](finetune/03-dataset-preparation.md)

### 本章资源

- [PEFT 文档](https://huggingface.co/docs/peft) —— LoRA 官方实现
- [HuggingFace TRL 文档](https://huggingface.co/docs/trl) —— 训练器全家桶
- [Unsloth](https://github.com/unslothai/unsloth) —— 单卡微调首选
- [axolotl](https://github.com/axolotl-ai-cloud/axolotl) —— 批量实验
- [LoRA 论文](https://arxiv.org/abs/2106.09685) —— 原始推导
- [self-llm](https://github.com/datawhalechina/self-llm) —— 中文微调全流程

## 进度点亮

- 地图上的主题已全部成文互链；唯一例外是实战两篇，等项目真实推进后写成笔记，回这里替换纯文本为互链
- 每个章级标签：有笔记即点亮；目前唯一保持灰色「待学习」的标签是 `项目实战`
- 每章末尾的「本章资源」与资源收藏页同源：卡片收在 `content/ai/resources.yaml`，地图只做学习视角的精选
