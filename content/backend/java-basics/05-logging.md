---
title: 日志：后端的 DevTools
date: 2026-09-05
tags: [Java基础]
summary: 后端程序跑在远程服务器上，连不上 IDEA 断点，日志是唯一可观测窗口。级别纪律 + 门面模式（SLF4J），从第一行业务代码就按规范打。
---

前端调试靠 DevTools 和 `console.log`，程序就跑在自己浏览器里。后端程序跑在**远程服务器**上，出问题时你不可能连上去打断点，**日志是了解程序在干什么、哪里出错的唯一窗口**。打日志的水平直接决定排障效率。

## 五个级别与纪律

| 级别 | 语义 | 纪律 |
|---|---|---|
| `ERROR` | 系统出错、接口异常，必须关注 | 生产环境重点盯，打日志时**带上异常堆栈** |
| `WARN` | 有风险但不影响运行（重试、降级） | 别滥用，WARN 刷屏会淹没真 ERROR |
| `INFO` | 关键业务节点（下单成功、服务启动） | **生产默认级别**，INFO 及以上输出 |
| `DEBUG` | 调试细节（SQL、入参） | 开发/测试用，生产不开（刷屏 + 性能损耗） |
| `TRACE` | 最细粒度 | 几乎不用 |

级别规则：**设了 INFO，DEBUG 和 TRACE 自动不输出**，对照 DevTools 的日志过滤，只是过滤器在服务端配置。于是正确的工作流是：开发时尽情打 DEBUG 细节日志，上线不改代码只调级别配置。

## SLF4J + Logback：门面与实现

日志体系有个"门面模式"设计：**SLF4J 是接口（门面），Logback/Log4j2 是实现**，代码里只面向 SLF4J 打日志，底层实现可替换。Spring Boot 默认自带 SLF4J + Logback，零配置可用：

```java title="logging.java"
import lombok.extern.slf4j.Slf4j;

@Slf4j                          // Lombok 注解：自动生成 private static final Logger log
@Service
public class OrderService {

    public void create(Order order) {
        log.info("创建订单, userId={}, orderId={}", order.getUserId(), order.getId());
        try {
            orderMapper.insert(order);
            log.info("订单创建成功, orderId={}", order.getId());
        } catch (DuplicateKeyException e) {
            log.warn("重复下单, orderId={}", order.getId());
            throw new BusinessException(40001, "请勿重复提交", e);
        } catch (Exception e) {
            log.error("订单创建异常, orderId={}", order.getId(), e);   // 异常对象作最后一个参数，堆栈自动打出
            throw e;
        }
    }
}
```

三条硬纪律：

1. **用占位符 `{}`，不用字符串拼接**：`log.info("userId=" + id)` 即便日志被过滤也会先执行拼接，浪费 CPU；占位符只在真要输出时才格式化
2. **ERROR 必须带异常对象**（作为最后一个参数），没有堆栈的 ERROR 很难定位问题
3. **不打敏感信息**（密码、手机号明文、token），日志会进采集系统，扩散范围比代码大

## MDC：把"哪次请求"写进每行日志

并发服务里两个用户同时下单，日志交织在一起，只看 `orderId={}` 不知道整个请求链路经历了什么。**MDC（Mapped Diagnostic Context）**是日志框架提供的"线程级上下文"：入口处写入一个 request-id，这条线程后续打的所有日志自动携带它，串起一次请求的全部日志：

```java title="mdc.java"
// Filter 入口：生成/接续 traceId，出口清理
MDC.put("traceId", UUID.randomUUID().toString().substring(0, 8));
try {
    chain.doFilter(request, response);
} finally {
    MDC.clear();               // 线程复用，不清会串到下一个请求
}
```

日志格式里加 `%X{traceId}` 即可输出。微服务时代它升级成链路追踪（traceId 跨服务传递，Sleuth/Micrometer Tracing 做的就是这件事），但单体的"一次请求一个 ID"现在就值得做：**排障时按 traceId 一 grep，就能取回整条请求链路的日志**。

## 别用 System.out.println

对照前端：`console.log` 调试完忘删顶多留几行无用输出；后端的 `System.out.println` 是**同步阻塞 IO**，无法被级别过滤、没有时间戳与上下文，高并发下拖垮性能。它是日志体系里的"alert() 调试"，生产环境出现即编码规范违规。IDEA 里可装检查插件自动标红。

## 参考与延伸

- [Spring Boot 官方文档 · Logging](https://docs.spring.io/spring-boot/reference/features/logging.html)（默认配置与级别调整）
- [Logback 官方手册](http://logback.qos.ch/manual/index.html)（实现层的完整文档）
