---
title: 通用与计算机操作 Agent：Manus、Open Interpreter 与 browser-use
date: 2026-09-05
tags: [Agent生态]
summary: 给我一句话，帮你把事办完——通用 Agent 的野心是把人的电脑操作本身变成工具。这一类项目的可靠性瓶颈和突破点都在 GUI 理解。
---

编程 Agent 之后，生态的下一个主战场是**计算机操作 Agent**：不限定领域，直接操作浏览器、终端、文件系统，把"人坐在电脑前能做的事"变成 Agent 能做的事。任务形态最性感，工程难点也最密集。

## Manus：执行型通用 Agent 的爆款样本

Manus（2025 年 3 月爆火，闭源）定义了这一类的产品形态：给它一个任务（"帮我筛选 200 份简历"），它在**云端虚拟机**里自主工作——拆解计划、写代码处理数据、查网页、生成文件，全程可见，交付结果而非对话。

值得记住的不是神话，是它验证了几个判断：

- **执行环境隔离是通用 Agent 的前提**——虚拟机里随便折腾，才敢放开手脚（编程 Agent 篇的沙箱逻辑放大到整机）
- **规划-执行分离**：先产出可见的任务清单（todo list）再逐项执行，用户可中途干预——是 [evaluator-optimizer 与 orchestrator 模式](../agent/02-five-patterns.md)的产品化
- **通用性来自工具的广度**，不是模型的魔法：浏览器、shell、代码执行、文件处理，每个都是普通工具

开源社区的反应本身就是最好的教材：MetaGPT 团队用约 3 小时复刻出 **OpenManus**（开源，效果可用），证明了"循环 + 工具集 + 环境隔离"的本质并不神秘——神秘的是打磨。

## Open Interpreter：代码即动作

Open Interpreter（2023）是这一类的思想鼻祖：让 LLM 在本地写并执行 Python/JS 代码，把"操作电脑"归结为"写脚本"——查文件、批量改名、画图表，全都通过代码完成。

它的启发在于一个选择：**code as action 优于离散点击**。代码是压缩了意图的动作（一段 for 循环 = 一百次鼠标点击），可审查、可修改、可组合。后来的通用 Agent（包括 Manus）处理数据时几乎都退到写代码这条路上——直接操作 GUI 是下策，能让模型写代码就别让它点按钮。

## GUI 操作：Computer Use 与 browser-use

总有些场景没有 API、只能操作界面。两条路线：

**截图-理解-点击（screen grounding）**：Claude Computer Use、OpenAI Operator 的路线——截屏给多模态模型，输出"点击 (x, y) / 输入文字"的指令序列。通用性拉满（人能点的它都能点），可靠性也拉满地难：分辨率/滚动/弹窗/动态加载，每一步都可能让坐标错位。**长程任务的误差累积**是这类 Agent 的头号难题。

**浏览器语义化操作**：browser-use 的路线——在 Playwright 之上把页面解析成结构化的元素树（带可点击标签），Agent 操作的是"语义元素"而不是像素坐标。可靠性高一个量级，代价是只限浏览器。如果你的任务在浏览器内，这是工程上的优选。

```python title="browser-use-demo.py"
# browser-use 的接口长这样：自然语言任务进，浏览器动作出
from browser_use import Agent
from langchain_openai import ChatOpenAI

agent = Agent(
    task="打开格致知识库，找到 RAG 章的向量库选型笔记，总结三个候选的定位",
    llm=ChatOpenAI(model="gpt-4o"),
)
await agent.run()      # 内部：页面→结构化元素树→LLM 决策→Playwright 执行→循环
```

## 给自己的选型建议

- 任务在浏览器内、追求可靠 → browser-use 路线
- 桌面应用无 API 可用 → 才考虑截图类（Computer Use/Operator）
- 数据处理/文件批处理 → 永远优先 Open Interpreter 式的代码执行
- 无论哪条：执行环境隔离 + 每步可见 + 可中断，是通用 Agent 不变成"失控实习生"的底线

## 参考与延伸

- [OpenInterpreter/open-interpreter](https://github.com/OpenInterpreter/open-interpreter)
- [browser-use/browser-use](https://github.com/browser-use/browser-use)
- [FoundationAgents/OpenManus（Manus 的开源复现）](https://github.com/FoundationAgents/OpenManus)
