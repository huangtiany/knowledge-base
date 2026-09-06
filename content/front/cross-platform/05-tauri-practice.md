---
title: Tauri 工程实践：插件、权限与分发
date: 2026-09-06
tags: [跨端与桌面]
summary: 从能跑到能发布：Tauri v2 的 capabilities 权限模型、官方插件矩阵、事件与状态管理、三平台打包与自动更新——桌面应用工程化的完整清单。
---

[入门篇](04-tauri-core.md)跑通了 invoke 与 command，这篇解决「变成可以发布的产品」之间的全部工程问题：**权限模型**（v2 最重要的变化）、**插件体系**（不重复造轮子）、**事件与状态**（真实应用的通信形态）、**打包签名与自动更新**（桌面分发的最后一公里）。

## 安全模型：capabilities 与 permissions

Tauri v2 把「前端能调什么」变成显式授权——这是它与 Electron 安全模型最大的分野：

```json title="src-tauri/capabilities/default.json"
{
  "identifier": "default",
  "windows": ["main"],                       // 授权作用于哪个窗口
  "permissions": [
    "core:default",                          // 窗口/事件等核心最小集
    "fs:allow-read-text-file",               // 文件系统：只授权读
    { "identifier": "fs:scope", "allow": [{ "path": "$APPDATA/**" }] },  // 只许访问应用数据目录
    "opener:default"                         // 打开外部链接
  ]
}
```

- 思想一句话：**默认全部拒绝，按需最小授权**——官方插件的能力都被拆成细粒度 permission，前端能调 `fs.read` 不代表能删文件，能访问 `$APPDATA` 不代表能扫全盘
- 对 Web 的类比：这就是桌面版的 CORS——跨过 IPC 边界的每个调用都要有通行证，[入门篇](04-tauri-core.md)里 `invoke` 失败报 "not allowed" 时先查 capabilities
- 自定义 command 同样受这套体系管：插件化的能力用 permission 声明，应用内命令按窗口授权

## 插件矩阵：官方轮子优先

系统能力不要手写，官方/社区插件先查一圈：

| 需求 | 插件 | 备注 |
|---|---|---|
| 文件读写/路径 | `tauri-plugin-fs` | 权限粒度到路径 scope |
| 打开链接/文件 | `tauri-plugin-opener` | 替代旧 shell.open |
| HTTP 客户端 | `tauri-plugin-http` | 绕开 WebView 的 CORS 限制 |
| 本地存储 | `tauri-plugin-store` | 键值存储，配置项场景 |
| 弹系统通知 | `tauri-plugin-notification` | 三平台适配 |
| 自动更新 | `tauri-plugin-updater` | 需配签名，见下文 |
| 持久化数据库 | `tauri-plugin-sql` | SQLite/MySQL/PG |

- 接入模式统一：Rust 侧 `.plugin(tauri_plugin_fs::init())` 注册 → capabilities 授权 → 前端 `@tauri-apps/plugin-fs` 直接调用——与自定义 command 的心智完全一致
- 超出插件矩阵的需求（比如要跑已有的 CLI 工具）用 **sidecar**：把外部二进制打进包里当子进程管理；更复杂的服务端逻辑写进 Rust（`tauri::command` 后面接任何 Rust 生态，如 `sqlx`、`tokio`）

## 事件与状态：真实应用的通信形态

invoke 是「前端主动问」，真实应用还需要「Rust 主动说」和「跨命令共享状态」：

```rust title="download.rs"
use tauri::{AppHandle, Emitter, State};

#[derive(Default)]
struct DownloadState { total: u64 }            // 跨命令共享的可变状态

#[tauri::command]
async fn start_download(app: AppHandle, state: State<'_, DownloadState>, url: String) -> Result<(), String> {
    for chunk in fetch_chunks(&url).await {
        app.emit("download-progress", chunk.percent)   // ① Rust → 前端：主动推送
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}
// main 里：.manage(DownloadState::default()) 注册状态

#[tauri::command]
fn get_total(state: State<DownloadState>) -> u64 { state.total }  // ② 任意命令读共享状态
```

```ts title="onProgress.ts"                       // 前端订阅
import { listen } from "@tauri-apps/api/event";
const unlisten = await listen<number>("download-progress", (e) => setPercent(e.payload));
// 组件卸载时 unlisten() —— 事件监听器与 Web 里 addEventListener 一样要清理
```

- 通信形态三选一：**invoke**（请求-响应）、**emit/listen**（推送/广播，进度条、托盘点击）、**长驻资源**（流式读大文件用 channel）
- 状态放在 Rust 侧用 `manage()`（全局共享），前端状态照常用 [Vue](../vue/01-vue3-core.md)/[React](../react/01-react-core-hooks.md) 那套——分界线：**跨窗口、涉及系统能力的进 Rust，纯 UI 状态留在前端**

## 打包、签名与自动更新

```json title="src-tauri/tauri.conf.json"
{
  "bundle": {
    "targets": ["msi", "nsis", "dmg", "appimage"],   // Windows 双选 / macOS / Linux
    "createUpdaterArtifacts": true                   // 生成增量更新产物
  },
  "plugins": {
    "updater": { "pubkey": "dW50cnVzdGVk...", "endpoints": ["https://releases.example.com/{{target}}/{{version}}"] }
  }
}
```

- `tauri build` 一次产出三平台安装包（跨平台编译需在对应系统或 CI 跑——GitHub Actions 有官方模板矩阵）
- **代码签名是分发的前置项**：Windows（EV 证书，否则 SmartScreen 拦截劝退用户）、macOS（Developer ID + 公证 notarization，否则 Gatekeeper 拦截）——签名配置进 CI，本地不碰私钥
- **自动更新**的闭环：updater 插件轮询 endpoints → 比对版本 → 下载增量产物 → 校验签名 → 重启应用。服务端只需要一个带版本元数据的静态 JSON + 更新包——用 GitHub Releases 或对象存储就能起步
- 版本策略提醒：桌面应用没有 Web 的「刷新即最新」，用户停留在旧版本数月是常态——**前端接口兼容与灰度发布的纪律**要按客户端软件的尺度来（这点与[部署监控篇](../engineering/05-deploy-and-monitoring.md)的 Web 心智相反）

## 小结

Tauri 工程化四件套：**capabilities 最小授权**（v2 安全模型的根）、**插件矩阵不造轮子**、**通信三形态按场景选**（invoke/emit/channel）、**签名与更新是分发门槛**（比写代码更早启动准备）。前端出身做桌面软件的完整路径至此打通——跨端版图（小程序、移动、桌面）全部补齐。
