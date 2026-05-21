# Teaching assistant (Obsidian plugin)

一个面向学生学习场景的 Obsidian 插件：基于教材 Markdown 自动检索相关片段，并通过 DeepSeek（OpenAI 兼容接口）生成知识点讲解。

## 功能概览

- 侧边栏教学面板：输入问题，按章节筛选，生成讲解。
- 教材目录索引：读取指定目录下的 Markdown 文件，按标题和段落切片。
- 轻量检索：关键词召回 + 评分排序。
- DeepSeek 调用：OpenAI 兼容 `/chat/completions`。
- 来源引用：讲解结果附带来源片段，支持一键打开原文。
- 老师讲课模式：选择教材章节后，一键生成课堂式讲解（纯讲解不反问）。
- 板书式要点卡片：老师讲课结果自动附带可复习的要点卡片。
- 一键保存板书：可将板书卡片直接保存为 Vault 新笔记（默认目录 `教学板书/`）。
- 学习闭环：讲解后可生成训练题（选择 + 判断），提交后即时判分并记录错因。
- 复习队列：错题自动进入复习计划，可查看“今日待复习”。
- 学习统计：展示今日完成、7 日正确率、重复错题率与薄弱章节。

## 安装与使用

1. 在插件目录执行：

```bash
npm install
npm run build
```

2. 将以下文件复制到你的 Vault 插件目录（例如 `.obsidian/plugins/teaching-assistant/`）：
   - `main.js`
   - `manifest.json`
   - `styles.css`

3. 在 Obsidian 中启用插件。

4. 打开插件设置并配置：
   - API base URL（默认 `https://api.deepseek.com/v1`）
   - API key
   - Model（默认 `deepseek-chat`）
   - Textbook folder（教材目录）
   - Request timeout (ms)
   - Daily review target（每日复习目标，5-100）
   - Quiz question count（每次训练题量，5-20）
   - Auto open quiz after explanation（讲解后自动进入训练）
   - Wrong notebook folder（错题本目录）
   - Enable retry on timeout（超时时降上下文重试）

5. 使用方式：
   - 通过命令 `Open teaching assistant sidebar` 打开侧边栏
   - 输入问题并点击“生成讲解”
   - 或选择章节后点击“老师讲课”（讲解下方会自动出现“板书式要点卡片”）
   - 在“学习训练”中点击“开始训练”，答题后点击“提交答案”
   - 在“今日待复习”查看当天复习队列，在“学习统计”查看学习趋势
   - 点击“保存板书卡片为新笔记”即可自动创建并打开新笔记

## 常见错误与处理

- `AUTH`：未配置 API key 或鉴权失败。请打开插件设置检查 API key。
- `TIMEOUT`：请求超时。插件会在开启重试时自动降上下文重试一次，建议提高 timeout。
- `RATE_LIMIT`：请求频率受限（429）。稍后重试。
- `PROVIDER`：模型服务异常（5xx 或网络侧异常）。稍后重试，必要时切换 endpoint。
- `PARSE`：模型返回结构不符合预期。可重试或缩小提问范围。

## 开发命令

```bash
npm run dev      # 监听构建
npm run build    # 生产构建
npm test         # 运行单元测试
npx tsc --noEmit # 类型检查
```

## 项目结构

- `main.ts`：插件入口，注册视图、命令、事件监听。
- `src/indexer.ts`：教材切片与索引。
- `src/retriever.ts`：轻量检索与排序。
- `src/llmClient.ts`：OpenAI 兼容模型调用。
- `src/prompt.ts`：Prompt 拼装。
- `src/appError.ts`：统一错误模型与错误码映射。
- `src/quizEngine.ts`：训练题生成与结构校验。
- `src/quizGrader.ts`：提交判分与错因分类。
- `src/reviewScheduler.ts`：复习计划与今日队列筛选。
- `src/learningStore.ts`：学习数据持久化与迁移。
- `src/workflow.ts`：讲解 -> 出题 -> 提交 -> 复习流程编排。
- `src/blackboard.ts`：板书卡片解析与笔记内容生成。
- `src/teachingView.ts`：侧边栏 UI。
- `src/settings.ts`：设置项与默认配置。
- `tests/`：核心逻辑测试。
