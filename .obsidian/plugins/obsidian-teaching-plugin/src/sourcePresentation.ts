import type { ScoredChunk, TeachingSource } from "./types";

const CITATION_PATTERN = /\[S(\d+)\]/g;

export function buildDisplayedSources(selected: ScoredChunk[]): TeachingSource[] {
  return selected.map((item) => ({
    path: item.chunk.path,
    headingPath: item.chunk.headingPath,
    excerpt: item.chunk.content,
    score: item.score,
  }));
}

export function decorateCitationReferences(explanation: string, sourceCount: number): string {
  if (sourceCount <= 0) {
    return explanation;
  }

  return explanation.replace(CITATION_PATTERN, (fullMatch, sourceIndexRaw: string) => {
    const sourceIndex = Number.parseInt(sourceIndexRaw, 10);
    if (!Number.isFinite(sourceIndex) || sourceIndex < 1 || sourceIndex > sourceCount) {
      return fullMatch;
    }

    return `[S${sourceIndex}](#teaching-assistant-source-${sourceIndex})`;
  });
}
