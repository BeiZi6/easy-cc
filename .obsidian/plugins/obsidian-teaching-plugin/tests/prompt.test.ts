import { describe, expect, it } from "vitest";

import { buildTeacherLectureMessages, buildTeachingMessages } from "../src/prompt";
import type { ScoredChunk } from "../src/types";

describe("buildTeachingMessages", () => {
  it("includes numbered source snippets and question", () => {
    const chunks: ScoredChunk[] = [
      {
        score: 10,
        chunk: {
          id: "1",
          path: "教材/信号.md",
          headingPath: "第一章 > 信号",
          content: "信号是信息的载体。",
          terms: [],
        },
      },
    ];

    const messages = buildTeachingMessages("什么是信号？", chunks, 500);

    expect(messages.system).toContain("教学助手");
    expect(messages.user).toContain("什么是信号");
    expect(messages.user).toContain("[S1]");
    expect(messages.user).toContain("教材/信号.md");
  });

  it("builds teacher lecture prompt by selected chapter", () => {
    const chunks: ScoredChunk[] = [
      {
        score: 9,
        chunk: {
          id: "1",
          path: "教材/信号.md",
          headingPath: "第一章 > 信号",
          content: "信号可以是连续时间或离散时间表示。",
          terms: [],
        },
      },
    ];

    const messages = buildTeacherLectureMessages("第一章", chunks, 400);

    expect(messages.system).toContain("老师");
    expect(messages.system).toContain("板书要点卡片");
    expect(messages.user).toContain("授课章节：第一章");
    expect(messages.user).toContain("[S1]");
  });
});
