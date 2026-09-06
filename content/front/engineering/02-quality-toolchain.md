---
title: 代码质量工具链：ESLint、Prettier 与 pnpm
date: 2026-09-06
tags: [工程化]
summary: pnpm 管依赖的确定性，ESLint 管代码质量，Prettier 管格式，Git 钩子在提交前执行检查，质量由流程保证。
---

代码规范工具解决的实际问题：格式争议交给机器裁决，未用变量、危险写法在提交前拦截，风格争论不再占用人的时间。工具链分工：**pnpm 管依赖，ESLint 管质量，Prettier 管格式，husky 管执行时机**。

## pnpm：依赖的确定性

npm 扁平化 node_modules 的两个老问题：**幽灵依赖**（没声明过的包因为被提升也能 import）与**多项目磁盘占用大**（同一个包在每个项目里复制一份）。pnpm 用符号链接结构同时解决：

```bash
pnpm add vue                 # 严格按 package.json 声明可达——幽灵依赖直接 import 报错
pnpm store path              # 全局内容寻址存储：同一个包全局只存一份（硬链接）
pnpm -r run build            # workspace：monorepo 按依赖拓扑排序执行
```

- **严格性**：node_modules 里只放直接依赖，间接依赖藏在 `.pnpm` 目录，「没写进 package.json 就不该 import」由物理结构强制
- **省空间快安装**：全局存储 + 硬链接，十个项目用同一个 React 也只占一份磁盘
- monorepo 场景 `pnpm-workspace.yaml` 声明 packages，配合 `-r`（recursive）按拓扑序执行脚本
- 选择上不必纠结：新项目 pnpm 是当前默认答案，npm/yarn 主要用在老项目与 CI 缓存脚本里

## ESLint：管质量，不管格式

ESLint 检查的是**代码质量与潜在 bug**：未用变量、未处理的 Promise、依赖数组缺失这类运行时才暴露的问题。规则集用共享配置起步：

```js title="eslint.config.js"
import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(          // flat config（2024 起的标准形态）
  js.configs.recommended,
  ...tseslint.configs.recommended,       // TS 感知规则：顺手治 any 与未收窄
  {
    rules: {
      "no-console": ["warn", { allow: ["warn", "error"] }],   // 项目级定制
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
);
```

与 TypeScript 的分工容易含混：**TS 管类型对不对，ESLint 管写法好不好**。`no-unused-vars` 这类重叠规则交给 typescript-eslint 的版本，避免双报。

## Prettier：只管格式，与 ESLint 分家

格式（缩进、引号、换行、行宽）与质量分离，**Prettier 统一裁决格式**：

```json title=".prettierrc"
{
  "semi": true,
  "singleQuote": false,
  "printWidth": 100,
  "trailingComma": "all"
}
```

- ESLint 的格式类规则（`eslint-plugin-prettier` 那套混用方案）已不推荐：**格式与质量分给两个工具，不混用**
- 风格决策权全在 `.prettierrc`，团队里出现的每个「要不要加分号」的讨论，回答统一是：改配置，立即生效，然后继续写代码
- 编辑器层配 EditorConfig（缩进/换行符/文件编码）覆盖非 JS 文件（CSS/YAML/Markdown），三份配置各管一类文件

## Git 钩子：提交前检查

工具链要接进工作流才起作用：**husky + lint-staged** 让检查只跑在本次改动的文件上，速度快到不影响提交：

```json title="package.json"
{
  "scripts": {
    "prepare": "husky"
  },
  "lint-staged": {
    "*.{ts,tsx,vue}": ["eslint --fix", "prettier --write"],
    "*.{css,json,md}": ["prettier --write"]
  }
}
```

```bash
# .husky/pre-commit
pnpm lint-staged        # 只检查暂存区文件：快；修不好的问题直接挡在提交外
```

- **pre-commit 跑 lint-staged**：小步拦截，不阻塞开发节奏
- commit message 规范（Conventional Commits：feat/fix/chore…）用 commitlint 挂在 commit-msg 钩子上，本仓库的提交历史就是按这套约定写的
- CI 侧最后一层检查：`tsc --noEmit` 全量类型检查 + `eslint .`，本地跳过钩子（`--no-verify`）的提交也会在这里被拦住

## 小结

工具链的价值排序：**执行时机 > 分工清晰 > 规则数量**。pnpm 保证依赖确定，ESLint 与 Prettier 分别管质量与格式，husky 让检查在提交前执行。类型检查见 [TS 两篇](../typescript/01-ts-basics.md)；构建产物的质量（分包与缓存）见[模块化与构建](01-modules-and-vite.md)。
