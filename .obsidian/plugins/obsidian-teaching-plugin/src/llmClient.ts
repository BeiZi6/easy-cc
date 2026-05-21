import { requestUrl } from "obsidian";

import { AppError, mapHttpStatusToErrorCode } from "./appError";
import {
  buildQuizMessages,
  buildTeacherLectureMessages,
  buildTeachingMessages,
} from "./prompt";
import type { AppErrorCode, ScoredChunk, TeachingSettings } from "./types";

interface ChatCompletionPayload {
  model: string;
  temperature: number;
  messages: Array<{ role: "system" | "user"; content: string }>;
}

interface ChatCompletionResponse {
  choices?: Array<{
    message?: {
      content?: string | Array<{ type: string; text?: string }>;
    };
  }>;
  error?: {
    message?: string;
  };
}

export class LlmClientError extends AppError {
  constructor(
    message: string,
    code: AppErrorCode,
    status?: number,
    cause?: unknown,
  ) {
    super(code, message, status, cause);
    this.name = "LlmClientError";
  }
}

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/+$/, "");
}

function isRetryable(status: number): boolean {
  return status === 429 || status >= 500;
}

function shouldRetryOnCode(code: AppErrorCode): boolean {
  return code === "RATE_LIMIT" || code === "PROVIDER";
}

function backoffForAttempt(attempt: number): number {
  return attempt * 500;
}

function parseContent(response: ChatCompletionResponse): string {
  const content = response.choices?.[0]?.message?.content;
  if (typeof content === "string") {
    return content.trim();
  }

  if (Array.isArray(content)) {
    return content
      .map((part) => (part.type === "text" ? part.text ?? "" : ""))
      .join("\n")
      .trim();
  }

  const errorMessage = response.error?.message;
  if (errorMessage) {
    throw new LlmClientError(errorMessage, "PROVIDER");
  }

  throw new LlmClientError("Model response is empty.", "PARSE");
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function withTimeout<T>(operation: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new LlmClientError(`LLM request timed out after ${timeoutMs} ms.`, "TIMEOUT"));
    }, timeoutMs);

    void operation.then(
      (value) => {
        clearTimeout(timeout);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timeout);
        reject(error);
      },
    );
  });
}

export class OpenAICompatibleClient {
  constructor(private readonly settings: TeachingSettings) {}

  async generateExplanation(question: string, chunks: ScoredChunk[]): Promise<string> {
    const { system, user } = buildTeachingMessages(
      question,
      chunks,
      this.settings.maxContextChars,
    );

    return this.requestWithRetry(this.createPayload(system, user));
  }

  async generateTeacherLecture(chapter: string, chunks: ScoredChunk[]): Promise<string> {
    const { system, user } = buildTeacherLectureMessages(
      chapter,
      chunks,
      this.settings.maxContextChars,
    );

    return this.requestWithRetry(this.createPayload(system, user));
  }

  async generateQuizDraft(
    question: string,
    chunks: ScoredChunk[],
    count: number,
  ): Promise<string> {
    const { system, user } = buildQuizMessages(
      question,
      chunks,
      this.settings.maxContextChars,
      count,
    );

    return this.requestWithRetry(this.createPayload(system, user));
  }

  private createPayload(system: string, user: string): ChatCompletionPayload {
    const apiKey = this.settings.apiKey.trim();
    if (!apiKey) {
      throw new LlmClientError("Please set API key in plugin settings.", "AUTH");
    }

    const payload: ChatCompletionPayload = {
      model: this.settings.model,
      temperature: this.settings.temperature,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    };

    return payload;
  }

  private async requestWithRetry(payload: ChatCompletionPayload): Promise<string> {
    const url = `${normalizeBaseUrl(this.settings.apiBaseUrl)}/chat/completions`;
    const maxAttempts = 2;
    let currentPayload = payload;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        const response = await withTimeout(
          requestUrl({
            url,
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${this.settings.apiKey.trim()}`,
            },
            body: JSON.stringify(currentPayload),
            throw: false,
          }),
          this.settings.requestTimeoutMs,
        );

        if (response.status < 200 || response.status >= 300) {
          const code = mapHttpStatusToErrorCode(response.status);
          if (attempt < maxAttempts && isRetryable(response.status)) {
            await sleep(backoffForAttempt(attempt));
            continue;
          }

          throw new LlmClientError(
            `LLM request failed (${response.status}): ${response.text || "unknown error"}`,
            code,
            response.status,
          );
        }

        const json = response.json as ChatCompletionResponse;
        return parseContent(json);
      } catch (error) {
        if (error instanceof LlmClientError) {
          if (
            attempt < maxAttempts &&
            ((error.code === "TIMEOUT" && this.settings.enableRetryOnTimeout) ||
              shouldRetryOnCode(error.code))
          ) {
            if (error.code === "TIMEOUT") {
              currentPayload = this.reducePayloadForRetry(currentPayload);
            }
            await sleep(backoffForAttempt(attempt));
            continue;
          }
          throw error;
        }

        if (attempt < maxAttempts) {
          await sleep(backoffForAttempt(attempt));
          continue;
        }

        const message = error instanceof Error ? error.message : String(error);
        throw new LlmClientError(`Network error: ${message}`, "PROVIDER", undefined, error);
      }
    }

    throw new LlmClientError("LLM request failed after retries.", "PROVIDER");
  }

  private reducePayloadForRetry(payload: ChatCompletionPayload): ChatCompletionPayload {
    const userMessage = payload.messages.find((message) => message.role === "user");
    if (!userMessage || userMessage.content.length < 300) {
      return payload;
    }

    return {
      ...payload,
      messages: payload.messages.map((message) => {
        if (message.role !== "user") {
          return message;
        }

        const reducedContent = message.content.slice(
          0,
          Math.max(160, Math.floor(message.content.length * 0.6)),
        );

        return {
          ...message,
          content: `${reducedContent}\n\n[Retry with reduced context due to timeout.]`,
        };
      }),
    };
  }
}
