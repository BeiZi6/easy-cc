export interface TeachingSettings {
  apiBaseUrl: string;
  apiKey: string;
  model: string;
  textbookFolder: string;
  maxContextChars: number;
  requestTimeoutMs: number;
  maxSources: number;
  dailyReviewTarget: number;
  quizQuestionCount: number;
  autoOpenQuizAfterExplain: boolean;
  wrongNotebookFolder: string;
  enableRetryOnTimeout: boolean;
  temperature: number;
}

export interface TextChunk {
  id: string;
  path: string;
  headingPath: string;
  content: string;
  terms: string[];
}

export interface ScoredChunk {
  chunk: TextChunk;
  score: number;
}

export interface TeachingSource {
  path: string;
  headingPath: string;
  excerpt: string;
  score: number;
}

export interface BlackboardCard {
  title: string;
  bullets: string[];
}

export interface TeachingResult {
  explanation: string;
  sources: TeachingSource[];
  cards?: BlackboardCard[];
}

export type QuizType = "single_choice" | "true_false";

export type AppErrorCode =
  | "AUTH"
  | "TIMEOUT"
  | "RATE_LIMIT"
  | "PROVIDER"
  | "PARSE"
  | "EMPTY_RETRIEVAL"
  | "VALIDATION";

export interface QuizItem {
  id: string;
  type: QuizType;
  stem: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
  sourceIds: string[];
  knowledgeTags: string[];
  difficulty: 1 | 2 | 3;
}

export interface QuizSession {
  id: string;
  chapter?: string;
  question: string;
  items: QuizItem[];
  createdAt: number;
}

export interface QuizSubmission {
  quizSessionId: string;
  answers: Record<string, string>;
  submittedAt: number;
}

export interface AttemptRecord {
  questionId: string;
  correct: boolean;
  errorType?: "concept" | "formula" | "condition";
  chapter?: string;
  reviewedAt: number;
}

export interface ReviewTask {
  id: string;
  questionId: string;
  nextReviewAt: number;
  intervalDays: number;
  stability: number;
}

export interface LearningDashboard {
  todayTarget: number;
  todayDone: number;
  accuracy7d: number;
  repeatWrongRate: number;
  weakChapters: Array<{ chapter: string; score: number }>;
}
