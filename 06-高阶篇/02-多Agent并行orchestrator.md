---
title: 多 Agent 并行 / Orchestrator 模式
tags: [claude-code, 高阶, multi-agent]
updated: 2026-05-21
---

# 多 Agent 并行 / Orchestrator 模式

> 不是一个 Claude，是一队 Claude。

## 三种典型形态

### 1. Orchestrator-Worker
- 一个"主管 agent"派任务
- 多个"打工 agent"并行执行
- 主管收集结果，决定下一步

### 2. Writer / Reviewer 双人组
官方 Best Practices 推荐：
- Session A：写代码
- Session B：**全新 context**，专门 review
- 防止"自己审自己"的盲区

来源：https://code.claude.com/docs/en/best-practices#run-multiple-claude-sessions

### 3. Agent Teams（2026 官方功能）
- Agent Teams 在会话内通过TeamCreate工具启动
- 内置 task 列表 + 消息总线
- 一个 Lead 自动协调多个 worker
- 文档：https://code.claude.com/docs/en/agent-teams

## 实战玩法

### TDD 双 agent
- agent-1 只写测试，禁碰实现
- agent-2 全新 context 看测试，写实现到全绿
- 出处：HN 高赞评论 https://news.ycombinator.com/item?id=43930558

### Research → Plan → Implement 三段流水
- researcher（subagent，只读）→ findings.md
- planner（主会话）→ plan.md
- implementer（新 session 或 subagent）→ 按 plan.md 干活
- 类似 Anthropic 官方 "Explore → Plan → Code → Commit" 四段式

### Ralph Loop（极简派）
> Geoffrey Huntley：「everything is a ralph loop」
> 不要复杂的多 agent，就一个 while-loop 跑同一个 Claude，让它读 spec 干活，干完再读再干。
> 出处：https://ghuntley.com/loop/

正向（building）+ 反向（clean-room 验证）配合用。

## 反对意见 / 谨慎派

- **Armin Ronacher**：多 agent ≠ 更好。叠加层级，调试更难。https://lucumr.pocoo.org/2026/2/13/the-final-bottleneck/
- **patio11**：CLAUDE.md + 单 agent + 好 spec 已经能解决 80% 问题

## 我的建议（编辑视角）

- 第一次玩：Writer/Reviewer 双 session，最容易看到收益
- 第二步：subagent 隔离 research
- 第三步再考虑 orchestrator / Agent Teams
- ralph loop 适合"已经知道怎么干"的重复活，不适合探索

## 相关
- [[01-Subagent子代理]]
- [[03-Git-Worktree并行实例]]
- [[06-大神实践案例集]]
