---
title: MCP 是什么
tags: [claude-code, MCP, 概念]
updated: 2026-05-21
---

# MCP 是什么

> Model Context Protocol，Anthropic 开源的「LLM ↔ 工具」标准协议。
> 类比：MCP 之于 LLM，相当于 USB 之于硬件。

## 三个核心概念

**MCP Server** 是一个独立进程，对外暴露一组工具或资源。你可以把它理解为一个"插件后端"——Claude 通过协议跟它通信，调用它提供的能力。一个 server 可以只暴露一个工具，也可以暴露几十个。

**Transport** 决定 Claude 和 MCP Server 之间怎么通信：

- `stdio`：最常用的方式。Claude 把 server 当子进程启动，通过标准输入输出交换 JSON-RPC 消息。适合本地工具。
- `SSE / HTTP`：server 跑在远端，Claude 通过网络连接。适合团队共享的服务或云端 API。

**Resource / Tool / Prompt** 是 server 能暴露的三类东西：

| 类型 | 说明 | 例子 |
|------|------|------|
| Tool | 模型可调用的函数 | `get_weather(city)` |
| Resource | 可被 `@` 引用的数据 | 数据库 schema、文档 |
| Prompt | 预设的 prompt 模板 | "用 XX 风格 review 代码" |

## 在 Claude Code 里怎么用

Claude Code 内置了 MCP 管理命令，不需要手动编辑配置文件：

```bash
# 加一个 MCP server
claude mcp add <name>

# 列出已安装
claude mcp list

# 在对话里 @ 引用
@server-name:resource-id
```

> [!tip]
> `claude mcp add` 会交互式引导你填 command 和 args，填完自动写入配置文件。

## 配置文件位置

MCP 配置存在 `~/.claude/settings.json`（全局）或项目级 `.claude/settings.json`。格式如下：

```jsonc
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/path"]
    }
  }
}
```

项目级配置只对当前仓库生效，适合团队共享。全局配置对所有项目生效，适合你个人常用的工具。两者同名时项目级优先。

## Connector Directory

Anthropic 官方维护了一个审核过的 MCP Server 目录，支持"一键安装"：https://claude.ai/directory

在这里你能找到 GitHub、Notion、Slack、数据库等常见服务的官方或社区 MCP Server。点击即可添加到你的配置中，省去手动填写 command/args 的麻烦。

> [!tip]
> 如果你要找的工具不在 Directory 里，可以去 GitHub 搜 `mcp-server-*`，社区生态已经非常丰富。

## 相关
- [[02-常用MCP服务器]]
- [[04-MCP安全注意事项]]
