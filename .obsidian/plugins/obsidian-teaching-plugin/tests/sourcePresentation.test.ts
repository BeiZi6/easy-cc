import { describe, expect, it } from "vitest";

import {
  buildDisplayedSources,
  decorateCitationReferences,
} from "../src/sourcePresentation";
import type { ScoredChunk } from "../src/types";

const selectedChunks: ScoredChunk[] = [
  {
    score: 10,
    chunk: {
      id: "S1",
      path: "教材/信号与系统.md",
      headingPath: "第一章 > 1.1",
      content: "内容1",
      terms: ["一"],
    },
  },
  {
    score: 9,
    chunk: {
      id: "S2",
      path: "教材/信号与系统.md",
      headingPath: "第一章 > 1.2",
      content: "内容2",
      terms: ["二"],
    },
  },
  {
    score: 8,
    chunk: {
      id: "S3",
      path: "教材/信号与系统.md",
      headingPath: "第一章 > 1.3",
      content: "内容3",
      terms: ["三"],
    },
  },
  {
    score: 7,
    chunk: {
      id: "S4",
      path: "教材/信号与系统.md",
      headingPath: "第一章 > 1.4",
      content: "内容4",
      terms: ["四"],
    },
  },
  {
    score: 6,
    chunk: {
      id: "S5",
      path: "教材/信号与系统.md",
      headingPath: "第一章 > 1.5",
      content: "内容5",
      terms: ["五"],
    },
  },
  {
    score: 5,
    chunk: {
      id: "S6",
      path: "教材/信号与系统.md",
      headingPath: "第一章 > 1.6",
      content: "内容6",
      terms: ["六"],
    },
  },
];

describe("sourcePresentation", () => {
  it("keeps all selected sources without truncating by settings", () => {
    const sources = buildDisplayedSources(selectedChunks);

    expect(sources).toHaveLength(6);
    expect(sources[5]?.headingPath).toContain("1.6");
  });

  it("converts cited [Sx] references into clickable anchors", () => {
    const decorated = decorateCitationReferences("见 [S1] 和 [S6]，未命中 [S9]。", 6);

    expect(decorated).toContain("[S1](#teaching-assistant-source-1)");
    expect(decorated).toContain("[S6](#teaching-assistant-source-6)");
    expect(decorated).toContain("[S9]");
  });
});
