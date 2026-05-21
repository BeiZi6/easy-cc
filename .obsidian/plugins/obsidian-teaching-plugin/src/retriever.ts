import { extractStudyChapterFolder, extractTerms, isStudyChapterFolderName } from "./indexer";
import type { ScoredChunk, TextChunk } from "./types";

export interface RetrievalOptions {
  chapter?: string;
  rootFolder?: string;
  maxResults?: number;
}

function sortScoredChunks(items: ScoredChunk[]): ScoredChunk[] {
  return items.sort((left, right) => {
    if (right.score !== left.score) {
      return right.score - left.score;
    }

    const headingCompare = left.chunk.headingPath.localeCompare(
      right.chunk.headingPath,
      "zh-CN",
    );
    if (headingCompare !== 0) {
      return headingCompare;
    }

    return left.chunk.path.localeCompare(right.chunk.path, "zh-CN");
  });
}

function scoreChunk(
  chunk: TextChunk,
  queryTerms: string[],
  chapter?: string,
  rootFolder?: string,
): number {
  const termSet = new Set(chunk.terms);
  const compactHeading = chunk.headingPath.toLowerCase();
  const compactContent = chunk.content.toLowerCase();
  let score = 0;

  for (const term of queryTerms) {
    if (termSet.has(term)) {
      score += 4;
      continue;
    }
    if (compactHeading.includes(term)) {
      score += 3;
      continue;
    }
    if (compactContent.includes(term)) {
      score += 1;
    }
  }

  const normalizedChapter = chapter?.trim();
  if (normalizedChapter) {
    if (rootFolder && isStudyChapterFolderName(normalizedChapter)) {
      const chapterFolder = extractStudyChapterFolder(chunk.path, rootFolder);
      if (chapterFolder === normalizedChapter) {
        score += 6;
      }
    } else if (chunk.headingPath.includes(normalizedChapter)) {
      score += 6;
    }
  }

  return score;
}

export function retrieveRelevantChunks(
  chunks: TextChunk[],
  query: string,
  options: RetrievalOptions = {},
): ScoredChunk[] {
  const queryTerms = extractTerms(query);
  const maxResults = Math.max(1, options.maxResults ?? 5);
  const normalizedChapter = options.chapter?.trim();

  let candidates = chunks;
  if (normalizedChapter && options.rootFolder && isStudyChapterFolderName(normalizedChapter)) {
    candidates = chunks.filter(
      (chunk) => extractStudyChapterFolder(chunk.path, options.rootFolder ?? "") === normalizedChapter,
    );
  }

  return sortScoredChunks(
    candidates.map((chunk) => ({
      chunk,
      score: scoreChunk(chunk, queryTerms, normalizedChapter, options.rootFolder),
    })),
  ).slice(0, maxResults);
}

export function retrieveChapterChunks(
  chunks: TextChunk[],
  chapter: string,
  options: RetrievalOptions = {},
): ScoredChunk[] {
  const normalizedChapter = chapter.trim();
  if (!normalizedChapter) {
    return [];
  }

  const maxResults = Math.max(1, options.maxResults ?? 5);

  const chapterCandidates =
    options.rootFolder && isStudyChapterFolderName(normalizedChapter)
      ? chunks.filter(
          (chunk) =>
            extractStudyChapterFolder(chunk.path, options.rootFolder ?? "") === normalizedChapter,
        )
      : chunks.filter((chunk) => chunk.headingPath.includes(normalizedChapter));

  return sortScoredChunks(
    chapterCandidates.map((chunk) => ({
      chunk,
      score:
        options.rootFolder && isStudyChapterFolderName(normalizedChapter)
          ? 1
          : chunk.headingPath === normalizedChapter
            ? 2
            : 1,
    })),
  ).slice(0, maxResults);
}
