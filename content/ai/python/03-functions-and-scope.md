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

`*` 之后的参数**强制关键字传参**。LLM SDK 的函数几乎都这么设计：参数太多，位置传参容易错位。`/` 之前则相反，强制位置传参（一般见于 C 扩展或内置函数）。日常记住这 5 类即可：

| 写法 | 含义 | 例子 |
|---|---|---|
| `def f(a, b)` | 位置或关键字都可 | `f(1, 2)` / `f(a=1, b=2)` |
| `def f(a, /, b)` | `a` 只能位置传 | `f(1, b=2)` ✅，`f(a=1, b=2)` ❌ |
| `def f(a, *, b)` | `b` 只能关键字传 | `f(1, b=2)` ✅，`f(1, 2)` ❌ |
| `def f(a=1)` | 默认值，不传就用它 | `f()` → `a=1` |
| `def f(*args, **kwargs)` | 兜底收集（见下两节） | 任意多余参数 |

## *args：把多余的位置参数打包成 tuple

定义时 `*args` 把所有**多出来的位置实参**收进一个 tuple。名字习惯叫 `args`，但本质是"带一颗星的参数"，叫什么都行。

```python title="star-args.py"
def sum_all(*nums):
    print(type(nums), nums)  # <class 'tuple'>
    return sum(nums)

sum_all(1, 2, 3)    # tuple (1, 2, 3) → 6
sum_all()           # tuple () → 0，一个不传就是空元组，不报错
sum_all("a", "b")   # ('a', 'b') —— 类型不限，拼字符串也行，但 sum 会炸

def build_prompt(prefix, *chunks):
    # 典型 AI 用法：前缀 + 不定数量的检索片段
    body = "\n\n".join(f"[{i}] {c}" for i, c in enumerate(chunks))
    return f"{prefix}\n{body}"

build_prompt("回答问题：", "chunk A", "chunk B", "chunk C")
```

用法要点：

1. **只能按位置收**：`def f(*args)` 里 `args` 永远是 tuple，可以 `args[0]`、`len(args)`、`for x in args`，但没有关键字名字。
2. **转发是最大用途**：装饰器、重试、打日志、wrapper 都靠它把原样参数透传下去：
   ```python title="forward-args.py"
   import functools, time

   def retry(times=3):
       def deco(func):
           @functools.wraps(func)  # 保留函数名和文档
           def wrapper(*args, **kwargs):
               for i in range(times):
                   try:
                       return func(*args, **kwargs)
                   except Exception:
                       if i == times - 1:
                           raise
                       time.sleep(1)
           return wrapper
       return deco

   @retry(times=2)
   def call_llm(prompt, model="gpt-4o"):
       ...
   # call_llm("hi", model="gpt-4o-mini") 里 args=("hi",), kwargs={"model": ...}
   ```
3. **和普通参数混用时放后面**：`def f(model, *args)`，`model` 先吃掉第一个，后面剩下的才进 `args`。

## **kwargs：把多余的关键字参数打包成 dict

定义时 `**kwargs` 把所有**多出来的关键字实参**收进一个 dict（key 都是字符串）。

```python title="star-kwargs.py"
def make_request(prompt, **kwargs):
    print(type(kwargs), kwargs)  # <class 'dict'>
    # 用 .get 读可选配置，比写一长串具名参数省事
    model = kwargs.get("model", "gpt-4o")
    temperature = kwargs.get("temperature", 0.7)
    return {"prompt": prompt, "model": model, "temperature": temperature}

make_request("hi")                                          # {'prompt': 'hi', ...默认...}
make_request("hi", model="gpt-4o-mini", temperature=0)       # 覆盖默认值
make_request("hi", max_tokens=500, seed=42)                 # 多余的也不会报错，都在 kwargs 里

def merge_config(default: dict, **override):
    # 典型 AI 用法：默认超参 + 调用方覆盖
    return {**default, **override}

merge_config({"model": "gpt-4o", "temperature": 0.7}, temperature=0, timeout=30)
# {'model': 'gpt-4o', 'temperature': 0, 'timeout': 30}
```

用法要点：

1. **遍历靠 `.items()`**：`for k, v in kwargs.items()`，判断有没有传用 `if "model" in kwargs` 或 `kwargs.get(...)`。
2. **透传给 SDK 是最大用途**：自己只关心 `prompt`，剩下全部丢给 OpenAI / Anthropic 客户端：
   ```python title="passthrough.py"
   def ask(prompt, **opts):
       # opts 可能是 model / temperature / max_tokens / response_format ...
       return client.chat.completions.create(
           messages=[{"role": "user", "content": prompt}],
           **opts,
       )

   ask("总结这段", model="gpt-4o-mini", temperature=0)
   ```
