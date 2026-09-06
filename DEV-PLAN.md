# 个人知识库网站 · 开发计划

> 版本：v1.0（2026-09-05）
> 状态：定稿。与 `DESIGN.md`（产品设计）、`TECH-ARCHITECTURE.md`（技术选型）并列的第三份文档，把设计共识转化为可执行的里程碑、任务清单与验收标准。M1 → M5 串行推进，每个里程碑结束都有可部署、可访问的产物。

## 开发决策

| 决策点 | 结论 |
|---|---|
| 推进方式 | 先打通端到端骨架（M1 发布链路）再填功能；每个里程碑结束都在 `main` 分支留下可部署产物，验收后打 tag（`m1`…`m5`） |
| 部署实现 | 官方 `actions/deploy-pages` 直接部署，产物不落 `gh-pages` 分支（与 TECH-ARCHITECTURE v1.0 "产物推 gh-pages 分支"的表述差异，以本条为准） |
| 代码块文件名写法 | 围栏信息串附加 `title`：` ```python title="attention_demo.py" `，cb-bar 插件解析渲染（M2 写种子文章前必须先定稿本约定） |
| 跨领域标签 | 允许。校验只查"标签在 tags.yaml 清单内"，不校验标签与文章所在领域的归属关系 |
| 标签校验挂点 | `src/content.config.ts` 内读取 `content/tags.yaml`，文章 collection 的 zod schema 用 `refine` 校验 tags ⊆ 清单；校验随 `astro build` 触发 |
| Shiki 主题 | 以设计稿 `tk-*` token 配色为基准选择/微调一款深色主题（代码底色对齐 `--code-bg:#1E2530`），单主题、亮色站点 |
| 字体 | 不引 webfont（无外部服务依赖），按设计稿系统字体栈回退（Noto Serif SC→宋体系 / PingFang→雅黑 / JetBrains Mono→Consolas） |
| h2 § 编号 | 构建期自动生成（`§ 1`、`§ 2`…），作者只写标题文本 |
| relbox（相关笔记） | 构建期从正文提取指向本站 `.md` 的互链，反查目标文章的日期与标题渲染盒子；不靠手写 frontmatter |
| 内部链接 | 页面间链接统一经 Astro（自动带 `/knowledge-base/` 前缀）；文内互链按架构文档用相对 `.md` 链接，由管线改写为路由 URL |
| 移动端搜索 | 按设计稿 ≤760px 隐藏搜索框（栏目导航已承担找内容职责），后续有需要再加替代入口 |
| 验收方式 | 不引入测试框架：构建期 schema 校验（机器把关）+ 对照设计稿人工走查（视觉把关），验收清单逐项打勾 |

## 明确不做的（防执行蔓延）

RSS / sitemap、自定义 404 页、暗色模式、评论与统计、自定义域名、全文搜索、单测/测试框架、草稿流程、标签管理后台。以上任何一项不在任何里程碑任务清单里；要做它们的唯一方式是先改本计划。

> **2026-09-05 v1 收官后修订**：豁免清单的使命是防 M1–M5 执行期蔓延，v1 完成后按实际价值重新评估。解除豁免并已实现：**全文搜索**（标题 → 标题+正文，构建期索引 + 前端子串匹配）、**RSS / sitemap / 404 / OG meta**（静态知识库标配）、**互链完整性校验**（构建期死链拦截，接入 `npm run build`）、**资源卡外链体检**（GitHub Actions 每周任务）。仍然不做：暗色模式、评论与统计、自定义域名、单测/测试框架、草稿流程、标签管理后台。

> **同日决策修订（互链改写）**：开发决策表中"文内互链……由管线改写为路由 URL"的落地形态从"相对链接保持相对"改为"页面层改写为绝对路由 + 存在性校验"（`src/lib/interlinks.ts`）。原因：GitHub Pages 把无尾斜杠请求 301 到目录式 URL，浏览器解析相对链接的基准多一层，相对互链线上全部 404（实测确认）。原先承担改写的 rehype 插件因渲染管线拿不到源文件路径而移除。

