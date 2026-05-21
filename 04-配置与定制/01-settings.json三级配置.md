---
title: settings.json 配置体系
tags: [claude-code, 配置, settings]
updated: 2026-05-21
---

# settings.json 配置体系

> 官方文档：https://code.claude.com/docs/en/settings

## 四级优先级（高 → 低）

Claude Code 的配置采用分层覆盖机制，优先级从高到低依次为：

1. **Managed**（企业管控，IT 部门下发）
2. **CLI 启动参数**
3. **`.claude/settings.local.json`**（项目级，个人，**不入 git**）
4. **`.claude/settings.json`**（项目级，团队共享，**入 git**）
5. **`~/.claude/settings.json`**（用户全局）

> 后面的层级被前面的覆盖。先看本地、再看项目、再看全局。

核心思路是：团队共识放 `settings.json` 入库，个人偏好放 `settings.local.json` 不入库，企业安全策略通过 Managed 强制下发不可覆盖。

## 常用字段

`model` 指定默认使用的模型，比如 `claude-sonnet-4-6[1M]` 或 `claude-opus-4-6[1M]`。切换模型需要重启 session 才生效。

`outputStyle` 控制 Claude 的回复风格。内置选项有 `Concise`（简洁）和 `Explanatory`（详细解释），也可以写一段自定义描述，比如 `"用中文回答，段落简短"`。

`permissions` 定义工具的放行/拦截规则，是安全的核心配置。详见 [[03-权限系统permissions]]。

`hooks` 让你在 Claude 执行特定动作时自动触发脚本。详见 [[04-Hooks钩子系统]]。

`mcpServers` 配置 MCP 服务器连接，扩展 Claude 的能力边界。详见 [[../05-MCP与扩展/02-常用MCP服务器]]。

`additionalDirectories` 允许 Claude 读写工作目录之外的额外目录。比如你的项目依赖一个同级的 shared 库，可以把它加进来。

`env` 注入环境变量，hook 脚本和 MCP 服务器都能读到。适合传 API key 或切换环境标识。

`worktree.baseRef` 控制 worktree 的基准分支策略：`fresh` 从 origin 默认分支拉新，`head` 从当前 HEAD 分支。

## 推荐的最小起步配置

```jsonc
{
  "$schema": "https://json.schemastore.org/claude-code-settings.json",
  "model": "claude-sonnet-4-6",
  "outputStyle": "Concise",
  "permissions": {
    "allow": ["Read", "Edit", "Bash(git status)", "Bash(git diff)", "Bash(npm test*)"],
    "deny": ["Bash(rm -rf*)", "Bash(git push --force*)"],
    "defaultMode": "default"
  }
}
```

## 小技巧

顶部加 `"$schema"` 行，编辑器（VS Code / Cursor）会自动提供字段补全和校验，写配置不用翻文档。

> [!warning]
> 某些字段需要重启 session 才生效，包括 `model`、`outputStyle`、`mcpServers`。改完后如果没效果，退出重进就好。

用 `/config` 命令可以在 Claude Code 的 UI 里交互式修改配置，它会自动写回正确的层级文件，不用手动找路径。

## 相关
- [[02-CLAUDE.md分层机制]]
- [[03-权限系统permissions]]