3. **拼写错了不会报错**：`ask("hi", temperture=0)`（少个 a）会被默默收进 `kwargs` 再透传，SDK 可能直接忽略。这是 `**kwargs` 最大的坑——对外暴露的公共函数，能写具名参数就别只留 `**kwargs`。

## 组合起来：定义顺序与调用处解包

### 定义处：一种固定顺序

```python title="signature-order.py"
def generate(prompt, *args, top_p=1.0, *, model="gpt-4o", **kwargs):
    ...
```

顺序永远是：**位置参数 → `*args` → 默认参数/关键字参数 → 裸 `*` → 强制关键字参数 → `**kwargs`**。记住一句话就行：

> 定义处 `*` 是**打包**，调用处 `*` 是**解包**，方向相反。

### 调用处：`*列表` / `**字典` 拆开再传

```python title="unpack-call.py"
def call_llm(prompt, model="gpt-4o", temperature=0.7):
    ...

args = ("你好",)                              # 位置实参装在 tuple/list 里
opts = {"model": "gpt-4o-mini", "temperature": 0}  # 关键字实参装在 dict 里

call_llm(*args)          # 等价于 call_llm("你好")
call_llm("你好", **opts)  # 等价于 call_llm("你好", model=..., temperature=0)
call_llm(*args, **opts)  # 混用：先拆位置，再拆关键字

# 合并多个配置也很常用
base = {"model": "gpt-4o", "temperature": 0.7}
override = {"temperature": 0}
call_llm("hi", **{**base, **override})  # temperature=0 生效
```

注意两条规则：位置解包在前、关键字解包在后；重复传参会 `TypeError`（比如 `call_llm("hi", *["hey"])` 给了两次 `prompt`）。

## lambda：一次性的小函数

语法只有一种：`lambda 参数: 表达式`。冒号左边是参数（可以 0 到多个，支持默认值），右边**只能是一个表达式**，算完的值自动 `return`。

```python title="lambda-basic.py"
add = lambda x, y: x + y          # 等价于 def add(x, y): return x + y
add(1, 2)                         # 3

greet = lambda name="world": f"hi {name}"
greet()                           # 'hi world'

# 三元表达式可以塞进 lambda（因为它本身也是表达式）
grade = lambda s: "pass" if s >= 60 else "fail"
grade(75)                         # 'pass'
```

但注意，**不要给 lambda 起名**（`add = lambda ...`）。PEP 8（E731）明确建议写 `def`：`def` 有函数名、文档字符串、更好的报错堆栈，`lambda` 赋值版三者全丢。lint 工具（ruff/flake8）会直接警告。

lambda 的存在意义是"**这里要一个函数，但不值得命名**"——通常是当场传给另一个高阶函数：

```python title="lambda.py"
docs = [("a.md", 0.82), ("b.md", 0.95), ("c.md", 0.71)]

# 1. 排序 / 取最值：key 函数
ranked = sorted(docs, key=lambda x: x[1], reverse=True)
# [('b.md', 0.95), ('a.md', 0.82), ('c.md', 0.71)]
best = max(docs, key=lambda x: x[1])  # ('b.md', 0.95)

# 2. 过滤 / 映射：小谓词、小变换
scores = [0.82, 0.95, 0.71, 0.3]
hits = list(filter(lambda s: s > 0.8, scores))   # [0.82, 0.95]
tags = list(map(lambda s: round(s, 1), scores))  # [0.8, 0.9, 0.7, 0.3]

# 3. 多参数 + 默认值也行
pairs = [(1, "b"), (1, "a"), (0, "z")]
sorted(pairs, key=lambda p: (p[0], p[1]))  # 先按分数再按名字
```

lambda 的三条限制，决定了什么时候**必须换回 `def`**：

1. **只能写表达式**：不能有赋值（`=`）、`if` 语句、`for` 循环、`try`、`return`、`with`。需要多行的直接写 `def`。
2. **没有文档和名字**：`help()` 看不到说明，报错堆栈只显示 `<lambda>`，复杂逻辑不利于维护与调试。
3. **闭包是晚绑定**：循环里批量生成 lambda 会捕获同一个变量引用（见下文"坑二"），要用 `lambda i=i: ...` 把当前值固化。

一句话总结：排序 key、过滤条件或单行变换用 lambda；其他一律写 `def`。

## LEGB 作用域与闭包

### 1. 变量先去哪找：LEGB

函数里用一个变量时，Python 按这个顺序找，**找到即停**：

**L**ocal（当前函数内）→ **E**nclosing（外层函数）→ **G**lobal（模块顶层）→ **B**uilt-in（`len`、`print` 这种内置）。

