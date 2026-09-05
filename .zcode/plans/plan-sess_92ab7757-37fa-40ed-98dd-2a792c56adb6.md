在 `C:\MyFile\AI\knowledge-base\` 新建 `DEV-PLAN.md`（v1.0，2026-09-05），只创建这一个文件，不改动代码、DESIGN.md、TECH-ARCHITECTURE.md 或设计稿，不执行任何开发动作。格式对齐现有两份文档：版本头（版本/状态行）+ 核心决策表 + 分节 + 明确不做的边界声明。

## 文档结构（已吸收审核发现的修订）

**0. 版本头与决策表**
- 版本头：v1.0（2026-09-05），状态行说明本文件是执行依据
- 关键决策表，含审核新增的显式决策：
  - 部署实现用官方 `actions/deploy-pages`（不落 gh-pages 分支），并注明与 TECH-ARCHITECTURE v1.0 "推 gh-pages 分支"表述的差异以此为准
  - 代码块文件名写法约定：` ```python title="xxx.py" `（M2 写种子文章前必须先定）
  - 跨领域标签默认允许（只校验"在 tags.yaml 清单内"，不校验领域归属）
  - 标签校验实现方式：content config 的 zod refine 读取 tags.yaml（或构建后置脚本，写明选定一种）
  - Shiki 主题：以设计稿 tk-* 配色为准选/定制深色主题
  - 字体不引 webfont，按设计稿系统字体栈回退
  - h2 的 § 编号构建期自动生成
  - relbox（相关笔记）构建期从正文互链提取并反查目标文章日期/标题
  - 内部链接统一走 `/knowledge-base/` 前缀（base 已定），互链写法按架构文档
  - 移动端搜索：按设计稿隐藏，另给栏目页/首页替代入口或明确接受隐藏（记录取舍）
- "明确不做"清单：RSS/sitemap、404 定制页、暗色模式、评论、自定义域名、全文搜索等

**1. 总纲**
- 目标与原则（先端到端骨架再填功能，每里程碑有可部署产物）
- 里程碑总览表 M1–M5，每个都带验收标准；取消"第 N 步核心/后半"的混乱编号，统一用 M1–M5

**2. M1 工程脚手架与发布链路**
- git init + GitHub 仓库 `knowledge-base`（项目站 URL 依赖用户名+仓库名）
- .gitignore、.gitattributes（Windows CRLF）
- Astro minimal 初始化，Node ≥ 22，package-lock 锁版本；配置 base 与 site（写明 site 含 GitHub 用户名）
- GitHub Actions 工作流（Node 22 与本地一致）→ astro build → deploy-pages；任务清单中包含"仓库 Settings → Pages 首次选 GitHub Actions source"
- 验收：空首页 push 后数分钟内在线可访问（注明首次部署与 CDN 可能更慢），CI 绿

**3. M2 内容层与校验**
- 第一个任务：定写作语法约定（代码块文件名、公式、图片、互链写法），作为后续一切的输入；M5 README 由此沉淀
- 建 content/ 目录（tags.yaml 按领域分组、ai/、stack/、resources.yaml），按 TECH-ARCHITECTURE 结构
- 三件校验（frontmatter 必填 / 标签在清单内→否则构建失败 / 资源卡必填），写明实现挂点
- tags.yaml 对减逻辑说明：差集 = "待学习"态，构建期派生
- 种子文章 2–3 篇 + 资源卡：覆盖代码块（Java/Python，含文件名写法）、KaTeX、图片、文内互链、TOC（h2+h3）；并预留至少一个未使用的"计划中"标签，让待学习态有真实数据
- 验收：build 通过；故意打错标签构建失败

**4. M3 渲染管线与文章页（核心）**
- 前置任务：从设计稿提取设计 token → `src/styles/` 全局样式 + **Layout 骨架（顶栏/页脚）在 M3 产出**（修正原大纲把骨架放 M4 的顺序问题）
- "设计稿组件 → 实现映射清单"任务：顶栏/页脚/搜索框、art-meta（crumb 面包屑/标题/artline）、art-body（h2 §编号、blockquote 领域色、formula、codeblock+cb-bar、figure 图片）、relbox、TOC（含 h3 二级）
- 管线：Shiki（主题贴合设计稿 token 配色）+ 自定义 rehype 插件（cb-bar）+ remark-math/rehype-katex（含 katex.min.css 挂载）+ rehype-slug/TOC；验证相对 .md 互链是否被 Astro 自动改写为路由，不自动则写 rehype 插件（任务显式列出）
- 图片：验证相对引用 img/ 在 content collections 下的解析行为
- 文章页 head 元信息（title/description）
- 验收：种子文章逐特性对照设计稿（以组件映射清单为对照物）

**5. M4 其余页面**
- 顺序：栏目页（taggroup/待学习灰组/colstats 计数）→ 资源收藏页 → 首页（两个领域入口+标签门户+最近更新——注明混排需跨文章集与两个 resources.yaml 按日期归并+空态）→ About → 搜索组件（构建期标题 JSON + 前端子串匹配 + 极简结果呈现）
- 每页列明复用 M3 的组件与数据源
- **补齐每页验收标准**（对照设计稿对应 page 区块）

**6. M5 收尾**
- 全量 build + 逐页走查（含移动端宽度 760/900px 断点）
- README 写作约定速查（frontmatter 模板、标签规则、代码块文件名写法、图片存放）
- 文章页 head/favicon 收尾确认
- 清理：mockbar、空站预览开关不进真实站点（空态用真实数据呈现）

**7. 风险与回退（扩充）**
- 保留原有三条（首次 Pages 配置、base 下资源引用、KaTeX/Shiki 体积），新增：图片相对路径解析、Windows CRLF、CI 与本地 Node 版本漂移、Astro 版本锁定与 rehype 插件 API 兼容、首次部署时长预期

执行方式：批准后仅用 Write 创建 DEV-PLAN.md 一个文件；不做 git init、不装依赖、不跑构建。