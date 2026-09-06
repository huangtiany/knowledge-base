---
title: 后端知识地图
date: 2026-09-05
tags: [路线图]
summary: 前端转 Java 后端的知识体系与学习主线：每个主题对应一篇笔记，每章末尾挂本章资源。姊妹篇：《AI / Agent 知识地图》与《前端知识地图》。
related: false
---

这张地图是后端域的知识体系，输入是一份《前端转 Java 后端入门学习路线》：每个 h2 是一章，对应标签清单里的一个章级标签；章下面的小节是笔记主题，全部已写成互链（项目实战与 JVM 两节留白）。教学法沿用该路线的「前端类比」：每个 Java 概念都从你熟悉的前端原型切入。

## 定位与主线

定位：**从前端工程师到能独立开发和维护 Spring Boot 后端服务的全栈工程师**。

依赖主线：

- **Java基础 → 数据库 → JavaWeb → Spring生态**：语言先上手，数据是后端的核心资产，JavaWeb 是 Spring 的前置知识，Spring 是学习的重点
- **中间件**（Redis/MQ/Nginx）服务于高并发场景，概念先行、深入后置
- **工程实践**（Maven/工具链/设计模式/规范）穿插始终，本图集中成章
- **项目实战**与 **JVM** 留白：实战等真实项目进展后补写，JVM 是下一阶段的扩展方向

## Java 基础

标签：`Java基础`。强类型与面向对象是转型第一课，编译期思维贯穿全程：

- [Java 基础语法与面向对象](java-basics/01-syntax-and-oop.md)
- [集合框架：List、Map、Set 与 Stream](java-basics/02-collections-framework.md)
- [异常体系：编译器逼你面对问题](java-basics/03-exceptions.md)
- [多线程与并发：从单线程到真并行](java-basics/04-concurrency.md)
- [日志：后端的 DevTools](java-basics/05-logging.md)

### 本章资源

- [菜鸟教程 · Java 教程](https://www.runoob.com/java/java-tutorial.html) —— 语法速查
- [Java 全栈知识体系](https://pdai.tech/) —— 中文进阶体系
- [JavaGuide](https://github.com/Snailclimb/JavaGuide) —— 开源指南
- [Oracle · The Java Tutorials](https://docs.oracle.com/javase/tutorial/) —— 官方教程

## 数据库

标签：`数据库`。以 MySQL 入门，SQL → 索引 → 事务层层递进，持久层框架 MyBatis 收尾：

- [SQL 基础：从 filter 到 JOIN](database/01-sql-essentials.md)
- [索引与 explain：让查询快起来](database/02-index-and-explain.md)
- [事务与隔离级别：ACID 与死锁](database/03-transactions-and-isolation.md)
- [MyBatis 入门：Mapper 接口与 XML 映射](database/04-mybatis-basics.md)
- [MyBatis 动态 SQL 与分页](database/05-mybatis-dynamic-sql.md)

### 本章资源

- [MySQL 8.0 Reference Manual](https://dev.mysql.com/doc/refman/8.0/en/) —— 最终依据
- [小林 coding · 图解 MySQL](https://xiaolincoding.com/mysql/) —— 图解深挖
- [MyBatis 官方文档（中文）](https://mybatis.org/mybatis-3/zh_CN/) —— 持久层框架
- [PageHelper](https://github.com/pagehelper/Mybatis-PageHelper) —— 分页插件

## JavaWeb

标签：`JavaWeb`。Servlet 的生命周期与单例多线程模型，决定了后面所有框架行为的边界：

- [Servlet 与 HTTP 请求处理](javaweb/01-servlet-and-http.md)
- [Session、Cookie 与 Filter](javaweb/02-session-cookie-filter.md)

### 本章资源

- [菜鸟教程 · Servlet 教程](https://www.runoob.com/servlet/servlet-tutorial.html) —— 生命周期速查

## Spring 生态

标签：`Spring生态`。学习重点：IoC/DI/AOP 两大支柱 → 事务 → Boot 常用要点 → 微服务：

- [Spring 核心：IoC、DI 与 AOP](spring/01-spring-core-ioc-di-aop.md)
- [Spring 事务管理：@Transactional 与它的失效场景](spring/02-spring-transactions.md)
- [Spring Boot 要点：分层、自动配置与统一异常处理](spring/03-spring-boot-essentials.md)
- [Spring Cloud：从单体到微服务](spring/04-spring-cloud.md)

### 本章资源

- [Spring Framework 官方文档](https://spring.io/projects/spring-framework) —— IoC/AOP 权威
- [Spring Boot 官方文档](https://spring.io/projects/spring-boot) —— 自动配置出处
- [Spring Cloud 官方文档](https://spring.io/projects/spring-cloud) —— 微服务组件
- [Spring 中文社区](https://springdoc.cn/) —— 中文文档站

## 中间件

标签：`中间件`。概念先行、深入后置，高并发场景才需要深入：

- [Redis：内存数据库与缓存](middleware/01-redis.md)
- [消息队列 MQ：削峰、解耦、异步](middleware/02-mq.md)
- [Nginx：反向代理与静态部署](middleware/03-nginx.md)

### 本章资源

- [Redis 官方 Commands](https://redis.io/docs/latest/commands/) —— 命令参考
- [菜鸟教程 · Redis 教程](https://www.runoob.com/redis/redis-tutorial.html) —— 中文入门
- [RabbitMQ 官方教程](https://www.rabbitmq.com/tutorials) —— 六个递进教程
- [Nginx 官方文档](https://nginx.org/en/docs/) —— 指令权威

## 工程实践

标签：`工程实践`。工具与规范穿插始终，集中成章：

- [Maven：Java 的 npm](practice/01-maven.md)
- [工具链：IDEA 与 Linux 常用命令](practice/02-toolchain-idea-linux.md)
- [常用设计模式：六个对照前端讲](practice/03-design-patterns.md)
- [编码规范要点：从入门第一天就写"团队风格"](practice/04-coding-standards.md)

### 本章资源

- [Maven 官方指南](https://maven.apache.org/guides/index.html) —— POM 与依赖机制
- [阿里巴巴 Java 开发手册（p3c）](https://github.com/alibaba/p3c) —— 规范基准 + 扫描插件
- [图解设计模式](https://design-patterns.readthedocs.io/zh-cn/latest/) —— 图解 16 模式
- [JetBrains IDEA 文档](https://www.jetbrains.com/help/idea/) —— 调试与重构
- [菜鸟教程 · Linux 教程](https://www.runoob.com/linux/linux-tutorial.html) —— 命令速查

## 项目实战

标签：`项目实战`。**留白**：按 AI 域的先例，实战笔记的价值在真实踩坑，预先编写没有意义。候选方向（学到 Spring Boot 后自然浮现）：

- 把本站的后端 API 化：为格致知识库做一个 Spring Boot + MySQL 的服务
- 接手公司项目的过程笔记与复盘

## JVM

标签：`JVM`。**留白**：当前路线未覆盖，作为 Java基础 的下一阶段扩展方向，内容是内存结构、类加载、垃圾回收。以[Java 全栈知识体系](https://pdai.tech/)的 JVM 板块为预备资源。

## 进度点亮

- 地图上的主题已全部成文互链；项目实战与 JVM 两节留白，等真实进展后写成笔记回这里点亮
- 每个章级标签：有笔记即点亮；后端域目前保持灰组的标签是 `项目实战` 与 `JVM`
- 每章末尾的「本章资源」与资源收藏页同源：卡片收在 `content/backend/resources.yaml`，地图只做学习视角的精选
