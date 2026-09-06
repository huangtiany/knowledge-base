---
title: 作用域、闭包与原型链
date: 2026-09-06
tags: [JavaScript]
summary: 作用域决定变量的可见范围，闭包让函数访问定义时的外部变量，原型链决定属性的查找路径。防抖、this 丢失、instanceof 失灵这类问题都源于三者的细节。
---

作用域、闭包与原型链分别回答三个问题：变量在哪可见、函数为何能访问外部变量、属性沿什么路径查找。三者对应工程里的高频问题：防抖函数的实现、回调里 `this` 丢失、`instanceof` 判断失灵。下文按此顺序展开。

## 作用域：变量的可见边界

JS 采用**词法作用域**（静态作用域）：函数能访问哪些变量，由它**写在哪里**决定，与谁调用它无关。

```js title="scope.js"
let count = 0;                 // 模块顶层作用域

function outer() {
  const msg = "hello";         // outer 的函数作用域
  if (true) {
    let inner = "block";       // let/const 块作用域：{} 即边界
    var legacy = "function";   // var 无视块，只认函数
  }
  // console.log(inner);      // ReferenceError：let 出了块就不可见
  function closure() { return `${msg}:${count}`; }  // 沿着书写位置向外找
  return closure;
}
```

规则有三条：

- **let/const 是块作用域**，`{}` 就是边界；var 是函数作用域且存在变量提升（声明提前、赋值不提前），这是历史包袱，新代码一律 let/const
- **let/const 也有 TDZ（暂时性死区）**：声明前访问直接抛错，不像 var 只是 `undefined`。错误暴露得更早，这是收益
- **作用域链沿书写位置向外**，一层层找到全局为止；这就是闭包能「记住」外部变量的原因

## 闭包：函数与定义时作用域的绑定

闭包 = 函数本身 + 它定义时所在作用域的引用。函数被传到别处调用，依然能读写定义处的变量，这是 JS 实现「私有状态」与「函数工厂」的底层机制。

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
c.get();                       // 2：n 未被回收，因为被返回的函数引用着

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

- 闭包引用的大对象不释放会造成内存泄漏：事件监听器卸载时记得 `removeEventListener`，定时器记得清除
- 循环里 `var i` 配回调的经典坑（打印全是最后值）根源是 var 没有块作用域；换 `let i` 后每轮迭代都是新绑定，问题消失

## this：由调用方式决定

`this` 与词法作用域无关，由**函数怎么被调用**决定，规则按优先级有四条：

```js title="this.js"
const obj = {
  name: "obj",
  say() { console.log(this?.name); },
};

obj.say();                     // "obj"（隐式绑定：调用者是 obj）
const loose = obj.say;
loose();                       // undefined（脱离对象调用，非严格模式回退 window/globalThis）
say.call(obj);                 // "obj"（显式绑定：call/apply/bind 指定）
new Person();                  // new 绑定：this 指向新构造的对象

const arrow = () => console.log(count);
// 箭头函数没有自己的 this：沿词法作用域用外面的，call/apply 也改不动
```

规则：普通函数的 this 由调用点决定，箭头函数由定义处决定。回调里丢 `this`（如 `setTimeout(this.tick)`）的通用解法是换成箭头函数或 `bind`。React 类组件时代大量出现的 `.bind(this)` 就是在补这条规则；Hooks 时代的函数组件加箭头函数让 `this` 很少出现在日常代码里，但读老代码仍绕不开。

## 原型与原型链：对象找属性的路线

访问 `obj.x` 而 obj 上没有时，JS 沿 `__proto__`（原型）向上查找，直到 `null` 为止，这条路径就是原型链：

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
- 属性查找有成本且存在原型污染风险，不要往 `Object.prototype` 上挂东西

## 小结

作用域链决定变量的查找路径，闭包让函数携带定义时的作用域，原型链决定属性的查找路径。防抖/节流、`this` 丢失、`instanceof` 失灵这类问题都能从这三条机制推演。语法层的日常工具见[ES6+ 与模块化](02-es6-plus-and-modules.md)；异步模型见[事件循环](03-async-and-event-loop.md)。
