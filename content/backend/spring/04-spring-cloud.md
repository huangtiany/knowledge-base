---
title: Spring Cloud：从单体到微服务
date: 2026-09-05
tags: [Spring生态]
summary: 微服务之于后端 ≈ 微前端之于前端：拆了粒度，就要解决"互相找到、互相调用、统一入口"三件事，Nacos、Feign、Gateway 分别对应。
---

单体应用（一个 Spring Boot 工程）撑不住时，按业务拆成多个独立部署的服务，这就是微服务架构。对照前端：微前端拆的是页面/应用，微服务拆的是后端能力域。拆完立刻冒出三个新问题，Spring Cloud 的核心组件一一对应：

| 问题 | 组件 | 作用 |
|---|---|---|
| 服务互相找到对方 | **Nacos** 注册中心 | 服务上线时注册，调用方按名字查找 |
| 服务间怎么调用 | **Feign** 声明式调用 | 像调用本地方法一样调远程接口 |
| 统一入口与防护 | **Gateway** 网关 | 所有外部请求的统一入口 |

## Nacos：注册中心 + 配置中心

每个服务启动时向 Nacos 注册自己的服务名与地址（如 order-service 对应 10.0.0.5:8080）；调用方按**服务名**调用，不写死 IP，扩容、换机器、服务挂掉时注册表实时更新。

对照前端直觉：像 DNS + CDN 回源的组合，调用方拿到的始终是"域名"，具体指向哪台机器由解析决定。Nacos 还兼**配置中心**：各服务的配置集中存放、动态刷新（改配置不用重启发布），对照 `.env` 文件，但从"文件"升级成"带管理界面的服务"。

## Feign：声明式服务间调用

没有 Feign 时，服务 A 调服务 B 要手写 HTTP 客户端：拼 URL、序列化、处理错误。Feign 把它变成**声明接口**：

```java title="user-client.java"
@FeignClient(name = "user-service")        // 按服务名找人（Nacos 负责解析成地址）
public interface UserClient {

    @GetMapping("/users/{id}")
    UserVO getUser(@PathVariable("id") Long id);
}

// 业务代码里当本地方法用：
UserVO user = userClient.getUser(order.getUserId());
```

对照前端的 axios 封装层：定义一个 api 模块，调用方不感知 HTTP 细节。差别是 Feign 连实现都替你生成了，接口声明即客户端，负载均衡（请求分摊到 user-service 的多个实例）在底层自动完成。**远程调用 = 网络**：超时、重试、降级这些 HTTP 客户端的老问题一个不少，Feign 只是让它们集中可配。

## Gateway：系统的统一入口

网关是所有外部请求的统一入口：鉴权、限流、路由转发、日志这类横切逻辑在入口处做一次，后端各服务只管业务。

```yaml title="gateway 路由示意"
spring:
  cloud:
    gateway:
      routes:
        - id: order-route
          uri: lb://order-service          # lb = 从注册中心负载均衡
          predicates:
            - Path=/api/orders/**          # 匹配到的路径转发给 order-service
```

对照前端两个熟悉的东西：**devServer 的 proxy**（本地把 /api 转发到后端）和 **axios 拦截器**（统一处理凭证与错误），Gateway 相当于这两者的生产级服务端组合，区别是它面对的是全公司所有服务的流量。

## 熔断与降级：别让一个慢服务拖垮全站

微服务最大的风险不是服务挂掉，是**服务变慢**：user-service 卡住（比如慢 SQL），order-service 的调用线程池被它占满 → order-service 也失去响应 → 依赖它们的服务依次拖垮，**雪崩沿调用链向上蔓延**。前端有同构直觉：一个同步渲染阻塞主线程的组件，能卡死整个页面。

解法是熔断器（circuit breaker）模式，三态循环：

```text
闭合（正常放行）→ 失败率超阈值 → 打开（直接快速失败，不再真的调用）
→ 冷却时间后 → 半开（放几个试探请求）→ 成功则闭合 / 失败回打开
```

"快速失败"配合**降级（fallback）**：调用失败时返回兜底响应（缓存的旧数据、默认值、"暂时无法查看评价"），主流程不中断。Spring 生态常用 **Sentinel**（阿里开源，带控制台）或 Resilience4j（轻量注解式）。纪律：**每个远程调用都该问一句"它挂了我显示什么"**，没有降级答案的调用就是雪崩的候选起点。

## 单体还是微服务：一个清醒的提醒

微服务的代价：分布式事务（跨服务的数据一致性）、部署运维复杂度、链路排障难度（一个请求跨五个服务）。**业务早期不要上微服务**，单体 + 模块化分层（Controller/Service/Mapper 划清边界）能撑很久；拆分的正确时机是"某个模块的伸缩需求/团队边界明显独立"。这条判断和微前端完全同构：先有清晰边界，再做物理拆分。

## 参考与延伸

- [Spring Cloud 官方文档](https://spring.io/projects/spring-cloud)
- [Spring 中文社区 · Spring Cloud 教程](https://springdoc.cn/spring-cloud/)
- [Nacos 官方文档](https://nacos.io/docs/latest/overview/)
