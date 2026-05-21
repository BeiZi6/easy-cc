# Codex 接入改造任务计划

## 目标

将当前强绑定 `Claude Code` 的 Obsidian 插件 bundle 改造成可由本机 `codex` CLI 驱动，并尽量保留现有聊天、多会话、恢复与 fork 能力。

## 当前判断

- 当前目录是打包产物，不是源码仓库，只能在 `main.js` 上做 bundle 级修改。
- 最深耦合点在 `u_()` / `QueryOptionsBuilder` / `ClaudianService` / `ClaudeCliResolver`。
- `codex` 本机可执行存在，且支持：
  - `codex exec --json`
  - `codex exec resume`
  - `codex resume`
  - `codex fork`
  - `codex mcp-server`
- 当前沙箱下 `codex exec` 因网络受限失败，因此只能做静态验证和协议适配，无法在此环境完整跑通远端响应。

## 阶段

| 阶段 | 状态 | 内容 |
|---|---|---|
| 1 | completed | 固化耦合点、Codex 能力、协议差异 |
| 2 | completed | 设计最小适配方案 |
| 3 | completed | 修复插件发现问题，拆分独立插件 ID |
| 4 | completed | 将底层从 `codex exec --json` 升级为 `codex app-server` 会话驱动 |
| 5 | completed | 做静态校验并记录剩余风险 |
| 6 | completed | 修复旧 `claudian-view` 残留叶子导致的 `codexian` 无法打开问题，并让 CLI 解析真正优先落到 `codex` |

## 候选方案

### 方案 A：最小 CLI 适配

- 保留现有 UI、会话数据结构、TabManager、设置页大部分结构
- 把底层从 `Claude Code SDK/CLI stream-json` 切到 `codex exec --json`
- 对 `resume/fork` 做命令级映射
- 对 `permissionMode`、`mcpServers`、`hooks`、`tool gating` 做降级或兼容映射

优点：
- bundle 级改动最小
- 用户面上的工作流基本保留

缺点：
- 需要重写消息事件适配
- Claude SDK 的部分能力无法 1:1 迁移

### 方案 B：只做抽象层，不彻底切换

- 先把 `Claude` 命名和 CLI 解析抽象为 provider
- 预留 `codex` provider，但不承诺完整功能

优点：
- 风险小

缺点：
- 用户当前无法直接用 Codex 聊天

## 本轮执行策略

在“插件能显示”的前提下，从最小适配继续推进到“更接近 1:1”的 provider：

- 修复 `manifest.id` 与目录冲突
- 将 Codex provider 改成长期 `app-server` 连接
- 让 `resume / fork / interrupt` 基于 thread/turn 原语工作
- 保留现有 UI、TabManager、会话存储层

仍需谨慎对待：

- Claude 专属 settings source
- Claude 专属 permission 模式完全等价
- Claude SDK hooks / file checkpointing / plugin 管理的全部语义
- 带文件回滚的精确 rewind
- Codex skills / plugins 与 Claude SDK `supportedCommands()` 的完全对等
- 标题生成与模型选择 UI 仍有部分 Claude 命名遗留，需要后续继续收口

## 错误记录

| 问题 | 现象 | 处理 |
|---|---|---|
| superpowers 技能缺失 | `use-skill obsidian` / `planning-with-files` 报 `Skill not found` | 直接读取本地 `SKILL.md` 作为回退 |
| Codex 联网失败 | `codex exec --json` 在沙箱内报 `stream disconnected before completion` | 继续做协议级和静态适配，不宣称端到端通过 |
| 插件列表中不显示 | 新目录 `codexian` 与旧目录 `claudian` 共用 `manifest.id = "claudian"` | 改成独立 `id = "codexian"`，避免 Obsidian 插件发现冲突 |
