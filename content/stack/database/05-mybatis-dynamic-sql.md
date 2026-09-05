---
title: MyBatis 动态 SQL 与分页
date: 2026-09-05
tags: [数据库]
summary: 列表页的"多条件可选筛选"是动态 SQL 的主战场——<if>/<where>/<foreach> 三个标签覆盖 90% 场景；分页交给 PageHelper 插件。
---

后台管理系统最典型的查询：筛选项有一堆，用户可能只填两三个。SQL 要根据"填了什么"动态拼接条件——前端用模板字符串拼这个会 SQL 注入 + 引号地狱，MyBatis 用**动态 SQL 标签**在 XML 里安全地做。

## 三个主力标签：if / where / foreach

```xml
<select id="searchUsers" resultType="com.example.entity.User">
    SELECT * FROM users
    <where>
        <if test="name != null and name != ''">
            AND name LIKE CONCAT(#{name}, '%')
        </if>
        <if test="city != null">
            AND city = #{city}
        </if>
        <if test="minAge != null">
            AND age &gt;= #{minAge}          <!-- XML 里 > 要写 &gt; -->
        </if>
    </where>
    ORDER BY id DESC
</select>
```

- **`<if test="...">`**：条件成立才拼这段 SQL——`test` 里写 OGNL 表达式，判空是必备动作
- **`<where>`**：自动处理"第一个条件前的 WHERE"和"多余的 AND"——没有它，"所有条件都为空时残留孤零零的 WHERE"和"第一个条件的 AND 开头"都要手写 1=1 之类的丑陋补丁
- **`<foreach>`**：集合展开，典型场景是 `IN` 查询：

```xml
<select id="selectByIds" resultType="com.example.entity.User">
    SELECT * FROM users WHERE id IN
    <foreach collection="ids" item="id" open="(" separator="," close=")">
        #{id}
    </foreach>
    <!-- ids = [1, 2, 3] → WHERE id IN ( ? , ? , ? ) -->
</select>
```

配套还有 `<set>`（UPDATE 语句里智能处理逗号）和 `<choose>/<when>/<otherwise>`（多选一，对照 switch）——认识即可，频率远低于上面三个。

## 前端传参约定：DTO 与"没填"

动态查询的参数通常收进一个查询 DTO。注意 **`test` 判空要区分 null 与空串**：字符串筛选"没填"时前端可能传 `""`，数字"没填"传 null——DTO 字段用包装类型（Integer 而不是 int），`!= null` 判数字、`!= null and != ''` 判字符串。

## 分页：交给 PageHelper

手写分页要拼 `LIMIT #{offset}, #{size}` 并另写一条 COUNT——PageHelper 插件把它变成一行：

```java title="page.java"
// 引入 pagehelper-spring-boot-starter 后：
PageHelper.startPage(pageNum, pageSize);              // 紧跟其后的第一条查询自动加分页
List<User> users = userMapper.searchUsers(query);     // 只需写业务 SQL，不带 LIMIT
PageInfo<User> info = new PageInfo<>(users);          // total/页码/页大小全在里面
```

原理是 MyBatis **拦截器**：startPage 后的第一条 SQL 被自动改写成带 LIMIT 的版本，并额外执行 COUNT。纪律：**startPage 与查询之间不能隔其他 SQL**（分页会错位）；返回给前端用 `PageInfo` 的字段（total/list/pageNum），别把 MyBatis 类型直接序列化出去。

## 大结果集的警告

`foreach` 的 IN 列表、`startPage(pageNum, 100000)` 这类"超大分页"，都是隐性的性能炸弹——LIMIT 100000, 20 要扫描前 100020 行再丢弃（深分页问题），解法（游标/子查询定位）在遇到真实慢查询时再查。日常纪律：**列表查询必须有默认分页大小上限**。

## 参考与延伸

- [MyBatis 官方文档（简体中文）· 动态 SQL](https://mybatis.org/mybatis-3/zh_CN/dynamic-sql.html)
- [PageHelper（GitHub）](https://github.com/pagehelper/Mybatis-PageHelper)