## 总纲

目标：把 `DESIGN.md` 与 `TECH-ARCHITECTURE.md` 的共识落地为可上线的 GitHub Pages 站点。

原则：

1. **端到端优先**：第 1 个里程碑就打通 push → build → 上线的完整链路，此后每一步都生长在"已经能发布"的基础上。
2. **每步可部署**：任何里程碑结束时 `main` 分支都是可访问的站点（功能递增，不追求完整）。
3. **验收驱动**：每个里程碑有明确验收清单，通过才进入下一个。
4. **设计稿即规范**：页面实现以 `设计图/knowledge-base-design.html` 为对照物，逐特性还原。

里程碑总览：

| 里程碑 | 内容 | 结束时的产物 | 验收标准（摘要） |
|---|---|---|---|
| M1 工程脚手架与发布链路 | git 仓库 + Astro 骨架 + Pages 自动部署 | 线上可访问的空首页 | push 后 CI 绿，站点数分钟内可在线访问 |
| M2 内容层与校验 | `content/` 结构 + 三件 schema 校验 + 种子内容 | 线上站点（内容已入库，暂未渲染） | `npm run build` 通过；打错标签构建失败 |
| M3 渲染管线与文章页 | 设计 token + 全站样式 + 渲染管线 + 文章页 | 线上可读的文章页 | 种子文章逐特性对照设计稿 |
| M4 其余页面 | 栏目页 / 资源页 / 首页 / About / 搜索 | 全功能站点 | 逐页对照设计稿对应区块 |
| M5 收尾 | 全站走查 + README 写作约定 + 清理 | 正式上线的 v1 | 全量走查通过，无设计稿遗留物 |

依赖关系：M1 → M2 → M3 → M4 → M5 严格串行（单人项目，串行最省心）。M3 内部"设计 token / Layout 骨架"是文章页的前置；M4 复用 M3 的一切，不再新造样式。

---

## M1 工程脚手架与发布链路

**任务清单**

1. **本地 git 仓库**：`git init`（默认分支 `main`）；建 `.gitignore`（`node_modules/`、`dist/`、`.astro/`）与 `.gitattributes`（`* text=auto eol=lf`，规避 Windows CRLF 噪音）。
2. **GitHub 仓库**：创建公开仓库 `knowledge-base`（`gh repo create` 或网页均可）。项目站 URL = `https://<GitHub用户名>.github.io/knowledge-base/`——同时依赖用户名与仓库名，故此步最先定。
3. **Astro 初始化**：Node ≥ 22（本机 v22.x），`npm create astro@latest -- --template minimal --no-install --no-git`（或等价手动骨架），生成后 `npm install`，提交 `package-lock.json` 锁版本。
4. **站点配置**（`astro.config.mjs`）：
   - `site: 'https://<GitHub用户名>.github.io'`
   - `base: '/knowledge-base/'`
5. **占位首页**：`src/pages/index.astro` 输出站名"格致"与一行文字，含一个带 base 前缀的静态资源引用用于冒烟。
6. **CI 工作流** `.github/workflows/deploy.yml`：
   - 触发：push 到 `main`
   - Node 版本锁 22（与本地一致，防 CI/本地漂移）
   - `npm ci` → `npm run build` → `actions/upload-pages-artifact` → `actions/deploy-pages`
   - `permissions: contents:read, pages:write, id-token:write`
7. **Pages 开关**：仓库 Settings → Pages → Build and deployment → Source 选 **GitHub Actions**（首次必配，漏配是最常见的首次部署失败原因）。
8. **首次发布**：`git remote add` 后 push `main`，观察 Actions 运行。

**验收清单**

- [ ] Actions 工作流绿
- [ ] `https://<用户名>.github.io/knowledge-base/` 可在线访问（首次配置 + CDN 生效可能超过 2 分钟，属正常；后续 push 约 1–2 分钟）
- [ ] 页面静态资源在 `/knowledge-base/` 前缀下加载成功（无 404）
- [ ] 打 tag `m1`

## M2 内容层与校验

**任务清单**

