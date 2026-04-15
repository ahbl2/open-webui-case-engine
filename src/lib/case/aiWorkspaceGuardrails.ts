/**
 * P130-05 — Centralized AI Workspace boundary enforcement (frontend only; no persistence).
 * Read-only ingestion + OpenAI completion + explicit `case_proposals` create — no other writes.
 */
import type { CaseRetrievalBundle } from '$lib/case/caseRetrievalBundleTypes';
import { validateSourceRefsStructure } from '$lib/case/p101AiCaseProposalDraft';
import type { AiWorkspaceLlmJsonV1 } from '$lib/case/aiWorkspaceResponseTypes';
import { buildSourceRefsFromSelectedFacts } from '$lib/case/aiWorkspaceToProposalMapper';

/** User-visible message when integrity checks fail (structure or forbidden language). */
export const AI_WORKSPACE_GUARDRAIL_VIOLATION_MESSAGE =
	'AI output violates system guardrails';

export const AI_WORKSPACE_MUTATION_DENIED_MESSAGE =
	'AI Workspace: Case Engine mutation is not allowed outside the governed Proposal API.';

export const AI_WORKSPACE_PROPOSAL_TRACE_BLOCKED =
	'Cannot create proposal draft: traceability data is missing. Run the model again with a valid response.';

export const AI_WORKSPACE_PROPOSAL_SUBMIT_TOO_FAST =
	'Please wait before submitting another proposal draft.';

const MIN_PROPOSAL_SUBMIT_INTERVAL_MS = 2000;

let lastProposalSubmitAt = 0;

/** Resets the proposal submit rate limiter (unit tests only). */
export function resetProposalRateLimiterForTests(): void {
	lastProposalSubmitAt = 0;
}

/** Rate limit for proposal creates (explicit user actions only; blocks double-clicks). */
export function assertProposalSubmitRateAllowed(): void {
	const now = Date.now();
	if (now - lastProposalSubmitAt < MIN_PROPOSAL_SUBMIT_INTERVAL_MS) {
		throw new Error(AI_WORKSPACE_PROPOSAL_SUBMIT_TOO_FAST);
	}
}

export function markProposalSubmitCompleted(): void {
	lastProposalSubmitAt = Date.now();
}

/**
 * Runtime guard: only read-only phases or explicit proposal create.
 * @throws Error when a disallowed Case Engine write would be implied.
 */
export function assertNoMutationAllowed(params: {
	phase: 'ingestion_read' | 'ai_execution' | 'proposal_create';
	caseEngineWriteIntent: false | 'proposal_only';
}): void {
	if (params.phase === 'proposal_create') {
		if (params.caseEngineWriteIntent !== 'proposal_only') {
			throw new Error(AI_WORKSPACE_MUTATION_DENIED_MESSAGE);
		}
		return;
	}
	if (params.caseEngineWriteIntent !== false) {
		throw new Error(AI_WORKSPACE_MUTATION_DENIED_MESSAGE);
	}
}

/** Proposal submit must follow explicit review (user opened panel and clicked confirm). */
export function assertProposalSubmissionContext(reviewPanelOpen: boolean): void {
	if (!reviewPanelOpen) {
		throw new Error(AI_WORKSPACE_MUTATION_DENIED_MESSAGE);
	}
}

/** Strict structural check beyond parser (sections must exist with correct shapes). */
export function validateAiResponseStructure(response: unknown): { ok: true } | { ok: false; reason: string } {
	if (response == null || typeof response !== 'object' || Array.isArray(response)) {
		return { ok: false, reason: 'root_not_object' };
	}
	const o = response as Record<string, unknown>;
	if (!Array.isArray(o.source_backed_facts)) {
		return { ok: false, reason: 'missing_source_backed_facts' };
	}
	if (typeof o.ai_generated_content !== 'string') {
		return { ok: false, reason: 'missing_ai_generated_content' };
	}
	if (o.sources_used == null || typeof o.sources_used !== 'object' || Array.isArray(o.sources_used)) {
		return { ok: false, reason: 'missing_sources_used' };
	}
	const su = o.sources_used as Record<string, unknown>;
	if (!Array.isArray(su.timeline_entry_ids)) return { ok: false, reason: 'sources_used_timeline' };
	if (!Array.isArray(su.note_ids)) return { ok: false, reason: 'sources_used_notes' };
	if (!Array.isArray(su.file_ids)) return { ok: false, reason: 'sources_used_files' };
	if (!Array.isArray(su.entity_ids)) return { ok: false, reason: 'sources_used_entities' };
	if (!Array.isArray(su.workflow_item_ids)) return { ok: false, reason: 'sources_used_workflow' };
	return { ok: true };
}

