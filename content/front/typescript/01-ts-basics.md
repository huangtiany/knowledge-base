---
title: TypeScript 入门：类型标注与收窄
date: 2026-09-06
tags: [TypeScript]
summary: TS 的价值不是写注解，是让重构有信心、提示有精度。基础标注、函数类型、可辨识联合收窄、any/unknown/never 的分工——类型系统的第一级台阶。
---

TS 不是「给 JS 加注释」，它的核心价值有两点：**重构有信心**（改名/改签名时编译器把所有受影响处标红）和**提示有精度**（IDE 补全的每个字段都有依据）。这篇是类型系统的第一级台阶：会标注、会收窄、知道逃生门的代价。

## 基础标注：类型别名优先于接口

```ts title="basics.ts"
type Status = "draft" | "published" | "archived";   // 字面量联合：值域收窄到枚举级

interface Article {
  id: number;
  title: string;
  tags: string[];
  summary?: string;          // 可选属性
  readonly createdAt: Date;  // 只读，赋值期之后不可改
}

const post: Article = { id: 1, title: "TS 入门", tags: ["TypeScript"], createdAt: new Date() };
```

`type` 与 `interface` 九成场景可互换，选择依据一句话：**联合、元组、映射、工具类型用 type；对象形状 + 声明合并（如给 window 补字段）用 interface**。团队里统一一种直觉比纠结差异更重要。

数组与对象的其他常用形态：

```ts title="collections.ts"
let ids: number[] = [1, 2];
let pair: [string, number] = ["age", 18];        // 元组：长度与每位类型都固定
let dict: Record<string, number> = { a: 1 };     // 键值结构
let maybe: string | null = null;                 // 联合类型表达"可能没有"
```

## 函数类型：参数、返回值与"别乱标"

```ts title="functions.ts"
function render(art: Article, size: "s" | "m" | "l" = "m"): string {
  return `${art.title} (${size})`;
}

type Renderer = (art: Article) => string;   // 函数类型别名，常用于回调参数
const list: { map: Renderer } = { map: render };

// 声明式回调：不标也行（上下文推导），导出函数必须标——它是契约
export function transform(art: Article): Article { return { ...art, title: art.title.trim() }; }
```

原则：**导出的函数、公共 API 标注；局部变量与内联回调让编译器推导**。到处手动标注是入门期最常见的过度行为，推导本身就是 TS 的核心能力。

## 类型收窄：联合类型怎么"变窄"

联合类型（`string | number`）在使用处必须先收窄，TS 会沿控制流自动判断：

```ts title="narrowing.ts"
function format(value: string | number | Date) {
  if (typeof value === "string") return value.trim();      // typeof 收窄
  if (value instanceof Date) return value.toISOString();   // 类收窄
  return value.toLocaleString();                            // 这里只剩 number
}

// 可辨识联合：用共同字面量字段做"标签"，switch 自动收窄 —— 建模状态机的标准姿势
type State =
  | { status: "loading" }
  | { status: "ok"; data: Article[] }
  | { status: "error"; message: string };

function view(state: State) {
  switch (state.status) {
    case "ok":      return state.data;        // 只有这个分支有 data
    case "error":   return state.message;     // 只有这个分支有 message
    case "loading": return "加载中…";
  }
}
```

可辨识联合是日常收益最高的一招：接口状态（loading/ok/error）建模成联合后，**漏处理某个分支编译器直接报错**，比 if-else 加注释可靠一个量级。

## any / unknown / never：逃生门的分级

```ts title="escapes.ts"
let a: any = JSON.parse(text);    // 全知全能：关掉所有检查，传染给每一处使用
let u: unknown = JSON.parse(text); // 收着版的 any：用之前必须收窄/断言
if (typeof u === "object" && u !== null) { /* 这里面才能当对象用 */ }

function fail(): never { throw new Error("boom"); }  // 永不正常返回：兜底分支的类型
```

- **any 是断电**：类型检查对它完全失效，且像病毒一样顺着赋值传播。代码库里 any 越少，重构越敢动手
- **unknown 是带锁的 any**：接住不确定的外部数据（JSON.parse、第三方回调），逼你先验证再使用——接外部数据默认用 unknown
- **never 用于"不可能"**：穷尽性检查的保险丝——给 switch 加 `default: const _exhaustive: never = state;`，将来 State 加新分支时这里立刻编译报错

## tsconfig 起步：strict 是默认姿势

```json title="tsconfig.json"
{
  "compilerOptions": {
    "strict": true,            // 一揽子严格模式：严格空值、noImplicitAny 等，新项目必开
    "noUncheckedIndexedAccess": true,  // arr[i] 的类型带上 undefined，治下标越界
    "moduleResolution": "bundler"      // 配合 Vite 等现代构建器
  }
}
```

`strict: true` 引入的最大约束是**严格空值检查**：`string | null` 不收窄不许用，老代码里一半的 `Uncaught TypeError: cannot read property of undefined` 在编译期就被拦下。历史项目迁移策略一句话：先开 strict 再逐文件修，别靠 `any` 大水漫灌。工具链层面（lint 与 TS 的配合）见[质量工具链篇](../engineering/02-quality-toolchain.md)。

## 小结

第一级台阶三句话：**导出必标、局部靠推**；**联合类型靠收窄用**，状态建模用可辨识联合；**unknown 代替 any**，never 做穷尽保险。类型系统真正的威力在「类型的复用与变换」——那是[泛型与工具类型](02-generics-and-utility-types.md)的事。
