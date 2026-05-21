import { PluginSettingTab, Setting } from "obsidian";
import type { App, Plugin } from "obsidian";

import type { TeachingSettings } from "./types";

export const DEFAULT_SETTINGS: TeachingSettings = {
  apiBaseUrl: "https://api.deepseek.com/v1",
  apiKey: "",
  model: "deepseek-chat",
  textbookFolder: "",
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

export interface SettingsHost {
  settings: TeachingSettings;
  saveSettings(): Promise<void>;
}

export class TeachingAssistantSettingTab extends PluginSettingTab {
  constructor(
    app: App,
    private readonly host: SettingsHost & Plugin,
  ) {
    super(app, host);
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    new Setting(containerEl)
      .setName("API base URL")
      .setDesc("OpenAI-compatible endpoint, e.g. https://api.deepseek.com/v1")
      .addText((text) =>
        text
          .setPlaceholder("https://api.deepseek.com/v1")
          .setValue(this.host.settings.apiBaseUrl)
          .onChange(async (value) => {
            this.host.settings.apiBaseUrl = value.trim();
            await this.host.saveSettings();
          }),
      );

    new Setting(containerEl)
      .setName("API key")
      .setDesc("DeepSeek API key")
      .addText((text) => {
        text.inputEl.type = "password";
        return text
          .setPlaceholder("sk-...")
          .setValue(this.host.settings.apiKey)
          .onChange(async (value) => {
            this.host.settings.apiKey = value.trim();
            await this.host.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName("Model")
      .setDesc("Model name for chat completions")
      .addText((text) =>
        text
          .setPlaceholder("deepseek-chat")
          .setValue(this.host.settings.model)
          .onChange(async (value) => {
            this.host.settings.model = value.trim() || DEFAULT_SETTINGS.model;
            await this.host.saveSettings();
          }),
      );

    new Setting(containerEl)
      .setName("Textbook folder")
      .setDesc("Vault folder to index markdown textbook files, e.g. 教材")
      .addText((text) =>
        text
          .setPlaceholder("教材")
          .setValue(this.host.settings.textbookFolder)
          .onChange(async (value) => {
            this.host.settings.textbookFolder = value.trim();
            await this.host.saveSettings();
          }),
      );

    new Setting(containerEl)
      .setName("Max context characters")
      .setDesc("Upper bound of source text sent to the model per request")
      .addSlider((slider) =>
        slider
          .setLimits(1000, 15000, 500)
          .setValue(this.host.settings.maxContextChars)
          .setDynamicTooltip()
          .onChange(async (value) => {
            this.host.settings.maxContextChars = value;
            await this.host.saveSettings();
          }),
      );

    new Setting(containerEl)
      .setName("Request timeout (ms)")
      .setDesc("Timeout for each LLM request")
      .addText((text) =>
        text.setValue(String(this.host.settings.requestTimeoutMs)).onChange(async (value) => {
          const parsed = Number.parseInt(value, 10);
          this.host.settings.requestTimeoutMs = Number.isFinite(parsed)
            ? Math.max(1000, parsed)
            : DEFAULT_SETTINGS.requestTimeoutMs;
          await this.host.saveSettings();
        }),
      );

    new Setting(containerEl)
      .setName("Max source chunks")
      .setDesc("How many chunks to cite per answer")
      .addSlider((slider) =>
        slider
          .setLimits(1, 8, 1)
          .setValue(this.host.settings.maxSources)
          .setDynamicTooltip()
          .onChange(async (value) => {
            this.host.settings.maxSources = value;
            await this.host.saveSettings();
          }),
      );

    new Setting(containerEl)
      .setName("Daily review target")
      .setDesc("How many review questions to complete per day")
      .addText((text) =>
        text.setValue(String(this.host.settings.dailyReviewTarget)).onChange(async (value) => {
          const parsed = Number.parseInt(value, 10);
          this.host.settings.dailyReviewTarget = Number.isFinite(parsed)
            ? Math.min(100, Math.max(5, parsed))
            : DEFAULT_SETTINGS.dailyReviewTarget;
          await this.host.saveSettings();
        }),
      );

    new Setting(containerEl)
      .setName("Quiz question count")
      .setDesc("How many quiz questions to generate after explanation")
      .addText((text) =>
        text.setValue(String(this.host.settings.quizQuestionCount)).onChange(async (value) => {
          const parsed = Number.parseInt(value, 10);
          this.host.settings.quizQuestionCount = Number.isFinite(parsed)
            ? Math.min(20, Math.max(5, parsed))
            : DEFAULT_SETTINGS.quizQuestionCount;
          await this.host.saveSettings();
        }),
      );

    new Setting(containerEl)
      .setName("Auto open quiz after explanation")
      .setDesc("Automatically show quiz area after generating an explanation")
      .addToggle((toggle) =>
        toggle.setValue(this.host.settings.autoOpenQuizAfterExplain).onChange(async (value) => {
          this.host.settings.autoOpenQuizAfterExplain = value;
          await this.host.saveSettings();
        }),
      );

    new Setting(containerEl)
      .setName("Wrong notebook folder")
      .setDesc("Vault folder used when exporting wrong questions")
      .addText((text) =>
        text
          .setPlaceholder("错题本")
          .setValue(this.host.settings.wrongNotebookFolder)
          .onChange(async (value) => {
            this.host.settings.wrongNotebookFolder = value.trim() || DEFAULT_SETTINGS.wrongNotebookFolder;
            await this.host.saveSettings();
          }),
      );

    new Setting(containerEl)
      .setName("Enable retry on timeout")
      .setDesc("Retry requests once with reduced context after timeout")
      .addToggle((toggle) =>
        toggle.setValue(this.host.settings.enableRetryOnTimeout).onChange(async (value) => {
          this.host.settings.enableRetryOnTimeout = value;
          await this.host.saveSettings();
        }),
      );

    new Setting(containerEl)
      .setName("Temperature")
      .setDesc("Creativity level for explanation generation")
      .addSlider((slider) =>
        slider
          .setLimits(0, 1, 0.1)
          .setValue(this.host.settings.temperature)
          .setDynamicTooltip()
          .onChange(async (value) => {
            this.host.settings.temperature = value;
            await this.host.saveSettings();
          }),
      );
  }
}
