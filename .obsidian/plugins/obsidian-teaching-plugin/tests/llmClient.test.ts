import { afterEach, describe, expect, it, vi } from "vitest";
import * as obsidian from "obsidian";

import { OpenAICompatibleClient } from "../src/llmClient";
import type { ScoredChunk, TeachingSettings } from "../src/types";

const settings: TeachingSettings = {
  apiBaseUrl: "https://api.deepseek.com/v1",
  apiKey: "test-key",
  model: "deepseek-chat",
  textbookFolder: "教材",
  maxContextChars: 6000,
  requestTimeoutMs: 10000,
  maxSources: 3,
  dailyReviewTarget: 20,
  quizQuestionCount: 10,
  autoOpenQuizAfterExplain: true,
  wrongNotebookFolder: "错题本",
  enableRetryOnTimeout: true,
  temperature: 0.2,
};

const chunks: ScoredChunk[] = [
  {
    score: 10,
    chunk: {
      id: "1",
      path: "教材/信号与系统.md",
      headingPath: "第一章 > 基本概念",
      content: "线性时不变系统满足叠加性和平移不变性。",
      terms: [],
    },
  },
];

function createPendingRequestUrlResponse(): obsidian.RequestUrlResponsePromise {
  const promise = new Promise<obsidian.RequestUrlResponse>(() => undefined);
  return Object.assign(promise, {
    arrayBuffer: new Promise<ArrayBuffer>(() => undefined),
    json: new Promise<unknown>(() => undefined),
    text: new Promise<string>(() => undefined),
  });
}

describe("OpenAICompatibleClient", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    delete (globalThis as { fetch?: unknown }).fetch;
  });

  it("uses requestUrl instead of fetch for network requests", async () => {
    const requestUrlSpy = vi.spyOn(obsidian, "requestUrl").mockResolvedValue({
      status: 200,
      headers: {},
      arrayBuffer: new ArrayBuffer(0),
      json: {
        choices: [
          {
            message: {
              content: "由 requestUrl 返回的讲解",
            },
          },
        ],
      },
      text: '{"choices":[{"message":{"content":"由 requestUrl 返回的讲解"}}]}',
    });

    const fetchSpy = vi
      .fn()
      .mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          choices: [
            {
              message: {
                content: "由 fetch 返回的讲解",
              },
            },
          ],
        }),
      });

    (globalThis as { fetch?: unknown }).fetch = fetchSpy;

    const client = new OpenAICompatibleClient(settings);
    const explanation = await client.generateExplanation("请讲解 LTI 系统", chunks);

    expect(explanation).toBe("由 requestUrl 返回的讲解");
    expect(requestUrlSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("maps 429 responses to RATE_LIMIT errors", async () => {
    const requestUrlSpy = vi.spyOn(obsidian, "requestUrl").mockResolvedValue({
      status: 429,
      headers: {},
      arrayBuffer: new ArrayBuffer(0),
      json: {},
      text: "rate limit",
    });

    const client = new OpenAICompatibleClient(settings);

    await expect(client.generateExplanation("请讲解 LTI 系统", chunks)).rejects.toMatchObject({
      code: "RATE_LIMIT",
    });
    expect(requestUrlSpy).toHaveBeenCalledTimes(2);
  });

  it("maps 5xx responses to PROVIDER errors", async () => {
    const requestUrlSpy = vi.spyOn(obsidian, "requestUrl").mockResolvedValue({
      status: 503,
      headers: {},
      arrayBuffer: new ArrayBuffer(0),
      json: {},
      text: "provider unavailable",
    });

    const client = new OpenAICompatibleClient(settings);

    await expect(client.generateExplanation("请讲解 LTI 系统", chunks)).rejects.toMatchObject({
      code: "PROVIDER",
    });
    expect(requestUrlSpy).toHaveBeenCalledTimes(2);
  });

  it("maps parse failures to PARSE errors", async () => {
    vi.spyOn(obsidian, "requestUrl").mockResolvedValue({
      status: 200,
      headers: {},
      arrayBuffer: new ArrayBuffer(0),
      json: {},
      text: "{}",
    });

    const client = new OpenAICompatibleClient(settings);

    await expect(client.generateExplanation("请讲解 LTI 系统", chunks)).rejects.toMatchObject({
      code: "PARSE",
    });
  });

  it("maps missing API key to AUTH errors", async () => {
    const client = new OpenAICompatibleClient({
      ...settings,
      apiKey: "   ",
    });

    await expect(client.generateExplanation("请讲解 LTI 系统", chunks)).rejects.toMatchObject({
      code: "AUTH",
    });
  });

  it("maps request timeout to TIMEOUT errors", async () => {
    const requestUrlSpy = vi
      .spyOn(obsidian, "requestUrl")
      .mockImplementation(() => createPendingRequestUrlResponse());
    const client = new OpenAICompatibleClient({
      ...settings,
      requestTimeoutMs: 10,
    });

    await expect(client.generateExplanation("请讲解 LTI 系统", chunks)).rejects.toMatchObject({
      code: "TIMEOUT",
    });
    expect(requestUrlSpy).toHaveBeenCalledTimes(2);
  });
});
