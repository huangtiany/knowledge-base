---
title: Spring Boot 要点：分层、自动配置与统一异常处理
date: 2026-09-05
tags: [Spring生态]
summary: Spring Boot 之于 Spring ≈ Vite 脚手架之于手配 Webpack：约定大于配置。MVC 三层分层、application.yml、starter 与统一异常处理是日常写码的四大件。
---

裸 Spring 要写一堆 XML 配置；**Spring Boot 的理念是"约定大于配置"**，默认值给足，你要改的才写。对照前端：Vite/CRA 脚手架之于手配 Webpack。下文覆盖日常写码最高频的四件事。

## 项目结构与 MVC 三层

```text
com.example.order
├── controller/      OrderController      接收请求、参数校验、组装响应，不写业务
├── service/         OrderService         业务逻辑、事务边界，不碰 SQL 细节
├── mapper/          OrderMapper          数据访问（MyBatis），只做读写
├── entity/          Order                数据库表映射对象
└── dto/             OrderCreateDTO       与前端交互的数据传输对象
```

Controller → Service → Mapper 单向调用，每层单一职责：**可测试**（Service 可脱离 HTTP 单测）、**可替换**（换 Mapper 实现不影响调用方）。对照前端分层：api 层 / hooks 或 store 层 / 组件层的职责分离，纪律相同：**别在 Controller 里写业务**（它相当于组件的 onClick，只该做转发和组装）。

请求进来的一段标准链路：

```java title="controller.java"
@RestController                          // 该类所有方法返回值自动序列化成 JSON
@RequestMapping("/orders")
public class OrderController {

    private final OrderService orderService;
    public OrderController(OrderService orderService) { this.orderService = orderService; }

    @PostMapping
    public Result<Long> create(@RequestBody @Validated OrderCreateDTO dto) {
        // @RequestBody：JSON 请求体 → DTO 对象（对照 res.body.json()，但自动 + 校验）
        return Result.ok(orderService.create(dto));
    }

    @GetMapping("/{id}")
    public Result<OrderVO> detail(@PathVariable Long id) {   // 对照 app.get('/orders/:id')
        return Result.ok(orderService.detail(id));
    }
}
```

`@PathVariable`、`@RequestParam`、`@RequestBody` 三个参数注解对应"路径参数 / query 参数 / 请求体"三种来源，对照前端路由与 axios 的参数位置。

## 配置文件：application.yml

```yaml title="application.yml"
server:
  port: 8080
spring:
  datasource:
    url: jdbc:mysql://localhost:3306/order_db
    username: root
  redis:
    host: localhost
mybatis-plus:
  mapper-locations: classpath:mapper/*.xml
order:                       # 自定义配置：@Value 或 @ConfigurationProperties 注入
  timeout-seconds: 30
```

对照 `.env` + Vite 的配置体系，但更结构化：多环境用 `application-dev.yml` / `application-prod.yml` 切换（激活方式 `spring.profiles.active`）。**密钥不进 git**，敏感配置走环境变量或外部配置中心。

## 自动配置与 starter：为什么"开箱即用"

引入 `spring-boot-starter-web` 就自动有了内嵌 Tomcat 和 MVC，不用装部署 Tomcat（对照 Node 自带 HTTP 服务）。机制：**starter = 一组打包好的依赖 + 自动配置类**，自动配置用条件注解判断"classpath 里有 X 且你没自己配，就按默认帮你配好"。你写自己的配置（如上面的 datasource）会覆盖默认。这个机制解释了 Spring Boot"加个依赖就多一个能力"的体验，也解释了为什么依赖版本要交给 `spring-boot-starter-parent` 统一管理（对照 npm 的 peer dependencies 兼容矩阵）。

## 统一异常处理：全局的 catch

[异常体系篇](../java-basics/03-exceptions.md)讲过业务异常（BusinessException）一路往上抛，最终在**一个类里统一处理**，返回规范 JSON：

```java title="global-handler.java"
@RestControllerAdvice                 // 拦截所有 @Controller 抛出的异常
public class GlobalExceptionHandler {

    @ExceptionHandler(BusinessException.class)
    public Result<Void> handleBusiness(BusinessException e) {
        return Result.fail(e.getCode(), e.getMessage());     // 业务异常：原样给前端
    }

    @ExceptionHandler(Exception.class)
    public Result<Void> handleOther(Exception e) {
        log.error("未预期异常", e);
        return Result.fail(50000, "系统繁忙，请稍后重试");      // 内部异常：屏蔽细节，只留日志
    }
}
```

对照前端 axios 的响应拦截器统一弹错：思想相同，位置相反（服务端统一出口）。收益：Controller 不写 try/catch、前端拿到**稳定的结果包装结构**（`{code, message, data}`）、内部堆栈不泄露。

## 参考与延伸

- [Spring Boot 官方文档](https://spring.io/projects/spring-boot)（Spring Boot Reference 全量）
- [springdoc.cn · Spring Boot 中文文档](https://springdoc.cn/spring-boot/)
