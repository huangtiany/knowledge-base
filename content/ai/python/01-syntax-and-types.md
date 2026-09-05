---
title: 变量、基本类型与 None
date: 2026-09-05
tags: [Python]
summary: 动态类型的运行时心智模型：名字是标签不是盒子，鸭子类型看行为不看血统，None 是一个真实的单例对象。
---

Python 基础段第一篇。不铺垫历史不对比语言，直接建立 Python 的运行时心智模型——后面所有篇章都建立在这篇之上。

## 名字是标签，不是盒子

Python 的变量赋值不是"把值放进盒子"，而是"给对象贴标签"：

```python title="binding.py"
a = [1, 2, 3]
b = a          # b 和 a 是同一个对象的两个名字
b.append(4)
print(a)       # [1, 2, 3, 4] —— a 也"变"了
```

`b = a` 没有复制任何东西，只是让两个名字指向同一个列表对象。理解了这一点，后面"浅拷贝"、"可变默认参数"这些经典坑都只是这句话的推论。

一切皆对象：整数、字符串、函数、类本身都是对象，都可以被赋值、传参、放进容器。函数是一等公民这件事，是装饰器（进阶段）的地基。

## 基本类型速览

| 类型 | 例 | 要点 |
|---|---|---|
| `int` | `42` | **任意精度**，不会溢出，`2 ** 100` 直接算 |
| `float` | `3.14` | 双精度浮点，有精度问题 |
| `bool` | `True` / `False` | 是 `int` 的子类，`True == 1` |
| `str` | `"你好"` | **不可变**，Unicode 原生支持 |
| `bytes` | `b"\x00"` | 字节序列，文件/网络用 |
| `NoneType` | `None` | 见下节 |

两个高频坑：

```python title="pitfalls.py"
print(0.1 + 0.2)          # 0.30000000000000004 —— 二进制浮点的老问题
print(1 == True)          # True —— bool 是 int 子类
s = "hello"
# s[0] = "H"              # TypeError: str 不可变，要改就造新的
```

## 鸭子类型：看行为，不看血统

Python 不问"你是什么"，只问"你能做什么"：

```python title="duck.py"
def total_length(things):
    return sum(len(x) for x in things)

total_length(["ab", "cd"])     # 4
total_length(("xy", [1, 2]))   # 4 —— 元组和列表都行
```

`total_length` 不声明参数类型，只要对象支持 `len()` 就能用。这就是鸭子类型："走起来像鸭子、叫起来像鸭子，那它就是鸭子"。代价是错误要到运行时才暴露；补方法是类型注解（见[类型注解](07-type-annotations.md)）——写注解不是给机器看的枷锁，是给编辑器和半年后的自己看的说明书。

## None：一个真实的单例对象

`None` 不是空指针，不是"未定义"，它是一个**真实存在的单例对象**，表示"这里故意没有值"。

判断必须用 `is`，不能用 `==`：

```python title="none.py"
def find_user(uid):
    if uid == 1:
        return {"name": "格致"}
    return None

user = find_user(2)
if user is None:        # ✅ 恒等判断
    print("没找到")
```

原因是 `==` 可以被类自定义（`__eq__`），一个实现了怪异 `__eq__` 的对象可能"等于" None；`is` 比较的是对象身份，不会被骗。同理，空容器判断惯用写法是利用真值：

```python title="truthiness.py"
items = []
if not items:           # ✅ 惯用：空容器为假
    print("空列表")
```

`0`、`""`、`[]`、`{}`、`None` 都为假，其余为真——但注意这会连带把 `0` 挡掉，"区分没有值和值为零"的场景必须用 `is None`。

## 要点回收

- 赋值是绑定名字，不是拷贝值；可变对象的共享引用是大多数"灵异 bug"的根源
- int 不溢出，str 不可变，bool 是 int
- 鸭子类型是默认协议，类型注解是可选的精确化
- `is None` 判空，真值判断判"空容器"

## 参考与延伸

- [Python 官方教程（中文）· 3. An Informal Introduction to Python](https://docs.python.org/zh-cn/3/tutorial/introduction.html)
- [Python - 100 天从新手到大师 · Day1-15 基础部分](https://github.com/jackfrued/Python-100-Days)
