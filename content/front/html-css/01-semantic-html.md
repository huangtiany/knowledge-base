---
title: HTML 语义化：语义标签与可访问性
date: 2026-09-06
tags: [HTML与CSS]
summary: 语义化同时服务可访问性、SEO 与可维护性。语义标签、标题层级、表单与 ARIA 的使用边界。
---

语义化不是代码洁癖，它同时服务三件事：**读屏软件怎么理解页面**（可访问性）、**搜索引擎怎么索引内容**（SEO）、**半年后怎么改这段代码**（可维护性）。div 当下省事，语义化的收益在长期。

## 文档骨架：先有 meta，再有内容

页面从 head 里的元信息开始，之后才是 `<body>` 的内容：

```html title="skeleton.html"
<!doctype html>
<html lang="zh-CN">          <!-- lang 决定读屏发音与浏览器翻译提示 -->
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <!-- viewport 缺失 = 移动端按 980px 桌面宽渲染再缩小，响应式全部失效 -->
  <title>页面标题 · 站名</title>
  <meta name="description" content="一句话描述，搜索结果摘要的候选来源" />
</head>
```

最容易忽略的是 `lang` 和 `viewport`：前者影响无障碍与翻译，后者不写，所有响应式布局直接作废。

## 语义标签：地标区域与 div 的分界

HTML5 的一批语义标签用来划分页面的地标区域（landmark），读屏软件靠它们跳转：

```html title="landmarks.html"
<header>   <!-- 页头：logo、站名、主导航；不是"页面顶部的 div" -->
  <nav aria-label="主导航"><ul>…</ul></nav>
</header>
<main>     <!-- 全页唯一；读屏软件的"跳到主内容"锚点 -->
  <article>  <!-- 独立可分发的内容单元：一篇文章、一条评论、一张卡片 -->
    <h1>文章标题</h1>
    <section>  <!-- 主题分组，通常配一个标题；纯样式容器才用 div -->
      <h2>小节</h2>
    </section>
  </article>
  <aside>    <!-- 与主内容弱相关：侧栏、推荐阅读 -->
</main>
<footer>   <!-- 页脚：版权、备案、次级链接 -->
```

判断标准：**容器有主题就用语义标签，纯为样式包一层才用 div**。`section` 与 `div` 的分界就在有没有主题。

## 文本语义：标题层级是目录不是字号

`h1`–`h6` 的本质是文档大纲（outline），浏览器扩展、读屏软件、搜索引擎都按层级建立目录。两件常被做反的事：

```html title="heading.html"
<!-- 反例：按视觉大小选标题，层级跳跃 -->
<h1>页面标题</h1>
<h4>区块标题</h4>        <!-- 视觉上小就选 h4？层级断了 -->

<!-- 正解：层级只按大纲走，视觉大小交给 CSS -->
<h1>页面标题</h1>
  <h2>区块标题</h2>
```

同级的实用标签还有：`time datetime="2026-09-06"`（机器可读的时间）、`figure` + `figcaption`（带说明的图文单元）、`blockquote`（引用，与 `q` 行内引用区分）、`code`/`pre`（代码与预格式化）。这些标签的共同点是**把「这是什么」直接写进标签**，不靠 class 名暗示。

## 表单与交互：label 和 button 的边界

表单是语义问题最集中的地方，两条规则：

```html title="form.html"
<label for="email">邮箱</label>
<input id="email" type="email" required />
<!-- label 的 for 与 input 的 id 绑定：点击 label 聚焦输入框，读屏报出字段名 -->

<a href="/terms">查看条款</a>   <!-- 导航用 a -->
<button type="submit">提交</button> <!-- 动作用 button -->
```

- **每个可输入控件都该有 label**：没有 label 的输入框，读屏用户听到的是空白；点 label 聚焦输入框的交互也来自这个绑定
- **a 和 button 的分界是「跳转还是动作」**：用 a 做 onclick 动作会丢掉键盘语义（回车/空格触发、disabled 态），反过来用 button 做跳转则丢掉中键新开标签页
- input 的 `type` 尽量精确：`type="email"` 让移动端弹对应键盘，`type="number"` 提供数字步进，这些都是原生自带的体验

## 可访问性：ARIA 是补丁，不是基础设施

无障碍的基本原则：**优先用原生元素，原生语义不够时才用 ARIA**。

```html title="a11y.html"
<!-- 用 ARIA 造按钮：可以工作，但丢了原生行为 -->
<div role="button" tabindex="0">保存</div>

<!-- 原生 button：焦点管理、键盘事件、语义自带 -->
<button>保存</button>
```

日常真正需要补的三件事：图片的 `alt` 写「说明」而不是「图片」（纯装饰图给空 `alt=""` 让读屏跳过）；交互元素必须可键盘到达（不要用 CSS 移除 `:focus` 轮廓，要改就换成更明显的高亮样式）；动态更新的区域用 `aria-live="polite"` 通知读屏。更进一步的内容（焦点陷阱、路由焦点管理）等实际项目需要时再补。

## 小结

语义化让结构可被程序读取：读屏软件、搜索引擎和浏览器扩展都依赖清晰的结构，用户覆盖面与 SEO 随之改善，半年后自己也能改得动。用 div 堆砌也能交付，只是这些收益都拿不到。下一篇回到表现层：[现代 CSS 布局](02-modern-css-layout.md)。
