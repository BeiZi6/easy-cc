# Study Loop V2 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 在现有“讲解 + 来源引用”基础上，落地可长期使用的考研自学闭环：讲解后出题、即时判分、错题沉淀、间隔复习、掌握度反馈。

**Architecture:** 采用“主流程编排 + 领域模块解耦”方案。`main.ts` 只做流程 orchestration，新增 `quizEngine` / `quizGrader` / `reviewScheduler` / `learningStore` 承担核心领域逻辑。请求稳定性通过统一错误模型与请求策略收口，避免 UI 与业务强耦合。

**Tech Stack:** TypeScript, Obsidian Plugin API, `requestUrl`, Vitest, MarkdownRenderer, plugin `data.json` persistence + vault note export.

---

## 1) 产品范围与非目标

### 1.1 In Scope (M1)

- 讲解后自动/手动触发选择题+判断题训练。
- 即时判分与错因分类（概念/公式/条件）。
- 错题沉淀与“今日待复习”队列。
- 每日复习题量可自定义。
- 学习面板（今日完成、7日正确率、重复错题率、薄弱章节）。

### 1.2 Out of Scope (M1)

- 主观题自动判分。
- 多端云同步。
- 向量数据库与外部 RAG 基础设施。

---

## 2) 目标指标与验收标准

### 2.1 可靠性指标

- 讲解请求成功率 `>= 98%`
- 题目生成成功率 `>= 97%`
- 判分一致性（同输入多次）`>= 99%`
- 正常网络下 P95 总耗时 `< 8s`

### 2.2 学习效果指标

- 7 日正确率可见并可追踪。
- 重复错题率可观测。
- 每日复习完成率可观测。

### 2.3 发布门槛

- 无 P0/P1 缺陷。
- 键盘可完整操作主流程。
- 配置缺失、超时、429、5xx 有明确用户动作提示。

---

## 3) 数据模型（字段级）

在 `src/types.ts` 新增或扩展以下结构：

```ts
export type QuizType = "single_choice" | "true_false";

export type AppErrorCode =
  | "AUTH"
  | "TIMEOUT"
  | "RATE_LIMIT"
  | "PROVIDER"
  | "PARSE"
  | "EMPTY_RETRIEVAL"
  | "VALIDATION";

export interface QuizItem {
  id: string;
  type: QuizType;
  stem: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
  sourceIds: string[];
  knowledgeTags: string[];
  difficulty: 1 | 2 | 3;
}

export interface QuizSession {
  id: string;
  chapter?: string;
  question: string;
  items: QuizItem[];
  createdAt: number;
}

export interface QuizSubmission {
  quizSessionId: string;
  answers: Record<string, string>;
  submittedAt: number;
}

export interface AttemptRecord {
  questionId: string;
  correct: boolean;
  errorType?: "concept" | "formula" | "condition";
  chapter?: string;
  reviewedAt: number;
}

export interface ReviewTask {
  id: string;
  questionId: string;
  nextReviewAt: number;
  intervalDays: number;
  stability: number;
}

export interface LearningDashboard {
  todayTarget: number;
  todayDone: number;
  accuracy7d: number;
  repeatWrongRate: number;
  weakChapters: Array<{ chapter: string; score: number }>;
}
```

---

## 4) 设置项设计

在 `src/settings.ts` 与 `DEFAULT_SETTINGS` 增加：

- `dailyReviewTarget: number`（默认 20，限制 5-100）
- `quizQuestionCount: number`（默认 10，限制 5-20）
- `autoOpenQuizAfterExplain: boolean`（默认 true）
- `wrongNotebookFolder: string`（默认 `错题本`）
- `enableRetryOnTimeout: boolean`（默认 true）

设置页文案要求 sentence case；数值字段必须边界校验并持久化。

---

## 5) 模块拆分与接口契约

### 5.1 新增文件

- `src/quizEngine.ts`
- `src/quizGrader.ts`
- `src/reviewScheduler.ts`
- `src/learningStore.ts`
- `src/appError.ts`

### 5.2 现有文件修改

- `main.ts`
- `src/teachingView.ts`
- `src/llmClient.ts`
- `src/prompt.ts`
- `src/settings.ts`
- `src/types.ts`
- `styles.css`
- `README.md`

