---
title: Vue 组件进阶：插槽、依赖注入与复用体系
date: 2026-09-06
tags: [Vue生态]
summary: 插槽体系传内容、provide/inject 传服务、Teleport/KeepAlive/Suspense 处理边界场景，外加自定义指令、渲染函数与插件，覆盖 Vue 组件复用的完整手段。
---

组件通信的默认答案（props/emit/v-model）在[核心篇](01-vue3-core.md)讲过。组件需要被多处消费、复用时，还需要更多手段：**插槽传内容、依赖注入传服务、内置组件处理边界、指令和渲染函数处理非常规场景**。路由与状态见[Router 与 Pinia](02-vue-router-pinia.md)。

## 插槽体系：把「内容」当 prop 传

```vue title="Modal.vue"
<template>
  <div class="modal">
    <header><slot name="title">默认标题</slot></header>   <!-- 具名插槽 + 回退内容 -->
    <main><slot /></main>                                  <!-- 默认插槽 -->
    <footer><slot name="actions" :close="close">           <!-- 作用域插槽：向调用方传数据 -->
      <button @click="close">关闭</button>
    </slot></footer>
  </div>
</template>

<!-- 调用方 -->
<Modal>
  <template #title>确认删除</template>
  <p>该操作不可撤销。</p>
  <template #actions="{ close }">
    <button @click="confirmThen(close)">确认删除</button>
  </template>
</Modal>
```

- **默认插槽传主体、具名插槽分区、作用域插槽反传数据**。作用域插槽（`#actions="{ close }"`）是其中的关键：子组件提供行为和数据，**模板结构由调用方决定**，表格列渲染、列表项自定义都靠它
- 作用域插槽的进一步用法是「无渲染组件」（只管逻辑、模板全交给插槽）；组合式函数普及后，逻辑复用优先用 composable，无渲染组件用于「模板结构本身需要复用」的少数场景

## 依赖注入：provide/inject 的工程用法

props 一层层往下传叫「props 钻井」，provide/inject 是官方给出的跨层级解法：

```ts title="theme.ts"
export const THEME_KEY: InjectionKey<Theme> = Symbol("theme");  // 带类型的 key

// 祖先：provide 源头是单向数据流的边界
const theme = reactive({ mode: "light" });
provide(THEME_KEY, readonly(theme));        // 注入方拿只读代理，防误改

// 任意后代：
const theme = inject(THEME_KEY)!;           // key 带类型，inject 返回值自动推断
```

使用原则：**provide 的是「服务」不是「数据补丁」**。主题、当前用户、国际化这类全局上下文适合注入；只是隔层传个列表，宁可重组组件层级。更全局的共享进 [Pinia](02-vue-router-pinia.md)，provide/inject 的位置在「组件库内部、pinia 之外」：Element Plus 的表单尺寸注入就是典型。

## 四个内置边界组件：Teleport、KeepAlive、Transition、Suspense

```vue title="builtins.vue"
<Teleport to="body">          <!-- DOM 传送到 body，脱离父级层叠上下文；弹窗/抽屉标配 -->
  <div class="dialog">…</div>
</Teleport>

<KeepAlive>                   <!-- 缓存组件实例：切走不销毁，回来保留状态 -->
  <component :is="activeTab" />
</KeepAlive>                  <!-- 配 include/exclude/max 控制缓存面 -->

<Transition name="fade">      <!-- 进出场动画：只作用于单元素/组件的显隐切换 -->
  <div v-if="visible">…</div>
</Transition>

<Suspense>                    <!-- 处理 async setup 的等待态 -->
  <template #default><AsyncChart /></template>
  <template #fallback><Skeleton /></template>
</Suspense>
```

- **Teleport 解决的是 CSS 问题**（模态框被父级 `overflow`/`z-index` 困住），不是 JS 问题
- **KeepAlive 的代价是内存**，配 `include` 白名单；被缓存组件的生命周期钩子换成 `onActivated/onDeactivated`
- Transition 只管「进出场」，列表动画用 `<TransitionGroup>`；复杂手势动画超出它的职责，交给 CSS 或 [GSAP 类库]

## 自定义指令与渲染函数：非常规场景的两种手段

```ts title="directives/v-focus.ts"
export const vFocus: Directive<HTMLInputElement, boolean | undefined> = {
  mounted(el, binding) { if (binding.value !== false) el.focus(); },
};
// <input v-focus />：指令把「直接操作 DOM」的封装做到模板里
```

指令适合「可复用的 DOM 副作用」（聚焦、拖拽、防抖点击、埋点上报）；数据驱动能解决的都别用指令。渲染函数 `h()` 与 JSX 用在**模板表达不了动态结构**的场景（递归树形组件、按配置生成表单），相当于手动写 Vue 编译器从 `<template>` 生成的代码，日常业务少写，写组件库时会遇到。

## 插件与复用范式选型

```ts title="plugin.ts"
export const analytics = {
  install(app: App, options: Options) {
    app.directive("track", trackDirective);       // 全局指令
    app.provide(ANALYTICS_KEY, createTracker(options));  // 全局注入
    app.config.globalProperties.$track = tracker;  // Options API 兼容层，组合式少用
  },
};
// main.ts: app.use(analytics, { endpoint: "…" })
```

按复用对象选型：

| 要复用什么 | 用什么 |
|---|---|
| 有状态的逻辑（请求、防抖、订阅） | 组合式函数 `useXxx` |
| 模板结构（布局、分区） | 插槽（作用域插槽反传数据） |
| 全局上下文（主题、用户、i18n） | provide/inject 或 Pinia |
| DOM 副作用（聚焦、拖拽） | 自定义指令 |
| 成套的全局能力 | 插件 install |

## 小结

这些手段有一个共同主题：**默认数据流（props/emit）不够用时的扩展点**。插槽扩展「内容」，注入扩展「上下文」，指令扩展「DOM 行为」，渲染函数扩展「结构生成」。Vue 栈搬到服务端就是[Nuxt](04-nuxt.md)。
