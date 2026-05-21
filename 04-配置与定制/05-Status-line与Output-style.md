---
title: Status line 与 Output style
tags: [claude-code, 配置, UI]
updated: 2026-05-21
---

# Status line 与 Output style

## Status line

> 官方文档：https://code.claude.com/docs/en/statusline

终端底部状态栏，可显示：
- 当前模型 / 模式
- token 用量与剩余
- 当前 git 分支
- 自定义命令输出

### 配置例子
```jsonc
{
  "statusLine": {
    "type": "command",
    "command": "echo \"$(git branch --show-current) | $CLAUDE_MODEL\""
  }
}
```

### 默认状态行

不做任何配置时，底部会显示当前模型名称和 token 用量。够用，但信息密度不高。

### 可用变量

自定义 `command` 里可以用这些环境变量：

- `$CLAUDE_MODEL` — 当前模型名
- `$CLAUDE_SESSION_ID` — 会话 ID
- `$CLAUDE_PROJECT_DIR` — 项目根目录

Shell 命令的 stdout 会直接渲染到状态栏，所以你可以用任何命令拼接信息。

### 实战脚本

一行搞定 git 分支 + 模型名：

```bash
echo "$(git branch --show-current 2>/dev/null || echo 'no-git') | $CLAUDE_MODEL"
```

> [!tip] 状态栏刷新
> 状态栏每次 Claude 回复后刷新一次，不是实时的。别放太重的命令进去。

## Output style

> 官方文档：https://code.claude.com/docs/en/output-styles

控制 Claude 回复的"语气"和"啰嗦程度"。

### 内置 style
- `Concise` —— 极简，工程师默认推荐
- `Explanatory` —— 详细解释，学习场景
- `Default` —— 折中

### 自定义
在 `.claude/output-styles/` 下放 `.md`，写一段"你应当如何回复"的指令。例如：

```markdown
---
name: 学术风
description: 给科研用户的回复风格
---

# 你的回复风格

- 总是用中文
- 涉及公式必须给推导
- 给出参考文献链接
```

然后在 settings.json 里：
```jsonc
{ "outputStyle": "学术风" }
```

> [!note] 改了要重启
> `outputStyle` 改动需要重新启动 session 才生效。

## 相关
- [[01-settings.json三级配置]]
- [[06-自定义Slash命令]]
