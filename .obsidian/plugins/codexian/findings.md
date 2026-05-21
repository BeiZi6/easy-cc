# 发现记录

## 项目结构

- 当前目录为 Obsidian 插件发布目录
- 核心文件：
  - `manifest.json`
  - `main.js`
  - `styles.css`
  - `data.json`

## Claude Code 耦合点

- `main.js:49601` 左右：`ClaudianService`
- `main.js:49318` 左右：`QueryOptionsBuilder`
- `main.js:68882` 左右：`ClaudeCliResolver`
- `main.js:47938` 左右：`u_()` 调用路径要求 `pathToClaudeCodeExecutable`
- `main.js:43401` 左右：内部 `ProcessTransport` 会强制拼接 Claude CLI 参数：
  - `--output-format stream-json`
  - `--input-format stream-json`
  - `--resume`
  - `--fork-session`
  - `--resume-session-at`
  - `--mcp-config`
  - `--setting-sources`
  - `--permission-mode`

## Codex CLI 观察

- `which codex`:
  - `/Users/xyu/.nvm/versions/node/v24.11.1/bin/codex`
- `codex --help` 显示支持：
  - `exec`
  - `review`
  - `resume`
  - `fork`
  - `mcp-server`
  - `app-server`
- `codex exec --help` 显示：
  - 支持 `--json` 输出 JSONL
  - 支持 `--output-last-message`
  - 支持 `--ephemeral`
  - 支持 `--add-dir`
- `codex exec resume --help` 显示：
  - 支持按 `SESSION_ID` 恢复
  - 支持 `--last`
  - 支持 `--json`
- `codex fork --help` 显示：
  - 支持按 `SESSION_ID` fork
- `codex app-server --help` 显示：
  - 支持 `--listen stdio://`
  - 支持 `generate-json-schema`

## Codex JSON 事件

在当前沙箱中执行 `codex exec --json`，已观察到 stdout JSONL 事件：

- `thread.started`
- `turn.started`
- `error`
- `turn.failed`

推断：

- Codex CLI 至少具备稳定的事件流入口
- 但其事件模型与 Claude SDK 的 assistant/message/chunk 模式不同，必须做适配层

## 插件不可见根因

- 当前 Vault 中同时存在：
  - `.obsidian/plugins/claudian`
  - `.obsidian/plugins/codexian`
- 但 `codexian/manifest.json` 最初仍然写的是：
  - `"id": "claudian"`
- 这会导致新目录不是独立插件，而是与原插件发生 ID 冲突
- 结论：
  - “插件列表中不显示”的根因在插件发现阶段
  - 不是 `main.js` 聊天逻辑本身导致

## Codex app-server 观察

- 已用 `codex app-server --listen stdio://` 实测确认：
  - 传输层为 JSON-RPC JSONL
  - 不需要 `Content-Length` framing
- 已实测成功发送：
  - `initialize`
  - `thread/start`
  - `turn/start`
- 已观察到通知：
  - `thread/started`
  - `thread/status/changed`
  - `turn/started`
  - `item/started`
  - `item/completed`
  - `error`
  - `turn/completed`
- 通过 schema 进一步确认支持：
  - `thread/resume`
  - `thread/fork`
  - `thread/rollback`
  - `turn/interrupt`

推断：

- 如果要继续逼近 1:1，会话层必须切到 `app-server`
- 继续依赖 `codex exec --json` 只能做到最小兼容，做不到可靠的 fork / interrupt / turn-level 恢复

## 高风险差异

1. Claude 当前实现深度依赖 stream-json 协议，不是简单替换可执行文件名
2. `permissionMode` 语义不同：
   - Claude: `bypassPermissions` / `acceptEdits` / `plan`
   - Codex: `--sandbox` + `--ask-for-approval`
3. Claude `mcpServers` / `hooks` / `settingSources` 无法直接原样透传给 Codex
4. 当前会话存储路径是 `.claude/*`，如彻底重命名会带来迁移成本

## 当前建议

