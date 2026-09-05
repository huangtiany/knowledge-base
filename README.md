# 格致 · 个人知识库

纯展示型个人知识库：本地写 Markdown，push 即发布到 GitHub Pages。
产品设计见 `DESIGN.md`，技术选型见 `TECH-ARCHITECTURE.md`，开发计划见 `DEV-PLAN.md`。

- 线上地址：https://huangtiany.github.io/knowledge-base/
- RSS 订阅：https://huangtiany.github.io/knowledge-base/rss.xml
- 日常写作循环：**改 Markdown → `npm run dev` 预览 → 满意 → push → 一两分钟后线上更新**

## 常用命令

```bash
npm run dev       # 热更新预览（http://localhost:4321/knowledge-base/）
npm run build     # 本地完整构建 + 内容校验 + 全站死链检查（push 前自查用）
npm run preview   # 预览 dist 构建产物

node scripts/check-external-links.mjs   # 资源卡/roadmap 外链体检（CI 每周自动跑）
```

## 写作约定速查

### 文章 frontmatter（最小集）

```yaml
---
title: 从零理解 Attention
date: 2026-08-28        # 收藏/写作日期，列表按它倒序
tags: [LLM基础]          # 必填，只能从 content/tags.yaml 清单选
summary: Q、K、V 的直觉   # 可选；填了显示为栏目列表副标题，建议养成必填习惯
---
```

- 文章放 `content/ai/` 或 `content/stack/` 下任意子目录（目录只是文件整理，不承担分类），URL 由文件路径生成
- 文件名用英文短横线（如 `attention-notes.md`），中文标题只写在 frontmatter

### 标签规则

- **打标只从 `content/tags.yaml` 清单选**；清单外的标签会导致构建失败（CI 强制）
- 想用新标签：先加进 `content/tags.yaml`（对应领域的组）再使用
- 清单里还没有文章使用的标签 = "待学习"，栏目页显示灰色分组、首页显示虚线 chip——清单兼任学习路线图

### 内容约定

- AI 域的知识体系与学习主线见《AI / Agent 知识地图》：规划中的笔记先在地图里以纯文本占位，写成后回地图替换为互链

### 代码块（文件名 + 语言标签条）

````markdown
```python title="attention_demo.py"
print("hello")
```
````

语言决定高亮，`title` 显示为代码块顶栏左侧的文件名，右侧自动显示语言。

### 数学公式

- 行内：`$e^{i\pi} + 1 = 0$`
- 块级：

```markdown
$$
\mathrm{Attention}(Q,K,V) = \mathrm{softmax}\left(\frac{QK^T}{\sqrt{d_k}}\right)V
$$
```

构建期由 KaTeX 渲染成静态 HTML，页面零客户端 JS。

### 图片

- 与文章同目录 `img/` 存放，Markdown 相对引用：`![说明文字](img/xxx.png)`
- 说明文字会成为图片下方的 caption；移动文章目录时链接不断
- 建议压缩后再入库（构建时会自动转 webp 优化）

### 文内互链

标准 Markdown 相对链接，指向 `.md` 源文件，构建期自动改写为站点路由：

```markdown
[Embedding 模型选型速记](../rag/embedding-notes.md)
```

互链会自动收录进文章页底部的"相关笔记"盒子（附目标文章日期）。

### 资源卡

编辑 `content/ai/resources.yaml` 或 `content/stack/resources.yaml`：

```yaml
- title: Attention Is All You Need    # 必填
  url: https://arxiv.org/abs/1706.03762   # 必填
  summary: Transformer 开山论文。重点看 3.2 节。   # 必填，一句话摘要
  date: 2026-08-28                    # 必填，收藏日期，资源页按它倒序
  source: arxiv.org                   # 可选；不填自动从 url 提取域名
```

## 项目文档

| 文档 | 内容 |
|---|---|
| `DESIGN.md` | 产品设计：定位、页面清单、标签治理 |
| `TECH-ARCHITECTURE.md` | 技术架构：Astro + Content Collections + GitHub Pages |
| `DEV-PLAN.md` | 开发计划：M1–M5 里程碑、任务与验收清单 |
| `设计图/knowledge-base-design.html` | 视觉设计稿（页面实现的对照规范） |
