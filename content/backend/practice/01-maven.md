---
title: Maven：Java 的 npm
date: 2026-09-05
tags: [工程实践]
summary: pom.xml 就是 package.json，依赖坐标、生命周期、仓库三层对应关系几乎一比一——最大的差异是中央仓库慢，国内要配镜像。
---

Maven 之于 Java ≈ npm 之于 JS：包管理 + 构建工具 + 脚本约定，三合一。概念映射表几乎一比一，对照着学半天就能上手。

## 概念映射表

| npm 世界 | Maven 世界 |
|---|---|
| `package.json` | **`pom.xml`**（Project Object Model） |
| `dependencies` | `<dependencies>` 依赖坐标 |
| `npm install` | `mvn install` |
| `node_modules` | 本地仓库 `~/.m2/repository`（全局共享，不进项目目录！） |
| `npm scripts` | 生命周期命令（`mvn test` / `mvn package`） |
| 私有 registry | 私服（Nexus/Artifactory） |

最大的结构差异：**依赖不放在项目目录里**，而是统一存本地仓库，项目间共享——没有 node_modules 黑洞，代价是依赖的版本冲突要 Maven 自己仲裁（同一 artifact 多版本时选"最近的"传递路径，冲突显式用 `<exclusions>` 排除）。

## 坐标：依赖的唯一身份证

```xml title="pom.xml 片段"
<dependencies>
    <dependency>
        <groupId>com.mysql</groupId>          <!-- 组织（对照 @scope） -->
        <artifactId>mysql-connector-j</artifactId>   <!-- 包名 -->
        <version>8.0.33</version>
    </dependency>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-web</artifactId>
        <!-- 版本交给 spring-boot-starter-parent 统一管理，这里不写 —— 对照 monorepo 的统一版本策略 -->
    </dependency>
</dependencies>
```

`groupId:artifactId:version` 三元组定位一个包（对照 npm 的 `@scope/name@version`）。依赖还带 **scope**：`compile`（默认，打包含）、`provided`（编译期有、运行环境提供，如 Servlet API）、`test`（仅测试，对照 devDependencies）——概念照搬即可。

## 生命周期：固定的一条流水线

Maven 的构建是**预设好的生命周期**，不能像 npm scripts 那样自由定义命令，只能往固定阶段挂插件目标：

```text
validate → compile → test → package → install → deploy
```

- `mvn compile`：编译主代码
- `mvn test`：跑单测（自动包含之前阶段）
- `mvn package`：打成 jar/war（对照 `npm run build` 的产物）
- `mvn install`：打包并把**自己装进本地仓库**（供本地其他项目依赖——把"发布到私有 npm"变成了"拷进共享文件夹"，内部项目间的玩法）

执行后面的阶段会自动执行前面所有阶段——一条流水线，不是任意脚本。要跑自定义任务用插件（如 `spring-boot:run`，对照 npm scripts 里挂依赖包的命令）。

## 仓库与镜像：国内必配

依赖的解析顺序：**本地仓库 → 私服（有则用）→ 中央仓库**。中央仓库在国外，不配镜像第一次拉依赖能等到怀疑人生。用阿里云镜像（Maven 的 `settings.xml`，IDEA 和命令行共用）：

```xml title="~/.m2/settings.xml 镜像片段"
<mirrors>
    <mirror>
        <id>aliyunmaven</id>
        <mirrorOf>central</mirrorOf>
        <url>https://maven.aliyun.com/repository/public</url>
    </mirror>
</mirrors>
```

对照 `.npmrc` 里的 `registry=https://registry.npmmirror.com`——同一个操作，同一个理由。

## 参考与延伸

- [Maven 官方指南](https://maven.apache.org/guides/index.html)（Introduction to the POM 与依赖机制两篇）
- [菜鸟教程 · Maven 教程（中文）](https://www.runoob.com/maven/maven-tutorial.html)
