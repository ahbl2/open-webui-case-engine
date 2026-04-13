/**
 * P101-04 / P101-05 — Proposal draft helpers: parse, whitelist, traceability (no network).
 * Aligned with Case Engine `caseProposalLifecycleService` approval key sets (excluding `ai_trace`, added on submit).
 */

/** Matches Case Engine `caseProposalsService` source ref kinds (create-time validation). */
export const P101_SOURCE_REF_KINDS = ['timeline_entry', 'case_file', 'case_task', 'notebook_note'] as const;
export type P101SourceRefKind = (typeof P101_SOURCE_REF_KINDS)[number];

export const TIMELINE_PAYLOAD_KEYS = [
	'occurred_at',
	'type',
	'text_original',
	'text_cleaned',
	'location_text',
	'tags'
] as const;

export const TASK_PAYLOAD_KEYS = [
	'title',
	'description',
	'timeline_entry_id',
	'assignee_user_id',
	'due_date',
	'priority',
	'group_label'
] as const;

export type P101ProposalType = 'timeline_entry' | 'task';

export type P101AiTraceV1 = {
	schema_version: 1;
	user_instructions: string;
	optional_context_text?: string;
	model_id?: string;
	ai_raw_response_excerpt: string;
};

export function extractJsonObjectFromAiText(
	raw: string
): { ok: true; value: unknown } | { ok: false; error: string } {
	const trimmed = raw.trim();
	if (!trimmed) {
		return { ok: false, error: 'AI returned empty content' };
	}
	try {
		return { ok: true, value: JSON.parse(trimmed) };
	} catch {
		const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
		if (fence) {
			try {
				return { ok: true, value: JSON.parse(fence[1].trim()) };
			} catch {
				return { ok: false, error: 'AI returned invalid JSON inside a code fence' };
			}
		}
		return { ok: false, error: 'AI returned non-JSON output' };
	}
}

export function parseSourceRefsJson(
	raw: string
): { ok: true; value: unknown[] } | { ok: false; error: string } {
	const t = raw.trim();
	if (!t) {
		return { ok: true, value: [] };
	}
	try {
		const v = JSON.parse(t) as unknown;
		if (!Array.isArray(v)) {
			return { ok: false, error: 'source_refs must be a JSON array' };
		}
		return { ok: true, value: v };
	} catch {
		return { ok: false, error: 'source_refs must be valid JSON' };
	}
}

/**
 * P101-05 — Structural validation only (same rules as Case Engine create); does not verify ids exist server-side.
 */
export function validateSourceRefsStructure(
	arr: unknown[]
): { ok: true; value: unknown[] } | { ok: false; error: string } {
	for (let i = 0; i < arr.length; i++) {
		const item = arr[i];
		if (item === null || typeof item !== 'object' || Array.isArray(item)) {
			return { ok: false, error: `source_refs[${i}] must be an object` };
		}
		const o = item as Record<string, unknown>;
		const kind = typeof o.kind === 'string' ? o.kind.trim() : '';
		const id = typeof o.id === 'string' ? o.id.trim() : '';
		if (!kind || !id) {
			return { ok: false, error: `source_refs[${i}] requires string kind and id` };
		}
		if (!P101_SOURCE_REF_KINDS.includes(kind as P101SourceRefKind)) {
			return {
				ok: false,
				error: `source_refs[${i}].kind must be one of: ${P101_SOURCE_REF_KINDS.join(', ')}`
			};
		}
	}
	return { ok: true, value: arr };
}

export function parseAndValidateSourceRefsJson(
	raw: string
): { ok: true; value: unknown[] } | { ok: false; error: string } {
	const p = parseSourceRefsJson(raw);
	if (!p.ok) {
		return p;
	}
	return validateSourceRefsStructure(p.value);
}

export function isP101ProposalType(v: unknown): v is P101ProposalType {
	return v === 'timeline_entry' || v === 'task';
}

