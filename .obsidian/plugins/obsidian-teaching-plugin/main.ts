import type { TAbstractFile, WorkspaceLeaf } from "obsidian";
import { Notice, Plugin, TFile } from "obsidian";

import {
	buildBlackboardNoteContent,
	buildBlackboardNoteFileName,
	parseBlackboardCards,
	resolveUniqueNotePath,
} from "./src/blackboard";
import {
	isMarkdownInFolder,
	splitMarkdownToChunks,
	TextbookIndexer,
} from "./src/indexer";
import { LearningStore, type LearningStoreStorage } from "./src/learningStore";
import { OpenAICompatibleClient } from "./src/llmClient";
import { QuizEngine } from "./src/quizEngine";
import {
  retrieveChapterChunksWithFallback,
  retrieveRelevantChunksWithFallback,
} from "./src/retrievalFallback";
import { buildDisplayedSources } from "./src/sourcePresentation";
import {
  DEFAULT_SETTINGS,
  type SettingsHost,
  TeachingAssistantSettingTab,
} from "./src/settings";
import { shouldRebuildIndex } from "./src/settingsPersistence";
import {
	TEACHING_VIEW_TYPE,
	TeachingAssistantView,
	type TeachingViewHost,
} from "./src/teachingView";
import type {
	AttemptRecord,
	BlackboardCard,
	LearningDashboard,
	QuizSession,
	QuizSubmission,
	ReviewTask,
	ScoredChunk,
	TeachingResult,
	TeachingSettings,
	TextChunk,
} from "./src/types";
import { StudyLoopWorkflow } from "./src/workflow";

const BOARD_NOTE_FOLDER = "教学板书";

interface AppWithSettingsPane {
	setting: {
		open(): void;
		openTabById(id: string): void;
	};
}

