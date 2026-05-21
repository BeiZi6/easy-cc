---
title: Spec 驱动开发
tags: [claude-code, 工作流, spec]
updated: 2026-05-21
---

# Spec 驱动开发

> 先写规格，再让 Claude 实现。比"边聊边写"靠谱十倍。

## 为什么要写 spec

三个理由，每个都很实在：

**LLM 越早收敛意图，跑偏概率越低。** Claude 不是你肚子里的蛔虫。你脑子里想的是"加个缓存层"，它理解的可能是"重写整个数据层"。一份 spec 把意图钉死，模型就没有发挥空间去跑偏。

**Spec 是共享合同。** 它不只是给 Claude 看的 — 也是给未来的你、给队友、给下一次会话看的。三天后你 `/clear` 回来，读一遍 spec 就能接上。

**改文档比改代码便宜。** 在 spec 阶段发现"这个接口设计有问题"，改几行 markdown 就行。等代码写完了再发现，你要改实现、改测试、可能还要改数据库。成本差一个数量级。

## 一个 spec 长什么样

最小可用的 spec 只需要三段：

```markdown
# Feature: 用户邀请系统

## 目标
- 已注册用户可以通过邮箱邀请新用户
- 邀请链接 7 天过期

## 非目标
- 不做批量邀请
- 不做邀请奖励机制

## 接口 / 行为
- POST /api/invitations { email: string }
  - 201: 邀请已发送
  - 409: 该邮箱已注册
  - 429: 每用户每天最多 10 次
- 邀请邮件包含一次性 token，点击后跳转注册页

## 验收清单
- [ ] 发送邀请后，数据库有对应记录
- [ ] 过期链接返回 410
- [ ] 频率限制生效
- [ ] 单元测试覆盖以上场景
```

关键原则：**验收清单尽量可机器验证**。"用户体验好"不是好的验收条件，"响应时间 < 200ms"才是。

## 工作流模板

推荐的目录结构：

```
specs/
├── user-invitation.md
├── payment-webhook.md
└── ...
```

标准流程四步走：

1. **让 Claude 读相关代码**，了解现有架构和约束
2. **让它起草 spec** — 提示词："读完这些代码后，帮我起草一份 spec，格式参考 specs/ 目录下的已有文件"
3. **你审 spec** — 这是你发挥判断力的地方。砍掉不需要的、补上遗漏的、纠正理解偏差
4. **审完再让它实现** — "按照 specs/user-invitation.md 实现，实现完后对着验收清单逐条自检"

> [!tip] 让 Claude 自检
> 实现完成后，明确要求它"对着 spec 的验收清单逐条检查，告诉我哪些通过了、哪些没通过"。这一步能抓住大量遗漏。

## 进阶：spec → tasks → code

对于更大的功能，在 spec 和代码之间再加一层 tasks：

```
specs/user-invitation.md    ← What：要做什么
tasks/user-invitation.md    ← How：怎么拆步骤
src/...                     ← Code：具体实现
```

Tasks 文件把 spec 拆成 ≤ 30 分钟粒度的小任务：

```markdown
# Tasks: 用户邀请系统

## Task 1: 数据库 migration
- 新建 invitations 表（id, inviter_id, email, token, expires_at, used_at）
- PR #1

## Task 2: 邀请 API 端点
- 实现 POST /api/invitations
- 包含频率限制中间件
- PR #2

## Task 3: 邮件发送
- 集成邮件服务，发送邀请链接
- PR #3

## Task 4: 注册页处理邀请 token
- 验证 token 有效性
- 注册成功后标记 token 已使用
- PR #4
```

一个 task 对应一个 PR（或一个 commit）。这样每次 Claude 只需要关注一小块，上下文干净，出错了也容易回滚。

> [!warning] 别让 spec 变成小说
> Spec 太长 Claude 也会走神。一个 spec 超过 200 行，就该考虑拆成多个子 spec 了。

## 相关
- [[../06-高阶篇/05-Context-Engineering]]
- [[02-TDD与Claude Code]]
