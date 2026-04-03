/**
 * P35-02 — Narrative preview review UX (pure helpers + copy; no component mount; no fetch).
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import {
	NARRATIVE_ACCEPT_NARRATIVE_BUTTON_LABEL,
	NARRATIVE_PREVIEW_FRAMING_HELPER,
	NARRATIVE_PREVIEW_FRAMING_LABEL,
	NARRATIVE_PREVIEW_REVIEW_NOTICE_BODY,
	NARRATIVE_PREVIEW_REVIEW_NOTICE_TITLE,
	NARRATIVE_REJECT_NARRATIVE_BUTTON_LABEL,
	NARRATIVE_PREVIEW_IN_SESSION_ACCEPT_HINT,
	NARRATIVE_PREVIEW_IN_SESSION_REJECT_HINT,
	NARRATIVE_PREVIEW_TRACE_HEADING,
	NARRATIVE_PREVIEW_TRACE_HELPER,
	NARRATIVE_PREVIEW_TRACE_EMPTY,
	NARRATIVE_SAVE_DERIVED_HELPER,
	NARRATIVE_SAVE_SUCCESS_MESSAGE,
	SAVED_DERIVED_NARRATIVE_LABEL,
	SAVED_DERIVED_SOT_HELPER,
	TRACE_SOURCE_LONG_THRESHOLD_CHARS,
	isLongTraceSourceText,
	traceRowKey,
	applySuccessfulNarrativePayload,
	emptyNarrativePreviewLocalBundle,
	markNarrativePreviewLocalAccept,
	markNarrativePreviewLocalReject,
	STRUCTURED_VS_NARRATIVE_DIFF_HEADING,
	STRUCTURED_VS_NARRATIVE_DIFF_HELPER,
	COMPARE_SIDE_STRUCTURED_LABEL,
	COMPARE_SIDE_NARRATIVE_LABEL,
	comparisonTraceRowsForDisplay,
	parseNarrativeIntegrityPayload,
	NARRATIVE_INTEGRITY_HELPER,
	NARRATIVE_INTEGRITY_STATUS_SUPPORTED,
	NARRATIVE_SAVED_DERIVED_EXPORT_LABEL,
	NARRATIVE_SAVED_DERIVED_EXPORT_HELPER,
	NARRATIVE_GENERATE_PRIMARY_LABEL,
	NARRATIVE_GENERATE_REQUIRES_SAVED_NOTE_HELPER,
	NARRATIVE_REGENERATE_PRIMARY_LABEL,
	NARRATIVE_SAVE_DERIVED_BUTTON_LABEL,
	AUDIT_GENERATION_DETAILS_SUMMARY,
	AUDIT_GENERATION_DETAILS_REJECTED_AI_INLINE_HINT,
	NARRATIVE_REJECTED_AI_DEBUG_TOPLEVEL_HINT,
	AUDIT_STRUCTURED_RENDER_LABEL,
	NARRATIVE_PREVIEW_WARNINGS_AUDIT_SUMMARY,
	NARRATIVE_PREVIEW_AI_FAILURE_UX_BANNER,
	NARRATIVE_PRIMARY_HEADER_HELPER,
	NARRATIVE_PREVIEW_DECISION_CUE,
	WORKFLOW_STRUCTURED_SECTION_TITLE,
	WORKFLOW_NARRATIVE_SECTION_TITLE,
	NARRATIVE_COMPOSITION_AI_FALLBACK_TITLE,
	NARRATIVE_COMPOSITION_AI_FALLBACK_BODY,
	NARRATIVE_COMPOSITION_ACTUAL_LABEL,
	NARRATIVE_COMPOSITION_BADGE_AI,
	NARRATIVE_COMPOSITION_BADGE_DETERMINISTIC,
	narrativeCompositionAiFallbackVisible,
	REJECTED_AI_DEBUG_SUMMARY,
	REJECTED_AI_DEBUG_HELPER,
	REJECTED_AI_DEBUG_NARRATIVE_HEADING,
	REJECTED_AI_DEBUG_TRIGGERS_BRIDGE,
	REJECTED_AI_DEBUG_TRIGGERS_HEADING,
	isNarrativePreviewAiFailureNoOutputDebug,
	isNarrativePreviewAiGuardRejectionDebug,
	formatRejectedAiFailureModelLine,
	formatRejectedAiFailureTimeoutLine,
	rejectedAiReasonTypeLabel
} from './narrativePreviewReviewUi';

describe('narrativePreviewReviewUi (P35-02)', () => {
	it('P37 — save-first helper for editor footer when notebook id is required', () => {
		expect(NARRATIVE_GENERATE_REQUIRES_SAVED_NOTE_HELPER).toContain('Save the note first');
	});

	it('P37 — audit summary hint when optional technical narrative detail exists (dev/admin)', () => {
		expect(AUDIT_GENERATION_DETAILS_REJECTED_AI_INLINE_HINT).toMatch(/Technical narrative details/i);
		expect(AUDIT_GENERATION_DETAILS_REJECTED_AI_INLINE_HINT).toMatch(/expand/i);
	});

	it('exposes workflow primary labels without phase wording', () => {
		expect(NARRATIVE_GENERATE_PRIMARY_LABEL).toBe('Generate Preview');
		expect(NARRATIVE_REGENERATE_PRIMARY_LABEL).toBe('Refresh Preview');
		expect(NARRATIVE_SAVE_DERIVED_BUTTON_LABEL).toBe('Save narrative snapshot');
		expect(WORKFLOW_STRUCTURED_SECTION_TITLE).toBe('Structured note');
		expect(WORKFLOW_NARRATIVE_SECTION_TITLE).toBe('Narrative preview');
	});

	it('exposes consolidated preview notice (single SoT / not-saved message for the narrative review surface)', () => {
		expect(NARRATIVE_PREVIEW_REVIEW_NOTICE_TITLE).toMatch(/preview only/i);
		expect(NARRATIVE_PREVIEW_REVIEW_NOTICE_TITLE).toMatch(/not saved/i);
		expect(NARRATIVE_PREVIEW_REVIEW_NOTICE_BODY.length).toBeGreaterThan(80);
		expect(NARRATIVE_PREVIEW_REVIEW_NOTICE_BODY).toMatch(/notebook/i);
		expect(NARRATIVE_PREVIEW_REVIEW_NOTICE_BODY).toMatch(/Accept loads/i);
		expect(NARRATIVE_PREVIEW_FRAMING_LABEL).toBe(NARRATIVE_PREVIEW_REVIEW_NOTICE_TITLE);
		expect(NARRATIVE_PREVIEW_FRAMING_HELPER).toBe(NARRATIVE_PREVIEW_REVIEW_NOTICE_BODY);
		expect(NARRATIVE_ACCEPT_NARRATIVE_BUTTON_LABEL).toBe('Accept narrative');
		expect(NARRATIVE_REJECT_NARRATIVE_BUTTON_LABEL).toBe('Reject narrative');
		expect(NARRATIVE_PREVIEW_TRACE_HEADING).toBeTruthy();
		expect(NARRATIVE_PREVIEW_TRACE_HELPER.length).toBeGreaterThan(20);
		expect(NARRATIVE_PREVIEW_TRACE_HELPER).toMatch(/preview/i);
		expect(NARRATIVE_PREVIEW_TRACE_EMPTY).toMatch(/not a rendering error/i);
		expect(NARRATIVE_SAVE_DERIVED_HELPER).toMatch(/snapshot|notebook/i);
		expect(NARRATIVE_SAVE_SUCCESS_MESSAGE).toMatch(/snapshot|saved/i);
		expect(SAVED_DERIVED_NARRATIVE_LABEL).toContain('Saved');
		expect(SAVED_DERIVED_SOT_HELPER).toMatch(/source of truth/i);
	});

	it('P35-03 — long trace source threshold and row keys (ordering preserved by index in UI)', () => {
		const pad = 'x'.repeat(TRACE_SOURCE_LONG_THRESHOLD_CHARS + 1);
		expect(isLongTraceSourceText(pad)).toBe(true);
		expect(isLongTraceSourceText('x'.repeat(TRACE_SOURCE_LONG_THRESHOLD_CHARS))).toBe(false);
		expect(traceRowKey(0, 'a')).toBe('0:a');
		expect(traceRowKey(1, 'a')).toBe('1:a');
	});

	it('applySuccessfulNarrativePayload carries trace and warnings; resets review to none', () => {
		const r = applySuccessfulNarrativePayload({
			narrative: 'A B',
			trace: [
				{ statementId: 'stmt_0001', sourceText: 'A' },
				{ statementId: 'stmt_0002', sourceText: 'B' }
			],
			warnings: ['Note 1: no extractable']
		});
		expect(r.narrative).toBe('A B');
		expect(r.trace).toHaveLength(2);
		expect(r.trace[0].statementId).toBe('stmt_0001');
		expect(r.trace[0].sourceText).toBe('A');
		expect(r.warnings).toEqual(['Note 1: no extractable']);
		expect(r.reviewStatus).toBe('none');
		expect(r.visible).toBe(true);
	});

	it('warnings are preserved as a copy (mutating source array does not affect result)', () => {
		const w: string[] = ['a'];
		const r = applySuccessfulNarrativePayload({ narrative: 'x', trace: [], warnings: w });
		w.push('b');
		expect(r.warnings).toEqual(['a']);
	});

	it('accept / reject helpers only change local status semantics (no I/O)', () => {
		expect(markNarrativePreviewLocalAccept()).toBe('accepted');
		expect(markNarrativePreviewLocalReject()).toBe('rejected');
		expect(NARRATIVE_PREVIEW_IN_SESSION_ACCEPT_HINT).toMatch(/in-session/i);
		expect(NARRATIVE_PREVIEW_IN_SESSION_REJECT_HINT).toMatch(/in-session/i);
	});

	it('empty bundle clears local preview state shape', () => {
		const e = emptyNarrativePreviewLocalBundle();
		expect(e.narrative).toBe('');
		expect(e.trace).toEqual([]);
		expect(e.warnings).toEqual([]);
		expect(e.reviewStatus).toBe('none');
		expect(e.visible).toBe(false);
		expect(e.error).toBe('');
	});

	it('regenerate success path: second applySuccessfulNarrativePayload replaces prior review status', () => {
		const first = applySuccessfulNarrativePayload({
			narrative: 'one',
			trace: [{ statementId: 's1', sourceText: 'one' }],
			warnings: []
		});
		expect(first.reviewStatus).toBe('none');
		const second = applySuccessfulNarrativePayload({
			narrative: 'two',
			trace: [{ statementId: 's2', sourceText: 'two' }],
			warnings: ['w']
		});
		expect(second.narrative).toBe('two');
		expect(second.trace[0].statementId).toBe('s2');
		expect(second.warnings).toEqual(['w']);
		expect(second.reviewStatus).toBe('none');
	});

	it('module does not import case engine client (accept/reject/clear cannot add network by this module)', () => {
		const dir = dirname(fileURLToPath(import.meta.url));
		const src = readFileSync(join(dir, 'narrativePreviewReviewUi.ts'), 'utf8');
		expect(src).not.toMatch(/postNarrativePreview/);
		expect(src).not.toMatch(/fetch\s*\(/);
	});

	it('P37 structured hidden — audit-only copy for collapsed generation details', () => {
		expect(AUDIT_GENERATION_DETAILS_SUMMARY).toMatch(/Structured extraction details/i);
		expect(AUDIT_STRUCTURED_RENDER_LABEL).toMatch(/internal/i);
		expect(NARRATIVE_PREVIEW_WARNINGS_AUDIT_SUMMARY).toMatch(/warnings/i);
		expect(NARRATIVE_PRIMARY_HEADER_HELPER).toMatch(/Structured extraction details/i);
		expect(NARRATIVE_PRIMARY_HEADER_HELPER).toMatch(/accept|reject|refresh|clear/i);
	});

	it('operator decision cue is plain and action-oriented', () => {
		expect(NARRATIVE_PREVIEW_DECISION_CUE).toMatch(/preview/i);
		expect(NARRATIVE_PREVIEW_DECISION_CUE).toMatch(/accept|reject/i);
	});
});

describe('narrativePreviewReviewUi (P35-08)', () => {
	it('parseNarrativeIntegrityPayload accepts valid envelope', () => {
		const p = parseNarrativeIntegrityPayload({
			status: 'degraded',
			signals: [{ code: 'LOW_TRACE_COVERAGE', message: 'x' }]
		});
		expect(p?.status).toBe('degraded');
		expect(p?.signals).toHaveLength(1);
		expect(p?.signals[0].code).toBe('LOW_TRACE_COVERAGE');
	});

	it('parseNarrativeIntegrityPayload rejects invalid shapes', () => {
		expect(parseNarrativeIntegrityPayload(null)).toBeNull();
		expect(parseNarrativeIntegrityPayload({ status: 'bad', signals: [] })).toBeNull();
		expect(parseNarrativeIntegrityPayload({ status: 'supported', signals: [{}] })).toBeNull();
	});

	it('integrity helper copy is present', () => {
		expect(NARRATIVE_INTEGRITY_HELPER).toMatch(/informational/i);
		expect(NARRATIVE_INTEGRITY_HELPER).toMatch(/token/i);
		expect(NARRATIVE_INTEGRITY_STATUS_SUPPORTED).toBe('Supported');
	});

	it('P35-07 / P36-03 — saved derived export copy stresses saved-record-only HTML', () => {
		expect(NARRATIVE_SAVED_DERIVED_EXPORT_LABEL).toMatch(/Export narrative/i);
		expect(NARRATIVE_SAVED_DERIVED_EXPORT_HELPER).toMatch(/saved record/i);
		expect(NARRATIVE_SAVED_DERIVED_EXPORT_HELPER).toMatch(/HTML/i);
		expect(NARRATIVE_SAVED_DERIVED_EXPORT_HELPER).toMatch(/preview/i);
	});
});

describe('narrativePreviewReviewUi (P35-06)', () => {
	it('exposes comparison heading, informational helper, and side labels', () => {
		expect(STRUCTURED_VS_NARRATIVE_DIFF_HEADING).toMatch(/Structured source vs narrative preview/i);
		expect(STRUCTURED_VS_NARRATIVE_DIFF_HELPER).toMatch(/informational/i);
		expect(STRUCTURED_VS_NARRATIVE_DIFF_HELPER).toMatch(/not adjudication/i);
		expect(STRUCTURED_VS_NARRATIVE_DIFF_HELPER).toMatch(/Read-only/i);
		expect(STRUCTURED_VS_NARRATIVE_DIFF_HELPER).toMatch(/editable/i);
		expect(COMPARE_SIDE_STRUCTURED_LABEL).toBe('Structured Source');
		expect(COMPARE_SIDE_NARRATIVE_LABEL).toBe('Narrative Output');
	});

	it('comparisonTraceRowsForDisplay preserves trace order (shallow copy)', () => {
		const rows = [
			{ statementId: 'a', sourceText: 'first' },
			{ statementId: 'b', sourceText: 'second' }
		];
		const out = comparisonTraceRowsForDisplay(rows);
		expect(out.map((r) => r.statementId)).toEqual(['a', 'b']);
		expect(out[0]).not.toBe(rows[0]);
		out[0].sourceText = 'mutated';
		expect(rows[0].sourceText).toBe('first');
	});
});

describe('narrativePreviewReviewUi — P37 AI narrative output contract', () => {
	it('narrativeCompositionAiFallbackVisible only when AI was requested and deterministic was used', () => {
		expect(narrativeCompositionAiFallbackVisible('ai', 'deterministic')).toBe(true);
		expect(narrativeCompositionAiFallbackVisible('ai', 'ai')).toBe(false);
		expect(narrativeCompositionAiFallbackVisible('deterministic', 'deterministic')).toBe(false);
		expect(narrativeCompositionAiFallbackVisible(null, 'deterministic')).toBe(false);
	});

	it('fallback and badge copy support primary review surface clarity', () => {
		expect(NARRATIVE_COMPOSITION_AI_FALLBACK_TITLE.length).toBeGreaterThan(5);
		expect(NARRATIVE_COMPOSITION_AI_FALLBACK_BODY).toMatch(/deterministic/i);
		expect(NARRATIVE_COMPOSITION_AI_FALLBACK_BODY).toMatch(/AI/i);
		expect(NARRATIVE_COMPOSITION_ACTUAL_LABEL).toMatch(/Narrative shown/i);
		expect(NARRATIVE_COMPOSITION_BADGE_AI).toMatch(/AI/);
		expect(NARRATIVE_COMPOSITION_BADGE_DETERMINISTIC).toMatch(/Deterministic/);
	});
});

describe('narrativePreviewReviewUi — P37 rejected AI debug (internal QA)', () => {
	it('top-level hint points to structured extraction details for optional technical narrative detail', () => {
		expect(NARRATIVE_REJECTED_AI_DEBUG_TOPLEVEL_HINT).toMatch(/Structured extraction details/i);
	});

	it('rejected AI debug copy states non-persistence and audit exclusion', () => {
		expect(REJECTED_AI_DEBUG_SUMMARY).toMatch(/AI Debug/i);
		expect(REJECTED_AI_DEBUG_SUMMARY).toMatch(/why AI output was not used/i);
		expect(REJECTED_AI_DEBUG_HELPER).toMatch(/Not saved/);
		expect(REJECTED_AI_DEBUG_HELPER).toMatch(/audit/);
		expect(REJECTED_AI_DEBUG_NARRATIVE_HEADING).toMatch(/Rejected AI output/);
		expect(REJECTED_AI_DEBUG_TRIGGERS_BRIDGE).toMatch(/Guard triggers/);
		expect(REJECTED_AI_DEBUG_TRIGGERS_HEADING).toMatch(/stable codes/);
	});

	it('rejectedAiReasonTypeLabel covers all reason types', () => {
		expect(rejectedAiReasonTypeLabel('meaning_drift')).toMatch(/meaning/i);
		expect(rejectedAiReasonTypeLabel('context_loss')).toMatch(/context/i);
		expect(rejectedAiReasonTypeLabel('other')).toMatch(/did not return a response/i);
		expect(rejectedAiReasonTypeLabel('other')).toMatch(/timeout|delay/i);
	});

	it('NARRATIVE_PREVIEW_AI_FAILURE_UX_BANNER copy', () => {
		expect(NARRATIVE_PREVIEW_AI_FAILURE_UX_BANNER).toMatch(/optional enhancement/i);
		expect(NARRATIVE_PREVIEW_AI_FAILURE_UX_BANNER).toMatch(/cleaned-up narrative/i);
	});

	it('isNarrativePreviewAiFailureNoOutputDebug matches Case Engine ai_failure debug', () => {
		expect(
			isNarrativePreviewAiFailureNoOutputDebug({
				rejectedAiNarrative: '',
				rejectedAiReasons: [{ code: 'ai_failure', label: 'AI request failed or timed out' }],
				rejectedAiReasonType: 'other'
			})
		).toBe(true);
		expect(
			isNarrativePreviewAiFailureNoOutputDebug({
				rejectedAiNarrative: 'x',
				rejectedAiReasons: [{ code: 'meaning_drift', label: 'x' }],
				rejectedAiReasonType: 'meaning_drift'
			})
		).toBe(false);
	});

	it('isNarrativePreviewAiGuardRejectionDebug is false for ai_failure debug', () => {
		expect(
			isNarrativePreviewAiGuardRejectionDebug({
				rejectedAiNarrative: '',
				rejectedAiReasons: [{ code: 'ai_failure', label: 'AI request failed or timed out' }],
				rejectedAiReasonType: 'other'
			})
		).toBe(false);
		expect(
			isNarrativePreviewAiGuardRejectionDebug({
				rejectedAiNarrative: 'x',
				rejectedAiReasons: [{ code: 'meaning_drift', label: 'x' }],
				rejectedAiReasonType: 'meaning_drift'
			})
		).toBe(true);
	});

	it('formatRejectedAiFailureModelLine and formatRejectedAiFailureTimeoutLine', () => {
		expect(formatRejectedAiFailureModelLine('  llama3:latest  ')).toBe('Model: llama3:latest');
		expect(formatRejectedAiFailureModelLine(undefined)).toBe(null);
		expect(formatRejectedAiFailureTimeoutLine(30000)).toBe('Timeout limit: 30000 ms');
		expect(formatRejectedAiFailureTimeoutLine(undefined)).toBe(null);
	});
});
