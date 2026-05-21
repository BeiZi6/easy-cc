import { describe, expect, it } from "vitest";

import {
  completeReviewTask,
  getTodayReviewTasks,
  planReviewTasks,
} from "../src/reviewScheduler";
import type { AttemptRecord, ReviewTask } from "../src/types";

describe("reviewScheduler", () => {
  it("plans review tasks from incorrect attempts with a 1-day interval", () => {
    const attempts: AttemptRecord[] = [
      {
        questionId: "q1",
        correct: false,
        errorType: "concept",
        chapter: "第一章",
        reviewedAt: Date.UTC(2026, 1, 8, 8, 0, 0),
      },
      {
        questionId: "q1",
        correct: false,
        errorType: "formula",
        chapter: "第一章",
        reviewedAt: Date.UTC(2026, 1, 8, 10, 0, 0),
      },
      {
        questionId: "q2",
        correct: true,
        chapter: "第二章",
        reviewedAt: Date.UTC(2026, 1, 8, 10, 5, 0),
      },
    ];

    const tasks = planReviewTasks(attempts, [], Date.UTC(2026, 1, 8, 12, 0, 0));
    expect(tasks).toHaveLength(1);
    expect(tasks[0]?.questionId).toBe("q1");
    expect(tasks[0]?.intervalDays).toBe(1);
  });

  it("applies 1/3/7 spacing rules on completion", () => {
    const baseTask: ReviewTask = {
      id: "task-1",
      questionId: "q1",
      nextReviewAt: Date.UTC(2026, 1, 8, 9, 0, 0),
      intervalDays: 1,
      stability: 0.3,
    };

    const correct1 = completeReviewTask(baseTask, true, Date.UTC(2026, 1, 8, 9, 0, 0));
    expect(correct1.intervalDays).toBe(3);

    const correct2 = completeReviewTask(correct1, true, Date.UTC(2026, 1, 11, 9, 0, 0));
    expect(correct2.intervalDays).toBe(7);

    const wrong = completeReviewTask(correct2, false, Date.UTC(2026, 1, 18, 9, 0, 0));
    expect(wrong.intervalDays).toBe(1);
  });

  it("returns due tasks capped by daily target", () => {
    const now = Date.UTC(2026, 1, 8, 9, 0, 0);
    const tasks: ReviewTask[] = [
      {
        id: "t1",
        questionId: "q1",
        nextReviewAt: Date.UTC(2026, 1, 8, 8, 0, 0),
        intervalDays: 1,
        stability: 0.2,
      },
      {
        id: "t2",
        questionId: "q2",
        nextReviewAt: Date.UTC(2026, 1, 8, 8, 30, 0),
        intervalDays: 1,
        stability: 0.4,
      },
      {
        id: "t3",
        questionId: "q3",
        nextReviewAt: Date.UTC(2026, 1, 9, 8, 0, 0),
        intervalDays: 3,
        stability: 0.7,
      },
    ];

    const today = getTodayReviewTasks(tasks, now, 1);
    expect(today).toHaveLength(1);
    expect(today[0]?.id).toBe("t1");
  });
});
