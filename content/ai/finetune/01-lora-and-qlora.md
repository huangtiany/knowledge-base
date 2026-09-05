---
title: LoRA / QLoRA：微调的工程形态
date: 2026-09-05
tags: [微调]
summary: 全参微调 7B 要 A100，LoRA 只要 24G 消费卡——冻结原权重只训低秩增量，这个思路撑起了开源模型微调的整个生态。
---

[训练侧全景](../llm-basics/05-pretraining-to-rlhf.md)说过：微调改行为不改知识。这篇讲微调在工程上的主流形态 LoRA/QLoRA——为什么它们把微调的门槛从"数据中心"降到了"一张消费级显卡"。

## 全参微调贵在哪

全参微调（full fine-tuning）要为**每个参数**存：权重梯度、优化器动量/方差（Adam 是两份 fp32）。7B 模型 fp16 权重 14 GB，加上梯度和优化器状态约 ×4，还要留激活值——一张 80G A100 都紧张。而关键观察是：**下游任务通常不需要改这么多参数**。

## LoRA：低秩增量的思想

LoRA（Low-Rank Adaptation）的假设：微调引起的权重变化矩阵 $\Delta W$ 是**低秩**的，可以被分解成两个小矩阵的乘积：

$$
W' = W_0 + \Delta W = W_0 + B A, \quad B \in \mathbb{R}^{d \times r},\ A \in \mathbb{R}^{r \times k},\ r \ll \min(d, k)
$$

- 冻结原权重 $W_0$，只训练 $A$、$B$（$r$ 通常取 8~64）
- 可训练参数量降 100~1000 倍：7B 模型 LoRA 增量可能只有几十 MB
- 显存大头只剩权重本体 + 激活，**24G 卡微调 7B** 成为可能
- 推理时 $BA$ 可**合并回** $W_0$（零额外延迟），或保留为可插拔的 adapter（一个底座挂多个任务头）

```python title="lora-peft.py"
from peft import LoraConfig, get_peft_model
from transformers import AutoModelForCausalLM

model = AutoModelForCausalLM.from_pretrained("Qwen/Qwen2.5-7B-Instruct")
lora = LoraConfig(
    r=16, lora_alpha=32,                    # 缩放系数，常取 2r
    target_modules=["q_proj", "v_proj"],    # 只给注意力层的 Q/V 挂 adapter
    lora_dropout=0.05,
)
model = get_peft_model(model, lora)
model.print_trainable_parameters()
# trainable params: ~0.5% —— 7B 里只有 ~40M 参数在学
```

## QLoRA：再压一档

QLoRA = **底座量化到 4bit（NF4）+ LoRA 增量保持 bf16 训练**。7B 底座从 14GB 压到 ~4GB，增量照常训练——**单张 24G 卡微调 33B 级模型**成为可能。代价：量化底座带来轻微质量损失 + 训练更慢（反量化开销）。QLoRA 论文的实验显示与 16bit LoRA 效果几乎持平，因此成为消费级硬件微调的默认选择。

工具选型：**入门用 unsloth**（单卡优化 + 显存省 50%，notebook 式教程友好）；**批量实验用 axolotl**（YAML 配置驱动的多任务训练）；**深度控制用 HF TRL + PEFT 手写**。三者的 README 都比教程文档更新得快，以仓库为准。

## 决策清单：微调前先过一遍

1. **问题能用 prompt 解决吗**：few-shot + 结构化输出（见[结构化输出](../llm-basics/04-structured-output-internals.md)）能解决的不微调——微调是重投入，且一旦改行为就是改"脾气"
2. **要改的是知识还是行为**：新事实/新文档 → RAG（见[RAG 章](../rag/01-chunking-strategies.md)）；固定格式、风格、领域话术、稳定流程 → 微调
3. **有几百条以上高质量样本吗**：数据少于百条，收益大概率盖不住过拟合风险（数据准备见[数据集准备](02-dataset-preparation.md)）
4. **评测基线建好了吗**：微调前后跑同一把尺子（见[评测先行](../evaluation/01-evaluation-first.md)），否则"感觉变好"无从验证

## 参考与延伸

- [PEFT 文档（LoRA 官方实现）](https://huggingface.co/docs/peft)
- [LoRA 论文](https://arxiv.org/abs/2106.09685)
- [Unsloth 仓库](https://github.com/unslothai/unsloth)
- [datawhalechina/self-llm（中文 · 开源大模型微调全流程）](https://github.com/datawhalechina/self-llm)
