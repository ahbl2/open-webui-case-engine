/**
 * P99-01 — Arrival context read-model contract (read-only, deterministic, no UI).
 *
 * - **No inference:** output is derived only from the provided navigation input + `currentCaseId`.
 * - **No persistence:** no storage; ephemeral use with navigation handoff only.
 * - **Notebook:** `p98_note_goto` does **not** use `SynthesisSourceNavigationIntent` — same-case `?note=`
 *   routing remains a narrow, explicit case (no synthesis intent conversion).
 *
 * P97 `SynthesisSourceNavigationIntent` names fields `source_kind` / `source_record_id` for the **record
 * being opened** on the destination surface; this module maps those to {@link ArrivalContext.target_kind}
 * / `target_id`. **Origin** of navigation (where the user clicked from) is only available when the input
 * includes {@link NavigationArrivalInput} `p98_declared.origin` — not fabricated.
 *
 * ### Locks (P99-02+ — do not drift)
 *
 * - **`arrived_via`:** **Only** {@link ARRIVAL_VIA_VALUES} — no extra literals, no “unknown”/fallback
 *   routing in UI. Unrecognized input → **invalid** (`is_valid` false / `null` from builder), **never**
 *   reinterpreted.
 * - **`source_echo`:** Orientation hint only (max two short lines here). **Do not** add rich text,
 *   expansion, scrolling, or treat as a content surface in P99-02.
 * - **`is_returnable`:** **true** only when a **deterministic** return can be derived from this contract’s
 *   input — **no** `history.back()`, **no** best-effort reconstruction, **no** UI guesswork.
 */
import type { SynthesisSourceNavigationIntent, SynthesisSourceNavKind } from '$lib/case/caseSynthesisSourceNavigation';
import type { DeclaredRecordKind } from '$lib/case/caseRecordRelationshipReadModel';
import { containsForbiddenRelationshipDisplayTerm } from '$lib/case/caseRecordRelationshipReadModel';

export const ARRIVAL_CONTEXT_MODEL_V = 1 as const;

/** Record kinds allowed for arrival source/target (aligned with P98 declared kinds). */
export type ArrivalRecordKind = DeclaredRecordKind;

/**
 * **Closed enum — three values only.** UI must not invent strings; use {@link isArrivalVia} to validate.
 * Anything else → treat arrival context as invalid, not coerced into a label.
 */
export const ARRIVAL_VIA_VALUES = [
	'synthesis_drilldown',
	'declared_relationship',
	'direct_link'
] as const;

export type ArrivalVia = (typeof ARRIVAL_VIA_VALUES)[number];

export function isArrivalVia(value: string): value is ArrivalVia {
	return (ARRIVAL_VIA_VALUES as readonly string[]).includes(value);
}

export interface ArrivalContext {
	readonly v: typeof ARRIVAL_CONTEXT_MODEL_V;
	readonly case_id: string;
	/** Origin record kind when known from input; otherwise `null` (e.g. synthesis-only handoff). */
	readonly source_kind: ArrivalRecordKind | null;
	readonly source_id: string | null;
	readonly target_kind: ArrivalRecordKind;
	readonly target_id: string;
	readonly arrived_via: ArrivalVia;
	readonly is_valid: boolean;
	/**
	 * `true` only when a deterministic reverse navigation can be reasoned from **this** input
	 * (declared handoff includes `origin`). Synthesis-only and note-query inputs do not imply a return
	 * contract in P99-01 — set `false` (P99-03 may extend rules).
	 */
	/**
	 * **Strict:** `true` only when this input implies a **single deterministic** reverse navigation (P99-01:
	 * declared handoff with same-case `origin`). **Never** use history stack, heuristics, or “probably back
	 * to…”. If uncertain → `false`.
	 */
	readonly is_returnable: boolean;
	/**
	 * Optional echo lines — **only** when supplied on input; never fabricated here.
	 * Max two lines enforced when building from optional echo.
	 * **P99-02:** Still orientation hint only — no expansion, formatting chrome, or second viewer.
	 */
	readonly source_echo: readonly [string] | readonly [string, string] | null;
	readonly heading: string;
	readonly subline: string;
}

/** Max length per echo line (factual strip). P99-02 must not raise this to enable “more content”. */
export const P99_ARRIVAL_ECHO_LINE_MAX = 200 as const;

