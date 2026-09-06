---
title: 性能优化：Core Web Vitals 与优化手段
date: 2026-09-06
tags: [性能优化]
summary: 性能优化的第一步是度量不是瞎猜：LCP/INP/CLS 三个指标定义了「快」的语言，加载、渲染、资源三层是手段清单——每笔优化都要能在指标上对账。
---

性能优化最常见的弯路是「上来就背手段清单」：懒加载、代码分割、图片压缩……但**没有度量的优化是玄学**。正确顺序是先让指标说话——Core Web Vitals 定义了「快」的语言，再按加载/渲染/资源三层挂手段，每笔优化都要能回答「它改善哪个指标多少」。

## Core Web Vitals：三个指标说清"快"

| 指标 | 度量什么 | 达标线 |
|---|---|---|
| **LCP** (Largest Contentful Paint) | 最大内容元素（首屏主图/标题）出现的时间 | ≤ 2.5s |
| **INP** (Interaction to Next Paint) | 全程交互（点击/输入）的响应延迟，取最差区间 | ≤ 200ms |
| **CLS** (Cumulative Layout Shift) | 页面寿命内累积的布局位移 | ≤ 0.1 |

- **LCP 管「出来得快不快」**：瓶颈在网络与关键路径——服务端响应、资源体积、优先级
- **INP 管「交互跟不跟手」**（2024 年取代 FID，度量更全面）：瓶颈在主线程长任务——JS 执行与渲染阻塞
- **CLS 管「稳不稳」**：布局位移的元凶是无尺寸的图片/广告、动态插入的内容、web 字体替换（FOUT）
- 权威出处是 [web.dev 的 vitals 定义](https://web.dev/articles/vitals)；度量工具三件套：实验室侧 Lighthouse（可复现、给优化建议），现场侧 `web-vitals` 库上报真实用户数据（这才是用户看到的），DevTools Performance 面板定位具体瓶颈

## 加载层：让首屏关键路径最短

```html title="critical.html"
<link rel="preload" href="/fonts/main.woff2" as="font" type="font/woff2" crossorigin />
<!-- preload：提前拉当前页面确定要用的关键资源（字体是 LCP 常见隐形杀手） -->

<link rel="prefetch" href="/next-page.js" />
<!-- prefetch：闲时预取"下一页大概率要用的"，与 preload 场景互补 -->
```

- **代码分割**：路由级 `import()` 让首屏只带首屏的 JS；antd/echarts 这类大库按需引入。工程手段在[模块化与构建](../engineering/01-modules-and-vite.md)里，`manualChunks` 拆 vendor 还能命中长缓存
- **HTTP 缓存**：哈希资源长强缓存、HTML 协商缓存——回访用户的 LCP 基本免费（决策流程见[HTTP 缓存与浏览器存储](../browser/02-http-cache-and-storage.md)）
- **关键请求链要短**：分析器里数一数 LCP 资源前有几层重定向/串行发现，能内联的关键 CSS 内联，能 `preload` 的字体 preload
- 服务端层面（TTFB）不是前端可独立解决的，但要知道它是 LCP 账单的第一行

## 渲染层：给主线程减负

INP 与长任务是同一件事的两面——**一切交互卡顿的主线程账本**（渲染流水线的底层原理见[浏览器渲染原理](../browser/01-rendering-pipeline.md)）：

- **动画只动 `transform`/`opacity`**：走合成线程，主线程忙时依然流畅；动 `left/top/width` 则每帧重排
- **拆长任务**：>50ms 的计算切片（`scheduler.yield()` / `requestIdleCallback`）或挪进 Web Worker
- **事件处理两板斧**：输入类事件（scroll/resize）节流；回调里的 DOM 读写分离避免布局抖动
- **减少 hydration 账单**：SSR 页面交互激活前的水合是长任务重灾区——组件级懒水合、减少首屏组件树体积是元优化方向

## 资源层：每字节都有成本

- **图片是 LCP 的常客**：格式上 WebP/AVIF 优先（`<picture>` 兜底回退）、尺寸上响应式 `srcset` 按视口给、首屏主图 `fetchpriority="high"`、首屏外的 `loading="lazy"`
- **字体**：`font-display: swap` 防止文字被字体文件阻塞（顺带治理 CLS——注意 fallback 与目标字体的字形宽度差），子集化中文字体收益巨大（全量 10MB+ → 子集百 KB 级）
- **传输**：Brotli 压缩、HTTP/2 多路复用让「合请求数」的旧优化作废，但「请求体积」永远有效

## 方法论：对账闭环

```
度量（现场数据 + Lighthouse）
→ 定位（Performance 面板 / 网络瀑布，找到指标背后的具体元凶）
→ 手段（按层挂上面清单）
→ 复测（指标变化多少？没有变化就回退）
```

- 每个手段挂回指标：代码分割/预加载/图片 → LCP；拆长任务/合成动画 → INP；尺寸占位/字体 swap → CLS
- 性能预算进 CI（bundle 体积阈值、Lighthouse 分数门槛），防止优化成果被后续迭代悄悄吃掉
- 优先级判断：现场数据里拖后腿的那个指标 > 清单上的顺序

## 小结

性能优化的主线是一套**财务方法**：指标是账本（LCP/INP/CLS），手段是支出，每笔支出都要在账本上见到回报。三层手段各有侧重——加载层管 LCP、渲染层管 INP、资源层三面都沾——底层的渲染与缓存原理分别在[渲染流水线](../browser/01-rendering-pipeline.md)与[HTTP 缓存](../browser/02-http-cache-and-storage.md)里。
