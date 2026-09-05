# 个人知识库网站 · 技术架构

> 版本：v1.0（2026-09-05）
> 状态：定稿。与 `DESIGN.md`（产品设计）并列的技术选型文档，记录全部技术决策共识。

## 核心决策总览

| 决策点 | 结论 |
|---|---|
| 建站路线 | 成熟 SSG，不自研渲染管线。网站是学习工具，不是练手项目 |
| 框架 | **Astro**（Content Collections + 零默认客户端 JS，内容站契合度最高） |
| 发布方式 | git push 即发布：push → GitHub Actions 构建 → GitHub Pages |
| 托管 | GitHub Pages（项目站，默认域名，暂不购买自定义域名） |
| 站内搜索 | 构建期生成"标题 + 正文纯文本"JSON，前端子串匹配；标题命中优先，正文命中附摘要高亮 |
| 仓库结构 | 单仓库：`content/` 与站点代码同仓同 push |
| 数学公式 | KaTeX（构建时渲染成静态 HTML，产物零 JS） |
| 代码高亮 | Shiki（构建时高亮，VS Code 同款引擎，内联样式） |
| 页面形态 | 多页站点，每页独立 URL，静态生成；设计稿的单页 hash 路由仅为预览手段 |
| 页面样式 | 忠实还原设计稿（`设计图/knowledge-base-design.html`） |
| 内容与代码 | 内容用 Markdown/YAML 存于 `content/`，展示逻辑在站点代码，互不渗透 |

## 发布链路

```
本地写 Markdown → npm run dev 预览（热更新）
→ git push main
→ GitHub Actions：astro build（含数据校验，不合法则构建失败、不发布）
→ 产物推 gh-pages 分支 → GitHub Pages 自动上线（约 1-2 分钟）
```

- CI 工作流：push 到 `main` 触发；`astro build` 内含 frontmatter / 标签清单 / 资源卡的全部 schema 校验
- 项目站 URL 带 `/knowledge-base/` 前缀，由 Astro `base` 配置处理；所有内部链接用相对路径，日后换域名或换托管零成本迁移
- 网站没有服务端、没有数据库、没有外部服务依赖（无评论、无统计、无第三方搜索服务）

## 内容仓库结构

```
content/
  tags.yaml              # 受控标签清单（全站唯一事实源）
  ai/                    # AI/Agent 栏目
    resources.yaml       # 该领域资源收藏卡
    llm-basics/
      attention-notes.md
      img/               # 文章图片就近存放，相对引用
    rag/
  stack/                 # 全栈开发 栏目
    resources.yaml
    language/
      java-generics.md
```

- **目录不是分类**：内容组织只靠标签；子目录纯粹是文件整理，可随时重组
- **图片**：与文章同目录 `img/`，Markdown 内相对引用（`![图](img/xxx.png)`），移动文章目录链接不断
- **URL**：由文件路径生成，如 `/knowledge-base/ai/llm-basics/attention-notes/`；slug 用文件名（英文短横线），中文标题不进 URL
- 栏目归属由目录决定（`ai/` 或 `stack/`），frontmatter 不重复写

## 写作约定

### 文章 frontmatter（最小集）

```yaml
---
title: 从零理解 Attention
date: 2026-08-28
tags: [LLM基础]          # 必填，只能从 tags.yaml 清单中选
summary: Q、K、V 的直觉，缩放点积为什么除以 √dk   # 可选；填了显示为栏目列表副标题，建议养成必填习惯
---
```

### 文内互链

标准 Markdown 相对链接（`[Transformer 结构拆解](../llm-basics/transformer.md)`），不引入 `[[wikilink]]` 自定义语法；任何编辑器原生可写可跳。构建期在页面层改写为目录式路由的**绝对 URL** 并校验目标存在（指向不存在的笔记 → 构建失败）——文章页是尾斜杠目录式 URL，浏览器解析相对链接的基准会比源文件目录多一层，保持相对链接在线上全部 404（v1 上线后实测发现，2026-09-05 定案改绝对路由）。

### 受控标签清单（tags.yaml）

- 按领域列出全部标签，含尚未有内容的"计划中"标签
- 构建时拿"清单全部标签"对减"文章实际使用的标签"：
  - **差集 → "待学习"态**：栏目页渲染灰色分组（"还没有内容——计划中"），首页门户渲染虚线灰 chip——标签清单兼任学习路线图
  - **文章打了清单外的标签 → 构建失败**：打标只从清单选的规则由 CI 强制执行
- 首页子主题门户由标签自动生成，零内容标签显示（虚线态），随内容生长

### 资源卡（resources.yaml）

每个领域一个文件，一张卡一条记录：

```yaml
- title: Attention Is All You Need    # 必填
  url: https://arxiv.org/abs/1706.03762   # 必填
  summary: Transformer 开山论文。重点看 3.2 节缩放点积的动机。  # 必填，一句话摘要
  date: 2026-08-28                    # 必填，收藏日期，资源页按它倒序
  source: arxiv.org                   # 可选；不填则从 url 自动提取域名
```

构建时校验，缺必填字段直接构建失败。

## Markdown 渲染管线

全部在构建期完成，浏览器拿到的即最终静态 HTML：

| 能力 | 方案 |
|---|---|
| 代码高亮 | Shiki（Astro 内置），构建时产出内联样式静态 HTML |
| 代码块标签条 | 自定义 rehype 插件，按设计稿包上"文件名 + 语言"顶栏 |
| 数学公式 | remark-math + rehype-katex，构建时渲染，零客户端 JS |
| 标题锚点 / TOC | rehype-slug 收集标题 id，构建期生成 TOC 数据 |
| 文章搜索 | 构建期生成全站 JSON（标题 + 正文纯文本），前端子串匹配（中文无需分词）；标题命中优先，正文命中附摘要高亮 |

## 页面与路由

多页静态生成，样式忠实还原设计稿：

| 页面 | 路由 |
|---|---|
| 首页 | `/` |
| 栏目页 | `/ai/`、`/stack/` |
| 资源收藏页 | `/ai/resources/`、`/stack/resources/` |
| 文章页 | `/ai/<目录路径>/<slug>/` 等 |
| About | `/about/` |
| 全站搜索 | 站内组件（标题 + 正文全文匹配），非独立页面 |

设计稿中的 `mockbar` 提示条与"空站模式"预览开关不进真实站点；空站状态作为真实状态自然呈现。

## 本地开发

- Node.js ≥ 22（本机已装 v22.x），Git 已装
- `npm run dev`：热更新预览；`npm run build`：本地完整构建 + 校验
- 日常写作循环：改 Markdown → dev 预览 → 满意 → push → 一两分钟后线上更新
