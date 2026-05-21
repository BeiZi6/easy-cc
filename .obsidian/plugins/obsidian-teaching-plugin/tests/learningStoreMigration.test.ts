import { describe, expect, it } from "vitest";

import { LearningStore, type LearningStoreStorage } from "../src/learningStore";
import type { ReviewTask } from "../src/types";

class LegacyStorage implements LearningStoreStorage {
  value: unknown;

  saveCount = 0;

  constructor(initialValue: unknown) {
    this.value = initialValue;
  }

  async load(): Promise<unknown> {
    return this.value;
  }

  async save(data: unknown): Promise<void> {
    this.value = data;
    this.saveCount += 1;
  }
}

describe("LearningStore migration", () => {
  it("migrates legacy reviewQueue schema to reviewTasks", async () => {
    const legacyReviewQueue: ReviewTask[] = [
      {
        id: "legacy-1",
        questionId: "q1",
        nextReviewAt: Date.UTC(2026, 1, 8, 9, 0, 0),
        intervalDays: 1,
        stability: 0.4,
      },
    ];

    const storage = new LegacyStorage({
      schemaVersion: 0,
      quizSessions: [],
      attempts: [],
      reviewQueue: legacyReviewQueue,
    });

    const store = new LearningStore(storage);
    await store.initialize();

    const snapshot = store.getSnapshot();
    expect(snapshot.schemaVersion).toBe(1);
    expect(snapshot.reviewTasks).toEqual(legacyReviewQueue);
    expect(storage.saveCount).toBe(1);
  });

  it("normalizes array-based quiz sessions into id map", async () => {
    const storage = new LegacyStorage({
      schemaVersion: 0,
      quizSessions: [
        {
          id: "s1",
          chapter: "第二章",
          question: "什么是卷积",
          createdAt: Date.UTC(2026, 1, 8, 9, 0, 0),
          items: [],
        },
      ],
      attempts: [],
      reviewTasks: [],
    });

    const store = new LearningStore(storage);
    await store.initialize();

    expect(store.getQuizSession("s1")?.chapter).toBe("第二章");
    expect(storage.saveCount).toBe(1);
  });
});
