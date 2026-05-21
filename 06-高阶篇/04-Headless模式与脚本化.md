---
title: Headless 模式与脚本化
tags: [claude-code, 高阶, headless, CI]
updated: 2026-05-21
---

# Headless 模式与脚本化

> 官方文档：https://code.claude.com/docs/en/headless

> Claude Code 不一定要交互式跑。`-p` 一开，它就成了「能动文件、能跑命令的 LLM 命令行」。

## 基础用法

```bash
# 一次性问答
claude -p "把 src/utils.ts 里的 any 全部换成具体类型"

# JSON 输出（适合脚本解析）
claude -p "审查当前 diff" --output-format json

# 流式输出
claude -p "..." --output-format stream-json

# 指定可用工具
claude -p "整理 README" --allowedTools Read,Edit
```

## Fan-out 范式（批处理）

> 来源：https://code.claude.com/docs/en/headless#fan-out-across-files

```bash
# 给 2000 个文件加上 license header
for f in $(rg -l --null '' src/); do
  claude -p "给文件 $f 顶部加 MIT license header（如果还没有）" \
         --allowedTools Read,Edit
done
```

> [!warning] 烧钱警告
> 这种批处理一晚上能花几十美元。先小样本跑通再扩量。

## CI 集成

- `claude-code-action`（GitHub Action）：https://github.com/anthropics/claude-code-action
- 文档：https://code.claude.com/docs/en/github-actions
- GitLab：https://code.claude.com/docs/en/gitlab-ci-cd
- 常见用法：自动 PR review、issue triage、按计划跑维护脚本

详见 [[../07-自动化与CI]]。

## 关键 flag

| flag | 作用 |
|------|------|
| `-p` | 非交互模式（也叫 print/headless） |
| `--output-format` | `json` / `stream-json` / `text` |
| `--allowedTools` | 工具白名单，CI 必加 |
| `--permission-mode` | `default` / `auto` / `bypassPermissions` |
| `--continue` / `--resume` | 续上次会话 |
| `--from-pr <num>` | 从 PR 开 session |
| `--worktree` | 在隔离 worktree 跑 |

## 安全清单

- [ ] CI 里**禁用** `bypassPermissions`，除非完全隔离环境
- [ ] `--allowedTools` 必须显式给，不要靠默认
- [ ] secret 走 secrets store，不要在 prompt 里拼
- [ ] 跑完看 token 用量，设 budget alert

## 相关
- [[../07-自动化与CI/01-GitHub-Actions集成]]
- [[../04-配置与定制/03-权限系统permissions]]