```python title="legb.py"
model = "gpt-4o"              # G: 模块全局

def chat(prompt):
    model = "gpt-4o-mini"     # E: 外层函数
    def complete():
        model = "local-test"  # L: 当前函数，优先级最高
        print(model)
    complete()                # local-test

chat("hi")
print(model)                  # gpt-4o，全局没被改

# B 的例子：你没定义 len，Python 去内置里找
print(len("abc"))             # 3
```

记住：**赋值即定义局部变量**。函数里 `model = ...` 默认是新建一个 L，不会影响外面的同名变量——想改外面的，得用下文的 `nonlocal` / `global`。

### 2. 闭包是什么：外层函数活完了，变量还活着

闭包只需要 3 个条件，缺一不可：

1. 函数里嵌套了另一个函数；
2. 内层函数**引用了**外层函数的变量；
3. 内层函数被**返回到外面**使用（外层都执行完了还在用）。

```python title="closure.py"
def make_adder(n):
    def add(x):
        return x + n      # 引用了外层的 n
    return add            # 把内层函数返回出去

add10 = make_adder(10)    # make_adder 已经执行完、退出了
add10(5)                  # 15 —— 但 n=10 还活着，被 add 记住了
add10(1)                  # 11 —— 同一个 n 反复用
```

分步理解：`make_adder(10)` 执行时创建了 `n=10` 和 `add`；正常情况下函数退出 `n` 就该销毁，但因为 `add` 还引用着它，Python 把 `n` 放入 cell 对象中随 `add` 一起返回。这就是闭包机制：**封闭打包了外部变量的函数**。

可以亲手验证这个 cell：

```python title="closure-cell.py"
print(add10.__closure__)                    # (<cell at ...>,) —— 非空就是闭包
print(add10.__closure__[0].cell_contents)   # 10 —— 关进去的正是 n
```

### 3. 闭包用来干嘛：给函数带"记忆"

普通函数调完状态就丢了，闭包让内层函数**自带一份私有状态**，不用写类、不用全局变量：

```python title="closure-counter.py"
def make_counter():
    count = 0
    def incr():
        nonlocal count    # 声明"这是外层的 count，不是新建局部"
        count += 1
        return count
    return incr

c1 = make_counter()
c1(), c1()                # 1, 2
c2 = make_counter()
c2()                      # 1 —— c1、c2 的 count 互不干扰，各自打包了一份
```

AI 场景同理：固定一份配置，反复调用：

```python title="closure-llm.py"
def make_asker(model, temperature=0):
    def ask(prompt):
        return client.chat.completions.create(
            model=model, temperature=temperature,
            messages=[{"role": "user", "content": prompt}],
        )
    return ask

ask_mini = make_asker("gpt-4o-mini")  # 配置被"记住"了
ask_mini("总结这段")                   # 每次只传 prompt
```

这也是装饰器（见[装饰器、with 与生成器](09-decorators-context-generators.md)）的实现基础：装饰器就是返回闭包，用内层 `wrapper` 记住原函数 `func`。

### 4. 读可以，改要声明：nonlocal / global

规则很简单，看你要做什么：

| 操作 | 要声明吗 | 例子 |
|---|---|---|
| 只**读**外层变量 | 不用 | `return x + n` |
| 调可变对象的方法（如 `list.append`） | 不用（没重新绑定） | `bag.append(msg)` |
| **重新绑定**外层函数的变量（`=`、`+=`） | `nonlocal` | `nonlocal count; count += 1` |
| **重新绑定**模块全局变量 | `global` | `global total; total += 1` |

最常见的静默 bug 就是漏了声明：

```python title="nonlocal-bug.py"
def make_counter_bad():
    count = 0
    def incr():
        count += 1        # ❌ 没写 nonlocal，= 让它变成新的局部变量
        return count
    return incr

make_counter_bad()()      # UnboundLocalError: count —— 读写冲突直接报错
```

一句话：**函数里只要出现 `变量 = ...`，它就是局部变量**，除非提前写了 `nonlocal` / `global` 声明。

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
# 加括号看更清楚：(lambda: i) 才是列表的元素，后面的 for 是推导式，不是 lambda 的参数
funcs = [(lambda: i) for i in range(3)]
print([f() for f in funcs])     # [2, 2, 2] —— 都引用同一个 i

funcs = [(lambda i=i: i) for i in range(3)]   # ✅ 用默认参数固化
print([f() for f in funcs])     # [0, 1, 2]
```

闭包捕获的是变量本身，不是求值时的值。循环里造闭包，用默认参数把值固定在定义时。

## 参考与延伸

- [Python 官方教程（中文）· 4. 更多控制流工具](https://docs.python.org/zh-cn/3/tutorial/controlflow.html#defining-functions)
- [Python - 100 天从新手到大师 · 函数部分](https://github.com/jackfrued/Python-100-Days)
