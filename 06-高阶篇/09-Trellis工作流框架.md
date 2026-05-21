---
title: Trellis 工作流框架
tags: [claude-code, 高阶, trellis, spec, subagent]
updated: 2026-05-21
---

# Trellis 工作流框架

> 把 Spec 驱动 + Subagent + Hooks + Skills 打包成一个开箱即用的"AI coding harness"。
> 一句话：让 Claude Code 每次会话都自动加载你的项目规约、任务上下文和团队记忆。

- 仓库：https://github.com/mindfold-ai/Trellis
- 官网：https://docs.trytrellis.app/
- 协议：AGPL-3.0
- 包名：`@mindfoldhq/trellis`

## 它解决什么问题

裸用 Claude Code 时常见的几个痛点：

- **CLAUDE.md 越写越大**，最后被截断或污染上下文。
- **每次 `/clear` 后都要重新交代背景**，团队里换人也得从头讲。
- **Spec、tasks、journal 散在各处**，AI 根本读不到。
- **没有强制工作流**，模型容易越权改文件、跳过验证、忘记跑测试。

Trellis 用一个 `.trellis/` 目录把这些都钉死：spec 模块化拆分、task 走标准状态机、journal 跨会话延续、hooks 在每轮自动注入对应上下文。

## 核心概念

### 四样东西

| 概念 | 位置 | 作用 |
|---|---|---|
| **Specs** | `.trellis/spec/` | 团队规约（按模块/包拆分），每次会话自动注入 |
| **Tasks** | `.trellis/tasks/MM-DD-name/` | 单个工作单元，含 PRD、design、implement |
| **Workspace** | `.trellis/workspace/<dev>/` | 个人 journal，跨会话记忆 |
| **Workflow** | `.trellis/workflow.md` | 阶段定义和 state block |

### 三个 Subagent

Trellis 自带三个角色：

- `trellis-research`：调研代码/文档/API，产出写到 `research/`
- `trellis-implement`：按 PRD + spec 写代码
- `trellis-check`：review diff，跑 lint/typecheck/test，能自修就自修

### 几个关键 Skill

- `brainstorm`：planning 阶段拓展需求
- `before-dev`：开写前确认 PRD/design/implement 都齐了
- `check`：review + 自修循环
- `update-spec`：把这次学到的东西沉淀回 `.trellis/spec/`
- `finish-work`：归档任务、写 journal

## 安装

要求 Node.js >= 18，Python >= 3.9。

```bash
# 全局装 CLI
npm install -g @mindfoldhq/trellis@latest

# 在项目里初始化（默认会探测平台）
cd your-project
trellis init -u your-name

# 或者指定平台
trellis init --claude --cursor --opencode -u your-name
```

`init` 会在仓库里生成：

```
.trellis/         # Trellis 自己的目录（git 跟踪）
.claude/          # Claude Code 平台适配（hooks、agents、commands）
CLAUDE.md         # 入口文件，自动指向 .trellis/
```

> [!tip] 升级
> `trellis upgrade` 升级 CLI；项目内的 `.trellis/` 目录会跟着 CLI 版本自动同步框架文件，你写的 spec 不会丢。

## 三阶段工作流

官方文档把流程定义为 3 个 phase，每个 task 走同一条状态机：

```
planning → in_progress → completed → archived
```

### Phase 1 · Plan

你说："给 /users 接口加分页。"

Claude 触发 triage，确认要不要建 task，然后跑：

```bash
TASK_DIR=$(./.trellis/scripts/task.py create "Add /users pagination" \
  --slug users-pagination \
  --priority P1 \
  --description "limit/offset 风格分页")
```

生成 `.trellis/tasks/05-21-users-pagination/`，里面有 `task.json` 和 `prd.md`。
你审一遍 PRD，需要的话再让它补 `design.md` 和 `implement.md`。

### Phase 2 · Execute

直接打 `continue`：

```
you:  continue
AI:   [启动 trellis-implement，按 implement.jsonl 加载 spec，写代码]

you:  continue
AI:   [启动 trellis-check，review diff，跑测试，自修]
```

`implement.jsonl` 长这样，每行一条 spec 引用：

```json
{"file": ".trellis/spec/backend/database-guidelines.md", "reason": "ORM 批量调用规约"}
{"file": ".trellis/spec/backend/api-style.md", "reason": "REST 风格"}
```

这是**上下文清单**，不是要改的源文件。你想给某个 task 加上下文：

```bash
./.trellis/scripts/task.py add-context "$TASK_DIR" implement \
  ".trellis/spec/backend/index.md" "Backend dev guide"
```

### Phase 3 · Finish

