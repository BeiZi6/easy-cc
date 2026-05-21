---
title: CLAUDE.md 分层机制
tags: [claude-code, 配置, CLAUDE.md]
updated: 2026-05-21
---

# CLAUDE.md 分层机制

> CLAUDE.md 是 Claude Code 最被低估、最重要的特性之一。
> patio11 在 HN 评论里说："CLAUDE.md 是这个产品真正的范式创新。"

## 三个层级

CLAUDE.md 的分层设计让你可以在不同粒度上给 Claude 注入上下文：

1. `~/.claude/CLAUDE.md` —— **用户级**，所有项目都加载。适合放你的个人偏好，比如"默认用中文回答"、"用 uv 不用 pip"。
2. 项目根 `CLAUDE.md` —— **项目级**，团队共享，入 git。放项目的构建命令、架构约定、团队规范。
3. 子目录 `CLAUDE.md` —— **局部级**，进入该目录时附加。比如 `frontend/CLAUDE.md` 里写前端特有的约定。
4. `CLAUDE.local.md` —— 项目级 + 个人覆盖（不入 git）。你个人对这个项目的补充说明，不影响队友。

## 加载机制

Claude Code 启动时会自动扫描并注入所有层级的 CLAUDE.md，不需要你手动引用。

子目录的 CLAUDE.md 是**追加**语义，不会替换上层的内容。也就是说，进入 `src/api/` 目录时，根目录的 CLAUDE.md 依然生效，子目录的内容叠加在后面。

支持 `@path/to/file.md` 语法引入其他文件。当你的架构文档、API 规范已经存在时，不需要复制粘贴进 CLAUDE.md，直接引用就行。

> [!tip]
> `@` 引用的路径相对于 CLAUDE.md 所在目录。引用的文件内容会在加载时展开注入。

## 写什么进 CLAUDE.md

**应该写的：**

项目特殊约定是最核心的内容。构建命令（`pnpm build`）、测试命令（`pytest -x`）、目录结构含义——这些不写 Claude 就得猜，猜错了浪费你的时间。

不写就会犯错的事情优先级最高。比如"这个项目用 pnpm 不是 npm"、"数据库迁移必须用 prisma migrate 不能手写 SQL"、"commit message 用英文"。

团队偏好也值得写。"PR title 用 conventional commits"、"组件用 PascalCase 命名"、"错误处理统一用 Result 不用 panic"。

**不该写的：**

通用编程常识不需要写。Claude 本身就知道怎么写 TypeScript、怎么处理错误，你不需要教它基础知识。

一次性任务说明直接在 prompt 里说就行，不要污染 CLAUDE.md。

长篇文档不要直接贴进来，用 `@docs/architecture.md` 引入。CLAUDE.md 本身应该保持精简可扫读。

## 反模式：CLAUDE.md 越写越长

> [!warning]
> 官方明确警告：超长 CLAUDE.md 会让真正重要的规则被淹没。Claude 的注意力是有限的，塞太多内容反而降低遵从率。

自检方法很简单：对每一条规则问自己——删掉这条，Claude 会犯错吗？如果答案是"不会"，那就删掉。保留的应该是那些"不写就一定出问题"的条目。

经验法则：项目级 CLAUDE.md 控制在 50 行以内效果最好。超过 100 行就该考虑拆分到子目录或用 `@` 引用。

## Auto Memory（2026 新功能）

Claude 会自动把 session 里学到的东西沉淀进记忆系统，不再需要你手动维护所有上下文。记忆分四种类型：

- `user` 类型：你的角色、偏好（"这个用户是后端工程师，偏好 Rust"）
- `feedback` 类型：你纠正过的错误（"上次说了不要用 npm，要用 pnpm"）
- `project` 类型：项目正在做什么（"当前在重构认证模块"）
- `reference` 类型：外部资源指针（"API 文档在 docs/api.md"）

Auto Memory 和 CLAUDE.md 是互补关系：CLAUDE.md 放确定性的团队规范，Auto Memory 自动积累个人化的上下文。

详见 https://code.claude.com/docs/en/memory#auto-memory

## 相关
- [[../03-工作流篇/05-长任务与记忆系统]]
- [[../08-避坑与反模式/01-上下文污染]]
