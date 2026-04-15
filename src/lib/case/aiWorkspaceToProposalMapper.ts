/**
 * P130-04 — Map structured AI Workspace output → Case Engine `case_proposals` manual create payload.
 * No network; no Timeline writes. Source refs limited to P101 kinds supported by the backend.
 */
import type { AiWorkspaceFactRefs, AiWorkspaceLlmJsonV1 } from '$lib/case/aiWorkspaceResponseTypes';
import {
	buildAiTraceV1,
	mergePayloadWithAiTrace,
	type P101AiTraceV1,
	validateSourceRefsStructure,
	whitelistTimelinePayload
} from '$lib/case/p101AiCaseProposalDraft';

const SEPARATOR_GENERATED = '\n\n--- AI-Generated Content (Non-Authoritative) ---\n\n';

/** Deterministic assembly — exact statement strings; optional generated block appended verbatim. */
export function assembleProposalTextOriginal(input: {
	parsed: AiWorkspaceLlmJsonV1;
	selectedFactIndices: number[];
	includeGenerated: boolean;
}): string {
	const parts: string[] = [];
	const facts = input.parsed.source_backed_facts;
	const sorted = [...new Set(input.selectedFactIndices)]
		.filter((i) => Number.isInteger(i) && i >= 0 && i < facts.length)
		.sort((a, b) => a - b);
	for (const i of sorted) {
		parts.push(facts[i]!.statement);
	}
	if (input.includeGenerated) {
		const g = String(input.parsed.ai_generated_content ?? '').trim();
		if (g) {
			parts.push(`${SEPARATOR_GENERATED}${input.parsed.ai_generated_content}`);
		}
	}
	return parts.join('\n\n');
}

function dedupeSourceRefs(rows: Array<{ kind: string; id: string }>): Array<{ kind: string; id: string }> {
	const seen = new Set<string>();
	const out: Array<{ kind: string; id: string }> = [];
	for (const r of rows) {
		const k = `${r.kind}:${r.id}`;
		if (seen.has(k)) continue;
		seen.add(k);
		out.push(r);
	}
	return out;
}

/**
 * Maps fact refs to P101 `source_refs` entries. Skips entity/workflow IDs (no backend ref kind).
 */
export function refsFromFact(refs: AiWorkspaceFactRefs): Array<{ kind: string; id: string }> {
	const out: Array<{ kind: string; id: string }> = [];
	for (const id of refs.timeline_entry_ids ?? []) {
		if (id.trim()) out.push({ kind: 'timeline_entry', id: id.trim() });
	}
	for (const nid of refs.note_ids ?? []) {
		if (Number.isFinite(nid)) out.push({ kind: 'notebook_note', id: String(Math.trunc(nid)) });
	}
	for (const id of refs.file_ids ?? []) {
		if (id.trim()) out.push({ kind: 'case_file', id: id.trim() });
	}
	return out;
}

/** Union of refs from selected facts only (deterministic order by fact index, then ref kind). */
export function buildSourceRefsFromSelectedFacts(
	parsed: AiWorkspaceLlmJsonV1,
	selectedFactIndices: number[]
): unknown[] {
	const facts = parsed.source_backed_facts;
	const merged: Array<{ kind: string; id: string }> = [];
	const sorted = [...new Set(selectedFactIndices)]
		.filter((i) => Number.isInteger(i) && i >= 0 && i < facts.length)
		.sort((a, b) => a - b);
	for (const i of sorted) {
		merged.push(...refsFromFact(facts[i]!.refs));
	}
	return dedupeSourceRefs(merged);
}

export interface AiWorkspaceTraceContext {
	userPrompt: string;
	modelId?: string;
	rawModelResponse: string;
	parsed: AiWorkspaceLlmJsonV1;
	selectedFactIndices: number[];
	includeGenerated: boolean;
}

const OPTIONAL_CONTEXT_MAX = 50_000;

/**
 * Builds P101 `ai_trace` with full structured context in `optional_context_text` (JSON).
 */
export function buildAiWorkspaceP101Trace(ctx: AiWorkspaceTraceContext): P101AiTraceV1 {
	const envelope = {
		source: 'ai_workspace',
		response_sections: {
			source_backed_facts: ctx.parsed.source_backed_facts,
			ai_generated_content: ctx.parsed.ai_generated_content,
			sources_used: ctx.parsed.sources_used
		},
		selection: {
			selected_fact_indices: [...new Set(ctx.selectedFactIndices)].filter(
				(i) => i >= 0 && i < ctx.parsed.source_backed_facts.length
			),
			include_generated: ctx.includeGenerated
		}
	};
	let optional = JSON.stringify(envelope);
	if (optional.length > OPTIONAL_CONTEXT_MAX) {
		optional = optional.slice(0, OPTIONAL_CONTEXT_MAX);
	}
	return buildAiTraceV1({
		userInstructions: ctx.userPrompt,
		optionalContextText: optional,
		modelId: ctx.modelId,
		rawAiResponse: ctx.rawModelResponse
	});
}

export interface BuildProposalCreateBodyInput {
	reviewOccurredAt: string;
	reviewType: string;
	reviewTextOriginal: string;
	traceContext: AiWorkspaceTraceContext;
}

/**
 * Validates timeline whitelist + source ref shapes; returns payload for `createCaseProposalManual`.
 */
export function buildCaseProposalCreateBody(input: BuildProposalCreateBodyInput): {
	payload: Record<string, unknown>;
	source_refs: unknown[] | undefined;
} {
	const wl = whitelistTimelinePayload({
		occurred_at: input.reviewOccurredAt.trim(),
		type: input.reviewType.trim(),
		text_original: input.reviewTextOriginal
	});
	if (!wl.ok) {
		throw new Error(wl.error);
	}
	const trace = buildAiWorkspaceP101Trace(input.traceContext);
	const payload = mergePayloadWithAiTrace(wl.data, trace);
	const rawRefs = buildSourceRefsFromSelectedFacts(
		input.traceContext.parsed,
		input.traceContext.selectedFactIndices
	);
	const validated = validateSourceRefsStructure(rawRefs as unknown[]);
	if (!validated.ok) {
		throw new Error(validated.error);
	}
	return {
		payload,
		source_refs: validated.value.length ? validated.value : undefined
	};
}
