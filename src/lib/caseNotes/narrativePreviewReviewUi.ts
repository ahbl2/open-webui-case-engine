/**
 * P35-02 / P35-03 — Narrative preview + trace UX: copy + pure helpers (no network, no persistence).
 * P35-08 — Narrative integrity display copy + parse helpers (read-time; no persistence).
 * Component binds these; tests lock strings and transitions without mounting Svelte.
 */

export type NarrativeLocalReviewStatus = 'none' | 'accepted' | 'rejected';

/** Prominent framing — must stay aligned with CaseStructuredNotesReviewPanel.svelte */
export const NARRATIVE_PREVIEW_FRAMING_LABEL = 'Preview Only — Not Saved';

export const NARRATIVE_PREVIEW_FRAMING_HELPER =
	'This narrative is derived from structured statements (read-time re-derivation from your saved note). Structured notes remain the source of truth. Nothing here is saved to the case.';

export const NARRATIVE_PREVIEW_TRACE_HEADING = 'Source trace';

/** P35-03 — Trace section helper: structured source material, review-only (not persistence or approval). */
export const NARRATIVE_PREVIEW_TRACE_HELPER =
	'Each row is verbatim structured source material used to derive the preview above, in server order. For review only — not saved to the case.';

/** Label above the verbatim statement text (distinct from narrative body). */
export const NARRATIVE_TRACE_SOURCE_LABEL = 'Verbatim source';

export const NARRATIVE_PREVIEW_TRACE_EMPTY =
	'No trace rows were returned for this preview. The narrative may still appear above; this is not a rendering error.';

export const NARRATIVE_TRACE_SHOW_MORE = 'Show more';
export const NARRATIVE_TRACE_SHOW_LESS = 'Show less';

/** P35-03 — Long `sourceText`: collapse until expanded (UI-only threshold). */
export const TRACE_SOURCE_LONG_THRESHOLD_CHARS = 220;

export function traceRowKey(index: number, statementId: string): string {
	return `${index}:${statementId}`;
}

export function isLongTraceSourceText(
	text: string,
	maxChars: number = TRACE_SOURCE_LONG_THRESHOLD_CHARS
): boolean {
	return text.length > maxChars;
}

export const NARRATIVE_PREVIEW_IN_SESSION_ACCEPT_HINT =
	'Preview acknowledged in-session only — not saved to the case.';

export const NARRATIVE_PREVIEW_IN_SESSION_REJECT_HINT =
	'Preview marked as not accepted in-session — not saved to the case.';

/** P35-04 — Copy next to explicit save (derived artifact; structured notes remain SoT). */
export const NARRATIVE_SAVE_DERIVED_HELPER =
	'Saving stores a derived narrative for reference. Structured notes remain the source of truth.';

export const NARRATIVE_SAVE_SUCCESS_MESSAGE = 'Narrative saved (derived, not authoritative)';

/** P35-05 — Saved record viewer (read-only; distinct from live preview). */
export const SAVED_DERIVED_NARRATIVE_LABEL = 'Saved Derived Narrative';

export const SAVED_DERIVED_SOT_HELPER = 'Structured notes remain the source of truth.';

/** P35-06 — Read-only comparison (no scoring, no semantic engine). */
export const STRUCTURED_VS_NARRATIVE_DIFF_HEADING = 'Structured vs narrative comparison';

export const STRUCTURED_VS_NARRATIVE_DIFF_HELPER =
	'Informational review only — not adjudication or scoring. Structured notes remain authoritative. Nothing here is editable.';

export const COMPARE_SIDE_STRUCTURED_LABEL = 'Structured Source';

export const COMPARE_SIDE_NARRATIVE_LABEL = 'Narrative Output';

/** P35-08 — Integrity section (informational; non-blocking). */
export const NARRATIVE_INTEGRITY_SECTION_HEADING = 'Integrity';

export const NARRATIVE_INTEGRITY_HELPER =
	'Integrity signals are informational only. Structured notes remain the source of truth.';

export const NARRATIVE_INTEGRITY_STATUS_SUPPORTED = 'Supported';

export const NARRATIVE_INTEGRITY_STATUS_DEGRADED = 'Degraded';

export const NARRATIVE_INTEGRITY_STATUS_UNSUPPORTED = 'Unsupported';

/** P35-07 — Export is saved-record only; not live preview. */
export const NARRATIVE_SAVED_DERIVED_EXPORT_LABEL = 'Export derived narrative (saved record)';

export const NARRATIVE_SAVED_DERIVED_EXPORT_HELPER =
	'Downloads a plain-text file for the selected saved derived narrative only. Structured notes remain authoritative. Live preview cannot be exported here.';

export type NarrativeIntegrityStatus = 'supported' | 'degraded' | 'unsupported';

export type NarrativeIntegritySignal = { code: string; message: string };

export type NarrativeIntegrityResult = {
	status: NarrativeIntegrityStatus;
	signals: NarrativeIntegritySignal[];
};

export function parseNarrativeIntegrityPayload(raw: unknown): NarrativeIntegrityResult | null {
	if (raw == null || typeof raw !== 'object') return null;
	const o = raw as Record<string, unknown>;
	const status = o.status;
	const signals = o.signals;
	if (status !== 'supported' && status !== 'degraded' && status !== 'unsupported') return null;
	if (!Array.isArray(signals)) return null;
	const out: NarrativeIntegritySignal[] = [];
	for (const s of signals) {
		if (s == null || typeof s !== 'object') return null;
		const row = s as Record<string, unknown>;
		const code = row.code;
		const message = row.message;
		if (typeof code !== 'string' || typeof message !== 'string') return null;
		out.push({ code, message });
	}
	return { status, signals: out };
}

/** Trace order for comparison is API order; identity helper for tests. */
export function comparisonTraceRowsForDisplay<T extends { statementId: string; sourceText: string }>(rows: T[]): T[] {
	return rows.map((r) => ({ ...r }));
}

export type NarrativePreviewTraceRow = { statementId: string; sourceText: string };

export interface NarrativePreviewLocalBundle {
	narrative: string;
	trace: NarrativePreviewTraceRow[];
	warnings: string[];
	reviewStatus: NarrativeLocalReviewStatus;
	visible: boolean;
	error: string;
}

export function emptyNarrativePreviewLocalBundle(): NarrativePreviewLocalBundle {
	return {
		narrative: '',
		trace: [],
		warnings: [],
		reviewStatus: 'none',
		visible: false,
		error: ''
	};
}

export function applySuccessfulNarrativePayload(payload: {
	narrative: string;
	trace: NarrativePreviewTraceRow[];
	warnings: string[];
}): Pick<NarrativePreviewLocalBundle, 'narrative' | 'trace' | 'warnings' | 'reviewStatus' | 'visible'> {
	return {
		narrative: payload.narrative,
		trace: payload.trace.map((t) => ({ ...t })),
		warnings: [...payload.warnings],
		reviewStatus: 'none',
		visible: true
	};
}

export function markNarrativePreviewLocalAccept(): NarrativeLocalReviewStatus {
	return 'accepted';
}

export function markNarrativePreviewLocalReject(): NarrativeLocalReviewStatus {
	return 'rejected';
}