/**
 * Extra connective phrases Phase 99 orientation copy must avoid (P98 list already covers e.g. `because `,
 * `led to`, `associated with`). Use {@link containsForbiddenArrivalDisplayTerm} for all arrival UI/echo.
 */
export const P99_EXTRA_FORBIDDEN_ARRIVAL_TERMS = ['related to', 'connected to'] as const;

/** P98 forbidden terms + {@link P99_EXTRA_FORBIDDEN_ARRIVAL_TERMS} — non-interpretive orientation only. */
export function containsForbiddenArrivalDisplayTerm(text: string): boolean {
	if (containsForbiddenRelationshipDisplayTerm(text)) return true;
	const t = text.toLowerCase();
	for (const term of P99_EXTRA_FORBIDDEN_ARRIVAL_TERMS) {
		if (t.includes(term)) return true;
	}
	return false;
}

export type NavigationArrivalInput =
	| {
			readonly kind: 'p97_synthesis_intent';
			readonly intent: SynthesisSourceNavigationIntent;
			/** Preformatted echo only — must already be factual; not fetched here. */
			readonly source_echo?: readonly [string] | readonly [string, string];
	  }
	| {
			readonly kind: 'p98_declared';
			readonly intent: SynthesisSourceNavigationIntent;
			readonly origin: { readonly kind: DeclaredRecordKind; readonly id: string };
			readonly source_echo?: readonly [string] | readonly [string, string];
	  }
	| {
			readonly kind: 'p98_note_goto';
			readonly caseId: string;
			readonly noteId: string;
			readonly source_echo?: readonly [string] | readonly [string, string];
	  };

export const ARRIVAL_UI_COPY = {
	openedFromSynthesis: 'Opened from synthesis',
	openedFromTimelineEntry: 'Opened from Timeline entry',
	openedFromTask: 'Opened from Task',
	openedFromFile: 'Opened from file',
	openedFromNotebookNote: 'Opened from Notebook note',
	openedFromRelatedRecord: 'Opened from related record',
	targetTimeline: 'Timeline entry',
	targetTask: 'Task',
	targetFile: 'File',
	targetNotebook: 'Notebook note',
	arrivalSublinePrefix: 'Destination:'
} as const;

function assertArrivalCopyPassesGuard(label: string, context: string): void {
	if (containsForbiddenArrivalDisplayTerm(label)) {
		throw new Error(`P99-01 arrival copy guard: forbidden fragment in ${context}`);
	}
}

/** Run on module load — centralized strings must stay non-causal / non-inferential. */
function validateArrivalUiCopyConstants(): void {
	for (const [k, v] of Object.entries(ARRIVAL_UI_COPY)) {
		assertArrivalCopyPassesGuard(v, k);
	}
}
validateArrivalUiCopyConstants();

function trimId(id: string | null | undefined): string {
	return (id ?? '').trim();
}

function synthesisNavKindToTargetArrivalKind(kind: SynthesisSourceNavKind): ArrivalRecordKind {
	switch (kind) {
		case 'timeline_entry':
			return 'timeline_entry';
		case 'task':
			return 'case_task';
		case 'case_file':
		case 'extracted_text':
			return 'case_file';
		default: {
			const _e: never = kind;
			return _e;
		}
	}
}

function headingForDeclaredOrigin(kind: DeclaredRecordKind): string {
	switch (kind) {
		case 'timeline_entry':
			return ARRIVAL_UI_COPY.openedFromTimelineEntry;
		case 'case_task':
			return ARRIVAL_UI_COPY.openedFromTask;
		case 'case_file':
			return ARRIVAL_UI_COPY.openedFromFile;
		case 'notebook_note':
			return ARRIVAL_UI_COPY.openedFromNotebookNote;
		default: {
			const _e: never = kind;
			return _e;
		}
	}
}

function targetKindLabel(kind: ArrivalRecordKind): string {
	switch (kind) {
		case 'timeline_entry':
			return ARRIVAL_UI_COPY.targetTimeline;
		case 'case_task':
			return ARRIVAL_UI_COPY.targetTask;
		case 'case_file':
			return ARRIVAL_UI_COPY.targetFile;
		case 'notebook_note':
			return ARRIVAL_UI_COPY.targetNotebook;
		default: {
			const _e: never = kind;
			return _e;
		}
	}
}

