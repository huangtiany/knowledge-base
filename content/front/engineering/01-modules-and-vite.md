---
title: 模块化与构建：从 Webpack 到 Vite
date: 2026-09-06
tags: [工程化]
summary: 构建工具解决三件事：模块化、转译、产物优化。Webpack 的 loader/plugin 模型与 Vite 的「dev 不打包」是两代答案——理解各自解决的问题，配置就不再是咒语。
---

浏览器跑不了你直接写的源码：TS 要编译、JSX 要转换、几百个模块文件不能逐个请求、产物要压缩优化。构建工具就是这层「源码到交付物」的翻译官。这篇按「问题 → 两代答案」的顺序梳理：Webpack 的全量打包模型，Vite 的「开发态不打包」模型，以及日常高频的 Vite 配置。

## 模块化的演进：构建需求的根

```html title="evolution.html"
<!-- 1.0 时代：全局变量 + 手动排序，依赖关系全靠人脑 -->
<script src="jquery.js"></script>
<script src="app.js"></script>

<!-- ESM 时代：浏览器原生的依赖图 -->
<script type="module" src="/src/main.js"></script>
```

- 早期的 IIFE/命名空间 → CommonJS（Node，运行时 require）→ **ESM（语言标准，静态依赖图）**
- ESM 的静态性是后面一切的根：构建器不执行代码就能分析出「谁依赖谁」，才有了 tree-shaking、代码分割、按需加载
- 生产环境通常仍要打包：几百个 HTTP 请求逐个取模块（哪怕 HTTP/2）不如一个优化过的包；且兼容老浏览器需要转译——这就是「开发态可以不打包、生产态要打包」可以分开处理的原因

## Webpack 模型：loader 与 plugin

Webpack 的核心是一张**依赖图**：从 entry 出发，把每个 import 当节点，边上的文件交给匹配的 loader 转换：

```js title="webpack.config.js"
module.exports = {
  entry: "./src/main.js",
  module: {
    rules: [
      { test: /\.ts$/, use: "ts-loader" },     // loader：文件级转换（TS/JSX/Sass → JS/CSS）
      { test: /\.css$/, use: ["style-loader", "css-loader"] },
    ],
  },
  plugins: [new HtmlWebpackPlugin()],           // plugin：构建过程级介入（生成 HTML、压缩、分包）
  optimization: { splitChunks: { chunks: "all" } },  // 代码分割：公共依赖拆 vendor
};
```

一句话分工：**loader 处理「一种文件怎么变成模块」，plugin 介入「构建过程的钩子」**。Webpack 的问题是启动即全量构建——项目大了冷启动以分钟计，热更新也随之变慢。它是「打捆绑包」时代的集大成者，至今仍是老项目与微前端复杂场景的主力。

## Vite 模型：开发态不打包

```bash
# 开发态：原生 ESM 按需请求，esbuild 只预构建 node_modules 依赖
npm run vite     # 冷启动毫秒级 —— 不再先打包全站

# 生产态：Rollup 打包 + 压缩 + 分包（Vite 5+ 可选 Rolldown）
vite build
```

Vite 快的三个原因，各对应一个问题：

1. **dev 服务器直接以原生 ESM 服务源码**：浏览器 `import` 哪个文件，dev server 才按需转换哪一个——「按需编译」取代「全量打包」，冷启动与项目体积解耦
2. **依赖预构建用 esbuild**（Go 写的）：node_modules 里的 CJS 包转 ESM、合并小模块，比 JS 实现快一个量级，且结果缓存
3. **HMR 精确到模块**：改一个组件只失效这一个模块的边界，热更新速度不随项目增长而劣化

代价是开发态与生产态走两条链路（esdev/Rollup），偶有「dev 正常、build 报错」的不一致——遇到时先怀疑依赖的 CJS/ESM 形态差异。

## Vite 日常配置：五件高频套

```ts title="vite.config.ts"
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  plugins: [vue()],
  resolve: { alias: { "@": "/src" } },              // ① 路径别名：告别 ../../../
  server: {
    proxy: { "/api": { target: "http://localhost:8080", changeOrigin: true } },  // ② dev 代理，免 CORS
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: { vendor: ["vue", "vue-router"] },  // ③ 大依赖拆 vendor，命中长缓存
      },
    },
  },
  // ④ 环境变量：.env.development / .env.production 里的 VITE_ 前缀变量经 import.meta.env 读取
  // ⑤ 代码分割默认按路由动态 import() 自动切片，路由懒加载是白拿的首屏优化
});
```

这五件的优先级：alias 与 proxy 是第一天就要配的；manualChunks 与环境变量治理随项目长大再上；路由级 `import()` 从第一个页面就该用。

## 选型视角与趋势

- **新项目默认 Vite**（Vue/React/Svelte 官方脚手架都是），Webpack 留在存量项目与特殊构建需求里
- 值得留意的趋势：Rspack（Rust 版 Webpack，兼容其 API）与 Turbopack 走「兼容既有生态 + Rust 加速」路线；Vite 自身在把 Rollup 位置让给 Rolldown。工具会更替，但「依赖图、loader/plugin、代码分割」这些概念模型是通用的——学概念不学工具
- 构建只是交付链的一环，格式与规范由 [质量工具链](02-quality-toolchain.md) 把守；产物优化的量化收益在 [性能优化](../performance/01-performance-metrics.md) 里对账

## 小结

两代模型一句话：**Webpack 全量打包换兼容与确定性，Vite 原生 ESM 按需编译换开发体验**。概念资产（依赖图、转换、分割、缓存）跨工具通用。模块化的语言基础（ESM 的静态性）见[ES6+ 与模块化](../javascript/02-es6-plus-and-modules.md)。
