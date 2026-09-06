---
title: 部署与前端监控
date: 2026-09-06
tags: [工程化]
summary: 上线不是终点：静态托管的路由回退、多环境配置、CI 分层流水线，加上上线之后的眼睛——错误监控（Sentry + source map）与性能上报（web-vitals）。
---

构建产物从「本地能跑」到「线上稳定」之间隔着一套部署体系，上线之后还需要眼睛：**错误监控告诉你哪里坏了，性能上报告诉你有多慢**。这篇把交付链的最后一公里补齐——构建、测试的前置环节见[模块化与构建](01-modules-and-vite.md)与[测试](03-testing.md)，性能指标的语义见[性能优化](../performance/01-performance-metrics.md)。

## 静态站点的部署形态

```bash
# 产物即一切：dist/ 下的静态文件扔给任何静态服务
npm run build
```

| 托管 | 特点 | 适配 |
|---|---|---|
| GitHub Pages | 免费直连 git push，子路径（/repo/） | 本站这类项目站 |
| Vercel / Netlify | 预览环境（每个 PR 一个 URL）、边缘网络、serverless | Next/Nuxt 等元框架首选 |
| Nginx / 对象存储+CDN | 完全自控，国内访问友好 | 有运维能力时的通用解 |

SPA 上托管后必查的一件事是**路由回退**：直接访问 `/article/1`（或刷新）时服务器上没有这个文件，要回退到 `index.html` 交给前端路由接手——Netlify/Vercel 是默认行为，Nginx 写 `try_files $uri /index.html`，GitHub Pages 天然不支持（需 404.html 技巧或哈希路由）。本站 Astro 是多页静态生成（每个路由都有真文件），反而没有这个问题。

## 多环境与环境变量

```bash
# 约定：VITE_/PUBLIC_ 前缀的变量才会暴露给客户端代码
.env                # 所有环境共用
.env.development    # dev
.env.production     # build
.env.staging        # 自定义模式：vite build --mode staging
```

- 分界意识：**只有非敏感配置进前端变量**（API 地址、开关）——任何打进 bundle 的变量用户都能看到，密钥必须走服务端（BFF 或 [Nuxt server 目录](../vue/04-nuxt.md)）
- 预览环境（Vercel/Netlify 的 PR preview）是协作利器：每个 PR 自动部署一个临时 URL，产品和测试在合并前验真机效果

## CI 分层流水线

```yaml title=".github/workflows/ci.yml"
jobs:
  quality:        # 第一层：快、挡低级错误（每个 PR）
    steps: [pnpm lint, pnpm test -- --run, pnpm build]
  e2e:            # 第二层：慢、保关键路径（夜间或合并前）
    steps: [pnpm exec playwright test --shard=1/3]
```

- 分层原则与[测试金字塔](03-testing.md)一致：lint/单测/build 每次提交都跑（分钟级），E2E 分片或夜间跑
- 缓存三件套：pnpm store、Turborepo 远程缓存（见[Monorepo](04-monorepo.md)）、Playwright 浏览器二进制——CI 时长的大头都在安装上

## 错误监控：Sentry 与 source map

```ts title="sentry.ts"
import * as Sentry from "@sentry/vue";      // React 用 @sentry/react，同构 API

Sentry.init({
  dsn: SENTRY_DSN,
  release: BUILD_SHA,                       // 版本指纹：错误聚合与回溯的锚点
  integrations: [Sentry.browserTracingIntegration()],
});
```

- `window.onerror` 只能知道「炸了」，Sentry 这类平台补上的是：**堆栈还原（source map）、影响面聚合（多少用户/哪个版本/哪条路径）、面包屑（出错前的点击与请求序列）**
- **source map 是关键一环**：线上跑的是压缩产物，堆栈是 `app.8f2c.min.js:1:88421`；把构建生成的 `.map` 上传到平台（并**不要部署到线上**）后还原成源码行号——上传一般挂在 CI 构建步骤里，配合 release 版本关联
- 监控的边界：SDK 本身有开销，采样率（`tracesSampleRate`）按流量调；脚本加载失败、SDK 未初始化前的错误，用 `window.onerror` 兜底上报一行

## 性能与行为上报

```ts title="vitals.ts"
import { onLCP, onINP, onCLS } from "web-vitals";

onLCP(sendToAnalytics);   // 指标语义见性能篇；现场数据比实验室数据更真
onINP(sendToAnalytics);
onCLS(sendToAnalytics);
```

- 现场数据（RUM）与实验室数据（Lighthouse）互补：Lighthouse 可复现、给优化线索；RUM 回答「真实用户的分布」——P75 在哪个机型/网络段烂掉
- 行为埋点的两种形态：**代码埋点**（精确、侵入）与**无埋点/可视化埋点**（全量采集、靠配置圈选），中小项目从代码埋点关键事件起步即可
- 闭环意识：上报 → 看板 → 告警阈值（错误率突增、P75 越线）→ 回归。监控没有消费动作就是装了个摆设

## 小结

交付链收拢成四件事：**托管选对形态**（SPA 查回退，静态最省心）、**环境变量分清密与明**、**CI 分层**（快检查每 PR、重测试定时跑）、**上线装眼睛**（错误 + 性能，配 source map 才看得见行号）。前端的完整工程链——从模块化到监控——至此闭环。
