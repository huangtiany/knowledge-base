---
title: Nuxt：Vue 的全栈框架
date: 2026-09-06
tags: [Vue生态]
summary: SPA 的两大短板——首屏与 SEO——由元框架接管：Nuxt 把渲染模式变成路由级配置，数据获取自动防重复，server 目录把 BFF 写进同一个仓库。
---

纯 SPA 有两个先天短板：**首屏白屏**（所有 JS 下载执行完才有内容）和 **SEO 弱**（爬虫拿到的常常是空壳）。元框架的答案是「在服务端把首屏渲染好再发出去」——Nuxt 之于 Vue，就是这条路线的官方级答案，对应 React 世界的 Next.js（[对照篇](../react/04-nextjs.md)）。这篇按「渲染模式 → 文件约定 → 数据获取 → 服务端能力」的主线走。

## 渲染模式：从二选一到按路由配置

| 模式 | 机制 | 适用 |
|---|---|---|
| SSR | 每次请求服务端实时渲染 HTML | 数据实时性强的页面 |
| SSG | 构建期生成静态 HTML | 内容站、文档 |
| ISR / SWR | 静态 + 周期再生成 | 频繁但可容忍延迟更新的内容页 |
| SPA | 传统客户端渲染 | 后台管理类（无需 SEO） |

Nuxt 的关键能力是 **`routeRules` 让每个路由单独选模式**：

```ts title="nuxt.config.ts"
export default defineNuxtConfig({
  routeRules: {
    "/": { prerender: true },                  // 首页：构建期生成
    "/blog/**": { isr: 3600 },                 // 博客：每小时再生成
    "/search": { ssr: false },                 // 搜索页：SPA 模式
    "/api/**": { cors: true },                 // 接口路由加 CORS
  },
});
```

「整站一个模式」的纠结由此消失——这是元框架相对手搭 SSR 的核心价值。

## 文件路由与约定：目录即路由表

```
pages/
  index.vue              → /
  articles/index.vue     → /articles/
  articles/[id].vue      → /articles/:id        （方括号即动态段）
layouts/
  default.vue            → <slot/> 包裹默认布局；页面 definePageMeta({ layout: "empty" }) 切换
app.vue                  → 根组件（NuxtPage/NuxtLayout 的挂载点）
```

约定式路由省掉了手写路由表，动态段用方括号命名，布局抽取成 `layouts/`。路由守卫的等价物是 **middleware**（`middleware/auth.global.ts` 全局、非 global 按页挂载），语义与 [Vue Router 守卫](02-vue-router-pinia.md)一致。

## 数据获取：useAsyncData 与 useFetch 的关键差异

```vue title="pages/articles/[id].vue"
<script setup lang="ts">
const route = useRoute();
// useFetch = useAsyncData + $fetch 的便捷封装
const { data: article, pending, error, refresh } = await useFetch(`/api/articles/${route.params.id}`);
</script>
```

- **await 在服务端执行**：数据在 HTML 发出前取好——这是 SEO 与首屏的来源；结果序列化进 payload 随页面下发，**客户端不再重复请求**（SPA 里「服务端取了客户端又取」是手搭 SSR 最常见的坑，Nuxt 自动处理）
- `useAsyncData(key, fn)` 是底层形态：key 是缓存与去重的身份；同 key 多处调用只发一次请求
- `refresh()` 手动重取；`useLazyFetch` 不阻塞导航（非关键数据）

注意：服务端执行意味着这段代码**拿不到 window**、请求走的是服务端网络（注意内网地址与鉴权头的转发）。

## server 目录：BFF 长在同一个仓库

```ts title="server/api/articles/[id].get.ts"
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, "id");
  return db.articles.find(id);        // Nitro 引擎：Node/边缘都能部署
});
```

`server/api/` 下的文件直接成为 `/api/**` 接口——**前端代理聚合（BFF）、Webhook 回调、轻量后端**都写在这里，一个仓库同时交付前端与 API。重后端仍归独立服务，但「给前端补一层聚合」不再需要另起工程。

## 部署与取舍

- Nuxt 构建产物由 **Nitro** 决定部署形态：Node 服务器、Serverless、静态托管（全 SSG 时）都是官方 target；Vercel/Cloudflare 一键对接
- 成本清单：需要常驻/按需的服务端（相比纯静态托管贵）、SSR 代码里要处处区分服务端/客户端、内存泄漏排查从浏览器扩展到服务端
- 什么时候不用：纯后台管理系统（无 SEO 需求）直接 SPA 更省——`ssr: false` 一行就能降级，架构留了退路

## 小结

Nuxt 的三层价值收拢：**渲染模式路由级可选**（SSR/SSG/ISR/SPA 混布）、**数据获取服务端化且自动防重复**、**server 目录打通全栈闭环**。对照另一条技术栈的同构答案见[Next.js](../react/04-nextjs.md)；部署形态的落地细节见[部署与前端监控](../engineering/05-deploy-and-monitoring.md)。
