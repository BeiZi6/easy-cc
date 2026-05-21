import { describe, expect, it } from "vitest";

import {
  retrieveChapterChunksWithFallback,
  retrieveRelevantChunksWithFallback,
} from "../src/retrievalFallback";
import type { TextChunk } from "../src/types";

const indexedChunks: TextChunk[] = [
  {
    id: "idx-1",
    path: "教材/公共课/线代.md",
    headingPath: "第一章 向量空间",
    content: "向量空间讨论线性组合、基与维度。",
    terms: ["向量", "空间", "线性", "组合", "维度"],
  },
];

const activeChunks: TextChunk[] = [
  {
    id: "act-1",
    path: "当前文档/信号与系统.md",
    headingPath: "第一章 信号与系统 > 1.2 线性时不变系统",
    content: "线性时不变系统满足叠加性和平移不变性。",
    terms: ["线性", "时不变", "叠加性", "平移", "系统"],
  },
  {
    id: "act-2",
    path: "当前文档/信号与系统.md",
    headingPath: "第一章 信号与系统 > 1.3 卷积",
    content: "卷积用于描述 LTI 系统输入输出关系。",
    terms: ["卷积", "LTI", "输入", "输出", "关系"],
  },
];

describe("retrievalFallback", () => {
  it("prefers active document when preferActive is true", () => {
    const result = retrieveRelevantChunksWithFallback(indexedChunks, activeChunks, "线性时不变系统", {
      maxResults: 2,
      preferActive: true,
    });

    expect(result.source).toBe("active");
    expect(result.chunks[0]?.chunk.id).toBe("act-1");
  });

  it("keeps textbook index priority when preferActive is false", () => {
    const result = retrieveRelevantChunksWithFallback(indexedChunks, activeChunks, "向量空间", {
      maxResults: 2,
      preferActive: false,
    });

    expect(result.source).toBe("index");
    expect(result.chunks[0]?.chunk.id).toBe("idx-1");
  });

  it("falls back to active document when index has no effective hit", () => {
    const result = retrieveRelevantChunksWithFallback(indexedChunks, activeChunks, "卷积", {
      maxResults: 2,
      preferActive: false,
    });

    expect(result.source).toBe("active");
    expect(result.chunks[0]?.chunk.id).toBe("act-2");
  });

  it("falls back to active document for chapter retrieval", () => {
    const result = retrieveChapterChunksWithFallback([], activeChunks, "1.2 线性时不变系统", {
      maxResults: 3,
      preferActive: true,
    });

    expect(result.source).toBe("active");
    expect(result.chunks).toHaveLength(1);
    expect(result.chunks[0]?.chunk.id).toBe("act-1");
  });
});
