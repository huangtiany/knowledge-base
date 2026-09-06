---
title: Function Calling：模型与工具的标准接口
date: 2026-09-05
tags: [工具调用/MCP]
summary: function calling 中模型只输出结构化的调用请求，不执行任何函数，执行永远在你的代码里。理解这个分工，schema、错误处理与安全设计的细节都能对上。
---

[最小 Agent 循环](03-minimal-agent-loop.md)已经在用 function calling，这里把它作为独立协议展开：schema 的写法、执行的信任边界、并行调用与流式。

## 机制：一次"请求-决策-执行-回填"的往返

```text
你的代码                                  模型
   │ 1. messages + tools(schema) ────────▶ │
   │                                       │ 决策：需要调 get_weather("杭州")
   │ 2. ◀──────── tool_calls ──────────────│    （只是结构化 JSON，不执行）
   │ 3. 执行 get_weather("杭州")             │
   │ 4. messages + role=tool 结果 ────────▶ │
   │                                       │ 基于结果继续生成
```

关键认知：**模型从不执行任何东西**。它输出的是"我想调 get_weather，参数是杭州"这个**结构化意图**，执行、鉴权、错误处理全在你的代码里。这层分工决定了安全性设计：真正的权限控制在你的工具实现里，不要依赖模型自身的判断。

## Schema 写法：工具文档 = 模型的使用说明书

```python title="schema-best.py"
tools = [{
    "type": "function",
    "function": {
        "name": "search_orders",
        "description": (
            "按条件搜索用户的订单。当用户询问订单状态、历史、物流时使用；"
            "闲聊或咨询类问题不要调用。时间范围不明确时先向用户确认。"
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "start_date": {"type": "string", "format": "date",
                               "description": "起始日期，ISO 格式 YYYY-MM-DD"},
                "status": {"type": "string",
                           "enum": ["paid", "shipped", "refunded"],
                           "description": "订单状态过滤"},
            },
            "required": ["start_date"],
        },
    },
}]
```

三条实操规律：

- **description 写"什么时候用/什么时候不用"**，比写"这是什么"更影响调用准确率
- **enum > 自由文本**：能用枚举约束的参数绝不开放字符串
- **required 最小化**：必填越多，模型越容易填错；可选参数靠 description 引导

## 并行调用与流式

现代 API 支持一次返回多个 tool_calls（"查北京和上海的天气"→ 两个并行调用）：

```python title="parallel.py"
for tc in msg.tool_calls:                       # 顺序遍历，但执行可并发
    tasks.append(execute_async(tc))
results = await asyncio.gather(*tasks)          # 见 asyncio 篇
```

流式场景的注意点：tool_calls 是**分片到达**的（`function.arguments` 逐段拼接），流式消费时要按 `index` 聚合完整后再解析。

## 错误处理：错误信息是给模型的反馈

工具执行失败时，**不要抛异常终止循环**，把结构化错误作为 tool result 返回：

```python title="error-back.py"
def execute(tc) -> str:
    try:
        return json.dumps(TOOLS[tc.function.name](**json.loads(tc.function.arguments)))
    except ValidationError as e:
        return json.dumps({"error": "参数不合法", "detail": e.errors()})
    except Exception as e:
        return json.dumps({"error": f"{type(e).__name__}: {e}"})
```

模型看到错误会自行修正参数重试：这是 Agent 自愈的机制基础。但**执行侧要设硬边界**：单工具超时、单轮最大调用数，防止模型对同一错误无限重试。

## 安全清单

- 工具实现内做**鉴权与租户隔离**（不要把 user_id 交给模型传参，从会话注入）
- 危险操作（写库、发邮件、付款）加**确认门**：工具返回"待确认"而不是直接执行，由人/策略放行
- 工具返回内容会进入下一轮 prompt，外部数据源是 prompt 注入的入口，不可信内容做清洗（这是 Agent 安全的头号议题，MCP 篇会再回到这里）

## 参考与延伸

- [OpenAI · Function Calling 指南](https://platform.openai.com/docs/guides/function-calling)
- [Anthropic · Tool Use 文档](https://docs.anthropic.com/en/docs/build-with-claude/tool-use)
