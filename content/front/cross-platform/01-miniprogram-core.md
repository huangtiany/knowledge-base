---
title: 微信小程序：双线程模型与页面体系
date: 2026-09-06
tags: [跨端与桌面]
summary: 小程序的底层是渲染层与逻辑层分离的双线程：setData 是唯一数据通道、页面栈决定导航、WXML/WXSS 是私有 DSL。理解这套约束，才能理解各小程序框架在解决什么。
---

微信小程序看起来像精简版 Web，实际是一套**自成一体的运行时**：WXML/WXSS 不是 HTML/CSS，页面栈不是浏览器历史，JS 与渲染甚至不在同一个线程。下文从双线程模型讲到平台边界；这套模型是理解各小程序框架（Taro/uni-app，见[下一篇](02-miniprogram-ecosystem.md)）的前提。

## 双线程模型：为什么 setData 是唯一通道

```
┌─ 渲染层（每个页面一个 WebView）：WXML 模板 + 渲染结果
│        ↑ 初始数据 / setData 数据        ↓ 用户事件（tap/input…）
├─ 通信桥（Native 层序列化转发）
│        ↓ 视图更新指令                   ↑ 事件回传
└─ 逻辑层（单个 JSCore，全 App 共享）：业务 JS、App/Page/Component
```

- **逻辑层永远拿不到 DOM**：没有 `document`/`window`，JS 改数据只能走 `setData`，由 Native 层序列化后推给渲染层的 WebView 更新视图
- **事件反向同理**：用户 tap 后由渲染层回传给逻辑层处理。两次跨线程通信的往返成本，是小程序性能问题的根源
- 由此得到几条工程纪律：**setData 传变化的差量而非整棵数据**（序列化量正比于卡顿）、**高频更新（滚动跟随、拖拽）合并节流**、纯展示的长列表数据能不走 setData 就不走
- 对照前端熟悉的[浏览器单线程事件循环](../javascript/03-async-and-event-loop.md)：Web 里逻辑与渲染同线程（同步渲染），小程序里彻底分离（异步通信），改完数据立刻读 DOM 的写法在小程序里行不通

## 页面与生命周期：页面栈与导航

小程序没有 URL 路由，是 **Native 维护的页面栈**（上限 10 层）：

```js title="pages/detail.js"
Page({
  data: { article: null },
  onLoad(options) {          // 页面创建：options 即路径参数 ?id=1
    this.fetch(options.id);  // 每页只走一次，初始化请求放这
  },
  onShow() {                 // 每次入栈/返回前台都触发：回到页面的刷新点
    // 从"确认页"返回时刷新状态，写这里而不是 onLoad
  },
  onUnload() { /* 出栈销毁：清理定时器 */ },
  goBack() { wx.navigateBack(); },           // 出栈
});
```

| API | 栈行为 | 典型场景 |
|---|---|---|
| `wx.navigateTo` | 入栈（保留当前页） | 列表 → 详情（返回保留滚动位置） |
| `wx.redirectTo` | 替换栈顶 | 登录页跳首页（不留登录页） |
| `wx.switchTab` | 清到 tab 页 | 底部导航切换 |
| `wx.navigateBack` | 出栈 | 返回 |

- **onLoad 与 onShow 的分工**是页面刷新策略的核心：一次性初始化在 onLoad，返回页面时要刷新的逻辑在 onShow。放反了要么重复请求，要么看到旧数据
- 页面间传值有三种方式：路径参数（onLoad options）、全局 store（[Pinia 思维](../vue/02-vue-router-pinia.md)在小程序里的等价物是 mobx-miniprogram 之类）、事件通道 `EventChannel`（页面栈相邻页之间直接通信）

## WXML/WXSS 与组件化：私有 DSL 的约束与补偿

```html title="pages/list.wxml"
<view wx:for="{{items}}" wx:key="id" bindtap="onTap" data-id="{{item.id}}">
  <text>{{item.title}}</text>
  <image src="{{item.cover}}" mode="aspectFill" lazy-load />
</view>
```

- WXML 不是 HTML：标签是 view/text/image 等私有集合，绑定用 `{{}}` 插值 + `wx:if`/`wx:for` 指令。**没有原生 DOM 意味着组件库无法直接复用**，一切 Web 组件都要做小程序版（这就是后来 Taro/uni-app 要解决的核心痛点）
- WXSS 支持 CSS 大部分能力，新增 **rpx**（响应式像素，屏幕宽按 750rpx 等比缩放，设计稿按 750 宽标注直接换算）
- 组件化用 `Component()` 构造器：`properties` 进、`triggerEvent` 出，配合 `slot` 插槽，心智与 [Vue 组件](../vue/01-vue3-core.md)接近但语法私有；构造器体系里 `relations`、`behaviors`（类似 mixin）属于进阶内容，用到再查

## 能力与边界：平台约束

- **分包加载**：主包 2MB 上限（整体 20MB+），非核心页面拆子包按需下载，对标 Web 的[代码分割](../performance/01-performance-metrics.md)，但粒度和工具由平台强制
- **开放能力**：登录（wx.login 换 openid）、支付、分享、订阅消息，都走微信的审核与资质体系，[下一篇](02-miniprogram-ecosystem.md)展开
- **审核发布**：每次更新要走平台审核（数小时到数天），灰度发布、体验版/开发版/正式版三轨；相比 Web，发版不再自由，这是流程上最大的差异

## 小结

双线程决定数据更新只能走 setData，页面栈决定导航与刷新时机，私有 DSL 决定 Web 生态不能直接搬用。这三条约束也是下一篇多端框架的出发点：[Taro 与 uni-app](02-miniprogram-ecosystem.md) 做的都是用熟悉的语法编译出这套私有运行时能执行的代码。
