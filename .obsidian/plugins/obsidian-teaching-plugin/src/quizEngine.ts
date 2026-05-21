import { AppError } from "./appError";
import type { QuizItem, QuizSession, QuizType, ScoredChunk } from "./types";

interface QuizDraftItem {
  id?: unknown;
  type?: unknown;
  stem?: unknown;
  options?: unknown;
  correctAnswer?: unknown;
  explanation?: unknown;
  sourceIds?: unknown;
  knowledgeTags?: unknown;
  difficulty?: unknown;
}

interface QuizDraftPayload {
  items?: unknown;
}

export interface QuizGenerationClient {
  generateQuizDraft(question: string, chunks: ScoredChunk[], count: number): Promise<string>;
}

function isQuizType(value: unknown): value is QuizType {
  return value === "single_choice" || value === "true_false";
}

function isDifficulty(value: unknown): value is 1 | 2 | 3 {
  return value === 1 || value === 2 || value === 3;
}

function defaultIdFactory(): string {
  return `id-${Math.random().toString(36).slice(2, 10)}`;
}

function extractJsonObject(rawText: string): string {
  const fenced = rawText.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) {
    return fenced[1].trim();
  }

  const firstBrace = rawText.indexOf("{");
  const lastBrace = rawText.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return rawText.slice(firstBrace, lastBrace + 1);
  }

  return rawText.trim();
}

export class QuizEngine {
  constructor(
    private readonly client: QuizGenerationClient,
    private readonly now: () => number = () => Date.now(),
    private readonly idFactory: () => string = defaultIdFactory,
  ) {}

  async createQuizSession(
    question: string,
    chunks: ScoredChunk[],
    count: number,
    chapter?: string,
  ): Promise<QuizSession> {
    const expectedCount = Math.max(1, count);

    for (let attempt = 1; attempt <= 2; attempt += 1) {
      try {
        const raw = await this.client.generateQuizDraft(question, chunks, expectedCount);
        const items = this.parseAndValidateItems(raw, expectedCount);

        return {
          id: this.idFactory(),
          chapter,
          question,
          items,
          createdAt: this.now(),
        };
      } catch (error) {
        if (attempt >= 2) {
          throw error;
        }
      }
    }

    throw new AppError("VALIDATION", "Quiz generation failed after retries.");
  }

  private parseAndValidateItems(rawText: string, expectedCount: number): QuizItem[] {
    const payload = this.parsePayload(rawText);
    if (!Array.isArray(payload.items)) {
      throw new AppError("PARSE", "Quiz payload must include an items array.");
    }

    if (payload.items.length !== expectedCount) {
      throw new AppError(
        "VALIDATION",
        `Quiz item count mismatch. expected=${expectedCount}, actual=${payload.items.length}`,
      );
    }

    return payload.items.map((rawItem, index) => this.normalizeItem(rawItem as QuizDraftItem, index));
  }

  private parsePayload(rawText: string): QuizDraftPayload {
    const jsonText = extractJsonObject(rawText);

    try {
      return JSON.parse(jsonText) as QuizDraftPayload;
    } catch (error) {
      throw new AppError("PARSE", "Quiz response is not valid JSON.", undefined, error);
    }
  }

  private normalizeItem(rawItem: QuizDraftItem, index: number): QuizItem {
    const stem = typeof rawItem.stem === "string" ? rawItem.stem.trim() : "";
    const type = rawItem.type;
    const options = Array.isArray(rawItem.options)
      ? rawItem.options
          .filter((option): option is string => typeof option === "string")
          .map((option) => option.trim())
          .filter((option) => option.length > 0)
      : [];
    const correctAnswer =
      typeof rawItem.correctAnswer === "string" ? rawItem.correctAnswer.trim() : "";
    const sourceIds = Array.isArray(rawItem.sourceIds)
      ? rawItem.sourceIds
          .filter((sourceId): sourceId is string => typeof sourceId === "string")
          .map((sourceId) => sourceId.trim())
          .filter((sourceId) => sourceId.length > 0)
      : [];

    if (!stem) {
      throw new AppError("VALIDATION", `Quiz item ${index + 1} is missing stem.`);
    }

    if (!isQuizType(type)) {
      throw new AppError("VALIDATION", `Quiz item ${index + 1} has invalid type.`);
    }

    if (options.length < 2) {
      throw new AppError("VALIDATION", `Quiz item ${index + 1} must have at least two options.`);
    }

    if (!correctAnswer || !options.includes(correctAnswer)) {
      throw new AppError("VALIDATION", `Quiz item ${index + 1} has invalid correctAnswer.`);
    }

    if (sourceIds.length === 0) {
      throw new AppError("VALIDATION", `Quiz item ${index + 1} must include sourceIds.`);
    }

    const knowledgeTags = Array.isArray(rawItem.knowledgeTags)
      ? rawItem.knowledgeTags
          .filter((tag): tag is string => typeof tag === "string")
          .map((tag) => tag.trim())
          .filter((tag) => tag.length > 0)
      : [];
    const difficulty = isDifficulty(rawItem.difficulty) ? rawItem.difficulty : 2;
    const explanation =
      typeof rawItem.explanation === "string" && rawItem.explanation.trim().length > 0
        ? rawItem.explanation.trim()
        : "No explanation provided.";

    return {
      id:
        typeof rawItem.id === "string" && rawItem.id.trim().length > 0
          ? rawItem.id.trim()
          : this.idFactory(),
      type,
      stem,
      options,
      correctAnswer,
      explanation,
      sourceIds,
      knowledgeTags,
      difficulty,
    };
  }
}
