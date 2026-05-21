# Codex CLI Adapter Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the bundled Claude Code runtime path with a Codex CLI-backed adapter while keeping the existing Obsidian chat UI usable.

**Architecture:** Keep the current chat/state/UI layers intact and swap the low-level `u_()` runtime entry to a Codex-backed query wrapper. Avoid native SDK session persistence for new sessions and fall back to plugin-managed JSONL storage so conversation history still survives reloads.

**Tech Stack:** Obsidian plugin bundle, Node.js child processes, Codex CLI JSON mode, legacy JSONL conversation storage.

### Task 1: Capture current constraints

**Files:**
- Modify: `task_plan.md`
- Modify: `findings.md`
- Modify: `progress.md`

**Step 1: Record bundle and protocol constraints**

Document:
- This directory is a compiled plugin bundle.
- `u_()` is the main Claude SDK entry point.
- `codex exec --json` exists locally.
- Full end-to-end execution cannot be verified in this sandbox because network is blocked.

**Step 2: Record acceptable first-pass scope**

Document:
- Basic chat
- New conversation
- Resume by session/thread id
- Plugin-managed conversation persistence
- No 1:1 guarantee for Claude-native rewind / MCP / permission semantics

### Task 2: Replace runtime adapter

**Files:**
- Modify: `main.js`

**Step 1: Add a Codex query wrapper**

Implement a lightweight wrapper that:
- Spawns `codex exec --json` for one-shot requests
- Spawns `codex exec resume --json` when a session id exists
- Converts Codex JSON events into the SDK-like message shapes already consumed by the UI
- Exposes the minimal methods used by the rest of the plugin:
  - `interrupt`
  - `supportedCommands`
  - `setPermissionMode`
  - `setModel`
  - `setMaxThinkingTokens`
  - `setMcpServers`
  - `rewindFiles` (unsupported)

**Step 2: Gate `u_()` by executable name**

If the resolved executable basename is `codex` / `codex.js` / platform variants:
- return the Codex wrapper

Otherwise:
- preserve the original Claude SDK path

### Task 3: Switch CLI discovery

**Files:**
- Modify: `main.js`

**Step 1: Prefer Codex binaries in auto-detection**

Update CLI resolution to look for:
- `codex`
- `codex.cmd`
- `codex.exe`
- global npm package path for `@openai/codex/bin/codex.js`

**Step 2: Update critical runtime error copy**

Replace the most visible error strings so failures mention:
- `Codex CLI`

### Task 4: Keep conversation persistence working

**Files:**
- Modify: `main.js`

**Step 1: Stop promoting new sessions to native SDK storage**

For new Codex-backed conversations:
- create as legacy JSONL-backed conversations
- do not auto-promote to native SDK session storage on first session id

**Step 2: Save conversation content through plugin storage**

Ensure new sessions still save:
- messages
- session id
- timestamps

### Task 5: Verify statically

**Files:**
- Modify: `progress.md`

**Step 1: Run syntax validation**

Run:

```bash
node --check main.js
```

Expected:
- No syntax errors

**Step 2: Record residual risks**

Document:
- Codex event protocol was inferred from local CLI outputs and binary strings
- network-blocked sandbox prevented live successful turn execution
- fine-grained rewind / point-in-time fork is still degraded vs Claude SDK
