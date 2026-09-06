---
title: ES6+ 与模块化
date: 2026-09-06
tags: [JavaScript]
summary: ES6 是 JS 的分界点：let/const、解构、箭头函数、模块从此定形。2015 之后值得天天用的语法与 ESM 模块系统的要点。
---

2015 年的 ES6 是 JS 的分水岭：此前不少语言缺陷要靠设计模式弥补，此后语法表达直接到位。日常代码里九成的语法都会用到本文列出的内容，偶尔用到的 ES2020+ 新特性也一并收录。重点是提升「这段代码在表达什么」的阅读速度，特性清单不必背。

## 变量与解构：声明即取值

```js title="destructuring.js"
const { id, name = "匿名", ...rest } = user;      // 对象解构 + 默认值 + 收集剩余
const [first, , third] = list;                     // 数组解构，中间位可跳过
const opts = { ...defaults, ...userOpts };         // 展开合并，右侧覆盖左侧

let a = 1, b = 2;
[a, b] = [b, a];                                   // 交换不再需要中间变量
```

解构的工程价值在**函数签名**：`function render({ title, size = "m" })` 让参数自带文档，调用方跳过顺序记忆。展开运算注意它是**浅拷贝**：嵌套对象仍是引用，深拷贝用 `structuredClone()`（2022 年起的内置 API，替代 `JSON.parse(JSON.stringify())` 且能处理更多类型）。

## 函数增强：箭头函数的适用边界

```js title="functions.js"
const double = (n) => n * 2;                 // 表达式体，隐式返回
const makeUser = (name, age = 18) => ({ name, age });  // 返回对象字面量要包括号
function log(tag, ...args) {                 // 剩余参数收成真数组
  console.log(`[${tag}]`, ...args);
}
```

箭头函数两条边界：**没有自己的 `this`/`arguments`**（沿词法作用域取外层的，适合回调和短函数）；**不适合做对象方法与原型方法**（方法里的 this 会指向定义处而非调用者）。需要 arguments 或依赖 this 语义的场景，回到 function 声明。

## 集合与迭代：Map/Set 的使用时机

```js title="collections.js"
const map = new Map([["a", 1], ["b", 2]]);
map.set("c", 3).get("c");          // 键可以是对象/函数：对象字面量做不到

const seen = new Set(ids);          // 数组去重的标准姿势
ids.filter((x) => !seen.has(x));    // Set 的 has 是 O(1)，大数组先转 Set 再查

for (const [key, val] of map) {}    // for...of 遍历"值"（可迭代协议）
for (const key in obj) {}           // for...in 遍历"键名"（含原型链，需 hasOwnProperty 过滤）
```

- **键非字符串用 Map**：数字键、对象键直接上 Map，省掉 `obj[key]` 的隐式转字符串；频繁增删时 Map 性能也优于对象
- **去重/存在性判断用 Set**：别再写 `arr.indexOf(x) !== -1`，`includes` 或 Set 更快更直白
- **for...of 管可迭代，for...in 管对象键**：混用是经典 bug 源：数组的 for...in 会把索引当字符串遍历

## 语法糖三件套：模板串、可选链、空值合并

```js title="syntax.js"
const msg = `用户 ${user.name} 共 ${items.length} 项`;

const city = user?.address?.city;          // 可选链：中间层为 null/undefined 不再深入
const port = config.port ?? 3000;          // 空值合并：只在 null/undefined 时取默认
// config.port || 3000 的陷阱：0、""、false 也会被当成"空"而丢失；数值/布尔场景必须用 ??
```

`?.` 与 `??` 是 2020 年标准（ES2020），如今可放心使用。特别注意 `??` 与 `||` 的差异是真实事故源：音量 0、开关 false 这类合法值会被 `||` 当成假值丢掉。

## 模块系统：ESM 的语法与边界

```js title="modules.js"
// math.js：具名导出 + 默认导出
export const add = (a, b) => a + b;
export default class Calculator {}

// app.js
import Calculator, { add } from "./math.js";   // 默认导出可匿名，具名导出必须同名
```

要点：

- **ESM 是静态结构**：import 必须在顶层、路径是字符串字面量，构建器因此能在打包期做 tree-shaking（摇掉没被 import 的导出）。动态加载用 `import()` 表达式，返回 Promise，是路由懒加载的底层机制
- **与 CommonJS 的本质差异**：CJS 的 `require` 是运行时同步加载、值拷贝（module.exports 整体替换）；ESM 是编译期确定依赖图、值引用（绑定）+ 异步加载。日常影响：ESM 里的循环依赖拿到的是「活引用」，CJS 可能拿到未初始化的空对象
- 浏览器原生支持 ESM（`<script type="module">`），这也是 [Vite 开发态能不打包直跑](../engineering/01-modules-and-vite.md)的前提

## 小结

ES6+ 的主线是**表达能力升级**：解构、箭头函数、模板串消灭样板代码，Map/Set 补齐数据结构，`?.`/`??` 治理空值。模块层的关键词是**静态**：它是 tree-shaking、按需加载、dev 直跑这些工程能力的根。JS 单线程模型下异步如何运转，见[异步与事件循环](03-async-and-event-loop.md)。
