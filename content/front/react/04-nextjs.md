---
title: Next.js：App Router 与服务端组件
date: 2026-09-06
tags: [React生态]
summary: App Router 时代的 Next.js：RSC 让组件默认不进客户端 bundle，文件约定生成路由与布局，缓存模型与 Server Actions 补齐服务端数据读写。React 官方推荐的全栈方案。
---

Next.js 是 React 官方文档推荐的元框架，App Router（13+ 版本）之后，它从「React + 路由 + 打包」的脚手架转向架构层面：**React Server Components（RSC）成为默认**，组件默认在服务端渲染、不进客户端 bundle，需要交互的部分显式标注 `'use client'`。Vue 侧的同构方案见[Nuxt](../vue/04-nuxt.md)。

## App Router：目录即路由，布局天然嵌套

```
app/
  layout.tsx              → 根布局（全站包裹：导航、主题 Provider）
  page.tsx                → /
  blog/
    layout.tsx            → /blog 的布局（嵌套：根布局 + blog 布局逐层包裹）
    page.tsx              → /blog
    [slug]/
      page.tsx            → /blog/:slug（动态段）
      loading.tsx         → 该段加载时的 Suspense fallback（自动包 Suspense）
      error.tsx           → 该段的错误边界（自动 Error Boundary）
```

- 约定文件各司其职：`page` 出 UI、`layout` 包结构（导航时保留不重挂）、`loading`/`error` 自动生成加载与错误边界。[进阶篇](03-react-advanced-patterns.md)里手动包的 Suspense/ErrorBoundary 在这里变成了文件
- 动态段 `[slug]`、路由组 `(group)`、并行路由 `@slot`、路由拦截 `(.)photo`：约定体系很深，主干是前四个，其余用到再查

## RSC：默认服务端，'use client' 是边界

```tsx title="app/blog/[slug]/page.tsx"
// 服务端组件（默认）：可以直接 async、直接访问数据库/文件系统
export default async function Post({ params }) {
  const post = await db.posts.find(params.slug);     // 无 API 层，服务端直取
  return <article>{post.body}</article>;             // 不进客户端 JS bundle
}

// app/like-button.tsx
"use client";                                        // 交互能力从这里开始
export function LikeButton({ id }) {
  const [liked, setLiked] = useState(false);         // useState 只能在客户端组件里用
  return <button onClick={() => setLiked(!liked)}>👍</button>;
}
```

- **服务端组件的三个能力**：async 直取数据（省一层 API）、访问服务端资源（DB/密钥不暴露）、零客户端 JS（组件不进 bundle）
- **代价是单向边界**：客户端组件只能通过 props/Context 拿服务端组件给的数据，且 props 必须可序列化；`'use client'` 标注的是**边界**，边界以下整个子树都是客户端
- 判断法则：**有交互（state/effect/事件）才 'use client'，静态展示一律留在服务端**。把交互集中在叶子节点，bundle 就最小

## 缓存模型：Next.js 最需要小心的部分

App Router 的性能来自激进的缓存，缓存分四层：

| 层 | 默认 | 控制 |
|---|---|---|
| fetch 请求记忆（单次渲染内去重） | 开 | 同 URL 自动 |
| Data Cache（跨请求持久缓存） | 开 | `fetch(…, { cache: 'no-store' })` |
| 全路由缓存（服务端渲染结果） | 静态路由开 | 动态 API（cookies/headers/searchParams）触发动态 |
| 客户端 Router Cache（导航缓存） | 开 | `router.refresh()`、`staleTimes` |

```tsx title="revalidation.tsx"
// 内容更新后主动失效，而不是绕开缓存
export default async function Posts() {
  const posts = await fetch("https://api.example.com/posts", { next: { revalidate: 3600 } });
}
// mutation 之后：
revalidateTag("posts");     // 或 revalidatePath("/blog")
```

经验法则：**默认利用缓存（快），在 mutation 点用 `revalidateTag/Path` 主动失效**；实时性强的页面用动态 API 或 `no-store` 显式跳过。缓存是 App Router 的高频问题来源，「为什么改了没生效」九成出在这张表里。

## Server Actions：数据变更的内建通路

```tsx title="actions.ts"
"use server";
export async function createPost(formData: FormData) {
  "use server";
  await db.posts.create({ title: formData.get("title") });
  revalidateTag("posts");
}

// 组件里：表单直接对接服务端函数，无 API 层、渐进增强（JS 未加载也能提交）
<form action={createPost}>
  <input name="title" />
  <button>发布</button>
</form>
```

Server Actions 让「写操作」也省掉 API 层：`"use server"` 标注的函数在服务端执行、表单 `action` 直连，配合 `useActionState` 拿提交状态、`useOptimistic` 做乐观更新（API 见[进阶篇](03-react-advanced-patterns.md)）。安全模型上它是公开端点，**入参校验与鉴权必须写在 action 内部**。

## 部署与选型视角

- Vercel 是第一方平台（ISR/流式 SSR 全功能）；自托管走 Node 服务器或 Docker，部分能力（ISR 再生成）需要平台配合
- 什么时候用：内容站/电商/任何需要 SEO 与首屏的场景；纯后台管理系统 SPA 足够；Next 也能跑（全客户端组件），但只用到了它的路由，没有用到 RSC
- 与 Nuxt 对照：理念高度同构（文件路由/混合渲染/服务端目录），差异在 RSC 这层：React 把渲染拆进组件树，Vue 的组合式模型仍在客户端组件的范围内

## 小结

App Router 的三个要点：**组件默认在服务端**（`'use client'` 是少数派边界），**缓存默认全开**（靠 revalidate 主动失效），**数据读写都有内建通路**（RSC 直取 + Server Actions 直写）。部署细节见[部署与前端监控](../engineering/05-deploy-and-monitoring.md)。
