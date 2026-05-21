import type { ScoredChunk } from "./types";

function truncate(text: string, maxChars: number): string {
  if (text.length <= maxChars) {
    return text;
  }
  return `${text.slice(0, Math.max(0, maxChars - 1))}…`;
}

function buildSourcesText(chunks: ScoredChunk[], maxContextChars: number): string {
  const sources: string[] = [];
  let usedChars = 0;

  for (let index = 0; index < chunks.length; index += 1) {
    const chunk = chunks[index]?.chunk;
    if (!chunk) {
      continue;
    }

    const remaining = Math.max(80, maxContextChars - usedChars);
    const excerpt = truncate(chunk.content, remaining);
    const item = `[S${index + 1}] ${chunk.path} | ${chunk.headingPath}\n${excerpt}`;

    sources.push(item);
    usedChars += item.length;
    if (usedChars >= maxContextChars) {
      break;
    }
  }

  return sources.join("\n\n");
}

export function buildTeachingMessages(
  question: string,
  chunks: ScoredChunk[],
  maxContextChars: number,
): { system: string; user: string } {
  const sources = buildSourcesText(chunks, maxContextChars);

  const system =
    "你是学生教材教学助手。请基于给定教材片段进行讲解，不要编造来源。输出结构：先给知识点讲解，再给3-5条关键要点，必要时在句末引用[S1]这类来源编号。";

  const user = [
    `学生问题：${question.trim()}`,
    "",
    "教材来源片段：",
    sources,
  ].join("\n");

  return { system, user };
}

export function buildTeacherLectureMessages(
  chapter: string,
  chunks: ScoredChunk[],
  maxContextChars: number,
): { system: string; user: string } {
  const sources = buildSourcesText(chunks, maxContextChars);

  const system =
    "你是一位耐心、结构化的老师。请严格基于教材片段授课，避免编造。输出结构：1) 本节学习目标 2) 核心概念讲解 3) 关键公式或方法 4) 易错点提醒 5) 本节小结 6) 板书要点卡片。板书要点卡片部分必须使用如下Markdown格式：\n## 板书要点卡片\n### 卡片1：<标题>\n- <要点1>\n- <要点2>\n### 卡片2：<标题>\n- <要点1>\n- <要点2>。每一部分可引用[S1]这类来源编号。";

  const user = [
    `授课章节：${chapter.trim()}`,
    "",
    "教材来源片段：",
    sources,
    "",
    "请直接进行老师式讲解，不要反问学生。",
  ].join("\n");

  return { system, user };
}

export function buildQuizMessages(
  question: string,
  chunks: ScoredChunk[],
  maxContextChars: number,
  count: number,
): { system: string; user: string } {
  const sources = buildSourcesText(chunks, maxContextChars);

  const system =
    "你是教材测验生成助手。仅输出 JSON，禁止输出 Markdown。JSON 结构必须为 {\"items\":[...]}，每个 item 字段包含 type, stem, options, correctAnswer, explanation, sourceIds, knowledgeTags, difficulty。type 仅允许 single_choice 或 true_false，correctAnswer 必须出现在 options 中，sourceIds 必须非空。";

  const user = [
    `学生问题：${question.trim()}`,
    `请生成 ${Math.max(1, count)} 道题目。`,
    "题目请覆盖概念理解与易错点。",
    "教材来源片段：",
    sources,
  ].join("\n\n");

  return { system, user };
}
