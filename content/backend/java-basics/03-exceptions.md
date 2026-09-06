---
title: 异常体系：编译器逼你面对问题
date: 2026-09-05
tags: [Java基础]
summary: JS 的 Error 一种、catch 可有可无；Java 分三级，其中受检异常编译器强制处理。这套体系是理解 Spring 全局异常处理的基础。
---

JS 的错误处理是自由的：Error 对象一种，`try/catch` 写不写都行，Promise 不接 `catch` 顶多控制台警告。Java 的异常体系是**强制性的**：不仅分类分级，受检异常不处理连编译都过不了。理解"为什么这么设计"，比背继承树更重要。

## 三级异常树

```text
Throwable（所有异常和错误的顶层父类）
├── Error（错误：JVM 级故障，程序处理不了）
│     ├── OutOfMemoryError（内存耗尽）
│     └── StackOverflowError（栈溢出，比如无限递归）
│
└── Exception（异常：程序可以处理的意外）
      ├── RuntimeException（非受检：编译器不强制，运行时出错由代码负责）
      │     ├── NullPointerException
      │     ├── ArrayIndexOutOfBoundsException
      │     └── IllegalArgumentException
      │
      └── 其他 Exception（受检：编译器强制处理）
            ├── IOException
            ├── SQLException
            └── InterruptedException
```

对照 JS 建立直觉：

- **JS**：`null.foo` 顶多控制台报错，进程通常还活着 → **Java**：`null.foo` 抛 NullPointerException，**当前线程崩溃**（不处理就向上传播直到线程终止）
- **JS**：没有编译期检查 → **Java**：调用一个声明了受检异常的方法（如文件 IO），不 try/catch 或不向上声明 throws，编译器直接红叉

设计意图：受检异常用于"**可预期、可恢复**"的外部故障（文件不存在、网络中断），逼你在编码时就写好应对；非受检异常用于"**程序 bug**"（空指针、越界），到处 try/catch 反而掩盖错误。前端没有这个区分，初见会觉得啰嗦，换来的是错误路径的显式化。

## 五个关键字与 catch 顺序

```java title="keywords.java"
try {
    int result = Integer.parseInt(input);
} catch (NumberFormatException e) {        // 子类异常在前
    log.warn("输入不是数字: {}", input);
} catch (Exception e) {                     // 父类在后兜底，顺序反了编译报错
    log.error("未知错误", e);
} finally {
    // 无论是否异常都执行：清理收尾
}
```

`throw` 主动抛出、`throws` 在方法签名上声明"我不处理，交给调用方"。向上抛是正常手段：**不要每个方法都 try/catch 吞掉**，让异常传播到该处理它的层（Controller 层统一处理，见后）。

## try-with-resources：资源必须显式关闭

JS 里文件/连接有 GC 和事件循环兜底；Java 的资源（流、连接）是操作系统级稀缺资源，**必须显式关闭**。Java 7+ 的 try-with-resources 让关闭自动化：

```java title="twr.java"
// 老写法：finally 里手动 close，容易漏
// 新写法：实现 AutoCloseable 的资源声明在 try 括号里，自动关闭
try (BufferedReader reader = Files.newBufferedReader(Path.of("data.txt"))) {
    reader.lines().forEach(System.out::println);
}   // 此处自动 reader.close()，即使上面抛了异常
```

对照前端：`try/finally { f.close() }` 的语法糖版，但语义更严格。

## 自定义业务异常与异常链

业务代码不直接抛 IOException 这类底层异常给上层，而是**包装成业务异常**（异常链保留原始堆栈）：

```java title="business-exception.java"
public class BusinessException extends RuntimeException {   // 继承非受检
    private final int code;

    public BusinessException(int code, String message, Throwable cause) {
        super(message, cause);           // cause = 异常链：底层堆栈不丢
        this.code = code;
    }
    public int getCode() { return code; }
}

// 使用：包装底层异常重新抛出
try {
    orderService.create(order);
} catch (SQLException e) {
    throw new BusinessException(50001, "下单失败，请稍后重试", e);
}
```

继承 RuntimeException 而不是 Exception 的原因：业务异常无处不在，若做成受检异常，每个方法签名都要 throws，噪音极大。配合 Spring 的**全局异常处理器**（`@RestControllerAdvice`，见 [Spring Boot 要点](../spring/03-spring-boot-essentials.md)），所有业务异常在一个类里统一转成规范 JSON 给前端，对照前端的 axios 统一错误拦截，位置从浏览器挪到了服务端。

## 参考与延伸

- [菜鸟教程 · Java 异常处理](https://www.runoob.com/java/java-exceptions.html)
- [Oracle · The Java™ Tutorials: Exceptions](https://docs.oracle.com/javase/tutorial/essential/exceptions/index.html)
