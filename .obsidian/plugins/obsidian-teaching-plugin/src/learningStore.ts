import type { AttemptRecord, QuizSession, ReviewTask } from "./types";

const LATEST_SCHEMA_VERSION = 1;

export interface LearningStoreStorage {
  load(): Promise<unknown>;
  save(data: unknown): Promise<void>;
}

export interface LearningStoreState {
  schemaVersion: typeof LATEST_SCHEMA_VERSION;
  quizSessions: Record<string, QuizSession>;
  attempts: AttemptRecord[];
  reviewTasks: ReviewTask[];
}

interface MigrationResult {
  state: LearningStoreState;
  didMigrate: boolean;
}

interface LegacyLearningStoreState {
  schemaVersion?: number;
  quizSessions?: QuizSession[] | Record<string, QuizSession>;
  attempts?: AttemptRecord[];
  reviewTasks?: ReviewTask[];
  reviewQueue?: ReviewTask[];
}

function createDefaultState(): LearningStoreState {
  return {
    schemaVersion: LATEST_SCHEMA_VERSION,
    quizSessions: {},
    attempts: [],
    reviewTasks: [],
  };
}

function cloneState(state: LearningStoreState): LearningStoreState {
  return {
    schemaVersion: state.schemaVersion,
    quizSessions: Object.fromEntries(
      Object.entries(state.quizSessions).map(([id, session]) => [
        id,
        {
          ...session,
          items: session.items.map((item) => ({
            ...item,
            options: [...item.options],
            sourceIds: [...item.sourceIds],
            knowledgeTags: [...item.knowledgeTags],
          })),
        },
      ]),
    ),
    attempts: state.attempts.map((attempt) => ({ ...attempt })),
    reviewTasks: state.reviewTasks.map((task) => ({ ...task })),
  };
}

function normalizeQuizSessions(
  value: LegacyLearningStoreState["quizSessions"],
): Record<string, QuizSession> {
  if (Array.isArray(value)) {
    return Object.fromEntries(value.map((session) => [session.id, session]));
  }

  if (value && typeof value === "object") {
    return { ...value };
  }

  return {};
}

function normalizeReviewTasks(value: LegacyLearningStoreState): ReviewTask[] {
  if (Array.isArray(value.reviewTasks)) {
    return [...value.reviewTasks];
  }

  if (Array.isArray(value.reviewQueue)) {
    return [...value.reviewQueue];
  }

  return [];
}

function migrateLearningStoreState(raw: unknown): MigrationResult {
  if (!raw || typeof raw !== "object") {
    return { state: createDefaultState(), didMigrate: false };
  }

  const legacy = raw as LegacyLearningStoreState;
  const state: LearningStoreState = {
    schemaVersion: LATEST_SCHEMA_VERSION,
    quizSessions: normalizeQuizSessions(legacy.quizSessions),
    attempts: Array.isArray(legacy.attempts) ? [...legacy.attempts] : [],
    reviewTasks: normalizeReviewTasks(legacy),
  };

  const didMigrate =
    legacy.schemaVersion !== LATEST_SCHEMA_VERSION ||
    Array.isArray(legacy.quizSessions) ||
    (legacy.reviewQueue?.length ?? 0) > 0;

  return { state, didMigrate };
}

function getEndOfDay(timestamp: number): number {
  const end = new Date(timestamp);
  return Date.UTC(
    end.getUTCFullYear(),
    end.getUTCMonth(),
    end.getUTCDate(),
    23,
    59,
    59,
    999,
  );
}

export class LearningStore {
  private state: LearningStoreState = createDefaultState();

  constructor(private readonly storage: LearningStoreStorage) {}

  async initialize(): Promise<void> {
    const loaded = await this.storage.load();
    const { state, didMigrate } = migrateLearningStoreState(loaded);
    this.state = state;

    if (didMigrate) {
      await this.persist();
    }
  }

  getSnapshot(): LearningStoreState {
    return cloneState(this.state);
  }

  getQuizSession(sessionId: string): QuizSession | undefined {
    const session = this.state.quizSessions[sessionId];
    if (!session) {
      return undefined;
    }

    return cloneState({
      ...createDefaultState(),
      quizSessions: { [sessionId]: session },
    }).quizSessions[sessionId];
  }

  listAttempts(): AttemptRecord[] {
    return this.state.attempts.map((attempt) => ({ ...attempt }));
  }

  async saveQuizSession(session: QuizSession): Promise<void> {
    this.state.quizSessions[session.id] = {
      ...session,
      items: session.items.map((item) => ({
        ...item,
        options: [...item.options],
        sourceIds: [...item.sourceIds],
        knowledgeTags: [...item.knowledgeTags],
      })),
    };

    await this.persist();
  }

  async appendAttempts(attempts: AttemptRecord[]): Promise<void> {
    this.state.attempts.push(...attempts.map((attempt) => ({ ...attempt })));
    await this.persist();
  }

  async replaceReviewTasks(tasks: ReviewTask[]): Promise<void> {
    this.state.reviewTasks = tasks.map((task) => ({ ...task }));
    await this.persist();
  }

  async getTodayReviewQueue(now: number, limit: number): Promise<ReviewTask[]> {
    const endOfDay = getEndOfDay(now);
    return this.state.reviewTasks
      .filter((task) => task.nextReviewAt <= endOfDay)
      .sort((a, b) => a.nextReviewAt - b.nextReviewAt)
      .slice(0, Math.max(0, limit))
      .map((task) => ({ ...task }));
  }

  private async persist(): Promise<void> {
    await this.storage.save(cloneState(this.state));
  }
}
