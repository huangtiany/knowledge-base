---
title: MyBatis 入门：Mapper 接口与 XML 映射
date: 2026-09-05
tags: [数据库]
summary: MyBatis 不是"数据库的 axios"——它把 SQL 写在 XML 里、接口挂在接口上，SQL 可控性是它相对全自动 ORM 的核心卖点。
---

学习路线里常把 MyBatis 类比成"数据库的 axios"——这个类比只能帮起步（调用方式像：声明一个方法，拿到结果），要修正：axios 封装的是 HTTP 请求，**MyBatis 封装的是 JDBC**——帮你干掉"开连接、拼参数、读结果集、关资源"的样板代码，把Java 对象和表行互相映射。SQL 本身仍是你写的，写在 XML 里。

## 为什么要 ORM / 为什么选 MyBatis

原生 JDBC 的问题：样板代码冗长、SQL 和 Java 代码搅在一起、结果集手动映射。ORM（对象关系映射）解决"表行 ↔ Java 对象"的转换。Java 生态两条路线：

- **MyBatis**：SQL 写在 XML/注解里，自己完全掌控 SQL——国内互联网公司主流
- **Spring Data JPA（Hibernate）**：按方法名自动生成 SQL，少写 SQL——国外与简单 CRUD 场景多

选 MyBatis 的核心理由：**复杂查询、性能调优时 SQL 可控**（配合[索引与 explain](02-index-and-explain.md) 优化），而业务系统的查询复杂度通常撑不起全自动 ORM 的假设。

## Mapper 接口 + XML：MyBatis 的标准姿势

```java title="UserMapper.java"
@Mapper                          // Spring Boot 启动时扫描并为该接口生成代理实现
public interface UserMapper {
    User selectById(Long id);
    List<User> selectByCity(@Param("city") String city);
    int insert(User user);
}
```

```xml
<!-- resources/mapper/UserMapper.xml —— namespace 必须是接口全限定名 -->
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE mapper PUBLIC "-//mybatis.org//DTD Mapper 3.0//EN"
        "http://mybatis.org/dtd/mybatis-3-mapper.dtd">
<mapper namespace="com.example.mapper.UserMapper">

    <!-- resultType：查询结果按列名自动映射到同名字段 -->
    <select id="selectById" resultType="com.example.entity.User">
        SELECT id, name, age, city FROM users WHERE id = #{id}
    </select>

    <select id="selectByCity" resultType="com.example.entity.User">
        SELECT * FROM users WHERE city = #{city}
    </select>

    <insert id="insert" useGeneratedKeys="true" keyProperty="id">
        INSERT INTO users (name, age, city) VALUES (#{name}, #{age}, #{city})
    </insert>
</mapper>
```

工作机制一句话：**你只声明接口方法，MyBatis 在运行时生成动态代理**，把方法调用翻译成 XML 里同 id 的 SQL 执行，结果按 `resultType` 映射成对象。所以"id 对得上、参数对得上"就是全部约定——方法名不要求与 SQL 里的任何东西一致（这是与 JPA 按方法名生成 SQL 的区别）。

## #{ } vs ${ }：必考的 SQL 注入题

```xml
WHERE name = #{name}      <!-- 预编译占位符：参数作为值传入，防注入 —— 默认用它 -->
WHERE name = '${name}'    <!-- 字符串替换：直接拼进 SQL —— 有注入风险！ -->
```

`#{}` 走 PreparedStatement 预编译，参数永远是"数据"；`${}` 是文本拼接，参数成了"代码"。`${}` 唯一合法场景是**动态表名/列名**这类不能参数化的位置——且值必须来自白名单枚举，绝不接受用户输入。

## 结果映射：resultType 与 resultMap

- 列名与字段名一致（或开了驼峰映射 `map-underscore-to-camel-case: true`，把 `user_name` 自动映射到 `userName`）→ `resultType` 直接映射
- 名字对不上 / 一对多关联查询 → `resultMap` 显式指定列与字段的对应关系，复杂映射（association/collection）进阶时再学

## 参考与延伸

- [MyBatis 3 官方文档（简体中文）](https://mybatis.org/mybatis-3/zh_CN/)（入门到映射器全章节）
- [PageHelper（GitHub）](https://github.com/pagehelper/Mybatis-PageHelper)（国内最常用的 MyBatis 分页插件）