interface PersistedPluginData {
	settings?: Partial<TeachingSettings>;
	learning?: unknown;
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

export default class TeachingAssistantPlugin
	extends Plugin
	implements SettingsHost, TeachingViewHost
{
	settings: TeachingSettings = DEFAULT_SETTINGS;

	private indexer: TextbookIndexer | null = null;

	private learningStore: LearningStore | null = null;

	private studyLoop: StudyLoopWorkflow | null = null;

	private persistedLearningData: unknown = null;

	private activeDocumentChunks: TextChunk[] = [];

	override async onload(): Promise<void> {
		await this.loadSettings();
		await this.initializeLearningStore();
		await this.initializeIndexer();
		await this.refreshActiveDocumentChunks();

		this.registerView(
			TEACHING_VIEW_TYPE,
			(leaf) => new TeachingAssistantView(leaf, this),
		);

		this.addRibbonIcon("graduation-cap", "Open teaching assistant", () => {
			void this.activateTeachingView();
		});

		this.addCommand({
			id: "open-teaching-assistant",
			name: "Open teaching assistant sidebar",
			callback: () => {
				void this.activateTeachingView();
			},
		});

		this.addCommand({
			id: "rebuild-textbook-index",
			name: "Rebuild textbook index",
			callback: () => {
				void this.rebuildIndex(true);
			},
		});

		this.addSettingTab(new TeachingAssistantSettingTab(this.app, this));
		this.registerVaultEvents();
		this.registerWorkspaceEvents();
	}

	getChapterFolders(): string[] {
		const chapterFolders = this.indexer?.getChapterFolders() ?? [];
		if (chapterFolders.length > 0) {
			return chapterFolders;
		}

		const indexedHeadings = this.indexer?.getHeadings() ?? [];
		if (indexedHeadings.length > 0) {
			return indexedHeadings;
		}

		return this.getActiveDocumentHeadings();
	}

	async explain(question: string, chapter?: string): Promise<TeachingResult> {
		const indexedChunks = this.indexer?.getChunks() ?? [];
		const activeChunks = await this.getActiveDocumentChunks();

		if (indexedChunks.length === 0 && activeChunks.length === 0) {
			throw new Error(
				"未找到可用教材内容。请设置教材目录或先打开一个 Markdown 文档。",
			);
		}

		const ranked = retrieveRelevantChunksWithFallback(
			indexedChunks,
			activeChunks,
			question,
			{
				chapter,
				rootFolder: this.settings.textbookFolder,
				maxResults: Math.max(6, this.settings.maxSources * 3),
				preferActive: !this.settings.textbookFolder.trim(),
			},
		).chunks;

		const selected = this.selectChunksWithinContext(ranked);
		if (selected.length === 0 || selected[0]?.score === 0) {
			throw new Error("没有命中相关教材内容，请尝试更具体的关键词。");
		}

		const client = new OpenAICompatibleClient(this.settings);
		const explanation = await client.generateExplanation(question, selected);
		const sources = this.toSources(selected);
		this.requireStudyLoop().setExplanationSeed({
			question,
			chapter,
			chunks: selected,
		});

		return { explanation, sources };
	}

	async teachChapter(chapter: string): Promise<TeachingResult> {
		const normalizedChapter = chapter.trim();
		if (!normalizedChapter) {
			throw new Error("请先选择章节后再开始讲课。");
		}

		const indexedChunks = this.indexer?.getChunks() ?? [];
		const activeChunks = await this.getActiveDocumentChunks();

		if (indexedChunks.length === 0 && activeChunks.length === 0) {
			throw new Error(
				"未找到可用教材内容。请设置教材目录或先打开一个 Markdown 文档。",
			);
		}

		const ranked = retrieveChapterChunksWithFallback(
			indexedChunks,
			activeChunks,
			normalizedChapter,
			{
				rootFolder: this.settings.textbookFolder,
				maxResults: Math.max(8, this.settings.maxSources * 4),
				preferActive: !this.settings.textbookFolder.trim(),
			},
		).chunks;

		const selected = this.selectChunksWithinContext(ranked);
		if (selected.length === 0 || selected[0]?.score === 0) {
			throw new Error("该章节暂未找到可讲解的教材片段，请先检查教材内容。");
		}

		const client = new OpenAICompatibleClient(this.settings);
		const explanation = await client.generateTeacherLecture(
			normalizedChapter,
			selected,
		);
		const sources = this.toSources(selected);
		const cards = parseBlackboardCards(explanation);
		this.requireStudyLoop().setExplanationSeed({
			question: `讲解章节：${normalizedChapter}`,
			chapter: normalizedChapter,
			chunks: selected,
		});

		return { explanation, sources, cards };
	}

	async startQuizFromLastExplanation(count?: number): Promise<QuizSession> {
		const requestedCount = count ?? this.settings.quizQuestionCount;
		const normalizedCount = Math.min(20, Math.max(5, requestedCount));
		return this.requireStudyLoop().startQuizFromLastExplanation(
			normalizedCount,
		);
	}

	async submitQuiz(
		submission: QuizSubmission,
	): Promise<{ attempts: AttemptRecord[] }> {
		return this.requireStudyLoop().submitQuiz(submission);
	}

	async getTodayReviewQueue(): Promise<ReviewTask[]> {
		return this.requireStudyLoop().getTodayReviewQueue(
			this.settings.dailyReviewTarget,
		);
	}

	async getLearningDashboard(): Promise<LearningDashboard> {
		return this.requireStudyLoop().getLearningDashboard(
			this.settings.dailyReviewTarget,
		);
	}

	async saveBlackboardCards(
		chapter: string,
		cards: BlackboardCard[],
	): Promise<string> {
		if (cards.length === 0) {
			throw new Error("当前没有可保存的板书卡片。");
		}

		await this.ensureFolderExists(BOARD_NOTE_FOLDER);

		const fileName = buildBlackboardNoteFileName(chapter);
		const existingPaths = new Set(
			this.app.vault.getFiles().map((file) => file.path),
		);
		const notePath = resolveUniqueNotePath(
			BOARD_NOTE_FOLDER,
			fileName,
			existingPaths,
		);
		const noteContent = buildBlackboardNoteContent(chapter, cards);

		await this.app.vault.create(notePath, noteContent);
		await this.app.workspace.openLinkText(notePath, "", false);
		return notePath;
	}

	openPluginSettings(): void {
		const appWithSettings = this.app as unknown as Partial<AppWithSettingsPane>;
		if (!appWithSettings.setting) {
			new Notice("请手动打开设置并搜索 Teaching assistant。");
			return;
		}

		appWithSettings.setting.open();
		appWithSettings.setting.openTabById(this.manifest.id);
	}

	async saveSettings(): Promise<void> {
		const indexedFolderPath =
			this.indexer?.getFolderPath() ?? this.settings.textbookFolder;

		this.settings = {
			...DEFAULT_SETTINGS,
			...this.settings,
			textbookFolder: this.settings.textbookFolder.trim(),
			apiBaseUrl:
				this.settings.apiBaseUrl.trim() || DEFAULT_SETTINGS.apiBaseUrl,
			model: this.settings.model.trim() || DEFAULT_SETTINGS.model,
		};

		await this.persistPluginData();

		if (!this.indexer) {
			return;
		}

		if (!shouldRebuildIndex(indexedFolderPath, this.settings.textbookFolder)) {
			return;
		}

		this.indexer.setFolderPath(this.settings.textbookFolder);
		await this.rebuildIndex(false);
	}

	private async loadSettings(): Promise<void> {
		const loaded = (await this.loadData()) as
			| PersistedPluginData
			| Partial<TeachingSettings>
			| null;
		const loadedSettings = this.extractSettingsFromPersistedData(loaded);
		this.settings = {
			...DEFAULT_SETTINGS,
			...loadedSettings,
		};

		this.persistedLearningData = this.extractLearningFromPersistedData(loaded);
	}

	private async initializeLearningStore(): Promise<void> {
		this.learningStore = new LearningStore(this.createLearningStoreStorage());
		await this.learningStore.initialize();
		this.studyLoop = new StudyLoopWorkflow(
			this.learningStore,
			() => new QuizEngine(new OpenAICompatibleClient(this.settings)),
		);
	}

	private createLearningStoreStorage(): LearningStoreStorage {
		return {
			load: async () => this.persistedLearningData,
			save: async (data) => {
				this.persistedLearningData = data;
				await this.persistPluginData();
			},
		};
	}

	private async persistPluginData(): Promise<void> {
		await this.saveData({
			settings: this.settings,
			learning: this.persistedLearningData,
		} satisfies PersistedPluginData);
	}

	private extractSettingsFromPersistedData(
		loaded: PersistedPluginData | Partial<TeachingSettings> | null,
	): Partial<TeachingSettings> {
		if (!isObjectRecord(loaded)) {
			return {};
		}

		const persisted = loaded as PersistedPluginData;
		if (isObjectRecord(persisted.settings)) {
			return persisted.settings as Partial<TeachingSettings>;
		}

		return loaded as Partial<TeachingSettings>;
	}

	private extractLearningFromPersistedData(
		loaded: PersistedPluginData | Partial<TeachingSettings> | null,
	): unknown {
		if (!isObjectRecord(loaded)) {
			return null;
		}

		if ("learning" in loaded) {
			return loaded.learning ?? null;
		}

		return null;
	}

	private requireStudyLoop(): StudyLoopWorkflow {
		if (!this.studyLoop) {
			throw new Error("Study loop is not initialized.");
		}

		return this.studyLoop;
	}

	private async initializeIndexer(): Promise<void> {
		this.indexer = new TextbookIndexer(this.app, this.settings.textbookFolder);
		await this.indexer.buildIndex();
	}

	private registerVaultEvents(): void {
		this.registerEvent(
			this.app.vault.on("modify", (file) => {
				void this.handleFileModify(file);
			}),
		);

		this.registerEvent(
			this.app.vault.on("create", (file) => {
				void this.handleFileModify(file);
			}),
		);

		this.registerEvent(
			this.app.vault.on("delete", (file) => {
				this.handleFileDelete(file);
			}),
		);

		this.registerEvent(
			this.app.vault.on("rename", (file, oldPath) => {
				void this.handleFileRename(file, oldPath);
			}),
		);
	}

	private registerWorkspaceEvents(): void {
		this.registerEvent(
			this.app.workspace.on("file-open", () => {
				void this.refreshActiveDocumentChunks();
			}),
		);
	}

	private async handleFileModify(file: TAbstractFile): Promise<void> {
		if (!(file instanceof TFile) || !this.indexer) {
			return;
		}

		if (this.isActiveDocumentFile(file.path)) {
			await this.refreshActiveDocumentChunks();
		}

		if (!isMarkdownInFolder(file.path, this.settings.textbookFolder)) {
			return;
		}

		await this.indexer.indexFile(file);
		this.refreshTeachingViews();
	}

	private handleFileDelete(file: TAbstractFile): void {
		if (!(file instanceof TFile) || !this.indexer) {
			return;
		}

		if (this.isActiveDocumentFile(file.path)) {
			this.activeDocumentChunks = [];
		}

		if (!isMarkdownInFolder(file.path, this.settings.textbookFolder)) {
			return;
		}

		this.indexer.removeFile(file.path);
		this.refreshTeachingViews();
	}

	private async handleFileRename(
		file: TAbstractFile,
		oldPath: string,
	): Promise<void> {
		if (!(file instanceof TFile) || !this.indexer) {
			return;
		}

		if (
			this.isActiveDocumentFile(oldPath) ||
			this.isActiveDocumentFile(file.path)
		) {
			await this.refreshActiveDocumentChunks();
		}

		this.indexer.removeFile(oldPath);
		if (isMarkdownInFolder(file.path, this.settings.textbookFolder)) {
			await this.indexer.indexFile(file);
		}
		this.refreshTeachingViews();
	}

	private refreshTeachingViews(): void {
		const leaves = this.app.workspace.getLeavesOfType(TEACHING_VIEW_TYPE);
		for (const leaf of leaves) {
			const view = leaf.view;
			if (view instanceof TeachingAssistantView) {
				view.refreshHeadings();
			}
		}
	}

	private selectChunksWithinContext(
		rankedChunks: ScoredChunk[],
	): ScoredChunk[] {
		const selected: ScoredChunk[] = [];
		let usedChars = 0;

		for (const item of rankedChunks) {
			if (item.score <= 0 && selected.length > 0) {
				continue;
			}

			const chunkLength = item.chunk.content.length;
			if (
				selected.length > 0 &&
				usedChars + chunkLength > this.settings.maxContextChars
			) {
				break;
			}

			selected.push(item);
			usedChars += chunkLength;

			if (selected.length >= Math.max(this.settings.maxSources, 1) * 2) {
				break;
			}
		}

		return selected;
	}

	private toSources(selected: ScoredChunk[]): TeachingResult["sources"] {
		return buildDisplayedSources(selected);
	}

	private async activateTeachingView(): Promise<void> {
		const leaf = this.getTeachingLeaf();
		await leaf.setViewState({
			type: TEACHING_VIEW_TYPE,
			active: true,
		});
		this.app.workspace.revealLeaf(leaf);
	}

	private getTeachingLeaf(): WorkspaceLeaf {
		const existing = this.app.workspace.getLeavesOfType(TEACHING_VIEW_TYPE)[0];
		if (existing) {
			return existing;
		}

		const rightLeaf = this.app.workspace.getRightLeaf(false);
		if (!rightLeaf) {
			throw new Error(
				"Failed to create a sidebar leaf for teaching assistant.",
			);
		}
		return rightLeaf;
	}

	private async rebuildIndex(notify: boolean): Promise<void> {
		if (!this.indexer) {
			return;
		}

		await this.indexer.buildIndex();
		this.refreshTeachingViews();

		if (notify) {
			new Notice(
				`教材索引已重建，共 ${this.indexer.getChunks().length} 个片段。`,
			);
		}
	}

	private isActiveDocumentFile(filePath: string): boolean {
		const activeFile = this.app.workspace.getActiveFile();
		return activeFile?.path === filePath;
	}

	private async refreshActiveDocumentChunks(): Promise<void> {
		const activeFile = this.app.workspace.getActiveFile();
		if (
			!(activeFile instanceof TFile) ||
			!activeFile.path.toLowerCase().endsWith(".md")
		) {
			this.activeDocumentChunks = [];
			this.refreshTeachingViews();
			return;
		}

		const markdown = await this.app.vault.cachedRead(activeFile);
		this.activeDocumentChunks = splitMarkdownToChunks(
			markdown,
			activeFile.path,
		);
		this.refreshTeachingViews();
	}

	private async getActiveDocumentChunks(): Promise<TextChunk[]> {
		await this.refreshActiveDocumentChunks();
		return this.activeDocumentChunks;
	}

	private getActiveDocumentHeadings(): string[] {
		return [
			...new Set(this.activeDocumentChunks.map((chunk) => chunk.headingPath)),
		].sort((a, b) => a.localeCompare(b, "zh-CN"));
	}

	private async ensureFolderExists(folderPath: string): Promise<void> {
		const normalized = folderPath
			.replace(/\\/g, "/")
			.replace(/^\/+/, "")
			.replace(/\/+$/, "");
		if (!normalized) {
			return;
		}

		const segments = normalized
			.split("/")
			.filter((segment) => segment.length > 0);
		let currentPath = "";

		for (const segment of segments) {
			currentPath = currentPath ? `${currentPath}/${segment}` : segment;
			const existing = this.app.vault.getAbstractFileByPath(currentPath);
			if (!existing) {
				await this.app.vault.createFolder(currentPath);
			}
		}
	}
}
