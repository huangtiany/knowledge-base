---
title: 编码规范要点：从入门第一天就写"团队风格"
date: 2026-09-05
tags: [工程实践]
summary: 规范是团队协作的通信协议。公司规范以内部为准，公开的行业基准《阿里巴巴 Java 开发手册》覆盖了 80% 的日常判断，第一天就照它写。
---

入职后公司有编码规范（没有的话更要立），但**规范意识可以先于文档养成**。下文以公开的行业事实标准《阿里巴巴 Java 开发手册》为基准，收转型期最容易违反的条款。原文免费（GitHub 开源，含 IDEA 扫描插件），值得通读一遍。

## 命名：让名字自解释

手册的命名规约，转型期最常踩的四条：

1. **严禁拼音混英文**：`getUserMingZi` 这类是规范红线，要么全拼音要么全英文，实际一律全英文
2. **类名大驼峰**（`OrderService`），**方法与变量小驼峰**（`getUserById`），**常量全大写下划线**（`MAX_RETRY_COUNT`）。对照前端的约定相同，Java 更严格在"没有例外"
3. **POJO 类（数据对象）布尔字段不要加 is 前缀**：`isDeleted` 在序列化框架里会出问题（部分框架把它读成 deleted），用 `deleted`
4. **杜绝无意义缩写**：`getInfo`、`data2`、`temp` 这类名字半年后自己都看不懂

对照前端：ESLint 团队约定 + Code Review 的惯例在这里是**成文的强制规约**，且手册给每条标了级别（**强制** / 推荐 / 参考），"强制"级在 CR 是一票否决。

## 结构规约：让包结构自解释

- 分层禁止跨层调用：Controller 只调 Service，Service 只调 Mapper，反向或跨层（Controller 直调 Mapper）是强制级违规（呼应[分层篇](../spring/03-spring-boot-essentials.md)）
- 一个方法别超 80 行：超了就该拆方法/拆类
- POJO 类必须重写 `toString`（排查问题时打印对象可读），用 Lombok `@Data` 或 `@ToString` 自动完成
- 集合初始化指定容量（`new HashMap<>(expectedSize)`，避免扩容抖动），性能级的推荐项

## 并发与事务的规约红线

与前面篇章的知识直接挂钩，也是线上事故重灾区：

- **线程池不要用 Executors 快捷方法创建**（手册强制级），`newFixedThreadPool` 的无界队列会 OOM，显式用 `ThreadPoolExecutor` 带边界参数（见[多线程篇](../java-basics/04-concurrency.md)）
- **事务场景里不要把大量 RPC/IO 放进 @Transactional**（拉长事务持锁时间，呼应[事务与死锁](../database/03-transactions-and-isolation.md)）
- **多线程共享的可变集合用 ConcurrentHashMap**，不要直接用 HashMap

## 让机器执行规范

人记不住所有条款，规范要工具化：

- **P3C 插件**：IDEA 安装 Alibaba Java Coding Guidelines 插件，实时扫描违反手册的代码，写完就扫，CR 前自检
- **格式化交给工具**：IDEA 的 Code Style 配置统一后 `Ctrl+Alt+L` 一键格式化，PR 里就没有"格式 diff"噪音（对照 Prettier）
- **静态检查进 CI**：团队有 SonarQube/Checkstyle 时，红线在流水线拦截，不靠人眼

## 转型期的三条原则

1. **规范是协议不是品味**：每条背后都有事故或协作成本的教训（手册附录的案例值得读），先执行再理解
2. **入乡随俗优先**：接手老项目时，跟项目的既有风格走（哪怕与手册冲突），"项目组特有规范以负责人为准"是行业现实；重构风格是独立的技术决策，与规范执行分开考虑
3. **把 CR 当学习机会**：被 CR 指出规范问题是最便宜的纠错时刻，比线上事故便宜一百倍

## 参考与延伸

- [alibaba/p3c（GitHub）](https://github.com/alibaba/p3c)（《阿里巴巴 Java 开发手册》电子版 + IDEA 插件，免费）
- [JavaGuide · 代码风格与最佳实践](https://javaguide.cn/)
