---
title: 前端知识地图
date: 2026-09-06
tags: [路线图]
summary: 前端是日常工作领域，这批文章把日常散落的经验整理成体系：每个主题对应一篇笔记，每章末尾附本章资源。姊妹篇：《AI / Agent 知识地图》与《后端知识地图》。
related: false
---

这张地图是前端域的知识体系。与前两个域不同，前端是日常工作领域，这批文章的定位是体系自查：把日常散落的经验整理成体系，深挖常用但说不清原理的部分。用 [roadmap.sh/frontend](https://roadmap.sh/frontend) 做外部校准，每个 h2 是一章，对应标签清单里的一个章级标签；章下面的小节是笔记主题，全部已写成互链（项目实战一节留白）。

## 定位与主线

定位：**把散落的经验整理成体系，把常用但说不清原理的部分讲透**。

依赖主线：

- **HTML与CSS → JavaScript → TypeScript → 浏览器原理**：结构、行为、类型、宿主平台，四层一次理顺
- **Vue生态 与 React生态** 双线并列：各 4 篇从核心走到元框架（Nuxt / Next.js），两个心智模型都掌握
- **工程化**（构建 → 质量工具链 → 测试 → Monorepo → 部署监控）与 **性能优化**：覆盖从源码到稳定上线的交付过程
- **跨端与桌面**：小程序双篇（原生机制 + Taro/uni-app 多端）、RN/Flutter 移动选型、Tauri 双篇（核心 + 工程实践）
- **项目实战**留白：实战的价值在真实项目里遇到的问题，等进展后写成笔记回这里点亮

## HTML 与 CSS

标签：`HTML与CSS`。结构与表现的基本功，语义化决定文档质量，现代布局决定实现效率：

- [HTML 语义化：结构即文档](html-css/01-semantic-html.md)
- [现代 CSS 布局：Flex、Grid 与响应式](html-css/02-modern-css-layout.md)

### 本章资源

- [Can I Use](https://caniuse.com/) —— 兼容性查询
- [Flexbox Froggy](https://flexboxfroggy.com/#zh-cn) —— Flex 闯关游戏
- [MDN · CSS 参考](https://developer.mozilla.org/zh-CN/docs/Web/CSS) —— 属性权威出处

## JavaScript

标签：`JavaScript`。语言核心三部分：作用域/闭包/原型是原理重点，ES6+ 是日常语法，异步是前端代码的主要形态：

- [作用域、闭包与原型链](javascript/01-scope-closure-prototype.md)
- [ES6+ 与模块化](javascript/02-es6-plus-and-modules.md)
- [异步与事件循环：Promise 到 async/await](javascript/03-async-and-event-loop.md)

### 本章资源

- [现代 JavaScript 教程](https://zh.javascript.info/) —— 中文最系统
- [阮一峰 · ES6 入门教程](https://es6.ruanyifeng.com/) —— 语法速查
- [MDN · JavaScript 指南](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Guide) —— 官方权威
- [MDN · 使用 Promise](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Guide/Using_promises) —— 异步深挖

## TypeScript

标签：`TypeScript`。从类型标注到泛型与工具类型两个层级，类型即文档，也是重构时信心的来源：

- [TypeScript 入门：类型标注与收窄](typescript/01-ts-basics.md)
- [泛型与工具类型](typescript/02-generics-and-utility-types.md)

### 本章资源

- [TypeScript 官方文档（中文）](https://www.typescriptlang.org/zh/docs) —— 官方权威
- [TypeScript 入门教程](https://ts.xcatliu.com/) —— 中文入门替代

## 浏览器原理

标签：`浏览器原理`。前端代码的宿主平台，渲染管线决定性能上限，HTTP 缓存决定加载下限：

- [浏览器渲染原理：从 URL 到像素](browser/01-rendering-pipeline.md)
- [HTTP 缓存与浏览器存储](browser/02-http-cache-and-storage.md)

### 本章资源

- [小林 coding · 图解网络](https://xiaolincoding.com/network/) —— 图解深挖
- [MDN · HTTP 文档](https://developer.mozilla.org/zh-CN/docs/Web/HTTP) —— 字段权威

## Vue 生态

标签：`Vue生态`。主力框架之一：核心 → 路由与状态 → 组件进阶 → 全栈框架，一条线走完：

- [Vue 还是 React：框架选型对比](framework/00-vue-or-react.md)
- [Vue 3 核心：响应式与组件化](vue/01-vue3-core.md)
- [Vue Router 与 Pinia：路由与状态管理](vue/02-vue-router-pinia.md)
- [Vue 组件进阶：插槽、依赖注入与复用体系](vue/03-vue-component-patterns.md)
- [Nuxt：Vue 的全栈框架](vue/04-nuxt.md)

### 本章资源

- [Vue.js 官方文档（中文）](https://cn.vuejs.org/) —— 权威出处
- [Vue Router 官方文档（中文）](https://router.vuejs.org/zh/) —— 路由器本体
- [Pinia 官方文档（中文）](https://pinia.vuejs.org/zh/) —— 状态管理
- [Nuxt 官方文档](https://nuxt.com/) —— 元框架权威

## React 生态

标签：`React生态`。另一个心智模型：核心 → 状态管理 → 进阶模式 → Next.js，与 Vue 线对称展开（选型对比见上一章）：

- [React 核心：组件、JSX 与 Hooks](react/01-react-core-hooks.md)
- [React 状态管理：Context、Zustand 与 TanStack Query](react/02-react-state.md)
- [React 进阶：复合组件、Suspense 与并发](react/03-react-advanced-patterns.md)
- [Next.js：App Router 与服务端组件](react/04-nextjs.md)

### 本章资源

- [React 官方中文文档](https://zh-hans.react.dev/) —— Learn 区块质量极高
- [TanStack Query 官方文档](https://tanstack.com/query/latest) —— 服务端状态标准
- [Zustand 官方文档](https://zustand.docs.pmnd.rs/) —— 客户端状态极简方案
- [Next.js 官方文档](https://nextjs.org/docs) —— App Router 权威

## 工程化

标签：`工程化`。从源码到稳定上线：构建 → 规范 → 测试 → Monorepo → 部署监控，五篇一条交付链：

- [模块化与构建：从 Webpack 到 Vite](engineering/01-modules-and-vite.md)
- [代码质量工具链：ESLint、Prettier 与 pnpm](engineering/02-quality-toolchain.md)
- [前端测试：Vitest、Testing Library 与 Playwright](engineering/03-testing.md)
- [Monorepo：pnpm workspace 与 Turborepo](engineering/04-monorepo.md)
- [部署与前端监控](engineering/05-deploy-and-monitoring.md)

### 本章资源

- [Vite 官方文档（中文）](https://cn.vite.dev/) —— 构建工具本体
- [pnpm 官方文档（中文）](https://pnpm.io/zh/) —— 包管理器
- [Vitest 官方文档](https://vitest.dev/) —— 单测框架
- [Playwright 官方文档](https://playwright.dev/docs/intro) —— E2E 框架
- [Turborepo 官方文档](https://turbo.build/repo/docs) —— 任务编排与缓存

## 性能优化

标签：`性能优化`。先度量再优化，Core Web Vitals 是指标体系，加载/渲染/资源三层是手段清单：

- [性能优化：Core Web Vitals 与优化手段](performance/01-performance-metrics.md)

### 本章资源

- [web.dev · Core Web Vitals](https://web.dev/articles/vitals) —— 指标权威出处

## 跨端与桌面

标签：`跨端与桌面`。浏览器之外的端：小程序双篇讲机制与生态，移动端一篇选型对比，桌面双篇走通 Tauri 从核心到发布：

- [微信小程序：双线程模型与页面体系](cross-platform/01-miniprogram-core.md)
- [小程序生态与多端框架：Taro 与 uni-app](cross-platform/02-miniprogram-ecosystem.md)
- [React Native 与 Flutter：移动跨端选型](cross-platform/03-rn-flutter.md)
- [Tauri 入门：Rust 内核的桌面应用](cross-platform/04-tauri-core.md)
- [Tauri 工程实践：插件、权限与分发](cross-platform/05-tauri-practice.md)

### 本章资源

- [微信小程序官方文档](https://developers.weixin.qq.com/miniprogram/dev/framework/) —— 最终依据
- [Taro 官方文档](https://docs.taro.zone/) —— 多端 React 线
- [uni-app 官方文档](https://uniapp.dcloud.net.cn/) —— 多端 Vue 线
- [React Native 官方文档](https://reactnative.dev/) —— 移动跨端
- [Flutter 官方文档（中文）](https://docs.flutter.cn/) —— 移动自绘
- [Tauri 官方文档（中文）](https://tauri.app/zh-cn/) —— 桌面主角
- [Electron 官方文档（中文）](https://www.electronjs.org/zh/docs/latest) —— 桌面对照组

## 项目实战

标签：`项目实战`。**留白**。按前两个域的先例，实战笔记的价值在真实项目里遇到的问题，预先编写没有意义。候选方向：

- 本站的交互增强复盘（搜索防抖、目录 scroll-spy 都是现成素材）
- 组件库 / 工程模板的沉淀笔记
- Tauri 小工具：给日常流程做个桌面助手

## 进度点亮

- 地图上的主题已全部成文互链；项目实战一节留白，等真实进展后写成笔记回这里点亮
- 每个章级标签：有笔记即点亮；前端域目前保持灰组的标签是 `项目实战`
- 每章末尾的「本章资源」与资源收藏页同源：卡片收在 `content/front/resources.yaml`，地图只做学习视角的精选
