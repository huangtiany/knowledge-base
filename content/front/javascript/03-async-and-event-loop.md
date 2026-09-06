---
title: 异步与事件循环：Promise 到 async/await
date: 2026-09-06
tags: [JavaScript]
summary: 单线程为什么能不卡：答案在事件循环。宏任务与微任务、Promise 链式规则、async/await 的并发陷阱。
---

JS 是单线程的，却要处理网络请求、定时器、用户输入，「单线程为什么不卡」的答案就是事件循环。下文先讲调度模型，再讲 Promise 的链式规则，最后是 async/await 最容易出错的并发陷阱。多线程的对照可以看后端那篇[多线程与并发](../../backend/java-basics/04-concurrency.md)：Java 用线程池并行，JS 用事件循环并发，思路完全不同。

## 事件循环：调用栈、宏任务与微任务

事件循环的顺序：**执行完同步代码（调用栈清空）→ 清空全部微任务 → 取一个宏任务 → 再清微任务 → 循环**。

```js title="event-loop.js"
console.log("1");
setTimeout(() => console.log("2"), 0);      // 宏任务
Promise.resolve().then(() => console.log("3"));  // 微任务
queueMicrotask(() => console.log("4"));     // 微任务
console.log("5");
// 输出：1 5 3 4 2，微任务永远插队在下一个宏任务之前
```

- **微任务**：Promise.then/catch/finally、queueMicrotask、MutationObserver，当前脚本末尾立刻清空
- **宏任务**：setTimeout/setInterval、I/O、UI 渲染、事件回调，一个一个执行，任务之间可能插入渲染
- 推论：`setTimeout(fn, 0)` 不是「立刻执行」，是「下一轮循环尽快」；同步死循环会同时堵死定时器和渲染（页面卡死的真相）
- 浏览器与 Node 的差异在细节（Node 有阶段划分与 process.nextTick），工程上记住「微任务优先于宏任务」这一条就够用

## Promise：状态机与链式规则

Promise 是一个三态状态机：**pending → fulfilled / rejected，一旦落定不可再变**。链式调用的关键规则是「**每个 then 返回一个新 Promise**」，值一路向后传，错误一路向后抛：

```js title="promise.js"
fetch("/api/user")
  .then((res) => res.json())          // 返回普通值 → 下一个 then 收到
  .then((data) => fetch(`/api/orders/${data.id}`))  // 返回 Promise → 链会等它落定
  .then((res) => res.json())
  .catch((err) => {                   // 捕获链上任何一环的错误（含前面所有 then）
    console.error(err);
    return fallbackData;              // catch 返回值让链"恢复"继续走
  })
  .finally(() => hideLoading());      // 不改值，只做清理
```

四个静态方法按语义记，不用背：

| 方法 | 全部落定？ | 谁的结果 |
|---|---|---|
| `Promise.all` | 全部成功才成功 | 任一失败立即失败（一损俱损） |
| `Promise.allSettled` | 等全部结束 | 成败都要，逐项给状态 |
| `Promise.race` | 第一个落定就定 | 成败都算，先到先得 |
| `Promise.any` | 第一个成功就定 | 全失败才失败（AggregateError） |

常见用法：互不依赖的请求用 `all` 并行；「全部结果都要、单个失败不中断」用 `allSettled`；「请求 + 超时竞争」用 `race`。

## async/await：语法糖下的两条纪律

async/await 是 Promise 的语法糖：`await` 后面跟 Promise 就「等它落定」，函数体内写起来像同步代码：

```js title="async.js"
async function loadDashboard() {
  try {
    const [user, notices] = await Promise.all([   // 纪律一：并行别写成串行
      fetch("/api/user").then((r) => r.json()),
      fetch("/api/notices").then((r) => r.json()),
    ]);
    return { user, notices };
  } catch (err) {                   // 纪律二：try/catch 只包必要的段，别一兜到底
    return { user: null, notices: [] };
  }
}
```

两处经典陷阱：

- **循环里的 await 是串行**：`for (...) { await fetch(url) }` 一个等一个；要并发先 `map` 出 Promise 数组再 `Promise.all`。反过来，有顺序依赖或需要限流的场景，串行反而是对的
- **forEach 不等待 await**：`arr.forEach(async () => await …)` 只是发出一堆互不等待的任务；要么 for...of，要么 Promise.all

## 实战：防抖节流、取消与竞态

```js title="patterns.js"
// 竞态保护：防止慢的旧请求覆盖新请求，搜索框标配
let seq = 0;
async function search(q) {
  const id = ++seq;
  const res = await fetch(`/api/search?q=${q}`);
  if (id !== seq) return;           // 已有更新的搜索发起，丢弃本次结果
  render(await res.json());
}

// 请求取消：AbortController（fetch 原生支持）
const ctrl = new AbortController();
fetch("/api/report", { signal: ctrl.signal });
ctrl.abort();                       // 组件卸载/用户取消时调用
```

- **竞态**：同一接口的并发请求，结果乱序到达，用序号比对或 AbortController 二选一处理，搜索/联想输入必备
- **防抖节流**：防抖「停止触发才执行」（搜索联想），节流「固定频率执行」（滚动/resize），实现见[闭包篇](01-scope-closure-prototype.md)
- 把防抖与竞态保护组合起来，就是本站搜索框的完整实现：防抖 500ms + 竞态保护

## 小结

事件循环回答「单线程为什么不卡」，Promise 的状态机与链式规则回答「异步代码怎么组织」，async/await 提供可读性，但**并行与串行的判断永远要自己做**。网络与缓存层面的异步优化见[HTTP 缓存与浏览器存储](../browser/02-http-cache-and-storage.md)；卡顿的度量与治理见[性能优化](../performance/01-performance-metrics.md)。
