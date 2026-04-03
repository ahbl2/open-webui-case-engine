/**
 * P35-02 / P35-03 — Narrative preview + trace UX: copy + pure helpers (no network, no persistence).
 * P35-08 — Narrative integrity display copy + parse helpers (read-time; no persistence).
 * Component binds these; tests lock strings and transitions without mounting Svelte.
 */

export type NarrativeLocalReviewStatus = 'none' | 'accepted' | 'rejected';

/** Case Notes workflow — section titles (user-facing; no phase/prototype wording). */
export const WORKFLOW_STRUCTURED_SECTION_TITLE = 'Structured note';
export const WORKFLOW_STRUCTURED_SECTION_HELPER =
	'Your notebook text stays authoritative until you save. Structure Note runs extraction here; the narrative preview below is the main review surface.';
export const WORKFLOW_REVIEW_STRUCTURED_SUBHEAD = 'Review structured note';
export const WORKFLOW_NARRATIVE_SECTION_TITLE = 'Narrative preview';

/** Dev/admin — structured extraction audit (collapsed). */
export const AUDIT_GENERATION_DETAILS_SUMMARY = 'Structured extraction details';

/** Collapsed-summary hint when optional technical narrative detail exists (dev/admin). */
export const AUDIT_GENERATION_DETAILS_REJECTED_AI_INLINE_HINT =
	'Technical narrative details available — expand to review';

/** Primary narrative workflow — dev/admin pointer to technical details. */
export const NARRATIVE_REJECTED_AI_DEBUG_TOPLEVEL_HINT =
	'Technical narrative details are available under Structured extraction details';

export const AUDIT_GENERATION_DETAILS_HELPER =
	'Extraction and draft breakdown for troubleshooting. Operators use the narrative preview below.';

/** P37 — Rejected AI prose (preview-only; never persisted or audit-logged). */
export const REJECTED_AI_DEBUG_SUMMARY = 'AI Debug (why AI output was not used)';

export const REJECTED_AI_DEBUG_HELPER =
	'Not saved, not exported, and not written to audit logs. For operator QA and guard tuning only.';

export type NarrativePreviewRejectedAiReason = {
	code: string;
	label: string;
};

export type NarrativePreviewRejectedAiDebug = {
	rejectedAiNarrative: string;
	rejectedAiReasons: NarrativePreviewRejectedAiReason[];
	rejectedAiReasonType: 'meaning_drift' | 'context_loss' | 'other';
	/** Optional; forwarded when present on preview response (UI-only). */
	model?: string;
	/** Optional; forwarded when present on preview response (UI-only). */
	timeoutMs?: number;
};

/** Shown above the rejected model text — ties triggers to the prose below. */
export const REJECTED_AI_DEBUG_NARRATIVE_HEADING = 'Rejected AI output (model text that failed guards)';

/** Shown between narrative and coded reasons. */
export const REJECTED_AI_DEBUG_TRIGGERS_BRIDGE =
	'Guard triggers below were evaluated against this text (and source material), not against the deterministic fallback shown in the main preview.';

export const REJECTED_AI_DEBUG_TRIGGERS_HEADING = 'Guard triggers (stable codes)';

/** Debug panel list heading when debug is AI failure (not guard triggers). */
export const REJECTED_AI_DEBUG_FAILURE_CODES_HEADING = 'Failure detail';

export const REJECTED_AI_DEBUG_FAILURE_TYPE_LINE = 'Failure type: Timeout or no response';

export const REJECTED_AI_DEBUG_FAILURE_RESULT_LINE = 'Result: No response received from model';

export function formatRejectedAiFailureModelLine(model: string | undefined): string | null {
	const m = typeof model === 'string' ? model.trim() : '';
	return m ? `Model: ${m}` : null;
}

export function formatRejectedAiFailureTimeoutLine(timeoutMs: number | undefined): string | null {
	if (timeoutMs == null || !Number.isFinite(timeoutMs)) return null;
	return `Timeout limit: ${Math.round(timeoutMs)} ms`;
}

