---
title: HTTP 缓存与浏览器存储
date: 2026-09-06
tags: [浏览器原理]
summary: 缓存的收益来自少发请求：强缓存与协商缓存的决策流程，Cookie 的安全属性，localStorage/sessionStorage/IndexedDB 的选型。
---

性能优化里性价比最高的不是代码技巧，是**根本不发请求**。本文覆盖网络侧的 HTTP 缓存（浏览器与服务器之间的约定）与本地侧的浏览器存储（Cookie 与 Web Storage 的选型）。Cookie 与后端 Session 的配合在 Java 侧的[Session、Cookie 与 Filter](../../backend/javaweb/02-session-cookie-filter.md)里有对照。

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
# 响应头：强缓存一年，但 URL 带内容哈希（app.a1b2c3.js），内容变即换 URL
Cache-Control: public, max-age=31536000, immutable

# 响应头：协商缓存，每次都问，内容没变省 body
ETag: "v3-k8s-9f2c"

# 请求头（协商阶段由浏览器自动带上）
If-None-Match: "v3-k8s-9f2c"     # 与 ETag 配对
If-Modified-Since: Wed, 01 Sep 2026 08:00:00 GMT   # 与 Last-Modified 配对
```

工程上的标准搭配：带内容哈希的静态资源用长强缓存，HTML 用协商缓存（`no-cache`）。哈希文件名不变则永久命中，内容变了 URL 随之改变，自然绕过旧缓存，这就是构建工具输出 `app.[hash].js` 的原因。`no-cache` 是「先问再用」，`no-store` 才是「完全不存」，两者经常被混用。

深入细节见[小林 coding 图解网络](https://xiaolincoding.com/network/)与 [MDN HTTP 文档](https://developer.mozilla.org/zh-CN/docs/Web/HTTP)。

## Cookie：随请求自动携带的存储

Cookie 的特殊之处在于**每次同域请求都自动附带**，这决定了它的角色：承载身份凭证，普通数据不放这里。

```http title="cookie.http"
Set-Cookie: session_id=abc123; HttpOnly; Secure; SameSite=Lax; Max-Age=86400; Path=/
```

| 属性 | 作用 | 不设的后果 |
|---|---|---|
| `HttpOnly` | JS 读不到（document.cookie 不可见） | XSS 脚本可窃取会话 |
| `Secure` | 仅 HTTPS 传输 | 明文网络可截获 |
| `SameSite=Lax/Strict` | 跨站请求不携带 | CSRF 攻击可利用登录态 |
| `Max-Age` / `Expires` | 生命期；不设 = 会话级（关浏览器即清） | 长期残留 |

选型判断：**需要服务端读到的（会话凭证）才放 Cookie，且必须 HttpOnly + Secure + SameSite**；纯前端用的数据一概不放，体积限制（约 4KB）与请求开销都不允许。

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

- **同步 API 会阻塞主线程**：localStorage 在主线程上读写，大对象频繁读写会卡交互。小配置项用它没问题，大数据用 IndexedDB（浏览器对其有独立的存储线程）
- **存 JSON 记得序列化**，且 Storage 都是字符串协议；对象直接 `setItem` 会变成 `[object Object]`

更上层的封装（Redux Persist、idb-keyval 等）本质都是给这两套原生 API 加 schema 与版本管理。

## 小结

存储选型：服务端要读的数据放 Cookie（带安全属性），前端小状态放 Web Storage，大或离线数据放 IndexedDB。缓存策略：哈希资源用长强缓存，HTML 用协商缓存。缓存与存储之后，剩下的性能问题集中在渲染与加载，汇总见[性能优化](../performance/01-performance-metrics.md)。
