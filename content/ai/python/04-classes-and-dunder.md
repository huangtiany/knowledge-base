---
title: 类与 OOP：__init__、继承与 dunder 方法
date: 2026-09-05
tags: [Python]
summary: Python 风格的面向对象：self 的含义、类属性与实例属性、super 与 MRO，以及用 dunder 方法给自定义类接入语言协议。
---

Python 的 OOP 比 Java 系轻得多：没有接口关键字、没有访问修饰符、不强制一切皆类。本篇讲类机制，重点是 dunder 方法，它是鸭子类型在类层面的实现方式。

## __init__ 与 self

```python title="basic-class.py"
class Chunk:
    def __init__(self, text, score=0.0):
        self.text = text
        self.score = score

    def summary(self):
        return f"{self.text[:20]}… (score={self.score})"

c = Chunk("向量检索的原理是把文本变成高维向量……", 0.82)
c.summary()
```

`self` 就是"实例自己"，Python 只是不帮你隐式传递：`c.summary()` 等价于 `Chunk.summary(c)`。`__init__` 不是构造器（真正的构造器是 `__new__`），它是初始化钩子，日常 99% 只用它。

实例属性和类属性要分清：

```python title="attr.py"
class Doc:
    kind = "markdown"        # 类属性：所有实例共享
    def __init__(self, name):
        self.name = name     # 实例属性：每实例一份
```

给 `self.kind` 赋值会在实例上**新建**一个同名属性遮住类属性。共享可变的类属性（比如类属性是 list）是另一个经典坑。

## 继承与 super()

继承只做两件事：**复用**（父类写好的方法子类直接用）+ **改写**（只重写不一样的那一小块）。

```python title="inherit.py"
class BaseRetriever:
    def __init__(self, top_k=3):
        self.top_k = top_k

    def retrieve(self, query):
        # 模板方法：流程固定，具体搜索交给子类
        # 这里的 self 是实际创建的实例，所以会自动调到子类的 _search
        return self._search(query)[:self.top_k]

    def _search(self, query):
        raise NotImplementedError

class VectorRetriever(BaseRetriever):
    def __init__(self, top_k=3, model="bge-small"):
        super().__init__(top_k)  # ① 先让父类初始化它负责的 top_k
        self.model = model       # ② 再初始化子类自己的部分

    def _search(self, query):
        return [f"vec({query})-{self.model}"]

r = VectorRetriever(top_k=5)
r.retrieve("什么是 RAG？")  # retrieve 没重写也能用，内部调的是子类的 _search
```

三句话讲清：

1. **没重写就能用是复用**：`VectorRetriever` 里没有 `retrieve`，但实例能直接调，因为会沿继承链向上找到 `BaseRetriever.retrieve`。
2. **重写后自动生效是多态**：`retrieve` 里的 `self._search(...)`，`self` 是 `VectorRetriever` 的实例，所以跑的是子类版本，不用改父类代码。
3. **`super().__init__()` 是必备套路**：子类一旦自己写了 `__init__`，父类的 `__init__` 就**不会自动执行**了。忘了写 `super().__init__(top_k)`，`self.top_k` 就不存在，`retrieve` 一跑就 `AttributeError`。记住规则：**子类 `__init__` 的第一行，先调 `super().__init__(...)`**。

那 `super()` 到底是什么？单继承下把它当成"父类"即可。`super().__init__(top_k)` 等价于"用父类的 `__init__` 初始化我"。之所以不用 `BaseRetriever.__init__(self, top_k)` 硬编码，是因为多继承时 Python 会按 MRO（方法解析顺序）链逐个查找，`super()` 能保证链上每个类都被协作初始化一次。日常开发无需深究 MRO，遇到 mixin 时查一下 `VectorRetriever.__mro__` 即可。

约定俗成：`_name` 表示"内部使用，请勿直接调用"（属于约定规范，语言不强制），`__name` 会触发名称改写（几乎用不到，别拿它当私有权限机制）。

## dunder 方法：接入语言协议

双下划线方法（dunder）是 Python 的**协议接口**：实现了 `__len__` 就能 `len()`，实现了 `__iter__` 就能 for 循环，实现了 `__call__` 就能像函数一样调用。这比继承抽象基类更贴近 Python 的惯例：

