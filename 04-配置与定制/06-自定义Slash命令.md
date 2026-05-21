---
title: 自定义 Slash 命令
tags: [claude-code, 配置, slash]
updated: 2026-05-21
---

# 自定义 Slash 命令

> 把常用 prompt 模板做成 `/命令名` 一键调用。

## 怎么写

在 `.claude/commands/` 目录下放 `.md` 文件。文件名 = 命令名。文件内容 = prompt 模板。

```
.claude/
└── commands/
    ├── review.md          # /review
    ├── refactor.md        # /refactor
    └── deploy-check.md    # /deploy-check
```

## 文件格式

```markdown
---
description: 给 PR 做架构级 review
allowed-tools: Read, Grep, Glob
---

请按以下顺序审查当前 git diff：

1. 接口变更：是否破坏向后兼容？
2. 测试覆盖：新逻辑是否有对应测试？
3. 错误处理：边界情况怎么处理？
4. 性能：有没有 N+1、不必要的同步阻塞？

输出一份 markdown 报告，每个发现标注严重度 [严重/中等/建议]。

参数：$ARGUMENTS
```

## 三级作用域

和 settings 一样：
- `~/.claude/commands/` —— 全局
- `.claude/commands/` —— 项目（入 git）
- `.claude/commands.local/` —— 项目个人（不入 git）

## 参数与变量

- `$ARGUMENTS` —— 用户在命令后面传的内容
- `@文件名` —— 自动注入文件
- `!命令` —— 注入 shell 命令的输出

## 实用模板清单

- `/review` —— 多角度 review 当前 diff
- `/refactor` —— 安全重构（先有测试再动）
- `/explain` —— 用人话解释当前选中代码
- `/sync` —— 拉主分支、跑测试、给我状态报告
- `/standup` —— 输出今天的工作摘要
- `/eli5` —— 把这段代码讲给 5 岁孩子
- `/deploy-check` —— 上线前 checklist

## 相关
- [[../02-基础篇/04-Slash命令一览]]
- [[07-Skills技能系统]]
