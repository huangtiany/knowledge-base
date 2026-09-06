---
title: 实战：写一个自己的 MCP Server
date: 2026-09-05
tags: [工具调用/MCP]
summary: 用 FastMCP 把本站知识库包成 MCP Server——tool + resource 双原语、stdio 传输、接入 Claude Desktop 验证，45 行起步。
---

概念在[上一篇](07-mcp-protocol.md)，这篇动手：把「格致」知识库包成一个 MCP Server，让任何 MCP Host（Claude Desktop、IDE、自建 Agent）都能检索本站的 Markdown 文章。选 Python 官方 SDK 的 FastMCP 风格——用装饰器声明，几十行可跑。

## 项目骨架

```bash
uv init gezhi-mcp && cd gezhi-mcp
uv add "mcp[cli]"          # 官方 Python SDK，自带 FastMCP
```

```python title="server.py"
"""格致知识库 MCP Server：把本站 Markdown 暴露给任意 MCP Host"""
import json
from pathlib import Path
from mcp.server.fastmcp import FastMCP

DOCS = Path(__file__).parent / "content"          # 指向本站 content/ 目录
mcp = FastMCP("gezhi-kb", instructions="格致个人知识库：AI/Agent、后端与前端笔记")

@mcp.tool()
def search_docs(query: str, top_k: int = 5) -> str:
    """按关键词检索知识库文章，返回最相关的文章标题与路径。

    适合回答"站里有没有关于 X 的内容"。先检索再按需用 read_doc 读全文。
    """
    hits = []
    for md in DOCS.rglob("*.md"):
        text = md.read_text(encoding="utf-8")
        score = sum(text.count(kw) for kw in query.split())
        if score:
            hits.append((score, str(md.relative_to(DOCS)), md.stem))
    hits.sort(reverse=True)
    return json.dumps([{"path": p, "title": t} for _, p, t in hits[:top_k]],
                      ensure_ascii=False)

@mcp.tool()
def read_doc(path: str) -> str:
    """读取指定 path 的文章全文（path 来自 search_docs 的返回）。"""
    target = (DOCS / path).resolve()
    if not target.is_relative_to(DOCS.resolve()):     # 路径穿越防护
        raise ValueError("path 越界")
    return target.read_text(encoding="utf-8")

@mcp.resource("kb://{path}")
def doc_as_resource(path: str) -> str:
    """把文章作为只读资源暴露（应用可主动注入，不经模型决策）"""
    return (DOCS / path).read_text(encoding="utf-8")

if __name__ == "__main__":
    mcp.run()                                          # 默认 stdio 传输
```

三个值得注意的写法：

- **docstring 就是工具文档**：SDK 把它编译成模型可见的 description，按[function calling 的写法纪律](06-function-calling.md)认真写
- **路径穿越防护**：`resolve() + is_relative_to`——任何接收路径参数的工具都要做，否则 `../../.zshrc` 就是数据泄露
- **tool vs resource 的取舍**：模型决策触发的（搜索）做成 tool；应用可主动注入的（读全文）同时暴露 resource

## 调试与接入

```bash
# 方式一：SDK 自带 inspector（网页调试台，看 tool 列表、手动调用）
uv run mcp dev server.py

# 方式二：直接连 Claude Desktop —— 配置文件里加：
# claude_desktop_config.json
# {
#   "mcpServers": {
#     "gezhi-kb": { "command": "uv",
#                   "args": ["run", "--directory", "/abs/path/gezhi-mcp", "server.py"] }
#   }
# }
```

stdio 模式的两个高频坑：**日志只能打到 stderr**（stdout 是协议通道，混入 print 会破坏 JSON-RPC）；路径必须绝对路径（Host 的工作目录不是你的项目目录）。

## 从 demo 到生产

- **传输换 Streamable HTTP**：stdio 只适合本地单机；远程部署用 `mcp.run(transport="streamable-http")`，客户端跨网络连接
- **检索升级**：demo 里是关键词计数，换成真向量检索（见 [RAG 章](../rag/01-chunking-strategies.md)），工具签名不变——工具接口稳定，实现可替换
- **鉴权**：远程 Server 必须加鉴权（token/OAuth），凭证按 Server 粒度最小化
- **测试**：tool 实现是普通函数，直接 pytest（见[pytest 入门](../python/10-pytest-basics.md)）；协议层用 inspector 冒烟

## 参考与延伸

- [MCP Python SDK 文档](https://github.com/modelcontextprotocol/python-sdk)
- [MCP 官方文档 · 写第一个 Server](https://modelcontextprotocol.io/docs/develop/build-server)
- [microsoft/mcp-for-beginners（中文）](https://github.com/microsoft/mcp-for-beginners)