```python title="dunder.py"
class Scored:
    def __init__(self, name, score):
        self.name, self.score = name, score

    def __repr__(self):                     # 调试显示（repr / 交互式输出）
        return f"Scored({self.name!r}, {self.score:.2f})"

    def __eq__(self, other):                # 支持 == 比较
        return isinstance(other, Scored) and self.name == other.name

    def __lt__(self, other):                # 支持 < ，进而 sorted() 可用
        return self.score > other.score     # 分数高的排前面

docs = [Scored("b.md", 0.7), Scored("a.md", 0.9)]
print(sorted(docs))                         # 按 __lt__ 排序
```

常用协议速查：`__repr__`/`__str__`（显示）、`__eq__`/`__hash__`（相等与哈希，实现了 `__eq__` 会默认把 `__hash__` 置 None，对象将不可放进 set/dict）、`__len__`/`__getitem__`/`__iter__`（容器协议）、`__enter__`/`__exit__`（with 协议，见[下一篇](09-decorators-context-generators.md)前的 with 部分）、`__call__`（可调用）。

纯数据类不必手写这些，`@dataclass` 会自动生成（见 [dataclass 与 pydantic](08-dataclass-and-pydantic.md)）。

## @property：把方法伪装成属性

先看它解决什么问题。假设一开始 `token_count` 就是个存下来的数字：

```python
doc = Document("hello world")
doc.token_count          # 像属性一样取，很爽
doc._text = "新文本"     # 但文本变了，token_count 就过期了
```

改成方法 `doc.token_count()` 倒是永远最新，但所有调用方都要加括号，API 变了。`@property` 就是两全：**调用方继续写 `doc.token_count`（不加括号），背后其实每次都在执行一段方法**。

```python title="property.py"
class Document:
    def __init__(self, text):
        self.text = text  # 走下面的 @text.setter，顺带做清洗

    @property
    def text(self):
        return self._text

    @text.setter
    def text(self, value):
        self._text = value.strip()
        if not self._text:
            raise ValueError("text 不能为空")

    @property
    def token_count(self):
        return len(self._text) // 4  # 每次访问实时计算，不存、不过期

doc = Document("  hello world  ")
doc.token_count   # 2：像属性一样访问，背后是计算
doc.text = "  新文本  "
doc.token_count   # 文本变了，结果自动变，不用手动同步
doc.token_count = 5  # 报错 AttributeError：没写 setter 的 property 是只读的
```

三句话讲清：

1. **写法**：在方法上加 `@property`，方法名就是对外暴露的属性名。读 `doc.token_count` 时 Python 自动调这个方法，**不用加括号**。
2. **存值要用另一个名字**：真正的数据存在 `self._text` 里。如果在 `text` 的 getter 里又写 `self.text`，等于自己调自己，会无限递归，这是新手最常见的报错。
3. **setter 是可选的**：只写 `@property` 就是只读属性（赋值直接报错，适合 `token_count` 这种派生值）；再写一个同名的 `@xxx.setter` 就是可写属性，可以在写入时做校验和清洗（适合 `text`）。

什么时候用？一句话：**对外想保持 `obj.attr` 的简洁写法，对内又想要方法的控制力**（实时计算、参数校验、只读保护、以后从"存下来的值"改成"算出来的值"而不改调用方）时用它。

> 如果你写过 Vue，可以直接类比 `computed`：定义时写成函数，用时当属性访问（都不加括号），带 `get/set` 的 computed 对应 `@property` + `@xxx.setter`。区别有两点：Vue 的 computed 带依赖缓存、依赖不变不重算，`@property` 每次访问都重算（想缓存一次用 `functools.cached_property`）；Vue 依赖变化会自动触发视图更新，Python 没有响应式，只是现用现算。

## 参考与延伸

- [Python 官方教程（中文）· 9. 类](https://docs.python.org/zh-cn/3/tutorial/classes.html)
- [Python - 100 天从新手到大师 · 面向对象部分](https://github.com/jackfrued/Python-100-Days)
