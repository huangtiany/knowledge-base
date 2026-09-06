---
title: Vue Router 与 Pinia：路由与状态管理
date: 2026-09-06
tags: [Vue生态]
summary: SPA 的两大基础设施：Router 把 URL 变成状态源，Pinia 把跨组件状态收拢成组合式函数——守卫做鉴权、懒加载做分包、持久化做记忆，落地用法一篇收拢。
---

Vue 生态的官方全家桶里，Router 和 Pinia 是除核心之外必装的两件：**Router 解决「URL ↔ 界面」的映射**（刷新不丢、可分享、可前进后退），**Pinia 解决「跨组件状态放哪」**。这篇按「装上就用的主干 + 真实项目里的高频配置」展开。核心机制见[Vue 3 核心](01-vue3-core.md)，服务端渲染下的路由与状态进阶在[Nuxt](04-nuxt.md)。

## 路由基础：把 URL 变成组件树

```ts title="router/index.ts"
import { createRouter, createWebHistory } from "vue-router";

export const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: "/", component: () => import("@/views/Home.vue") },       // 懒加载：按路由分包
    { path: "/article/:id", name: "article",                          // 动态段 params
      component: () => import("@/views/Article.vue") },
    { path: "/admin", component: AdminLayout,                         // 嵌套路由：父出 <router-view>
      children: [
        { path: "posts", component: Posts },       // /admin/posts
        { path: "", redirect: "/admin/posts" },    // 默认子路由
      ] },
    { path: "/:pathMatch(.*)*", component: NotFound },                // 404 兜底
  ],
});
```

- **组件内取参**：`useRoute()` 读（`route.params.id`、`route.query.q`），`useRouter()` 写（`router.push({ name: "article", params: { id } })`)——push 传对象比拼字符串可靠（自动编码、类型可查）
- **`/article/1` 与 `/article/1?tab=comments` 是同一路由不同 query**：组件默认复用（不重新挂载），依赖 query 的逻辑用 `watch(() => route.query, …)` 而不是 onMounted——这是复用机制下的高频坑
- 懒加载写法（`() => import()`）从第一个业务路由就该用，Vite 会自动按路由切分包，对应[性能篇](../performance/01-performance-metrics.md)的代码分割手段

## 导航守卫：鉴权与拦截的标准位置

```ts title="guards.ts"
router.beforeEach(async (to) => {
  const auth = useAuthStore();                        // 守卫里用 Pinia：登录态是全局状态
  if (to.meta.requiresAuth && !auth.isLoggedIn) {
    return { name: "login", query: { redirect: to.fullPath } };  // 记住来路，登录后跳回
  }
});
// 路由元信息：routes 里声明 { path: "/admin", meta: { requiresAuth: true } }
```

守卫分三层：`router.beforeEach` 全局（鉴权、埋点）、路由配置里的 `beforeEnter`（单条路由）、组件内 `onBeforeRouteLeave`（未保存提醒）。**业务上九成的守卫需求是全局一条 beforeEach + meta 声明**，别把鉴权逻辑散到各页面组件里。

## Pinia：store 就是组合式函数

Pinia 的 store 写法直接复用组合式 API 的心智：

```ts title="stores/articles.ts"
import { defineStore } from "pinia";

export const useArticlesStore = defineStore("articles", () => {
  // state
  const list = ref<Article[]>([]);
  const loading = ref(false);
  // getter：派生值，有缓存
  const byId = computed(() => new Map(list.value.map((a) => [a.id, a])));
  // action：同步异步都行
  async function fetchAll() {
    loading.value = true;
    try { list.value = await api.getArticles(); } finally { loading.value = false; }
  }
  return { list, loading, byId, fetchAll };
});
```

两个高频细节：

- **解构会丢响应性**：`const { list } = store` 拿到的是快照值；要解构用 `const { list } = storeToRefs(store)`（方法不用包，直接解构）
- **store 之间可以互相 use**：登录 store 里调 `useUserStore()` 拉资料、路由守卫里调 auth store——Pinia 没有 module 层级，扁平注册、按需引入，这正是它取代 Vuex 的原因（没有 mutation、天然 TS 推导、DevTools 完整支持）

## 持久化与状态恢复

刷新丢状态是 SPA 的默认行为，需要「记忆」的状态（登录 token、主题偏好）做持久化：

```ts title="persistence.ts"
import piniaPluginPersistedstate from "pinia-plugin-persistedstate";
pinia.use(piniaPluginPersistedstate);
// store 定义里： { persist: { pick: ["token", "theme"], storage: localStorage } }
```

注意与[浏览器存储](../browser/02-http-cache-and-storage.md)的选型边界：持久化插件底层就是 localStorage，只适合小体量偏好数据；敏感凭证要考虑 XSS 面（localStorage 可被脚本读，HttpOnly Cookie 更安全——那需要后端配合）。

## 小结

Router 与 Pinia 的分工一句话：**URL 是可分享的状态源，store 是可共享的状态源**——路由参数决定「看什么」，store 决定「拿什么看」。守卫是两者交汇点（读状态、控导航）。骨架齐了之后，把这套栈搬到服务端就是[Nuxt](04-nuxt.md)；组件复用与高级原语见[组件进阶](03-vue-component-patterns.md)。
