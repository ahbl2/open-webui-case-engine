/**
 * P130-03 — Parse LLM output into {@link AiWorkspaceLlmJsonV1}; validate + traceability warnings.
 */
import type { CaseRetrievalBundle } from '$lib/case/caseRetrievalBundleTypes';
import { extractJsonObjectFromAiText } from '$lib/case/p101AiCaseProposalDraft';
import type {
	AiWorkspaceFactRefs,
	AiWorkspaceFileSourceUsed,
	AiWorkspaceLlmJsonV1,
	AiWorkspaceParseResult,
	AiWorkspaceSourceBackedFact,
	AiWorkspaceSourcesUsed
} from '$lib/case/aiWorkspaceResponseTypes';

export const AI_WORKSPACE_TRACEABILITY_EMPTY_SOURCES_WARNING =
	'Response lacks traceable support';

function isNonEmptyString(v: unknown): v is string {
	return typeof v === 'string' && v.trim().length > 0;
}

function asStringArray(v: unknown): string[] {
	if (!Array.isArray(v)) return [];
	return v.filter((x): x is string => typeof x === 'string');
}

function asNumberArray(v: unknown): number[] {
	if (!Array.isArray(v)) return [];
	return v.filter((x): x is number => typeof x === 'number' && Number.isFinite(x));
}

function normalizeFactRefs(raw: unknown): AiWorkspaceFactRefs {
	if (raw == null || typeof raw !== 'object') return {};
	const o = raw as Record<string, unknown>;
	return {
		timeline_entry_ids: asStringArray(o.timeline_entry_ids),
		note_ids: asNumberArray(o.note_ids),
		file_ids: asStringArray(o.file_ids),
		entity_ids: asStringArray(o.entity_ids),
		workflow_item_ids: asStringArray(o.workflow_item_ids)
	};
}

function normalizeSourcesUsed(raw: unknown): AiWorkspaceSourcesUsed | null {
	if (raw == null || typeof raw !== 'object') return null;
	const o = raw as Record<string, unknown>;
	const fileRaw = o.file_ids;
	const file_ids: AiWorkspaceFileSourceUsed[] = [];
	if (Array.isArray(fileRaw)) {
		for (const row of fileRaw) {
			if (row != null && typeof row === 'object' && typeof (row as { id?: unknown }).id === 'string') {
				file_ids.push({
					id: (row as { id: string }).id,
					extracted_text_used: Boolean((row as { extracted_text_used?: unknown }).extracted_text_used)
				});
			}
		}
	}
	return {
		timeline_entry_ids: asStringArray(o.timeline_entry_ids),
		note_ids: asNumberArray(o.note_ids),
		file_ids,
		entity_ids: asStringArray(o.entity_ids),
		workflow_item_ids: asStringArray(o.workflow_item_ids)
	};
}

function normalizeFacts(raw: unknown): AiWorkspaceSourceBackedFact[] | null {
	if (!Array.isArray(raw)) return null;
	const out: AiWorkspaceSourceBackedFact[] = [];
	for (const item of raw) {
		if (item == null || typeof item !== 'object') return null;
		const statement = (item as { statement?: unknown }).statement;
		if (!isNonEmptyString(statement)) return null;
		out.push({
			statement: statement.trim(),
			refs: normalizeFactRefs((item as { refs?: unknown }).refs)
		});
	}
	return out;
}

/**
 * Parse and validate model output. Does not call network.
 */
export function parseAiWorkspaceLlmJson(raw: string): AiWorkspaceParseResult {
	const extracted = extractJsonObjectFromAiText(raw);
	if (!extracted.ok) {
		return {
			ok: false,
			kind: 'parse',
			message: extracted.error,
			rawExcerpt: raw.length > 400 ? `${raw.slice(0, 400)}…` : raw
		};
	}
	const v = extracted.value;
	if (v == null || typeof v !== 'object') {
		return { ok: false, kind: 'schema', message: 'Root must be a JSON object' };
	}
	const o = v as Record<string, unknown>;
	const facts = normalizeFacts(o.source_backed_facts);
	if (facts === null) {
		return { ok: false, kind: 'schema', message: 'source_backed_facts must be a valid array' };
	}
	if (typeof o.ai_generated_content !== 'string') {
		return { ok: false, kind: 'schema', message: 'ai_generated_content must be a string' };
	}
	const sources_used = normalizeSourcesUsed(o.sources_used);
	if (!sources_used) {
		return { ok: false, kind: 'schema', message: 'sources_used must be an object' };
	}
	const data: AiWorkspaceLlmJsonV1 = {
		source_backed_facts: facts,
		ai_generated_content: o.ai_generated_content,
		sources_used
	};
	return { ok: true, data, warnings: [] };
}