- 第一版只做“Codex CLI 兼容模式”
- 存储结构先不改目录名，避免会话数据全部失效
- 优先改动：
  - CLI 路径解析
  - 启动命令构造
  - 会话恢复 / fork 命令映射
  - 设置页文案
  - 错误提示文案

## 已实施的当前方案

- `manifest.json` 已改为独立插件标识：
  - `id = "codexian"`
  - `name = "Codexian"`
- `u_()` 仍按 `codex` 可执行文件名切 provider
- `CodexQuery` 已从一轮一进程的 `codex exec --json` 包装，升级为长期 `codex app-server` 会话驱动
- 当前 provider 已做：
  - `initialize`
  - `thread/start`
  - `thread/resume`
  - `thread/fork`
  - fork 后按 `resumeSessionAt` 做 `thread/read + thread/rollback`
  - `turn/start`
  - `turn/interrupt`
- 当前事件适配已覆盖：
  - `agent_message_delta` -> 文本增量
  - `reasoning_*_delta` -> thinking 增量
  - `turn/completed` -> `result` / `error`
- assistant uuid 现在优先使用真实 Codex `turnId`，而不是随机占位 UUID
- 新建会话和后续保存继续使用插件自身 JSONL 持久化，不自动提升到 native SDK 会话
- CLI 自动发现优先加入 `codex`

## 当前剩余缺口

- `rewindFiles()` 仍未达到 Claude 的文件级回滚能力
  - Codex `thread/rollback` 只回滚线程历史，不自动撤销本地文件修改
  - 当前实现仍然保守返回“不支持安全文件回滚”
- `supportedCommands()` 仍未映射到 Codex skills/plugins 列表
- Claude 专属 hooks / settings source / plugin 管理 仍然只是兼容层，不是原生 1:1

## 新发现的“打不开”根因

- 当前 Vault 的 `workspace.json` 里仍保存着旧的 `claudian-view` 叶子
- 插件原来的 `activateView()` 逻辑只要看到有 `claudian-view` 叶子，就直接 `revealLeaf`
- 但它不会检查这个叶子是不是当前 `codexian` 插件真实接管的 `ItemView`
- 结果：
  - 旧插件残留叶子可以拦住新插件打开流程
  - 用户侧表现就是“点插件没反应”或“打不开”

推断：

- 这比 `manifest`、`community-plugins.json` 更接近当前“能启用但打不开”的直接运行时根因

## 新发现的 Codex 接管阻塞

- `.claude/claudian-settings.json` 当前仍保存：
  - `claudeCliPathsByHost.XyudeMacBook-Pro.local = /Users/xyu/.nvm/versions/node/v24.11.1/bin/claude`
- `ClaudeCliResolver` 原逻辑优先使用 hostname 级路径
- 即使本机同时存在：
  - `/Users/xyu/.nvm/versions/node/v24.11.1/bin/codex`
  - `/Users/xyu/.nvm/versions/node/v24.11.1/bin/claude`
  也会一直命中旧 `claude`

结论：

- 如果不改解析优先级，前面做的 Codex provider 适配在真实运行中会被旧配置绕开

## 本轮修复

- 为 CLI 解析加入 `isCodexCliPath()`，当本机检测到 `codex` 时优先使用 `codex`
- 保留旧 `claude` 路径作为回退，而不再作为绝对最高优先级
- 给 `CodexQuery` 加入模型归一化：
  - `opus`
  - `sonnet`
  - `haiku`
  - `claude-*`
  这些旧 Anthropic 模型名会在 Codex 分支被自动忽略，回退到 Codex 默认模型
- 为插件增加受管 leaf 识别：
  - `isManagedLeaf()`
  - `getManagedLeaves()`
- `activateView()` 现在会优先修复失效的旧 `claudian-view` 叶子，而不是盲目 `revealLeaf`
- `getView()` / `getAllViews()` 与相关 tab 命令现在只使用当前插件真正接管的视图
- 视图显示名与标题已切换为：
  - `Codexian`
