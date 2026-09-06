---
title: 多线程与并发：从单线程到真并行
date: 2026-09-05
tags: [Java基础]
summary: JS 是单线程 + 事件循环，Java 是真多线程并行，能力更强，代价是共享状态会出事。围绕线程、锁、ThreadLocal 与线程池建立最小心智模型。
---

前端的并发模型是"单线程 + 事件循环"：异步靠回调/Promise 排队，同一时刻只有一段代码在跑，所以 JS 里"共享变量被同时改"这种事天然不存在。Java 是**真多线程**：多个执行流同时运行、共享同一份内存，能力强（多核利用、并行计算），代价是**共享状态会出事**。下文的所有概念都围绕这个代价展开。

## Thread：一个独立执行流

```java title="thread.java"
// 对照：JS 的 new Worker(...)，但 Thread 共享内存，Worker 不共享
Thread worker = new Thread(() -> {
    System.out.println("子线程执行: " + Thread.currentThread().getName());
});
worker.start();                 // start() 才启动新线程；run() 只是普通方法调用
```

关键差异：JS 的 `setTimeout(fn, 1000)` 不阻塞主线程；Java 的 `Thread.sleep(1000)` **阻塞当前线程**，睡的是这条执行流，其他线程照常跑。另外 `start()` 与 `run()` 一字之差，行为完全不同：直接调 `run()` 是在当前线程里执行普通方法，没有并发。

## 为什么需要锁：一个经典的丢失更新

```java title="race-condition.java"
class Counter {
    static int count = 0;
    static void increment() { count++; }    // 不是原子操作：读 → 加一 → 写回
}

// 两个线程各加 10000 次，最终结果经常 < 20000
// 因为 count++ 会被拆成三步，两个线程交错执行时互相覆盖
```

JS 里 `count++` 永远安全（单线程没有交错）；Java 里这就是**竞态条件**。解法是加锁：

```java title="locks.java"
class SafeCounter {
    private static int count = 0;
    private static final Object lock = new Object();

    static void increment() {
        synchronized (lock) {               // 同一时刻只允许一个线程进入
            count++;
        }
    }
}
```

三个工具速览：

- **synchronized**：最简单的互斥锁，锁方法或代码块，JVM 自动加锁解锁
- **volatile**：保证可见性（一个线程的修改立刻对其他线程可见），但**不保证原子性**，适合状态标志位，不适合计数器
- **ReentrantLock**：手动锁（`lock()` / `unlock()` 配对，必须放 finally），支持尝试加锁、超时，synchronized 满足不了时才用

**CAS**（Compare-And-Swap）是无锁方案：原子地"比较旧值，相等才更新"，`AtomicInteger` 等类基于它，计数这种简单场景比加锁更快。读到原子类知道它是"无锁的线程安全"即可。

## ThreadLocal：每个线程一份自己的变量

有时要的不是"保护共享变量"，而是"每个线程各有一份"：比如 Web 应用里，每个请求线程都要能随手拿到"当前登录用户"（呼应 [Servlet 的单例多线程](../javaweb/01-servlet-and-http.md)：实例字段不能存请求数据，request 对象又要层层传参）。**ThreadLocal** 给每个线程一个独立副本，互不干扰：

```java title="threadlocal.java"
static final ThreadLocal<User> CURRENT_USER = new ThreadLocal<>();

// 请求入口（Filter）里塞入：只对当前线程可见
CURRENT_USER.set(user);
// 同一线程后续任何位置直接取，不用层层传参
User u = CURRENT_USER.get();
// 请求结束必须清理（见下）
CURRENT_USER.remove();
```

一个不能省的纪律：**用完必须 `remove()`**。线程池的线程是复用的，不清理会串数据（下一个请求读到上一个用户的数据）；另外 Entry 是弱引用，不清理可能造成内存泄漏。"set → 用 → finally remove"三步写全，是它的标准姿势。

## 死锁：两把锁互相等

线程 A 持锁一等锁二、线程 B 持锁二等锁一，互相等待，谁都无法继续。避免方法：**按固定顺序加锁**、尽量缩小锁范围、用 tryLock 带超时。日常业务代码锁用得少（线程池 + 数据库锁覆盖大部分场景），但读到 synchronized 要能识别。

## 线程池：不要手动 new Thread

线程的创建销毁是昂贵操作，生产代码一律用线程池：

```java title="thread-pool.java"
ExecutorService pool = new ThreadPoolExecutor(
        4,                          // 核心线程数：常驻
        8,                          // 最大线程数：任务堆积时扩到的上限
        60, TimeUnit.SECONDS,       // 非核心线程空闲回收时间
        new ArrayBlockingQueue<>(100),   // 任务队列：超出核心线程数的先排队
        new ThreadPoolExecutor.CallerRunsPolicy());  // 队列满后的拒绝策略

pool.submit(() -> handleRequest(request));   // 对照：把任务丢进连接池队列
pool.shutdown();                              // 优雅关闭
```

参数不必背，先记住语义：**核心线程常驻，忙不过来任务排队，队列也满了才扩线程，全满则触发拒绝策略**。Spring 里更常用 `@Async` + `ThreadPoolTaskExecutor` 的封装（见 Spring 篇），但底层参数同源。并发工具类（`CountDownLatch` 等）用于"等一组并行任务全部完成"，对照 `Promise.all` 的等待语义，用到时查即可。

## 参考与延伸

- [Java 全栈知识体系 · 并发编程](https://pdai.tech/md/java/thread/java-thread-x-overview.html)
- [JavaGuide · Java 并发基础](https://javaguide.cn/java/concurrent/java-concurrent-basics.html)
