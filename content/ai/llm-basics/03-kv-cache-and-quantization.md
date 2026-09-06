---
title: KV cache 与量化速览：vLLM 与 Ollama
date: 2026-09-05
tags: [LLM基础]
summary: 推理为什么慢、显存去了哪、KV cache 怎么省重复计算、量化怎么把 7B 塞进小显存，以及 vLLM 和 Ollama 各自解决哪一层的问题。
---

自建推理（本地模型、私有化部署）绕不开两个概念：KV cache 和量化。这里不推导公式，只给出选型和排错所需的机制结论。

## 推理的两阶段：prefill 与 decode

LLM 生成一个 token，要把**所有已有 token** 都"看"一遍。于是推理分两段：

- **prefill（预填充）**：处理整个 prompt，一次性并行算完，决定**首 token 延迟**
- **decode（解码）**：逐个生成，决定**生成速度**（tokens/s）

两段都受限于显存带宽而非算力（memory-bound），这是后面所有优化的出发点。

## KV cache：用显存换时间

decode 每步都要对历史 token 做 attention。如果每步重算全部历史的 K、V 投影，生成 1000 token 就是 $O(n^2)$ 的浪费。**KV cache 把每个 token 的 K、V 缓存下来**，新 token 只算自己那一份，attention 直接查缓存。

代价是显存：KV cache 大小 ≈ 2（K 和 V）× 层数 × KV头数 × 头维度 × 序列长度 × 精度字节。7B 模型、8K 序列、fp16 的 KV cache 约 1~2 GB。**并发一多，KV cache 比模型权重还吃显存**。PagedAttention（vLLM 的核心优化）借鉴操作系统分页，把 KV cache 切成小块按需分配，显存利用率从"按最大长度预留"变成"按实际用量"，同样的卡并发翻倍。

**KV cache 也是 API 计费的"prompt cache"折扣的物理来源**：前缀相同 → KV cache 可复用 → 服务商给你打折。把稳定的 system prompt 放最前不只是上下文工程，也是省钱。

## 量化：用精度换显存

训练用 fp16（2 字节/参数）或 bf16，推理时把权重压到更低的位宽：

| 精度 | 字节/参数 | 7B 模型权重 | 质量 |
|---|---|---|---|
| fp16 | 2 | ~14 GB | 基准 |
| int8 | 1 | ~7 GB | 几乎无损 |
| int4 | 0.5 | ~3.5~4 GB | 通用任务轻微下降，多数场景可接受 |

主流方案两族：**GGUF**（llama.cpp 系，CPU/Mac 友好，Q4_K_M 等混合精度格式）和 **AWQ/GPTQ**（GPU 校准量化，配合 vLLM 服务化）。经验法则：**int8 放心用；int4 先跑评测再上线**（见[评测先行](../evaluation/01-evaluation-first.md)：量化是否降级，以评测结果为准，不靠感觉）。

## vLLM 与 Ollama：各在哪一层

```
模型权重 → 推理引擎（显存调度/采样/批处理） → API 服务
              ↑ vLLM 在这一层（生产级）           ↑ Ollama 是开箱即用的整合层
```

- **Ollama**：一行 `ollama run qwen2.5:7b` 拉起本地模型 + OpenAI 兼容 API。底层 llama.cpp，默认 GGUF 量化，面向**个人开发和演示**。开发期接本地模型的默认选择
- **vLLM**：PagedAttention + 连续批处理（continuous batching），吞吐是朴素部署的数倍到数十倍，OpenAI 兼容 API，面向**生产自建服务**

```bash
ollama run qwen2.5:7b                      # 本地开发：秒级启动
vllm serve Qwen/Qwen2.5-7B-Instruct \
  --quantization awq --max-model-len 8192   # 生产：量化 + 限长度
```

路径建议：开发用 Ollama，上量后同一套 OpenAI 兼容接口换 vLLM 部署，业务代码零改动。

## 参考与延伸

- [vLLM 官方文档](https://docs.vllm.ai/)
- [Ollama GitHub 仓库](https://github.com/ollama/ollama)
- [HuggingFace · Transformers（中文文档）· 量化](https://huggingface.co/docs/transformers/zh/quantization/overview)