export function whitelistTimelinePayload(
	obj: unknown
): { ok: true; data: Record<string, unknown> } | { ok: false; error: string } {
	if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) {
		return { ok: false, error: 'timeline_entry proposal must be a JSON object' };
	}
	const src = obj as Record<string, unknown>;
	const out: Record<string, unknown> = {};
	for (const k of TIMELINE_PAYLOAD_KEYS) {
		if (Object.prototype.hasOwnProperty.call(src, k)) {
			out[k] = src[k];
		}
	}
	if (typeof out.occurred_at !== 'string' || !String(out.occurred_at).trim()) {
		return { ok: false, error: 'occurred_at is required (ISO 8601 with timezone)' };
	}
	if (typeof out.type !== 'string' || !String(out.type).trim()) {
		return { ok: false, error: 'type is required' };
	}
	if (typeof out.text_original !== 'string') {
		return { ok: false, error: 'text_original is required' };
	}
	return { ok: true, data: out };
}

export function whitelistTaskPayload(
	obj: unknown
): { ok: true; data: Record<string, unknown> } | { ok: false; error: string } {
	if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) {
		return { ok: false, error: 'task proposal must be a JSON object' };
	}
	const src = obj as Record<string, unknown>;
	const out: Record<string, unknown> = {};
	for (const k of TASK_PAYLOAD_KEYS) {
		if (Object.prototype.hasOwnProperty.call(src, k)) {
			out[k] = src[k];
		}
	}
	if (typeof out.title !== 'string' || !String(out.title).trim()) {
		return { ok: false, error: 'title is required' };
	}
	return { ok: true, data: out };
}

export function buildAiTraceV1(params: {
	userInstructions: string;
	optionalContextText?: string;
	modelId?: string;
	rawAiResponse: string;
}): P101AiTraceV1 {
	const excerpt = String(params.rawAiResponse ?? '').slice(0, 8000);
	return {
		schema_version: 1,
		user_instructions: String(params.userInstructions ?? '').slice(0, 50_000),
		optional_context_text: params.optionalContextText
			? String(params.optionalContextText).slice(0, 50_000)
			: undefined,
		model_id: params.modelId ? String(params.modelId).slice(0, 256) : undefined,
		ai_raw_response_excerpt: excerpt
	};
}

export function mergePayloadWithAiTrace(
	whitelistData: Record<string, unknown>,
	aiTrace: P101AiTraceV1
): Record<string, unknown> {
	return { ...whitelistData, ai_trace: aiTrace };
}

export function buildTimelineDraftPrompts(params: {
	userInstructions: string;
	optionalContextText?: string;
}): { system: string; user: string } {
	const system = `You output ONLY one JSON object. No markdown fences, no commentary before or after.

Required keys: "occurred_at" (string, ISO 8601 with timezone, e.g. ending in Z or +00:00), "type" (non-empty string), "text_original" (string).

Optional keys: "text_cleaned" (string), "location_text" (string), "tags" (string or JSON-serializable value).

Do not invent facts. Use only USER_INSTRUCTIONS and OPTIONAL_CONTEXT. If a value is unknown, omit optional keys or use empty string only where the schema requires a string.`;

	const user = `USER_INSTRUCTIONS:\n${params.userInstructions}\n\nOPTIONAL_CONTEXT:\n${params.optionalContextText ?? ''}`;
	return { system, user };
}

export function buildTaskDraftPrompts(params: {
	userInstructions: string;
	optionalContextText?: string;
}): { system: string; user: string } {
	const system = `You output ONLY one JSON object. No markdown fences, no commentary before or after.

Required key: "title" (non-empty string).

Optional keys: "description" (string or null), "timeline_entry_id" (string or null), "assignee_user_id" (string or null), "due_date" (YYYY-MM-DD or null), "priority" ("low"|"medium"|"high" or null), "group_label" (string or null).

Do not invent facts. Use only USER_INSTRUCTIONS and OPTIONAL_CONTEXT. If a value is unknown, omit optional keys or use null where appropriate.`;

	const user = `USER_INSTRUCTIONS:\n${params.userInstructions}\n\nOPTIONAL_CONTEXT:\n${params.optionalContextText ?? ''}`;
	return { system, user };
}