export function rejectedAiReasonTypeLabel(
	t: NarrativePreviewRejectedAiDebug['rejectedAiReasonType']
): string {
	switch (t) {
		case 'meaning_drift':
			return 'Guard: meaning preservation (drift)';
		case 'context_loss':
			return 'Guard: context preservation (omission)';
		case 'other':
			return 'AI did not return a response (likely timeout or model delay)';
		default:
			return String(t);
	}
}

/** UX strip when optional enhancement step failed or timed out (not a guard rejection). */
export const NARRATIVE_PREVIEW_AI_FAILURE_UX_BANNER =
	'The preview could not use an optional enhancement step. A cleaned-up narrative is shown instead.';

/** UX strip when optional prose was rejected to preserve meaning/accuracy. */
export const NARRATIVE_PREVIEW_AI_GUARD_REJECTION_UX_BANNER =
	'The preview uses cleaned-up narrative text focused on accuracy.';

/** Shown under the failure classification in the debug panel (AI failure path). */
export const NARRATIVE_PREVIEW_AI_FAILURE_RECOMMENDED_ACTION =
	'Try Refresh Preview if the text looks incomplete, or contact support if this persists.';

/** Debug panel helper when `debug` is AI failure (not guard rejection). */
export const REJECTED_AI_DEBUG_AI_FAILURE_HELPER =
	'Not saved, not exported, and not written to audit logs. The model did not return usable prose (timeout, error, or empty output).';

export const REJECTED_AI_DEBUG_AI_FAILURE_BRIDGE =
	'There is no rejected model text to compare; details below describe the failure class only.';

export function isNarrativePreviewAiFailureNoOutputDebug(
	d: NarrativePreviewRejectedAiDebug | null | undefined
): boolean {
	if (d == null) return false;
	return (
		d.rejectedAiReasonType === 'other' &&
		d.rejectedAiReasons.some((r) => r.code === 'ai_failure')
	);
}

/** Debug present and interpreted as guard rejection (rejected model text path), not transport/model failure. */
export function isNarrativePreviewAiGuardRejectionDebug(
	d: NarrativePreviewRejectedAiDebug | null | undefined
): boolean {
	if (d == null) return false;
	return !isNarrativePreviewAiFailureNoOutputDebug(d);
}

export const AUDIT_STRUCTURED_RENDER_LABEL = 'Internal structured render (read-only)';

export const AUDIT_STATEMENT_BREAKDOWN_LABEL = 'Extracted statements (internal)';

export const NARRATIVE_PRIMARY_LOADING_LABEL = 'Preparing narrative…';

/** Operator-facing line under the Narrative preview title (non–dev/admin). */
export const NARRATIVE_PREVIEW_DECISION_CUE =
	'Review the preview below, then accept or reject it.';

/** Dev/admin — short pointer; extraction audit is collapsed above. */
export const NARRATIVE_PRIMARY_HEADER_HELPER =
	'Expand Structured extraction details above if you need audit context. Use the actions below to accept, reject, refresh, or clear.';

/** Collapsed narrative preview warnings on narrative-primary surface (audit-adjacent). */
export const NARRATIVE_PREVIEW_WARNINGS_AUDIT_SUMMARY = 'Narrative preview warnings (from server)';

/** Legacy narrative preview path — warnings collapsed by default (may include technical codes). */
export const NARRATIVE_PREVIEW_WARNINGS_LEGACY_SUMMARY = 'Show technical details (preview warnings)';

/** P37 — AI preview output contract: explicit when AI was requested but deterministic text is shown. */
export const NARRATIVE_COMPOSITION_AI_FALLBACK_TITLE = 'AI rewrite was not used';

export const NARRATIVE_COMPOSITION_AI_FALLBACK_BODY =
	'You selected AI (local) composition, but the narrative below is deterministic cleanup. AI was disabled, failed, or rejected by safety or meaning checks. See preview warnings for technical detail.';

/** Primary review surface — actual composition behind the visible narrative body. */
export const NARRATIVE_COMPOSITION_ACTUAL_LABEL = 'Narrative shown';

export const NARRATIVE_COMPOSITION_BADGE_AI = 'AI-composed (local)';

