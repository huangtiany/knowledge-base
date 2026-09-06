---
title: Tauri 入门：Rust 内核的桌面应用
date: 2026-09-06
tags: [跨端与桌面]
summary: 用系统自带的 WebView 渲染前端、用 Rust 写系统能力——Tauri 把 Electron 的「打包一个浏览器」变成「借用操作系统的浏览器」，体积与内存降一个量级，代价是 IPC 边界与 Rust 心智。
---

桌面开发对前端最友好的路线曾经只有 Electron（VS Code、Slack 都是它）：前端技术栈直接用，代价是**每个应用打包一个完整的 Chromium**（安装包 80MB+、内存轻松上 GB）。Tauri 给出另一个答案：**渲染交给操作系统自带的 WebView，系统能力用 Rust 写**——安装包 MB 级、内存占用低一个量级。这篇从架构对比讲到跑通第一个应用。

## 架构对比：打包浏览器 vs 借用浏览器

```
Electron：  你的前端 + Node 主进程 + 打包进安装包的 Chromium + Node 运行时
            （三端各带一份完整浏览器，体积 80MB+，内存 = 你的应用 + 整个 Chromium）

Tauri v2：  你的前端（WebView 渲染）+ Rust 核心进程（系统 WebView + 系统能力）
            （Windows 用 WebView2 / macOS 用 WKWebView / Linux 用 WebKitGTK）
```

- **体积与内存**的来源差异一目了然：Electron 自带浏览器，Tauri 借系统的——安装包从 80MB+ 降到 3-10MB，空闲内存常差一个量级
- **代价同样清晰**：系统 WebView 三端内核不同（Chromium 系 WebView2 / WebKit 系 WKWebView、WebKitGTK），**渲染一致性需要验证**——好在现代 CSS/JS 特性三家内核都跟得很快，比当年的浏览器兼容地狱好得多（查 [caniuse](https://caniuse.com/) 的习惯在这里继续有效）
- Rust 核心进程让 Tauri 天然获得内存安全与无 GC 的系统级性能；Electron 的 Node 主进程则生态更熟（npm 全量可用）

## 进程模型与 IPC：前后的边界

```
┌─ WebView 进程（前端：Vue/React/Svelte 任意框架 + HTML/CSS/JS）
│        ↑ invoke("read_config")         ↓ emit("download-progress")
├─ IPC 桥（受 permissions 管控，见工程实践篇）
└─ Rust 核心进程：command 处理、文件系统/窗口/托盘/通知等系统能力
```

- 前端**跑在 WebView 里**：你写的还是熟悉的 SPA（Vite 热更新照常），只是「浏览器」由 Tauri 托管
- **一切系统能力都是跨进程调用**：前端 `invoke` 调 Rust 侧函数、Rust 侧 `emit` 向前端推事件——这个边界是 Tauri 开发的核心心智，等价于前端熟悉的「客户端调 API」，只是 API 就在你自己的进程里

## 最小应用：一个 command 走通全链路

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
- **前端只需要会 `invoke`**：参数与返回值自动 JSON 序列化，TS 类型可由 `tauri-specta` 之类工具从 Rust 侧生成——前端视角的 Rust 门槛主要在「写 command 时」的那部分
- Rust 侧需要补的最小集：所有权/借用检查的心智（编译器会一直教你）、`serde` 序列化（struct ↔ JSON）、`Result` 错误处理——对照后端那篇[Java 基础](../../backend/java-basics/01-syntax-and-oop.md)的强类型心智，Rust 只是把约束推得更远

## Tauri vs Electron：选型清单

| 维度 | Tauri v2 | Electron |
|---|---|---|
| 安装包 / 内存 | 3-10MB / 低（系统 WebView） | 80MB+ / 高（自带 Chromium） |
| 渲染一致性 | 依赖系统 WebView（三端内核有差异） | 三端完全一致（自带 Chromium） |
| 系统能力语言 | Rust（安全、性能好，学习曲线陡） | Node/JS（前端全栈零迁移） |
| 移动端 | v2 官方支持 iOS/Android（同一套代码） | 无官方方案 |
| 生态成熟度 | 较新，插件体系成型中 | 十年沉淀，案例最多（VS Code/Slack） |

- 决策建议：**新桌面项目默认先看 Tauri**（体积/内存/移动端潜力都是代差优势）；两个例外——需要三端像素级一致的复杂 UI（比如重音视频、复杂 Canvas，WebView 差异风险高），或团队完全没精力碰任何 Rust（Electron 的 Node 主进程对前端零门槛）
- Electron 也不是退路而是平行选项：它的窗口管理、自动更新（electron-updater）、托盘等实践积累成熟，遇到问题搜得到答案——Tauri 生态在快速追，写代码前先查插件覆盖度

## 小结

Tauri 的心智两句话：**渲染借系统 WebView、能力用 Rust 写**（体积内存代差优势的来源），**一切系统能力走 invoke/emit 的 IPC 边界**。第一个应用十分钟就能跑通，真正的工程问题（权限、更新、分发）在[下一篇](05-tauri-practice.md)。
