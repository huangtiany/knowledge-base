---
title: 索引与 explain：让查询快起来
date: 2026-09-05
tags: [数据库]
summary: 索引是后端性能优化第一课——B+ 树让百万行查询走毫秒级；explain 是看查询"走没走索引"的 X 光片，索引失效场景要当 checklist 记。
---

前端性能优化查 Network/Lighthouse，后端第一课是**索引**。百万行的表，没索引的查询是全表扫描（秒级），走索引是毫秒级——差距不是优化技巧，是"能用 vs 不能用"。

## 索引是什么：一句话版

索引 = 排好序的查找结构（MySQL InnoDB 用 **B+ 树**）。直觉类比：字典的目录——按拼音排序后，二分查找定位，不用一页页翻。

```sql
CREATE INDEX idx_user_city ON users(city);      -- 给 city 列建索引
```

代价要知道：**索引不是免费的**——每个索引是一棵独立的树，写入（INSERT/UPDATE）要同步维护所有索引，索引越多写入越慢、存储越大。所以只给"查询条件里高频出现的列"建索引，不是越多越好。主键自带索引（聚簇索引）；外键、状态、时间这些高频 WHERE 列值得建。

理解 explain 输出前还差一块拼图——**回表**。InnoDB 里数据行本身按主键组织成一棵 B+ 树（聚簇索引），`idx_user_city` 这种二级索引的叶子节点存的是"索引列值 + 主键"，不是整行。所以 `SELECT * FROM users WHERE city='杭州'` 要先在二级索引树里找到主键，**再回聚簇索引树查整行**——这就是回表，一次查询可能回表几十次。覆盖索引之所以快，就是"列都在索引里，不用回表"。

## explain：查询的 X 光片

任何慢查询，第一步是前面加 `EXPLAIN` 看执行计划：

```sql
EXPLAIN SELECT * FROM orders WHERE user_id = 42;
```

重点看四列：

| 列 | 看什么 |
|---|---|
| `type` | 访问方式：`const`/`eq_ref`/`ref`（走索引，好）→ `range`（范围扫描，尚可）→ `index`（扫全索引）→ `ALL`（**全表扫描，必须优化**） |
| `key` | 实际用到的索引；NULL = 没走索引 |
| `rows` | 预估扫描行数——数量级即成本 |
| `Extra` | `Using index`（覆盖索引，最优）；`Using filesort`/`Using temporary`（额外排序/临时表，警惕） |

目标：让关键查询的 type 摆脱 `ALL`，rows 降到可控数量级。

## 索引失效 checklist

建了索引但 explain 显示没走，通常是这些写法触发的（逐条对着查）：

```sql
-- 1. 对索引列用函数或运算：索引存的是原值，算过就认不出了
WHERE YEAR(create_time) = 2026;                 -- ✗
WHERE create_time >= '2026-01-01' AND create_time < '2027-01-01';   -- ✓ 改成范围

-- 2. 隐式类型转换：字符串列用数字比
WHERE phone = 13800000000;                      -- ✗ phone 是 VARCHAR 时整列失效
WHERE phone = '13800000000';                    -- ✓ 类型对齐

-- 3. 前导模糊匹配：B+ 树按前缀排序，%开头无法定位
WHERE name LIKE '%三';                          -- ✗
WHERE name LIKE '张%';                          -- ✓ 后缀模糊可以

-- 4. 联合索引不满足最左前缀：联合索引 (city, age) 相当于先按 city 排再按 age 排
WHERE age = 25;                                 -- ✗ 跳过第一列，用不上
WHERE city = '杭州' AND age = 25;               -- ✓
```

联合索引的**最左前缀原则**是核心：索引 `(city, age, name)` 支持 `city`、`city+age`、`city+age+name` 的查询，不支持跳过 city 直接查 age。设计联合索引时把**区分度高、必然出现**的列放最左。

## 与业务的配合

- **区分度**：性别这种只有两三个值的列，索引意义不大（一半数据还是要扫）；ID、手机号这类高区分度列收益最大
- **覆盖索引**：查询的列全在索引里（`SELECT city FROM users WHERE city='杭州'`），不用回表查数据行，explain 显示 `Using index`——高频查询可以考虑把返回列一起建进联合索引
- **慢查询落地流程**：慢日志抓到 SQL → explain 定位 → 改写或加索引 → 用 explain 复验。全程用数据说话

## 参考与延伸

- [小林 coding · 图解 MySQL（索引篇）](https://xiaolincoding.com/mysql/index/index-interview.html)（B+ 树、索引失效的图解版）
- [MySQL 8.0 Reference Manual · Optimization](https://dev.mysql.com/doc/refman/8.0/en/optimization.html)
