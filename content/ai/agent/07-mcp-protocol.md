---
title: MCP 协议：工具接入的 USB-C
date: 2026-09-05
tags: [工具调用/MCP]
summary: MCP 解决的不是"模型能不能调工具"，是"工具能不能只写一次、被所有应用复用"：Client/Server 架构、三类原语、与 function calling 的关系。
---

Function calling 的痛点：每个应用都要为每套数据源手写一遍工具集成。MCP（Model Context Protocol，Anthropic 2024.11 开源）把它标准化成**工具侧只实现一次 Server，任何支持 MCP 的应用都能即插即用**——社区比喻是"AI 应用的 USB-C 接口"。

## 定位：它在协议栈的哪一层

```text
你的 Agent 应用（MCP Host，如 Claude Desktop / IDE / 自建应用）
    └── MCP Client（每个 Server 一条连接）
          └── MCP Server（暴露：tools / resources / prompts）
                └── 你的数据与系统（数据库、API、文件系统）
```

MCP **不替代 function calling**：Host 把 MCP Server 暴露的工具翻译成模型的 function calling schema，模型侧体验完全不变。MCP 管的是 **Host 与外部工具源之间**的标准化协议：发现（list tools）、调用（call tool）、传输（stdio / Streamable HTTP）。

## 三类原语

| 原语 | 控制方 | 类比 | 例 |
|---|---|---|---|
| **Tools** | 模型决策调用 | function calling | 查数据库、发消息 |
| **Resources** | 应用决定注入 | 只读上下文 GET | 文件内容、表结构 |
| **Prompts** | 用户主动选择 | 预设的提示词模板 | "/总结这个 repo" |

Tools 是绝对的主角（模型自主触发）；Resources 是应用层的只读数据暴露；Prompts 是面向用户的快捷入口。理解控制方归属，就能判断一个功能该做成哪个原语。

## Server 一角：声明与实现

```python title="server-snapshot.py"
# 完整可运行版见下一篇
from mcp.server.fastmcp import FastMCP

mcp = FastMCP("knowledge-base")

@mcp.tool()
def search_docs(query: str, top_k: int = 5) -> str:
    """在格致知识库中检索文档。用于回答站点内容相关问题时。"""
    return json.dumps(rag_search(query, top_k), ensure_ascii=False)

@mcp.resource("docs://{path}")
def get_doc(path: str) -> str:
    """读取知识库中的原始 Markdown 文档"""
    return (DOCS_ROOT / path).read_text(encoding="utf-8")
```

注意 `@mcp.tool()` 的 docstring 与类型注解，MCP SDK 把它们编译成模型可见的 schema，和 function calling 的写法纪律完全一致。

## 为什么它重要：三个实际收益

1. **生态复用**：官方/社区的成百上千个现成 Server（GitHub、Postgres、Slack、浏览器……）直接接入你的 Host，见 modelcontextprotocol/servers 合集
2. **解耦升级**：工具实现改动不碰应用代码；Host 应用不锁定于特定模型供应商
3. **权限边界清晰**：Server 是天然的沙箱单元：给 Server 什么凭证，这个 Agent 会话就有什么能力

## 安全：MCP 的头号议题

MCP 让接入工具变得容易，也让**供应链攻击面**变大：Server 是第三方代码，它返回的内容会进入模型上下文（**间接 prompt 注入**的经典入口），工具描述本身也可能藏着诱导。纪律：

- 只装可信来源的 Server，凭证按 Server 最小化授权
- 危险 tool 的执行保留确认门（human-in-the-loop），不信模型的自主判断
- Server 返回内容当"不可信输入"处理，与用户输入同等对待

## 参考与延伸

- [MCP 官方文档](https://modelcontextprotocol.io)
- [microsoft/mcp-for-beginners（官方课程中文版）](https://github.com/microsoft/mcp-for-beginners)
- [modelcontextprotocol/servers（官方与社区 Server 合集）](https://github.com/modelcontextprotocol/servers)
