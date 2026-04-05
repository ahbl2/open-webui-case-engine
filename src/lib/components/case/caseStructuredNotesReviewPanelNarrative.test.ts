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
		expect(src).toMatch(/NARRATIVE_PREVIEW_REVIEW_NOTICE_TITLE/);
		expect(src).toMatch(/NARRATIVE_PREVIEW_REVIEW_NOTICE_BODY/);
		expect(src).toMatch(/ADVANCED_REVIEW_TRACE_SUMMARY/);
		expect(src).toMatch(/NARRATIVE_PREVIEW_TRACE_HELPER/);
	});

	it('P35-03 — trace section has distinct framing, empty copy, order cues, long-text toggle', () => {
		const src = readFileSync(panelPath, 'utf8');
		expect(src).toMatch(/narrative-trace-section/);
		expect(src).toMatch(/narrative-trace-details/);
		expect(src).toMatch(/narrative-trace-summary/);
		expect(src).toMatch(/narrative-trace-helper/);
		expect(src).toMatch(/NARRATIVE_PREVIEW_TRACE_EMPTY/);
		expect(src).toMatch(/data-trace-order=\{i \+ 1\}/);
		expect(src).toMatch(/toggleNarrativeTraceSourceExpanded/);
		expect(src).toMatch(/NARRATIVE_TRACE_SHOW_MORE/);
		expect(src).toMatch(/narrative-trace-toggle-source/);
	});

	it('narrative source trace (collapsed) omits Statement ID label and ID line noise', () => {
		const src = readFileSync(panelPath, 'utf8');
		const trd = src.indexOf('data-testid="{testIdPrefix}-narrative-trace-details"');
		const cmp = src.indexOf('data-testid="{testIdPrefix}-narrative-compare-details"');
		expect(trd).toBeGreaterThan(-1);
		expect(cmp).toBeGreaterThan(-1);
		expect(trd < cmp).toBe(true);
		const traceOnly = src.slice(trd, cmp);
		expect(traceOnly).not.toMatch(/Statement ID/);
		expect(traceOnly).not.toMatch(/font-mono/);
	});

	it('P37 follow-up — source trace is collapsible details without default open (collapsed by default)', () => {
		const src = readFileSync(panelPath, 'utf8');
		const det = src.indexOf('data-testid="{testIdPrefix}-narrative-trace-details"');
		expect(det).toBeGreaterThan(-1);
		const slice = src.slice(det - 320, det + 80);
		expect(slice).toMatch(/<details/);
		expect(slice).not.toMatch(/open=/);
		expect(src).toMatch(/<\/details>/);
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

	it('P37 operator cleanup — deterministic-only preview; no composition radios or dual path', () => {
		const src = readFileSync(panelPath, 'utf8');
		expect(src).not.toMatch(/narrative-composition-mode/);
		expect(src).not.toMatch(/narrative-composition-status/);
		expect(src).not.toMatch(/narrativePreviewCompositionMode/);
		expect(src).not.toMatch(/AI \(experimental, local Ollama\)/);
		expect(src).toMatch(/const mode = 'deterministic'/);
		expect(src).toMatch(/compositionMode:\s*mode/);
	});

	it('P37 follow-up — narrative primary order: compare first, then cue/helper, actions + pills, warnings audit, structured audit, trace', () => {
		const src = readFileSync(panelPath, 'utf8');
		const cmp = src.indexOf('data-testid="{testIdPrefix}-narrative-primary-compare"');
		const t = src.indexOf('data-testid="{testIdPrefix}-narrative-text"');
		const cue = src.indexOf('data-testid="{testIdPrefix}-narrative-decision-cue"');
		const act = src.indexOf('data-testid="{testIdPrefix}-narrative-review-actions"');
		const warnAudit = src.indexOf('data-testid="{testIdPrefix}-narrative-warnings-audit"');
		const genAudit = src.indexOf('generation-audit-details');
		const trd = src.indexOf('data-testid="{testIdPrefix}-narrative-trace-details"');
		const persist = src.indexOf('data-testid="{testIdPrefix}-narrative-persist"');
		const diffDetails = src.indexOf('data-testid="{testIdPrefix}-narrative-compare-details"');
		expect(cmp).toBeGreaterThan(-1);
		expect(t).toBeGreaterThan(-1);
		expect(act).toBeGreaterThan(-1);
		expect(trd).toBeGreaterThan(-1);
		expect(cmp < t && t < cue && cue < act).toBe(true);
		expect(act < warnAudit && warnAudit < genAudit && genAudit < trd).toBe(true);
		expect(trd < diffDetails && diffDetails < persist).toBe(true);
		expect(src.indexOf('data-testid="{testIdPrefix}-narrative-review-actions"', act + 1)).toBe(-1);
		const actionsThroughTrace = src.slice(act, trd);
		expect(actionsThroughTrace).toMatch(/narrative-in-session-accepted/);
		expect(actionsThroughTrace).toMatch(/narrative-in-session-rejected/);
		expect(actionsThroughTrace).not.toMatch(/narrative-trace-details/);
		const frameAfterCompare = src.indexOf('data-testid="{testIdPrefix}-narrative-framing-label"', cmp);
		expect(frameAfterCompare).toBeGreaterThan(cmp);
		const trs = src.indexOf('data-testid="{testIdPrefix}-narrative-trace-section"');
		expect(trs).toBeGreaterThan(trd);
	});

	it('narrative primary — compare grid precedes post-compare helper (operator cue + dev header helper)', () => {
		const src = readFileSync(panelPath, 'utf8');
		const cmp = src.indexOf('data-testid="{testIdPrefix}-narrative-primary-compare"');
		const opCue = src.indexOf('data-testid="{testIdPrefix}-narrative-decision-cue"');
		const devHelper = src.indexOf('data-testid="{testIdPrefix}-narrative-primary-header-helper"');
		expect(cmp).toBeGreaterThan(-1);
		expect(opCue).toBeGreaterThan(-1);
		expect(devHelper).toBeGreaterThan(-1);
		expect(cmp < opCue && cmp < devHelper).toBe(true);
		const afterCmp = src.slice(cmp);
		expect(afterCmp).toMatch(/\{NARRATIVE_PRIMARY_HEADER_HELPER\}/);
		expect(afterCmp).toMatch(/\{NARRATIVE_PREVIEW_DECISION_CUE\}/);
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

	it('P37 — pipeline nonce cursor initializes from prop (remount must not auto-fire narrative preview)', () => {
		const src = readFileSync(panelPath, 'utf8');
		expect(src).toMatch(/lastNarrativePipelineNonceHandled = narrativePipelineNonce/);
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
		expect(src).toMatch(/NARRATIVE_REGENERATE_PRIMARY_LABEL/);
		expect(src).toMatch(/applySuccessfulNarrativePayload/);
	});

	it('P37 follow-up — no duplicate violet “Derived preview — not saved” paragraph (single amber notice only)', () => {
		const src = readFileSync(panelPath, 'utf8');
		expect(src).not.toMatch(/Derived preview — not saved/);
	});

	it('P37 follow-up — Option B Accept / Reject use narrativePreviewReviewUi button labels', () => {
		const src = readFileSync(panelPath, 'utf8');
		expect(src).toMatch(/NARRATIVE_ACCEPT_NARRATIVE_BUTTON_LABEL/);
		expect(src).toMatch(/NARRATIVE_REJECT_NARRATIVE_BUTTON_LABEL/);
	});

	it('P37 — structured extraction surface + save snapshot gated to dev/admin; save follows compare-details', () => {
		const src = readFileSync(panelPath, 'utf8');
		const gate = src.indexOf('{#if narrativePreviewTechnicalDetailVisible}');
		const surface = src.indexOf('data-testid={`${testIdPrefix}-narrative-primary-surface`}');
		const audit = src.indexOf('generation-audit-details');
		const persist = src.indexOf('narrative-persist');
		const diffDetails = src.indexOf('narrative-compare-details');
		expect(gate).toBeGreaterThan(-1);
		expect(surface).toBeGreaterThan(-1);
		expect(audit).toBeGreaterThan(-1);
		expect(persist).toBeGreaterThan(-1);
		expect(diffDetails).toBeGreaterThan(-1);
		expect(surface < audit).toBe(true);
		expect(diffDetails < persist).toBe(true);
	});

	it('P37 — rejected AI debug: subcomponent + panel wiring; collapsed details (no open attribute)', () => {
		const panel = readFileSync(panelPath, 'utf8');
		expect(panel).toMatch(/RejectedAiNarrativeDebugSection/);
		expect(panel).toMatch(/narrativePreviewRejectedAiDebug/);
		expect(panel).toMatch(/r\.data\.debug/);
		const dbgPath = join(dirname(panelPath), 'RejectedAiNarrativeDebugSection.svelte');
		const dbg = readFileSync(dbgPath, 'utf8');
		expect(dbg).toMatch(/data-testid="\{testIdPrefix\}-rejected-ai-debug"/);
		expect(dbg).not.toContain('<details open');
	});

	it('P37 operator cleanup — no forensic debug state marker or console forensic markers in preview', () => {
		const panel = readFileSync(panelPath, 'utf8');
		expect(panel).not.toMatch(/narrative-debug-state/);
		expect(panel).not.toMatch(/DEBUG_STATE/);
		expect(panel).not.toMatch(/\[narrative-debug render\]/);
		expect(panel).not.toMatch(/\[narrative-debug panel\]/);
	});

	it('P37 — AI failure (no output) UX banner above warnings when ai_failure debug', () => {
		const panel = readFileSync(panelPath, 'utf8');
		expect(panel).toMatch(/NARRATIVE_PREVIEW_AI_FAILURE_UX_BANNER/);
		expect(panel).toMatch(/isNarrativePreviewAiFailureNoOutputDebug/);
		expect(panel).toMatch(/narrative-ai-failure-ux-banner/);
		expect(panel).toMatch(/border-red-300/);
	});

	it('P37 — guard rejection UX banner when rejected-AI debug is not ai_failure', () => {
		const panel = readFileSync(panelPath, 'utf8');
		expect(panel).toMatch(/NARRATIVE_PREVIEW_AI_GUARD_REJECTION_UX_BANNER/);
		expect(panel).toMatch(/isNarrativePreviewAiGuardRejectionDebug/);
		expect(panel).toMatch(/narrative-ai-guard-rejection-ux-banner/);
	});

	it('P37 — rejected AI debug in internal audit: gated to dev/admin; primary compare precedes generation audit', () => {
		const panel = readFileSync(panelPath, 'utf8');
		expect(panel).toMatch(/onNarrativePreviewFullPane/);
		expect(panel).toMatch(/AUDIT_GENERATION_DETAILS_REJECTED_AI_INLINE_HINT/);
		expect(panel).toMatch(/generation-audit-rejected-ai-hint/);
		const auditOpen = panel.indexOf('data-testid={`${testIdPrefix}-generation-audit-details`}');
		const compareIdx = panel.indexOf('data-testid="{testIdPrefix}-narrative-primary-compare"');
		expect(auditOpen).toBeGreaterThan(-1);
		expect(compareIdx).toBeGreaterThan(-1);
		expect(compareIdx).toBeLessThan(auditOpen);
		const auditHead = panel.slice(auditOpen, auditOpen + 14000);
		expect(auditHead).toMatch(/RejectedAiNarrativeDebugSection/);
		expect(auditHead).toMatch(
			/narrativePreviewTechnicalDetailVisible && narrativePreviewRejectedAiDebug && narrativePrimaryWorkflow/
		);
		expect(auditHead).not.toMatch(/open=\{narrativePreviewRejectedAiDebug != null\}/);
		expect(panel).toMatch(/narrative-rejected-ai-debug-toplevel-hint/);
		expect(panel).toMatch(/NARRATIVE_REJECTED_AI_DEBUG_TOPLEVEL_HINT/);
	});

	it('P37 Option B — narrative pipeline nonce reactive invokes handleGenerateNarrativePreview', () => {
		const src = readFileSync(panelPath, 'utf8');
		expect(src).toMatch(/export let narrativePipelineNonce/);
		expect(src).toMatch(/lastNarrativePipelineNonceHandled/);
		const nonceIdx = src.indexOf('narrativePipelineNonce > lastNarrativePipelineNonceHandled');
		expect(nonceIdx).toBeGreaterThan(-1);
		const nonceBlock = src.slice(nonceIdx, nonceIdx + 420);
		expect(nonceBlock).toMatch(/void handleGenerateNarrativePreview\(\)/);
		expect(src).toMatch(/transientSourceText/);
	});

	it('P35-05 — saved derived section is distinct from preview; list/detail testids; no edit of saved record', () => {
		const src = readFileSync(panelPath, 'utf8');
		expect(src).toMatch(/saved-derived-narratives/);
		expect(src).toMatch(/SAVED_DERIVED_NARRATIVE_LABEL/);
		expect(src).toMatch(/getNarrativeRecordsList/);
		expect(src).toMatch(/getNarrativeRecordDetail/);
		expect(src).toMatch(/narrative-preview/);
		expect(src).not.toMatch(/Edit saved/i);
	});

	it('P36-01 — soft-delete saved narrative: confirm + API + refresh; button in saved detail only', () => {
		const src = readFileSync(panelPath, 'utf8');
		expect(src).toMatch(/postNarrativeRecordSoftDelete/);
		expect(src).toMatch(/NARRATIVE_SAVED_DELETE_LABEL/);
		expect(src).toMatch(/NARRATIVE_SAVED_DELETE_CONFIRM_MESSAGE/);
		expect(src).toMatch(/handleDeleteSavedNarrative/);
		expect(src).toMatch(/saved-delete-derived/);
		expect(src).toMatch(/confirm\(/);
	});

	it('P35-04 — explicit save uses postNarrativeRecord only in save handler; accept/reject stay local', () => {
		const src = readFileSync(panelPath, 'utf8');
		expect(src).toMatch(/postNarrativeRecord/);
		expect(src).toMatch(/handleSaveAcceptedNarrative/);
		expect(src).toMatch(/narrative-save-derived/);
		expect(src).toMatch(/NARRATIVE_SAVE_DERIVED_BUTTON_LABEL/);
		expect(src).toMatch(/NARRATIVE_SAVE_DERIVED_HELPER/);
		expect(src).toMatch(/NARRATIVE_SAVE_SUCCESS_MESSAGE/);
		const postIdx = src.indexOf('postNarrativeRecord');
		const acceptIdx = src.indexOf('function handleNarrativeLocalAccept');
		const rejectIdx = src.indexOf('function handleNarrativeLocalReject');
		expect(postIdx).toBeGreaterThan(-1);
		expect(src.slice(acceptIdx, acceptIdx + 120)).not.toContain('postNarrativeRecord');
		expect(src.slice(rejectIdx, rejectIdx + 120)).not.toContain('postNarrativeRecord');
	});

	it('Compare details (live preview) gates on dev/admin OR integrity; not trace-only for operators', () => {
		const src = readFileSync(panelPath, 'utf8');
		expect(src).toMatch(
			/\{#if narrativePreviewTechnicalDetailVisible \|\| narrativePreviewIntegrity != null\}/
		);
		const gate = src.indexOf('{#if narrativePreviewTechnicalDetailVisible || narrativePreviewIntegrity != null}');
		const innerIntegrity = src.indexOf('{#if narrativePreviewIntegrity}');
		expect(gate).toBeGreaterThan(-1);
		expect(innerIntegrity).toBeGreaterThan(-1);
		expect(innerIntegrity > gate).toBe(true);
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
		const trd = src.indexOf('data-testid="{testIdPrefix}-narrative-trace-details"');
		const prevDiff = src.indexOf('data-testid="{testIdPrefix}-preview-diff-review"');
		expect(trd).toBeGreaterThan(-1);
		expect(prevDiff).toBeGreaterThan(-1);
		expect(trd < prevDiff).toBe(true);
		expect(src).toMatch(/data-diff-order=\{i \+ 1\}/);
		expect(src).toMatch(/readonly/);
		expect(src).toMatch(/preview-diff-narrative-text/);
		expect(src).toMatch(/saved-detail-narrative/);
	});

	it('P35-06 — viewing comparison does not add API calls (same narrative-preview / record fetch sites)', () => {
		const src = readFileSync(panelPath, 'utf8');
		expect(src.match(/postNarrativePreview/g)?.length).toBe(2);
		expect(src.match(/getNarrativeRecordDetail/g)?.length).toBe(3);
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

	it('P36-05 — saved export governance: eligibility state, confirm before degraded export, ack flag, block not_eligible', () => {
		const src = readFileSync(panelPath, 'utf8');
		expect(src).toMatch(/savedExportEligibility/);
		expect(src).toMatch(/NarrativeExportEligibilityDto/);
		expect(src).toMatch(/saved-export-not-eligible/);
		expect(src).toMatch(/acknowledgeExportWarning/);
		const exportHandler = src.indexOf('async function handleExportSavedNarrative');
		expect(exportHandler).toBeGreaterThan(-1);
		const handlerSlice = src.slice(exportHandler, exportHandler + 900);
		expect(handlerSlice).toMatch(/eligible_with_warning/);
		expect(handlerSlice).toMatch(/window\.confirm/);
		expect(handlerSlice).toMatch(/not_eligible/);
		expect(handlerSlice).toMatch(/downloadNarrativeRecordExport\(/);
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
		expect(src.match(/getNarrativeRecordDetail/g)?.length).toBe(3);
	});

	it('P37-02 — ADMIN show-deleted toggle + split list sections; deleted row uses includeDeleted detail fetch; no auto-restore', () => {
		const src = readFileSync(panelPath, 'utf8');
		expect(src).toMatch(/narrative-show-deleted-toggle/);
		expect(src).toMatch(/toggleShowDeletedSavedNarratives/);
		expect(src).toMatch(/showDeletedNarrativesInList/);
		expect(src).toMatch(/getNarrativeRecordsList\([\s\S]*includeDeleted:\s*true/);
		expect(src).toMatch(/saved-list-deleted-section/);
		expect(src).toMatch(/saved-list-deleted-item/);
		expect(src).toMatch(/saved-list-active-section/);
		expect(src).toMatch(/NARRATIVE_SHOW_DELETED_LABEL/);
		expect(src).toMatch(/NARRATIVE_SAVED_LIST_DELETED_HEADING/);
		const delClick = src.indexOf('saved-list-deleted-item');
		expect(delClick).toBeGreaterThan(-1);
		expect(src.slice(delClick, delClick + 400)).toMatch(
			/onSelectSavedRecord\(rec\.id,\s*\{\s*recordSoftDeleted:\s*true\s*\}\)/
		);
	});

	it('P37-01 — ADMIN recover strip, load deleted detail with includeDeleted, restore + confirm; export/delete disabled when soft-deleted', () => {
		const src = readFileSync(panelPath, 'utf8');
		expect(src).toMatch(/postNarrativeRecordRestore/);
		expect(src).toMatch(/narrativeRestoreAdminEnabled/);
		expect(src).toMatch(/narrativePreviewTechnicalDetailVisible/);
		expect(src).toMatch(/narrative-admin-recover/);
		expect(src).toMatch(/includeDeleted:\s*true/);
		expect(src).toMatch(/handleRestoreSavedNarrative/);
		expect(src).toMatch(/saved-restore-narrative/);
		expect(src).toMatch(/NARRATIVE_RESTORE_LABEL/);
		expect(src).toMatch(/NARRATIVE_RESTORE_CONFIRM_MESSAGE/);
		expect(src).toMatch(/savedRecordSoftDeleted/);
		const restoreIdx = src.indexOf('async function handleRestoreSavedNarrative');
		expect(restoreIdx).toBeGreaterThan(-1);
		const restoreSlice = src.slice(restoreIdx, restoreIdx + 700);
		expect(restoreSlice).toMatch(/confirm\(/);
		expect(restoreSlice).toMatch(/postNarrativeRecordRestore\(/);
		expect(restoreSlice).toMatch(/refreshSavedNarrativeList/);
		expect(restoreSlice).toMatch(/onSelectSavedRecord/);
	});

	it('narrative primary — operator decision cue testid + copy import for quick review', () => {
		const src = readFileSync(panelPath, 'utf8');
		expect(src).toMatch(/narrative-decision-cue/);
		expect(src).toMatch(/NARRATIVE_PREVIEW_DECISION_CUE/);
	});

	it('Notes workflow copy: primary actions and sections; no phase/prototype user strings in panel', () => {
		const src = readFileSync(panelPath, 'utf8');
		expect(src).toMatch(/NARRATIVE_GENERATE_PRIMARY_LABEL/);
		expect(src).toMatch(/WORKFLOW_STRUCTURED_SECTION_TITLE/);
		expect(src).toMatch(/WORKFLOW_REVIEW_STRUCTURED_SUBHEAD/);
		expect(src).toMatch(/WORKFLOW_NARRATIVE_SECTION_TITLE/);
		expect(src).toMatch(/workflow-structured-section/);
		expect(src).toMatch(/workflow-review-structured-subhead/);
		expect(src).toMatch(/notes-workflow-shimmer/);
		expect(src).not.toMatch(/P34 prototype/i);
		expect(src).not.toMatch(/👉/);
	});

	it('saved derived narrative block follows narrative preview in document order', () => {
		const src = readFileSync(panelPath, 'utf8');
		const prev = src.indexOf('data-testid="{testIdPrefix}-narrative-preview"');
		const saved = src.indexOf('data-testid="{testIdPrefix}-saved-derived-narratives"');
		expect(prev).toBeGreaterThan(-1);
		expect(saved).toBeGreaterThan(-1);
		expect(prev < saved).toBe(true);
	});

	it('admin recover strip is after saved-derived testid region', () => {
		const src = readFileSync(panelPath, 'utf8');
		const saved = src.indexOf('data-testid="{testIdPrefix}-saved-derived-narratives"');
		const admin = src.indexOf('data-testid="{testIdPrefix}-narrative-admin-recover"');
		expect(saved).toBeGreaterThan(-1);
		expect(admin).toBeGreaterThan(-1);
		expect(saved < admin).toBe(true);
	});

	it('admin recover UI is gated with narrativePreviewTechnicalDetailVisible (dev || admin)', () => {
		const src = readFileSync(panelPath, 'utf8');
		const adminBlock = src.indexOf('data-testid="{testIdPrefix}-narrative-admin-recover"');
		expect(adminBlock).toBeGreaterThan(-1);
		const gateBefore = src.lastIndexOf('{#if narrativePreviewTechnicalDetailVisible}', adminBlock);
		expect(gateBefore).toBeGreaterThan(-1);
		expect(gateBefore < adminBlock).toBe(true);
	});

	it('P37 follow-up — narrative preview workbench: body scroll host excludes saved snapshots; persist lives in scroll', () => {
		const src = readFileSync(panelPath, 'utf8');
		expect(src).toMatch(
			/\{#if narrativePreviewSectionAllowed \|\| \(caseId && caseEngineToken\)\}/
		);
		expect(src).toMatch(/data-testid="\{testIdPrefix\}-narrative-preview-body-scroll"/);
		const prev = src.indexOf('data-testid="{testIdPrefix}-narrative-preview"');
		const scroll = src.indexOf('data-testid="{testIdPrefix}-narrative-preview-body-scroll"');
		const saved = src.indexOf('data-testid="{testIdPrefix}-saved-derived-narratives"');
		const past = src.indexOf('data-testid="{testIdPrefix}-narrative-past-snapshots"');
		const persist = src.indexOf('data-testid="{testIdPrefix}-narrative-persist"');
		expect(prev).toBeGreaterThan(-1);
		expect(scroll).toBeGreaterThan(-1);
		expect(saved).toBeGreaterThan(-1);
		expect(past).toBeGreaterThan(-1);
		expect(persist).toBeGreaterThan(-1);
		expect(prev < scroll && scroll < past && past < saved).toBe(true);
		expect(scroll < persist && persist < past).toBe(true);
		const scrollTagEnd = src.indexOf('>', scroll) + 1;
		const scrollBody = src.slice(scrollTagEnd, past);
		expect(scrollBody).not.toContain('saved-derived-narratives');
		expect(scrollBody).not.toContain('narrative-past-snapshots');
		expect(scrollBody).toContain('narrative-persist');
		expect(src).not.toMatch(/max-h-\[min\(92dvh,60rem\)\]/);
		const outer = src.slice(Math.max(0, prev - 400), scroll + 120);
		expect(outer).toMatch(/flex flex-col flex-1 min-h-0/);
		const scrollSlice = src.slice(Math.max(0, scroll - 120), scroll + 80);
		expect(scrollSlice).toMatch(/flex-1 min-h-0 overflow-y-auto/);
	});

	it('P37 follow-up — narrative compare panes: compact min-height, content-sized divs, no inner scroll (outer body scroll only)', () => {
		const src = readFileSync(panelPath, 'utf8');
		expect(src).toMatch(/data-testid="\{testIdPrefix\}-narrative-primary-compare"/);
		expect(src).toMatch(/md:grid-cols-2/);
		expect(src).toMatch(/items-start/);
		expect(src).toMatch(/data-testid="\{testIdPrefix\}-narrative-compare-original-pane"/);
		expect(src).toMatch(/data-testid="\{testIdPrefix\}-narrative-compare-preview-pane"/);
		expect(src).toMatch(/min-h-\[5\.25rem\]/);
		const cmp = src.indexOf('data-testid="{testIdPrefix}-narrative-primary-compare"');
		expect(cmp).toBeGreaterThan(-1);
		const act = src.indexOf('data-testid="{testIdPrefix}-narrative-review-actions"');
		const compareThroughCue = src.slice(cmp, act);
		expect(compareThroughCue).not.toMatch(/overflow-y-auto/);
		expect(compareThroughCue).not.toMatch(/max-h-\[min\(24rem,55vh\)\]/);
		expect(compareThroughCue).not.toMatch(/max-h-/);
		expect(compareThroughCue).not.toMatch(/textarea/);
		expect(compareThroughCue).not.toMatch(/\[field-sizing:content\]/);
		const cmpBlock = src.slice(cmp, cmp + 2200);
		expect(cmpBlock).toMatch(/whitespace-pre-wrap break-words/);
		const origPane = cmpBlock.indexOf('narrative-compare-original-pane');
		const prevPane = cmpBlock.indexOf('narrative-compare-preview-pane');
		expect(origPane).toBeGreaterThan(-1);
		expect(prevPane).toBeGreaterThan(-1);
		expect(origPane < prevPane).toBe(true);
		expect(cmpBlock).toMatch(/data-testid="\{testIdPrefix\}-narrative-primary-original-note"/);
		expect(cmpBlock).toMatch(/data-testid="\{testIdPrefix\}-narrative-text"/);
	});

	it('Structure Note panel — tooltips and aria on close, framing, narrative actions, trace, and snapshots', () => {
		const src = readFileSync(panelPath, 'utf8');
		expect(src).toMatch(/title="Close Structure Note panel"/);
		expect(src).toMatch(/aria-label="Close Structure Note panel"/);
		expect(src).toMatch(/title=\{NARRATIVE_PREVIEW_REVIEW_NOTICE_SHORT\}/);
		expect(src).toMatch(/title="Run narrative preview from your note \(does not save\)"/);
		expect(src).toMatch(/title="Insert narrative preview into the note editor; still unsaved until you save"/);
		expect(src).toMatch(/title="Clear preview from this panel; saved snapshots stay under Past snapshots"/);
		expect(src).toMatch(/title="Show matching line in structured breakdown"/);
		expect(src).toMatch(/title="Show matching paragraph in draft"/);
		expect(src).toMatch(/title="Save narrative snapshot to the case \(append-only reference; notebook unchanged\)"/);
		expect(src).toMatch(/title="Download this saved narrative as plain text"/);
	});

	it('RejectedAiNarrativeDebugSection — summary uses REJECTED_AI_DEBUG_SUMMARY as title', () => {
		const rejectedPath = join(dirname(fileURLToPath(import.meta.url)), 'RejectedAiNarrativeDebugSection.svelte');
		const rej = readFileSync(rejectedPath, 'utf8');
		expect(rej).toMatch(/title=\{REJECTED_AI_DEBUG_SUMMARY\}/);
	});
});
