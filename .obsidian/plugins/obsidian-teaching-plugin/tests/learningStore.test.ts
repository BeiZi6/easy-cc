import { describe, expect, it } from "vitest";

import { LearningStore, type LearningStoreStorage } from "../src/learningStore";
import type { AttemptRecord, QuizSession, ReviewTask } from "../src/types";

class MemoryStorage implements LearningStoreStorage {
  value: unknown = null;

  async load(): Promise<unknown> {
    return this.value;
  }

  async save(data: unknown): Promise<void> {
    this.value = data;
  }
}

function createSession(id: string): QuizSession {
  return {
    id,
    chapter: "第一章",
    question: "什么是线性时不变系统",
    createdAt: Date.UTC(2026, 1, 8, 10, 0, 0),
    items: [
      {
        id: `${id}-q1`,
        type: "single_choice",
        stem: "下列哪项属于线性时不变系统性质？",
        options: ["叠加性", "非线性", "时变性", "离散采样"],
        correctAnswer: "叠加性",
        explanation: "线性时不变系统满足叠加性和平移不变性。",
        sourceIds: ["S1"],
        knowledgeTags: ["LTI"],
        difficulty: 1,
      },
    ],
  };
}

describe("LearningStore", () => {
  it("persists quiz sessions and attempts", async () => {
    const storage = new MemoryStorage();
    const store = new LearningStore(storage);
    await store.initialize();

    const session = createSession("session-1");
    const attempts: AttemptRecord[] = [
      {
        questionId: "session-1-q1",
        correct: false,
        errorType: "concept",
        chapter: "第一章",
        reviewedAt: Date.UTC(2026, 1, 8, 10, 5, 0),
      },
    ];

    await store.saveQuizSession(session);
    await store.appendAttempts(attempts);

    const reloaded = new LearningStore(storage);
    await reloaded.initialize();

    expect(reloaded.getQuizSession("session-1")).toEqual(session);
    expect(reloaded.listAttempts()).toEqual(attempts);
  });

  it("returns review tasks due today ordered by review time", async () => {
    const storage = new MemoryStorage();
    const store = new LearningStore(storage);
    await store.initialize();

    const now = Date.UTC(2026, 1, 8, 9, 0, 0);
    const tasks: ReviewTask[] = [
      {
        id: "task-late",
        questionId: "q-late",
        nextReviewAt: Date.UTC(2026, 1, 8, 23, 30, 0),
        intervalDays: 1,
        stability: 0.5,
      },
      {
        id: "task-soon",
        questionId: "q-soon",
        nextReviewAt: Date.UTC(2026, 1, 8, 12, 0, 0),
        intervalDays: 1,
        stability: 0.3,
      },
      {
        id: "task-tomorrow",
        questionId: "q-tomorrow",
        nextReviewAt: Date.UTC(2026, 1, 9, 10, 0, 0),
        intervalDays: 3,
        stability: 0.8,
      },
    ];

    await store.replaceReviewTasks(tasks);

    const queue = await store.getTodayReviewQueue(now, 10);
    expect(queue.map((task) => task.id)).toEqual(["task-soon", "task-late"]);
  });
});