1. **定写作语法约定**（本里程碑第一个任务，是种子文章的输入；M5 沉淀进 README）：
   - frontmatter 最小集：`title`（必填）、`date`（必填）、`tags`（必填，只从清单选）、`summary`（可选，建议养成必填习惯）
   - 代码块：` ```python title="attention_demo.py" `（语言 + 文件名）
   - 公式：行内 `$...$`、块级 `$$...$$`
   - 图片：`![说明](img/xxx.png)`，图片放文章同目录 `img/`
   - 文内互链：`[标题](../子目录/文件名.md)`，相对路径指向 `.md` 源文件
2. **建 `content/` 目录**（按 TECH-ARCHITECTURE 结构）：`content/tags.yaml`（按领域分组：`ai:` / `backend:` 两组标签，含"计划中"标签）、`content/ai/`、`content/backend/`，各领域一个 `resources.yaml`。
3. **Content Collections 与三件校验**（`src/content.config.ts`）：
   - 文章 collection（glob loader；`ai/` 与 `backend/` 分开或合并均可，栏目归属由路径推导）：schema 校验 frontmatter 必填字段
   - `tags` 字段 `refine`：读取 `content/tags.yaml` 得清单全集，不在清单内 → 构建失败
   - 资源卡 collection：`title` / `url` / `summary` / `date` 必填，`source` 可选（不填构建期从 url 提域名）
   - 确认校验确实随构建触发（必要时占位首页显式 `getCollection()` 或 CI 加 `astro sync`）——校验没被触发等于没有校验
4. **种子内容**（写作语法约定的第一个使用者）：
   - `content/ai/llm-basics/attention-notes.md`：Python 代码块（带 `title`）、KaTeX 块公式、h2+h3 多级标题、文内互链
   - `content/backend/language/java-generics.md`：Java 代码块（带 `title`）、图片（`img/` 放占位图）
   - 两个领域各 ≥ 1 张资源卡
   - **保留至少 2 个未使用的"计划中"标签**（如 `微调`、`JVM`、`中间件`），让"待学习"态在 M4 有真实数据可验
5. **tags.yaml 对减逻辑**：本里程碑只保证数据成立——"清单全集 − 文章实用 = 待学习差集"由构建期派生，M3/M4 渲染时消费，内容里不手工维护状态字段。

**验收清单**

- [ ] `npm run build` 通过
- [ ] 故意把某篇文章标签改为清单外标签 → 构建失败且报错指明文章与标签 → 还原
- [ ] 故意删除资源卡必填字段 → 构建失败 → 还原
- [ ] 故意删除文章 frontmatter 的 `title` 或 `date` → 构建失败 → 还原
- [ ] tags.yaml 清单与 DESIGN.md 的初始标签清单一致
- [ ] 打 tag `m2`

## M3 渲染管线与文章页（核心）

**任务清单（按依赖排序）**

1. **设计 token 提取**：从设计稿 `:root` 提取 CSS 变量到 `src/styles/global.css`（`--paper / --ink / --muted / --line / --ai / --ai-soft / --backend / --backend-soft / --code-bg / --code-ink` + 三组字体栈）；排版基准（正文 16px、行高 2、serif 标题）一并落为全局样式。
2. **Layout 骨架**（文章页的前置，M4 全部页面复用）：`Layout.astro` = 顶栏（logo、栏目导航、搜索框）+ 页脚 + 领域色作用域（页面级注入 `--dom`）；区块样式对照设计稿顶栏/页脚 CSS。
3. **组件映射清单**：把设计稿文章页的类名逐一登记为实现项，作为本里程碑的对照物——`art-layout / art-meta（crumb、h1、artline）/ art-body（h2+hno、blockquote、formula、codeblock+cb-bar、figure）/ relbox / toc（toc-t、l2）`。
4. **渲染管线**（`astro.config.mjs` markdown 配置）：
   - Shiki：选择/微调深色主题贴合设计稿 `tk-*` 配色（关键字/函数/数字/注释四类 token 色），构建期内联样式
   - `remark-math` + `rehype-katex`：构建期渲染公式，零客户端 JS；Layout 引入 `katex/dist/katex.min.css`；块公式包 `.formula` wrapper 样式对齐设计稿
   - `rehype-slug`：标题锚点
   - **自定义 rehype 插件①（cb-bar）**：解析代码块 info string 的 `title="..."` → 包 `.codeblock` + `.cb-bar`（左文件名、右语言）
   - **自定义 rehype 插件②（h2 编号）**：构建期给 h2 生成 `§ N` 编号
   - **互链改写**：先验证 Astro 对相对 `.md` 链接的自动改写行为；若不自动改写为路由 URL，则写 rehype 插件把 `.md` 后缀链接重写为 `/knowledge-base/...` 路由
5. **文章页路由**：`src/pages/ai/[...slug].astro` 与 `src/pages/backend/[...slug].astro`（或参数化合一），`getStaticPaths` 从 collections 生成，slug = 文件路径，URL 形如 `/knowledge-base/ai/llm-basics/attention-notes/`。
6. **TOC**：用渲染结果的 `headings`（过滤 h2/h3）生成右侧 sticky 目录，含二级缩进样式（`.l2`）。
7. **relbox**：构建期提取正文中指向本站的互链，反查目标文章 `date` / `title`，渲染"相关笔记"盒子（svg 图标 + 日期 + 标题）。
8. **图片验证**：验证相对引用 `img/xxx.png` 在 content collections 下的解析与产物路径（含 base 前缀）；不成立则启用风险表中的回退方案并记录定案。
9. **文章页 head**：`<title>` / `meta description`（取 `summary`）。

**验收清单**（对照设计稿 `page-article` 区块逐特性）

- [ ] 代码块带 cb-bar（文件名 + 语言），配色贴设计稿
- [ ] Java 与 Python 高亮正常，行内样式、无客户端 JS
- [ ] 块公式 KaTeX 渲染正确，样式融入版面
- [ ] h2 自动 § 编号；TOC 含 h2/h3 两级、锚点可跳转
- [ ] 文内互链在页面上是真实路由 URL，可跳转
- [ ] relbox 列出互链目标（日期 + 标题）
- [ ] 图片显示、路径含 base 前缀
- [ ] 面包屑、领域色（AI 紫）与设计稿一致
- [ ] 文章页 `<title>` / description 正确
- [ ] 打 tag `m3`

## M4 其余页面

实现顺序按数据依赖排列：先做有列表与聚合数据的页面，最后做纯静态页与搜索组件。每页都复用 M3 的 Layout、样式与组件。

**1. 栏目页 ×2**（`/ai/`、`/backend/`）

- 数据源：本领域文章 collection + tags.yaml 差集
- 要点：按标签分组的 `taggroup`（组标题 + 计数）、**灰色"待学习"分组**（"还没有内容——计划中"）、`colhead / colstats`（"x 篇笔记 · y 张资源卡"）、面包屑
- 验收：对照设计稿 `page-col-ai` / `page-col-stack`；灰组内容来自真实差集（M2 预留的"计划中"标签）

**2. 资源收藏页 ×2**（`/ai/resources/`、`/backend/resources/`）

- 数据源：对应领域 `resources.yaml`
- 要点：`rescard`（标题 + 域名 + 摘要 + 收藏日期），按 `date` 倒序，`source` 缺省时构建期从 url 提域名
- 验收：对照 `page-res-ai` / `page-res-stack`；排序正确

**3. 首页**（`/`）

- 数据源：全站文章 + 两个 `resources.yaml`（**最近更新混排**：三源按 `date` 归并取前 N）
- 要点：hero（站名"格致"+ 一句话介绍 + meta-line）、两个领域入口卡（`dom-count` 用真实统计）、子主题门户（两领域 tagcloud，零内容标签为虚线灰 chip）、最近更新列表（`kind-note / kind-res` 徽标 + 领域 + 标题）、**空态**（列表/门户为零时的真实条件渲染分支）
- 验收：对照 `page-home` 的 full 态；空态验证一次（临时清空/遮蔽 content 后 build 走查，再还原）

**4. About**（`/about/`）

- 要点：简短介绍 + `links` 卡片（GitHub 等外链）+ 底部 note
- 验收：对照 `page-about`

**5. 搜索组件**

- 数据源：构建期生成 `search-index.json`（title / url / 领域 / date）
- 要点：顶栏输入框（复用 M3 Layout），前端原生 JS 子串匹配（中文无需分词），下拉结果点击/回车跳转；≤760px 按设计稿隐藏
- 验收：中文与英文标题子串均命中；结果跳转正确；键盘可用

**总验收**：以上页面逐页对照设计稿对应 `page-*` 区块；全站顶栏/页脚/领域色一致；打 tag `m4`。

## M5 收尾

**任务清单**

1. **全量验证**：`npm run build` 干净通过；`npm run preview` 本地逐页走查，再对照线上。
2. **设计稿走查**：按 M3 组件映射清单 + M4 各页验收项，桌面宽度 + 760px / 900px 断点各走查一遍（设计稿在 ≤760px 隐藏搜索框、≤900px 隐藏 TOC）。
3. **README 写作约定速查**：frontmatter 模板、标签规则（只从清单选、想用新标签先进清单）、代码块文件名写法、公式/图片/互链写法、图片存放（文章同目录 `img/`）、日常发布循环（改 → dev 预览 → push → 1–2 分钟上线）。
4. **head 与 favicon 收尾**：全站 favicon，各页 title/description 逐页确认。
5. **清理**：确认设计稿的 `mockbar` 提示条、"空站模式"预览开关（`empty-toggle` / `emptyMode`）等预览辅助不进真实站点；空态一律由真实数据条件渲染。
6. **上线确认**：线上逐页复验 → 打 tag `m5`，作为 v1 正式版。

**验收清单**

- [ ] 本地与线上 build 产物一致、无未处理的构建警告
- [ ] 全站走查通过（桌面 + 两个断点）
- [ ] README 速查覆盖全部写作约定，且与实际校验行为一致
- [ ] 无 mockbar / 预览开关残留
- [ ] 打 tag `m5`

## 风险与回退

| 风险 | 症状 | 对策 / 回退 |
|---|---|---|
| GitHub Pages 首次配置 | 部署成功但 404，或 workflow 报权限错 | Source 必须选 "GitHub Actions"；workflow 带 `pages:write` + `id-token:write` 权限；重跑 Actions |
| 首次部署时长超预期 | push 后迟迟看不到站点 | 首次配置 + CDN 生效可能数分钟甚至更久，属正常；以 Actions 绿为准，URL 稍后可达 |
| base 路径下资源 404 | 图片/CSS/字体 404 | 资源一律经 Astro 导入或 public/，不手写根路径；上线前 `npm run preview` 自查 |
| `.md` 互链不改写为路由 | 页面链接指向 `.md` 源文件 404 | M3 已列验证任务；不自动则写 rehype 插件重写，插件以种子文章为回归样本 |
| 图片相对引用解析失败 | 构建报错或图片 404 | 回退：文章 `img/` 随构建拷贝到对应路由目录，或约定 public/ 路径；定案记录进 README |
| KaTeX/Shiki 体积与构建时长 | 构建变慢 | 构建期渲染是一次性成本，静态产物不受影响；按需加载语言/字包；构建时长随文章线性增长可接受 |
| Windows CRLF / 编码 | diff 噪音、CI 与本地不一致 | `.gitattributes` 统一 `eol=lf`；文件名/slug 用英文短横线 |
| CI 与本地环境漂移 | 本地过、CI 挂（或相反） | CI Node 锁 22 与本地一致；`npm ci` + `package-lock` 锁依赖 |
| Astro 升级破坏自定义插件 | rehype 插件构建报错 | 依赖锁版本；升级时以种子文章对照 M3 验收清单做回归 |
| 标签校验未随构建触发 | 打错标签照样发布 | M2 验收含负例测试；必要时 CI 显式 `astro sync` 或页面 `getCollection()` 触发 |
