/**
 * P130-03 — Deterministic system + user prompts for AI Workspace (visible instructions only).
 * Serializes the in-memory {@link CaseRetrievalBundle} with bounded text fields (no hidden prompts).
 */
import type { CaseRetrievalBundle } from '$lib/case/caseRetrievalBundleTypes';

/** Visible version marker for tests and audits. */
export const AI_WORKSPACE_PROMPT_VERSION = 'p130-03-v1';

const MAX_USER_PROMPT_CHARS = 8000;
const MAX_TIMELINE_TEXT_CHARS = 2000;
const MAX_NOTE_TEXT_CHARS = 4000;
const MAX_FILE_EXTRACT_CHARS = 3000;
const MAX_BUNDLE_JSON_CHARS = 120000;

/** Phrases tests assert are present (guardrails embedded in system prompt). */
export const AI_WORKSPACE_GUARDRAIL_PHRASES = [
	'Do not infer',
	'Do not rank',
	'non-authoritative',
	'JSON object only',
	'source_backed_facts'
] as const;

export interface AiWorkspacePromptPayload {
	system: string;
	user: string;
}

function truncate(s: string, max: number): string {
	if (s.length <= max) return s;
	return `${s.slice(0, max)}…`;
}

/**
 * Deterministic JSON serialization of bundle for the user message (sorted keys, bounded size).
 */
export function serializeBundleForPrompt(bundle: CaseRetrievalBundle): string {
	const slim = {
		case_id: bundle.case_id,
		retrieved_at: bundle.retrieved_at,
		sources: {
			timeline: bundle.sources.timeline.map((e) => ({
				id: e.id,
				occurred_at: e.occurred_at,
				type: e.type,
				text_original: truncate(e.text_original ?? '', MAX_TIMELINE_TEXT_CHARS)
			})),
			notes: bundle.sources.notes.map((n) => ({
				id: n.id,
				title: n.title,
				current_text: truncate(n.current_text ?? '', MAX_NOTE_TEXT_CHARS)
			})),
			files: bundle.sources.files.map((f) => ({
				id: f.id,
				original_filename: f.original_filename,
				extracted_text: f.extracted_text
					? truncate(f.extracted_text, MAX_FILE_EXTRACT_CHARS)
					: null,
				file_text_error: f.file_text_error ?? null
			})),
			entities: bundle.sources.entities.map((e) => ({
				id: e.id,
				entity_type: e.entity_type,
				display_label: e.display_label
			})),
			workflow: bundle.sources.workflow.map((w) => ({
				workflow_item_id: w.workflow_item_id,
				title: w.title,
				status: w.status,
				workflow_type: w.workflow_type
			}))
		}
	};
	let json = JSON.stringify(slim);
	if (json.length > MAX_BUNDLE_JSON_CHARS) {
		json = truncate(json, MAX_BUNDLE_JSON_CHARS);
	}
	return json;
}

/**
 * Full system prompt (no external template files — all instructions live in source).
 */
export function buildAiWorkspaceSystemPrompt(): string {
	return [
		`You are assisting in the Detective Case Engine AI Workspace (${AI_WORKSPACE_PROMPT_VERSION}).`,
		'',
		'NON-NEGOTIABLE RULES:',
		'- Output MUST be a single JSON object only (no markdown fences, no commentary before or after).',
		'- Do not infer facts that are not explicitly present in the retrieval bundle JSON.',
		'- Do not rank, prioritize, score, or label items as "important", "best", or "key".',
		'- Do not present guesses as facts.',
		'- "source_backed_facts" may only contain statements directly supportable from the bundle; each fact MUST include refs pointing to supporting ids from the bundle.',
		'- "ai_generated_content" is non-authoritative: you may reorganize or rephrase only what is already implied by the bundle; do not introduce new factual claims.',
		'- "sources_used" MUST list the timeline entry ids, note ids, file ids (with extracted_text_used true/false), entity ids, and workflow item ids you actually relied on. Use only ids that exist in the bundle. If you used nothing, leave arrays empty and expect a traceability warning in the UI.',
		'',
		'REQUIRED JSON SHAPE:',
		'{',
		'  "source_backed_facts": [',
		'    {',
		'      "statement": "string",',
		'      "refs": {',
		'        "timeline_entry_ids": ["..."],',
		'        "note_ids": [1],',
		'        "file_ids": ["..."],',
		'        "entity_ids": ["..."],',
		'        "workflow_item_ids": ["..."]',
		'      }',
		'    }',
		'  ],',
		'  "ai_generated_content": "string",',
		'  "sources_used": {',
		'    "timeline_entry_ids": ["..."],',
		'    "note_ids": [1],',
		'    "file_ids": [{ "id": "file-id", "extracted_text_used": true }],',
		'    "entity_ids": ["..."],',
		'    "workflow_item_ids": ["..."]',
		'  }',
		'}',
		'',
		'Omit unknown keys. Use empty arrays when a category was not used.'
	].join('\n');
}

export function buildAiWorkspacePromptPayload(input: {
	caseId: string;
	userPrompt: string;
	bundle: CaseRetrievalBundle;
}): AiWorkspacePromptPayload {
	const caseId = String(input.caseId ?? '').trim();
	const userPrompt = truncate(String(input.userPrompt ?? '').trim(), MAX_USER_PROMPT_CHARS);
	const bundleJson = serializeBundleForPrompt(input.bundle);

	const user = [
		`case_id: ${caseId}`,
		'',
		'User request:',
		userPrompt || '(empty)',
		'',
		'Retrieval bundle JSON (only data you may cite):',
		bundleJson
	].join('\n');

	return {
		system: buildAiWorkspaceSystemPrompt(),
		user
	};
}
