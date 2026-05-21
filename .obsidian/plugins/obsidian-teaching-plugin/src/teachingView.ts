import { ItemView, MarkdownRenderer, Notice } from "obsidian";
import type { WorkspaceLeaf } from "obsidian";

import { decorateCitationReferences } from "./sourcePresentation";
import type {
  AttemptRecord,
  BlackboardCard,
  LearningDashboard,
  QuizItem,
  QuizSession,
  QuizSubmission,
  ReviewTask,
  TeachingResult,
} from "./types";

export const TEACHING_VIEW_TYPE = "teaching-assistant-view";

export interface TeachingViewHost {
  getChapterFolders(): string[];
  explain(question: string, chapter?: string): Promise<TeachingResult>;
  teachChapter(chapter: string): Promise<TeachingResult>;
  startQuizFromLastExplanation(count?: number): Promise<QuizSession>;
  submitQuiz(submission: QuizSubmission): Promise<{ attempts: AttemptRecord[] }>;
  getTodayReviewQueue(): Promise<ReviewTask[]>;
  getLearningDashboard(): Promise<LearningDashboard>;
  saveBlackboardCards(chapter: string, cards: BlackboardCard[]): Promise<string>;
  openPluginSettings(): void;
}

export class TeachingAssistantView extends ItemView {
  private chapterSelectEl: HTMLSelectElement | null = null;

  private questionInputEl: HTMLTextAreaElement | null = null;

  private outputEl: HTMLDivElement | null = null;

  private submitButtonEl: HTMLButtonElement | null = null;

  private lectureButtonEl: HTMLButtonElement | null = null;

  private quizSectionEl: HTMLDivElement | null = null;

  private reviewSectionEl: HTMLDivElement | null = null;

  private dashboardSectionEl: HTMLDivElement | null = null;

  private quizStartButtonEl: HTMLButtonElement | null = null;

  private quizSubmitButtonEl: HTMLButtonElement | null = null;

  private refreshReviewButtonEl: HTMLButtonElement | null = null;

  private quizStatusEl: HTMLDivElement | null = null;

  private currentQuizSession: QuizSession | null = null;

  private selectedAnswers: Record<string, string> = {};

  private reviewQueue: ReviewTask[] = [];

  private dashboard: LearningDashboard | null = null;

  constructor(
    leaf: WorkspaceLeaf,
    private readonly host: TeachingViewHost,
  ) {
    super(leaf);
  }

  override getViewType(): string {
    return TEACHING_VIEW_TYPE;
  }

  override getDisplayText(): string {
    return "Teaching assistant";
  }

  override getIcon(): string {
    return "graduation-cap";
  }

  override async onOpen(): Promise<void> {
    this.render();
    await this.refreshLearningPanels();
  }

  override async onClose(): Promise<void> {
    this.contentEl.empty();
  }

  refreshHeadings(): void {
    if (!this.chapterSelectEl) {
      return;
    }

    this.populateChapters();
  }

  private render(): void {
    const container = this.contentEl;
    container.empty();
    container.addClass("teaching-assistant-view");

    container.createEl("h3", { text: "教材知识点讲解" });

    const chapterSetting = container.createDiv({ cls: "teaching-assistant-field" });
    const chapterLabel = chapterSetting.createEl("label", { text: "章节筛选" });
    this.chapterSelectEl = chapterSetting.createEl("select");
    this.chapterSelectEl.id = "teaching-assistant-chapter-select";
    chapterLabel.setAttr("for", this.chapterSelectEl.id);
    this.populateChapters();

    const questionSetting = container.createDiv({ cls: "teaching-assistant-field" });
    const questionLabel = questionSetting.createEl("label", { text: "问题" });
    this.questionInputEl = questionSetting.createEl("textarea", {
      attr: {
        rows: "4",
        placeholder: "例如：请讲解线性时不变系统的核心概念，并给出与卷积的关系。",
      },
    });
    this.questionInputEl.id = "teaching-assistant-question-input";
    questionLabel.setAttr("for", this.questionInputEl.id);
    this.questionInputEl.addEventListener("keydown", (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
        event.preventDefault();
        void this.handleSubmit();
      }
    });

    const actions = container.createDiv({ cls: "teaching-assistant-actions" });
    this.submitButtonEl = actions.createEl("button", { text: "生成讲解" });
    this.submitButtonEl.addEventListener("click", () => {
      void this.handleSubmit();
    });

    this.lectureButtonEl = actions.createEl("button", { text: "老师讲课" });
    this.lectureButtonEl.addEventListener("click", () => {
      void this.handleTeachChapter();
    });

    const settingsButton = actions.createEl("button", { text: "打开插件设置" });
    settingsButton.addClass("teaching-assistant-secondary-action");
    settingsButton.addEventListener("click", () => {
      this.host.openPluginSettings();
    });

