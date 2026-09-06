---
title: 现代 CSS 布局：Flex、Grid 与响应式
date: 2026-09-06
tags: [HTML与CSS]
summary: 布局问题的第一问是一维还是二维——Flex 管一维流，Grid 管二维面，clamp 与容器查询补上响应式的最后一块。
---

float 和行内块时代留下的布局恐惧早该清零了。现在的布局决策可以收敛成一个判断树：**一维还是二维？** 一维内容流用 Flex，二维面板用 Grid，剩下的响应式交给媒体查询、clamp 和容器查询。这篇把常用的心智模型和踩过的坑收拢成一篇。

## 盒模型与 sizing：一切的底座

```css title="box.css"
* { box-sizing: border-box; }  /* width 包含 padding+border，第 0 条全局规则 */

.page { min-height: 100dvh;    /* dvh 随移动端地址栏伸缩，100vh 在手机上有毛刺 */
        display: flex; flex-direction: column; }
.page main { flex: 1; }        /* 中间区吃掉剩余空间，页脚自然贴底 */
```

`border-box` 是所有布局估算成立的前提；`min-height: 100vh` 换成 `100dvh`（dynamic viewport height）能消掉移动端地址栏收起时的跳动。

## Flex：一维布局的默认答案

Flex 的心智模型是**主轴与交叉轴**：`flex-direction` 定主轴，`justify-content` 管主轴分布，`align-items` 管交叉轴对齐。

```css title="flex.css"
.toolbar { display: flex; align-items: center; gap: 12px; }
.toolbar .title { flex: 1; }   /* flex:1 = flex-grow:1; flex-shrink:1; flex-basis:0% */

.cards { display: flex; flex-wrap: wrap; gap: 16px; }
.cards > * { flex: 1 1 240px; } /* 基准 240px、可伸可缩、放不下换行——简易响应式 */
```

三个高频盲区：

- **`flex: 1` 的 basis 是 0**：内容长短不再影响分配，按剩余空间均分；想要「内容打底、再分剩余」用 `flex: auto`
- **min-width 悖论**：flex 子项默认 `min-width: auto`，长单词/长串会撑破容器——内容溢出时给子项 `min-width: 0` 是标准处方
- **间距用 gap 不用 margin**：margin 相邻方案要处理边界（`:last-child` 清尾差），gap 天然没有首尾问题

入门练手推荐 [Flexbox Froggy](https://flexboxfroggy.com/#zh-cn) 通关一遍，justify/align 就再也不用查了。

## Grid：二维面板与"不写媒体查询的响应式"

Grid 的心智模型是**先划网格再放内容**：

```css title="grid.css"
/* 显式面板：头部/侧栏/内容/页脚 一图流 */
.layout {
  display: grid;
  grid-template:
    "head head" auto
    "side main" 1fr
    "foot foot" auto
    / 240px 1fr;
}
.layout header  { grid-area: head; }
.layout aside   { grid-area: side; }

/* 隐式卡片墙：不需要断点的响应式 */
.gallery { display: grid; gap: 16px;
           grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); }
```

`repeat(auto-fill, minmax(220px, 1fr))` 是最有性价比的一行：容器宽就多放几列，窄了自动减列，**没有一处媒体查询**。Flex 版的 `flex-wrap` 方案能做类似效果，但每行末尾的对齐补位不如 Grid 干净。

二维就上 Grid，别用 Flex 嵌套硬凑行和列——那是把 Grid 出现前的工作流又走了一遍。

## 响应式：移动优先与三个新工具

断点写法的共识是**移动优先**：基础样式给小屏，`@media (min-width: …)` 逐级增强——CSS 的层叠特性天然支持「向后覆盖」。

在此之上，三个新工具能消掉大量断点：

```css title="responsive.css"
h1 { font-size: clamp(28px, 4vw + 12px, 56px); } /* 流体字号：下限/理想/上限 */

.card-list { container-type: inline-size; }        /* 容器查询：组件按父容器宽度响应 */
@container (min-width: 480px) {
  .card { display: grid; grid-template-columns: 96px 1fr; }
}
```

- **clamp()**：一个声明覆盖字号/间距的全区间，缩放平滑无跳变
- **容器查询**：组件按「自己所在容器」的宽度响应，而不是整个视口——同一组件放进侧栏和主区自动切换形态，这是组件化时代真正想要的响应式
- 兼容性拿不准时先查 [Can I Use](https://caniuse.com/)，容器查询的基础用法 2023 年起已全线可用

## 层叠、继承与变量：调试 CSS 的底层逻辑

布局问题有时出在样式没生效，这时要回到层叠规则：**优先级 = 内联 > id > 类/属性/伪类 > 元素**，同优先级看源码顺序，`!important` 只留给工具类与覆盖第三方样式的出口。

自定义属性是组织样式的中枢：

```css title="tokens.css"
:root { --ink: #1B2733; --space: 8px; }
.card { padding: calc(var(--space) * 2); color: var(--ink); }
[data-theme="dark"] { --ink: #E8EAED; }  /* 主题切换只改变量 */
```

变量参与层叠（可被祖先作用域覆盖）配合 `calc()`，就能把主题、间距系统做成「改变量即换肤」。语义层的选择（什么算 token、什么算组件样式）可以在[质量工具链](../engineering/02-quality-toolchain.md)里用 stylelint 约束。

## 小结

布局决策树收拢成一句：**一维 Flex、二维 Grid、组件级响应式用容器查询、连续值用 clamp**。剩下的坑大多来自盒模型与 min-width 这类底层细节。布局就绪后，性能账单主要来自渲染侧——延伸阅读[浏览器渲染原理](../browser/01-rendering-pipeline.md)与[性能优化](../performance/01-performance-metrics.md)。
