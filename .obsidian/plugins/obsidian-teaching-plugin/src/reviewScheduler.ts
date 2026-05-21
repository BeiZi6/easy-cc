import type { AttemptRecord, ReviewTask } from "./types";

const DAY_MS = 24 * 60 * 60 * 1000;

function getEndOfDayUtc(timestamp: number): number {
  const date = new Date(timestamp);
  return Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
    23,
    59,
    59,
    999,
  );
}

function getNextIntervalDays(currentIntervalDays: number): number {
  if (currentIntervalDays <= 1) {
    return 3;
  }

  if (currentIntervalDays <= 3) {
    return 7;
  }

  return 7;
}

function toTaskId(questionId: string): string {
  const safeQuestionId = questionId.replace(/[^a-zA-Z0-9_-]/g, "-");
  return `review-${safeQuestionId}`;
}

export function planReviewTasks(
  attempts: AttemptRecord[],
  existingTasks: ReviewTask[],
  now: number,
): ReviewTask[] {
  const taskByQuestion = new Map(existingTasks.map((task) => [task.questionId, { ...task }]));
  const sortedAttempts = [...attempts].sort((a, b) => a.reviewedAt - b.reviewedAt);

  for (const attempt of sortedAttempts) {
    if (attempt.correct) {
      continue;
    }

    const previous = taskByQuestion.get(attempt.questionId);
    taskByQuestion.set(attempt.questionId, {
      id: previous?.id ?? toTaskId(attempt.questionId),
      questionId: attempt.questionId,
      intervalDays: 1,
      stability: Math.max(0.1, (previous?.stability ?? 0.35) * 0.7),
      nextReviewAt: Math.max(attempt.reviewedAt + DAY_MS, now),
    });
  }

  return Array.from(taskByQuestion.values()).sort((a, b) => a.nextReviewAt - b.nextReviewAt);
}

export function getTodayReviewTasks(
  tasks: ReviewTask[],
  now: number,
  dailyTarget: number,
): ReviewTask[] {
  const cap = Math.max(0, dailyTarget);
  const endOfDay = getEndOfDayUtc(now);

  return tasks
    .filter((task) => task.nextReviewAt <= endOfDay)
    .sort((a, b) => a.nextReviewAt - b.nextReviewAt)
    .slice(0, cap)
    .map((task) => ({ ...task }));
}

export function completeReviewTask(
  task: ReviewTask,
  correct: boolean,
  reviewedAt: number,
): ReviewTask {
  if (!correct) {
    return {
      ...task,
      intervalDays: 1,
      stability: Math.max(0.1, task.stability * 0.6),
      nextReviewAt: reviewedAt + DAY_MS,
    };
  }

  const intervalDays = getNextIntervalDays(task.intervalDays);
  return {
    ...task,
    intervalDays,
    stability: Math.min(1, task.stability + 0.2),
    nextReviewAt: reviewedAt + intervalDays * DAY_MS,
  };
}
