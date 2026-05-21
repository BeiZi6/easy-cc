import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

function readRepoFile(relativePath: string): string {
  return readFileSync(path.resolve(__dirname, "..", relativePath), "utf8");
}

describe("UI sentence case text", () => {
  it("uses sentence case for command names", () => {
    const mainTs = readRepoFile("main.ts");

    expect(mainTs).not.toContain('name: "Open Teaching Assistant Sidebar"');
    expect(mainTs).not.toContain('name: "Rebuild Textbook Index"');
    expect(mainTs).toContain('name: "Open teaching assistant sidebar"');
    expect(mainTs).toContain('name: "Rebuild textbook index"');
  });

  it("uses sentence case for settings labels", () => {
    const settingsTs = readRepoFile("src/settings.ts");

    expect(settingsTs).not.toContain('.setName("API Base URL")');
    expect(settingsTs).not.toContain('.setName("API Key")');
    expect(settingsTs).not.toContain('.setName("Textbook Folder")');
    expect(settingsTs).not.toContain('.setName("Max Context Characters")');
    expect(settingsTs).not.toContain('.setName("Request Timeout (ms)")');
    expect(settingsTs).not.toContain('.setName("Max Source Chunks")');
    expect(settingsTs).not.toContain('.setName("Daily Review Target")');
    expect(settingsTs).not.toContain('.setName("Quiz Question Count")');
    expect(settingsTs).not.toContain('.setName("Auto Open Quiz After Explanation")');
    expect(settingsTs).not.toContain('.setName("Wrong Notebook Folder")');
    expect(settingsTs).not.toContain('.setName("Enable Retry On Timeout")');

    expect(settingsTs).toContain('.setName("API base URL")');
    expect(settingsTs).toContain('.setName("API key")');
    expect(settingsTs).toContain('.setName("Textbook folder")');
    expect(settingsTs).toContain('.setName("Max context characters")');
    expect(settingsTs).toContain('.setName("Request timeout (ms)")');
    expect(settingsTs).toContain('.setName("Max source chunks")');
    expect(settingsTs).toContain('.setName("Daily review target")');
    expect(settingsTs).toContain('.setName("Quiz question count")');
    expect(settingsTs).toContain('.setName("Auto open quiz after explanation")');
    expect(settingsTs).toContain('.setName("Wrong notebook folder")');
    expect(settingsTs).toContain('.setName("Enable retry on timeout")');
  });

  it("uses sentence case in remaining user-facing English strings", () => {
    const mainTs = readRepoFile("main.ts");
    const teachingViewTs = readRepoFile("src/teachingView.ts");
    const llmClientTs = readRepoFile("src/llmClient.ts");

    expect(teachingViewTs).not.toContain('return "Teaching Assistant"');
    expect(teachingViewTs).toContain('return "Teaching assistant"');

    expect(mainTs).not.toContain("Teaching Assistant");
    expect(mainTs).toContain("Teaching assistant");

    expect(llmClientTs).not.toContain("Please set API Key in plugin settings.");
    expect(llmClientTs).toContain("Please set API key in plugin settings.");
  });

  it("uses sentence case for plugin display name in manifest", () => {
    const manifest = JSON.parse(readRepoFile("manifest.json")) as {
      name: string;
    };

    expect(manifest.name).toBe("Teaching assistant");
  });

  it("declares quiz and learning loop data types", () => {
    const typesTs = readRepoFile("src/types.ts");

    expect(typesTs).toContain('export type QuizType = "single_choice" | "true_false";');
    expect(typesTs).toContain("export type AppErrorCode =");
    expect(typesTs).toContain("export interface QuizItem {");
    expect(typesTs).toContain("export interface QuizSession {");
    expect(typesTs).toContain("export interface QuizSubmission {");
    expect(typesTs).toContain("export interface AttemptRecord {");
    expect(typesTs).toContain("export interface ReviewTask {");
    expect(typesTs).toContain("export interface LearningDashboard {");
  });
});