/** Case-insensitive phrases that imply authoritative proof (non-exhaustive; extend carefully). */
const AUTHORITY_PHRASE_PATTERNS: RegExp[] = [
	/\bthis\s+proves\b/i,
	/\bit\s+is\s+confirmed\b/i,
	/\bconfirmed\s+by\s+the\s+(system|record)\b/i,
	/\bdefinitively\s+established\b/i,
	/\bofficial\s+record\s+shows\b/i,
	/\bauthoritative(?:ly)?\s+/i,
	/\bbeyond\s+(?:a\s+)?doubt\b/i,
	/\bverified\s+by\s+the\s+system\b/i,
	/\bthe\s+system\s+confirms\b/i,
	/\bestablished\s+as\s+fact\b/i,
	/\bthe\s+system\s+confirms\b/i,
	/\bthis\s+establishes\s+(?:that\s+)?(?:the\s+)?truth\b/i
];

function collectAllDisplayStrings(parsed: AiWorkspaceLlmJsonV1): string[] {
	const out: string[] = [];
	out.push(parsed.ai_generated_content);
	for (const f of parsed.source_backed_facts) {
		out.push(f.statement);
	}
	const su = parsed.sources_used;
	out.push(...su.timeline_entry_ids.map(String));
	out.push(...su.note_ids.map(String));
	out.push(...su.entity_ids);
	out.push(...su.workflow_item_ids);
	for (const fi of su.file_ids) {
		out.push(fi.id);
	}
	return out;
}

/** Reject authority language in model output (structured fields + raw JSON). */
export function validateAiAuthorityLanguage(
	parsed: AiWorkspaceLlmJsonV1,
	rawModelText: string
): { ok: true } | { ok: false; pattern: string } {
	const hay = [...collectAllDisplayStrings(parsed), rawModelText].join('\n');
	for (const re of AUTHORITY_PHRASE_PATTERNS) {
		if (re.test(hay)) {
			return { ok: false, pattern: re.source };
		}
	}
	return { ok: true };
}

/**
 * Full pre-display validation: structure + authority language.
 * Does not modify input.
 */
export function validateAiWorkspaceOutputIntegrity(
	parsed: AiWorkspaceLlmJsonV1,
	rawModelText: string
): { ok: true } | { ok: false; code: 'structure' | 'authority'; detail?: string } {
	const struct = validateAiResponseStructure(parsed);
	if (!struct.ok) {
		return { ok: false, code: 'structure', detail: struct.reason };
	}
	const auth = validateAiAuthorityLanguage(parsed, rawModelText);
	if (!auth.ok) {
		return { ok: false, code: 'authority', detail: auth.pattern };
	}
	return { ok: true };
}

export interface AiWorkspaceTraceabilityInput {
	parsed: AiWorkspaceLlmJsonV1;
	rawModelResponse: string;
	userPrompt: string;
	selectedFactIndices: number[];
	includeGenerated: boolean;
	bundle: CaseRetrievalBundle | null;
}

/**
 * Trace checks before enabling / submitting proposal draft.
 * Returns blocking message if trace is incomplete; warnings for unknown source ids (non-blocking).
 */
export function validateTraceabilityForProposalDraft(
	input: AiWorkspaceTraceabilityInput
): { ok: true; warnings: string[] } | { ok: false; message: string } {
	if (!String(input.userPrompt ?? '').trim()) {
		return { ok: false, message: AI_WORKSPACE_PROPOSAL_TRACE_BLOCKED };
	}
	if (!String(input.rawModelResponse ?? '').trim()) {
		return { ok: false, message: AI_WORKSPACE_PROPOSAL_TRACE_BLOCKED };
	}
	const rawRefs = buildSourceRefsFromSelectedFacts(input.parsed, input.selectedFactIndices);
	const vr = validateSourceRefsStructure(rawRefs as unknown[]);
	if (!vr.ok) {
		return { ok: false, message: vr.error };
	}
	const warnings = collectUnknownSourceIdWarnings(input.parsed, input.bundle);
	return { ok: true, warnings };
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

/** Non-blocking: ids declared in `sources_used` that are absent from the current bundle (if bundle loaded). */
export function collectUnknownSourceIdWarnings(
	parsed: AiWorkspaceLlmJsonV1,
	bundle: CaseRetrievalBundle | null
): string[] {
	if (!bundle) return [];
	const warnings: string[] = [];
	const tl = idSetTimeline(bundle);
	const nt = idSetNotes(bundle);
	const fi = idSetFiles(bundle);
	const en = idSetEntities(bundle);
	const wf = idSetWorkflow(bundle);

	for (const id of parsed.sources_used.timeline_entry_ids) {
		if (!tl.has(id)) warnings.push(`Unknown timeline_entry id in sources_used: ${id}`);
	}
	for (const id of parsed.sources_used.note_ids) {
		if (!nt.has(id)) warnings.push(`Unknown notebook_note id in sources_used: ${id}`);
	}
	for (const row of parsed.sources_used.file_ids) {
		if (!fi.has(row.id)) warnings.push(`Unknown case_file id in sources_used: ${row.id}`);
	}
	for (const id of parsed.sources_used.entity_ids) {
		if (!en.has(id)) warnings.push(`Unknown entity id in sources_used: ${id}`);
	}
	for (const id of parsed.sources_used.workflow_item_ids) {
		if (!wf.has(id)) warnings.push(`Unknown workflow item id in sources_used: ${id}`);
	}
	return warnings;
}
