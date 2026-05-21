---
title: 编写自己的 MCP
tags: [claude-code, MCP, 开发]
updated: 2026-05-21
---

# 编写自己的 MCP

> 当现成 MCP 不够用，或者你想把内部工具暴露给 Claude，就需要自己写一个。

## 选语言

主流选择有三个：

- **Python**：官方 SDK `mcp`（即 FastMCP），上手最快，几行代码就能跑起来。适合快速原型和内部工具。
- **TypeScript**：`@modelcontextprotocol/sdk`，前端团队友好，跟 Node 生态无缝衔接。
- **Rust / Go**：社区实现已经成熟，适合对性能有要求或者想编译成单二进制分发的场景。

> [!tip]
> 如果你只是想快速验证一个想法，Python + FastMCP 是最短路径。十分钟内能从零到可用。

## 最小可用 Python 例子

```python
from mcp.server.fastmcp import FastMCP

mcp = FastMCP("my-server")

@mcp.tool()
def get_today_weather(city: str) -> dict:
    """返回某城市今日天气"""
    return {"city": city, "temp": "23°C", "condition": "晴"}

if __name__ == "__main__":
    mcp.run()
```

注册到 Claude：

```jsonc
{
  "mcpServers": {
    "my-server": {
      "command": "python",
      "args": ["/path/to/server.py"]
    }
  }
}
```

就这么简单。Claude 启动时会自动拉起这个进程，通过 stdio 跟它通信。

## 三种暴露方式

一个 MCP Server 可以同时暴露三种能力：

**Tool** 是模型可以主动调用的函数。上面的 `get_today_weather` 就是一个 tool。模型看到函数签名和 docstring，决定什么时候调用。

**Resource** 是可以被 `@` 引用的数据源。比如你可以把数据库 schema、API 文档、配置文件暴露为 resource，用户在对话里 `@my-server:schema` 就能把内容拉进上下文。

**Prompt** 是预设的 prompt 模板。适合把团队常用的操作（比如"用我们的规范 review 这段代码"）封装成一键可用的模板。

## MCP Apps SDK（2026 新）

MCP Apps 是带 UI 的 MCP——server 不仅能返回数据，还能在 Claude 客户端里渲染按钮、表格、图表等交互组件。适合需要可视化反馈的场景，比如数据库查询结果展示、审批流程等。

官方文档：https://platform.claude.com/docs/en/mcp-apps

## 调试

开发 MCP Server 时，调试是绕不开的环节。

用 `claude mcp logs <name>` 可以查看 server 的标准输出和错误输出，这是最快的排查方式。日志会显示 Claude 发给 server 的每次调用和返回结果。

如果需要更细粒度的调试，可以单独把 server 跑起来，用 `mcp inspector` 连接。Inspector 提供了一个交互式界面，能手动发送请求、查看响应，方便逐步排查问题。

> [!warning]
> Server 返回错误时，务必使用标准化的 JSON-RPC error 格式。Claude 会根据 error code 和 message 决定是否重试或报告给用户。随意返回非标准格式会导致模型无法理解错误原因。

## 相关
- [[01-MCP是什么]]
- [[04-MCP安全注意事项]]
