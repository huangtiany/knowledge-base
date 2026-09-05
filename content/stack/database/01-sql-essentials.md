---
title: SQL 基础：从 filter 到 JOIN
date: 2026-09-05
tags: [数据库]
summary: SELECT/WHERE/GROUP BY 的语义与 JS 数组方法一一对应——filter、map、reduce 换个数据源而已；真正的新东西是 JOIN 和 NULL 三值逻辑。
---

SQL 对前端工程师有个隐藏优势：它的核心语义和 JS 数组方法一一对应，`WHERE ≈ filter`、`GROUP BY ≈ reduce`。真正的新东西只有两块：**JOIN** 和 **NULL 的三值逻辑**。本篇以 MySQL 为例。

## 基础四件套

```sql
-- 增
INSERT INTO users (name, age, city) VALUES ('张三', 25, '杭州');

-- 查：WHERE ≈ filter
SELECT id, name FROM users WHERE age > 18 AND city = '杭州';
-- 对照：users.filter(u => u.age > 18 && u.city === '杭州').map(u => ({id: u.id, name: u.name}))

-- 改 / 删（生产环境先 SELECT 确认范围，再 UPDATE/DELETE）
UPDATE users SET age = 26 WHERE id = 1;
DELETE FROM users WHERE id = 1;
```

纪律：**UPDATE/DELETE 必带 WHERE**（且先 SELECT 同条件确认影响范围）；没有 WHERE 的全表更新是事故第一来源。LIMIT 分页对照 `slice`：`LIMIT 20 OFFSET 40` ≈ `arr.slice(40, 60)`。

## JOIN：JS 里没有的原生能力

JS 里拼两份数据要手写双重循环或 reduce 建索引；SQL 一句 JOIN 完成。以"订单表 join 用户表"为例：

```sql
SELECT o.id AS order_id, u.name, o.amount
FROM orders o                       -- 表别名，多表查询必用
INNER JOIN users u ON o.user_id = u.id
WHERE o.amount > 100
ORDER BY o.amount DESC
LIMIT 10;
```

三种 JOIN 的区别用韦恩图记忆：

- **INNER JOIN**：两表都有的行（交集）——最常用
- **LEFT JOIN**：左表全保留，右表没匹配填 NULL——"查所有用户，包括没下过单的"只能用它
- **RIGHT JOIN**：LEFT 的镜像，实际代码里习惯改写成 LEFT（调整表位置），可读性更好

## GROUP BY：对照 reduce

```sql
SELECT city, COUNT(*) AS user_cnt, AVG(age) AS avg_age
FROM users
GROUP BY city
HAVING user_cnt > 100;              -- HAVING 过滤聚合结果（WHERE 过滤原始行）
-- 对照：
// users.reduce((acc, u) => { (acc[u.city] ??= []).push(u); return acc }, {})
// 再对每组取 length 和平均 age
```

铁律：**SELECT 里的非聚合列必须出现在 GROUP BY 里**（MySQL 宽松模式会放行但结果不可信）。`WHERE` 与 `HAVING` 的分工：前者过滤行（聚合前），后者过滤组（聚合后）。

## NULL：三值逻辑的陷阱

JS 里 `null == undefined` 的宽松直觉在 SQL 会踩坑，因为 NULL 参与运算的结果还是 NULL（不是 true/false，是"未知"）：

```sql
SELECT * FROM users WHERE city != '杭州';   -- city 为 NULL 的行【不会出现】！
SELECT * FROM users WHERE city IS NULL;     -- 判空必须用 IS NULL / IS NOT NULL
```

"不等于杭州"查不出"没有城市"的人——因为 NULL 与任何值比较都是 UNKNOWN，而 WHERE 只留 TRUE 行。这是 SQL 与 JS 逻辑最大的语义差异，**建表时想清楚哪些列允许 NULL**（能 NOT NULL 就 NOT NULL，给默认值更好）。

## 参考与延伸

- [菜鸟教程 · SQL 教程（中文）](https://www.runoob.com/sql/sql-tutorial.html)
- [小林 coding · 图解 MySQL（基础篇）](https://xiaolincoding.com/mysql/)
