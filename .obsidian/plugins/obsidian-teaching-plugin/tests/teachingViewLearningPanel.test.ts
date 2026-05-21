import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

function readRepoFile(relativePath: string): string {
  return readFileSync(path.resolve(__dirname, "..", relativePath), "utf8");
}

describe("Teaching view learning panel", () => {
  it("exposes quiz and learning host APIs", () => {
    const teachingViewTs = readRepoFile("src/teachingView.ts");

    expect(teachingViewTs).toContain("startQuizFromLastExplanation(count?: number): Promise<QuizSession>;");
    expect(teachingViewTs).toContain("submitQuiz(submission: QuizSubmission): Promise<{ attempts: AttemptRecord[] }>;");
    expect(teachingViewTs).toContain("getTodayReviewQueue(): Promise<ReviewTask[]>;");
    expect(teachingViewTs).toContain("getLearningDashboard(): Promise<LearningDashboard>;");
  });

  it("renders learning loop sections and accessible status area", () => {
    const teachingViewTs = readRepoFile("src/teachingView.ts");

    expect(teachingViewTs).toContain('text: "开始训练"');
    expect(teachingViewTs).toContain('text: "提交答案"');
    expect(teachingViewTs).toContain('text: "今日待复习"');
    expect(teachingViewTs).toContain('text: "学习统计"');
    expect(teachingViewTs).toContain('this.quizStatusEl.setAttr("aria-live", "polite")');
  });

  it("adds dedicated styles for learning panel sections", () => {
    const stylesCss = readRepoFile("styles.css");

    expect(stylesCss).toContain(".teaching-assistant-learning-panel {");
    expect(stylesCss).toContain(".teaching-assistant-quiz-section,");
    expect(stylesCss).toContain(".teaching-assistant-review-section,");
    expect(stylesCss).toContain(".teaching-assistant-dashboard-section {");
  });
});