export const NARRATIVE_COMPOSITION_BADGE_DETERMINISTIC = 'Deterministic cleanup';

export const NARRATIVE_COMPOSITION_REQUESTED_AI_GOT_DETERMINISTIC =
	'You chose AI composition; this preview shows deterministic text instead.';

export function narrativeCompositionAiFallbackVisible(
	requested: 'deterministic' | 'ai' | null,
	used: 'deterministic' | 'ai' | null
): boolean {
	return requested === 'ai' && used === 'deterministic';
}

/** P37 layout — primary compare column labels (detective workflow). */
export const NOTES_REVIEW_PRIMARY_HEADING = 'Compare: original note vs cleaned-up narrative';

export const NOTES_REVIEW_ORIGINAL_LABEL = 'Your original note';

export const NOTES_REVIEW_CLEANED_LABEL = 'Cleaned-up narrative (preview)';

/** Single concise line next to the preview column (full policy text lives in REVIEW_NOTICE_BODY / advanced). */
export const NARRATIVE_PREVIEW_REVIEW_NOTICE_SHORT =
	'Preview is read-only here — structured notes stay authoritative. Accept loads the editor only (still unsaved).';

/** Collapsed section summaries — advanced / secondary surfaces. */
export const ADVANCED_REVIEW_TRACE_SUMMARY = 'Source details';

export const ADVANCED_REVIEW_INTEGRITY_SUMMARY = 'Read-time integrity signals';

export const ADVANCED_REVIEW_DIFF_SUMMARY = 'Compare details';

export const ADVANCED_REVIEW_SAVE_DERIVED_SUMMARY = 'Save narrative snapshot (optional)';

export const SAVED_DERIVED_WORKBENCH_SUMMARY = 'Saved narratives for this case';

/** Primary narrative CTA — must match CaseStructuredNotesReviewPanel.svelte button copy. */
export const NARRATIVE_GENERATE_PRIMARY_LABEL = 'Generate Preview';
export const NARRATIVE_REGENERATE_PRIMARY_LABEL = 'Refresh Preview';
export const NARRATIVE_GENERATING_PRIMARY_LABEL = 'Generating…';

/** P37 — Notes editor footer: narrative preview request requires a persisted notebook note id. */
export const NARRATIVE_GENERATE_REQUIRES_SAVED_NOTE_HELPER =
	'Save the note first to generate a narrative preview from this structured draft.';

/** P37 follow-up — single preview disclaimer (panel shows this once; no parallel intro + framing). */
export const NARRATIVE_PREVIEW_REVIEW_NOTICE_TITLE = 'Preview only — not saved yet';

export const NARRATIVE_PREVIEW_REVIEW_NOTICE_BODY =
	'Preview only — not saved yet. Accept loads this text into the editor (still unsaved). Use Save note to persist your notebook.';

/** Expandable full disclaimer (default collapsed) when using the short inline notice. */
export const NARRATIVE_PREVIEW_FULL_NOTICE_SUMMARY = 'Full preview & source-of-truth detail';

/** @deprecated Use NARRATIVE_PREVIEW_REVIEW_NOTICE_TITLE — kept for import stability in tests. */
export const NARRATIVE_PREVIEW_FRAMING_LABEL = NARRATIVE_PREVIEW_REVIEW_NOTICE_TITLE;

/** @deprecated Use NARRATIVE_PREVIEW_REVIEW_NOTICE_BODY */
export const NARRATIVE_PREVIEW_FRAMING_HELPER = NARRATIVE_PREVIEW_REVIEW_NOTICE_BODY;

/** Option B primary actions — must match CaseStructuredNotesReviewPanel.svelte */
export const NARRATIVE_ACCEPT_NARRATIVE_BUTTON_LABEL = 'Accept narrative';

export const NARRATIVE_REJECT_NARRATIVE_BUTTON_LABEL = 'Reject narrative';

export const NARRATIVE_PREVIEW_TRACE_HEADING = 'Source details';

/** Trace section helper — short operator copy. */
export const NARRATIVE_PREVIEW_TRACE_HELPER =
	'Optional: verbatim source lines for this preview (read-only).';

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
	'Saves a snapshot for reference. Your notebook note remains the working draft.';

