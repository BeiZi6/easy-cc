---
title: Subagent 子代理
tags: [claude-code, 高阶, subagent]
updated: 2026-05-21
---

# Subagent 子代理

> 官方文档：https://code.claude.com/docs/en/sub-agents

> 一句话：让 Claude **委托另一个 Claude** 干活。
> 主要好处：**隔离上下文**（research 不污染主会话）+ **限制工具**（subagent 只能读不能写）。

## 它解决什么

主会话的上下文窗口是有限的。当你让 Claude 去"扫一遍 src/ 下所有文件找出认证逻辑"，搜索结果可能上千行，直接塞进主会话会挤掉前面的重要对话。

Subagent 把这类"重活"隔离到一个独立会话里跑。它有自己的上下文窗口，干完活只把结论交回来——主会话保持干净。

另一个好处是权限隔离。你可以让 research subagent 只有读权限，review subagent 只能看代码不能改，从根本上避免误操作。长任务也可以拆成"主-辅"结构：主会话做决策和协调，subagent 负责执行具体的调研或修改。

## 怎么写一个 subagent

在 `.claude/agents/` 目录下创建一个 markdown 文件，比如 `.claude/agents/researcher.md`：

```markdown
---
name: researcher
description: 用于探索陌生代码、搜集资料。仅可读不可写。
tools: [Read, Grep, Glob, WebFetch]
model: claude-sonnet-4-6
isolation: worktree
---

你是只读研究员。任务结束时把发现总结成 ≤300 字报告交回。
```

## 调用方式

在对话中直接用自然语言委托：

```
请用 researcher subagent 调研 src/auth 的现有实现
```

或者封装到自定义 slash command 里，让调用更规范：

```markdown
---
description: 研究并报告
allowed-tools: Agent
---
请委托 researcher subagent 完成：$ARGUMENTS
```

## 关键字段

`tools` 是严格白名单。只有列出的工具 subagent 才能用，比 permissions 系统还严格。没列的工具即使全局允许，subagent 也碰不到。

`model` 可以给 subagent 指定不同的模型。典型做法是主会话用 Opus 做决策，subagent 用 Sonnet 甚至 Haiku 跑批量任务——省 token 又不影响质量。

`isolation: worktree` 让 subagent 在一个隔离的 git worktree 里运行。它的所有文件操作都在独立目录，绝不会污染你的主分支工作区。适合需要写文件的 subagent（比如生成报告、跑测试）。

`description` 是模型判断"要不要调这个 subagent"的依据。写清楚它擅长什么，模型才能在合适的时机自动选用。

## 何时用 / 不用

**适合用 subagent 的场景：**

- 需要扫描大量代码再得出结论（代码考古、依赖分析）
- 想严格限制权限（code review、安全扫描、只读调研）
- 想并行加速——多个 subagent 同时跑不同任务

**不需要 subagent 的场景：**

- 改一两个文件的小活，直接在主会话干更快
- 任务和主会话强相关，需要持续来回讨论——拆出去反而增加沟通成本

> [!tip]
> 一个好的判断标准：如果这个任务的中间过程你不关心，只要最终结论，那就适合交给 subagent。

## 相关
- [[02-多Agent并行orchestrator]]
- [[03-Git-Worktree并行实例]]
- [[../04-配置与定制/07-Skills技能系统]]
