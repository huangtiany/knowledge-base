---
title: Servlet 与 HTTP 请求处理
date: 2026-09-05
tags: [JavaWeb]
summary: Servlet 是 Java 处理 HTTP 的最底层原语，Spring MVC 的路由、拦截器都是它的封装。理解生命周期与"单例多线程"，后面的框架行为都能由此解释。
---

前端发请求接触的是 axios 和后端路由；后端 Java 世界处理 HTTP 的最底层原语叫 **Servlet**。Spring MVC（`@GetMapping` 那些）本质上是对 Servlet 的多层封装，理解了 Servlet 的两个核心事实（生命周期、单例多线程），后面所有框架行为都能由此解释。

## 对照 Express 建立概念

```javascript
// Express：一个函数处理一个路由
app.get('/user/:id', (req, res) => { res.json({ id: req.params.id }) })
```

```java title="user-servlet.java"
@WebServlet("/user")
public class UserServlet extends HttpServlet {

    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp)
            throws IOException {
        String id = req.getParameter("id");          // 对照 req.query.id
        resp.setContentType("application/json;charset=utf-8");
        resp.getWriter().write("{\"id\": " + id + "}");
    }
}
```

结构同构：请求进来 → 你的代码拿请求（HttpServletRequest）→ 写响应（HttpServletResponse）。Servlet 规范再按 HTTP 方法分发到 `doGet` / `doPost` / `doPut` / `doDelete`，对照 Express 的 `app.get/post/put/delete`。

## 生命周期：init 一次，service 每请求，destroy 一次

Servlet 容器（内嵌 Tomcat）按固定生命周期管理它：

1. **init()**：第一次请求（或启动时）执行**一次**，适合加载配置、初始化资源
2. **service()**：**每个请求**执行，按方法分发到 doGet/doPost……
3. **destroy()**：**关闭时执行一次**，释放资源

背这个不是目的，目的是推出 Servlet 最重要的事实：

## 单例 + 多线程：一个 Servlet 实例服务所有请求

Express 的路由函数每请求独立上下文；**Servlet 默认只有一个实例，所有并发请求都由这一个实例的 service 方法处理**。推论：

- **Servlet 里不要写可变实例字段**来存请求相关数据（如 `private User currentUser;`），并发下互相覆盖，经典事故
- 请求相关的数据放**局部变量**或 `HttpServletRequest` 属性里（每请求一个 request 对象，天然隔离）
- 无状态的单例是安全的，这个约束会一路贯穿到 Spring 的 Bean（Bean 默认也是单例多线程，规则相同）

读老代码时看到 Servlet 里的成员变量，第一反应就该是"这里并发安全吗"。

## 请求转发 vs 重定向：一次请求还是两次

```java
// 转发（forward）：服务器内部转手，浏览器无感知（1 次请求）
req.getRequestDispatcher("/result.jsp").forward(req, resp);

// 重定向（redirect）：返回 302 让浏览器再发一次（2 次请求，浏览器地址栏变化）
resp.sendRedirect("/login");
```

对照前端直觉：重定向就是后端让你"换个 URL 再请求一次"（axios 里会看到响应链路两次）；转发是服务端内部移交，URL 不变、request 对象延续（可以带数据过去）。选择依据：跳到**站内另一资源继续处理**用转发，**跳页面/换域/防重复提交**用重定向。

## JSP：知道它是什么就够了

JSP（在 HTML 里嵌 Java 代码的模板技术）是 Servlet 时代的视图方案，对照早期的服务端模板。前后端分离后（RESTful API + Vue/React），后端只返回 JSON，**JSP 已基本淘汰**，学习路线里它只承担一个任务：理解"曾经后端渲染"到"现在前后端分离"的演化，别在 JSP 上花时间。

## 参考与延伸

- [菜鸟教程 · Servlet 教程（中文）](https://www.runoob.com/servlet/servlet-tutorial.html)
- [JavaGuide（GitHub）](https://github.com/Snailclimb/JavaGuide)
