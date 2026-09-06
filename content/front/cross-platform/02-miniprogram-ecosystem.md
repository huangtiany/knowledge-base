---
title: 小程序生态与多端框架：Taro 与 uni-app
date: 2026-09-06
tags: [跨端与桌面]
summary: 原生小程序的 DSL 与 Web 生态割裂，多端框架用「编译到各端」抹平：Taro 走 React 语法、uni-app 走 Vue 语法——加上登录支付云开发生态与一套代码多端发布的真实成本。
---

原生小程序的三大痛点（[上一篇](01-miniprogram-core.md)）：私有 DSL 学了只在小程序用、Web 生态（npm 包、组件库）接入有摩擦、微信/支付宝/字节多家小程序要重复开发。多端框架（Taro、uni-app）就是对这些痛点的回应：**用 React 或 Vue 写代码，编译/适配到各端运行**。这篇讲清两条路线的原理与选型，以及小程序生态的核心能力。

## 多端框架的两条技术路线

```
编译时路线（主流）：React/Vue 源码 → 编译器 → 各端 DSL（WXML/Swift?/H5…）
运行时路线（补充）：在小程序里实现一个 mini React/Vue 运行时，跑真实 vdom
```

- **编译时**把 `<view>` 之类的标签映射成各端等价物，业务代码里几乎感知不到差异；缺点是语法覆盖不全（动态组件、复杂 JSX 高阶用法有编译限制）
- **运行时**（如 Taro 的 next 运行时、uni-app 的条件编译 + 运行时适配层）换取更完整的语法支持，代价是多一层性能开销
- 实际产品都是混合体：**编译为主、运行时兜底**。理解这一点，很多「为什么这个写法编译不过」的问题就有答案——查框架的语法支持表，而不是硬试

## Taro vs uni-app：按团队栈选

| 维度 | Taro | uni-app |
|---|---|---|
| 语法底座 | React（也支持 Vue） | Vue（也支持 React，生态偏 Vue） |
| 出品方 | 京东开源 | DCloud |
| 生态重点 | 微信小程序深耕 + RN/H5 | 全端覆盖（各家小程序 + App，5+ App 引擎） |
| 上手体感 | React 心智直接迁移 | Vue 心智直接迁移 |

- 选型一句话：**团队主栈是 React 用 Taro，主栈是 Vue 用 uni-app**——语法迁移成本远大于框架间的能力差异，两者对主流小程序端的覆盖都成熟
- 写法示例（同一逻辑的 Taro 版）：

```jsx title="pages/list.jsx"
import { View, Text, Image } from "@tarojs/components";
import { useDidShow } from "@tarojs/taro";

export default function List() {
  const [items, setItems] = useState([]);
  useDidShow(() => refresh());            // 小程序 onShow 的 React 化
  return (
    <View>
      {items.map((it) => (
        <View key={it.id} onClick={() => Taro.navigateTo({ url: `/pages/detail?id=${it.id}` })}>
          <Text>{it.title}</Text>
        </View>
      ))}
    </View>
  );
}
```

熟悉的 React hooks + 组件标签，编译产物是真正的 WXML/WXSS/JS——**心智留在 Web，产物落地小程序**。生命周期用 `useDidShow/useDidHide` 等钩子对齐页面栈语义（[双线程模型](01-miniprogram-core.md)里的 onLoad/onShow 分工在这里依旧成立）。

## 生态核心能力：登录、支付与云开发

**登录是所有小程序的起点**，流程要记住（静默登录为主）：

```
前端 wx.login() 拿 code（临时凭证，5 分钟有效）
→ 传给自家后端，后端拿 appid+secret+code 调微信接口换 openid/session_key
→ 后端签发自家会话（token），前端存储后续携带
```

- 关键认知：**code2Session 必须在后端做**（secret 不能进前端，等价于[前端环境变量](../engineering/05-deploy-and-monitoring.md)的密钥红线）；前端拿到的 openid 之前只能做「静默登录」，头像昵称等资料要用户主动授权
- **支付**：前端 `wx.requestPayment` 只做最后一步「调起收银台」，订单创建与签名全在后端——前端支付代码极少，链路责任在后端
- **云开发**：微信官方的 serverless（云函数 + 云数据库 + 存储），小程序端直接调用、免鉴权打通 openid——原型与中小项目免运维利器，但锁定微信生态，跨端项目慎用

## 一套代码多端发布的真实成本

框架抹平了 80% 的差异，剩下 20% 靠**条件编译**诚实面对：

```jsx title="payment.jsx"
if (process.env.TARO_ENV === "weapp") {
  Taro.requestPayment({ /* 微信收银台 */ });
} else if (process.env.TARO_ENV === "h5") {
  location.href = payUrl;                  // H5 端没有收银台，走跳转
}
```

- 平台差异集中在三处：**支付与登录**（每家小程序一套 API）、**组件细节**（导航栏、下拉刷新的原生行为）、**审核规则**（各平台类目资质不同）
- 实践策略：核心业务代码零条件编译（框架层抹平），条件编译只收口在「平台能力调用层」——把它封装成自己的 `platform/pay.ts`，业务代码永远不知道自己在哪个端
- H5 与 App 端是同一套框架的额外产物：Taro/uni-app 都能出 H5（营销页复用业务组件）和 App（uni-app 的 5+ 引擎 / Taro 配 RN），「一次开发全端覆盖」的营销话术里，**小程序 + H5 是真实可行的，App 端要按[原生渲染方案](03-rn-flutter.md)另行评估**

## 小结

多端框架的心法两句话：**语法留在 React/Vue，产物交给编译器**（编译为主、运行时兜底），**条件编译收口在平台能力层**（业务代码保持端无关）。登录支付的链路责任在后端，前端只握调起与凭证传递。小程序之外的端——原生渲染移动端与桌面——见接下来两篇：[RN 与 Flutter](03-rn-flutter.md)、[Tauri](04-tauri-core.md)。