代码 commit 完后：

```
/trellis:finish-work
```

它会：
1. 检查工作树干不干净（脏的话拒绝跑）
2. 触发 `update-spec`，把这次学到的规则提升到 `.trellis/spec/`
3. 归档 task 到 `archive/`
4. 在 journal 里追加一条会话记录

## Spec 长什么样

不是泛泛的"原则"，而是**可执行的契约**：具体签名、正反例、写明 why。

`.trellis/spec/backend/database-guidelines.md`：

````markdown
#### 约定：用 ORM 批量方法，不要循环单行 DB 调用

**What**：N 条记录就调一次批量方法，绝不在 for 里调单行。

**Why**：每次 DB 调用是一次 round-trip。200 条循环能让 p99 从 50ms 飙到 8s。

**Example**：

```ts
// ✅ 正确
await prisma.user.createMany({ data: users });

// ❌ 错误 —— N 次 round-trip
for (const user of users) {
  await prisma.user.create({ data: user });
}
```

**Related**：`quality-guidelines.md#performance`
````

> [!warning] Spec ≠ Guide
> 写得像"记得考虑 X"的内容应该放 `guides/`，不要塞进 `spec/`。Spec 应该能被机器/AI 直接 enforce。

## 与 Claude Code 的集成原理

Trellis 在 `.claude/` 下放了几样东西：

- **SessionStart hook**：会话一开就把当前 task 状态、git state、workflow 索引压成紧凑上下文塞进去。
- **UserPromptSubmit hook**：每轮根据 `task.json.status` 找到 `workflow.md` 里对应的 `[workflow-state:STATUS]` 块注入。
- **Sub-agent hook**：`trellis-implement` 启动前，把 PRD + design + implement.md + JSONL 清单全部 push 给它。
- **`/trellis:start` `/trellis:continue` `/trellis:finish-work`** 三个 slash 命令。

> [!note] 为什么不只用 CLAUDE.md
> CLAUDE.md 是单文件、全量加载，会越长越糊。Trellis 是按当前 task 状态动态拼装上下文，每轮只塞相关那部分，token 利用率高得多。

## 日常命令速查

```bash
# 看活跃任务
./.trellis/scripts/task.py list

# 按状态过滤
./.trellis/scripts/task.py list --status review

# 给 task 绑分支
./.trellis/scripts/task.py set-branch "$TASK_DIR" "feature/users-pagination"

# 看 spec 索引（按 package 分组）
./.trellis/scripts/get_context.py --mode packages

# 归档完成的 task
./.trellis/scripts/task.py archive users-pagination

# 升级 CLI
trellis upgrade
```

slash 命令：

| 命令 | 用途 |
|---|---|
| `/trellis:start` | 没自动注入的平台手动启动 |
| `/trellis:continue` | 推进当前 task 到下一阶段 |
| `/trellis:finish-work` | 提交后归档 + 写 journal |

## 多平台支持

官方宣称支持 14 个平台（一份 `.trellis/` 通用）：

> Claude Code · Cursor · OpenCode · Codex · Kiro · Kilo · Gemini CLI · Antigravity · Windsurf · Qoder · CodeBuddy · GitHub Copilot · Droid · Pi Agent

意味着**团队混用 IDE 也能共享同一套 spec 和 task**。

## 适合谁

✅ 适合：
- 团队协作，想把规约写一次到处用
- 项目复杂、上下文密度高，CLAUDE.md 已经塞不下
- 想让 spec 强制 enforce，而不是靠模型"记得"
- 跨会话/跨设备/跨平台都要保持一致

❌ 不适合：
- 一次性脚本、玩具项目
- 完全不愿意约束模型自由度的人
- 不想引入额外 CLI 依赖（Node + Python）的最简主义者

## 与本指南其他章节的关系

- [[../03-工作流篇/01-Spec驱动开发]] —— Trellis 是 Spec 驱动的工程化实现
- [[01-Subagent子代理]] —— Trellis 内置三个 subagent 角色
- [[../04-配置与定制/04-Hooks钩子系统]] —— Trellis 用 hooks 做自动注入
- [[../04-配置与定制/07-Skills技能系统]] —— Trellis 的 skill 触发机制
- [[../03-工作流篇/05-长任务与记忆系统]] —— journal 即跨会话记忆

## 参考

- 官方快速开始：https://docs.trytrellis.app/beta/start/install-and-first-task
- 日常使用：https://docs.trytrellis.app/beta/start/everyday-use
- 架构详解：https://docs.trytrellis.app/beta/advanced/architecture
- 自定义 skill：https://docs.trytrellis.app/beta/advanced/custom-skills