export const NARRATIVE_SAVE_SUCCESS_MESSAGE = 'Narrative snapshot saved';

/** Explicit save CTA — snapshot only; structured notes unchanged. */
export const NARRATIVE_SAVE_DERIVED_BUTTON_LABEL = 'Save narrative snapshot';

/** P35-05 — Saved record viewer (read-only; distinct from live preview). */
export const SAVED_DERIVED_NARRATIVE_LABEL = 'Saved narratives';

export const SAVED_DERIVED_SOT_HELPER = 'Structured notes remain the source of truth.';

/** P35-06 — Read-only comparison (no scoring, no semantic engine). */
export const STRUCTURED_VS_NARRATIVE_DIFF_HEADING = 'Structured source vs narrative preview';

export const STRUCTURED_VS_NARRATIVE_DIFF_HELPER =
	'Informational review only — not adjudication or scoring. Read-only; nothing here is editable.';

export const COMPARE_SIDE_STRUCTURED_LABEL = 'Structured Source';

export const COMPARE_SIDE_NARRATIVE_LABEL = 'Narrative Output';

/** P35-08 — Integrity section (informational; non-blocking). */
export const NARRATIVE_INTEGRITY_SECTION_HEADING = 'Integrity';

export const NARRATIVE_INTEGRITY_HELPER =
	'Integrity signals are informational only. Comparison uses simple token rules (common connector words may be ignored; short unknown tokens alone may not surface).';

export const NARRATIVE_INTEGRITY_STATUS_SUPPORTED = 'Supported';

export const NARRATIVE_INTEGRITY_STATUS_DEGRADED = 'Degraded';

export const NARRATIVE_INTEGRITY_STATUS_UNSUPPORTED = 'Unsupported';

/** P35-07 — Export is saved-record only; not live preview. */
export const NARRATIVE_SAVED_DERIVED_EXPORT_LABEL = 'Export narrative';

export const NARRATIVE_SAVED_DERIVED_EXPORT_HELPER =
	'Downloads HTML for the selected saved record. Live preview is not exported here.';

/** P36-01 — Soft-delete from active view (recoverable; no physical removal). */
export const NARRATIVE_SAVED_DELETE_LABEL = 'Delete narrative';

export const NARRATIVE_SAVED_DELETE_CONFIRM_MESSAGE =
	'This will remove the saved narrative from active view. It can be recovered by administrators.';

/** P37-01 — ADMIN-only recovery UI (load by id + restore). */
export const NARRATIVE_ADMIN_RECOVER_HEADING = 'Administrator: recover soft-deleted narrative';

export const NARRATIVE_ADMIN_RECOVER_HELPER =
	'Enter a narrative record ID (e.g. from the case audit log), then load. Restore returns the same record to the active list — it does not create a new row.';

export const NARRATIVE_ADMIN_RECOVER_LOAD_LABEL = 'Load deleted record';

export const NARRATIVE_ADMIN_RECOVER_INPUT_PLACEHOLDER = 'Record ID';

export const NARRATIVE_SOFT_DELETED_BANNER =
	'This saved narrative is soft-deleted (hidden from the active list). You can restore it to active view.';

export const NARRATIVE_RESTORE_LABEL = 'Restore narrative';

export const NARRATIVE_RESTORE_CONFIRM_MESSAGE =
	'This will restore the narrative record to active view.';

/** P37-02 — ADMIN-only: show soft-deleted rows in a separate list section (explicit opt-in). */
export const NARRATIVE_SHOW_DELETED_LABEL = 'Show deleted narratives';

export const NARRATIVE_HIDE_DELETED_LABEL = 'Hide deleted narratives';

export const NARRATIVE_SHOW_DELETED_HELPER =
	'When enabled, soft-deleted records appear in a separate admin section below. They stay out of the active list for all other users. Nothing is restored automatically.';

export const NARRATIVE_SAVED_LIST_ACTIVE_HEADING = 'Active saved narratives';

export const NARRATIVE_SAVED_LIST_DELETED_HEADING = 'Soft-deleted narratives (admin view)';

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