### 5.3 Host 接口扩展

在 `src/teachingView.ts` 的 `TeachingViewHost` 新增：

```ts
startQuizFromLastExplanation(count?: number): Promise<QuizSession>;
submitQuiz(submission: QuizSubmission): Promise<{ attempts: AttemptRecord[] }>;
getTodayReviewQueue(): Promise<ReviewTask[]>;
getLearningDashboard(): Promise<LearningDashboard>;
```

---

## 6) 错误模型与降级策略

### 6.1 错误分类

- `AUTH`: API key 缺失或鉴权失败。
- `TIMEOUT`: 请求超时。
- `RATE_LIMIT`: 429。
- `PROVIDER`: 5xx。
- `PARSE`: 返回结构不合法。
- `EMPTY_RETRIEVAL`: 无教材命中。

### 6.2 用户动作

- `AUTH` -> 打开设置页。
- `TIMEOUT` -> 降上下文重试，并提示提高 timeout。
- `RATE_LIMIT` -> 提示稍后重试。
- `PARSE/PROVIDER` -> 允许降级仅显示检索片段。

---

## 7) 任务分解（可执行，TDD 优先）

### Task 1: 扩展数据类型与设置项

**Files:**
- Modify: `src/types.ts`
- Modify: `src/settings.ts`
- Test: `tests/uiSentenceCase.test.ts`

**Step 1: 写失败测试**

- 在 `tests/uiSentenceCase.test.ts` 增加对新设置名称 sentence case 的断言。

**Step 2: 运行测试确认失败**

- Run: `npm test -- tests/uiSentenceCase.test.ts`
- Expected: FAIL（缺少新设置项）。

**Step 3: 实现最小改动**

- 扩展类型与默认设置，设置页新增对应 UI 和边界校验。

**Step 4: 再跑测试确认通过**

- Run: `npm test -- tests/uiSentenceCase.test.ts`
- Expected: PASS。

---

### Task 2: 实现统一错误模型与请求策略

**Files:**
- Create: `src/appError.ts`
- Modify: `src/llmClient.ts`
- Test: `tests/llmClient.test.ts`

**Step 1: 写失败测试**

- 增加超时/429/5xx/解析异常映射到统一错误码的测试。

**Step 2: 跑测试确认失败**

- Run: `npm test -- tests/llmClient.test.ts`
- Expected: FAIL。

**Step 3: 最小实现**

- 增加错误工厂函数与请求策略（重试、退避、错误映射）。

**Step 4: 回归**

- Run: `npm test -- tests/llmClient.test.ts`
- Expected: PASS。

---

### Task 3: 持久化学习数据与迁移

**Files:**
- Create: `src/learningStore.ts`
- Test: `tests/learningStore.test.ts`
- Test: `tests/learningStoreMigration.test.ts`

**Step 1: 写失败测试**

- 覆盖保存 quiz session、追加 attempt、拉取今日复习队列、旧 schema 迁移。

**Step 2: 运行失败测试**

- Run: `npm test -- tests/learningStore.test.ts tests/learningStoreMigration.test.ts`
- Expected: FAIL。

**Step 3: 最小实现**

- 实现持久化 API 与 schema version 迁移逻辑。

**Step 4: 运行通过**

- Run: `npm test -- tests/learningStore.test.ts tests/learningStoreMigration.test.ts`
- Expected: PASS。

---

### Task 4: 复习调度器

**Files:**
- Create: `src/reviewScheduler.ts`
- Test: `tests/reviewScheduler.test.ts`

**Step 1: 写失败测试**

- 覆盖 1/3/7 天计划、答对/答错后的 nextReviewAt 变化、每日目标截断。

**Step 2: 运行失败测试**

- Run: `npm test -- tests/reviewScheduler.test.ts`
- Expected: FAIL。

**Step 3: 实现最小逻辑**

- 完成 `plan/getToday/complete` 三个函数。

**Step 4: 测试通过**

- Run: `npm test -- tests/reviewScheduler.test.ts`
- Expected: PASS。

---

### Task 5: 题目生成引擎（选择 + 判断）

