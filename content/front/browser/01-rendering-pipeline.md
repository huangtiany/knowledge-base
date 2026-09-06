---
title: 浏览器渲染原理：从 URL 到像素
date: 2026-09-06
tags: [浏览器原理]
summary: 渲染流水线 DOM → CSSOM → 布局 → 绘制 → 合成。理解这条链，才知道重排重绘为什么贵、transform 为什么快、script 为什么会堵页面。
---

前端代码跑在浏览器里，性能上限由渲染机制决定。一个 URL 变成屏幕上的像素，要经过完整的渲染流水线；这条流水线对应三个工程结论：重排为什么贵、`transform` 为什么快、`script` 标签为什么放错位置会白屏。加载阶段的网络侧见[HTTP 缓存与浏览器存储](02-http-cache-and-storage.md)，指标度量见[性能优化](../performance/01-performance-metrics.md)。

## 渲染流水线：五个阶段

关键路径（Critical Rendering Path）的五步：

```
HTML → 解析 → DOM 树
CSS  → 解析 → CSSOM 树
        ↓
   渲染树（可见节点 + 各自样式）
        ↓
   布局 Layout（几何：位置与大小）   ← 改几何 → 重排 Reflow
        ↓
   绘制 Paint（栅格化：填充像素）    ← 改外观 → 重绘 Repaint
        ↓
   合成 Composite（分层上屏）        ← transform/opacity 只走这步
```

要点三条：

- **DOM 与 CSSOM 并行构建**，二者合出渲染树。CSS 因此阻塞渲染（CSSOM 没好就不能首绘），这就是「关键 CSS 内联、其余异步」的原理
- **JS 默认阻塞解析**：`<script>` 可能改 DOM，解析器遇它要停下等下载+执行；`defer`（文档解析完按序执行）或 `async`（下载完就执行）都能解除阻塞，常规应用脚本选 `defer`

```html title="script-loading.html"
<script src="/lib.js"></script>          <!-- 默认：下载+执行都阻塞解析 -->
<script async src="/track.js"></script>  <!-- 独立脚本（埋点）用 async -->
<script defer src="/app.js"></script>    <!-- 应用脚本用 defer：保序且不阻塞 -->
```

## 重排与重绘：改什么决定代价大小

流水线的改动遵循一条规律：**改动越靠上游，需要返工的下游步骤越多**。

| 改动 | 触发 | 代价 |
|---|---|---|
| 几何属性（width/top/font-size） | 重排 → 重绘 → 合成 | 最贵 |
| 外观属性（color/background） | 重绘 → 合成 | 中等 |
| `transform` / `opacity` | 仅合成 | 最便宜 |

工程上的两条做法：

```js title="layout-thrash.js"
// 布局抖动（layout thrashing）：读写交替，每轮都强制重排
for (const el of items) {
  el.style.height = box.offsetHeight + "px";  // 读（强制重排）写（弄脏布局）交替
}

// 改法：先批量读，再批量写
const heights = items.map((el) => box.offsetHeight);   // 读全部
items.forEach((el, i) => (el.style.height = heights[i] + "px"));  // 写全部
```

- **读写分离**：循环里交替读写几何属性会反复强制重排；先读完再写
- **动画只动 transform 和 opacity**：`left/top` 动画每帧重排，`translate` 动画只动合成层，帧率差一个量级

## 合成层：交给 GPU 的部分

浏览器把页面切成多个**层**（layer），合成线程把各层栅格化后拼接上屏，这一步不占主线程。`transform/opacity` 动画能被提升到独立层，走「合成器动画」，即使主线程繁忙（长任务执行中）也能流畅跑。

```css title="layers.css"
.modal { will-change: transform; }  /* 提示浏览器提前建层：用于已知要动画的元素 */
```

`will-change` 只是给浏览器的提示：几百个元素都加上会导致内存暴涨，反而变慢。原则是给确定要动画的少量元素用，动画结束移除。判断一个元素是否真的建了层，Chrome DevTools 的 Layers 面板可以直接看。

## 长任务与交互响应

渲染在主线程上进行，**超过 50ms 的任务就是长任务（Long Task）**，期间点击、输入全部排队，表现为卡顿。

- 大计算（大数据处理、复杂 diff）用 `requestIdleCallback` 切片，或挪进 Web Worker（子线程，与主线程 postMessage 通信）
- 首屏脚本尽量小：代码分割把非首屏 JS 推后加载（工程手段见[模块化与构建](../engineering/01-modules-and-vite.md)）
- 交互性能指标 INP 直接度量「输入到下一帧」的延迟，治理手段就是压缩长任务，见[性能优化](../performance/01-performance-metrics.md)

## 小结

改几何最贵，改颜色中等，transform/opacity 最便宜；`script` 用 `defer`，关键 CSS 内联；长任务是交互卡顿的主要来源。理解了渲染侧的开销来源之后，度量与优化清单见[性能优化](../performance/01-performance-metrics.md)；页面加载阶段的缓存见[HTTP 缓存与浏览器存储](02-http-cache-and-storage.md)。
