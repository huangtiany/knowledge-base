---
title: 四大容器与推导式
date: 2026-09-05
tags: [Python]
summary: list / tuple / dict / set 的选择逻辑、切片、推导式，以及浅拷贝与 deepcopy 的区别。
---

Python 日常代码 80% 的数据操作发生在四种内置容器上。本篇覆盖容器的选择逻辑、切片、推导式与浅拷贝。

## 四种容器的选择逻辑

| 类型 | 有序 | 可变 | 可重复 | 典型场景 | 查找 |
|---|---|---|---|---|---|
| `list` | ✓ | ✓ | ✓ | 按顺序攒数据、要下标 | O(n) |
| `tuple` | ✓ | ✗ | ✓ | 固定结构（坐标、记录）、字典键 | O(n) |
| `dict` | ✓(插入序) | ✓ | 键不重 | 键值映射、去重计数 | O(1) |
| `set` | ✗ | ✓ | ✗ | 去重、集合运算、成员判断 | O(1) |

选择规则：**要键值用 dict，要唯一性用 set，结构固定用 tuple，其余用 list**。`in` 判断在 list 上是线性扫描，在 set/dict 上是常数时间。数据量大时，换容器比换算法更有效：

```python title="set-vs-list.py"
allowed = {"GET", "POST", "DELETE"}   # set 而不是 list
print("POST" in allowed)              # O(1)
print(list({1, 1, 2, 3}))             # 去重：[1, 2, 3]
```

## 切片：半开区间

切片语法 `[start:stop:step]`，含头不含尾：

```python title="slice.py"
xs = [10, 20, 30, 40, 50]
xs[1:4]      # [20, 30, 40]
xs[:2]       # [10, 20]
xs[::2]      # [10, 30, 50]
xs[::-1]     # [50, 40, 30, 20, 10]：反转
xs[1:3] = [99]   # 切片赋值，长度可以不同
```

含头不含尾的好处：`len(xs[:i]) + len(xs[i:]) == len(xs)`，两段拼接无缝。

## 推导式：声明"要什么"而不是"怎么循环"

```python title="comprehension.py"
words = ["rag", "agent", "llm", "mcp"]

lengths = {w: len(w) for w in words}          # dict 推导式
longs  = [w.upper() for w in words if len(w) > 3]
pairs  = [(i, w) for i, w in enumerate(words)]

# 等价于传统写法，但意图一目了然：
# lengths = {}
# for w in words: lengths[w] = len(w)
```

推导式把"过滤 + 变换"表达成一个短句。超过两层嵌套或需要 `else` 分支嵌套时，就退回普通 for 循环，可读性优先。

生成器推导式 `(x for x in xs)` 不立即物化，适合大数据流（详见生成器篇章）。

## 浅拷贝：只复制最外层

```python title="shallow-copy.py"
a = [[1, 2], [3, 4]]
b = a[:]                # 浅拷贝：只复制最外层
b[0].append(9)
print(a)                # [[1, 2, 9], [3, 4]]：内层还是共享的

import copy
c = copy.deepcopy(a)    # 深拷贝才真正断开
```

规则：`=` 是别名，`[:]` / `list()` / `dict()` 是浅拷贝，嵌套结构要 `copy.deepcopy`。写 RAG 代码传递 chunk 列表、检索结果时，症状是"改了 A，B 也跟着变"。

## 细节两则

- 单元素 tuple 必须带逗号：`(1,)`，`(1)` 只是带括号的 1
- dict 的键必须可哈希（不可变），`{[1,2]: "x"}` 会 TypeError，tuple 可以当键

## 参考与延伸

- [Python 官方教程（中文）· 5. 数据结构](https://docs.python.org/zh-cn/3/tutorial/datastructures.html)
- [Python - 100 天从新手到大师 · 数据结构部分](https://github.com/jackfrued/Python-100-Days)
