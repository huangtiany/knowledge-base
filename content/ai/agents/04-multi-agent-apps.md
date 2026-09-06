---
title: 多智能体应用：MetaGPT 与 ChatDev
date: 2026-09-05
tags: [Agent生态]
summary: 给一句话，产出整套软件：把软件公司的 SOP 编码成多 Agent 流水线。MetaGPT 和 ChatDev 是这个思路的两个代表作，成功与局限同样有启发。
---

[多智能体篇](../agent/05-multi-agent.md)说过：多 Agent 方案的一半价值在于帮你判断什么时候不该用它。MetaGPT 和 ChatDev 证明了另一半：在**任务天然有角色分工、有标准化产物**的领域，多 Agent 流水线确实有效。

## MetaGPT：把 SOP 写进流水线

MetaGPT（开源，约 70k stars，ICLR 口头报告）的核心想法：**不只给 Agent 分配角色，把人类软件公司的标准作业流程（SOP）也编码进去**。

```text
输入一行需求
  → 产品经理 Agent 产出 PRD（需求文档）
  → 架构师 Agent 产出系统设计与 API 定义
  → 项目经理 Agent 拆解任务
  → 工程师 Agent 写代码
  → QA Agent 出测试
输出：完整的分析文档 + 可运行的项目
```

三个值得借鉴的设计：

- **结构化产物即接口**：Agent 之间传递的不是聊天文本，是标准化的文档（PRD、设计文档、代码文件），正是[多智能体纪律](../agent/05-multi-agent.md)里"接口即合同"的实现。上游产物的错误会在下游被文档格式约束挡住一部分
- **发布-订阅的消息池**：每个 Agent 把产物写进共享环境，订阅自己关心的消息类型，解耦了 Agent 间的直接依赖（对照 LangGraph 的 State，同一思想的两种实现）
- **SOP 减少了自由度**：流程固定 = 决策点少 = 失败模式可控，这是它能跑通长链条的根本原因

它的商业产品 mgx.dev 走得更远，但开源版的价值在架构可读——想看"角色分工 + 文档接力"的标准实现，直接读 `metagpt/roles/` 目录。

## ChatDev：同样思路的更小实现

ChatDev（OpenBMB，清华系）用更小的体量实现了同构想法：CEO + CTO + 程序员 + 审查员 + 测试员，聊天链驱动，几分钟从一句话到一个可跑的小软件。它的价值是**便于教学**：代码量小，一个下午能读完整个多 Agent 链路，适合作为 MetaGPT 之前的入门拆解对象。

## 边界与局限

这一类"AI 软件公司"项目的演示效果集中在**小型项目**（一个贪吃蛇、一个待办应用）。放大到真实工程，两个结构性限制就会显现：

- **上下文装不下真实项目**：真实代码库的复杂度远超演示规模，角色流水线的每一环都会超载（编程 Agent 篇的 OpenHands 用事件流 + 检索对抗的正是这个问题，路线完全不同）
- **错误级联**：PRD 错 → 设计错 → 代码全错，链条越长错误越难回收，这也是为什么 MetaGPT 自己也在往"人介入关键节点"的方向演化

定位建议：**把它当"多 Agent 结构化产出"的架构参考和原型加速器**（小工具、demo、脚手架确实快），不是"自动写真实系统"的答案。真实系统的做法见编程 Agent 那一章的"验证闭环 + 上下文工程"。

## 参考与延伸

- [FoundationAgents/MetaGPT](https://github.com/FoundationAgents/MetaGPT)
- [OpenBMB/ChatDev](https://github.com/OpenBMB/ChatDev)
- [MetaGPT 论文](https://arxiv.org/abs/2308.00352)
