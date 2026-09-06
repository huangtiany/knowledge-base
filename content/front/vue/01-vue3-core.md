---
title: Vue 3 核心：响应式与组件化
date: 2026-09-06
tags: [Vue生态]
summary: Vue 3 的两个核心机制：Proxy 响应式（解释 ref 为什么需要 .value）与组合式 API（为什么取代 mixins）。组件通信的层级与组合式函数的复用模式。
---

Vue 3 有两个核心机制值得理解透彻：**Proxy 响应式**（解释 `ref` 为什么需要 `.value`）和**组合式 API**（组件复用从 mixin 的混入转向函数组合）。框架选型见[选型对比](../framework/00-vue-or-react.md)，本文聚焦机制。

## 响应式：Proxy 与 ref 的 .value

```js title="reactivity.js"
const state = reactive({ count: 0 });   // Proxy 拦截 get/set
state.count++;                          // set 触发：记录"谁读了它"并通知更新

let count = ref(0);
count.value++;                          // ref 是带 .value 的包装对象
```

- **reactive 用 Proxy 拦截读写**：读时收集依赖（哪个组件/副作用用了这个字段），写时通知它们更新。对比 Vue 2 的 `Object.defineProperty`，新增属性、数组下标、`delete` 都能被追踪（那正是 Vue 2 时代 `Vue.set` 存在的原因）
- **ref 解决的是「原始值无法被代理」**：`let x = 0` 这类原始值没有对象外壳可拦截，所以包一层 `{ value }` 对象再代理。模板里自动解包、JS 里手动 `.value`，这条规则的根源在此
- 经验法则：**状态里对象嵌套深、整体替换少 → reactive；基础类型、需要整体替换（如列表数据）、跨模块导出 → ref**。拿不准就用 `ref`，保持一致

## 组合式 API：setup 与响应式三件套

```vue title="Search.vue"
<script setup lang="ts">
import { ref, computed, watch, onMounted } from "vue";

const query = ref("");
const results = ref<string[]>([]);
const isEmpty = computed(() => results.value.length === 0);  // 派生值：依赖变了才重算

watch(query, async (q) => {           // 副作用：q 变化后执行
  const res = await fetch(`/api/search?q=${q}`);
  results.value = await res.json();
}, { immediate: true });

onMounted(() => { /* DOM 就绪后 */ });
</script>
```

- `ref` 管状态、`computed` 管派生（有缓存，模板里优先用）、`watch`/`watchEffect` 管副作用——三者的分界是「数据怎么来」：直接持有 / 推导出来 / 异步产生
- `<script setup>` 是编译期语法糖：顶层声明的变量自动暴露给模板，组件导入即用，比 Options API 的 data/methods/computed 分箱少一层仪式
- 与 Options API 的取舍：新代码统一用组合式 API，逻辑按「功能」聚合（搜索的状态、请求、副作用在一起），而不是按「选项类型」打散

## 组件通信：props、v-model、插槽与依赖注入

```vue title="communication.vue"
<!-- 父 → 子 -->
<FancyInput v-model="text" placeholder="搜索…" />
<script setup>
const text = ref("");   // v-model 在子组件内展开为 modelValue prop + update:modelValue 事件
</script>

<!-- 子 → 父 -->
<script setup lang="ts">
defineProps<{ modelValue: string }>();
const emit = defineEmits<{ (e: "update:modelValue", v: string): void }>();
</script>
```

按耦合度从低到高选层级：

1. **props / emit**：默认选择，数据流向一目了然
2. **v-model**：表单类组件的对称封装（上面代码就是它的展开形态）
3. **插槽 slot**：传「内容」而不是数据（布局组件、UI 库）
4. **provide / inject**：跨层级注入（主题、当前用户），避免 props 钻井；属于「有意的耦合」，配合 Symbol key 与类型标注使用

事件总线（mitt）在这套体系里已基本不用，跨组件共享状态用 Pinia。

## 全局状态：Pinia 的最小模型

```ts title="stores/counter.ts"
import { defineStore } from "pinia";

export const useCounterStore = defineStore("counter", () => {
  const count = ref(0);                          // state
  const double = computed(() => count.value * 2); // getter
  function inc() { count.value++; }              // action
  return { count, double, inc };
});
```

Pinia（Vue 官方推荐）把组合式 API 直接搬进 store：**ref 即 state、computed 即 getter、函数即 action**，没有 mutation 的仪式。组件里 `const store = useCounterStore()` 即用，DevTools 全程可追踪。什么进 store、什么留在组件内：**跨页面/跨组件树共享的进 store，组件私有的留在组件里**，组件作用域能解决的问题不必搬到全局。

## 复用与性能：组合式函数取代 mixins

复用逻辑的标准姿势是**组合式函数（composable）**：`use` 前缀的普通函数，内部用响应式 API 封装一段可复用逻辑：

```ts title="composables/useDebounceRef.ts"
import { customRef } from "vue";
export function useDebouncedRef(value: string, delay = 300) {
  return customRef((track, trigger) => {
    let timer: number;
    return {
      get() { track(); return value; },              // 收集依赖
      set(v: string) {                               // 防抖后更新
        clearTimeout(timer);
        timer = setTimeout(() => { value = v; trigger(); }, delay);
      },
    };
  });
}
```

对照 mixin 的三个问题（命名冲突、来源不明、类型难标），组合式函数是普通函数调用：**来源在 import 里写着、返回值有类型、内部变量天然私有**。性能侧的常用手段：大列表 `v-for` 配稳定的 `key`、条件渲染 `v-if` 与 `v-show` 按切换频率选、重组件 `defineAsyncComponent` 异步加载、纯展示长列表开 `v-memo`。这些手段的度量前提是渲染原理，见[浏览器渲染原理](../browser/01-rendering-pipeline.md)与[性能优化](../performance/01-performance-metrics.md)。

## 小结

响应式由 Proxy 自动追踪，`ref` 的 `.value` 是代理原始值的必要设计；复用靠函数组合，Pinia 把同样的模式用在全局状态上。配套文档见[官方指南](https://cn.vuejs.org/)与 [Pinia 文档](https://pinia.vuejs.org/zh/)；另一套心智模型的对照见[React 核心](../react/01-react-core-hooks.md)。
