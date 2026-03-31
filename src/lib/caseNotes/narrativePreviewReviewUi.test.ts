/**
 * P35-02 — Narrative preview review UX (pure helpers + copy; no component mount; no fetch).
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import {
	NARRATIVE_PREVIEW_FRAMING_HELPER,
	NARRATIVE_PREVIEW_FRAMING_LABEL,
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
	NARRATIVE_SAVED_DERIVED_EXPORT_HELPER
} from './narrativePreviewReviewUi';

describe('narrativePreviewReviewUi (P35-02)', () => {
	it('exposes framing label and helper text for preview-only UX', () => {
		expect(NARRATIVE_PREVIEW_FRAMING_LABEL).toContain('Preview Only');
		expect(NARRATIVE_PREVIEW_FRAMING_LABEL).toContain('Not Saved');
		expect(NARRATIVE_PREVIEW_FRAMING_HELPER.length).toBeGreaterThan(40);
		expect(NARRATIVE_PREVIEW_FRAMING_HELPER).toMatch(/source of truth/i);
		expect(NARRATIVE_PREVIEW_TRACE_HEADING).toBeTruthy();
		expect(NARRATIVE_PREVIEW_TRACE_HELPER.length).toBeGreaterThan(20);
		expect(NARRATIVE_PREVIEW_TRACE_HELPER).toMatch(/server order/i);
		expect(NARRATIVE_PREVIEW_TRACE_EMPTY).toMatch(/not a rendering error/i);
		expect(NARRATIVE_SAVE_DERIVED_HELPER).toMatch(/source of truth/i);
		expect(NARRATIVE_SAVE_SUCCESS_MESSAGE).toMatch(/derived/i);
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
		expect(NARRATIVE_INTEGRITY_HELPER).toMatch(/source of truth/i);
		expect(NARRATIVE_INTEGRITY_STATUS_SUPPORTED).toBe('Supported');
	});

	it('P35-07 — saved derived export copy stresses saved-record-only', () => {
		expect(NARRATIVE_SAVED_DERIVED_EXPORT_LABEL).toMatch(/saved record/i);
		expect(NARRATIVE_SAVED_DERIVED_EXPORT_HELPER).toMatch(/plain-text/i);
		expect(NARRATIVE_SAVED_DERIVED_EXPORT_HELPER).toMatch(/preview/i);
	});
});

describe('narrativePreviewReviewUi (P35-06)', () => {
	it('exposes comparison heading, informational helper, and side labels', () => {
		expect(STRUCTURED_VS_NARRATIVE_DIFF_HEADING).toMatch(/Structured vs narrative comparison/i);
		expect(STRUCTURED_VS_NARRATIVE_DIFF_HELPER).toMatch(/informational/i);
		expect(STRUCTURED_VS_NARRATIVE_DIFF_HELPER).toMatch(/not adjudication/i);
		expect(STRUCTURED_VS_NARRATIVE_DIFF_HELPER).toMatch(/authoritative/i);
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
