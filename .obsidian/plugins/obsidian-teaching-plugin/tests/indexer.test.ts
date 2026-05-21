import { describe, expect, it } from "vitest";

import {
  extractStudyChapterFolder,
  extractTerms,
  isStudyChapterFolderName,
  splitMarkdownToChunks,
} from "../src/indexer";

describe("splitMarkdownToChunks", () => {
  it("splits markdown by heading path and paragraphs", () => {
    const markdown = `# 第一章 信号与系统
信号是信息的载体，常见表示包括连续时间信号与离散时间信号。

## 1.1 连续时间信号
连续时间信号定义在连续时间轴上。

离散化会把信号转换为可计算的样本序列。

## 1.2 线性时不变系统
线性时不变系统满足叠加性和平移不变性。`;

    const chunks = splitMarkdownToChunks(markdown, "教材/信号与系统.md");

    expect(chunks.length).toBeGreaterThanOrEqual(3);
    expect(chunks.some((chunk) => chunk.headingPath === "第一章 信号与系统 > 1.1 连续时间信号")).toBe(true);
    expect(chunks.some((chunk) => chunk.headingPath.endsWith("1.2 线性时不变系统"))).toBe(true);
  });
});

describe("extractTerms", () => {
  it("extracts both English and Chinese terms", () => {
    const terms = extractTerms("傅里叶变换 Fourier Transform 将时域映射到频域");

    expect(terms).toContain("fourier");
    expect(terms).toContain("transform");
    expect(terms.some((term) => term.includes("傅里"))).toBe(true);
  });
});

describe("study chapter folder detection", () => {
  it("recognizes standard study chapter folder names", () => {
    expect(isStudyChapterFolderName("00-overview")).toBe(true);
    expect(isStudyChapterFolderName("01-通信电子线路概述")).toBe(true);
    expect(isStudyChapterFolderName("cross-chapter")).toBe(false);
    expect(isStudyChapterFolderName("chapter-01")).toBe(false);
  });

  it("extracts chapter folder from study-vault paths", () => {
    expect(
      extractStudyChapterFolder(
        "通信电子线路-Study-Vault/03-高频小信号放大器/03-高频小信号放大器-核心概念.md",
        "通信电子线路-Study-Vault",
      ),
    ).toBe("03-高频小信号放大器");

    expect(
      extractStudyChapterFolder(
        "通信电子线路-Study-Vault/README.md",
        "通信电子线路-Study-Vault",
      ),
    ).toBeNull();
  });
});
