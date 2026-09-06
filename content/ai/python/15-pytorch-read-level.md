---
title: PyTorch 读懂级：加载模型跑通 demo
date: 2026-09-05
tags: [Python]
summary: 目标不是训练模型，而是读懂微调/embedding 代码、跑通推理 demo：需要 tensor、autograd 概念、Module 和 save/load 四块。
---

应用工程师对 PyTorch 的需求是**读懂级**：看懂微调脚本在做什么、能把 HuggingFace 模型加载下来跑推理、知道显存消耗在哪。不需要推导反向传播。本文覆盖这四块。

## tensor：带 GPU 和梯度的一维/多维数组

```python title="tensor.py"
import torch

v = torch.randn(3, 1024)              # 和 numpy 的用法几乎一致
v.shape                               # torch.Size([3, 1024])
v @ v.T                               # 矩阵乘，运算符都同 numpy

w = torch.randn(3, 1024, requires_grad=True)   # 声明"这个张量要求梯度"
device = "cuda" if torch.cuda.is_available() else "cpu"
w_gpu = w.to(device)                  # 数据显式搬上 GPU
```

tensor = numpy 数组 + 两项额外能力：`device`（数据在 CPU/GPU 哪里，要手动 `.to()` 搬运）和 `requires_grad`（自动求导引擎的开关）。读代码时看到 `.to("cuda")`、`.cpu()` 都是在设备间搬数据。

## autograd：只需要知道这一件事

训练 = 前向算损失 → 反向算梯度 → 优化器更新参数。autograd 把反向这一步全自动了：

```python title="autograd.py"
w = torch.tensor([1.0], requires_grad=True)
loss = (w * 3).sum()      # 前向：记录计算图
loss.backward()           # 反向：w.grad 自动算好
print(w.grad)             # tensor([3.])
```

`loss.backward()` 一行背后是链式法则遍历计算图。**读微调代码时只要识别三段式**：`forward → loss.backward() → optimizer.step()`，剩下的都是工程细节（梯度累积、裁剪、调度器）。

## Module 与 HuggingFace：加载一个真模型

```python title="load-model.py"
from transformers import AutoModel, AutoTokenizer   # HF 库，PyTorch 之上的模型层

name = "BAAI/bge-large-zh-v1.5"
tok = AutoTokenizer.from_pretrained(name)            # 分词器
model = AutoModel.from_pretrained(name).eval()       # 模型权重 + 结构，eval() 关训练态

texts = ["向量检索的原理", "Embedding 模型选型"]
batch = tok(texts, padding=True, truncation=True, return_tensors="pt")
batch = {k: v.to(model.device) for k, v in batch.items()}

with torch.no_grad():                                # 推理不需要梯度，省显存
    out = model(**batch)
emb = out.last_hidden_state[:, 0]                    # [CLS] 位置的向量作为句向量
print(emb.shape)                                     # torch.Size([2, 1024])
```

这段就是"读懂级"的样板：`from_pretrained` 下载并加载权重、`tok(...)` 文本变张量、`model(**batch)` 前向、`no_grad` 推理态。微调脚本 = 这段 + 三段式训练循环 + 保存。

## save / load 与显存速算

```python title="io.py"
torch.save(model.state_dict(), "model.pt")     # 存参数（推荐只存 state_dict）
model.load_state_dict(torch.load("model.pt"))  # 读参数
```

显存粗估（读代码时判断显存是否够用）：模型加载显存 ≈ 参数量 × 每参字节数。7B 模型 fp16 ≈ 14 GB，int4 量化 ≈ 4 GB，这就是量化的作用（见 [KV cache 与量化速览](../llm-basics/03-kv-cache-and-quantization.md)）。训练再叠加梯度和优化器状态（fp16 训练约 ×4），所以 7B 全参微调要 A100 级，LoRA 微调一张 24G 卡即可（见 [LoRA / QLoRA](../finetune/01-lora-and-qlora.md)）。

## 参考与延伸

- [Thorough-Pytorch（Datawhale 中文教程）](https://github.com/datawhalechina/thorough-pytorch)
- [PyTorch 官方 Tutorials](https://pytorch.org/tutorials/)（看 "PyTorch 101" 与 "Introduction to PyTorch" 即可）
