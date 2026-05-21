import { describe, expect, it, vi } from "vitest";

import { LearningStore, type LearningStoreStorage } from "../src/learningStore";
import { QuizEngine } from "../src/quizEngine";
import { StudyLoopWorkflow } from "../src/workflow";
import type { QuizSubmission, ScoredChunk } from "../src/types";

class MemoryStorage implements LearningStoreStorage {
  value: unknown = null;

  async load(): Promise<unknown> {
    return this.value;
  }

  async save(data: unknown): Promise<void> {
    this.value = data;
  }
}

const chunks: ScoredChunk[] = [
  {
    score: 8,
    chunk: {
      id: "S1",
      path: "教材/信号与系统.md",
      headingPath: "第一章 > 基本概念",
      content: "线性时不变系统满足叠加性和平移不变性。",
      terms: ["线性", "时不变"],
    },
  },
];

describe("StudyLoopWorkflow", () => {
  it("completes explain -> quiz -> submit -> review queue flow", async () => {
    const storage = new MemoryStorage();
    const store = new LearningStore(storage);
    await store.initialize();

    const quizClient = {
      generateQuizDraft: vi.fn().mockResolvedValue(
        JSON.stringify({
          items: [
            {
              id: "q1",
              type: "single_choice",
              stem: "LTI 系统满足什么性质？",
              options: ["叠加性", "随机性", "混沌性", "发散性"],
              correctAnswer: "叠加性",
              explanation: "概念题",
              sourceIds: ["S1"],
              knowledgeTags: ["concept"],
              difficulty: 1,
            },
          ],
        }),
      ),
    };

    const now = Date.UTC(2026, 1, 8, 9, 0, 0);
    const workflow = new StudyLoopWorkflow(
      store,
      () => new QuizEngine(quizClient, () => now, () => "session-1"),
      () => now,
    );

    workflow.setExplanationSeed({
      question: "请讲解 LTI",
      chapter: "第一章",
      chunks,
    });

    const session = await workflow.startQuizFromLastExplanation(1);

    const submission: QuizSubmission = {
      quizSessionId: session.id,
      submittedAt: Date.UTC(2026, 1, 8, 9, 10, 0),
      answers: {
        q1: "随机性",
      },
    };

    const graded = await workflow.submitQuiz(submission);
    const queue = await workflow.getTodayReviewQueue(20, Date.UTC(2026, 1, 9, 20, 0, 0));
    const dashboard = workflow.getLearningDashboard(20, Date.UTC(2026, 1, 8, 20, 0, 0));

    expect(graded.attempts).toHaveLength(1);
    expect(graded.attempts[0]?.correct).toBe(false);
    expect(queue).toHaveLength(1);
    expect(queue[0]?.questionId).toBe("q1");
    expect(dashboard.todayDone).toBe(1);
    expect(dashboard.todayTarget).toBe(20);
    expect(dashboard.weakChapters[0]?.chapter).toBe("第一章");
  });
});
