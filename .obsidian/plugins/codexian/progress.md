# 进度日志

## 2026-03-15

### 已完成

- 重新执行 superpowers bootstrap
- 读取 `obsidian` 与 `planning-with-files` 技能文件
- 通过 superpowers 成功加载：
  - `superpowers:brainstorming`
  - `superpowers:writing-plans`
- 定位 `main.js` 中 Claude Code 深耦合区域
- 确认本机存在 `codex` CLI
- 确认 `codex` 支持 `exec --json`、`resume`、`fork`
- 记录当前沙箱无法完成 Codex 联网请求的限制
- 在 `main.js` 中加入 `CodexQuery`
- 将 `u_()` 按可执行文件名切到 Codex 包装分支
- 扩展 CLI 自动发现为优先查找 `codex`
- 将新会话持久化切回 legacy JSONL
- 通过 `node --check main.js` 语法检查
- 确认新目录 `codexian` 仍使用旧 `manifest.id = "claudian"`，且同级还存在原始 `claudian` 目录
- 确认插件不可见的根因是重复插件 ID，而不是 `main.js` 运行时错误
- 已将 `manifest.json` 的插件标识切换为独立的 `codexian`
- 通过 `codex app-server --listen stdio://` 实测确认传输为 JSON-RPC JSONL
- 通过 schema 与实测确认 Codex app-server 支持：
  - `thread/start`
  - `thread/resume`
  - `thread/fork`
  - `thread/rollback`
  - `turn/start`
  - `turn/interrupt`
- 实测拿到关键通知：
  - `thread/started`
  - `turn/started`
  - `agent_message_delta`
  - `reasoning_text_delta`
  - `error`
  - `turn/completed`
- 发现 `workspace` 中残留旧的 `claudian-view` 叶子时，`activateView()` 只会 `revealLeaf`，不会修复失效视图
- 发现 `claudeCliPathsByHost` 仍指向旧 `claude` 可执行文件，会压过 `codex` 自动发现
- 已在 `main.js` 中加入失效叶子修复逻辑，`activateView()` 会优先接管旧叶子
- 已将 `getView()` / `getAllViews()` 改为仅返回当前插件真正接管的视图
- 已将新建 tab / 新会话 / 关闭 tab 命令改为走受管 view
- 已将界面显示名和 ribbon 文案切换为 `Codexian`
- 已让 CLI 解析优先选用本机 `codex`，不会继续被旧 hostname 级 `claude` 路径卡住
- 已对 Codex provider 的模型参数做归一化，自动忽略 `opus` / `sonnet` / `haiku` / `claude-*` 等旧 Anthropic 模型名

### 正在进行

- 无

### 下一步

- 需要真实 Obsidian 环境下验证：
  - 旧工作区残留 `claudian-view` 时是否能被自动接管
  - 点击 ribbon 或命令面板后是否能正常打开 `Codexian`
  - 首轮聊天
  - 会话恢复
  - 标题生成
  - 内联编辑
  - fork / rewind 行为
- 需要后续继续补齐：
  - 文件级 rewind 回滚
  - skills / plugins 列表与 Claude SDK 能力的进一步对齐
