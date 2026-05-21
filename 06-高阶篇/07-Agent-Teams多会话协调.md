---
title: Agent Teams 多会话协调
tags: [claude-code, 高阶, agent-teams, 多会话]
updated: 2026-05-21
---

# Agent Teams 多会话协调

> 2026 上半年新功能。不同于 subagent（单 session 内派生），Agent Teams 是多个独立 session 之间的自动协调。

## 和 Subagent 的区别

| | Subagent | Agent Teams |
|---|---|---|
| session 数量 | 1 个（派生在同一 session 内） | 多个独立 session |
| 状态共享 | 共享父 session 上下文 | 通过任务系统协调 |
| 适合场景 | 单任务内并行子任务 | 跨任务、长时间、多角色协作 |
| 成本 | 较低 | 较高（多 session 各自计费）|

## 核心概念

- **Team Lead**：负责拆任务、分配、汇总结果的 orchestrator session
- **Teammate**：执行具体任务的 worker session
- **TaskList**：共享任务队列，Team Lead 写入，Teammate 认领
- **SendMessage**：session 间通信的方式

## 基本用法

```
# 在 Team Lead session 里
/team create my-team

# 创建任务
/task create "实现登录页面"
/task create "写登录接口单测"

# 派生 Teammate
# Claude 会自动协调，或你可以手动指定
```

## 适合的场景

- 大型功能拆成多个独立模块并行开发
- 一个 session 写代码，另一个同时写测试
- 长时间任务（超过单 session 上下文限制）
- 需要"角色分离"的场景（architect + implementer + reviewer）

## 注意事项

- 多 session 并行，token 消耗会成倍增加，先用 plan 模式确认方案
- Teammate 之间不能直接通信，必须通过 Team Lead 或 TaskList
- session 之间没有共享文件锁，并发写同一文件会冲突——拆任务时注意文件边界

## 来源

- 官方文档：https://code.claude.com/docs/en/agent-teams
- Builder.io 介绍：https://www.builder.io/blog/claude-code-subagents

## 相关
- [[01-Subagent子代理]]
- [[02-多Agent并行orchestrator]]
- [[../07-自动化与CI/05-Routines云端定时任务]]
