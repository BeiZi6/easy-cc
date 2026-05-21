import { describe, expect, it } from "vitest";

import { gradeQuizSubmission } from "../src/quizGrader";
import type { QuizSession, QuizSubmission } from "../src/types";

const session: QuizSession = {
  id: "session-1",
  chapter: "第一章",
  question: "LTI 基础",
  createdAt: Date.UTC(2026, 1, 8, 9, 0, 0),
  items: [
    {
      id: "q1",
      type: "single_choice",
      stem: "LTI 系统满足什么性质？",
      options: ["叠加性", "发散性", "随机性", "混沌性"],
      correctAnswer: "叠加性",
      explanation: "概念题",
      sourceIds: ["S1"],
      knowledgeTags: ["concept"],
      difficulty: 1,
    },
    {
      id: "q2",
      type: "single_choice",
      stem: "根据卷积公式，离散卷积如何定义？",
      options: ["A", "B", "C", "D"],
      correctAnswer: "A",
      explanation: "公式题",
      sourceIds: ["S1"],
      knowledgeTags: ["formula"],
      difficulty: 2,
    },
    {
      id: "q3",
      type: "true_false",
      stem: "在什么条件下系统可判定为时不变？",
      options: ["True", "False"],
      correctAnswer: "True",
      explanation: "条件题",
      sourceIds: ["S1"],
      knowledgeTags: ["condition"],
      difficulty: 2,
    },
  ],
};

describe("quizGrader", () => {
  it("grades correct and incorrect answers into attempts", () => {
    const submission: QuizSubmission = {
      quizSessionId: "session-1",
      submittedAt: Date.UTC(2026, 1, 8, 9, 5, 0),
      answers: {
        q1: "叠加性",
        q2: "D",
      },
    };

    const result = gradeQuizSubmission(session, submission);

    expect(result.summary.total).toBe(3);
    expect(result.summary.correct).toBe(1);
    expect(result.attempts).toHaveLength(3);

    const q1 = result.attempts.find((attempt) => attempt.questionId === "q1");
    const q2 = result.attempts.find((attempt) => attempt.questionId === "q2");
    const q3 = result.attempts.find((attempt) => attempt.questionId === "q3");

    expect(q1?.correct).toBe(true);
    expect(q2?.correct).toBe(false);
    expect(q2?.errorType).toBe("formula");
    expect(q3?.correct).toBe(false);
  });

  it("classifies missing answers by question wording", () => {
    const submission: QuizSubmission = {
      quizSessionId: "session-1",
      submittedAt: Date.UTC(2026, 1, 8, 9, 10, 0),
      answers: {},
    };

    const result = gradeQuizSubmission(session, submission);
    const q3 = result.attempts.find((attempt) => attempt.questionId === "q3");

    expect(q3?.correct).toBe(false);
    expect(q3?.errorType).toBe("condition");
  });
});
