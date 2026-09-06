---
title: 作用域、闭包与原型链
date: 2026-09-06
tags: [JavaScript]
summary: JS 语言核心的三张底牌：作用域决定变量可见性，闭包是函数记住出生地的能力，原型链是对象找属性的路线——天天在用，这篇把它们讲清楚。
---

这三个概念是面试与实际 bug 的最大重合区：防抖函数靠闭包，`this` 指向错乱源于作用域与绑定规则，`instanceof` 失灵源于原型链。天天在用，但很多环节「知其然不知其所以然」。这篇按「变量怎么找到 → 函数怎么记住 → 对象怎么继承」的顺序把三张底牌理清楚。

## 作用域：变量的可见边界

JS 采用**词法作用域**（静态作用域）：函数能访问哪些变量，由它**写在哪里**决定，与谁调用它无关。

```js title="scope.js"
let count = 0;                 // 模块顶层作用域

function outer() {
  const msg = "hello";         // outer 的函数作用域
  if (true) {
    let inner = "block";       // let/const 块作用域 —— {} 就是一道边界
    var legacy = "function";   // var 无视块，只认函数
  }
  // console.log(inner);      // ReferenceError：let 出了块就不可见
  function closure() { return `${msg}:${count}`; }  // 沿着书写位置向外找
  return closure;
}
```

规则收拢成三条：

- **let/const 是块作用域**，`{}` 就是边界；var 是函数作用域且存在变量提升（声明提前、赋值不提前），这是历史包袱，新代码一律 let/const
- **let/const 也有 TDZ（暂时性死区）**：声明前访问直接抛错，不像 var 只是 `undefined`——这是好事，错误更早暴露
- **作用域链沿书写位置向外**，一层层找到全局为止；这就是闭包能「记住」外部变量的原因

## 闭包：函数记住出生地

闭包 = 函数 + 它出生时的作用域引用。函数被传到别处调用，依然能读写出生地的变量——这是 JS 实现「私有状态」与「函数工厂」的底层机制。

```js title="closure.js"
function createCounter() {
  let n = 0;                    // 外部摸不到的私有变量
  return {
    inc: () => ++n,
    get: () => n,
  };
}
const c = createCounter();
c.inc(); c.inc();
c.get();                       // 2 —— n 一直活着，因为被返回的函数引用着

// 防抖：闭包存 timer，多次调用共享同一个
function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}
```

两个工程注意点：

- 闭包引用的大对象不释放就是内存泄漏的温床——事件监听器卸载时记得 `removeEventListener`，定时器记得清除
- 循环里 `var i` 配回调的经典坑（打印全是最后值）根源是 var 没有块作用域；换 `let i` 后每轮迭代都是新绑定，坑自动消失

## this：不是作用域，是调用方式

`this` 与词法作用域无关——它由**函数怎么被调用**决定，规则按优先级只有四条：

```js title="this.js"
const obj = {
  name: "obj",
  say() { console.log(this?.name); },
};

obj.say();                     // "obj"   —— 隐式绑定：谁点出来 this 是谁
const loose = obj.say;
loose();                       // undefined —— 脱离对象调用，非严格模式回退 window/globalThis
say.call(obj);                 // "obj"   —— 显式绑定：call/apply/bind 强行指定
new Person();                  // —— new 绑定：this 指向新构造的对象

const arrow = () => console.log(count);
// 箭头函数没有自己的 this：沿词法作用域用外面的，call/apply 也改不动
```

记忆抓手：**普通函数看调用点，箭头函数看出生点**。回调里丢 `this`（`setTimeout(this.tick)`）的通用解法就是换成箭头函数或 `bind`。React 类组件时代满屏的 `.bind(this)` 就是在补这条规则的坑——Hooks 时代函数组件 + 箭头函数让 `this` 基本退出了日常代码，但读懂老代码仍绕不开。

## 原型与原型链：对象找属性的路线

访问 `obj.x` 而 obj 上没有时，JS 沿 `__proto__`（原型）向上找，一路到 `null` 为止——这条路线就是原型链：

```js title="prototype.js"
const animal = { eat() {} };
const dog = Object.create(animal);   // dog 的原型指向 animal

dog.eat();                           // 自己没有 → 找 animal → 命中
dog.hasOwnProperty("eat");           // false：属性在原型上，不在自己身上

class Dog extends Animal {}          // class 是原型机制的语法糖
new Dog() instanceof Dog;            // instanceof 沿原型链查找构造函数的 prototype
```

要点收拢：

- **class 不是新机制**，是原型的语法糖；`extends/super` 对应原型链挂接
- `Object.create(null)` 造出「纯对象」（无原型），常用于安全字典场景
- `instanceof` 的本质是查链，所以跨 iframe/跨 realm 的对象会失灵（各有一套原型）；更稳的判断是 `Array.isArray`
- 属性查找有成本且可被原型污染攻击——不要往 `Object.prototype` 上挂东西

## 小结

三张底牌串成一句话：**作用域链决定变量去哪找，闭包把这条链随身携带，原型链决定属性去哪找**。理解到这个层面，防抖/节流、`this` 丢失、`instanceof` 失灵这些「现象级 bug」都能直接推演出来。语法层的日常工具下一盘：[ES6+ 与模块化](02-es6-plus-and-modules.md)；异步世界的单线程模型则在[事件循环](03-async-and-event-loop.md)里展开。
