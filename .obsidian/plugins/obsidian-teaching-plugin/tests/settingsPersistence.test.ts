import { describe, expect, it } from "vitest";

import { shouldRebuildIndex } from "../src/settingsPersistence";

describe("shouldRebuildIndex", () => {
  it("returns false when folder path stays the same after normalization", () => {
    expect(shouldRebuildIndex("教材", "教材")).toBe(false);
    expect(shouldRebuildIndex("教材", "教材/")).toBe(false);
    expect(shouldRebuildIndex("/教材//", "教材")).toBe(false);
  });

  it("returns true when folder path actually changes", () => {
    expect(shouldRebuildIndex("教材", "教材/信号与系统")).toBe(true);
    expect(shouldRebuildIndex("", "教材")).toBe(true);
  });
});