**Files:**
- Create: `src/quizEngine.ts`
- Modify: `src/prompt.ts`
- Modify: `src/llmClient.ts`
- Test: `tests/quizEngine.test.ts`

**Step 1: 写失败测试**

- 断言生成题数、题型合法、选项完整、答案属于选项、来源 ID 非空。

**Step 2: 运行失败测试**

- Run: `npm test -- tests/quizEngine.test.ts`
- Expected: FAIL。

**Step 3: 最小实现**

- 通过结构化输出约束题目格式，不合法时重试一次。

**Step 4: 回归通过**

- Run: `npm test -- tests/quizEngine.test.ts`
- Expected: PASS。

---

### Task 6: 判分与错因分类

**Files:**
- Create: `src/quizGrader.ts`
- Test: `tests/quizGrader.test.ts`

**Step 1: 写失败测试**

- 覆盖正确/错误判定、题目缺答、错因分类。

**Step 2: 运行失败测试**

- Run: `npm test -- tests/quizGrader.test.ts`
- Expected: FAIL。

**Step 3: 最小实现**

- 实现纯函数判分与分类。

**Step 4: 测试通过**

- Run: `npm test -- tests/quizGrader.test.ts`
- Expected: PASS。

---

### Task 7: 主流程接线（main.ts）

**Files:**
- Modify: `main.ts`
- Modify: `src/types.ts`
- Modify: `src/teachingView.ts` (host 接口声明)
- Test: `tests/workflow.test.ts` (new)

**Step 1: 写失败测试**

- 覆盖“讲解 -> 出题 -> 提交 -> 入复习队列”主链路。

**Step 2: 运行失败测试**

- Run: `npm test -- tests/workflow.test.ts`
- Expected: FAIL。

**Step 3: 最小实现**

- 在插件类注入并编排 quiz/grader/scheduler/store。

**Step 4: 回归测试**

- Run: `npm test -- tests/workflow.test.ts`
- Expected: PASS。

---

### Task 8: 侧边栏 UI 与可访问性

**Files:**
- Modify: `src/teachingView.ts`
- Modify: `styles.css`

**Step 1: 实现 UI 区块**

- 增加“开始训练”“提交答案”“今日待复习”“学习统计”。

**Step 2: 可访问性检查**

- 所有按钮可键盘触发；状态区 `aria-live` 有更新提示；焦点样式可见。

**Step 3: 手工验证**

- 在 Obsidian 内验证主流程与异常提示。

---

### Task 9: 文档与发布准备

**Files:**
- Modify: `README.md`
- Modify: `manifest.json` (version bump if releasing)
- Modify: `versions.json` (if releasing)

**Step 1: 更新 README**

- 写明学习闭环能力、设置项含义、常见错误处理。

**Step 2: 全量回归**

- Run: `npm test`
- Run: `npm run build`
- Run: `npx tsc --noEmit`
- Expected: 全部通过。

---

## 8) 回滚与降级

- 新增功能开关：
  - `enableQuizFlow`
  - `enableReviewScheduler`
- 任一异常可降级为“仅讲解 + 来源引用”。
- 迁移前自动快照；迁移失败自动恢复快照并提示用户。

---

## 9) 两周排期建议

- Week 1: Task 1-6（底座与核心链路）
- Week 2: Task 7-9（接线、UI、发布）

---

## 10) 实施前检查（DoR）

- [ ] settings 默认值与边界已确认。
- [ ] 错误码与用户提示文案已确认。
- [ ] 选择/判断题格式与数量策略已确认。
- [ ] 复习算法（1/3/7）已确认。

## 11) 完成定义（DoD）

- [ ] 所有新增测试通过。
- [ ] `npm run build` 与 `npx tsc --noEmit` 通过。
- [ ] 主流程手工验证通过。
- [ ] README 更新完成。
- [ ] 未引入回归错误。

---

Plan complete and saved to `docs/plans/2026-02-08-study-loop-v2-design.md`.

Two execution options:

1. Subagent-driven (this session): 我逐任务实现并在任务间做代码审查。
2. Parallel session (separate): 你开新会话按 `superpowers:executing-plans` 执行。
