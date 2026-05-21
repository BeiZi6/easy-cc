---
title: Routines 云端定时任务
tags: [claude-code, 自动化, routines, 定时任务]
updated: 2026-05-21
---

# Routines 云端定时任务

> 2026 上半年新功能。和 `/loop` 不同，Routines 是云端托管的定时任务，不依赖本地 session 保持运行。

## 和 `/loop` 的区别

| | `/loop` | Routines |
|---|---|---|
| 运行位置 | 本地 session | 云端托管 |
| 依赖本地开着 | 是 | 否 |
| 持久化 | session 关闭即停 | 持续运行 |
| 适合场景 | 开发时的轮询监控 | 长期自动化任务 |

## 能做什么

- 每天定时跑依赖安全检查
- 每周生成代码质量报告
- 定时同步外部数据源
- 配合 Channels 把结果推送到手机或团队频道

## 基本用法

```bash
# 创建一个 routine（在 Claude Code 里）
/routine create "每天早上9点检查依赖漏洞"

# 查看已有 routines
/routine list

# 删除
/routine delete <id>
```

也可以在 claude.ai 的设置界面管理 Routines。

## 配置示例

一个典型的 Routine 包含：
- **触发时间**：cron 表达式或自然语言描述
- **执行内容**：给 Claude 的指令
- **通知方式**：结果推送到哪里（可选）

```
每周一早上8点，检查项目的 npm 依赖是否有安全漏洞，
如果有高危漏洞，通过 Telegram 通知我，并在项目里创建一个 issue。
```

## 注意事项

- Routines 在云端运行，意味着它需要访问你的代码库——确认授权范围
- 云端执行环境和本地不同，依赖本地工具链的任务可能跑不起来
- 成本：每次触发都会消耗 token，高频 Routine 注意预算
- 目前（2026-05）功能还在迭代，部分细节可能变化

## 来源

- 官方文档：https://code.claude.com/docs/en/routines
- Builder.io 介绍：https://www.builder.io/blog/claude-code-routines
- `/loop` 文档（对比参考）：https://code.claude.com/docs/en/scheduled-tasks

## 相关
- [[04-定时任务与cron]]
- [[../06-高阶篇/07-Agent-Teams多会话协调]]
- [[../06-高阶篇/08-Channels消息推送]]
