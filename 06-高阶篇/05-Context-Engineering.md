---
title: Context Engineering
tags: [claude-code, 高阶, context]
updated: 2026-05-21
---

# Context Engineering

> 比 prompt engineering 更高一层：关注的不是「字面怎么写」，而是「让什么进上下文、何时清出去」。

## 核心命题

LLM 的注意力是稀缺资源。
- 给得太少 → 它瞎猜
- 给得太多 → 它走神
- 给的次序不对 → 它抓错重点

> 「Context 是稀缺资源」—— Claude Code Best Practices 第一原则
> 来源：https://code.claude.com/docs/en/best-practices

## 四个杠杆

### 1. 进入：让对的东西进上下文
- `@文件名` / `@目录` —— 精确引用
- `!命令` —— 把命令输出塞进来
- 让 subagent 调研，**只**把摘要回传，**不**回传原文
- CLAUDE.md 写"项目 cheat sheet"，避免每次重新解释

### 2. 退出：让错的东西出去
- `/clear` —— 任务彻底切换
- `/compact <focus>` —— 局部压缩，保留某个主题
- `/rewind`（或 Esc Esc）—— 退回某个 checkpoint
- `/btw` —— 问个小问题但**不入历史**（2026 新）

### 3. 持久化：把发现落到文件
> 见 [[../03-工作流篇/05-长任务与记忆系统]]
- plan.md / progress.md / findings.md
- decisions.md / ADR
- auto memory（[[../04-配置与定制/02-CLAUDE.md分层机制]]）

### 4. 隔离：用 subagent / worktree 切片
- subagent 自带独立 context
- worktree 把"环境"也隔离了
- Writer/Reviewer 双 session，避免单 context 自我强化偏见

## 几条反直觉的事实

- **上下文越长，模型越容易走神**——短 + 准 > 长 + 全
- **超过 2 次纠错就 `/clear` 重开**比继续修便宜
- **CLAUDE.md 不是越长越好**，长到一定程度规则会被淹没（官方原话）
- **HTML 输出 > Markdown 输出**——可嵌图、可交互（Simon Willison "Showboat 模式"）

## 视觉化工具

官方 Context Window Visualization：
https://code.claude.com/docs/en/context-window
能交互地看到一次 session 里 token 都花到哪了。强烈推荐第一次用 Claude Code 的人玩一下。

## 相关
- [[../02-基础篇/06-上下文管理-clear-与-compact]]
- [[../03-工作流篇/05-长任务与记忆系统]]
- [[06-大神实践案例集]]
