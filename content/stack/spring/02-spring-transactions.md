---
title: Spring 事务管理：@Transactional 与它的失效场景
date: 2026-09-05
tags: [Spring生态]
summary: 一行注解管事务，背后是 AOP 代理与数据库事务两层机制——失效场景全是这两层的边界问题。
---

[数据库篇](../database/03-transactions-and-isolation.md)讲了事务本体（ACID、隔离级别、死锁），业务代码里不用手写 BEGIN/COMMIT——`@Transactional` 一个注解搞定。这篇讲它怎么用、怎么配，以及它**什么时候不生效**——失效场景是面试高频，更是线上事故常客。

## 最小用法

```java title="transactional.java"
@Service
public class TransferService {

    @Transactional                       // 方法内所有数据库操作包进一个事务
    public void transfer(Long from, Long to, int amount) {
        accountMapper.deduct(from, amount);      // A 扣款
        accountMapper.add(to, amount);           // B 加款 —— 任一步抛异常，两步都回滚
    }
}
```

语义：方法开始时开启事务 → 正常结束自动提交 → 抛 RuntimeException 默认**回滚**。对照前端：`Promise.all` 的全成全败，但作用在数据库操作上。两个默认值要记住：**只回滚 RuntimeException**（受检异常默认不回滚，要 `@Transactional(rollbackFor = Exception.class)` 全回滚——工程惯例直接带上这个参数）。

## 传播行为：事务套事务时听谁的

业务方法互相调用、各自带事务，嵌套时怎么办？传播行为（propagation）定义策略，记两个常用的：

- **REQUIRED**（默认）：当前有事务就加入，没有就新建——"跟随大部队"
- **REQUIRES_NEW**：无论外层有没有，**自己开一个新事务**——适合"不管主流程成败都必须落库"的场景，比如**记操作日志/流水**：主业务回滚了，日志也要留痕

隔离级别也能在注解上指定（`isolation = Isolation.READ_COMMITTED`），与[数据库篇](../database/03-transactions-and-isolation.md)的四个级别一一对应——MySQL 默认 RR，通常不指定。

## 失效场景：全是两层机制的边界

`@Transactional` 的实现 = **AOP 动态代理**（代理对象在方法前后开关事务）+ **数据库事务**。失效场景全是这两层的边界，记四个最常见的：

**1. 自调用失效（最高频）**：

```java title="self-invocation.java"
@Service
public class OrderService {
    public void batchCreate() {
        this.create(order);          // ✗ this 是原始对象，不走代理 → 事务不生效！
    }

    @Transactional
    public void create(Order order) { ... }
}
```

`@Transactional` 靠代理对象在方法外包装事务；`this.create()` 是对象内部调用，绕过了代理。解法：拆到另一个 Bean 注入调用，或注入自身代理。同理可推——**方法必须 public**（代理只织入公共方法）、**类必须是被 Spring 管理的 Bean**。

**2. 异常被吞**：

```java
try {
    orderMapper.insert(order);
} catch (Exception e) {
    log.error("插入失败", e);        // ✗ 异常吃了，代理"看不到"异常 → 不回滚
}
```

回滚的触发条件是异常**抛出方法**。必须 catch 时，处理完手动 `throw` 出去，或 `TransactionAspectSupport.currentTransactionStatus().setRollbackOnly()`。

**3. rollbackFor 没配**：抛受检异常（如 IOException）默认不回滚——工程惯例：注解一律写 `@Transactional(rollbackFor = Exception.class)`。

**4. 数据库引擎不支持**：MyISAM 无事务，表必须是 InnoDB（MySQL 默认就是，老表留意）。

## 与前端直觉的落差

前端写 `Promise.all` 不需要"传播行为"概念——因为函数调用就是同步栈。Java 事务嵌套发生在**方法调用树**上（Service 调 Service），事务边界跟着调用树走，才需要传播行为描述"子调用与父事务的关系"。理解了这个层级，传播行为不是背诵题而是推理题。

## 参考与延伸

- [Spring 官方文档 · Transaction Management](https://docs.spring.io/spring-framework/reference/data-access/transaction.html)
- [博客园 · Spring 事务传播行为详解](https://www.cnblogs.com/dennyzhangdd/p/9549535.html)（经典长文，传播行为逐个图解）
