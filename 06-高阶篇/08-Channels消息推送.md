---
title: Channels 消息推送
tags: [claude-code, 高阶, channels, 通知]
updated: 2026-05-21
---

# Channels 消息推送

> 2026 上半年新功能。让外部消息（Telegram、Discord、iMessage 等）直接推进 Claude Code session，或让 Claude 把结果推出去。

## 能做什么

- 手机发一条消息 → Claude Code 收到并执行
- Claude 跑完任务 → 推通知到你的手机
- 团队频道里 @ Claude → 它在本地 session 里响应
- 配合 Routines 实现"定时跑 + 结果推送"闭环

## 支持的渠道

- Telegram
- Discord
- iMessage（macOS）
- Slack（通过官方 Slack 集成）

## 基本配置思路

Channels 本质上是把外部消息源接入 Claude Code 的 session。配置方式：

1. 在 Claude Code 设置里启用对应 Channel
2. 授权对应平台的 bot/webhook
3. 指定哪个 session 或 routine 接收消息

具体步骤因平台而异，参考官方文档。

## 典型用法

### 远程触发任务
出门在外，手机发 Telegram 消息给 Claude：
```
跑一下测试，把结果告诉我
```
Claude 在本地机器执行，完成后推结果回来。

### 定时任务结果通知
配合 Routines：每天早上跑一次依赖检查，有安全漏洞就推 Discord 通知。

### 团队协作
在团队 Discord 频道里 @ Claude，它能回答代码问题或触发预设的自动化流程。

## 注意事项

- 开放外部消息入口意味着安全面扩大，建议配合权限系统限制 Claude 能执行的操作
- 不要把有 prod 权限的 session 接入公开频道
- 详见 [[../04-配置与定制/03-权限系统permissions]]

## 来源

- 官方文档：https://code.claude.com/docs/en/sessions（Sessions 章节有 Channels 说明）

## 相关
- [[../07-自动化与CI/05-Routines云端定时任务]]
- [[../04-配置与定制/03-权限系统permissions]]
- [[../04-配置与定制/04-Hooks钩子系统]]