    this.outputEl = container.createDiv({ cls: "teaching-assistant-output" });
    this.outputEl.setAttr("aria-live", "polite");
    this.outputEl.setAttr("aria-busy", "false");
    this.outputEl.setText("请输入问题后点击“生成讲解”。");

    const learningPanel = container.createDiv({ cls: "teaching-assistant-learning-panel" });
    this.quizSectionEl = learningPanel.createDiv({ cls: "teaching-assistant-quiz-section" });
    this.reviewSectionEl = learningPanel.createDiv({ cls: "teaching-assistant-review-section" });
    this.dashboardSectionEl = learningPanel.createDiv({ cls: "teaching-assistant-dashboard-section" });

    this.renderQuizSection();
    this.renderReviewSection();
    this.renderDashboardSection();
  }

  private populateChapters(): void {
    if (!this.chapterSelectEl) {
      return;
    }

    const selected = this.chapterSelectEl.value;
    this.chapterSelectEl.empty();
    this.chapterSelectEl.createEl("option", { text: "全部章节", value: "" });

    for (const chapterFolder of this.host.getChapterFolders()) {
      this.chapterSelectEl.createEl("option", {
        text: chapterFolder,
        value: chapterFolder,
      });
    }

    if (selected) {
      this.chapterSelectEl.value = selected;
    }
  }

  private setBusy(mode: "qa" | "lecture" | "quiz" | "review" | null): void {
    const isBusy = mode !== null;
    this.outputEl?.setAttr("aria-busy", isBusy ? "true" : "false");

    if (this.submitButtonEl) {
      this.submitButtonEl.disabled = isBusy;
      this.submitButtonEl.setText(mode === "qa" ? "生成中..." : "生成讲解");
    }

    if (this.lectureButtonEl) {
      this.lectureButtonEl.disabled = isBusy;
      this.lectureButtonEl.setText(mode === "lecture" ? "讲课中..." : "老师讲课");
    }

    if (this.quizStartButtonEl) {
      this.quizStartButtonEl.disabled = isBusy;
    }

    if (this.quizSubmitButtonEl) {
      this.quizSubmitButtonEl.disabled = isBusy || !this.currentQuizSession;
    }

    if (this.refreshReviewButtonEl) {
      this.refreshReviewButtonEl.disabled = isBusy;
    }
  }

  private async handleSubmit(): Promise<void> {
    const question = this.questionInputEl?.value.trim() ?? "";
    const chapter = this.chapterSelectEl?.value || undefined;

    if (!question) {
      new Notice("请先输入问题。");
      return;
    }

    this.setBusy("qa");
    try {
      const result = await this.host.explain(question, chapter);
      await this.renderResult(result);
      this.currentQuizSession = null;
      this.selectedAnswers = {};
      this.renderQuizSection();
      await this.refreshLearningPanels();
    } catch (error) {
      const message = error instanceof Error ? error.message : "生成失败。";
      this.renderError(message);
      new Notice(message);
    } finally {
      this.setBusy(null);
    }
  }

  private async handleTeachChapter(): Promise<void> {
    const chapter = this.chapterSelectEl?.value.trim() ?? "";
    if (!chapter) {
      new Notice("请先选择一个章节再开始讲课。");
      return;
    }

    this.setBusy("lecture");
    try {
      const result = await this.host.teachChapter(chapter);
      await this.renderResult(result, chapter);
      this.currentQuizSession = null;
      this.selectedAnswers = {};
      this.renderQuizSection();
      await this.refreshLearningPanels();
    } catch (error) {
      const message = error instanceof Error ? error.message : "讲课失败。";
      this.renderError(message);
      new Notice(message);
    } finally {
      this.setBusy(null);
    }
  }

  private async handleStartQuiz(): Promise<void> {
    this.setBusy("quiz");
    try {
      this.currentQuizSession = await this.host.startQuizFromLastExplanation();
      this.selectedAnswers = {};
      this.renderQuizSection();
      this.updateQuizStatus(`已生成 ${this.currentQuizSession.items.length} 道训练题。`);
      await this.refreshLearningPanels();
    } catch (error) {
      const message = error instanceof Error ? error.message : "生成训练题失败。";
      this.updateQuizStatus(message);
      new Notice(message);
    } finally {
      this.setBusy(null);
    }
  }

  private async handleSubmitQuiz(): Promise<void> {
    if (!this.currentQuizSession) {
      new Notice("请先开始训练。");
      return;
    }

    this.setBusy("quiz");
    try {
      const submission: QuizSubmission = {
        quizSessionId: this.currentQuizSession.id,
        answers: { ...this.selectedAnswers },
        submittedAt: Date.now(),
      };

      const graded = await this.host.submitQuiz(submission);
      const total = graded.attempts.length;
      const correct = graded.attempts.filter((attempt) => attempt.correct).length;
      this.updateQuizStatus(`已提交答案：${correct}/${total} 正确。`);
      await this.refreshLearningPanels();
    } catch (error) {
      const message = error instanceof Error ? error.message : "提交答案失败。";
      this.updateQuizStatus(message);
      new Notice(message);
    } finally {
      this.setBusy(null);
    }
  }

  private async handleRefreshReview(): Promise<void> {
    this.setBusy("review");
    try {
      await this.refreshLearningPanels();
    } finally {
      this.setBusy(null);
    }
  }

  private async refreshLearningPanels(): Promise<void> {
    try {
      const [queue, dashboard] = await Promise.all([
        this.host.getTodayReviewQueue(),
        this.host.getLearningDashboard(),
      ]);

      this.reviewQueue = queue;
      this.dashboard = dashboard;
      this.renderReviewSection();
      this.renderDashboardSection();
    } catch (error) {
      const message = error instanceof Error ? error.message : "刷新学习数据失败。";
      new Notice(message);
    }
  }

  private renderQuizSection(): void {
    if (!this.quizSectionEl) {
      return;
    }

    this.quizSectionEl.empty();

    const header = this.quizSectionEl.createDiv({ cls: "teaching-assistant-section-header" });
    header.createEl("h4", { text: "学习训练" });

    const actions = header.createDiv({ cls: "teaching-assistant-quiz-actions" });
    this.quizStartButtonEl = actions.createEl("button", {
      text: "开始训练",
      attr: {
        "aria-label": "开始训练",
      },
    });
    this.quizStartButtonEl.addEventListener("click", () => {
      void this.handleStartQuiz();
    });

    this.quizSubmitButtonEl = actions.createEl("button", {
      text: "提交答案",
      attr: {
        "aria-label": "提交训练答案",
      },
    });
    this.quizSubmitButtonEl.disabled = !this.currentQuizSession;
    this.quizSubmitButtonEl.addEventListener("click", () => {
      void this.handleSubmitQuiz();
    });

    this.quizStatusEl = this.quizSectionEl.createDiv({ cls: "teaching-assistant-quiz-status" });
    this.quizStatusEl.setAttr("role", "status");
    this.quizStatusEl.setAttr("aria-live", "polite");

    if (!this.currentQuizSession) {
      this.quizStatusEl.setText("暂无训练题目，先生成讲解后再开始训练。");
      return;
    }

    this.quizStatusEl.setText(`当前训练共 ${this.currentQuizSession.items.length} 题。`);
    const quizList = this.quizSectionEl.createDiv({ cls: "teaching-assistant-quiz-list" });

    this.currentQuizSession.items.forEach((item, index) => {
      this.renderQuizItem(quizList, item, index);
    });
  }

  private renderQuizItem(container: HTMLDivElement, item: QuizItem, index: number): void {
    const card = container.createDiv({ cls: "teaching-assistant-quiz-card" });
    card.createEl("h5", { text: `${index + 1}. ${item.stem}` });

    const options = card.createDiv({ cls: "teaching-assistant-quiz-options" });
    item.options.forEach((option, optionIndex) => {
      const optionLabel = options.createEl("label", { cls: "teaching-assistant-quiz-option" });
      const optionId = `teaching-assistant-quiz-${item.id}-${optionIndex}`;
      const input = optionLabel.createEl("input", {
        attr: {
          id: optionId,
          type: "radio",
          name: `quiz-${item.id}`,
          value: option,
        },
      });

      if (this.selectedAnswers[item.id] === option) {
        input.checked = true;
      }

      input.addEventListener("change", () => {
        if (input.checked) {
          this.selectedAnswers[item.id] = option;
        }
      });

      optionLabel.createSpan({ text: option });
    });
  }

  private renderReviewSection(): void {
    if (!this.reviewSectionEl) {
      return;
    }

    this.reviewSectionEl.empty();

    const header = this.reviewSectionEl.createDiv({ cls: "teaching-assistant-section-header" });
    header.createEl("h4", { text: "今日待复习" });
    const actions = header.createDiv({ cls: "teaching-assistant-review-actions" });
    this.refreshReviewButtonEl = actions.createEl("button", {
      text: "刷新",
      attr: {
        "aria-label": "刷新今日待复习队列",
      },
    });
    this.refreshReviewButtonEl.addEventListener("click", () => {
      void this.handleRefreshReview();
    });

    if (this.reviewQueue.length === 0) {
      this.reviewSectionEl.createEl("p", { text: "今天暂无待复习题目。" });
      return;
    }

    const list = this.reviewSectionEl.createEl("ul", { cls: "teaching-assistant-review-list" });
    this.reviewQueue.forEach((task) => {
      const item = list.createEl("li");
      const nextTime = new Date(task.nextReviewAt).toLocaleString();
      item.setText(`${task.questionId} · 下次复习 ${nextTime}`);
    });
  }

  private renderDashboardSection(): void {
    if (!this.dashboardSectionEl) {
      return;
    }

    this.dashboardSectionEl.empty();
    this.dashboardSectionEl.createEl("h4", { text: "学习统计" });

    if (!this.dashboard) {
      this.dashboardSectionEl.createEl("p", { text: "暂无学习统计数据。" });
      return;
    }

    const metrics = this.dashboardSectionEl.createDiv({ cls: "teaching-assistant-dashboard-metrics" });
    metrics.createDiv({
      cls: "teaching-assistant-dashboard-metric",
      text: `今日完成：${this.dashboard.todayDone}/${this.dashboard.todayTarget}`,
    });
    metrics.createDiv({
      cls: "teaching-assistant-dashboard-metric",
      text: `7 日正确率：${this.dashboard.accuracy7d.toFixed(1)}%`,
    });
    metrics.createDiv({
      cls: "teaching-assistant-dashboard-metric",
      text: `重复错题率：${this.dashboard.repeatWrongRate.toFixed(1)}%`,
    });

    const weak = this.dashboardSectionEl.createDiv({ cls: "teaching-assistant-dashboard-weak" });
    weak.createEl("strong", { text: "薄弱章节" });

    if (this.dashboard.weakChapters.length === 0) {
      weak.createEl("p", { text: "暂无薄弱章节数据。" });
      return;
    }

    const list = weak.createEl("ul");
    this.dashboard.weakChapters.forEach((chapter) => {
      list.createEl("li", { text: `${chapter.chapter} · ${chapter.score.toFixed(1)}%` });
    });
  }

  private updateQuizStatus(message: string): void {
    if (!this.quizStatusEl) {
      return;
    }

    this.quizStatusEl.setText(message);
  }

  private async renderResult(result: TeachingResult, lectureChapter?: string): Promise<void> {
    if (!this.outputEl) {
      return;
    }

    this.outputEl.empty();
    const explanationWithLinks = decorateCitationReferences(
      result.explanation,
      result.sources.length,
    );

    await MarkdownRenderer.render(
      this.app,
      explanationWithLinks,
      this.outputEl,
      "",
      this,
    );

    if (result.cards && result.cards.length > 0) {
      const boardEl = this.outputEl.createDiv({ cls: "teaching-assistant-board" });
      boardEl.createEl("h4", { text: "板书式要点卡片" });

      const saveButton = boardEl.createEl("button", { text: "保存板书卡片为新笔记" });
      saveButton.addEventListener("click", () => {
        const chapter = lectureChapter ?? this.chapterSelectEl?.value.trim() ?? "未命名章节";
        void this.handleSaveCards(chapter, result.cards ?? []);
      });

      for (const card of result.cards) {
        const cardEl = boardEl.createDiv({ cls: "teaching-assistant-board-card" });
        cardEl.createEl("h5", { text: card.title });
        const list = cardEl.createEl("ul");
        for (const bullet of card.bullets) {
          list.createEl("li", { text: bullet });
        }
      }
    }

    const sourcesEl = this.outputEl.createDiv({ cls: "teaching-assistant-sources" });
    sourcesEl.createEl("h4", { text: "教材来源" });

    result.sources.forEach((source, index) => {
      const card = sourcesEl.createDiv({ cls: "teaching-assistant-source-card" });
      card.id = `teaching-assistant-source-${index + 1}`;
      card.createEl("strong", {
        text: `[S${index + 1}] ${source.headingPath}`,
      });
      card.createEl("div", {
        cls: "teaching-assistant-source-path",
        text: `${source.path}`,
      });
      card.createEl("div", {
        cls: "teaching-assistant-source-excerpt",
        text: source.excerpt,
      });

      const openButton = card.createEl("button", { text: "打开原文" });
      openButton.addEventListener("click", () => {
        void this.app.workspace.openLinkText(source.path, "", false);
      });
    });
  }

  private renderError(message: string): void {
    if (!this.outputEl) {
      return;
    }

    this.outputEl.empty();
    this.outputEl.createEl("p", { text: `错误：${message}` });
  }

  private async handleSaveCards(chapter: string, cards: BlackboardCard[]): Promise<void> {
    if (cards.length === 0) {
      new Notice("当前没有可保存的板书卡片。");
      return;
    }

    try {
      const notePath = await this.host.saveBlackboardCards(chapter, cards);
      new Notice(`已保存板书笔记：${notePath}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "保存板书笔记失败。";
      new Notice(message);
    }
  }
}
