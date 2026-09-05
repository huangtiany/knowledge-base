---
title: uv 与 pyproject 工具链
date: 2026-09-05
tags: [Python]
summary: 用 uv 管虚拟环境、装依赖、跑脚本、锁版本——把 node_modules 级别的工程体验搬进 Python。
---

Python 工程第一课不是语法，是环境管理。历史上有 venv + pip + requirements.txt + pip-tools 一堆碎片，**uv**（Astral 出品，Rust 写的）把它们统一成了一个快到离谱的工具，2024 年后已成新项目事实标准。

## 为什么需要虚拟环境

Python 的第三方包装在"环境"里。没有环境隔离，所有项目共享一个全局 site-packages——A 项目要 pydantic 1.x、B 项目要 2.x 就死锁了。虚拟环境 = 每个项目一套独立的解释器视角和包目录。

Node 的 `node_modules` + `package.json` 就是同样的思想；uv 的定位相当于把 nvm + npm + package-lock + pipx 合成一个二进制。

## uv 核心工作流

```bash
# 初始化一个项目：生成 pyproject.toml + .python-version
uv init my-rag && cd my-rag

# 加依赖：自动创建虚拟环境 + 写入 pyproject + 生成 uv.lock
uv add openai pydantic fastapi

# 开发依赖
uv add --dev pytest ruff

# 跑任何命令：自动确保环境就绪
uv run python main.py
uv run pytest
uv run fastapi dev
```

三个文件各司其职：

- **`pyproject.toml`**——项目清单：名字、依赖声明（宽松范围）、工具配置。对标 `package.json`
- **`uv.lock`**——精确锁定的全部依赖版本，提交进 git。对标 `package-lock.json`，保证"你机器上能跑"等于"我机器上能跑"
- **`.venv/`**——虚拟环境目录，**加进 .gitignore**

pyproject.toml 是 PEP 621 标准，不绑定 uv——poetry/pip 都读它，uv 只是当下最快最省心的实现。

## 日常命令速查

```bash
uv add requests            # 装运行依赖
uv remove requests         # 卸载
uv lock --upgrade          # 升级锁定版本
uv python install 3.12     # 装/管理 Python 本体（连解释器都帮你管）
uv run script.py           # 跑脚本（自动同步环境）
uv tool install ruff       # 全局 CLI 工具（对标 pipx/npx）
uv pip install xxx         # 兼容模式：给当前环境裸装（快速实验用）
```

老项目只有 `requirements.txt`？`uv pip install -r requirements.txt` 直接兼容，不必强行迁移。

## 脚本的依赖自描述

单文件脚本可以用 PEP 723 内联声明依赖，uv 直接跑：

```python title="embed_demo.py"
# /// script
# dependencies = ["numpy", "openai"]
# ///
import numpy as np   # uv run embed_demo.py 自动装好依赖再执行
```

做一次性数据处理、验证小想法极其顺手——相当于自带 `npx`。

## 参考与延伸

- [uv 官方文档](https://docs.astral.sh/uv/)（英文，写得极好，Getting started 一小时可通读）
- [uv GitHub 仓库](https://github.com/astral-sh/uv)
