---
title: Session、Cookie 与 Filter
date: 2026-09-05
tags: [JavaWeb]
summary: Cookie 和 Session 的概念前端完全熟悉，新的只是"存在哪"的分工；Filter 是服务端的中间件链，Spring 拦截器和网关都是同一思路的延伸。
---

两个主题前端都有等价物：Cookie/Session 只需要弄清"存在哪、谁管理"；Filter 就是 Express 中间件的服务端 Java 版。它们是登录态与请求横切逻辑的基础。

## Cookie 与 Session：登录态存在哪

HTTP 本身无状态，服务端不记得上一个请求。维持"登录了"的状态靠两件套：

```text
登录成功
  → 服务端创建 Session 对象（存在服务端内存/Redis），生成唯一 sessionId
  → 响应头 Set-Cookie: JSESSIONID=xxx → 浏览器存进 Cookie
  → 之后每个请求自动带 Cookie: JSESSIONID=xxx
  → 服务端凭 sessionId 找回 Session，确认"这是登录过的用户"
```

对照前端的两种登录态方案，正好各占一半：

| | 状态存哪 | 凭证 | 典型方案 |
|---|---|---|---|
| Session 方案 | **服务端**（内存/Redis） | Cookie 里的 sessionId | 传统 Java Web |
| Token 方案 | **客户端**（localStorage） | 自包含的 JWT | 前后端分离主流 |

token 方案把状态挪到客户端（服务端无状态、易水平扩容），代价是签发与校验逻辑（JWT）；session 方案服务端可控可踢人，代价是分布式下要共享 Session（放 Redis）。两套都要认识：新项目常是 token，老项目（尤其银行类）Session 方案常见。

Java 里 Session 的常用 API 一眼就懂：`request.getSession().setAttribute("user", u)` / `.getAttribute("user")`，对照 `localStorage.setItem`，只是存的方向在服务端。Cookie 的 `HttpOnly` 属性顺带记住：设了它 JS 就读不到这个 Cookie，登录凭证类 Cookie 必设（防 XSS 偷 token）。

## Filter：服务端的中间件链

Filter（过滤器）在请求到达 Servlet **之前**（和响应返回**之后**）执行横切逻辑，和 Express 的 middleware 概念完全同构：

```javascript
// Express 中间件
app.use((req, res, next) => { authCheck(req); next(); })
```

```java title="auth-filter.java"
public class AuthFilter implements Filter {
    @Override
    public void doFilter(ServletRequest req, ServletResponse resp, FilterChain chain)
            throws IOException, ServletException {
        HttpServletRequest request = (HttpServletRequest) req;
        if (request.getSession().getAttribute("user") == null
                && !request.getRequestURI().contains("/login")) {
            ((HttpServletResponse) resp).sendRedirect("/login");   // 拦下：未登录
            return;                                                 // 不调 chain.doFilter = 请求到此为止
        }
        chain.doFilter(req, resp);      // 放行 → 进入下一个 Filter 或目标 Servlet
    }
}
```

`chain.doFilter()` 就是 Express 的 `next()`：多个 Filter 按配置顺序组成链，前半段在请求前执行、后半段在响应后执行。登录校验、字符编码、日志埋点、防 XSS 过滤，这些"每个请求都要"的逻辑都写在这里。

## 拦截器与网关：同一思路的延伸

这条横切思路后面会反复遇到，先分清三个层次：

- **Filter**：Servlet 规范层，最底层，能拦所有请求（含静态资源）
- **Spring 拦截器（HandlerInterceptor）**：Spring MVC 层，只拦业务请求、能拿到 Controller 信息（见 [Spring Boot 要点](../spring/03-spring-boot-essentials.md)）
- **API 网关（Spring Cloud Gateway）**：微服务层，整个系统的统一入口做鉴权/限流/路由（见 [Spring Cloud](../spring/04-spring-cloud.md)）

同一件事（横切）在三层各有一个名字，越往上越贴近业务。面试与排障时，先分清"问题出在哪一层"。

## 参考与延伸

- [菜鸟教程 · Session 与 Cookie](https://www.runoob.com/servlet/servlet-session-tracking.html)
- [JavaGuide · Session/Cookie/Token 认证](https://javaguide.cn/system-design/security/data-safe.html)
