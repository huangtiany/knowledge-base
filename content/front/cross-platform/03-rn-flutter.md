---
title: React Native 与 Flutter：移动跨端选型
date: 2026-09-06
tags: [跨端与桌面]
summary: 移动跨端的两条路线：RN 用 JS 驱动原生组件，Flutter 用 Dart 自绘像素。机制差异、上手方式与选型清单。
---

小程序覆盖的是微信生态内的端，移动 App（iOS/Android）需要另一层方案。两条路线方向相反：React Native 让 JS 驱动原生控件（平台感强），Flutter 用自己的引擎把每个像素画出来（一致性强）。下文讲机制差异、各自的现代形态与选型清单。Web 端的跨端（小程序）见[前两篇](02-miniprogram-ecosystem.md)，桌面端见[Tauri](04-tauri-core.md)。

## 两条路线：桥接原生 vs 自绘引擎

```
React Native：  JS/React 代码 → （新架构 JSI 直调）→ 原生组件（UIKit/Android View）
                UI 是真的原生控件：滚动惯性、无障碍、系统字体自动适配

Flutter：       Dart 代码 → Flutter 引擎（Impeller/Skia）→ 自绘像素
                UI 是引擎画出来的：iOS/Android/桌面/Web 渲染完全一致
```

- **RN 的哲学是「learn once, write anywhere」**：复用 React 心智与生态，UI 用平台原生控件渲染，平台感是现成的，代价是两端表现可能有细微差异
- **Flutter 的哲学是「write once, run anywhere」**：一切皆 Widget、全部自己绘制，三端像素级一致、动画性能稳定（不依赖平台控件），代价是平台感要自己模拟（Cupertino/Material 两套组件风格）
- RN 的演进要点：**New Architecture**（JSI 同步直调替代旧异步 Bridge、Fabric 渲染器、TurboModules 按需加载）解决了老架构的性能与类型痛点；**Expo** 把原生构建、推送、更新等原生工程工作打包成托管服务，纯前端背景也能完成 RN App 开发
- Flutter 的演进要点：Impeller 替代 Skia 后着色器卡顿基本消除；Dart 语言本身（强类型、AOT 编译）是前端背景的主要学习成本

## React Native 速览：Web 开发者的移动端

```jsx title="App.jsx"
import { View, Text, Pressable, FlatList } from "react-native";

export default function App() {
  return (
    <FlatList
      data={articles}
      keyExtractor={(it) => String(it.id)}
      renderItem={({ item }) => (
        <Pressable onPress={() => openDetail(item.id)}>
          <Text style={{ fontSize: 16 }}>{item.title}</Text>   {/* 样式是 JS 对象（Yoga 布局） */}
        </Pressable>
      )}
    />
  );
}
```

- 组件名即平台控件（View/Text/Pressable），样式用 JS 对象表达（Flexbox，由 Yoga 引擎布局，无 CSS 层叠/继承/选择器）
- **Expo 是今天的默认起点**：`npx create-expo-app` 起步、`expo-router` 文件路由、OTA 更新（`expo-updates`，跳过应用商店发 JS 层修复）、`eas build` 云端打包，不写一行原生代码就能走完开发到上架
- 需要平台独有能力时写**原生模块**（Swift/Kotlin），Expo 的 module 生态已覆盖推送/相机/存储等绝大多数需求，需要 eject 出原生项目的情况已基本消失

## Flutter 速览：一切皆 Widget

```dart title="counter.dart"
class Counter extends StatefulWidget { /* 状态由 StatefulWidget 持有 */ }

class _CounterState extends State<Counter> {
  int _count = 0;
  @override
  Widget build(BuildContext context) {
    return Column(children: [
      Text("$_count"),
      FilledButton(onPressed: () => setState(() => _count++), child: Text("加一")),
    ]);
  }
}
```

- Widget 树 ≈ 声明式 UI（与 React/Vue 同构心智），`setState` 触发重建；**状态管理可以直接套用 React 的经验**（provider/riverpod/bloc 对标 Redux/Zustand）
- Dart 对前端是一条平缓曲线（强类型 + async/await + 类似 TS 的体验）；热重载体验与 Web dev server 同级
- 强项场景：品牌一致的重 UI 应用（动画复杂、多端风格统一）、性能敏感的动效页面

## 选型清单

| 维度 | React Native | Flutter | 原生 |
|---|---|---|---|
| 团队背景 | React/Web 团队零迁移 | 需学 Dart（曲线平缓） | iOS/Android 各一队 |
| UI 风格 | 平台原生感 | 三端像素一致 | 平台正统 |
| 性能上限 | 绝大多数业务够用（新架构后） | 动效/图形重场景更稳 | 上限最高 |
| 生态复用 | npm + React 生态 | pub.dev（自成体系） | 平台 SDK 最全 |
| Web 复用 | 业务逻辑/工具层可共享 | 逻辑层可共享（UI 不行） | 无 |

决策顺序建议：**先确认真的需要 App**（很多需求小程序 + H5 就够，见[上一篇](02-miniprogram-ecosystem.md)）→ React 团队/要平台感选 RN（从 Expo 进）→ 重 UI 一致性/图形动效选 Flutter → 深度依赖平台最新能力（相机管线、健康数据）或超性能敏感再谈原生。

## 小结

RN 复用 Web 开发心智、渲染原生控件，Flutter 用自绘引擎保证多端一致。两者都成熟，选型主要看团队栈与 UI 诉求。桌面端方案见[Tauri](04-tauri-core.md)。
