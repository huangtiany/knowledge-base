---
title: React 进阶：复合组件、Suspense 与并发
date: 2026-09-06
tags: [React生态]
summary: 从「会用 Hooks」到「设计组件」：复合组件模式、Portal 与 Error Boundary 两个边界能力、Suspense 的加载态收敛，以及 useTransition/useDeferredValue 的并发调度——React 的上半场补全。
---

Hooks 的日常用法在[核心篇](01-react-core-hooks.md)，状态工具选型在[状态管理](02-react-state.md)。这篇补齐剩下的进阶面：**组件设计模式**（复合组件）、**两个边界能力**（Portal、Error Boundary）、**加载态的收敛方案**（Suspense）与**并发调度**（useTransition/useDeferredValue）。这些概念同时是读懂现代 React 生态（组件库、Next.js）的门票。

## 复合组件：库级 API 的标准形态

组件库的 `<Tabs>` / `<Select>` 之所以好用，是因为它们把多个子部件组合成一个语义整体——这就是复合组件模式：

```jsx title="Modal.jsx"
import { createContext, useContext } from "react";

const ModalContext = createContext(null);

export function Modal({ open, onClose, children }) {
  return (
    <ModalContext.Provider value={{ open, onClose }}>
      {open && createPortal(                       // Portal：渲染到 body，脱离层叠上下文
        <div className="modal-mask">{children}</div>,
        document.body,
      )}
    </ModalContext.Provider>
  );
}

Modal.Title = function Title({ children }) {
  const { onClose } = useContext(ModalContext);    // 子部件共享父级状态，无需层层传 props
  return <header>{children}<button onClick={onClose}>×</button></header>;
};

// 调用方：API 自带结构语义
<Modal open={open} onClose={close}>
  <Modal.Title>确认操作</Modal.Title>
  <p>内容…</p>
</Modal>
```

- 复合组件的本质是「**Context + 命名空间导出**」：子部件通过 Context 拿父级状态，调用方按需拼装——比一个十几个 props 的大组件可读得多
- 受控与非受控的双形态也在这层设计（`value/onChange` 外部掌控 vs `defaultValue` 内部自治），表单类组件两种都提供是行业惯例

## Portal 与 Error Boundary：两个边界能力

- **Portal**（`createPortal(children, domNode)`）：事件冒泡沿 React 树而非 DOM 树——Modal 渲染到 body 之外，仍能被父级 Provider 覆盖。是[上面 Modal](#) 与 Toast、Tooltip 的地基
- **Error Boundary**：子组件渲染期错误不至于掀翻整页。React 仍要求 **class 组件**实现（或直接用 `react-error-boundary` 库）：

```jsx title="error-boundary.jsx"
<ErrorBoundary fallback={<p>图表加载失败</p>} onReset={refetch}>
  <Chart data={data} />          // 渲染期抛错 → 显示 fallback，其余区域不受影响
</ErrorBoundary>
```

注意边界：Error Boundary 只捕获**渲染期**错误，事件回调、异步任务里的 try/catch 仍要自己写。按区域粒度包（图表一块、评论区一块），而不是整页一个。

## Suspense：加载态的声明式收敛

```jsx title="suspense.jsx"
const Chart = lazy(() => import("./Chart"));      // 代码分割 + 懒加载

<Suspense fallback={<Skeleton />}>
  <Chart />
</Suspense>
```

- `React.lazy` + `Suspense` 是组件级代码分割的标准姿势，与路由级分割（[构建篇](../engineering/01-modules-and-vite.md)）配合使用
- Suspense 的深层价值是**把「等数据」从命令式（isPending 三元表达式）变成声明式**：子组件渲染中就自动显示 fallback。这个机制在 Next.js 的流式 SSR 里是主角——服务端可以把慢的部分流式补发，见[Next.js](04-nextjs.md)

## 并发调度：useTransition 与 useDeferredValue

React 18 的并发特性回答一个问题：**重渲染排队时，怎么让输入不掉帧？**

```jsx title="concurrency.jsx"
function SearchBox() {
  const [input, setInput] = useState("");
  const [query, startTransition] = useTransition();

  function onChange(e) {
    setInput(e.target.value);                      // 紧急更新：输入框立即响应
    startTransition(() => setQuery(e.target.value));  // 非紧急：列表重渲染可被插队打断
  }
  return (
    <>
      <input value={input} onChange={onChange} />
      <Results query={query} />                    {/* query 更新慢一拍，但输入永远跟手 */}
    </>
  );
}
```

- **useTransition**：把状态更新标记为「可中断的低优先级」，紧急输入先走；`isPending` 可用于显示旧内容过渡态
- **useDeferredValue(value)**：同一件事的另一种写法——「给我这个值的延迟版本」，适合子组件侧的展示延迟，不用包更新逻辑
- 两者都只影响调度顺序不减少计算量；真正的算力优化还是[性能篇](../performance/01-performance-metrics.md)那一套

## 下一代 API 一览

React 19 的方向是**表单与异步的进一步内建**：`useActionState`（表单提交状态）、`useOptimistic`（乐观更新）、`use()`（在渲染中读取 Promise）。它们与 Server Components/Server Actions 一起构成 Next.js App Router 的底座——细节归入[Next.js 篇](04-nextjs.md)，这篇只立标签：**React 正在从「客户端渲染库」演化成「全栈 UI 框架」**。

## 小结

进阶面的主线：**复合组件管 API 设计，Portal/Error Boundary 管边界，Suspense 管等待，并发管优先级**。这些机制的舞台在元框架里被进一步放大——下一站 [Next.js](04-nextjs.md)。
