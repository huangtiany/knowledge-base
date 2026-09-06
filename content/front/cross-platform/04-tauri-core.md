---
title: Tauri 入门：Rust 内核的桌面应用
date: 2026-09-06
tags: [跨端与桌面]
summary: Tauri 用系统自带的 WebView 渲染前端、用 Rust 实现系统能力，安装包体积与内存占用远低于 Electron；代价是系统 WebView 的渲染差异与 Rust 的学习成本。
---

Electron（VS Code、Slack 使用中）让前端技术栈可以直接开发桌面应用，代价是每个应用打包一个完整的 Chromium：安装包 80MB 以上，内存占用高。Tauri 的方案是渲染交给操作系统自带的 WebView，系统能力用 Rust 实现，安装包只有几 MB，内存占用明显更低。下文从架构对比讲到跑通第一个应用。

## 架构对比：打包浏览器 vs 借用浏览器

```
Electron：  你的前端 + Node 主进程 + 打包进安装包的 Chromium + Node 运行时
            （三端各带一份完整浏览器，体积 80MB+，内存 = 你的应用 + 整个 Chromium）

Tauri v2：  你的前端（WebView 渲染）+ Rust 核心进程（系统 WebView + 系统能力）
            （Windows 用 WebView2 / macOS 用 WKWebView / Linux 用 WebKitGTK）
```

- **体积与内存**的差异来源直接：Electron 自带浏览器，Tauri 用系统的。安装包从 80MB+ 降到 3-10MB，空闲内存通常低一个数量级
- **代价同样清晰**：系统 WebView 三端内核不同（Chromium 系 WebView2 / WebKit 系 WKWebView、WebKitGTK），**渲染一致性需要验证**。好在现代 CSS/JS 特性三家内核都跟进很快，远好于早期的浏览器兼容问题（查 [caniuse](https://caniuse.com/) 的习惯在这里仍然适用）
- Rust 核心进程让 Tauri 天然获得内存安全与无 GC 的系统级性能；Electron 的 Node 主进程则生态更熟（npm 全量可用）

## 进程模型与 IPC：前后的边界

```
┌─ WebView 进程（前端：Vue/React/Svelte 任意框架 + HTML/CSS/JS）
│        ↑ invoke("read_config")         ↓ emit("download-progress")
├─ IPC 桥（受 permissions 管控，见工程实践篇）
└─ Rust 核心进程：command 处理、文件系统/窗口/托盘/通知等系统能力
```

- 前端**跑在 WebView 里**：你写的还是熟悉的 SPA（Vite 热更新照常），只是「浏览器」由 Tauri 托管
- **一切系统能力都是跨进程调用**：前端 `invoke` 调 Rust 侧函数、Rust 侧 `emit` 向前端推事件。这个边界等价于前端熟悉的「客户端调 API」，只是 API 在同一个应用进程里

## 最小应用：定义并调用一个 command

```rust title="src-tauri/src/lib.rs"
use std::fs;

#[tauri::command]                                   // ① Rust 侧：声明可被前端调用的命令
fn read_notes(app: tauri::AppHandle) -> Result<Vec<String>, String> {
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    Ok(fs::read_dir(dir)
        .map_err(|e| e.to_string())?
        .filter_map(|e| e.ok())
        .map(|e| e.file_name().to_string_lossy().into_owned())
        .collect())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![read_notes])   // ② 注册命令
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

```ts title="src/lib.ts"                            // ③ 前端侧：像调普通异步函数一样 invoke
import { invoke } from "@tauri-apps/api/core";

export async function readNotes(): Promise<string[]> {
  return invoke("read_notes");
}
```

- 起步命令：`pnpm create tauri-app`（选前端框架模板）→ `tauri dev`（前端热更新照常，Rust 改动才触发重编译）→ `tauri build` 出三平台安装包
- **前端只需要会 `invoke`**：参数与返回值自动 JSON 序列化，TS 类型可由 `tauri-specta` 之类工具从 Rust 侧生成。前端视角的 Rust 门槛主要在写 command 这部分
- Rust 侧需要补的最小集：所有权与借用检查（编译器会持续提示）、`serde` 序列化（struct ↔ JSON）、`Result` 错误处理。对照后端[Java 基础](../../backend/java-basics/01-syntax-and-oop.md)的强类型机制，Rust 的约束更严格

## Tauri vs Electron：选型清单

| 维度 | Tauri v2 | Electron |
|---|---|---|
| 安装包 / 内存 | 3-10MB / 低（系统 WebView） | 80MB+ / 高（自带 Chromium） |
| 渲染一致性 | 依赖系统 WebView（三端内核有差异） | 三端完全一致（自带 Chromium） |
| 系统能力语言 | Rust（安全、性能好，学习曲线陡） | Node/JS（前端全栈零迁移） |
| 移动端 | v2 官方支持 iOS/Android（同一套代码） | 无官方方案 |
| 生态成熟度 | 较新，插件体系成型中 | 十年沉淀，案例最多（VS Code/Slack） |

- 决策建议：**新桌面项目默认先看 Tauri**，体积、内存占用与移动端支持都明显优于 Electron。两个例外：需要三端像素级一致的复杂 UI（重音视频、复杂 Canvas 场景下 WebView 差异风险高），或团队没有精力接触 Rust（Electron 的 Node 主进程对前端零门槛）
- Electron 是平行选项而非退路：窗口管理、自动更新（electron-updater）、托盘等实践成熟，遇到的问题大多有现成答案。Tauri 生态在快速补齐，动手前先确认插件覆盖度

## 小结

Tauri 的核心机制：渲染用系统 WebView，系统能力用 Rust 实现，前后端之间通过 invoke/emit 通信。第一个应用很快能跑通，权限、更新、分发等工程问题见[下一篇](05-tauri-practice.md)。
