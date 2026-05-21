---
title: Skills 技能系统
tags: [claude-code, 配置, skills]
updated: 2026-05-21
---

# Skills 技能系统

> 官方文档：https://code.claude.com/docs/en/skills

> Skill 是「按需加载的能力包」。比 slash 命令更结构化，比 subagent 更轻量。

## 和 Slash / Subagent 的区别

| | 加载时机 | 用途 | 典型大小 |
|---|---|---|---|
| Slash 命令 | 用户手动 `/x` | 一次性 prompt 模板 | 一个 .md |
| Skill | 模型自己根据 description 决定调用 | 复用工作流 / 领域知识 | 一个目录 |
| Subagent | 主代理委托 | 隔离 context、长任务 | 完整 agent 配置 |

## Skill 长什么样

```
.claude/skills/
└── pdf-extract/
    ├── SKILL.md        # 入口，包含 YAML frontmatter
    ├── scripts/
    │   └── extract.py
    └── examples/
        └── sample.pdf
```

`SKILL.md`：
```markdown
---
name: pdf-extract
description: 从 PDF 提取文字、表格、图片。当用户要求处理 PDF 时使用。
---

# 怎么用

1. 用 `scripts/extract.py` 抽文字
2. 表格优先用 pdfplumber
3. 图片用 PyMuPDF

详细用法见 examples/。
```

## 关键点

- **description 决定何时被触发**：写得越具体，模型越准确判断要不要调
- **按需加载**：不被调用就不进上下文，省 token
- `disable-model-invocation: true` —— 禁止模型自动调，只能 `/skill xxx` 手动调
- Skills 可以叠：一个项目装多个，互不干扰

## 哪里找现成 skill

- 官方 plugin marketplace：`/plugin`
- 社区集合：`awesome-claude-code` 仓库（README 重构中，关注 commits）
- `find-skills` skill：搜索可安装的技能

## 写自己 skill 的时机

- 重复性 ≥ 3 次的工作流
- 需要带"参考资料"（脚本、示例、文档）
- 不想每次都解释一遍背景

## 相关
- [[06-自定义Slash命令]]
- [[../06-高阶篇/01-Subagent子代理]]
