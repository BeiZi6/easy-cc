---
title: 常用 MCP 服务器
tags: [claude-code, MCP, 工具]
updated: 2026-05-21
---

# 常用 MCP 服务器

> 高频用到的几个 MCP，按用途分组。版本变化快，本表注明发现日期。

### 浏览器自动化
- **Playwright MCP**（微软官方）
  - 仓库：https://github.com/microsoft/playwright-mcp
  - 用途：让 Claude 直接打开页面、点按钮、截图、断言
  - 推荐场景：UI 验证、爬虫、E2E 测试
- **Chrome DevTools MCP**
  - 配合 `Claude in Chrome` 扩展
  - 适合实时调试线上页面

### 文件系统
- `@modelcontextprotocol/server-filesystem`
  - 让 Claude 访问限定目录（不在 cwd 内的）
- `@modelcontextprotocol/server-git`
  - git 操作的结构化封装

### 数据库
- **Postgres MCP** —— SQL 查询、schema 自省
- **SQLite MCP** —— 同上，本地版

### 协作工具
- **Linear MCP**（已在 Connector Directory）
- **Notion MCP**（同上）
- **Sentry MCP** —— 看错误堆栈
- **Figma MCP** —— 读设计稿
- **Slack MCP** —— 读频道消息

### 通用
- **fetch MCP** —— 抓网页
- **memory MCP** —— 跨 session 持久记忆
- **MCP Inspector** —— 调试 MCP 连接，仓库：https://github.com/modelcontextprotocol/inspector

### 国内补充
- **bilibili-subtitle MCP**（社区）—— 提取 B 站字幕
- **小红书相关 MCP**（社区）

## 安装方式

### 方式 1：Connector Directory（最省事）
打开 https://claude.ai/directory，找到想要的服务器，点"Add"，自动写入配置。

### 方式 2：命令行
```bash
# 添加一个 MCP 服务器
claude mcp add filesystem --command "npx" --args "-y" "@modelcontextprotocol/server-filesystem" "/data"

# 查看已安装的 MCP
claude mcp list

# 删除
claude mcp remove filesystem
```

### 方式 3：直接编辑 settings.json
```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["-y", "@playwright/mcp@latest"]
    },
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/your/path"]
    }
  }
}
```

## 排查连不上的问题

1. `claude mcp list` 确认服务器已注册
2. 检查 command 路径是否正确（`which npx`）
3. 用 MCP Inspector 单独测试服务器
4. 看 `~/.claude/logs/` 里的错误日志
5. 重启 Claude Code（MCP 在启动时加载）

详见 [[04-MCP安全注意事项]]。

## 相关
- [[03-编写自己的MCP]]
- [[04-MCP安全注意事项]]
