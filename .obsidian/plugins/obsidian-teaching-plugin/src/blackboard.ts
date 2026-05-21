import type { BlackboardCard } from "./types";

function normalizeTitle(raw: string): string {
  return raw.replace(/^卡片\s*\d+\s*[:：]?\s*/i, "").trim();
}

function pushCard(cards: BlackboardCard[], title: string, bullets: string[]): void {
  const normalizedTitle = normalizeTitle(title);
  const normalizedBullets = bullets
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
    .slice(0, 5);

  if (!normalizedTitle || normalizedBullets.length === 0) {
    return;
  }

  cards.push({
    title: normalizedTitle,
    bullets: normalizedBullets,
  });
}

function sanitizeForFileName(input: string): string {
  return input
    .replace(/[\\/:*?"<>|]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 40);
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function normalizeFolderPath(folderPath: string): string {
  return folderPath.replace(/\\/g, "/").replace(/^\/+/, "").replace(/\/+$/, "");
}

export function buildBlackboardNoteFileName(chapter: string, now: Date = new Date()): string {
  const safeChapter = sanitizeForFileName(chapter) || "未命名章节";
  return `${formatDate(now)}-${safeChapter}-板书卡片.md`;
}

export function buildBlackboardNoteContent(
  chapter: string,
  cards: BlackboardCard[],
  now: Date = new Date(),
): string {
  const safeChapter = chapter.trim() || "未命名章节";

  const lines: string[] = [
    "---",
    "tags:",
    "  - teaching-board",
    `chapter: \"${safeChapter.replace(/\"/g, "'")}\"`,
    `generated: \"${now.toISOString()}\"`,
    "---",
    "",
    `# ${safeChapter} - 板书要点卡片`,
    "",
  ];

  if (cards.length === 0) {
    lines.push("暂无可用卡片内容。", "");
    return lines.join("\n");
  }

  cards.forEach((card, index) => {
    lines.push(`## 卡片${index + 1}：${card.title}`);
    for (const bullet of card.bullets) {
      lines.push(`- ${bullet}`);
    }
    lines.push("");
  });

  return lines.join("\n");
}

export function resolveUniqueNotePath(
  folderPath: string,
  fileName: string,
  existingPaths: Set<string>,
): string {
  const normalizedFolder = normalizeFolderPath(folderPath);
  const extensionIndex = fileName.lastIndexOf(".");
  const baseName = extensionIndex > 0 ? fileName.slice(0, extensionIndex) : fileName;
  const extension = extensionIndex > 0 ? fileName.slice(extensionIndex) : "";

  const toPath = (name: string): string =>
    normalizedFolder.length > 0 ? `${normalizedFolder}/${name}` : name;

  const initial = toPath(fileName);
  if (!existingPaths.has(initial)) {
    return initial;
  }

  for (let index = 2; index < 10_000; index += 1) {
    const candidate = toPath(`${baseName}-${index}${extension}`);
    if (!existingPaths.has(candidate)) {
      return candidate;
    }
  }

  return toPath(`${baseName}-${Date.now()}${extension}`);
}

export function parseBlackboardCards(markdown: string): BlackboardCard[] {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const cards: BlackboardCard[] = [];

  let inBoardSection = false;
  let currentTitle = "";
  let currentBullets: string[] = [];

  const flushCurrent = (): void => {
    pushCard(cards, currentTitle, currentBullets);
    currentTitle = "";
    currentBullets = [];
  };

  for (const line of lines) {
    const trimmed = line.trim();

    if (!inBoardSection) {
      if (/^##\s+板书要点卡片/.test(trimmed)) {
        inBoardSection = true;
      }
      continue;
    }

    if (/^##\s+/.test(trimmed) && !/^##\s+板书要点卡片/.test(trimmed)) {
      break;
    }

    const cardHeadingMatch = trimmed.match(/^###\s+(.+)$/);
    if (cardHeadingMatch) {
      flushCurrent();
      currentTitle = cardHeadingMatch[1] ?? "";
      continue;
    }

    const bulletMatch = trimmed.match(/^[-*]\s+(.+)$/);
    if (bulletMatch) {
      currentBullets.push(bulletMatch[1] ?? "");
      continue;
    }

    const numberedMatch = trimmed.match(/^\d+[.)]\s+(.+)$/);
    if (numberedMatch) {
      currentBullets.push(numberedMatch[1] ?? "");
      continue;
    }
  }

  flushCurrent();
  return cards.slice(0, 8);
}
