---
title: 前端测试：Vitest、Testing Library 与 Playwright
date: 2026-09-06
tags: [工程化]
summary: 测试金字塔落到前端：Vitest 管逻辑单测，Testing Library 管组件行为，Playwright 管真实浏览器。三层的投入比例、写法与测什么不测什么的取舍。
---

前端测试的常见问题是**投入失衡**：要么全靠 E2E（慢、脆、维护不动），要么零测试靠人肉回归。按测试金字塔分三层：**单元测试快而多、组件测试测行为、E2E 测关键路径**，工具分别对应 Vitest、Testing Library、Playwright。与 lint 的分工见[质量工具链](02-quality-toolchain.md)：lint 管静态，测试管运行。

## 测试金字塔与投入分配

```
        ／ E2E ＼          Playwright：关键用户路径，慢、贵、少（个位数～十位数）
      ／ 组件测试 ＼        Testing Library：组件行为契约，中等（核心组件各一）
    ／  单元测试   ＼      Vitest：工具函数、hooks、store 逻辑，快、多（主力）
```

比例参考 70/20/10。原则：**越往下成本越低、结果越稳定**，能用单测覆盖的逻辑不推到 E2E。前端特有的难点是「UI 怎么测」：答案是测**行为契约**（用户看到什么、点什么出什么），不测实现细节（内部 state、私有方法）。

## Vitest：与 Vite 共用配置的单测

```ts title="utils/format.test.ts"
import { describe, it, expect, vi } from "vitest";
import { formatCurrency, parseRange } from "./format";

describe("formatCurrency", () => {
  it("分转元并保留两位", () => {
    expect(formatCurrency(123456)).toBe("¥1,234.56");
  });
  it("非法输入返回占位符", () => {
    expect(formatCurrency(null)).toBe("--");
  });
});

// mock：把不可控的依赖（网络、时间）替换掉
vi.mock("./api", () => ({ getUser: vi.fn().mockResolvedValue({ id: 1 }) }));
vi.useFakeTimers();          // 防抖/节流逻辑测试的标配：让时间可控
```

- 选 Vitest 的核心理由：**直接复用 Vite 的配置与插件**（alias、TS、CSS 模块无需另配），迁移成本几乎为零
- 高频能力：`vi.mock` 模块级 mock、`vi.fn` 函数探针、`vi.useFakeTimers` 治理定时器逻辑、`--coverage` 覆盖率报告（v8 provider）
- 测试对象的优先级：**纯函数 > hooks（@vue/test-utils 的 setup / React 的 renderHook）> store 逻辑**。组件以下的所有纯逻辑都该有单测

## Testing Library：测行为，不测实现

```tsx title="Search.test.tsx"
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

test("输入关键词后展示结果", async () => {
  render(<Search />);
  await userEvent.type(screen.getByRole("textbox", { name: "搜索" }), "vue");
  expect(await screen.findByText(/共 \d+ 条结果/)).toBeVisible();
});
```

- 核心纪律：**按可访问性角色查询**（`getByRole`），不用 class/测试 id。这样测试同时充当无障碍审计，且不怕样式重构
- 三个查询 API 的语义：`getBy` 立即取（取不到抛错）、`queryBy` 取不到返回 null（断言不存在用）、`findBy` 等异步出现（配 loading 场景）
- `userEvent` 模拟真实交互序列（聚焦→输入→回车），比 `fireEvent` 更接近真浏览器。Vue 版 API 同构（@testing-library/vue），两个框架用法一致

## Playwright：真实浏览器的关键路径

```ts title="e2e/checkout.spec.ts"
import { test, expect } from "@playwright/test";

test("加入购物车并结算", async ({ page }) => {
  await page.goto("/product/1");
  await page.getByRole("button", { name: "加入购物车" }).click();
  await expect(page.getByRole("status")).toContainText("已加入");

  await page.goto("/cart");
  await page.getByRole("button", { name: "结算" }).click();
  await expect(page).toHaveURL(/\/order\/\d+/);
});
```

- **自动等待**是 Playwright 的核心体验：断言和操作内置重试轮询，不再需要 `sleep(2000)` 式的脆弱脚本
- 多浏览器（Chromium/Firefox/WebKit）、多视口（含移动端）矩阵执行；失败自动留 trace（截图 + 录屏 + 网络面板），回放排查
- 用法纪律：**只测关键路径**（登录、下单、支付流程），每条用例独立（不依赖前一条的执行状态）；CI 里跑 E2E 用 `--shard` 分片提速

## 测什么、不测什么

- **值得测**：工具函数与边界值、状态逻辑（store/hooks）、核心组件的行为契约、关键业务路径
- **不值得测**：纯展示静态组件、第三方库的行为（测你调用它的方式即可）、样式像素（视觉回归用截图测试，属于另一类手段）
- 接入 CI：`vitest run` 进每个 PR（快、挡低级错误），Playwright 进 nightly 或合并前（慢、保主干），与[部署流水线](05-deploy-and-monitoring.md)分层一致

## 小结

三层分工：**Vitest 管逻辑、Testing Library 管组件行为、Playwright 管端到端**；写法上从用户视角断言，不绑定实现。测试要接进流水线才能持续发挥作用，见[部署与前端监控](05-deploy-and-monitoring.md)。
