---
title: 平台与低代码：Dify、Coze Studio、FastGPT 与 n8n
date: 2026-09-05
tags: [Agent生态]
summary: 不写代码搭一个带 RAG、工作流和知识库的 Agent——平台层的价值是把工程最佳实践产品化。看懂 Dify 的架构，等于看懂这类平台的最小完备集。
---

生态的第三层是**平台**：可视化编排 + 模型管理 + RAG 内置 + 一键发布。对工程团队它们是"快速验证场"，对非工程团队它们是唯一入口。开源平台还能私有化部署——这一层中文生态格外繁荣。

## Dify：开源 LLMOps 的完备标本

Dify（langgenius，开源，社区极活跃）是这类平台里架构最值得研究的：把一个 LLM 应用需要的全部工程件拆成了正交模块——

- **应用编排**：聊天助手 / Agent / 工作流三种应用形态，画布上拖节点（LLM 节点、知识检索节点、代码节点、条件分支）
- **模型管理**：统一网关接几十家模型供应商，切换模型不改编排
- **知识库（RAG 内置）**：上传文档 → 自动分段 → embedding → 检索测试一条龙（对应本站 RAG 章的整条管线，在 Dify 里是产品化表单）
- **发布与运维**：API 后端 / WebApp / 嵌入组件三种出口，带日志与标注

看懂 Dify 的模块划分，等于拿到"一个 LLM 应用平台的**最小完备集**"清单——将来自己写服务（[FastAPI 那条路](../python/13-fastapi-service.md)）时，这份清单就是功能对照表。

## Coze Studio：大厂引擎的开源化

字节 2025 年 7 月把服务自家商业平台的「扣子」核心引擎开源为 **Coze Studio**（Apache 2.0）。看点不是"又一个低代码平台"，而是**工业级工作流引擎的产品化形态**：拖拽式编排、插件体系、多 Agent 模式、知识库，背靠豆包系模型的深度集成。配套的 Coze Loop 补了运维侧（评测与观测，对应本站[评测章](../evaluation/01-evaluation-first.md)）。对国内团队，这是"平台层自建"最现实的起点之一。

## FastGPT：中文知识库问答的垂直标本

FastGPT（labring，开源）比 Dify 窄——专注**知识库问答**这一种应用形态，但做深了：可视化Flow编排、专门的 RAG 质量调优面板（分段策略、检索测试、引用标注）。它和 Dify 的对比本身就是教材：**平台选型先问"我要通用编排还是垂直场景做深"**。要给本站做"格致问答"（实战一）的话，FastGPT/Dify 都是先跑通原型的候选——用它们验证需求，再用代码实现定制部分。

## n8n：工作流自动化的 AI 化

n8n 是老牌自动化工作流平台（连接几百个 SaaS），AI 节点加入后成了"Agent 编排"的另一条路线：**触发器思维**——定时、Webhook、邮件事件触发 Agent 执行，再把结果分发到飞书/邮件/数据库。它提醒我们：很多"Agent 应用"本质是"自动化工作流 + AI 判断节点"，不一定需要 Agent 框架（回到 [workflow vs agent](../agent/01-workflow-vs-agent.md) 的判断）。

## 平台 vs 代码的取舍

| | 平台（Dify/Coze） | 代码（FastAPI + 框架） |
|---|---|---|
| 起步速度 | 小时级 | 天级 |
| 定制上限 | 平台的边界 | 无 |
| 调试深度 | 表单与日志 | 断点与测试（[pytest](../python/10-pytest-basics.md)） |
| 适合 | 验证需求、非工程团队、标准场景 | 核心业务、深度定制 |

工程团队的成熟姿势是**两段式**：平台里验证想法 → 跑通的需求用代码重写沉淀。反过来只活在平台里，迟早撞上"这个节点逻辑平台表达不了"的墙。

## 参考与延伸

- [langgenius/dify](https://github.com/langgenius/dify)
- [coze-dev/coze-studio（字节扣子开源版）](https://github.com/coze-dev/coze-studio)
- [labring/FastGPT](https://github.com/labring/FastGPT)
- [n8n-io/n8n](https://github.com/n8n-io/n8n)
