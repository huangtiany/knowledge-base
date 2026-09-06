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

```python title="inherit.py"
class BaseRetriever:
    def retrieve(self, query):
        return self._search(query)          # 模板方法

    def _search(self, query):
        raise NotImplementedError

class VectorRetriever(BaseRetriever):
    def _search(self, query):
        return [f"vec({query})"]
```

约定俗成：`_name` 是内部使用（只是君子协定，没有强制），`__name` 触发名称改写（一般用不到，别用来做"私有"）。多继承存在且 MRO（方法解析顺序）保证查找顺序确定，`super()` 按 MRO 向上找。日常写协作式 `super().__init__()` 即可，MRO 细节遇到多继承混入（mixin）时再看。

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

```python title="property.py"
class Document:
    def __init__(self, text):
        self._text = text

    @property
    def token_count(self):
        return len(self._text) // 4     # 每次访问实时计算

doc.token_count        # 像属性一样访问，背后是计算
```

对外保持"取属性"的简洁语法，对内保留改成计算逻辑的自由。

## 参考与延伸

- [Python 官方教程（中文）· 9. 类](https://docs.python.org/zh-cn/3/tutorial/classes.html)
- [Python - 100 天从新手到大师 · 面向对象部分](https://github.com/jackfrued/Python-100-Days)
