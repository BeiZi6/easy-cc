---
title: 权限系统 permissions
tags: [claude-code, 配置, 权限]
updated: 2026-05-21
---

# 权限系统 permissions

> 官方文档：https://code.claude.com/docs/en/permissions

## 三类规则

权限系统的核心就三个词：

- `allow` —— 自动放行，不弹确认。适合你完全信任的操作，比如读文件、跑测试。
- `ask` —— 弹确认框，让你决定。这是大多数操作的默认行为。
- `deny` —— 直接拒绝，不可绕过。用来硬性禁止危险操作，即使 Claude 觉得有必要也执行不了。

> [!tip]
> 设计权限时的思路：先 deny 掉绝对不能做的事，再 allow 高频无害操作，剩下的留给 ask 就好。

## 求值顺序

**deny → ask → allow**，先匹配先生效。

这意味着如果一个操作同时匹配了 deny 和 allow 规则，deny 优先。这是安全设计——宁可多拦一次，不可漏放一次。

## 规则语法

形如 `Tool(参数 glob)`，支持通配符匹配：

```jsonc
{
  "permissions": {
    "allow": [
      "Read",
      "Edit",
      "Bash(git status)",
      "Bash(git diff*)",
      "Bash(npm test*)",
      "Bash(pytest*)"
    ],
    "deny": [
      "Bash(rm -rf*)",
      "Bash(git push --force*)",
      "Bash(curl * | sh)",
      "Read(./.env*)"
    ],
    "ask": [
      "Bash(git push*)",
      "Write"
    ]
  }
}
```

`Read` 和 `Edit` 不带括号表示匹配该工具的所有调用。`Bash(git diff*)` 里的 `*` 是 glob 通配符，匹配任意后续字符。规则匹配的是 Claude 实际发出的工具调用参数，所以写规则时要想"Claude 会怎么调用这个命令"。

> [!warning]
> glob 匹配的是命令字符串，不是语义。`Bash(rm *)` 不会拦住 `Bash(find . -delete)`。关键危险操作建议用 deny 加 hook 双重防护。

## 五种 Permission Mode

`default` 是普通模式，严格按 allow/ask/deny 规则执行。大多数场景用这个就够了。

`acceptEdits` 让文件编辑（Read/Edit/Write）自动通过，但 Bash 命令仍然会弹确认。适合你信任 Claude 改代码但不信任它跑命令的场景。

`plan` 是只规划不动手模式。Claude 会告诉你它打算做什么，但不会实际执行任何工具调用。适合先看方案再决定是否放手。

`auto` 使用 Sonnet 4.6 作为 classifier 来判断操作是否危险，危险的拦下来问你，安全的自动放行。这是 2026 年上线的智能模式，兼顾效率和安全。

`bypassPermissions` 全部放行，不做任何拦截。仅在完全隔离的环境中使用（比如 Docker 容器、一次性 VM）。在本地机器上开这个等于裸奔。

`dontAsk` 比较特殊——被拒绝的操作不会再次询问，直接跳过。适合 CI 等无人值守场景，避免卡在确认框上。

## Sandbox（OS 级隔离）

2026 年起新增的沙箱机制，在操作系统层面限制 Claude 的能力边界：

- `sandbox.filesystem.allowWrite` —— 限制可写入的目录范围
- `sandbox.network.allowedDomains` —— 限制可访问的网络域名

Sandbox 和 permissions 是两层防护。permissions 在应用层拦截工具调用，sandbox 在 OS 层兜底。即使 permissions 配置有漏洞，sandbox 也能防止越界。

官方文档：https://code.claude.com/docs/en/sandboxing

## 实战配方

**个人电脑**：deny 掉 `rm -rf`、`git push --force`、`curl|sh` 这类不可逆操作，allow 常用的 git 查询和测试命令。日常开发体验流畅，关键时刻有兜底。

**共享服务器**：用 plan 模式起步，观察 Claude 的行为模式。确认安全后逐步放开 allow 列表，但保持严格的 ask 作为默认。多人环境下宁可多确认几次。

**CI 环境**：headless 模式运行，用 `allowedTools` 白名单严格限定可用工具，配合 sandbox 限制文件系统和网络访问。CI 里没有人盯着，必须靠配置保证安全。

> [!tip]
> 从严开始，逐步放宽。先跑几天 default 模式，观察哪些确认框你每次都点"允许"，再把它们加进 allow 列表。

## 相关
- [[01-settings.json三级配置]]
- [[04-Hooks钩子系统]]
- [[../06-高阶篇/04-Headless模式与脚本化]]
