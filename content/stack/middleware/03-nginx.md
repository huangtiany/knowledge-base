---
title: Nginx：反向代理与静态部署
date: 2026-09-05
tags: [中间件]
summary: 前端对 Nginx 不陌生——它托管你的 dist、转发你的 /api；换到后端视角，它还是负载均衡器和系统门口的守门员。这篇把三重身份一次讲清。
---

Nginx 是前端工程师最有"既视感"的中间件：本地 devServer 的 proxy、部署时托管 dist 的静态服务器，都是它。放到后端视角，它还有第三重身份：**负载均衡器**。三重身份一次讲清。

## 身份一：静态资源服务器

```nginx title="托管前端打包产物"
server {
    listen 80;
    server_name gezhi.example.com;

    root /usr/share/nginx/html/dist;        # Vite/CRA build 出来的 dist
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;   # SPA 路由兜底：路径不存在时回 index.html
    }
}
```

`try_files ... /index.html` 是 SPA 部署的标配一行：React Router/Vue Router 的前端路由路径（如 `/orders/123`）在服务器上并不存在对应文件，必须回退到 index.html 让前端路由接管。对照本地开发：这一行就是"devServer historyApiFallback"的生产版。

## 身份二：反向代理

```nginx
server {
    listen 80;
    server_name example.com;

    location /api/ {
        proxy_pass http://127.0.0.1:8080/;   # /api/ 开头的请求转给 Spring Boot（8080）
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location / {
        root /usr/share/nginx/html/dist;     # 其余路径走前端静态文件
    }
}
```

这就是前后端分离部署的标准姿势：**同域名下，/api 归后端，其余归前端**——没有跨域问题（浏览器只看到同源请求）。对照本地 devServer 的 `proxy: { '/api': ... }`，机制相同，只是发生在生产环境的独立进程里。所谓**反向代理**：代理的是"服务端"（用户不知道也不需要知道真实后端在哪），对照"正向代理"（代理的是客户端，如 VPN）。

## 身份三：负载均衡

后端起了多个实例（一台机器扛不住），Nginx 把流量分发下去：

```nginx
upstream backend {
    server 10.0.0.5:8080 weight=2;    # 权重轮询：性能好的机器多接点
    server 10.0.0.6:8080 weight=1;
    # ip_hash;                        # 可选：同一 IP 固定打同一实例（会话保持场景）
}

server {
    location /api/ {
        proxy_pass http://backend;
    }
}
```

默认轮询；`weight` 加权；`ip_hash` 按来源 IP 固定分配（Session 存本机内存时的会话保持方案——更现代的做法是 Session 放 [Redis](01-redis.md) 共享，就不需要粘性了）。这台 Nginx 顶在前面，单实例的故障也能被摘除（`max_fails` 探活）。

## 一个请求的完整旅程（把三重身份串起来）

```text
用户 → DNS → Nginx（80/443）
        ├── /            → 前端 dist 静态文件
        ├── /api/        → 负载均衡 → Spring Boot 实例 ×N
        └── /static/     → 静态资源（+ expires 缓存头）
```

这张图就是"前后端分离项目"的部署全景——前端工程师写完代码要真正理解它如何被服务，Nginx 是绕不开的一站。

## 参考与延伸

- [Nginx 官方文档](https://nginx.org/en/docs/)
- [菜鸟教程 · Nginx 教程（中文）](https://www.runoob.com/nginx/nginx-tutorial.html)
