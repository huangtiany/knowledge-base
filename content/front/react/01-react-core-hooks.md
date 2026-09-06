---
title: React 核心：组件、JSX 与 Hooks
date: 2026-09-06
tags: [React生态]
summary: React 的渲染模型是 UI = f(state)：不可变状态驱动重渲染，Hooks 给函数组件全部能力。JSX 与 key 的规则、useState/useEffect 的用法、不可变更新与重渲染优化。
---

React 的渲染模型是 **UI = f(state)**：界面是状态到描述的纯函数映射，状态变了就重算一遍，diff 出最小 DOM 改动。这决定了它与 Vue 不同的写法纪律：状态不可变、组件函数随时会重跑。选型对比见[框架选型对比](../framework/00-vue-or-react.md)，本文聚焦机制与 Hooks 的用法。

## JSX 与渲染：回到 JS 表达式

```jsx title="List.jsx"
export default function TodoList({ todos, user }) {
  return (
    <div className="list">                      {/* className 不是 class：贴近 DOM API */}
      <h2>{user.name} 的清单</h2>
      {todos.length === 0 && <p>暂无事项</p>}
      <ul>
        {todos.map((t) => (
          <li key={t.id}>                       {/* key 是列表项的标识 */}
            {t.done ? <s>{t.title}</s> : t.title}
          </li>
        ))}
      </ul>
    </div>
  );
}
```

- JSX 编译成 `createElement` 调用，本质是「用 JS 写模板」：条件用 `&&`/三元、列表用 `map`，没有指令层
- **key 标识元素身份**：diff 算法靠它匹配每个元素。用数组下标当 key，插入/排序时 React 会匹配错元素，典型症状是输入框内容错位；key 要用业务唯一 id

## 组件与 Props：单向数据流

```jsx title="Dialog.jsx"
function Dialog({ title, children, onClose }) {   // children 就是插槽
  return (
    <div className="modal">
      <header>
        <h3>{title}</h3>
        <button onClick={onClose}>×</button>
      </header>
      {children}
    </div>
  );
}
// 组合优于继承：React 没有 extends 组件的写法，复用靠组合与自定义 Hook
```

Props 是只读契约：**数据只能从父流向子，子要改就调父传下来的回调**。这条单向数据流纪律让数据变化的源头唯一，排查 bug 时只需沿着回调链向上找。

## Hooks 基础：useState、useEffect 与依赖数组

```jsx title="Search.jsx"
import { useState, useEffect } from "react";

export function Search({ keyword }) {
  const [results, setResults] = useState([]);

  useEffect(() => {
    const ctrl = new AbortController();
    fetch(`/api/search?q=${keyword}`, { signal: ctrl.signal })
      .then((r) => r.json())
      .then(setResults);
    return () => ctrl.abort();        // 清理函数：下一次 effect 前与卸载时执行
  }, [keyword]);                      // 依赖数组：keyword 变了才重新执行

  return <ul>{results.map((r) => <li key={r.id}>{r.title}</li>)}</ul>;
}
```

- `useState` 返回 `[值, setter]`；**setter 触发的不是赋值，而是重新渲染请求**，这是理解 Hooks 行为的前提
- `useEffect` 的作用是**同步状态与外部系统**（网络、订阅、定时器、DOM）。依赖数组声明哪些状态变化需要重新同步；返回的清理函数处理取消与释放
- 常见误区：把 useEffect 当生命周期钩子拆解（didMount/didUpdate 各写一个）。正确视角是把它看作一组同步逻辑加上它的依赖，卸载只是清理的一种触发时机
- 请求竞态的解法与[异步篇](../javascript/03-async-and-event-loop.md)一致：AbortController 或序号比对，写在清理函数里

## 不可变更新：为什么不能直接改

```jsx title="immutable.jsx"
// ✗ 直接改：引用没变，React 认为"没变化"，不触发重渲染
todos.push(newTodo);
user.name = "新名字";

// ✓ 换新引用：数组用展开/过滤，对象用展开
setTodos([...todos, newTodo]);
setTodos(todos.filter((t) => t.id !== id));          // 删
setTodos(todos.map((t) => (t.id === id ? { ...t, done: true } : t)));  // 改
setUser({ ...user, name: "新名字" });
```

React 靠 `Object.is` 比较引用决定要不要重渲染，**突变式修改会让比较失效**。深层嵌套改一个字段要一路展开，麻烦时用 Immer（写突变语法，产出不可变更新）。这条纪律与 Vue 的 Proxy 自动追踪是同一个问题的两种解法：React 把追踪成本换成了写法纪律。

## 重渲染边界与性能优化

**父组件重渲染默认带动全部子组件重渲染**（重新执行函数 + diff），多数场景无需处理，热点路径上用三个手段：

```jsx title="memo.jsx"
const Row = memo(function Row({ item, onSelect }) { /* ... */ });  // props 浅比较不变则跳过

function Toolbar({ onReset }) {
  const onResetStable = useCallback(() => reset(), []);   // 回调引用稳定，memo 的浅比较才不会失效
  const theme = useMemo(() => computeTheme(config), [config]);  // 昂贵推导才缓存
  return <Row item={item} onSelect={onResetStable} />;
}
```

- **先量再优**：React DevTools Profiler 看哪段在频繁重渲染，绝大多数场景 setState 触发的重渲染根本不值得优化
- `useMemo/useCallback` 本身有成本与依赖负担，默认不写；出现「传给 memo 子组件的回调每帧变化」这类证据再加
- 状态该下沉就下沉（放最小的公共祖先），该上提才上提；组件树结构合理，可避免大部分无谓的重渲染

## 小结

React 的写法纪律源自**不可变状态驱动重渲染**；Hooks 让函数组件具备状态、副作用、上下文与缓存的全套能力。对照 Vue 的 Proxy 自动追踪来理解，两者的差异更清楚。延伸阅读：[官方中文文档](https://zh-hans.react.dev/)的 Learn 区块；渲染开销的底层机制见[浏览器渲染原理](../browser/01-rendering-pipeline.md)。
