---
title: MCP 安全注意事项
tags: [claude-code, MCP, 安全]
updated: 2026-05-21
---

# MCP 安全注意事项

> 装一个 MCP server，约等于在你电脑上装一个能动你文件、网络的可执行程序。
> 必须当软件安全事件来对待，不是当 npm 包随手装。

## 风险面

- **任意代码执行** —— 非官方 server 等同你 root 跑了它的代码
- **数据外泄** —— server 可以读你的文件、把内容发到自己服务器
- **prompt 注入** —— server 返回的内容会进 Claude 的 context，可被诱导执行恶意指令
- **凭证泄漏** —— 把 API key 给 MCP server，等于把它给作者

## 防御原则

### 安装前
- 优先选 **Connector Directory** 已审核的（claude.ai/directory）
- 看作者：Anthropic / 微软 / 知名公司 ✅；个人无名仓库 ⚠️
- 看 issue / PR 活跃度
- 读 README，搞清它要什么权限、要什么 secret

### 运行时
- 用 **Sandbox**（[[03-权限系统permissions]]）限制：
  - `sandbox.filesystem.allowWrite`
  - `sandbox.network.allowedDomains`
- **secret 用环境变量**，不写进 settings.json（避免提交到 git）
- 重要操作（删数据、转账、push）走 `ask`，不要 `allow`

### 来自 MCP 的 prompt 注入
- 把 MCP 返回的内容当**不可信用户输入**
- Claude Code 的 system prompt 已有相应保护，但仍要警惕"忽略前面所有指令"这种字符串
- Simon Willison 提醒过：auto mode 的 classifier 不是确定性防御

## 出事怎么办
1. `claude mcp remove <name>` 卸载
2. 撤销对应的 API key / token
3. 看 git diff、文件 mtime，确认有没有被改

## 相关
- [[03-权限系统permissions]]
- [[../08-避坑与反模式/00-索引]]
