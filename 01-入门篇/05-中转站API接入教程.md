---
title: 05 中转站 API 接入教程
tags: [claude-code, 入门, api, 中转站]
updated: 2026-05-21
---

# 中转站 API 接入教程

国内直连 Claude 的门槛比较高，使用中转站 API 是目前最常见的解决方案。这篇教程介绍如何从注册账号到配置好 Claude Code，完整走一遍流程。

> 中转站质量参差不齐，建议选择有技术团队或企业背书的站点，避免密钥泄露或服务跑路的风险。

## 注册中转站账号

这里以 [router.xyucode.top](https://router.xyucode.top) 为例。

![[截屏2026-05-21 22.41.14.png]]

## 创建 API 密钥

进入控制台后，点击右上角的「创建 API 密钥」，分组选择 **claude**。

![[截屏2026-05-21 22.42.34.png]]

![[截屏2026-05-21 22.43.03.png]]

其余选项保持默认，直接保存即可。

## 配置 Claude Code

有两种方式可以接入，推荐先试第一种（更省事）。

### 方式一：使用 cc-switch（推荐）

[cc-switch](https://github.com/farion1231/cc-switch) 是一个专门用来切换 Claude Code 配置的小工具，不需要手动改配置文件。

1. 按照仓库说明安装 cc-switch
2. 回到中转站的 API 密钥页面，点击密钥右侧的「···」→「CC 切换」

![[截屏2026-05-21 22.46.50.png]]

3. 按页面提示配置好模型，点击「打开 CC switch」

![[截屏2026-05-21 22.47.45.png]]

4. 点击「导入」，配置自动写入

![[截屏2026-05-21 22.48.19.png]]

导入完成后直接在终端运行 `claude` 即可。

### 方式二：手动编辑 settings.json

如果不想装额外工具，也可以直接编辑 Claude Code 的配置文件。

**macOS**：在 Finder 中打开根目录，找到 `.claude/settings.json`

**Windows**：路径为 `%USERPROFILE%\.claude\settings.json`

在文件中加入以下内容（注意替换成你自己的 API 密钥）：

```json
{
  "env": {
    "ANTHROPIC_BASE_URL": "https://router.xyucode.top/",
    "ANTHROPIC_AUTH_TOKEN": "你的apikey",
    "CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC": "1",
    "CLAUDE_CODE_ATTRIBUTION_HEADER": "0"
  },
  "model": "opus[1m]",
  "theme": "light"
}
```

保存后，在终端运行 `claude` 即可生效。
