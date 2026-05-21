---
title: Bash 与工具调用
tags: [claude-code, 基础, bash]
updated: 2026-05-21
---

# Bash 与工具调用

Claude Code 不只是个代码编辑器——它能直接在你的终端里跑命令。Bash 工具是它"动手验证"的核心能力。

## Bash 工具的角色

Claude 用 Bash 做三件事：

1. **跑命令**——编译、测试、lint、git 操作
2. **看输出**——分析错误信息、检查运行结果
3. **自我修正**——根据输出调整代码，再跑一遍

这形成了一个闭环：改代码 → 跑测试 → 看报错 → 再改 → 再跑。这个循环是 Claude Code 最强大的工作模式之一。

## 每次调用都会问你

默认情况下，Claude 每执行一条 Bash 命令都会弹出确认提示，等你按 `y` 才继续。

```
Claude wants to run: npm test
Allow? (y/n)
```

这很安全但也很烦。如果你信任某些命令，可以在 permissions 里配置 allowlist，让它们自动放行：

```json
{
  "permissions": {
    "allow": [
      "npm test",
      "npm run lint",
      "git status",
      "git diff"
    ]
  }
}
```

> [!tip]
> 配置 allowlist 的详细方法见 [[../04-配置与定制/03-权限系统permissions]]。建议从只读命令开始放行，写操作谨慎添加。

## 常见用途

**跑测试 / 编译**——最常用的场景，改完代码立刻验证：

```bash
npm test
cargo build
pytest tests/
```

**Git 操作**——查看状态、提交、切分支：

```bash
git status
git diff --staged
git log --oneline -10
```

**探测接口**——快速验证 API 行为：

```bash
curl -s http://localhost:3000/api/health | jq .
```

**一次性脚本**——数据迁移、批量重命名等临时任务：

```bash
find . -name "*.bak" -delete
```

## 长跑命令的处理

有些命令会一直跑下去（dev server、watch 模式、交互式程序），Claude 不能用这些——它会卡住直到超时。

**用 `run_in_background`**：如果确实需要启动一个后台进程（比如跑个耗时的构建），Claude 可以把命令放到后台执行，不阻塞对话。

**Dev server 让用户自己开**：

```
❌ Claude 跑 `npm run dev`（会卡住）
✅ Claude 说"请在另一个终端跑 npm run dev"
```

> [!warning]
> 永远不要让 Claude 启动 `npm run dev`、`yarn start`、`webpack --watch` 这类长跑命令。它会占住进程直到超时，什么都干不了。

## 超时与中断

- **默认超时**：2 分钟。大多数命令够用了
- **最长超时**：10 分钟。跑大型测试套件或编译时可能需要
- **手动中断**：按 Esc 可以终止正在执行的命令

如果一个命令经常超时，考虑：
- 是不是该用 `run_in_background`
- 是不是该缩小测试范围（比如只跑相关的测试文件）
- 是不是该让用户自己在终端跑

## 安全心态

Claude 在执行高危命令前会额外警告你，但最终的 `y/n` 决定权在你手里。看到以下命令时请多看一眼：

| 命令 | 风险 |
|------|------|
| `rm -rf` | 递归删除，不可恢复 |
| `DROP DATABASE` / `DROP TABLE` | 数据永久丢失 |
| `git push --force` | 覆盖远程历史 |
| `git reset --hard` | 丢弃本地修改 |
| `git clean -f` | 删除未跟踪文件 |

> [!warning]
> 不要因为"Claude 建议的"就无脑按 y。它偶尔会在不必要的时候建议 force push 或 hard reset。养成习惯：**破坏性命令，看清再确认。**

最佳实践是用 deny 列表把高危命令默认拦截，需要时再手动放行。

## 相关
- [[../04-配置与定制/03-权限系统permissions]]
- [[../04-配置与定制/04-Hooks钩子系统]]
