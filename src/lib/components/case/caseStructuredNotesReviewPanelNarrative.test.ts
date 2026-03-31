/**
 * P35-02 / P35-03 — Contract tests for narrative preview + trace UX in CaseStructuredNotesReviewPanel.svelte
 * (source assertions; no Svelte mount — matches repo patterns).
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';

const panelPath = join(dirname(fileURLToPath(import.meta.url)), 'CaseStructuredNotesReviewPanel.svelte');

describe('CaseStructuredNotesReviewPanel narrative preview (P35-02 / P35-03)', () => {
	it('frames preview-only copy and trace heading via narrativePreviewReviewUi', () => {
		const src = readFileSync(panelPath, 'utf8');
		expect(src).toMatch(/NARRATIVE_PREVIEW_FRAMING_LABEL/);
		expect(src).toMatch(/NARRATIVE_PREVIEW_FRAMING_HELPER/);
		expect(src).toMatch(/NARRATIVE_PREVIEW_TRACE_HEADING/);
		expect(src).toMatch(/NARRATIVE_PREVIEW_TRACE_HELPER/);
	});

	it('P35-03 — trace section has distinct framing, empty copy, order cues, long-text toggle', () => {
		const src = readFileSync(panelPath, 'utf8');
		expect(src).toMatch(/narrative-trace-section/);
		expect(src).toMatch(/narrative-trace-helper/);
		expect(src).toMatch(/NARRATIVE_PREVIEW_TRACE_EMPTY/);
		expect(src).toMatch(/data-trace-order=\{i \+ 1\}/);
		expect(src).toMatch(/toggleNarrativeTraceSourceExpanded/);
		expect(src).toMatch(/NARRATIVE_TRACE_SHOW_MORE/);
		expect(src).toMatch(/narrative-trace-toggle-source/);
	});

	it('renders trace rows with statementId and sourceText bindings', () => {
		const src = readFileSync(panelPath, 'utf8');
		expect(src).toMatch(/narrativePreviewTrace/);
		expect(src).toMatch(/row\.statementId/);
		expect(src).toMatch(/row\.sourceText/);
		expect(src).toMatch(/narrativePreviewWarnings/);
		expect(src).toMatch(/#each narrativePreviewTrace as row, i \(traceRowKey\(i, row\.statementId\)\)\}/);
	});

	it('surfaces warnings block when warnings array is present', () => {
		const src = readFileSync(panelPath, 'utf8');
		expect(src).toMatch(/narrativePreviewWarnings\.length/);
		expect(src).toMatch(/narrative-warning-item/);
	});

	it('P35-03 — warnings, narrative body, and trace section appear in sequence (distinct regions)', () => {
		const src = readFileSync(panelPath, 'utf8');
		const w = src.indexOf('data-testid="{testIdPrefix}-narrative-warnings"');
		const t = src.indexOf('data-testid="{testIdPrefix}-narrative-text"');
		const tr = src.indexOf('data-testid="{testIdPrefix}-narrative-trace-section"');
		expect(w).toBeGreaterThan(-1);
		expect(t).toBeGreaterThan(-1);
		expect(tr).toBeGreaterThan(-1);
		expect(w < t && t < tr).toBe(true);
	});

	it('exposes review actions with local handlers only', () => {
		const src = readFileSync(panelPath, 'utf8');
		expect(src).toMatch(/Accept Preview/);
		expect(src).toMatch(/Reject Preview/);
		expect(src).toMatch(/Clear Preview/);
		expect(src).toMatch(/handleNarrativeLocalAccept/);
		expect(src).toMatch(/handleNarrativeLocalReject/);
		expect(src).toMatch(/handleNarrativeLocalClear/);
	});

	it('calls postNarrativePreview only from generate handler (no extra network on accept/reject/clear/trace expand)', () => {
		const src = readFileSync(panelPath, 'utf8');
		const matches = src.match(/postNarrativePreview/g);
		expect(matches?.length).toBe(2);
		expect(src).toMatch(/async function handleGenerateNarrativePreview/);
		const genIdx = src.indexOf('async function handleGenerateNarrativePreview');
		const beforeGen = src.slice(0, genIdx);
		expect(beforeGen).not.toContain('postNarrativePreview(');
		expect(src).toMatch(/function toggleNarrativeTraceSourceExpanded/);
		const toggleIdx = src.indexOf('function toggleNarrativeTraceSourceExpanded');
		const toggleBlock = src.slice(toggleIdx, toggleIdx + 400);
		expect(toggleBlock).not.toContain('postNarrativePreview');
	});

	it('regenerate uses same handler as generate (applySuccessfulNarrativePayload resets in-session review)', () => {
		const src = readFileSync(panelPath, 'utf8');
		expect(src).toMatch(/Regenerate Narrative Preview/);
		expect(src).toMatch(/applySuccessfulNarrativePayload/);
	});

	it('P35-05 — saved derived section is distinct from preview; list/detail testids; no edit/delete', () => {
		const src = readFileSync(panelPath, 'utf8');
		expect(src).toMatch(/saved-derived-narratives/);
		expect(src).toMatch(/SAVED_DERIVED_NARRATIVE_LABEL/);
		expect(src).toMatch(/getNarrativeRecordsList/);
		expect(src).toMatch(/getNarrativeRecordDetail/);
		expect(src).toMatch(/narrative-preview/);
		expect(src).not.toMatch(/Delete/);
		expect(src).not.toMatch(/Edit saved/i);
	});

	it('P35-04 — explicit save uses postNarrativeRecord only in save handler; accept/reject stay local', () => {
		const src = readFileSync(panelPath, 'utf8');
		expect(src).toMatch(/postNarrativeRecord/);
		expect(src).toMatch(/handleSaveAcceptedNarrative/);
		expect(src).toMatch(/narrative-save-derived/);
		expect(src).toMatch(/Save Accepted Narrative/);
		expect(src).toMatch(/NARRATIVE_SAVE_DERIVED_HELPER/);
		expect(src).toMatch(/NARRATIVE_SAVE_SUCCESS_MESSAGE/);
		const postIdx = src.indexOf('postNarrativeRecord');
		const acceptIdx = src.indexOf('function handleNarrativeLocalAccept');
		const rejectIdx = src.indexOf('function handleNarrativeLocalReject');
		expect(postIdx).toBeGreaterThan(-1);
		expect(src.slice(acceptIdx, acceptIdx + 120)).not.toContain('postNarrativeRecord');
		expect(src.slice(rejectIdx, rejectIdx + 120)).not.toContain('postNarrativeRecord');
	});

	it('P35-06 — comparison surface: live preview vs saved record; labels; order; read-only', () => {
		const src = readFileSync(panelPath, 'utf8');
		expect(src).toMatch(/STRUCTURED_VS_NARRATIVE_DIFF_HEADING/);
		expect(src).toMatch(/STRUCTURED_VS_NARRATIVE_DIFF_HELPER/);
		expect(src).toMatch(/COMPARE_SIDE_STRUCTURED_LABEL/);
		expect(src).toMatch(/COMPARE_SIDE_NARRATIVE_LABEL/);
		expect(src).toMatch(/preview-diff-review/);
		expect(src).toMatch(/saved-diff-review/);
		expect(src).toMatch(/preview-diff-structured/);
		expect(src).toMatch(/preview-diff-narrative/);
		expect(src).toMatch(/saved-diff-structured/);
		expect(src).toMatch(/saved-diff-narrative/);
		expect(src).toMatch(/preview-diff-source-row/);
		expect(src).toMatch(/saved-diff-source-row/);
		const tr = src.indexOf('data-testid="{testIdPrefix}-narrative-trace-section"');
		const prevDiff = src.indexOf('data-testid="{testIdPrefix}-preview-diff-review"');
		expect(tr).toBeGreaterThan(-1);
		expect(prevDiff).toBeGreaterThan(-1);
		expect(tr < prevDiff).toBe(true);
		expect(src).toMatch(/data-diff-order=\{i \+ 1\}/);
		expect(src).toMatch(/readonly/);
		expect(src).toMatch(/preview-diff-narrative-text/);
		expect(src).toMatch(/saved-detail-narrative/);
	});

	it('P35-06 — viewing comparison does not add API calls (same narrative-preview / record fetch sites)', () => {
		const src = readFileSync(panelPath, 'utf8');
		expect(src.match(/postNarrativePreview/g)?.length).toBe(2);
		expect(src.match(/getNarrativeRecordDetail/g)?.length).toBe(2);
		expect(src.match(/getNarrativeRecordsList/g)?.length).toBe(2);
	});

	it('P35-07 — saved derived export UI; no export on preview path', () => {
		const src = readFileSync(panelPath, 'utf8');
		expect(src).toMatch(/saved-export-derived/);
		expect(src).toMatch(/saved-derived-export/);
		expect(src).toMatch(/downloadNarrativeRecordExport/);
		expect(src).toMatch(/NARRATIVE_SAVED_DERIVED_EXPORT_LABEL/);
		expect(src).not.toMatch(/preview-export/);
		expect(src.match(/downloadNarrativeRecordExport/g)?.length).toBe(2);
	});

	it('P35-08 — integrity section in preview and saved detail; status badge; no extra API calls', () => {
		const src = readFileSync(panelPath, 'utf8');
		expect(src).toMatch(/preview-integrity/);
		expect(src).toMatch(/saved-integrity/);
		expect(src).toMatch(/NARRATIVE_INTEGRITY_SECTION_HEADING/);
		expect(src).toMatch(/NARRATIVE_INTEGRITY_HELPER/);
		expect(src).toMatch(/preview-integrity-status/);
		expect(src).toMatch(/saved-integrity-status/);
		expect(src).toMatch(/narrativeIntegrityBadgeClass/);
		expect(src.match(/postNarrativePreview/g)?.length).toBe(2);
		expect(src.match(/getNarrativeRecordDetail/g)?.length).toBe(2);
	});
});
