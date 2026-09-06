---
title: HTTP 缓存与浏览器存储
date: 2026-09-06
tags: [浏览器原理]
summary: 缓存是白拿的性能：强缓存与协商缓存的决策流程，Cookie 的安全属性，localStorage/sessionStorage/IndexedDB 的选型——一张表决定数据放哪。
---

性能优化里性价比最高的不是代码技巧，是**根本不发请求**。这篇覆盖两块「存」的知识：网络侧的 HTTP 缓存（浏览器和服务器之间的默契）与本地侧的浏览器存储（Cookie 与 Web Storage 的选型）。Cookie 与后端 Session 的配合在 Java 侧那篇[Session、Cookie 与 Filter](../../backend/javaweb/02-session-cookie-filter.md)里对照过，两篇互为镜像。

## HTTP 缓存：强缓存与协商缓存的两级决策

浏览器请求一个资源前的决策流程：

```
有本地缓存副本？
├─ 强缓存未过期（Cache-Control: max-age 内）→ 直接用，不发请求（200 from disk/memory cache）
└─ 过期了 → 发协商请求
   ├─ ETag/Last-Modified 未变 → 304 Not Modified，继续用本地副本（省 body）
   └─ 变了 → 200 返回新资源
```

```http title="cache.http"
# 响应头：强缓存一年 —— 但 URL 带内容哈希（app.a1b2c3.js），内容变即换 URL
Cache-Control: public, max-age=31536000, immutable

# 响应头：协商缓存 —— 每次都问，内容没变省 body
ETag: "v3-k8s-9f2c"

# 请求头（协商阶段由浏览器自动带上）
If-None-Match: "v3-k8s-9f2c"     # 与 ETag 配对
If-Modified-Since: Wed, 01 Sep 2026 08:00:00 GMT   # 与 Last-Modified 配对
```

工程落地的黄金组合一句话：**带内容哈希的静态资源用长强缓存，HTML 用协商缓存（`no-cache`）**。哈希文件名不变则永久命中，变了则 URL 变自然绕过旧缓存——这就是构建工具输出 `app.[hash].js` 的原因。`no-cache` 是「先问再用」，`no-store` 才是「完全不存」，两者经常被混用。

深入细节的下一站：[小林 coding 图解网络](https://xiaolincoding.com/network/)与 [MDN HTTP 文档](https://developer.mozilla.org/zh-CN/docs/Web/HTTP)。

## Cookie：会随请求飞的那块存储

Cookie 的特殊性不在于存数据，在于**每次同域请求都自动附带**——这决定了它的位置：身份凭证的载体，而不是普通存储。

```http title="cookie.http"
Set-Cookie: session_id=abc123; HttpOnly; Secure; SameSite=Lax; Max-Age=86400; Path=/
```

| 属性 | 作用 | 不设的后果 |
|---|---|---|
| `HttpOnly` | JS 读不到（document.cookie 不可见） | XSS 脚本可偷会话 |
| `Secure` | 仅 HTTPS 传输 | 明文网络可截获 |
| `SameSite=Lax/Strict` | 跨站请求不携带 | CSRF 攻击可搭便车 |
| `Max-Age` / `Expires` | 生命期；不设 = 会话级（关浏览器即清） | 长期残留 |

选型判断：**需要服务端读到的（会话凭证）才放 Cookie，且必须 HttpOnly + Secure + SameSite**；纯前端用的数据一概不放——体积限制（约 4KB）与请求开销都不允许。

## Web Storage 与 IndexedDB：本地侧的分级

```js title="storage.js"
// localStorage：持久，跨标签页共享（约 5MB，同步 API）
localStorage.setItem("theme", "dark");
const theme = localStorage.getItem("theme");

// sessionStorage：标签页级会话，关闭即清
sessionStorage.setItem("draft", JSON.stringify(formState));
```

| 方案 | 容量 | 生命期 | API | 适用 |
|---|---|---|---|---|
| Cookie | ~4KB | 可持久 | 同步，随请求发送 | 服务端要读的凭证 |
| localStorage | ~5MB | 持久 | 同步 | 主题偏好、语言设置 |
| sessionStorage | ~5MB | 标签页会话 | 同步 | 表单草稿、一次性状态 |
| IndexedDB | 数百 MB+ | 持久 | 异步 | 离线数据、大结构化数据 |
| Cache API | 大 | 持久 | 异步 | PWA 缓存请求/响应 |

两条工程注意：

- **同步 API 会阻塞主线程**：localStorage 在主线程上读写，大对象频繁读写会卡交互——小配置项用它可以，大数据走 IndexedDB（浏览器对其有独立的存储线程）
- **存 JSON 记得序列化**，且 Storage 都是字符串协议；对象直接 `setItem` 会变成 `[object Object]`

更上层的封装（Redux Persist、idb-keyval 等）本质都是给这两套原生 API 加 schema 与版本管理。

## 小结

存储选型一张表收拢：**服务端要读 → Cookie（带安全属性）；前端小状态 → Web Storage；大/离线数据 → IndexedDB**。缓存策略一句话：**哈希资源长强缓存、HTML 协商缓存**。缓存与存储准备就绪后，剩下的性能账单就是渲染与加载本身——汇总在[性能优化](../performance/01-performance-metrics.md)里对账。
