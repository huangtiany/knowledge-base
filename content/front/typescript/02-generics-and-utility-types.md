---
title: 泛型与工具类型
date: 2026-09-06
tags: [TypeScript]
summary: 泛型是类型层的函数——把类型当参数传入；内置工具类型是标准库。从 Array<T> 的直觉出发，到 Partial/Pick/Omit 的日常组合，再到条件类型的适度使用。
---

如果说类型标注是「给值贴标签」，泛型就是「写一个类型的函数」：类型作为参数传入，产出适配的类型。`Array<T>` 早就在用它——这篇从直觉出发，过一遍内置工具类型的日常组合，最后给「类型体操」划一条适可而止的线。

## 泛型基础：类型当参数

```ts title="generics.ts"
function first<T>(list: T[]): T | undefined {   // T 由调用处的实参推导
  return list[0];
}
const n = first([1, 2, 3]);       // T 推导为 number，n: number | undefined
const s = first(["a"]);           // T 推导为 string

// 约束：要求 T 至少有 length —— extends 是类型层的"参数校验"
function logSize<T extends { length: number }>(x: T): T {
  console.log(x.length);
  return x;
}
logSize("hello");        // string 有 length ✓
logSize([1, 2]);         // 数组有 length ✓
logSize(42);             // ✗ 编译报错：number 没有 length
```

直觉对应关系：**函数参数 ↔ 类型参数，参数约束 ↔ extends，默认参数 ↔ 泛型默认**（`interface Response<T = unknown>`）。能推导就别手写：显式 `first<number>([1])` 只在推导失败时才需要。

## 内置工具类型：标准库优先于自造

日常九成需求，内置工具类型已经覆盖——**先查标准库再自己写**：

```ts title="utility.ts"
interface Article { id: number; title: string; summary: string; content: string }

type Draft = Partial<Article>;            // 全部可选：新建草稿表单
type Stub = Pick<Article, "id" | "title">;     // 挑字段：列表卡片只需要两列
type WithoutBody = Omit<Article, "content">;   // 去字段：摘要接口不返正文
type TagCount = Record<string, number>;   // 键值字典
type Req = Required<Draft>;               // 全部必填（Partial 的逆操作）

function update(id: number, patch: Partial<Article>) {}  // 补丁式更新：Partial 最常见的用法
update(1, { title: "新标题" });
```

函数相关的两个高频款：

```ts title="functions.ts"
type Handler = (event: Event) => void;
type Args = Parameters<Handler>;        // [event: Event] —— 取函数参数元组
type Ret = ReturnType<Handler>;         // void —— 取返回值类型
```

`Parameters`/`ReturnType` 的价值在「**跟随而非复制**」：包装第三方函数时不必抄它的签名，类型自动同步。

## 类型体操入门：keyof 与映射类型

工具类型本身是用两个原语造出来的——`keyof` 取键的联合，映射类型逐键变换：

```ts title="operators.ts"
type Keys = keyof Article;              // "id" | "title" | "summary" | "content"

// Partial 的定义原形：映射类型 + ? 修饰符
type MyPartial<T> = { [K in keyof T]?: T[K] };

// 实用自造：把所有属性变成 getter 风格
type Getters<T> = { [K in keyof T as `get${Capitalize<string & K>}`]: () => T[K] };
type A = Getters<{ name: string }>;     // { getName: () => string }
```

看懂这段就解开了工具类型的魔法：`[K in keyof T]` 遍历键，`T[K]` 索引访问取值类型，`as` 子句重命名键。条件类型与 `infer` 是再往上一级的原语（`T extends U ? X : Y`，从结构中提取类型），能读懂内置定义即可——**业务代码里手写条件类型的机会非常少**。

## 适度体操：三条工程纪律

1. **类型为使用服务**：当一个类型定义需要注释才能看懂时，它已经在亏本——先写值和逻辑，类型复杂度被动增长
2. **推导优先于声明**：`const config = { port: 3000 }` 的类型是推出来的，只有跨边界的契约（导出、API、props）值得手写
3. **体操的合理出场位是库代码**：泛型组件、类型安全的 API 封装、DSL；业务代码里见到 `infer` 三层嵌套，通常意味着该重构了

配合 CI 的 `tsc --noEmit`（类型检查不产出文件），类型层就能当测试的第一道网用。工程配置见[质量工具链篇](../engineering/02-quality-toolchain.md)。

## 小结

两级台阶收拢：**泛型 = 类型层的函数**（推导优先、extends 做约束），**工具类型 = 标准库**（Partial/Pick/Omit/Record 覆盖日常，Parameters/ReturnType 跟随第三方）。体操原语（keyof、映射、条件类型）用于看懂库与偶尔自造，业务层适可而止。类型扎稳后，把视角切到运行环境——[浏览器渲染原理](../browser/01-rendering-pipeline.md)。
