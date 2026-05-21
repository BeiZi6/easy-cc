import type { AppErrorCode } from "./types";

export class AppError extends Error {
  constructor(
    public readonly code: AppErrorCode,
    message: string,
    public readonly status?: number,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

export function mapHttpStatusToErrorCode(status: number): AppErrorCode {
  if (status === 401 || status === 403) {
    return "AUTH";
  }

  if (status === 429) {
    return "RATE_LIMIT";
  }

  if (status >= 500) {
    return "PROVIDER";
  }

  return "VALIDATION";
}
