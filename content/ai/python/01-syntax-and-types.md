---
title: 变量、基本类型与 None
date: 2026-09-05
tags: [Python]
summary: 动态类型的运行时模型：赋值是给对象贴标签，鸭子类型按行为判断，None 是一个真实的单例对象。
---

本篇建立 Python 的运行时模型：名字与对象的关系、基本类型的行为、鸭子类型与 None 的语义。后续篇章都建立在这套模型上。

## 名字是标签，不是盒子

Python 的变量赋值不是"把值放进盒子"，而是"给对象贴标签"：

```python title="binding.py"
a = [1, 2, 3]
b = a          # b 和 a 是同一个对象的两个名字
b.append(4)
print(a)       # [1, 2, 3, 4]：a 也变了
```

`b = a` 没有复制任何东西，只是让两个名字指向同一个列表对象。理解了这一点，后面"浅拷贝"、"可变默认参数"这些经典坑都只是这句话的推论。

一切皆对象：整数、字符串、函数、类本身都是对象，都可以被赋值、传参、放进容器。函数是一等公民这件事，是装饰器（进阶段）的实现基础。

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
print(0.1 + 0.2)          # 0.30000000000000004：二进制浮点的精度问题
print(1 == True)          # True：bool 是 int 子类
s = "hello"
# s[0] = "H"              # TypeError: str 不可变，要改就造新的
```

## 鸭子类型：按行为判断

Python 不检查参数的声明类型，只看对象支持的操作：

```python title="duck.py"
def total_length(things):
    return sum(len(x) for x in things)

total_length(["ab", "cd"])     # 4
total_length(("xy", [1, 2]))   # 4：元组和列表都行
```

`total_length` 不声明参数类型，只要对象支持 `len()` 就能用。代价是错误要到运行时才暴露；补方法是类型注解（见[类型注解](07-type-annotations.md)），注解同时给编辑器补全和读代码的人提供信息。

## None：一个真实的单例对象

`None` 不是空指针，不是"未定义"，它是一个**真实存在的单例对象**，表示"这里故意没有值"。

只有当变量指向的对象就是全局唯一的 `None` 时，`is None` 才为 `True`。函数无返回值或只有空 `return` 时，都会返回 `None`。

判断 `None` 必须用 `is`，不能用 `==`：

```python title="none.py"
def find_user(uid):
    if uid == 1:
        return {"name": "格致"}
    return None

user = find_user(2)
if user is None:        # 恒等判断，不用 ==
    print("没找到")
```

原因是 `==` 可以被类自定义（`__eq__`），一个实现了特殊 `__eq__` 的对象可能"等于" None；`is` 比较的是对象内存身份，不受其影响。

### 真值判断 vs is None

在条件分支中，Python 会自动对值进行真假值测试（Truthiness）。不要把"假值"和 `None` 混淆：

| 表达式 | `bool(...)` | `... is None` | 说明 |
|---|---|---|---|
| `None` | `False` | **`True`** | 唯一的单例对象 |
| `0` | `False` | `False` | 整数对象，不是 None |
| `""`（空字符串） | `False` | `False` | 字符串对象，不是 None |
| `[]`（空列表） | `False` | `False` | 列表对象，不是 None |
| `{}`（空字典） | `False` | `False` | 字典对象，不是 None |
| `False` | `False` | `False` | 布尔对象，不是 None |

区分两种场景的惯用写法：

```python title="truthiness.py"
# 场景 1：检查容器是否为空（惯用真值判断）
items = []
if not items:           # 惯用：空容器为假
    print("空列表")

# 场景 2：区分"没有传值"还是"传了 0 / 空字符串"（必须用 is None）
def set_score(score=None):
    if score is None:
        print("未评分")
    else:
        print(f"得分: {score}")  # score=0 时能正常进入分支
```

## 小结

- 赋值是绑定名字，不是拷贝值；可变对象的共享引用是大多数意外 bug 的根源
- int 不溢出，str 不可变，bool 是 int
- 鸭子类型是默认协议，类型注解是可选的精确化
- `is None` 判空，真值判断判"空容器"

## 参考与延伸

- [Python 官方教程（中文）· 3. An Informal Introduction to Python](https://docs.python.org/zh-cn/3/tutorial/introduction.html)
- [Python - 100 天从新手到大师 · Day1-15 基础部分](https://github.com/jackfrued/Python-100-Days)
