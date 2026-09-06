---
title: 函数、参数与作用域
date: 2026-09-05
tags: [Python]
summary: 位置/关键字参数、*args/**kwargs、lambda、LEGB 作用域与闭包，以及可变默认参数这个官方文档都要专门警告的坑。
---

函数是 Python 组织代码的最小单元。本篇覆盖参数系统、lambda、LEGB 作用域，以及可变默认参数与晚绑定两个经典坑。

## 参数系统：位置、关键字、默认值

```python title="args.py"
def call_llm(prompt, *, model="gpt-4o", temperature=0.7, max_tokens=None):
    ...

call_llm("你好")                                    # 默认参数
call_llm("你好", model="gpt-4o-mini")               # 关键字参数，可读
call_llm("你好", temperature=0)                      # 0.0
```

`*` 之后的参数**强制关键字传参**。LLM SDK 的函数几乎都这么设计：参数太多，位置传参容易错位。反过来 `*args, **kwargs` 收集任意参数：

```python title="kwargs.py"
def log_call(func, *args, **kwargs):
    print(f"调用 {func.__name__}, kwargs={kwargs}")
    return func(*args, **kwargs)
```

记住方向：定义处 `*` 是打包，调用处 `*` 是解包。

## lambda：一次性的小函数

lambda 只能是单个表达式，典型用法是排序键：

```python title="lambda.py"
docs = [("a.md", 0.82), ("b.md", 0.95), ("c.md", 0.71)]
ranked = sorted(docs, key=lambda x: x[1], reverse=True)
# [('b.md', 0.95), ('a.md', 0.82), ('c.md', 0.71)]
```

需要多行、需要文档字符串的，就写 `def`；lambda 适合"这里要一个函数，但不值得命名"的场景。

## LEGB 作用域与闭包

变量查找顺序：**L**ocal → **E**nclosing（外层函数）→ **G**lobal → **B**uilt-in。内层函数可以读外层变量，这就是闭包：

```python title="closure.py"
def make_adder(n):
    def add(x):
        return x + n      # 捕获外层的 n
    return add

add10 = make_adder(10)
add10(5)                  # 15
```

闭包是装饰器（见[装饰器、with 与生成器](09-decorators-context-generators.md)）的实现基础。要在内层**重新绑定**外层变量，必须声明 `nonlocal`（改外层函数的变量）或 `global`（改模块变量）。不声明的话，赋值会创建一个新的局部变量，这是最常见的静默 bug。

## 坑一：可变默认参数

```python title="mutable-default.py"
def add_msg(msg, bag=[]):       # 默认值只在定义时创建一次
    bag.append(msg)
    return bag

add_msg("a")    # ['a']
add_msg("b")    # ['a', 'b']：上次的 bag 还在

def add_msg_ok(msg, bag=None):  # 惯用解法
    if bag is None:
        bag = []
    bag.append(msg)
    return bag
```

默认值在函数**定义时**求值一次，而不是每次调用时。所有默认值只允许不可变对象（`None`、str、tuple、int）。

## 坑二：晚绑定

```python title="late-binding.py"
funcs = [lambda: i for i in range(3)]
print([f() for f in funcs])     # [2, 2, 2]：都引用同一个 i

funcs = [lambda i=i: i for i in range(3)]   # 用默认参数固化
print([f() for f in funcs])     # [0, 1, 2]
```

闭包捕获的是变量本身，不是求值时的值。循环里造闭包，用默认参数把值固定在定义时。

## 参考与延伸

- [Python 官方教程（中文）· 4. 更多控制流工具](https://docs.python.org/zh-cn/3/tutorial/controlflow.html#defining-functions)
- [Python - 100 天从新手到大师 · 函数部分](https://github.com/jackfrued/Python-100-Days)
