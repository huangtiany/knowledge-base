---
title: Vue 还是 React：框架选型对比
date: 2026-09-06
tags: [Vue生态, React生态]
summary: Vue 与 React 的选型对比：模板响应式与 JSX 重渲染两种心智模型的差异，外加生态、类型与团队维度的选型清单。
---

先承认一个前提：**两个都是成熟答案，分歧在心智模型**。下文从心智模型、上手曲线、生态配套、类型支持四个方面对照两者，最后给一份可执行的选型清单。各自的细节进阶见[Vue 3 核心](../vue/01-vue3-core.md)与[React 核心](../react/01-react-core-hooks.md)。

## 心智模型：响应式追踪 vs 不可变重渲染

这是全部分歧的根源：

```vue title="Counter.vue"
<script setup>
import { ref } from "vue";
const count = ref(0);
</script>

<template>
  <button @click="count++">{{ count }}</button>
  <!-- 依赖被精确追踪：count 变了，只重渲染绑定它的那一小段 -->
</template>
```

```jsx title="Counter.jsx"
import { useState } from "react";
export default function Counter() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(count + 1)}>{count}</button>;
  // 状态不可变：setCount 触发整个组件函数重新执行，再 diff 出最小 DOM 改动
}
```

- **Vue：响应式追踪**。数据被 Proxy 包装，改哪个字段，哪个字段对应的视图就更新，属于「细粒度自动追踪」，写法接近理想化的 HTML + 数据绑定
- **React：不可变 + 重渲染**。状态必须换新对象（`setCount(count + 1)` 而非 `count++`），组件函数整体重跑，靠 Virtual DOM diff 收敛出真实 DOM 改动，即「粗粒度重渲染 + 精确 diff」
- 对照来看：Vue 的优化发生在「更新什么」的判定层；React 把更新判定交给不可变纪律，优化靠 `useMemo`/`useCallback` 手动完成

## 上手曲线：渐进式 vs 函数式

- **Vue**：模板 + 指令（`v-if/v-for/v-model`）对从 HTML/CSS 转来的人最友好；单文件组件把结构/逻辑/样式放一个文件；可以渐进引入（老页面里挂一个组件都行）。中文文档质量极高，自学友好
- **React**：起点是「UI = f(state)」的函数式思维，JSX 让模板回到 JS 表达式；学习材料以 Hooks 为中心（官方文档 Learn 区块质量极高），但 `useEffect` 的心智模型、不可变更新这些点需要花时间掌握
- 坦率的经验：**有后端语言背景或函数式偏好，React 的纯 JS 环境更合适；重视模板直观与团队上手速度，Vue 更快**

## 生态配套：对照表

| 维度 | Vue | React |
|---|---|---|
| 状态管理 | Pinia（官方推荐） | Redux Toolkit / Zustand |
| 路由 | Vue Router（官方） | React Router / TanStack Router |
| 元框架 | Nuxt | Next.js |
| 服务端渲染 | Nuxt 直出 | Next.js App Router + RSC |
| 移动端 | 同系 Vue Native 存在感弱 | React Native 成熟 |

生态规模 React 占优（职位量、第三方库、AI 生成代码的语料），Vue 的优势是**官方套件的整齐**：状态、路由、SSR 都有官方答案，选型分歧少。

## 类型支持：都已够用，路径不同

- **React**：TSX 天然亲和 TS，社区默认 TS 起步，类型层生态（表单、查询库的泛型）更厚
- **Vue 3**：`<script setup lang="ts">` 后体验大幅进步，defineProps 泛型、模板里的类型收窄都可用；复杂泛型组件在模板侧的表达力仍略逊于 TSX
- 两者都已能满足「TS 优先」的工程要求，差别只在高阶泛型场景的体验

## 选型清单

按顺序问四个问题：

1. **团队现状**：团队已熟哪个、招聘市场要哪个，迁移成本与人才供给是硬约束
2. **项目形态**：内容站/中小应用用哪个都合适；重交互大型应用 React 生态储备更足；需要 SEO 的营销页 + 应用混合体，Nuxt/Next 二选一
3. **长期维护**：Vue 官方套件版本一致性好；React 靠社区事实标准演进（跟着 Next.js 的节奏走）
4. **个人发展**：两个心智模型都掌握的前端，市场价值高于只深入一个的；本站（Astro）组件层可以自由混用两者，正好同时实践

## 小结

心智模型决定日常体验，生态与团队决定工程上限。差异源于「响应式追踪 vs 不可变重渲染」两种模型；理解了这一层，切换框架的边际成本比想象中低。进阶各自的核心机制：[Vue 3 核心](../vue/01-vue3-core.md) / [React 核心](../react/01-react-core-hooks.md)。
