---
title: Redis：内存数据库与缓存
date: 2026-09-05
tags: [中间件]
summary: Redis 是服务端的"超快 localStorage"——但它是独立服务、可被所有服务共享、有五种数据结构。缓存三件套（穿透/击穿/雪崩）是面试与事故的双重高频。
---

前端把状态存 localStorage/IndexedDB；后端把**热点数据**存 Redis——一个基于内存的 key-value 数据库。它与 localStorage 的三个本质区别决定了它的地位：**独立服务**（所有服务实例共享，不随页面关闭消失）、**内存级速度**（10 万+ QPS，比 MySQL 快两个数量级）、**丰富数据结构**（不止字符串）。

## 五种数据结构，五种场景

对照 JS 数据结构记忆：

| 类型 | 对照 | 典型场景 |
|---|---|---|
| String | 一个值 | 缓存 JSON、计数器（`INCR` 原子自增）、分布式锁 |
| Hash | 对象 `{field: value}` | 对象的部分读写（用户资料：改昵称不用取全量） |
| List | 数组 | 消息队列、最新动态（LPUSH + LRANGE） |
| Set | Set | 去重（已点赞用户）、共同好友（交集运算） |
| ZSet | 带分数的排序集合 | **排行榜**（按分数自动排序，`ZRANGE` 取前 N） |

常用命令一掌数：`SET / GET / DEL / EXPIRE`（过期时间，缓存的生命线）、`TTL`、`INCR`。过期是 Redis 的核心特性——**每个缓存键都该有 EXPIRE**，否则内存只增不减。

## 缓存模式：Cache Aside

"先查缓存，没有查库"的正确写法叫 Cache Aside：

```text
读：先查 Redis → 命中返回；未命中 → 查 MySQL → 写回 Redis（带过期）→ 返回
写：先更新 MySQL → 再删除 Redis 对应键（下次读时自然回填）
```

为什么**写后删缓存**而不是更新缓存：更新可能在并发下被旧值覆盖（两个写操作交错），删除则永远是安全的"下次重算"。对照前端：状态管理里"让 selector 重新计算"优于"手动同步两份状态"。

## 缓存三件套：面试与事故的双重高频

| 问题 | 场景 | 对策（入门版） |
|---|---|---|
| **缓存穿透** | 查询**数据库里也不存在**的 id（恶意乱传），每次都打到 MySQL | 空结果也缓存（短过期）；入参合法性校验 |
| **缓存击穿** | 某个**热点 key 过期**瞬间，海量请求同时打到 MySQL | 热点 key 不过期或加互斥锁（只放一个请求去回填） |
| **缓存雪崩** | **大批 key 同时过期**（同时设置的缓存同一时刻失效），数据库被打崩 | 过期时间加随机偏移（如 30min ± 5min） |

记忆法：穿透是"查无此人"，击穿是"墙塌一个洞"，雪崩是"墙整体塌"。三句话对策先够用，深入方案（布隆过滤器、逻辑过期）遇到再说。

## Spring Boot 集成

```java title="cache.java"
@Service
public class UserCacheService {

    private final StringRedisTemplate redis;      // Spring Boot 自动配置好的客户端
    private final UserMapper userMapper;

    public UserVO getUser(Long id) {
        String key = "user:" + id;                 // 键命名约定：业务:对象:id
        String cached = redis.opsForValue().get(key);
        if (cached != null) return JSON.parseObject(cached, UserVO.class);

        UserVO vo = userMapper.selectById(id);     // 缓存未命中，回源数据库
        if (vo != null) {
            redis.opsForValue().set(key, JSON.toJSONString(vo),
                    Duration.ofMinutes(30).plusSeconds(RandomUtil.randomInt(300)));
        }
        return vo;
    }
}
```

对照前端的请求缓存层（swr 之类）：同样的"先缓存后回源"，差别是缓存层在服务端、被所有实例共享、要考虑并发回填。过期时间加随机偏移（防雪崩）已经写进示例。

## 两个背景知识：为什么快、重启为什么不丢

**为什么快**：数据在内存（读写不落盘）+ 单线程命令执行（无锁竞争、无上下文切换）+ IO 多路复用（单线程同时监听成千上万连接，对照 Node.js 的事件循环——同一个模型）。单线程也意味着**单个慢命令（`KEYS *`、大集合的全量读取）会阻塞所有请求**，生产禁用 `KEYS`，用 `SCAN` 分批。

**持久化**：内存数据断电即失，Redis 用两套机制保"重启不丢"——**RDB**（定期把全量数据快照落盘，恢复快，可能丢最后一段）和 **AOF**（把每条写命令追加记录到日志，丢得少但文件大恢复慢）。生产通常两者同开（AOF 每秒刷盘）。作为缓存用时不必偏执：**缓存丢了可以回源重建**，真正不能丢的数据本来就该以 MySQL 为准。

## 参考与延伸

- [Redis 官方文档 · Commands](https://redis.io/docs/latest/commands/)
- [菜鸟教程 · Redis 教程（中文）](https://www.runoob.com/redis/redis-tutorial.html)
- [小林 coding · 图解 Redis](https://xiaolincoding.com/redis/)
