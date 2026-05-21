import { AppError } from "./appError";
import type { LearningStore } from "./learningStore";
import { gradeQuizSubmission } from "./quizGrader";
import type { QuizEngine } from "./quizEngine";
import { planReviewTasks } from "./reviewScheduler";
import type {
  AttemptRecord,
  LearningDashboard,
  QuizSession,
  QuizSubmission,
  ReviewTask,
  ScoredChunk,
} from "./types";

const DAY_MS = 24 * 60 * 60 * 1000;

export interface ExplanationSeed {
  question: string;
  chapter?: string;
  chunks: ScoredChunk[];
}

function startOfTodayUtc(timestamp: number): number {
  const date = new Date(timestamp);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0);
}

function calculateAccuracyPercent(attempts: AttemptRecord[]): number {
  if (attempts.length === 0) {
    return 0;
  }

  const correctCount = attempts.filter((attempt) => attempt.correct).length;
  return Number(((correctCount / attempts.length) * 100).toFixed(1));
}

function calculateRepeatWrongRatePercent(attempts: AttemptRecord[]): number {
  const sorted = [...attempts].sort((a, b) => a.reviewedAt - b.reviewedAt);
  const wrongCounts = new Map<string, number>();
  let wrongTotal = 0;
  let repeatedWrong = 0;

  for (const attempt of sorted) {
    if (attempt.correct) {
      continue;
    }

    wrongTotal += 1;
    const previous = wrongCounts.get(attempt.questionId) ?? 0;
    if (previous > 0) {
      repeatedWrong += 1;
    }
    wrongCounts.set(attempt.questionId, previous + 1);
  }

  if (wrongTotal === 0) {
    return 0;
  }

  return Number(((repeatedWrong / wrongTotal) * 100).toFixed(1));
}

function calculateWeakChapters(attempts: AttemptRecord[]): LearningDashboard["weakChapters"] {
  const byChapter = new Map<string, { total: number; correct: number }>();

  for (const attempt of attempts) {
    const chapter = attempt.chapter?.trim() || "Uncategorized";
    const current = byChapter.get(chapter) ?? { total: 0, correct: 0 };
    current.total += 1;
    if (attempt.correct) {
      current.correct += 1;
    }
    byChapter.set(chapter, current);
  }

  return Array.from(byChapter.entries())
    .map(([chapter, stats]) => ({
      chapter,
      score: Number(((stats.correct / stats.total) * 100).toFixed(1)),
    }))
    .sort((a, b) => a.score - b.score)
    .slice(0, 5);
}

export class StudyLoopWorkflow {
  private lastSeed: ExplanationSeed | null = null;

  constructor(
    private readonly store: LearningStore,
    private readonly createQuizEngine: () => QuizEngine,
    private readonly now: () => number = () => Date.now(),
  ) {}

  setExplanationSeed(seed: ExplanationSeed): void {
    this.lastSeed = {
      question: seed.question,
      chapter: seed.chapter,
      chunks: [...seed.chunks],
    };
  }

  async startQuizFromLastExplanation(count: number): Promise<QuizSession> {
    if (!this.lastSeed) {
      throw new AppError("VALIDATION", "No explanation context available for quiz generation.");
    }

    const engine = this.createQuizEngine();
    const session = await engine.createQuizSession(
      this.lastSeed.question,
      this.lastSeed.chunks,
      Math.max(1, count),
      this.lastSeed.chapter,
    );

    await this.store.saveQuizSession(session);
    return session;
  }

  async submitQuiz(submission: QuizSubmission): Promise<{ attempts: AttemptRecord[] }> {
    const session = this.store.getQuizSession(submission.quizSessionId);
    if (!session) {
      throw new AppError("VALIDATION", "Quiz session does not exist.");
    }

    const graded = gradeQuizSubmission(session, submission);
    await this.store.appendAttempts(graded.attempts);

    const existingTasks = this.store.getSnapshot().reviewTasks;
    const plannedTasks = planReviewTasks(graded.attempts, existingTasks, submission.submittedAt);
    await this.store.replaceReviewTasks(plannedTasks);

    return { attempts: graded.attempts };
  }

  async getTodayReviewQueue(target: number, now: number = this.now()): Promise<ReviewTask[]> {
    return this.store.getTodayReviewQueue(now, Math.max(0, target));
  }

  getLearningDashboard(target: number, now: number = this.now()): LearningDashboard {
    const attempts = this.store.listAttempts();
    const todayStart = startOfTodayUtc(now);
    const sevenDaysAgo = todayStart - 6 * DAY_MS;

    const todayAttempts = attempts.filter((attempt) => attempt.reviewedAt >= todayStart);
    const attempts7d = attempts.filter((attempt) => attempt.reviewedAt >= sevenDaysAgo);

    return {
      todayTarget: Math.max(0, target),
      todayDone: todayAttempts.length,
      accuracy7d: calculateAccuracyPercent(attempts7d),
      repeatWrongRate: calculateRepeatWrongRatePercent(attempts7d),
      weakChapters: calculateWeakChapters(attempts7d),
    };
  }
}
