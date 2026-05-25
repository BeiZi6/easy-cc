---
title: Token 成本控制
tags: [claude-code, 避坑, 成本]
updated: 2026-05-25
---

# Token 成本控制

> tptacek 在 HN 评论：「一个下午 50 美元」绝非夸张。
> 来源：https://news.ycombinator.com/item?id=43270367

## 钱花到哪去了

- 每次工具调用都把上下文重新发给模型
- 长 session = 每轮都贵
- subagent 也是单独算账
- 高频自动化（CI / cron）会把日开销放大几十倍

## 实战节流清单

### 模型路由
- **主流程用 Sonnet**，关键决策点点名调 Opus —— "Advisor 模式"，省 80%
  - 来源：https://www.builder.io/blog/the-claude-advisor-pattern
- 探索 / 总结 / 翻译用 Haiku
- 只在最难的 PR review 上请出 Opus

### 上下文节流
- 任务切换 `/clear`
- 长会话 `/compact`
- 用 subagent 干"读一大坨代码"的活，**只回传摘要**
- CLAUDE.md 别堆文档，用 `@docs/x.md` 按需引入
- 别把整个 `node_modules` / 大 log 喂进去

### 使用方式
- **plan 模式优先**：方案对了再花钱执行
- **关掉无用 MCP**：每个 MCP 都吃 token
- **关无用 skill**：description 也是 token

### 监控
- `/cost` 实时看本会话花费
- `/usage` 看额度用量的**分类明细**——按 skills / subagents / plugins / 各 MCP server 拆分，一眼看出钱花在哪（v2.1.149+）
- `rtk gain` 看 token 节省（如果装了 RTK）
- 团队级：API key 设 budget alert
- CI 上设月度上限

## 套餐 vs API
- 个人重度日常：Max（5x/20x）通常比 API 便宜
- 团队：Team
- 自动化 / 多人共享：API + 监控

> [!info] 涨价风波（2026/04）
> Claude Code 一度上调价格又撤回。
> 来源：https://simonwillison.net/2026/Apr/22/claude-code-confusion/
> 启示：定价会变，做 budget 时留余量。

## 相关
- [[../06-高阶篇/04-Headless模式与脚本化]]
- [[01-上下文污染]]
