import { describe, expect, it } from "vitest";

import { extractTerms } from "../src/indexer";
import { retrieveChapterChunks, retrieveRelevantChunks } from "../src/retriever";
import type { TextChunk } from "../src/types";

const chunks: TextChunk[] = [
  {
    id: "a",
    path: "教材/信号与系统.md",
    headingPath: "第一章 信号与系统 > 1.2 线性时不变系统",
    content: "线性时不变系统满足叠加性和平移不变性，卷积可以刻画其输入输出关系。",
    terms: extractTerms("线性时不变系统 叠加性 平移不变性 卷积 输入输出"),
  },
  {
    id: "b",
    path: "教材/高等数学.md",
    headingPath: "第二章 微积分 > 2.1 导数",
    content: "导数描述函数在某一点附近的变化率，是微分学的核心概念。",
    terms: extractTerms("导数 变化率 微分学"),
  },
  {
    id: "c",
    path: "教材/高等数学.md",
    headingPath: "第二章 微积分 > 2.2 积分",
    content: "定积分可理解为连续求和，和面积计算密切相关。",
    terms: extractTerms("定积分 连续求和 面积"),
  },
];

const studyVaultChunks: TextChunk[] = [
  {
    id: "sv-a",
    path: "通信电子线路-Study-Vault/03-高频小信号放大器/03-高频小信号放大器-核心概念.md",
    headingPath: "核心概念 > 小信号增益",
    content: "小信号放大器关注增益、带宽与稳定性。",
    terms: extractTerms("小信号 放大器 增益 带宽 稳定性"),
  },
  {
    id: "sv-b",
    path: "通信电子线路-Study-Vault/04-高频功率放大电路/04-高频功率放大电路-核心概念.md",
    headingPath: "核心概念 > 功率效率",
    content: "功率放大器关注效率、输出功率与线性度。",
    terms: extractTerms("功率 放大器 效率 输出功率 线性度"),
  },
  {
    id: "sv-c",
    path: "通信电子线路-Study-Vault/03-高频小信号放大器/03-高频小信号放大器-习题.md",
    headingPath: "习题 > 例题",
    content: "例题通常围绕小信号增益与输入输出阻抗展开。",
    terms: extractTerms("例题 小信号 增益 输入 输出 阻抗"),
  },
];

describe("retrieveRelevantChunks", () => {
  it("ranks chunks by query relevance", () => {
    const results = retrieveRelevantChunks(chunks, "什么是线性时不变系统", {
      maxResults: 2,
    });

    expect(results.length).toBe(2);
    expect(results[0]?.chunk.id).toBe("a");
    expect(results[0]?.score).toBeGreaterThan(results[1]?.score ?? 0);
  });

  it("boosts results under selected chapter", () => {
    const results = retrieveRelevantChunks(chunks, "积分是什么", {
      chapter: "第二章 微积分",
      maxResults: 2,
    });

    expect(results[0]?.chunk.id).toBe("c");
  });

  it("returns chapter-focused chunks for teacher mode", () => {
    const results = retrieveChapterChunks(chunks, "第二章 微积分", {
      maxResults: 3,
    });

    expect(results.length).toBe(2);
    expect(results.every((item) => item.chunk.headingPath.includes("第二章 微积分"))).toBe(true);
    expect(results[0]?.chunk.id).toBe("b");
  });

  it("scopes query retrieval to selected study chapter folder", () => {
    const results = retrieveRelevantChunks(studyVaultChunks, "放大器 增益 效率", {
      chapter: "03-高频小信号放大器",
      rootFolder: "通信电子线路-Study-Vault",
      maxResults: 5,
    });

    expect(results.length).toBeGreaterThan(0);
    expect(results.every((item) => item.chunk.path.includes("/03-高频小信号放大器/"))).toBe(true);
    expect(results.some((item) => item.chunk.id === "sv-b")).toBe(false);
  });

  it("retrieves teacher-mode chunks from selected study chapter folder", () => {
    const results = retrieveChapterChunks(studyVaultChunks, "03-高频小信号放大器", {
      rootFolder: "通信电子线路-Study-Vault",
      maxResults: 5,
    });

    expect(results.length).toBe(2);
    expect(results.every((item) => item.chunk.path.includes("/03-高频小信号放大器/"))).toBe(true);
  });
});
