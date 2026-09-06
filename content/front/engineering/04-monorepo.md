---
title: Monorepo：pnpm workspace 与 Turborepo
date: 2026-09-06
tags: [工程化]
summary: 多包时代的工程结构：pnpm workspace 管依赖拓扑，Turborepo 管任务编排与缓存。什么时候值得上 monorepo、目录怎么切、CI 怎么只构建改动的部分。
---

当项目长出「组件库 + 工具库 + 多个应用」时，多仓库的问题开始放大：公共包改一行要发版再升级、版本漂移、规范各自维护。Monorepo 的方案是**一个仓库装下所有包，工具链保证它们像分开的一样协作**，分两层：pnpm workspace 管依赖，Turborepo 管任务。包管理器基础见[质量工具链](02-quality-toolchain.md)。

## 什么时候值得上 monorepo

先说反面：单应用 + 一两个工具文件的公司项目，multirepo 完全够，monorepo 是纯开销。上 monorepo 的信号是：

- **多个包互相依赖且同速演进**：UI 库改个 props，两个应用要立刻用上（multirepo 得发版→升级，monorepo 直接引用源码）
- **统一规范的成本高过收益反转点**：lint/tsconfig/CI 配置在 N 个仓库重复漂移
- 代价也要清楚：仓库变大（clone/CI）、权限只能整仓控制、构建必须配缓存工具否则全量构建慢到不可用

## pnpm workspace：依赖拓扑管理

```yaml title="pnpm-workspace.yaml"
packages:
  - "apps/*"        # 应用：web（主站）、admin（后台）
  - "packages/*"    # 共享包：ui、utils、eslint-config、tsconfig
```

```json title="apps/web/package.json"
{
  "dependencies": {
    "@acme/ui": "workspace:*",     // 指向本地包，不经过 npm —— 改动即时生效
    "@acme/utils": "workspace:*"
  }
}
```

- **`workspace:` 协议是 monorepo 的核心**：包之间互相引用走本地链接，没有发版环节，这是与 multirepo 最根本的差别
- `pnpm -r build` 递归执行所有包的 build，并**按依赖拓扑排序**（utils 先于 ui 先于 web）；`--filter @acme/web...` 只跑某包及其依赖
- 依赖版本统一用 **catalog**（pnpm 9.5+）：`pnpm-workspace.yaml` 里声明一份版本表，各包写 `catalog:` 引用，解决「同一个 React 十个版本」的问题

## Turborepo：任务编排与缓存

包一多，`pnpm -r build` 的全量执行就成了 CI 的瓶颈，Turbo 的方案是**只构建需要构建的**：

```json title="turbo.json"
{
  "tasks": {
    "build": {
      "dependsOn": ["^build"],           // 先构建依赖的包（^ 指上游）
      "outputs": ["dist/**"]             // 声明产物：缓存命中时直接恢复
    },
    "lint": {},                          // 各包独立，无依赖顺序
    "test": { "dependsOn": ["build"] }
  }
}
```

- Turbo 对每个任务计算**输入指纹**（源文件 + 依赖包 + 环境变量），没变的任务直接回放缓存，`turbo run build` 在 CI 上通常只构建真正改动的链路
- **远程缓存**（Vercel 托管或自建）让 CI 与本地共享缓存， teammate 构建过的包你这边直接命中
- 典型收益：只改 `packages/ui` 的一次提交，CI 从「全仓 20 分钟」降到「ui + 两个受影响应用」的分分钟级

## 包的划分与发布

```
apps/                # 部署单元：web、admin（各自独立构建发布）
packages/
  ui/                # 组件库（Vue/React 各一或 headless）
  utils/             # 纯函数工具
  eslint-config/     # 共享配置包：被各包 devDependencies 引
  tsconfig/          # 共享 tsconfig 基座
```

- 划分原则：**apps 按部署单元切，packages 按复用频率切**，被两个以上 app 用的才值得抽包，只有一个消费者的逻辑留在 app 内
- 对外发布的包（如组件库）用 **changesets** 管版本与 changelog：`changeset` 记录变更意图 → 合并后 CI 自动发版；只内部消费的包连发版都省了（workspace 直连）
- 微前端的边界：monorepo 解决「代码放哪、怎么共享」，微前端（qiankun/Module Federation）解决「多个独立团队的应用拼进一个页面运行时」。组织问题先于技术问题，多数场景 monorepo + 路由拆分就够了

## 小结

Monorepo 的两个关键机制：**workspace 协议去掉包之间的发版环节**（改动即时可见），**任务缓存去掉没改也要构建的浪费**（Turbo 指纹命中直接回放）。它不是默认选项，多包同速演进时再上；启用时把 workspace + Turbo + catalog 三件套一次配齐。
