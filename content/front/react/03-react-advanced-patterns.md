---
title: React 进阶：复合组件、Suspense 与并发
date: 2026-09-06
tags: [React生态]
summary: 复合组件模式、Portal 与 Error Boundary 两个边界能力、Suspense 的声明式加载处理，以及 useTransition/useDeferredValue 的并发调度。
---

Hooks 的日常用法在[核心篇](01-react-core-hooks.md)，状态工具选型在[状态管理](02-react-state.md)。剩下的进阶内容：**组件设计模式**（复合组件）、**两个边界能力**（Portal、Error Boundary）、**加载态处理**（Suspense）与**并发调度**（useTransition/useDeferredValue）。这些概念也是读懂现代 React 生态（组件库、Next.js）的前提。

## 复合组件：库级 API 的标准形态

组件库的 `<Tabs>` / `<Select>` 之所以好用，是因为它们把多个子部件组合成一个语义整体，这就是复合组件模式：

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

- 复合组件的本质是「**Context + 命名空间导出**」：子部件通过 Context 拿父级状态，调用方按需拼装，比一个十几个 props 的大组件可读得多
- 受控与非受控的双形态也在这层设计（`value/onChange` 外部掌控 vs `defaultValue` 内部自治），表单类组件两种都提供是行业惯例

## Portal 与 Error Boundary：两个边界能力

- **Portal**（`createPortal(children, domNode)`）：事件冒泡沿 React 树而非 DOM 树，Modal 渲染到 body 之外，仍能被父级 Provider 覆盖。Portal 是 Modal、Toast、Tooltip 的实现基础
- **Error Boundary**：捕获子组件渲染期错误，避免整页崩溃。React 仍要求 **class 组件**实现（或直接用 `react-error-boundary` 库）：

```jsx title="error-boundary.jsx"
<ErrorBoundary fallback={<p>图表加载失败</p>} onReset={refetch}>
  <Chart data={data} />          // 渲染期抛错 → 显示 fallback，其余区域不受影响
</ErrorBoundary>
```

注意边界：Error Boundary 只捕获**渲染期**错误，事件回调、异步任务里的 try/catch 仍要自己写。按区域粒度包（图表一块、评论区一块），而不是整页一个。

## Suspense：加载态的声明式处理

```jsx title="suspense.jsx"
const Chart = lazy(() => import("./Chart"));      // 代码分割 + 懒加载

<Suspense fallback={<Skeleton />}>
  <Chart />
</Suspense>
```

- `React.lazy` + `Suspense` 是组件级代码分割的标准姿势，与路由级分割（[构建篇](../engineering/01-modules-and-vite.md)）配合使用
- Suspense 的核心价值是**把「等数据」从命令式（isPending 三元表达式）变成声明式**：子组件渲染中就自动显示 fallback。Next.js 的流式 SSR 用的就是这个机制：服务端可以把慢的部分流式补发，见[Next.js](04-nextjs.md)

## 并发调度：useTransition 与 useDeferredValue

React 18 的并发特性回答一个问题：**重渲染排队时，怎么让输入不掉帧？**

```jsx title="concurrency.jsx"
function SearchBox() {
  const [input, setInput] = useState("");
  const [query, startTransition] = useTransition();

  function onChange(e) {
    setInput(e.target.value);                      // 紧急更新：输入框立即响应
    startTransition(() => setQuery(e.target.value));  // 非紧急：列表重渲染可被高优先级更新打断
  }
  return (
    <>
      <input value={input} onChange={onChange} />
      <Results query={query} />                    {/* query 更新慢一拍，但输入保持响应 */}
    </>
  );
}
```

- **useTransition**：把状态更新标记为「可中断的低优先级」，紧急输入优先处理；`isPending` 可用于显示旧内容过渡态
- **useDeferredValue(value)**：同一需求的另一种写法，取这个值的延迟版本，适合子组件侧的展示延迟，不用包更新逻辑
- 两者都只影响调度顺序，不减少计算量；计算量的优化手段见[性能篇](../performance/01-performance-metrics.md)

## 下一代 API 一览

React 19 的方向是**表单与异步的进一步内建**：`useActionState`（表单提交状态）、`useOptimistic`（乐观更新）、`use()`（在渲染中读取 Promise）。它们与 Server Components/Server Actions 一起构成 Next.js App Router 的基础，细节见[Next.js 篇](04-nextjs.md)。总的趋势：**React 正在从「客户端渲染库」演化成「全栈 UI 框架」**。

## 小结

**复合组件用于 API 设计，Portal/Error Boundary 处理边界，Suspense 处理等待，并发调度处理优先级**。这些机制在元框架里进一步发挥作用，见[Next.js](04-nextjs.md)。
