---
title: Hooks 钩子系统
tags: [claude-code, 配置, hooks]
updated: 2026-05-21
---

# Hooks 钩子系统

> 官方文档：https://code.claude.com/docs/en/hooks-guide

> 用一句话概括：**当 Claude 干某件事的瞬间，自动跑你的脚本**。
> 用法：自动格式化、注入上下文、拦截危险操作、触发通知。

## 八个核心事件

Hooks 系统围绕八个生命周期事件展开，覆盖了 Claude 工作流的关键节点：

`PreToolUse` 在工具调用前触发。这是最强大的拦截点——你可以检查参数、修改参数、甚至直接拒绝执行。比如检测到 `rm -rf /` 就返回错误码阻止执行。

`PostToolUse` 在工具调用后触发。拿到执行结果，适合做日志记录、自动格式化、触发后续动作。

`UserPromptSubmit` 在用户按回车后、Claude 处理前触发。可以修改 prompt 内容，比如自动追加当前 git 分支信息。

`Stop` 在 Claude 一轮回复结束时触发。适合做收尾工作，比如发通知、写摘要。

`SessionStart` / `SessionEnd` 在会话开始和结束时触发。可以做环境初始化和清理。

`WorktreeCreate` / `WorktreeRemove` 在 worktree 创建和删除时触发。适合做分支相关的环境准备。

## 一个 hook 长什么样

```jsonc
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [{
          "type": "command",
          "command": "prettier --write \"$CLAUDE_FILE_PATH\" 2>/dev/null"
        }]
      }
    ],
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [{
          "type": "command",
          "command": ".claude/hooks/block-dangerous.sh"
        }]
      }
    ]
  }
}
```

`matcher` 用正则匹配工具名，`|` 表示"或"。hook 脚本通过环境变量拿到上下文（如 `$CLAUDE_FILE_PATH`、`$CLAUDE_TOOL_INPUT`）。脚本返回非零退出码表示拦截该操作。

## 经典 hook 配方

**保存即格式化**：PostToolUse 匹配 `Edit|Write`，触发 prettier / black / rustfmt。每次 Claude 改完文件自动格式化，省得你事后再跑一遍。

**保存即跑测试**：PostToolUse 匹配文件写入，根据改动的文件路径找到对应的测试文件并执行。即时反馈，TDD 体验拉满。

**prompt 注入项目状态**：UserPromptSubmit 时跑 `git status`、`git branch` 等命令，把结果追加到 prompt 里。Claude 每次都能看到当前分支和改动状态，不用你手动说。

**危险命令二次确认**：PreToolUse 匹配 Bash，用自定义脚本检查命令内容。发现 `drop table`、`rm -rf`、`force push` 等关键词就返回错误码拦截。比 permissions 的 glob 匹配更灵活，可以做语义级判断。

**会话结束发通知**：Stop 事件触发推送脚本，把本次会话摘要发到 Slack、飞书或 iMessage。适合跑长任务时离开电脑，完成了自动通知你。

**保护测试文件**：PreToolUse 匹配 Edit，检查目标路径是否在 `tests/` 目录下。如果是就拒绝——防止 Claude 为了让测试通过而去改测试本身。

> [!tip]
> hook 配方可以组合使用。一个成熟的项目配置通常有 3-5 个 hook，覆盖格式化、安全拦截和通知。

## Hook 类型

`command` 是最常用的类型，直接跑 shell 命令。脚本的 stdout 会作为额外上下文传给 Claude，stderr 显示在终端。

`prompt` 类型不跑命令，而是给 Claude 发一条消息。适合在特定时机注入提示，比如"记得跑测试"。

`agent` 类型是 2026 年新增的，调一个子代理来做判断。比 shell 脚本更智能，可以理解语义而不只是匹配字符串。适合复杂的安全策略判断。

## 调试技巧

用 `/hooks` 命令可以在 Claude Code 的 UI 里查看当前生效的所有 hook，确认配置是否正确加载。

hook 脚本里输出到 stderr 的内容会直接显示在终端，方便调试。可以在脚本里加 `echo "DEBUG: checking $CLAUDE_TOOL_INPUT" >&2` 来观察触发情况。

> [!warning]
> hook 失败（非零退出码）在 PreToolUse 中会阻止操作执行，但在 PostToolUse 中不会回滚已完成的操作——只会在终端标红提示。设计 hook 时要注意这个区别。

## 相关
- [[03-权限系统permissions]]
- [[../03-工作流篇/02-TDD与Claude Code]]
