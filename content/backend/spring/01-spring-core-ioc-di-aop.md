---
title: Spring 核心：IoC、DI 与 AOP
date: 2026-09-05
tags: [Spring生态]
summary: IoC/DI 对照 Vue 的 provide/inject，AOP 对照 axios 拦截器——Spring 的两大支柱在框架里早就有直觉版，这里只是把它们变成后端的标配。
---

Spring 框架的所有复杂度都长在两大支柱上：**IoC/DI**（对象谁来创建、依赖谁来注入）和 **AOP**（横切逻辑怎么织入）。好在这两个问题前端框架都回答过——Vue 的 `provide/inject`、React 的 Context、axios 的拦截器就是它们的直觉版。

## IoC：对象不由你 new，由容器管

传统写法：要用什么就 `new` 什么。Spring 反过来（控制反转）：**对象的创建、装配、生命周期全部交给 Spring 容器**，你只声明"我需要什么"。

```java title="ioc.java"
@Service                          // 声明：这个类交给容器管理（成为 Bean）
public class OrderService {

    private final UserMapper userMapper;

    @Autowired                    // 构造器注入：容器自动把依赖递进来（推荐写法）
    public OrderService(UserMapper userMapper) {
        this.userMapper = userMapper;
    }
}
```

对照前端：Vue 的 `provide/inject`——父层提供，子层声明注入，不关心中间怎么传递；React Context 同理。**DI（依赖注入）是 IoC 的实现手段**：`OrderService` 依赖 `UserMapper`，但不用自己 new，容器在创建时自动装配。

为什么值得：依赖关系集中可管理、**单例复用**（Bean 默认单例，对照全局 store）、最关键的是——**测试时可以注入 mock**（把 UserMapper 换成假实现，OrderService 照样单测，对照前端 mock 一个 api 模块）。

声明 Bean 的注解家族（都是"把这个类交给容器"）：

| 注解 | 用在哪层 |
|---|---|
| `@Controller` / `@RestController` | Web 层（接收请求） |
| `@Service` | 业务层 |
| `@Repository` | 数据访问层 |
| `@Component` | 其他通用组件 |

分层注解语义上是文档，功能上等价；`@Bean` 用于第三方类（不能改人家源码加注解）的注册。

## Bean 默认单例：Servlet 的老规矩

容器里每个 Bean 默认**单例**——全服务一个实例，所有请求并发打进它。规则与 [Servlet 篇](../javaweb/01-servlet-and-http.md)一致：**Bean 里不要放可变的请求级成员变量**（并发互相覆盖），请求相关数据走局部变量或参数传递。这个约束在 Spring 里同样成立，而且因为 Bean 更多，踩中面更大。

## AOP：横切逻辑的统一织入

日志、鉴权、事务、耗时统计——这类"每个方法都要"的逻辑，写在每个方法里是灾难。AOP（面向切面编程）把横切逻辑抽成**切面**，声明式地织入目标方法：

```java title="aspect.java"
@Aspect
@Component
public class TimeLogAspect {

    @Around("execution(* com.example.service..*(..))")   // 织入点：service 包下所有方法
    public Object logTime(ProceedingJoinPoint pjp) throws Throwable {
        long t0 = System.currentTimeMillis();
        try {
            return pjp.proceed();                        // 执行目标方法
        } finally {
            log.info("{} 耗时 {}ms", pjp.getSignature().getName(),
                    System.currentTimeMillis() - t0);
        }
    }
}
```

对照前端两个原型：**axios 拦截器**（每个请求自动带 token/记耗时，不用每个请求手写）和 **HOC/装饰器**（包一层增强，不动原组件）。区别是 axios 拦截器作用在网络层，AOP 作用在**任意 Bean 的方法**上，织入由动态代理在运行时完成。

日常业务里你很少手写切面，但 AOP 无处不在地替你工作：`@Transactional`（事务）、`@Cacheable`（缓存）、`@Async`（异步）底层全是 AOP。**理解"注解 = 声明式地挂了一个切面"**，后面 [Spring 事务](02-spring-transactions.md)的失效场景（自调用不生效）就秒懂——那正是 AOP 代理机制的边界。

## 参考与延伸

- [Spring Framework 官方文档](https://spring.io/projects/spring-framework)（Core 章节的 IoC 与 AOP）
- [Java 全栈知识体系 · Spring](https://pdai.tech/md/spring/spring-x-framework-ioc.html)
