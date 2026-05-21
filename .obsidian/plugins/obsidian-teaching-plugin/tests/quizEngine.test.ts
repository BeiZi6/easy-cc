import { describe, expect, it, vi } from "vitest";

import { QuizEngine } from "../src/quizEngine";
import type { ScoredChunk } from "../src/types";

const chunks: ScoredChunk[] = [
  {
    score: 9,
    chunk: {
      id: "S1",
      path: "教材/信号与系统.md",
      headingPath: "第一章 > 基本概念",
      content: "线性时不变系统满足叠加性和平移不变性。",
      terms: ["线性", "时不变"],
    },
  },
];

describe("QuizEngine", () => {
  it("generates required number of valid quiz items", async () => {
    const client = {
      generateQuizDraft: vi.fn().mockResolvedValue(
        JSON.stringify({
          items: [
            {
              type: "single_choice",
              stem: "线性时不变系统满足什么性质？",
              options: ["叠加性", "混沌性", "发散性", "随机性"],
              correctAnswer: "叠加性",
              explanation: "定义要求叠加性和平移不变性。",
              sourceIds: ["S1"],
              knowledgeTags: ["LTI"],
              difficulty: 1,
            },
            {
              type: "true_false",
              stem: "LTI 系统满足平移不变性。",
              options: ["True", "False"],
              correctAnswer: "True",
              explanation: "这是 LTI 的定义之一。",
              sourceIds: ["S1"],
              knowledgeTags: ["LTI"],
              difficulty: 1,
            },
          ],
        }),
      ),
    };

    const engine = new QuizEngine(client, () => 1700000000000, () => "session-1");
    const session = await engine.createQuizSession("请讲解 LTI", chunks, 2, "第一章");

    expect(session.items).toHaveLength(2);
    expect(session.items.every((item) => ["single_choice", "true_false"].includes(item.type))).toBe(true);
    expect(session.items.every((item) => item.options.length >= 2)).toBe(true);
    expect(session.items.every((item) => item.options.includes(item.correctAnswer))).toBe(true);
    expect(session.items.every((item) => item.sourceIds.length > 0)).toBe(true);
  });

  it("retries once when first model output is invalid", async () => {
    const client = {
      generateQuizDraft: vi
        .fn()
        .mockResolvedValueOnce(
          JSON.stringify({
            items: [
              {
                type: "single_choice",
                stem: "坏题目",
                options: ["A", "B", "C", "D"],
                correctAnswer: "Z",
                explanation: "答案不在选项里",
                sourceIds: ["S1"],
                knowledgeTags: ["bad"],
                difficulty: 2,
              },
            ],
          }),
        )
        .mockResolvedValueOnce(
          JSON.stringify({
            items: [
              {
                type: "single_choice",
                stem: "好题目",
                options: ["A", "B", "C", "D"],
                correctAnswer: "A",
                explanation: "有效题目",
                sourceIds: ["S1"],
                knowledgeTags: ["good"],
                difficulty: 2,
              },
            ],
          }),
        ),
    };

    const engine = new QuizEngine(client, () => 1700000000000, () => "session-2");
    const session = await engine.createQuizSession("请讲解 LTI", chunks, 1);

    expect(session.items).toHaveLength(1);
    expect(client.generateQuizDraft).toHaveBeenCalledTimes(2);
  });
});
