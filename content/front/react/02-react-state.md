---
title: React 状态管理：Context、Zustand 与 TanStack Query
date: 2026-09-06
tags: [React生态]
summary: 状态分客户端与服务端两类，先分类再选工具：Context 管低频全局值，Zustand 管共享客户端状态，TanStack Query 管服务端状态。
---

React 生态的状态管理方案很多，选型的第一步是先问：**这是哪类状态？** 客户端状态（UI 开关、草稿、主题）与服务端状态（来自 API、有缓存与失效问题）是两类问题，各有对应的工具。核心机制见[React 核心](01-react-core-hooks.md)，RSC 时代服务端状态的新解法见[Next.js](04-nextjs.md)。

## 先分类：两种状态，两种问题

- **客户端状态**：应用自己拥有的（tab 选中项、弹窗开关、购物车），问题是跨组件共享：props 钻井（层层透传）难以维护
- **服务端状态**：数据的真相在服务器（用户资料、订单列表），问题是缓存与同步：什么时候过期、失败重试、多组件共享同一份数据时的一致性

把服务端状态塞进全局 store 是老项目最常见的过度设计：你要手动维护 loading/error/重新拉取/缓存失效，而这些 TanStack Query 全部内建。**先分类，再选工具。**

## Context：官方的依赖注入，不是状态管理库

```jsx title="Theme.jsx"
const ThemeContext = createContext(null);

function App() {
  const [theme, setTheme] = useState("light");
  const value = useMemo(() => ({ theme, setTheme }), [theme]);  // 避免每帧新对象
  return <ThemeContext.Provider value={value}><Page /></ThemeContext.Provider>;
}

function Button() {
  const { theme, setTheme } = useContext(ThemeContext);
  return <button onClick={() => setTheme(theme === "light" ? "dark" : "light")}>{theme}</button>;
}
```

Context 的定位是**低频更新的全局值**（主题、当前语言、登录用户）：它解决「跨层级传递」，不解决「细粒度订阅」，**Provider 的 value 一变，所有消费组件全部重渲染**。高频业务数据走 Context 会有明显的性能问题，这正是 Zustand/TanStack Query 存在的理由。

## Zustand：极简客户端状态

```js title="stores/cart.js"
import { create } from "zustand";

export const useCartStore = create((set, get) => ({
  items: [],
  addItem: (item) => set((s) => ({ items: [...s.items, item] })),  // 不可变更新
  count: () => get().items.length,
}));

// 组件里：selector 订阅切片，只有该切片变化才重渲染
function CartBadge() {
  const count = useCartStore((s) => s.items.length);
  return <span>{count}</span>;
}
```

- **没有 Provider、没有 reducer 样板**：用 `create` 定义一个 hook 即可，组件任意处 `useCartStore(selector)` 直连
- **selector 决定重渲染范围**：不传 selector 订阅整个 store（任何字段变都重渲染），传了只订切片
- 中间件生态够用：`persist`（localStorage 持久化，注意与[浏览器存储](../browser/02-http-cache-and-storage.md)的安全边界）、`devtools`（时间旅行调试）
- 对比 Redux Toolkit：RTK 的价值在强约定（slice/action/thunk）适合大团队统一；Zustand 胜在没有样板，中小项目首选

## TanStack Query：服务端状态的事实标准

```jsx title="todos.jsx"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

function TodoList() {
  const qc = useQueryClient();
  const { data, isPending, error } = useQuery({
    queryKey: ["todos", filter],                 // 缓存身份：数组键，参数变化=新缓存
    queryFn: () => api.getTodos(filter),
    staleTime: 60_000,                           // 60s 内视作新鲜，不重发请求
  });

  const toggle = useMutation({
    mutationFn: (todo) => api.toggleTodo(todo.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["todos"] }),  // 让相关缓存失效→自动重取
  });
  // ...
}
```

Query 的核心贡献是把服务端状态的繁琐处理变成配置项：**缓存（queryKey 身份化）、去重（同 key 并发请求只发一次）、过期重取（staleTime/refetchOnWindowFocus）、失败重试（retry 指数退避）**。写业务代码只剩「声明这份数据怎么来、失效后怎么更新」，关键在 `invalidateQueries`：**不手动维护缓存，只声明失效**。分页/无限滚动有 `useInfiniteQuery`，乐观更新有 `onMutate` 回调。

## React Router：SPA 路由

路由层面 React 的答案是 React Router（v7 已与 Remix 合流，data APIs 与 Next.js 的思路趋同）：

```jsx title="router.jsx"
const router = createBrowserRouter([
  { path: "/article/:id", element: <Article />, loader: async ({ params }) => getArticle(params.id) },
]);
```

核心概念与 [Vue Router](../vue/02-vue-router-pinia.md) 同构（路由表、动态段、嵌套 outlet、懒加载）；v7 的 `loader`（导航时先取数）把「路由即数据边界」的思想带进了 SPA。工程上：单页后台用 createBrowserRouter，全栈/SEO 场景直接用 [Next.js](04-nextjs.md)。

## 决策表

| 状态 | 答案 |
|---|---|
| 组件私有 | `useState`，放最小的公共祖先 |
| 低频全局值（主题/语言/用户） | Context |
| 共享的客户端状态（购物车/草稿） | Zustand（大团队要强约定选 Redux Toolkit） |
| 服务端数据（列表/详情） | TanStack Query（RSC 场景由框架接管） |
| URL 表达的状态（筛选/分页） | 路由参数（query 是天然的共享状态源） |

## 小结

状态管理**先分类再选工具**（客户端 vs 服务端），各工具各司其职：Context 传值、Zustand 共享、Query 缓存、URL 分享。组件层的进阶原语与并发特性见[React 进阶](03-react-advanced-patterns.md)。
