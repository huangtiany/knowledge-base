---
title: 事务与隔离级别：ACID 与死锁
date: 2026-09-05
tags: [数据库]
summary: 转账不能只扣不加，事务保证"要么全成，要么全败"。隔离级别决定并发下能忍受哪种脏数据，死锁源于加锁顺序不当。
---

经典例子仍是转账：A 扣 100、B 加 100，两个 UPDATE 必须一起成功或一起失败；A 扣了钱、B 没到账，钱就凭空消失了。**事务**（Transaction）保证一组操作要么全部成功、要么全部回滚。

## ACID 四特性

| 特性 | 含义 | 直观理解 |
|---|---|---|
| **原子性** Atomicity | 全成或全败 | 转账的两步不可拆 |
| **一致性** Consistency | 事务前后数据约束不被破坏 | 转账前后总额不变 |
| **隔离性** Isolation | 并发事务互不干扰 | 你在改的数据别人看不见半成品 |
| **持久性** Durability | 提交后永久生效 | 服务器重启也不丢 |

对照前端：`Promise.all` 的"要么全部 resolve 要么 reject"只体现了原子性；数据库的四特性由引擎（InnoDB）保证，你通过 SQL 使用它。

```sql
START TRANSACTION;                    -- 或 BEGIN
UPDATE account SET balance = balance - 100 WHERE id = 1;
UPDATE account SET balance = balance + 100 WHERE id = 2;
COMMIT;                               -- 全部成功 → 生效
-- 出任何异常 → ROLLBACK; 全部撤销
```

## 并发下的三种脏数据与隔离级别

多个事务同时跑，会出现三类问题（从轻到重）：

1. **脏读**：读到了别人**还没提交**的数据（它回滚了，你读到的是不存在的数据）
2. **不可重复读**：同一事务内两次读同一行，结果不同（中间被人 UPDATE 并提交了）
3. **幻读**：同一事务内两次相同范围查询，行数变了（中间被人 INSERT 并提交了）

隔离级别 = "你愿意忍受哪类问题"的档位：

| 级别 | 脏读 | 不可重复读 | 幻读 | 说明 |
|---|---|---|---|---|
| READ UNCOMMITTED | 可能 | 可能 | 可能 | 不用 |
| READ COMMITTED | 安全 | 可能 | 可能 | 很多数据库的默认（Oracle/PG） |
| **REPEATABLE READ** | 安全 | 安全 | 基本安全 | **MySQL InnoDB 默认**（MVCC + 间隙锁基本挡住幻读） |
| SERIALIZABLE | 安全 | 安全 | 安全 | 完全串行，性能最差，不用 |

要记住：**MySQL 默认 RR（可重复读）**，业务代码通常不用动它；遇到"同一事务内两次查询结果不一致"的 bug，先查是不是用了 READ COMMITTED 或事务边界划错了。

## MVCC：多版本并发控制

InnoDB 实现 RR 靠 **MVCC**（多版本并发控制）：每行数据带版本号，事务按开始时刻的快照读旧版本，读写互不阻塞。这是"读不加锁还能隔离"的实现原理，细节用到再深挖（小林 coding 的图解最清楚）。

## 死锁：怎么发生，怎么避免

两个事务互相持有对方想要的锁：

```text
事务A：锁了行1 → 想锁行2
事务B：锁了行2 → 想锁行1
→ 互相等待，死锁
```

InnoDB 有死锁检测（自动回滚代价小的一方），所以死锁不致命但会报错。避免纪律：

1. **按固定顺序访问资源**（如统一按 id 升序更新），避免互相等待
2. **事务尽量小**：锁的持有时间短，撞锁概率指数级下降；大事务拆小
3. **给高频冲突的 UPDATE 配索引**：没索引时 UPDATE 锁的是全表扫描到的所有行，锁范围失控

与 Spring 的衔接：应用层不会手写 BEGIN/COMMIT，而是 `@Transactional` 注解，它在数据库事务之上加了一层代理与传播语义，坑也多了几个（自调用失效等），见 [Spring 事务管理](../spring/02-spring-transactions.md)。

## 参考与延伸

- [小林 coding · 图解 MySQL（事务篇）](https://xiaolincoding.com/mysql/transaction/mvcc.html)（MVCC 与隔离级别的图解实现）
- [MySQL 8.0 Reference Manual · InnoDB Locks](https://dev.mysql.com/doc/refman/8.0/en/innodb-locking.html)
