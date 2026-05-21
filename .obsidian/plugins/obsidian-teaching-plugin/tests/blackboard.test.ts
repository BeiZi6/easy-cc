import { describe, expect, it } from "vitest";

import {
  buildBlackboardNoteContent,
  buildBlackboardNoteFileName,
  parseBlackboardCards,
  resolveUniqueNotePath,
} from "../src/blackboard";

describe("parseBlackboardCards", () => {
  it("extracts board-style cards from lecture markdown", () => {
    const lecture = [
      "## 本节学习目标",
      "理解线性时不变系统。",
      "",
      "## 板书要点卡片",
      "### 卡片1：线性时不变系统",
      "- 定义：满足叠加性和平移不变性。",
      "- 核心：输入输出可由冲激响应确定。",
      "",
      "### 卡片2：卷积",
      "- 意义：刻画系统输出与输入的关系。",
      "- 形式：y(t)=x(t)*h(t)。",
    ].join("\n");

    const cards = parseBlackboardCards(lecture);

    expect(cards.length).toBe(2);
    expect(cards[0]?.title).toContain("线性时不变系统");
    expect(cards[0]?.bullets.length).toBe(2);
    expect(cards[1]?.title).toContain("卷积");
  });

  it("returns empty array when no board section exists", () => {
    const cards = parseBlackboardCards("## 小结\n这是普通讲解内容。");
    expect(cards).toEqual([]);
  });

  it("builds markdown note content from cards", () => {
    const markdown = buildBlackboardNoteContent(
      "第一章 线性时不变系统",
      [
        {
          title: "卷积",
          bullets: ["意义：描述输入输出关系", "形式：y(t)=x(t)*h(t)"],
        },
      ],
      new Date("2026-02-07T13:00:00Z"),
    );

    expect(markdown).toContain("# 第一章 线性时不变系统 - 板书要点卡片");
    expect(markdown).toContain("## 卡片1：卷积");
    expect(markdown).toContain("- 意义：描述输入输出关系");
    expect(markdown).toContain("tags:");
  });

  it("builds safe note file name", () => {
    const fileName = buildBlackboardNoteFileName(
      "第一章/线性:时不变系统",
      new Date("2026-02-07T13:00:00Z"),
    );

    expect(fileName.endsWith(".md")).toBe(true);
    expect(fileName).toContain("2026-02-07");
    expect(fileName.includes("/")).toBe(false);
    expect(fileName.includes(":")).toBe(false);
  });

  it("resolves unique note path when file already exists", () => {
    const path = resolveUniqueNotePath(
      "教学板书",
      "2026-02-07-第一章-板书卡片.md",
      new Set([
        "教学板书/2026-02-07-第一章-板书卡片.md",
        "教学板书/2026-02-07-第一章-板书卡片-2.md",
      ]),
    );

    expect(path).toBe("教学板书/2026-02-07-第一章-板书卡片-3.md");
  });
});
