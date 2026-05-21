import { AppError } from "./appError";
import type { AttemptRecord, QuizSession, QuizSubmission } from "./types";

export interface QuizGradeSummary {
  total: number;
  correct: number;
  accuracy: number;
}

export interface QuizGradeResult {
  attempts: AttemptRecord[];
  summary: QuizGradeSummary;
}

function classifyErrorType(stem: string, explanation: string): AttemptRecord["errorType"] {
  const text = `${stem} ${explanation}`.toLowerCase();

  if (/(公式|equation|推导|calculate|运算|卷积)/i.test(text)) {
    return "formula";
  }

  if (/(条件|前提|边界|when|only if|under)/i.test(text)) {
    return "condition";
  }

  return "concept";
}

export function gradeQuizSubmission(
  session: QuizSession,
  submission: QuizSubmission,
): QuizGradeResult {
  if (submission.quizSessionId !== session.id) {
    throw new AppError("VALIDATION", "Quiz submission does not match session id.");
  }

  let correctCount = 0;
  const attempts: AttemptRecord[] = session.items.map((item) => {
    const answer = submission.answers[item.id];
    const isCorrect = typeof answer === "string" && answer.trim() === item.correctAnswer;

    if (isCorrect) {
      correctCount += 1;
      return {
        questionId: item.id,
        correct: true,
        chapter: session.chapter,
        reviewedAt: submission.submittedAt,
      };
    }

    return {
      questionId: item.id,
      correct: false,
      errorType: classifyErrorType(item.stem, item.explanation),
      chapter: session.chapter,
      reviewedAt: submission.submittedAt,
    };
  });

  const total = session.items.length;

  return {
    attempts,
    summary: {
      total,
      correct: correctCount,
      accuracy: total > 0 ? correctCount / total : 0,
    },
  };
}
