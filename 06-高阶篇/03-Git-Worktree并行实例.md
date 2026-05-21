---
title: Git Worktree 并行实例
tags: [claude-code, 高阶, worktree]
updated: 2026-05-21
---

# Git Worktree 并行实例

> 官方文档：https://code.claude.com/docs/en/worktrees

> 同一个仓库、多个分支、多个 Claude 同时干活，互不踩文件。

## 它解决什么

日常开发中经常有多件事要同时推进：一个在做 auth 功能，一个在修 login bug，还有一个在重构公共模块。传统做法是 stash、切分支、再切回来——来回折腾容易丢东西。

Git worktree 的方案是：每个任务一个独立目录，物理隔离。每个目录是同一个仓库的不同分支检出，互不干扰。Claude Code 原生支持 worktree，可以让多个 Claude 实例各自在自己的 worktree 里干活，真正的并行开发。

## 启动方式

```bash
# 让 Claude 自动开 worktree
claude --worktree feature-auth

# 或在会话中，让 subagent 跑在 worktree 里（agent 配置 isolation: worktree）
```

第一种方式会创建一个新的 worktree 目录并启动 Claude 会话。第二种方式是通过 subagent 配置自动隔离，适合编排多个并行任务。

## 配置

`.claude/settings.json`：

```jsonc
{
  "worktree": {
    "baseRef": "head"  // "head" 带未推 commit；"fresh" 从 origin/main 起
  }
}
```

`baseRef` 决定新 worktree 从哪个点开始分支。`head` 会带上你当前未推送的 commit，适合在已有工作基础上并行；`fresh` 从远端主分支干净起步，适合完全独立的新任务。

## `.worktreeinclude`

Worktree 默认只包含 git 跟踪的文件——`.env`、`node_modules` 等被 `.gitignore` 忽略的文件不会出现在新 worktree 里。如果你的项目运行依赖这些文件，在仓库根目录创建 `.worktreeinclude` 指定需要拷贝过去的：

```
.env
.env.local
config/local.yml
```

> [!warning]
> 不要把 `node_modules` 加进 `.worktreeinclude`，太大了。让每个 worktree 自己跑一次 `npm install` 更靠谱。

## 实战节奏

1. **早晨规划**：列今天要干的 3 件互不相关的事
2. **开 3 个 worktree**：`claude --worktree task-1` / `task-2` / `task-3`
3. **3 个 Claude 同时跑**，你轮流盯
4. **谁先完先 review，分别提 PR**

这个节奏的关键是"互不相关"。如果两个任务会改同一个文件，就不适合并行，合并时必然冲突。

## 进阶：Agent View（2026 新）

Agent View 提供一屏监控多个 Claude 会话的界面。每个 session 跑在自己的 worktree 里，你可以同时看到所有任务的进度、切换焦点、随时介入。

文档：https://code.claude.com/docs/en/agent-view

> [!tip]
> Agent View 配合 subagent 的 `isolation: worktree` 使用效果最佳——你在主会话里编排任务，Agent View 里监控各个 subagent 的执行状态。

## 注意事项

别让两个 worktree 改同一个文件。这是最常见的坑——两边都改了 `utils.ts`，合并时就得手动解冲突。规划任务时就要想好边界。

定期清理过期的 worktree。用 `git worktree prune` 清除已删除目录的记录，或者在 settings 里配置 `cleanupPeriodDays` 让 Claude Code 自动清理。时间一长，废弃 worktree 会占不少磁盘空间。

CI 环境里用 `--worktree` 加 `-p`（并行）时，进程结束后 worktree 不会自动删除。需要在 CI 脚本里加一步清理，否则构建机器的磁盘会慢慢被吃满。

## 相关
- [[01-Subagent子代理]]
- [[02-多Agent并行orchestrator]]
- [[04-Headless模式与脚本化]]
