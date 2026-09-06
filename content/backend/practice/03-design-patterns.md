---
title: 常用设计模式：六个对照前端讲
date: 2026-09-05
tags: [工程实践]
summary: 单例、工厂、观察者、策略、装饰器、模板方法，六个在 Java 后端最高频的模式，每个在前端都有原型。目标是看得懂、认得出，不背 UML。
---

设计模式是"解决问题的成熟套路"，前端早就在用：Vuex store 是单例、HOC 是装饰器、EventBus 是观察者。下文挑 Java 后端最高频的六个，全部对照前端原型讲，**目标是读得懂框架源码和同事的代码、认得出模式的应用时机**，不是背 UML 图。

学习方法与文档一致：**结合框架学**。Spring 里全是模式，遇到注解想一层"这是什么模式在起作用"，比背图有效十倍。

## 1. 单例：全局只有一个实例

前端原型：Vuex/Redux 的 store、全局的 `window.app`。Java 写法：

```java title="singleton.java"
public class ConfigCenter {
    private static final ConfigCenter INSTANCE = new ConfigCenter();  // 饿汉式：类加载即创建
    private ConfigCenter() {}                                          // 私有构造：禁外部 new
    public static ConfigCenter getInstance() { return INSTANCE; }
}
```

在后端的实际形态：**Spring 的 Bean 默认就是单例**（容器帮你管理，连 getInstance 都不用写），写业务代码时天天在用单例而不自知。数据库连接池、配置类，天然该单例。警惕点在[多线程](../java-basics/04-concurrency.md)篇讲过：单例对象的可变成员变量在并发下是事故源。

## 2. 工厂：创建逻辑集中在一处

前端原型：根据类型返回不同对象的工厂函数。Java 里当"创建过程复杂"（需要读配置、建连接）时，工厂把创建细节藏起来：

```java title="factory.java"
public class PayFactory {
    public static PayStrategy create(String channel) {
        return switch (channel) {
            case "alipay" -> new AlipayStrategy();
            case "wechat" -> new WechatStrategy();
            default -> throw new IllegalArgumentException("未知渠道");
        };
    }
}
```

认识场景：Spring 的 `BeanFactory`（IoC 容器本质是个超级工厂，[IoC 篇](../spring/01-spring-core-ioc-di-aop.md)里"对象由容器创建"就是工厂模式）、MyBatis 的 `SqlSessionFactory`。

## 3. 观察者：发布-订阅

前端原型：EventBus、Vue 的 `$emit/$on`。Java 原生有 `ApplicationEvent`（Spring 事件机制）：

```java title="observer.java"
// 发布（在 OrderService 里）：
applicationEventPublisher.publishEvent(new OrderCreatedEvent(orderId));

// 订阅（解耦的下游）：
@EventListener
public void onOrderCreated(OrderCreatedEvent event) {
    pointService.add(event.getUserId());       // 加积分，不侵入下单主流程
}
```

对照 EventBus 的 `on/emit` 一比一。价值同 MQ 的解耦（进程内轻量版）：主流程不认识下游，新增订阅方不用改发布方。**要跨进程的解耦就上 MQ**（见[消息队列](../middleware/02-mq.md)），进程内用事件机制即可。

## 4. 策略：同一行为的多套实现可替换

前端原型：对象映射表分发（`paymentStrategies[type]`）。Java 里策略 + 工厂/Map 组合消灭 if-else 链：

```java title="strategy.java"
public interface PayStrategy { PayResult pay(PayRequest req); }

@Component
public class AlipayStrategy implements PayStrategy { ... }

// 分发：Spring 注入所有实现，按 key 选，新增渠道只加一个类，不改分发逻辑
private final Map<String, PayStrategy> strategies;   // Spring 自动按 BeanName 注入整表
```

对照前端的对象映射分发完全同构，Java 版的强化是"每个策略能注入自己的依赖"（策略也是 Bean）。应用场景：支付渠道、导出格式、各种"按类型走不同逻辑"。

## 5. 装饰器：不改动原对象包一层增强

前端原型：React HOC、ES 装饰器。Java 里的两个日常：

```java title="decorator.java"
// 1. 注解即装饰器：@Transactional 给方法"包"上事务能力（AOP 动态代理实现）
@Transactional
public void transfer(...) { ... }

// 2. IO 流的装饰器写法：一层层包装出增强能力
new BufferedReader(new InputStreamReader(fileInput))   // 缓冲增强 ← 编码转换 ← 原始流
```

认得出的关键：看到 `BufferedXxx(InputStreamXxx)` 这类嵌套和 AOP 注解，都是装饰器思想。Spring 的 `@Transactional`、`@Cacheable` 全是这个模式（实现机制见 [AOP 篇](../spring/01-spring-core-ioc-di-aop.md)）。

## 6. 模板方法：骨架定好，钩子留给子类

前端原型：生命周期钩子，Vue 定流程（created → mounted），你填具体逻辑。Java 版：

```java title="template.java"
public abstract class AbstractExporter {
    public final byte[] export(List<Row> rows) {    // final：骨架不许改
        validate(rows);                              // 固定步骤 1
        byte[] body = doFormat(rows);                // 变化点：抽象方法，子类实现
        return wrap(body);                           // 固定步骤 3
    }
    protected abstract byte[] doFormat(List<Row> rows);   // 钩子：Excel/CSV/PDF 各写各的
}
```

Servlet 的 `service()` 分发到 `doGet/doPost`、Spring 的 `JdbcTemplate`、各种 `XxxAbstractAdapter`，全是它。识别特征：**抽象父类里的 final 公共方法调用抽象方法**。

## 参考与延伸

- [图解设计模式（中文 · 图 + 代码）](https://design-patterns.readthedocs.io/zh-cn/latest/)
- [菜鸟教程 · 设计模式（中文）](https://www.runoob.com/design-pattern/design-pattern-tutorial.html)
