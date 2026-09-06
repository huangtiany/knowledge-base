---
title: 模块与包、异常处理、f-string 与文件 IO
date: 2026-09-05
tags: [Python]
summary: import 的查找机制、__main__ 判断、EAFP 异常风格、f-string 格式化，以及 Windows 上必设的 encoding="utf-8"。
---

把代码组织成模块、处理出错、格式化输出、读写文件，这四件事是之后所有工程代码的基础。

## 模块与包

一个 `.py` 文件就是一个模块，带 `__init__.py` 的目录就是一个包。import 时 Python 按 `sys.path` 查找：当前目录 → 环境里安装的第三方包。第三方包用 uv 安装（见 [uv 与 pyproject 工具链](06-uv-and-pyproject.md)）：

```bash
uv add httpx        # 装包
```

```python title="import.py"
import numpy as np                       # 整包导入加别名
from pathlib import Path                 # 从模块导入具体名字
from openai import OpenAI                # 从包的子模块导入

if __name__ == "__main__":               # 直接运行本文件时才为真
    main()
```

`__name__ == "__main__"` 让一个文件既能当模块被导入、又能当脚本直接跑，几乎所有工程代码的入口都是这个写法。

## 异常：EAFP 风格

Python 的惯用风格是 **EAFP**（Easier to Ask Forgiveness than Permission）：先做，出错了再接。对比 LBYL（Look Before You Leap，先判断再做）：

```python title="eafp.py"
config = {"chunk_size": 512}

# LBYL：先判断
size = config["chunk_size"] if "chunk_size" in config else 256

# EAFP：直接做，接住异常（Python 惯用）
try:
    size = config["chunk_size"]
except KeyError:
    size = 256
```

完整结构 `try / except / else / finally`：`else` 在没异常时执行，`finally` 无条件执行（清理资源）。捕获要**精确**，裸 `except:` 会连 `KeyboardInterrupt` 一起吞掉，至少写 `except Exception`。

自定义异常就是继承 Exception，让库里报错可区分：

```python title="custom-error.py"
class RetrieverError(Exception): ...

def retrieve(query):
    if not query:
        raise RetrieverError("query 不能为空")
```

## f-string：格式化的唯一推荐

```python title="fstring.py"
name, score, n = "bge-large", 0.8734, 1024

print(f"模型 {name}，维度 {n}")                  # 基础插值
print(f"score = {score:.2f}")                   # 两位小数
print(f"{name!r}")                              # 带引号的 repr
print(f"{n:,}")                                 # 1,024 千分位
print(f"{score=}")                              # score=0.8734，调试常用
print(f"{n:>6}")                                # 右对齐补空格
```

Python 3.12 前 f-string 里不能嵌套同样的引号，3.12 起取消了这个限制。老代码里的 `%` 和 `.format()` 能读懂即可，新代码一律 f-string。

## 文件 IO 与 encoding 坑

```python title="io.py"
from pathlib import Path

docs = Path("content/ai")            # pathlib 面向对象路径，优于字符串拼接
md_files = sorted(docs.rglob("*.md"))

with open(md_files[0], encoding="utf-8") as f:    # with 自动关闭文件
    text = f.read()

Path("out.jsonl").write_text("hello\n", encoding="utf-8")
```

`encoding="utf-8"` 在 Windows 上**必须显式写**：默认编码随系统区域设置（简中 Windows 是 GBK），读 UTF-8 的 Markdown 会直接 UnicodeDecodeError。这是 Windows 开发 Python 的第一坑，写 RAG 语料加载代码时尤其高频。

按行流式读大文件用迭代，不要一次 read()：

```python title="stream.py"
with open("corpus.txt", encoding="utf-8") as f:
    for i, line in enumerate(f):        # 逐行惰性读取，内存友好
        if i >= 3:
            break
```

## 参考与延伸

- [Python 官方教程（中文）· 6. 模块 / 8. 错误和异常 / 7. 输入与输出](https://docs.python.org/zh-cn/3/tutorial/modules.html)
- [Python - 100 天从新手到大师 · 模块与异常部分](https://github.com/jackfrued/Python-100-Days)
