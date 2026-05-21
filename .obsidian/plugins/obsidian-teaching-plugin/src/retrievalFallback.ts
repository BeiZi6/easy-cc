import {
	type RetrievalOptions,
	retrieveChapterChunks,
	retrieveRelevantChunks,
} from "./retriever";
import type { ScoredChunk, TextChunk } from "./types";

export type RetrievalSource = "index" | "active" | "none";

export interface RetrievalFallbackOptions extends RetrievalOptions {
	preferActive?: boolean;
}

export interface RetrievalFallbackResult {
	source: RetrievalSource;
	chunks: ScoredChunk[];
}

function hasEffectiveHit(chunks: ScoredChunk[]): boolean {
	return chunks.length > 0 && (chunks[0]?.score ?? 0) > 0;
}

function toRelevantOptions(
	options: RetrievalFallbackOptions,
): RetrievalOptions {
	return {
		chapter: options.chapter,
		rootFolder: options.rootFolder,
		maxResults: options.maxResults,
	};
}

function toActiveRelevantOptions(
	options: RetrievalFallbackOptions,
): RetrievalOptions {
	return {
		chapter: options.chapter,
		maxResults: options.maxResults,
	};
}

function toChapterOptions(options: RetrievalFallbackOptions): RetrievalOptions {
	return {
		rootFolder: options.rootFolder,
		maxResults: options.maxResults,
	};
}

function toActiveChapterOptions(
	options: RetrievalFallbackOptions,
): RetrievalOptions {
	return {
		maxResults: options.maxResults,
	};
}

export function retrieveChapterChunksWithFallback(
	indexedChunks: TextChunk[],
	activeChunks: TextChunk[],
	chapter: string,
	options: RetrievalFallbackOptions = {},
): RetrievalFallbackResult {
	const preferActive = options.preferActive === true;

	const indexedResult = () =>
		retrieveChapterChunks(indexedChunks, chapter, toChapterOptions(options));
	const activeResult = () =>
		retrieveChapterChunks(
			activeChunks,
			chapter,
			toActiveChapterOptions(options),
		);

	if (preferActive) {
		const active = activeResult();
		if (active.length > 0) {
			return { source: "active", chunks: active };
		}

		const index = indexedResult();
		if (index.length > 0) {
			return { source: "index", chunks: index };
		}

		return { source: "none", chunks: [] };
	}

	const index = indexedResult();
	if (index.length > 0) {
		return { source: "index", chunks: index };
	}

	const active = activeResult();
	if (active.length > 0) {
		return { source: "active", chunks: active };
	}

	return { source: "none", chunks: [] };
}

export function retrieveRelevantChunksWithFallback(
	indexedChunks: TextChunk[],
	activeChunks: TextChunk[],
	query: string,
	options: RetrievalFallbackOptions = {},
): RetrievalFallbackResult {
	const preferActive = options.preferActive === true;

	const indexedResult = () =>
		retrieveRelevantChunks(indexedChunks, query, toRelevantOptions(options));
	const activeResult = () =>
		retrieveRelevantChunks(
			activeChunks,
			query,
			toActiveRelevantOptions(options),
		);

	if (preferActive) {
		const active = activeResult();
		if (hasEffectiveHit(active)) {
			return { source: "active", chunks: active };
		}

		const index = indexedResult();
		if (hasEffectiveHit(index)) {
			return { source: "index", chunks: index };
		}

		return { source: "none", chunks: active.length > 0 ? active : index };
	}

	const index = indexedResult();
	if (hasEffectiveHit(index)) {
		return { source: "index", chunks: index };
	}

	const active = activeResult();
	if (hasEffectiveHit(active)) {
		return { source: "active", chunks: active };
	}

	return { source: "none", chunks: index.length > 0 ? index : active };
}
