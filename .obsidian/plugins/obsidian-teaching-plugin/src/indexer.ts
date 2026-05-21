import type { App, TFile } from "obsidian";

import type { TextChunk } from "./types";

const CJK_BLOCK_REGEX = /[\u4e00-\u9fff]{2,}/g;
const LATIN_TOKEN_REGEX = /[a-z0-9]{2,}/g;
const STUDY_CHAPTER_FOLDER_PATTERN = /^\d{2}-.+/;

function normalizePathLike(value: string): string {
  return value.replace(/\\/g, "/").replace(/^\/+/, "").replace(/\/+$/, "");
}

export function isStudyChapterFolderName(folderName: string): boolean {
  const normalized = normalizePathLike(folderName);
  if (!normalized || normalized.includes("/")) {
    return false;
  }
  return STUDY_CHAPTER_FOLDER_PATTERN.test(normalized);
}

function getRelativePathWithinRoot(filePath: string, rootFolder: string): string | null {
  const normalizedPath = normalizePathLike(filePath);
  const normalizedRoot = normalizePathLike(rootFolder);

  if (normalizedRoot.length === 0) {
    return normalizedPath;
  }

  if (normalizedPath === normalizedRoot) {
    return "";
  }

  if (!normalizedPath.startsWith(`${normalizedRoot}/`)) {
    return null;
  }

  return normalizedPath.slice(normalizedRoot.length + 1);
}

export function isMarkdownInFolder(filePath: string, folderPath: string): boolean {
  const normalizedPath = normalizePathLike(filePath);
  const normalizedFolder = normalizePathLike(folderPath);

  if (normalizedFolder.length === 0) {
    return normalizedPath.endsWith(".md");
  }

  return (
    normalizedPath.endsWith(".md") &&
    (normalizedPath === normalizedFolder || normalizedPath.startsWith(`${normalizedFolder}/`))
  );
}

export function extractStudyChapterFolder(filePath: string, rootFolder: string): string | null {
  if (!isMarkdownInFolder(filePath, rootFolder)) {
    return null;
  }

  const relativePath = getRelativePathWithinRoot(filePath, rootFolder);
  if (!relativePath) {
    return null;
  }

  const firstSegment = relativePath.split("/")[0] ?? "";
  if (!isStudyChapterFolderName(firstSegment)) {
    return null;
  }

  return firstSegment;
}

function compactText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function defaultHeadingFromPath(filePath: string): string {
  const parts = normalizePathLike(filePath).split("/");
  const fileName = parts.length > 0 ? (parts[parts.length - 1] ?? "Untitled") : "Untitled";
  return fileName.replace(/\.md$/i, "");
}

export function extractTerms(input: string): string[] {
  const terms = new Set<string>();
  const lower = input.toLowerCase();

  for (const token of lower.match(LATIN_TOKEN_REGEX) ?? []) {
    terms.add(token);
  }

  for (const block of input.match(CJK_BLOCK_REGEX) ?? []) {
    terms.add(block);
    for (let index = 0; index < block.length - 1; index += 1) {
      terms.add(block.slice(index, index + 2));
    }
  }

  return [...terms];
}

export function splitMarkdownToChunks(markdown: string, filePath: string): TextChunk[] {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const chunks: TextChunk[] = [];
  const headingStack: string[] = [];
  const paragraphBuffer: string[] = [];

  const flushParagraph = (): void => {
    const content = compactText(paragraphBuffer.join(" "));
    paragraphBuffer.length = 0;

    if (!content) {
      return;
    }

    const headingPath = headingStack.length
      ? headingStack.join(" > ")
      : defaultHeadingFromPath(filePath);

    chunks.push({
      id: `${filePath}::${chunks.length + 1}`,
      path: normalizePathLike(filePath),
      headingPath,
      content,
      terms: extractTerms(`${headingPath} ${content}`),
    });
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);

    if (headingMatch) {
      flushParagraph();
      const hashes = headingMatch[1] ?? "#";
      const headingText = headingMatch[2] ?? "Untitled";
      const level = hashes.length;
      const heading = compactText(headingText);

      headingStack.splice(level - 1);
      headingStack[level - 1] = heading;
      continue;
    }

    if (line.length === 0) {
      flushParagraph();
      continue;
    }

    paragraphBuffer.push(line);
  }

  flushParagraph();
  return chunks;
}

export class TextbookIndexer {
  private readonly chunksByFile = new Map<string, TextChunk[]>();

  private allChunks: TextChunk[] = [];

  private folderPath: string;

  constructor(
    private readonly app: App,
    textbookFolder: string,
  ) {
    this.folderPath = normalizePathLike(textbookFolder);
  }

  setFolderPath(folderPath: string): void {
    this.folderPath = normalizePathLike(folderPath);
  }

  getFolderPath(): string {
    return this.folderPath;
  }

  getChunks(): TextChunk[] {
    return this.allChunks;
  }

  getHeadings(): string[] {
    return [...new Set(this.allChunks.map((chunk) => chunk.headingPath))].sort((a, b) =>
      a.localeCompare(b, "zh-CN"),
    );
  }

  getChapterFolders(): string[] {
    return [
      ...new Set(
        this.allChunks
          .map((chunk) => extractStudyChapterFolder(chunk.path, this.folderPath))
          .filter((chapterFolder): chapterFolder is string => Boolean(chapterFolder)),
      ),
    ].sort((a, b) => a.localeCompare(b, "zh-CN"));
  }

  async buildIndex(): Promise<void> {
    this.chunksByFile.clear();

    const files = this.app.vault
      .getMarkdownFiles()
      .filter((file) => isMarkdownInFolder(file.path, this.folderPath));

    for (const file of files) {
      await this.indexFile(file);
    }
  }

  async indexFile(file: TFile): Promise<void> {
    if (!isMarkdownInFolder(file.path, this.folderPath)) {
      this.removeFile(file.path);
      return;
    }

    const content = await this.app.vault.cachedRead(file);
    const chunks = splitMarkdownToChunks(content, file.path);
    this.chunksByFile.set(normalizePathLike(file.path), chunks);
    this.refreshChunksCache();
  }

  removeFile(filePath: string): void {
    this.chunksByFile.delete(normalizePathLike(filePath));
    this.refreshChunksCache();
  }

  private refreshChunksCache(): void {
    this.allChunks = [...this.chunksByFile.values()].flat();
  }
}
