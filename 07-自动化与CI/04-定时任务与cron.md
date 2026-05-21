---
title: 定时任务与 cron
tags: [claude-code, CI, cron, routines]
updated: 2026-05-21
---

# 定时任务与 cron

> Claude Code 三种"按时跑"的方式，按部署位置分类。

## 1. Routines（云端，2026 新）

> 官方文档：https://code.claude.com/docs/en/routines

跑在 Anthropic 的基础设施上，**电脑关机也跑**。

```
/schedule
```
然后选频率（每天 / 每周 / 自定义 cron）。

适合：
- 每天早上看新 PR
- 周报自动生成
- 夜里跑 lint / 检查 CI failure

## 2. `/loop`（会话内）

> 官方文档：https://code.claude.com/docs/en/scheduled-tasks

只在**当前 session** 内每 N 分钟跑一次同一 prompt。

适合：
- babysit 一次部署
- 轮询 CI 状态
- 临时打卡

退出 session 就停。

## 3. GitHub Actions 的 `schedule`

跑在 GitHub Runner，最便宜也最自由。

```yaml
on:
  schedule:
    - cron: '0 8 * * 1-5'  # 工作日早 8 点
```

适合：
- 每日健康检查
- 每周依赖升级 PR
- 每月安全扫描

## 选哪个

| 需求 | 推荐 |
|------|------|
| 电脑关机也要跑 | Routines |
| 跑完要写仓库代码 | GitHub Actions |
| 临时盯一会儿 | `/loop` |
| 给团队产物（周报、TODO） | Routines 或 Actions |

## 几个真实例子

- 每天 8 点：列昨天合的 PR + 今天该看的 issue → 发 Slack
- 每周一：跑一次依赖升级 → 自动开 PR
- 每小时：检查 main 分支 CI，红了 ping 值班
- 每月：跑安全审查 → 出报告

## 反模式

- ❌ 用 `/loop 1m` 当心跳——烧 token
- ❌ 让 cron 任务写 prod —— 一旦 prompt 漂移，事故无声扩散
- ❌ 不设上限——routine 默认 7 天后自动停，但要自己记着

## 相关
- [[01-GitHub-Actions集成]]
- [[03-Issue自动triage]]