function idSetTimeline(bundle: CaseRetrievalBundle): Set<string> {
	return new Set(bundle.sources.timeline.map((e) => e.id));
}
function idSetNotes(bundle: CaseRetrievalBundle): Set<number> {
	return new Set(bundle.sources.notes.map((n) => n.id));
}
function idSetFiles(bundle: CaseRetrievalBundle): Set<string> {
	return new Set(bundle.sources.files.map((f) => f.id));
}
function idSetEntities(bundle: CaseRetrievalBundle): Set<string> {
	return new Set(bundle.sources.entities.map((e) => e.id));
}
function idSetWorkflow(bundle: CaseRetrievalBundle): Set<string> {
	return new Set(bundle.sources.workflow.map((w) => w.workflow_item_id));
}

function hasAnyRef(refs: AiWorkspaceFactRefs): boolean {
	return (
		(refs.timeline_entry_ids?.length ?? 0) > 0 ||
		(refs.note_ids?.length ?? 0) > 0 ||
		(refs.file_ids?.length ?? 0) > 0 ||
		(refs.entity_ids?.length ?? 0) > 0 ||
		(refs.workflow_item_ids?.length ?? 0) > 0
	);
}

function sourcesUsedIsEmpty(s: AiWorkspaceSourcesUsed): boolean {
	return (
		s.timeline_entry_ids.length === 0 &&
		s.note_ids.length === 0 &&
		s.file_ids.length === 0 &&
		s.entity_ids.length === 0 &&
		s.workflow_item_ids.length === 0
	);
}

/**
 * Warnings for traceability / consistency (non-blocking).
 */
export function computeTraceabilityWarnings(
	data: AiWorkspaceLlmJsonV1,
	bundle: CaseRetrievalBundle
): string[] {
	const warnings: string[] = [];

	if (sourcesUsedIsEmpty(data.sources_used)) {
		warnings.push(AI_WORKSPACE_TRACEABILITY_EMPTY_SOURCES_WARNING);
	}

	for (const fact of data.source_backed_facts) {
		if (!hasAnyRef(fact.refs)) {
			warnings.push('A source-backed fact is missing refs');
			break;
		}
	}

	const tSet = idSetTimeline(bundle);
	const nSet = idSetNotes(bundle);
	const fSet = idSetFiles(bundle);
	const eSet = idSetEntities(bundle);
	const wSet = idSetWorkflow(bundle);

	const check = (label: string, ids: string[], allowed: Set<string>) => {
		for (const id of ids) {
			if (!allowed.has(id)) {
				warnings.push(`${label} cites unknown id: ${id}`);
			}
		}
	};
	check('sources_used.timeline', data.sources_used.timeline_entry_ids, tSet);
	for (const nid of data.sources_used.note_ids) {
		if (!nSet.has(nid)) {
			warnings.push(`sources_used cites unknown note id: ${nid}`);
		}
	}
	for (const f of data.sources_used.file_ids) {
		if (!fSet.has(f.id)) {
			warnings.push(`sources_used cites unknown file id: ${f.id}`);
		}
	}
	check('sources_used.entity', data.sources_used.entity_ids, eSet);
	check('sources_used.workflow', data.sources_used.workflow_item_ids, wSet);

	return warnings;
}

/**
 * Parse model output and attach traceability warnings against the retrieval bundle.
 */
export function parseAiWorkspaceLlmJsonWithBundle(
	raw: string,
	bundle: CaseRetrievalBundle
): AiWorkspaceParseResult {
	const base = parseAiWorkspaceLlmJson(raw);
	if (!base.ok) return base;
	const w = computeTraceabilityWarnings(base.data, bundle);
	return { ok: true, data: base.data, warnings: [...base.warnings, ...w] };
}