function buildSubline(targetKind: ArrivalRecordKind, targetId: string): string {
	const label = targetKindLabel(targetKind);
	const id = trimId(targetId);
	return `${ARRIVAL_UI_COPY.arrivalSublinePrefix} ${label} · ${id}`;
}

function normalizeEcho(
	echo: readonly [string] | readonly [string, string] | undefined
): readonly [string] | readonly [string, string] | null {
	if (!echo) return null;
	const lines = echo
		.slice(0, 2)
		.map((line) => line.trim().slice(0, P99_ARRIVAL_ECHO_LINE_MAX))
		.filter((line) => line.length > 0);
	if (lines.length === 0) return null;
	for (const line of lines) {
		if (containsForbiddenArrivalDisplayTerm(line)) return null;
	}
	if (lines.length === 1) return [lines[0] ?? ''];
	return [lines[0] ?? '', lines[1] ?? ''];
}

function isWellFormedSynthesisIntent(intent: SynthesisSourceNavigationIntent): boolean {
	if (intent.v !== 1) return false;
	if (!trimId(intent.case_id) || !trimId(intent.source_record_id)) return false;
	return true;
}

function singleCaseValid(intentCaseId: string, currentCaseId: string): boolean {
	return trimId(intentCaseId) === trimId(currentCaseId) && trimId(currentCaseId) !== '';
}

/**
 * Builds a read-only arrival context from **navigation input only** (no stores, no API).
 * Returns `null` when the input cannot yield a structurally valid context.
 */
export function buildArrivalContextFromNavigationState(
	state: NavigationArrivalInput,
	currentCaseId: string
): ArrivalContext | null {
	const cid = trimId(currentCaseId);
	if (!cid) return null;

	if (state.kind === 'p98_note_goto') {
		const caseId = trimId(state.caseId);
		const noteId = trimId(state.noteId);
		if (!caseId || !noteId) return null;
		const same = caseId === cid;
		const echo = normalizeEcho(state.source_echo);
		return {
			v: ARRIVAL_CONTEXT_MODEL_V,
			case_id: cid,
			source_kind: null,
			source_id: null,
			target_kind: 'notebook_note',
			target_id: noteId,
			arrived_via: 'direct_link',
			is_valid: same,
			is_returnable: false,
			source_echo: echo,
			heading: ARRIVAL_UI_COPY.openedFromRelatedRecord,
			subline: buildSubline('notebook_note', noteId)
		};
	}

	if (!isWellFormedSynthesisIntent(state.intent)) return null;

	const intent = state.intent;
	const targetKind = synthesisNavKindToTargetArrivalKind(intent.source_kind);
	const targetId = trimId(intent.source_record_id);
	const sameCase = singleCaseValid(intent.case_id, cid);
	const echo = normalizeEcho(state.source_echo);

	if (state.kind === 'p97_synthesis_intent') {
		return {
			v: ARRIVAL_CONTEXT_MODEL_V,
			case_id: cid,
			source_kind: null,
			source_id: null,
			target_kind: targetKind,
			target_id: targetId,
			arrived_via: 'synthesis_drilldown',
			is_valid: sameCase,
			is_returnable: false,
			source_echo: echo,
			heading: ARRIVAL_UI_COPY.openedFromSynthesis,
			subline: buildSubline(targetKind, targetId)
		};
	}

	/* state.kind === 'p98_declared' */
	const oid = trimId(state.origin.id);
	if (!oid) return null;
	const okind = state.origin.kind;
	const heading = headingForDeclaredOrigin(okind);
	return {
		v: ARRIVAL_CONTEXT_MODEL_V,
		case_id: cid,
		source_kind: okind,
		source_id: oid,
		target_kind: targetKind,
		target_id: targetId,
		arrived_via: 'declared_relationship',
		is_valid: sameCase,
		is_returnable: sameCase,
		source_echo: echo,
		heading,
		subline: buildSubline(targetKind, targetId)
	};
}

/** Returns `null` if context is missing or fails validity / single-case guard. */
export function filterValidArrivalContext(context: ArrivalContext | null): ArrivalContext | null {
	if (!context || !context.is_valid) return null;
	return context;
}

/** True when context is non-null and {@link ArrivalContext.is_valid}. */
export function arrivalContextIsUsable(context: ArrivalContext | null): context is ArrivalContext {
	return context !== null && context.is_valid;
}
