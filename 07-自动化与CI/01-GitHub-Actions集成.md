---
title: GitHub Actions 集成
tags: [claude-code, CI, github]
updated: 2026-05-21
---

# GitHub Actions 集成

> 官方 Action：https://github.com/anthropics/claude-code-action
> 官方文档：https://code.claude.com/docs/en/github-actions

## 三种触发方式

- **@claude mention** —— 在 issue / PR 评论里 at 它
- **PR 自动触发** —— 每个 PR 跑 review
- **定时 / 手动** —— `workflow_dispatch` / `schedule`

## 一键安装

在仓库里跑：
```
/install-github-app
```
Claude 会自动配 secret、推 workflow 文件。

## 最小工作流例子

```yaml
name: Claude Code

on:
  issue_comment:
    types: [created]
  pull_request_review_comment:
    types: [created]

jobs:
  claude:
    if: contains(github.event.comment.body, '@claude')
    runs-on: ubuntu-latest
    permissions:
      contents: write
      pull-requests: write
      issues: write
    steps:
      - uses: actions/checkout@v4
      - uses: anthropics/claude-code-action@v1
        with:
          anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
```

## 鉴权选项
- Anthropic API key（最简单）
- AWS Bedrock
- GCP Vertex AI
- Azure Foundry

## 几个真实工作流

### 自动 review
- 触发：`pull_request: types: [opened, synchronize]`
- 见 [[02-自动PR审查]]

### Issue triage
- 触发：`issues: types: [opened]`
- 见 [[03-Issue自动triage]]

### 定时巡检
- 触发：`schedule: cron`
- 见 [[04-定时任务与cron]]

### 文档同步
- 触发：源代码变更
- 任务：让 Claude 检查 README / docs 是否过时

## 安全清单
- [ ] `--allowedTools` 严格白名单
- [ ] 别给 `bypassPermissions`
- [ ] secret 走 GitHub Secrets，不要硬编码
- [ ] 限制可触发账号（防外部 PR 偷算力）
- [ ] 看 token 用量并设 budget alert

## GitLab 同款
- 文档：https://code.claude.com/docs/en/gitlab-ci-cd
- 思路一致，把 Action 换成 GitLab pipeline job。

## 相关
- [[../06-高阶篇/04-Headless模式与脚本化]]
- [[02-自动PR审查]]
