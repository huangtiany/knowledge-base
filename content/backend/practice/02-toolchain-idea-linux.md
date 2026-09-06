---
title: 工具链：IDEA 与 Linux 常用命令
date: 2026-09-05
tags: [工程实践]
summary: IDEA 对照 VSCode 补齐 Java 工作流；Linux 命令是后端排障的基本功，查日志、看进程、读权限三件事每天都要用。两块都按高频优先整理。
---

两件工具层面的事：IDEA（对照 VSCode，但为 Java 深度优化）和 Linux 常用命令（后端程序跑在 Linux 服务器上，命令行是排障现场）。都按高频优先整理。

## IDEA：三天回归肌肉记忆

VSCode 的习惯大部分可迁移（装插件、配主题、Ctrl+S 保存），重点补齐 Java 特有的工作流：

**项目与构建**：打开带 `pom.xml` 的目录自动识别为 Maven 项目，右侧 Maven 面板可视化执行生命周期（对应点击 npm scripts）；首次打开等依赖下载（对照 npm install）。

**日常高频操作**（IDEA 默认键位，Windows）：

- `Alt + Insert`：生成代码（getter/setter/构造器/重写方法），对照 VSCode 快速修复的加强版
- `Shift + Shift`：全局搜一切（类、文件、符号），对照 Ctrl+P 的强化版
- `Ctrl + Alt + ←/→`：跳转历史（沿调用链跳进跳出后回退，读代码高频使用）
- `Ctrl + B`：跳到定义；`Ctrl + Alt + H`：查看调用层级。**读陌生代码的主要方式**是"跳转 + 调用层级"，比全局搜索高效
- `Shift + F6` 重命名重构：改名后**所有引用同步更新**（受益于 Java 静态类型，JS 重构做不到这么放心）

**调试**：断点 + Debug 模式启动，`F8` 单步跳过、`F7` 进入方法、`F9` 放行到下个断点；条件断点（右键断点填表达式）在循环里只停特定值，对照浏览器 Sources 面板的调试模型，几乎无缝。注意：**断点调试只能连本地或可达环境**，线上问题靠日志（这是后端重视日志的根源）。

## Linux：排障现场的三件事

### 查日志（最高频）

```bash
tail -f app.log                     # 实时滚动看最新日志（对照 DevTools 常开）
tail -n 200 app.log                 # 看最后 200 行
grep "ERROR" app.log                # 过滤错误（对照 Ctrl+F 搜关键字）
grep -C 5 "NullPointer" app.log     # 匹配行 + 前后各 5 行上下文，排障必加
grep "ERROR" app.log | wc -l        # 统计错误条数
ls -lh | sort -k5 -n | tail -3      # 找最大的几个日志文件（磁盘告警时）
```

生产日志动辄几 GB，**永远不要 cat 整个文件**，tail + grep 的组合就是 80% 的排障动作。

### 权限：drwxr-xr-x 怎么读

`ls -l` 输出开头的十位：第 1 位是类型（`d` 目录、`-` 文件），后九位三三一组，依次是**所有者 / 同组 / 其他人**，每组是 `rwx`（读/写/执行）：

```text
d rwx r-x r-x
│  │   │   └── 其他人：读 + 进入，不可写
│  │   └────── 同组：读 + 进入，不可写
│  └────────── 所有者：读 + 写 + 进入
└───────────── 目录
```

部署脚本跑不起来，十有八九是缺执行权限：`chmod +x deploy.sh`。改属主用 `chown user:group file`（常需要 sudo）。

### 进程：找到它，杀掉它

```bash
ps -ef | grep java                  # 找 Java 进程（拿到 PID）
kill 12345                          # 温和终止（进程自己清理）
kill -9 12345                       # 强杀（最后手段，可能丢数据）
top                                 # 看 CPU/内存占用（定位哪个进程吃资源）
```

对照前端的任务管理器杀 node 进程，但现场是 SSH 终端 + 没有图形界面。有了这几条 + 日志三件套，远程服务器上的基本排障就能覆盖；更深的（systemd、防火墙、网络排查）遇到再查。

## 参考与延伸

- [JetBrains IDEA 官方文档](https://www.jetbrains.com/help/idea/)
- [菜鸟教程 · Linux 教程（中文）](https://www.runoob.com/linux/linux-tutorial.html)
