/**
 * P130-03 — Structured AI Workspace response (non-authoritative; in-memory only).
 * LLM must return JSON matching {@link AiWorkspaceLlmJsonV1}.
 */

/** Per-fact reference set (subset of bundle ids). */
export interface AiWorkspaceFactRefs {
	timeline_entry_ids?: string[];
	/** Notebook note ids (numeric in Case Engine). */
	note_ids?: number[];
	file_ids?: string[];
	entity_ids?: string[];
	workflow_item_ids?: string[];
}

export interface AiWorkspaceSourceBackedFact {
	statement: string;
	refs: AiWorkspaceFactRefs;
}

/** File id + whether extracted text from bundle informed the response. */
export interface AiWorkspaceFileSourceUsed {
	id: string;
	extracted_text_used: boolean;
}

/** Declared sources used in the answer (may be a subset of the retrieval bundle). */
export interface AiWorkspaceSourcesUsed {
	timeline_entry_ids: string[];
	note_ids: number[];
	file_ids: AiWorkspaceFileSourceUsed[];
	entity_ids: string[];
	workflow_item_ids: string[];
}

/**
 * Strict JSON contract returned by the model (parse with {@link parseAiWorkspaceLlmJson}).
 */
export interface AiWorkspaceLlmJsonV1 {
	source_backed_facts: AiWorkspaceSourceBackedFact[];
	ai_generated_content: string;
	sources_used: AiWorkspaceSourcesUsed;
}

export type AiWorkspaceParseResult =
	| {
			ok: true;
			data: AiWorkspaceLlmJsonV1;
			/** Non-blocking traceability / consistency notices. */
			warnings: string[];
	  }
	| {
			ok: false;
			kind: 'parse' | 'schema';
			message: string;
			rawExcerpt?: string;
	  };
