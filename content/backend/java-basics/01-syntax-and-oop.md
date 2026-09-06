---
title: Java 基础语法与面向对象
date: 2026-09-05
tags: [Java基础]
summary: 写惯 JS 的人学 Java，最大的差异在编译期：类型必须声明、错误必须处理。需要建立的是强类型 + 面向对象的心智模型。
---

写惯 JS 的人上手 Java，语法表面相似（大括号、分号、if/for 几乎一样），真正的差异在两处：**编译期**（类型必须声明、受检异常必须处理）和**面向对象是默认组织方式**。

## 强类型：先声明，再使用

```java title="basics.java"
String name = "张三";           // 对照 JS 的 const name = '张三'
int age = 18;                   // 对照 JS 的 number，但 int 是 32 位整数
boolean vip = true;
double price = 99.9;            // 金额场景用 BigDecimal，不用 double

var list = new ArrayList<String>();   // Java 10+ 也有 var，但只在初始化时推断
```

与 JS 的本质区别：类型是**编译期契约**。`age = "abc"` 在 JS 里要到运行时才报错，Java 直接编译失败，编辑器当场标红。适应编译期检查，是转型第一课。

八个基本类型（int、long、double、boolean、char…）直接存值；其余一切都是对象（引用类型），存的是引用。对照 JS：JS 的 number 一种类型覆盖所有数字，Java 把整数细分成 byte/short/int/long。日常业务记 `int`（默认）和 `long`（ID 场景，雪花 ID 超出 int 范围）即可。

字符串 String 是**不可变对象**（这点和 JS 的 string 一致），但两个高频差异：

```java title="string.java"
String a = "hello";
String b = new String("hello");
a == b                      // false：== 比较的是引用（对象是不是同一个）
a.equals(b)                 // true：内容比较必须用 equals
```

**JS 的 `===` 直觉在 Java 字符串上会失灵**：`==` 比较对象身份，`equals` 比较内容。这是 Java 新手的第一个坑：比内容，永远用 `equals`。

## 方法：返回类型是签名的一部分

```java title="method.java"
public int add(int a, int b) {        // 对照 JS：function add(a, b)
    return a + b;                      // JS 不声明返回类型，Java 必须
}

// 重载（overload）：同名不同参，JS 没有的能力
public int add(int a, int b, int c) { return a + b + c; }
public double add(double a, double b) { return a + b; }
```

方法重载（同名、参数不同）是 Java 的常规操作，JS 里只能靠默认参数模拟。程序入口固定为 `public static void main(String[] args)`，对照 JS 的顶层代码或 `main()`。

## 类与面向对象：默认的组织方式

JS 也有 class，但多数前端代码是函数 + 对象字面量；Java 里**类是唯一的组织单元**，所有代码必须在类里。

```java title="oop.java"
public class User {
    private Long id;                  // private：外部不可直接访问（封装）
    private String name;

    public User(Long id, String name) {   // 构造器（对照 JS constructor）
        this.id = id;
        this.name = name;
    }

    public String getName() { return name; }   // getter：封装的出口
    public void setName(String name) { this.name = name; }
}
```

三个概念对照前端：

- **封装**：字段 private + getter/setter 暴露，类比 React 组件只暴露 props，内部 state 不外泄
- **继承 `extends`**：和 JS 的 class extends 语法神似，但 Java 单继承（一个类只能有一个父类），多能力靠接口
- **多态**：父类引用指向子类对象，调用的是子类实现，JS 的方法查找也走原型链，直觉可迁移；Java 另有**重载**（编译期按参数选）与**重写**（运行时按对象选）的区分

```java title="polymorphism.java"
interface PayStrategy {                 // 对照 TS 的 interface
    void pay(int amount);
}

class AlipayPay implements PayStrategy {
    public void pay(int amount) { System.out.println("支付宝: " + amount); }
}

class WechatPay implements PayStrategy {
    public void pay(int amount) { System.out.println("微信: " + amount); }
}

PayStrategy p = new AlipayPay();        // 面向接口编程，策略模式的基础
p.pay(100);
```

`interface` 比 TS 的 interface 更进一步：它有运行时存在，是实现契约的强制手段。**面向接口编程**在 Spring 生态无处不在，从现在开始养成这个习惯。

## 包与访问修饰符

`package com.example.order;` 声明归属（对照 npm 的作用域包 @scope/pkg），import 引入他人。访问修饰符四档：`private`（本类）→ 缺省（本包）→ `protected`（子类）→ `public`（全公开）。工程纪律：**字段一律 private，方法按需 public**，把"哪些能被外部碰"表达成编译期约束。

## 新手三个坑

1. **`==` 与 `equals`**：字符串和对象比较用 equals；只有 int 这类基本类型才用 `==`
2. **整数除法截断**：`5 / 2 == 2`（不是 2.5）；`5.0 / 2` 才是 2.5
3. **NullPointerException（NPE）**：JS 里 `null.foo` 顶多控制台报错，Java 里整个线程崩。调链式取值前先判空，或者用 `Optional`（后篇遇到再讲）

## 参考与延伸

- [菜鸟教程 · Java 教程（中文）](https://www.runoob.com/java/java-tutorial.html)
- [Java 全栈知识体系 · Java 基础](https://pdai.tech/md/java/basic/java-basic-oop.html)
- [Oracle · The Java™ Tutorials](https://docs.oracle.com/javase/tutorial/)
