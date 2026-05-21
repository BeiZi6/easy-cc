---
title: Issue 自动 triage
tags: [claude-code, CI, issue]
updated: 2026-05-21
---

# Issue 自动 triage

> 新 issue 来了，让 Claude 先做：分类、贴 label、提取复现步骤、判断优先级。

## 工作流模板

```yaml
name: Issue Triage
on:
  issues:
    types: [opened]

jobs:
  triage:
    runs-on: ubuntu-latest
    permissions:
      issues: write
      contents: read
    steps:
      - uses: actions/checkout@v4
      - uses: anthropics/claude-code-action@v1
        with:
          anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
          prompt: |
            这是一个新 issue：

            标题：${{ github.event.issue.title }}
            正文：${{ github.event.issue.body }}

            请：
            1. 判定类型：bug / feature / question / docs
            2. 估计严重度：P0 / P1 / P2 / P3
            3. 如果是 bug，提取「复现步骤」「期望」「实际」三段
            4. 用 gh CLI 给 issue 贴 label、写一条 triage 评论
          allowed_tools: Bash(gh issue*),Read,Grep
```

## 进阶玩法

- **找重复**：让它在评论前先 `gh issue list` 搜近期相似 issue，发现重复就关并指向已有的
- **要求复现**：bug 描述不全 → 自动评论"麻烦补充复现步骤"
- **接 RAG**：把项目 FAQ / docs 先喂进去，能直接答常见问题
- **冷处理过期 issue**：定时跑一次，30 天无回应自动 stale

## 注意

- ⚠️ 自动评论要明确标注「这是 AI 自动回复」
- ⚠️ 不要让它自动 close 真用户的 issue，最多打标签
- ⚠️ 限触发账号，防 abuse

## 相关
- [[01-GitHub-Actions集成]]
- [[04-定时任务与cron]]
