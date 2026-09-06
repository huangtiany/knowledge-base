---
title: pytest 入门
date: 2026-09-05
tags: [Python]
summary: 断言即测试、参数化、fixture 管依赖、mock 边界：最小成本的测试习惯，从写给 embedding 函数的第一个单测开始。
---

测试是重构的前提。pytest 的哲学是**让测试看起来就是普通 Python 函数**：不用类、不用断言库，`assert` 什么就测什么，失败时自动展开上下文。

## 第一批测试

```
my-rag/
├── pyproject.toml
├── src/retriever.py
└── tests/test_retriever.py
```

```python title="tests/test_retriever.py"
from retriever import normalize, top_k

def test_normalize_unit_length():
    v = normalize([3.0, 4.0])
    assert abs(sum(x * x for x in v) - 1) < 1e-9    # 单位向量

def test_normalize_zero_vector():
    assert normalize([0.0, 0.0]) == [0.0, 0.0]      # 边界：零向量不除零

def test_top_k_order():
    docs = [("a", 0.5), ("b", 0.9), ("c", 0.7)]
    assert top_k(docs, 2) == [("b", 0.9), ("c", 0.7)]
```

```bash
uv run pytest -v          # 跑全部，-v 显示每个用例
uv run pytest tests/test_retriever.py::test_normalize_unit_length   # 跑单个
```

规则：文件 `test_*.py`，函数 `test_*`，pytest 自动发现。**每个测试只测一件事，名字写行为**——`test_normalize_zero_vector` 半年后不用读实现就知道测的什么。

## 参数化：一个用例跑多组数据

```python title="parametrize.py"
import pytest

@pytest.mark.parametrize("raw, expected", [
    ("  hello  ", "hello"),
    ("", ""),
    ("你好\n", "你好"),
])
def test_clean_text(raw, expected):
    assert clean_text(raw) == expected
```

边界情况（空串、unicode、超长）集中列表化管理，比复制粘贴十个测试函数干净得多。

## fixture：测试的依赖注入

被测函数需要数据库、API key 或临时文件时，用 fixture 声明一次，按名注入：

```python title="fixtures.py"
import pytest

@pytest.fixture
def sample_chunks():
    return ["text one", "text two", "text three"]

@pytest.fixture
def tmp_corpus(tmp_path):                 # tmp_path 是内置 fixture：临时目录
    f = tmp_path / "corpus.txt"
    f.write_text("line1\nline2", encoding="utf-8")
    return f

def test_iter_chunks(sample_chunks, tmp_corpus):
    assert len(sample_chunks) == 3
    assert tmp_corpus.exists()
```

`tmp_path`、`caplog`、`monkeypatch` 是常用的内置 fixture。fixture 默认每个测试独立（隔离），`scope="module"` 可共享昂贵资源。

## mock：隔离外部依赖

单测不该真的调 embedding API，又慢又花钱还不稳定：

```python title="mock.py"
from unittest.mock import Mock

def test_index_builds_from_embedder():
    fake_embedder = Mock()
    fake_embedder.embed.return_value = [[0.1, 0.2]]

    index = build_index(fake_embedder, docs=["a.md"])

    fake_embedder.embed.assert_called_once_with(["a.md"])
    assert index.vectors == [[0.1, 0.2]]
```

原则：**mock 边界，不 mock 内部**。mock 网络客户端/模型 API，绝不 mock 被测函数自己调的下层工具函数。

## 参考与延伸

- [pytest-chinese-doc（官方文档中文翻译 + 大量示例）](https://github.com/luizyao/pytest-chinese-doc)
- [pytest 官方文档](https://docs.pytest.org/)
