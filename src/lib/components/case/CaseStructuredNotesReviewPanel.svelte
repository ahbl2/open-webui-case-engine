<!--
  P34-18 / P34-19 — Review + accept / edit / reject (P34-19).
  P34-26 — Operational draft workflow: rendered draft primary; structure secondary.
  P34-29 — Accept / Edit load the draft into the parent editor only; Save note persists.
  P35-01 — Optional read-only narrative preview (not saved; requires saved note id).
  P35-02 — Preview framing, trace, warnings, in-session accept/reject/clear (local only; no persistence).
  P35-03 — Trace section readability, order cues, long-text expand (local UI only; no persistence).
  P35-04 — Explicit save of derived narrative snapshot (append-only API; structured notes unchanged).
  P35-05 — Read-only list/detail of saved derived narratives (separate from live preview).
  P35-06 — Structured vs narrative read-only comparison (live preview + saved record).
  P35-08 — Read-time narrative integrity signals (informational; non-blocking).
  P35-07 — Export saved derived narrative as plain text (not live preview).
  P37 — Option B transient narrative + admin recovery; P37 follow-up — primary compare layout, advanced collapsed.
-->
<script lang="ts">
	import { dev } from '$app/environment';
	import type { StructuredNotesExtractionPreviewData } from '$lib/types/structuredNotes/extractionPreview';
	import {
		downloadNarrativeRecordExport,
		getNarrativeRecordDetail,
		getNarrativeRecordsList,
		postNarrativePreview,
		postNarrativeRecord,
		postNarrativeRecordRestore,
		postNarrativeRecordSoftDelete,
		type NarrativeExportEligibilityDto,
		type NarrativeRecordDetailDto,
		type NarrativeRecordListItemDto,
		type NarrativeRecordSaveBody
	} from '$lib/apis/caseEngine';
	import RejectedAiNarrativeDebugSection from './RejectedAiNarrativeDebugSection.svelte';
	import {
		ADVANCED_REVIEW_DIFF_SUMMARY,
		ADVANCED_REVIEW_SAVE_DERIVED_SUMMARY,
		ADVANCED_REVIEW_TRACE_SUMMARY,
		SAVED_DERIVED_WORKBENCH_SUMMARY,
		NOTES_REVIEW_CLEANED_LABEL,
		NOTES_REVIEW_ORIGINAL_LABEL,
		AUDIT_GENERATION_DETAILS_HELPER,
		AUDIT_GENERATION_DETAILS_REJECTED_AI_INLINE_HINT,
		AUDIT_GENERATION_DETAILS_SUMMARY,
		NARRATIVE_REJECTED_AI_DEBUG_TOPLEVEL_HINT,
		AUDIT_STATEMENT_BREAKDOWN_LABEL,
		AUDIT_STRUCTURED_RENDER_LABEL,
		NARRATIVE_ACCEPT_NARRATIVE_BUTTON_LABEL,
		NARRATIVE_ADMIN_RECOVER_HEADING,
		NARRATIVE_ADMIN_RECOVER_HELPER,
		NARRATIVE_ADMIN_RECOVER_INPUT_PLACEHOLDER,
		NARRATIVE_ADMIN_RECOVER_LOAD_LABEL,
		NARRATIVE_GENERATE_PRIMARY_LABEL,
		NARRATIVE_GENERATING_PRIMARY_LABEL,
		NARRATIVE_PREVIEW_FRAMING_HELPER,
		NARRATIVE_PREVIEW_FRAMING_LABEL,
		NARRATIVE_PREVIEW_FULL_NOTICE_SUMMARY,
		NARRATIVE_PREVIEW_IN_SESSION_ACCEPT_HINT,
		NARRATIVE_PREVIEW_IN_SESSION_REJECT_HINT,
		NARRATIVE_PREVIEW_REVIEW_NOTICE_BODY,
		NARRATIVE_PREVIEW_REVIEW_NOTICE_SHORT,
		NARRATIVE_PREVIEW_REVIEW_NOTICE_TITLE,
		NARRATIVE_PREVIEW_TRACE_HELPER,
		NARRATIVE_PREVIEW_TRACE_EMPTY,
		NARRATIVE_REJECT_NARRATIVE_BUTTON_LABEL,
		NARRATIVE_PRIMARY_HEADER_HELPER,
		NARRATIVE_PREVIEW_DECISION_CUE,
		NARRATIVE_PRIMARY_LOADING_LABEL,
		NARRATIVE_PREVIEW_WARNINGS_AUDIT_SUMMARY,
		NARRATIVE_PREVIEW_WARNINGS_LEGACY_SUMMARY,
		NARRATIVE_PREVIEW_AI_FAILURE_UX_BANNER,
		NARRATIVE_PREVIEW_AI_GUARD_REJECTION_UX_BANNER,
		isNarrativePreviewAiFailureNoOutputDebug,
		isNarrativePreviewAiGuardRejectionDebug,
		NARRATIVE_REGENERATE_PRIMARY_LABEL,
		NARRATIVE_RESTORE_CONFIRM_MESSAGE,
		NARRATIVE_RESTORE_LABEL,
		NARRATIVE_SAVED_DELETE_CONFIRM_MESSAGE,
		NARRATIVE_SAVED_DELETE_LABEL,
		NARRATIVE_SAVED_LIST_ACTIVE_HEADING,
		NARRATIVE_SAVED_LIST_DELETED_HEADING,
		NARRATIVE_SAVE_DERIVED_BUTTON_LABEL,
		NARRATIVE_SAVE_DERIVED_HELPER,
		NARRATIVE_SAVE_SUCCESS_MESSAGE,
		NARRATIVE_HIDE_DELETED_LABEL,
	NARRATIVE_SHOW_DELETED_LABEL,
		NARRATIVE_SOFT_DELETED_BANNER,
		NARRATIVE_TRACE_SOURCE_LABEL,
		NARRATIVE_TRACE_SHOW_LESS,
		NARRATIVE_TRACE_SHOW_MORE,
		TRACE_SOURCE_LONG_THRESHOLD_CHARS,
		WORKFLOW_NARRATIVE_SECTION_TITLE,
		WORKFLOW_REVIEW_STRUCTURED_SUBHEAD,
		WORKFLOW_STRUCTURED_SECTION_HELPER,
		WORKFLOW_STRUCTURED_SECTION_TITLE,
		isLongTraceSourceText,
		traceRowKey,
		applySuccessfulNarrativePayload,
		emptyNarrativePreviewLocalBundle,
		markNarrativePreviewLocalAccept,
		markNarrativePreviewLocalReject,
		SAVED_DERIVED_NARRATIVE_LABEL,
		SAVED_DERIVED_SOT_HELPER,
		STRUCTURED_VS_NARRATIVE_DIFF_HEADING,
		STRUCTURED_VS_NARRATIVE_DIFF_HELPER,
		COMPARE_SIDE_STRUCTURED_LABEL,
		COMPARE_SIDE_NARRATIVE_LABEL,
		NARRATIVE_INTEGRITY_SECTION_HEADING,
		NARRATIVE_INTEGRITY_HELPER,
		NARRATIVE_INTEGRITY_STATUS_SUPPORTED,
		NARRATIVE_INTEGRITY_STATUS_DEGRADED,
		NARRATIVE_INTEGRITY_STATUS_UNSUPPORTED,
		NARRATIVE_SAVED_DERIVED_EXPORT_LABEL,
		NARRATIVE_SAVED_DERIVED_EXPORT_HELPER,
		type NarrativePreviewTraceRow,
		type NarrativeIntegrityResult,
		type NarrativePreviewRejectedAiDebug
	} from '$lib/caseNotes/narrativePreviewReviewUi';
	import { renderNotesCleanText } from '$lib/caseNotes/structuredNotesCleanText';

	export let originalNoteText: string;
	export let loading: boolean;
	export let errorMessage: string;
	export let data: StructuredNotesExtractionPreviewData | null;
	export let testIdPrefix: string;
	/** Clears preview state in parent (coexistence / reset). */
	export let onClosePanel: (() => void) | undefined = undefined;
	/** True when render is usable (not blocked) and there is draft text to load into the editor (Accept or Edit). */
	export let canCommitDraft = false;
	/** P34-19: user chose Edit Draft — Save uses structured save-edited endpoint. */
	export let editedCommitPending = false;
	export let actionBusy = false;
	export let onAcceptDraft: (() => void) | undefined = undefined;
	export let onEditDraft: (() => void) | undefined = undefined;
	export let onRejectPreview: (() => void) | undefined = undefined;
	/** P34-20 — statement ↔ render block click (no ids/content in callback). */
	export let onTraceabilityInteraction:
		| ((detail: { kind: 'statement_row' | 'render_block' }) => void)
		| undefined = undefined;
	/** P35-01 — Saved notebook note id required for server-side narrative preview; omit when only drafting a new note. */
	export let caseId = '';
	export let notebookNoteId: number | null = null;
	export let caseEngineToken = '';
	/** P37 Option B — narrative-primary workflow on Notes (transient preview + collapsed structured). */
	export let narrativePrimaryWorkflow = false;
	/** P37 — unsaved note body snapshot for `transientSourceText` narrative preview (Case Engine body field name). */
	export let transientNarrativeSourceText: string | null = null;
	/** P37 — incremented after structured extraction so the panel regenerates narrative preview. */
	export let narrativePipelineNonce = 0;
	export let onNarrativeAcceptToEditor: ((text: string) => void) | undefined = undefined;
	export let onNarrativeRejectWorkflow: (() => void) | undefined = undefined;
	/** P37-01/02 — ADMIN recovery + deleted list visibility. */
	export let narrativeRestoreAdminEnabled = false;
	/** P37 — parent Notes pane: narrative preview became primary full-pane surface (callback; not Svelte events). */
	export let onNarrativePreviewFullPane: ((detail: { active: boolean }) => void) | null = null;
	/** P37 — panel is the sole flex child of the notes workspace: flush margins, fill height, own scroll. */
	export let fillNotesWorkspace = false;

	/**
	 * P37 — Must match the current `narrativePipelineNonce` on mount so remounts (e.g. full-pane ↔ scroll
	 * layout when preview visibility toggles) do not re-run `$: narrativePipelineNonce > …` and immediately
	 * repopulate a cleared preview.
	 */
	let lastNarrativePipelineNonceHandled = narrativePipelineNonce;
	let traceStatementId = '';
	let traceBlockId = '';

	let narrativePreviewLoading = false;
	let narrativePreviewError = '';
	let narrativePreviewText = '';
	let narrativePreviewVisible = false;
	let narrativePreviewTrace: NarrativePreviewTraceRow[] = [];
	let narrativePreviewWarnings: string[] = [];
	let narrativeLocalReviewStatus: 'none' | 'accepted' | 'rejected' = 'none';
	/** P35-03 — per-row expanded source text (local; no network). */
	let narrativeTraceSourceExpandedKeys: Record<string, boolean> = {};
	/** P35-04 — Scope of last successful preview (replay for explicit save; no auto-save). */
	let lastNarrativePreviewScope: { structuredNoteIds: number[]; structuredStatementIds?: string[] } | null =
		null;
	let narrativeSaveBusy = false;
	let narrativeSaveError = '';
	let narrativeSaveFeedback = '';
	let savedListLoadedKey = '';
	let savedRecords: NarrativeRecordListItemDto[] = [];
	let savedListLoading = false;
	let savedListError = '';
	let selectedSavedRecordId: number | null = null;
	let savedDetail: NarrativeRecordDetailDto | null = null;
	let savedDetailLoading = false;
	let savedDetailError = '';
	let narrativePreviewIntegrity: NarrativeIntegrityResult | null = null;
	/** P37 — Server debug when AI narrative was rejected for deterministic fallback (never persisted). */
	let narrativePreviewRejectedAiDebug: NarrativePreviewRejectedAiDebug | null = null;
	let savedRecordIntegrity: NarrativeIntegrityResult | null = null;
	let savedExportBusy = false;
	let savedExportError = '';
	let savedExportEligibility: NarrativeExportEligibilityDto | null = null;
	let savedRecordSoftDeleted = false;
	let savedRecordsActive: NarrativeRecordListItemDto[] = [];
	let savedRecordsDeleted: NarrativeRecordListItemDto[] = [];
	let showDeletedNarrativesInList = false;
	let adminRecoverRecordIdInput = '';
	let adminRecoverBusy = false;
	let adminRecoverError = '';
	let narrativeDeleteBusy = false;
	let narrativeRestoreBusy = false;

	$: savedRecords = savedRecordsActive;

	async function refreshSavedNarrativeList(): Promise<void> {
		if (!caseId || !caseEngineToken) return;
		savedListLoading = true;
		savedListError = '';
		const includeDeletedList =
			(dev || narrativeRestoreAdminEnabled) && showDeletedNarrativesInList;
		const r = await getNarrativeRecordsList(
			caseId,
			caseEngineToken,
			includeDeletedList ? { includeDeleted: true } : undefined
		);
		savedListLoading = false;
		if (!r.success) {
			savedListError = r.errorMessage;
			savedRecordsActive = [];
			savedRecordsDeleted = [];
			return;
		}
		if (includeDeletedList) {
			savedRecordsActive = r.records.filter((rec) => !rec.recordSoftDeleted);
			savedRecordsDeleted = r.records.filter((rec) => rec.recordSoftDeleted === true);
		} else {
			savedRecordsActive = r.records.filter((rec) => !rec.recordSoftDeleted);
			savedRecordsDeleted = [];
		}
	}

	async function onSelectSavedRecord(
		recordId: number,
		opts?: { recordSoftDeleted?: boolean }
	): Promise<void> {
		if (!caseId || !caseEngineToken) return;
		selectedSavedRecordId = recordId;
		savedDetailLoading = true;
		savedDetailError = '';
		savedDetail = null;
		savedRecordIntegrity = null;
		savedExportError = '';
		savedExportEligibility = null;
		savedRecordSoftDeleted = false;
		const includeDeleted = opts?.recordSoftDeleted === true;
		const r = await getNarrativeRecordDetail(caseId, recordId, caseEngineToken, {
			includeDeleted
		});
		savedDetailLoading = false;
		if (!r.success) {
			savedDetailError = r.errorMessage;
			return;
		}
		savedDetail = r.record;
		savedRecordIntegrity = r.integrity ?? null;
		savedExportEligibility = r.exportEligibility ?? null;
		savedRecordSoftDeleted = r.recordSoftDeleted === true;
	}

	function toggleShowDeletedSavedNarratives(): void {
		showDeletedNarrativesInList = !showDeletedNarrativesInList;
		void refreshSavedNarrativeList();
	}

	async function handleDeleteSavedNarrative(): Promise<void> {
		if (!caseId || !caseEngineToken || selectedSavedRecordId == null || !savedDetail) return;
		if (!window.confirm(NARRATIVE_SAVED_DELETE_CONFIRM_MESSAGE)) return;
		narrativeDeleteBusy = true;
		const r = await postNarrativeRecordSoftDelete(caseId, selectedSavedRecordId, caseEngineToken);
		narrativeDeleteBusy = false;
		if (!r.success) {
			savedExportError = r.errorMessage;
			return;
		}
		selectedSavedRecordId = null;
		savedDetail = null;
		savedRecordIntegrity = null;
		savedExportEligibility = null;
		savedRecordSoftDeleted = false;
		void refreshSavedNarrativeList();
	}

	async function handleRestoreSavedNarrative(): Promise<void> {
		if (!caseId || !caseEngineToken || selectedSavedRecordId == null) return;
		if (!window.confirm(NARRATIVE_RESTORE_CONFIRM_MESSAGE)) return;
		narrativeRestoreBusy = true;
		const r = await postNarrativeRecordRestore(caseId, selectedSavedRecordId, caseEngineToken);
		narrativeRestoreBusy = false;
		if (!r.success) {
			savedExportError = r.errorMessage;
			return;
		}
		void refreshSavedNarrativeList();
		await onSelectSavedRecord(selectedSavedRecordId, { recordSoftDeleted: false });
	}

	async function handleAdminRecoverLoadDeleted(): Promise<void> {
		const raw = adminRecoverRecordIdInput.trim();
		const id = parseInt(raw, 10);
		if (!caseId || !caseEngineToken || !Number.isFinite(id) || id < 1) {
			adminRecoverError = 'Enter a valid narrative record ID.';
			return;
		}
		adminRecoverBusy = true;
		adminRecoverError = '';
		const r = await getNarrativeRecordDetail(caseId, id, caseEngineToken, { includeDeleted: true });
		adminRecoverBusy = false;
		if (!r.success) {
			adminRecoverError = r.errorMessage;
			return;
		}
		await onSelectSavedRecord(id, { recordSoftDeleted: true });
	}

	$: if (caseId && caseEngineToken) {
		const key = `${caseId}|${caseEngineToken}`;
		if (savedListLoadedKey !== key) {
			savedListLoadedKey = key;
			selectedSavedRecordId = null;
			savedDetail = null;
			void refreshSavedNarrativeList();
		}
	}

	function resetNarrativeTraceExpandState(): void {
		narrativeTraceSourceExpandedKeys = {};
	}

	function toggleNarrativeTraceSourceExpanded(key: string): void {
		narrativeTraceSourceExpandedKeys = {
			...narrativeTraceSourceExpandedKeys,
			[key]: !narrativeTraceSourceExpandedKeys[key]
		};
	}

	$: if (!data) {
		traceStatementId = '';
		traceBlockId = '';
		const cleared = emptyNarrativePreviewLocalBundle();
		narrativePreviewText = cleared.narrative;
		narrativePreviewTrace = cleared.trace;
		narrativePreviewWarnings = cleared.warnings;
		narrativeLocalReviewStatus = cleared.reviewStatus;
		narrativePreviewVisible = cleared.visible;
		narrativePreviewError = cleared.error;
		resetNarrativeTraceExpandState();
		lastNarrativePreviewScope = null;
		narrativeSaveError = '';
		narrativeSaveFeedback = '';
		narrativePreviewIntegrity = null;
		narrativePreviewRejectedAiDebug = null;
	}

	function handleNarrativeLocalClear(): void {
		const cleared = emptyNarrativePreviewLocalBundle();
		narrativePreviewText = cleared.narrative;
		narrativePreviewTrace = cleared.trace;
		narrativePreviewWarnings = cleared.warnings;
		narrativeLocalReviewStatus = cleared.reviewStatus;
		narrativePreviewVisible = cleared.visible;
		narrativePreviewError = cleared.error;
		resetNarrativeTraceExpandState();
		lastNarrativePreviewScope = null;
		narrativeSaveError = '';
		narrativeSaveFeedback = '';
		narrativePreviewIntegrity = null;
		narrativePreviewRejectedAiDebug = null;
	}

	function handleNarrativeLocalAccept(): void {
		narrativeLocalReviewStatus = markNarrativePreviewLocalAccept();
		if (narrativePrimaryWorkflow && onNarrativeAcceptToEditor) {
			onNarrativeAcceptToEditor(narrativePreviewText);
		}
	}

	function handleNarrativeLocalReject(): void {
		narrativeLocalReviewStatus = markNarrativePreviewLocalReject();
		if (narrativePrimaryWorkflow && onNarrativeRejectWorkflow) {
			onNarrativeRejectWorkflow();
		}
	}

	$: if (narrativePrimaryWorkflow && narrativePipelineNonce > lastNarrativePipelineNonceHandled) {
		lastNarrativePipelineNonceHandled = narrativePipelineNonce;
		void handleGenerateNarrativePreview();
	}

	async function handleGenerateNarrativePreview(): Promise<void> {
		if (!caseId || !caseEngineToken || !data) return;
		const transient =
			narrativePrimaryWorkflow &&
			transientNarrativeSourceText != null &&
			transientNarrativeSourceText.trim() !== '';
		if (!transient && notebookNoteId == null) return;
		narrativePreviewLoading = true;
		narrativePreviewError = '';
		const stmtIds = data.proposal.statements.map((s) => s.statementId);
		const mode = 'deterministic' as const;
		const body = transient
			? stmtIds.length > 0
				? {
						transientSourceText: transientNarrativeSourceText!.trim(),
						structuredStatementIds: stmtIds,
						compositionMode: mode
					}
				: { transientSourceText: transientNarrativeSourceText!.trim(), compositionMode: mode }
			: stmtIds.length > 0
				? {
						structuredNoteIds: [notebookNoteId!],
						structuredStatementIds: stmtIds,
						compositionMode: mode
					}
				: { structuredNoteIds: [notebookNoteId!], compositionMode: mode };
		const r = await postNarrativePreview(caseId, caseEngineToken, body);
		narrativePreviewLoading = false;
		if (!r.success) {
			narrativePreviewError = r.errorMessage;
			narrativePreviewText = '';
			narrativePreviewTrace = [];
			narrativePreviewWarnings = [];
			narrativePreviewVisible = false;
			narrativeLocalReviewStatus = 'none';
			resetNarrativeTraceExpandState();
			lastNarrativePreviewScope = null;
			narrativeSaveError = '';
			narrativeSaveFeedback = '';
			narrativePreviewIntegrity = null;
			narrativePreviewRejectedAiDebug = null;
			return;
		}
		resetNarrativeTraceExpandState();
		const noteIds =
			notebookNoteId != null ? [notebookNoteId] : ([] as number[]);
		lastNarrativePreviewScope =
			stmtIds.length > 0
				? { structuredNoteIds: [...noteIds], structuredStatementIds: [...stmtIds] }
				: { structuredNoteIds: [...noteIds] };
		narrativeSaveError = '';
		narrativeSaveFeedback = '';
		const applied = applySuccessfulNarrativePayload(r.data);
		narrativePreviewText = applied.narrative;
		narrativePreviewTrace = applied.trace;
		narrativePreviewWarnings = applied.warnings;
		narrativeLocalReviewStatus = applied.reviewStatus;
		narrativePreviewVisible = applied.visible;
		narrativePreviewIntegrity = r.data.integrity ?? null;
		narrativePreviewRejectedAiDebug = r.data.debug ?? null;
	}

	async function handleSaveAcceptedNarrative(): Promise<void> {
		if (!caseId || !caseEngineToken || !lastNarrativePreviewScope) return;
		if (lastNarrativePreviewScope.structuredNoteIds.length === 0) return;
		if (!narrativePreviewText.trim() || narrativePreviewTrace.length === 0) return;
		narrativeSaveBusy = true;
		narrativeSaveError = '';
		narrativeSaveFeedback = '';
		const body: NarrativeRecordSaveBody = {
			narrative: narrativePreviewText,
			trace: narrativePreviewTrace.map((t) => ({
				statementId: t.statementId,
				sourceText: t.sourceText
			})),
			structuredNoteIds: [...lastNarrativePreviewScope.structuredNoteIds]
		};
		if (
			lastNarrativePreviewScope.structuredStatementIds &&
			lastNarrativePreviewScope.structuredStatementIds.length > 0
		) {
			body.structuredStatementIds = [...lastNarrativePreviewScope.structuredStatementIds];
		}
		const r = await postNarrativeRecord(caseId, caseEngineToken, body);
		narrativeSaveBusy = false;
		if (!r.success) {
			narrativeSaveError = r.errorMessage;
			return;
		}
		narrativeSaveFeedback = NARRATIVE_SAVE_SUCCESS_MESSAGE;
		void refreshSavedNarrativeList();
	}

	function blockIdForStatement(statementId: string): string {
		return `stmt-${statementId}`;
	}

	function onStatementClick(statementId: string): void {
		traceStatementId = statementId;
		traceBlockId = blockIdForStatement(statementId);
		onTraceabilityInteraction?.({ kind: 'statement_row' });
	}

	function narrativeIntegrityBadgeClass(status: NarrativeIntegrityResult['status']): string {
		if (status === 'supported') {
			return 'border-emerald-400/90 bg-emerald-50/95 dark:border-emerald-800 dark:bg-emerald-950/40 text-emerald-950 dark:text-emerald-100';
		}
		if (status === 'degraded') {
			return 'border-amber-400/90 bg-amber-50/95 dark:border-amber-800 dark:bg-amber-950/40 text-amber-950 dark:text-amber-100';
		}
		return 'border-rose-400/90 bg-rose-50/95 dark:border-rose-900/55 dark:bg-rose-950/40 text-rose-950 dark:text-rose-100';
	}

	function narrativeIntegrityStatusLabel(status: NarrativeIntegrityResult['status']): string {
		if (status === 'supported') return NARRATIVE_INTEGRITY_STATUS_SUPPORTED;
		if (status === 'degraded') return NARRATIVE_INTEGRITY_STATUS_DEGRADED;
		return NARRATIVE_INTEGRITY_STATUS_UNSUPPORTED;
	}

	async function handleExportSavedNarrative(): Promise<void> {
		if (!caseId || !caseEngineToken || selectedSavedRecordId == null) return;
		if (savedRecordSoftDeleted) return;
		if (savedExportEligibility?.decision === 'not_eligible') {
			savedExportError = savedExportEligibility.message;
			return;
		}
		let acknowledgeExportWarning = false;
		if (savedExportEligibility?.decision === 'eligible_with_warning') {
			if (!window.confirm(savedExportEligibility.message)) return;
			acknowledgeExportWarning = true;
		}
		savedExportBusy = true;
		savedExportError = '';
		const r = await downloadNarrativeRecordExport(caseId, selectedSavedRecordId, caseEngineToken, {
			acknowledgeExportWarning
		});
		savedExportBusy = false;
		if (!r.success) {
			savedExportError = r.errorMessage;
			return;
		}
		const url = URL.createObjectURL(r.blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = r.filename;
		document.body.appendChild(a);
		a.click();
		a.remove();
		URL.revokeObjectURL(url);
	}

	function onRenderedBlockClick(block: { blockId: string; kind: string; text: string }): void {
		traceBlockId = block.blockId;
		if (block.kind === 'statement' && block.blockId.startsWith('stmt-')) {
			traceStatementId = block.blockId.slice(5);
		} else {
			traceStatementId = '';
		}
		onTraceabilityInteraction?.({ kind: 'render_block' });
	}

	function validationHeadline(status: string): string {
		if (status === 'pass') return 'Draft ready';
		if (status === 'pass_with_warnings') return 'Review recommended';
		if (status === 'fail') return 'Draft could not be generated';
		return 'Draft status';
	}

	$: statementRenderBlocks =
		data?.render?.blocks?.filter((b) => b.kind === 'statement' && !b.blockId.endsWith('~h')) ?? [];

	$: cleanRenderedText = renderNotesCleanText(data?.render?.blocks ?? []);

	$: showAcceptEdit =
		canCommitDraft && !editedCommitPending && !actionBusy && !loading && data != null;

	$: hasValidationDetails =
		data != null &&
		(data.validation.errors.length > 0 ||
			data.validation.warnings.length > 0 ||
			data.validation.blockedRender);

	$: narrativePreviewSectionAllowed =
		!!data &&
		!!caseId &&
		!!caseEngineToken &&
		(notebookNoteId != null ||
			(narrativePrimaryWorkflow &&
				transientNarrativeSourceText != null &&
				transientNarrativeSourceText.trim() !== ''));

	/** P37 — parent Notes pane hides duplicate editor when narrative preview is the primary surface. */
	let prevNarrativeFullPane = false;
	$: {
		const active = !!(narrativePrimaryWorkflow && narrativePreviewVisible);
		if (active !== prevNarrativeFullPane) {
			prevNarrativeFullPane = active;
			if (onNarrativePreviewFullPane) {
				onNarrativePreviewFullPane({ active });
			}
		}
	}

	/** Dev or admin — optional technical narrative / rejected-model detail surfaces. */
	$: narrativePreviewTechnicalDetailVisible = dev || narrativeRestoreAdminEnabled;
</script>

<div
	class="flex flex-col flex-1 min-h-0 min-w-0 rounded border border-teal-200/70 dark:border-teal-800/60 bg-teal-50/75 dark:bg-teal-950/25 text-xs gap-3 {fillNotesWorkspace
		? 'mx-0 mt-0 mb-0 min-h-0 overflow-y-auto px-5 py-3'
		: 'mx-5 mt-2 mb-1 px-3 py-3'}"
	data-testid="{testIdPrefix}-panel"
>
	<div class="flex flex-wrap items-start justify-between gap-2">
		<div>
			{#if narrativePrimaryWorkflow}
				<p class="text-sm font-semibold text-teal-950 dark:text-teal-100">{WORKFLOW_NARRATIVE_SECTION_TITLE}</p>
			{:else}
				<p class="text-sm font-semibold text-teal-950 dark:text-teal-100">
					Structured Draft (from your note)
				</p>
				<p class="text-[11px] text-teal-800/95 dark:text-teal-300/90 mt-1 leading-snug max-w-prose">
					This draft is generated from your original note. Review before saving.
				</p>
			{/if}
		</div>
		{#if onClosePanel}
			<button
				type="button"
				class="shrink-0 text-xs px-2.5 py-1 rounded border border-teal-400/70 text-teal-900 dark:text-teal-100 dark:border-teal-600 hover:bg-teal-100/80 dark:hover:bg-teal-900/40"
				data-testid="{testIdPrefix}-close"
				title="Close Structure Note panel"
				aria-label="Close Structure Note panel"
				on:click={onClosePanel}
			>
				Close
			</button>
		{/if}
	</div>

	{#if editedCommitPending && data && !narrativePrimaryWorkflow}
		<div
			class="rounded border border-amber-300/80 bg-amber-50/90 dark:border-amber-700 dark:bg-amber-950/30 px-2 py-1.5 text-[11px] text-amber-950 dark:text-amber-100"
			data-testid="{testIdPrefix}-edit-disclaimer"
		>
			You are editing this draft in the note editor. Use <strong>Save</strong> (or <strong>Save note</strong>) to commit; that
			save uses the structured edit path and does not auto-save while you type.
		</div>
	{/if}

	{#if loading}
		<p class="text-xs text-gray-600 dark:text-gray-400" data-testid="{testIdPrefix}-loading">
			{narrativePrimaryWorkflow ? NARRATIVE_PRIMARY_LOADING_LABEL : 'Generating structured draft…'}
		</p>
	{:else if errorMessage}
		<p class="text-xs text-red-700 dark:text-red-300" data-testid="{testIdPrefix}-error">{errorMessage}</p>
	{:else if data}
		<div class="flex flex-col flex-1 min-h-0 min-w-0 gap-3">
		{#if !narrativePrimaryWorkflow}
		<div
			class="shrink-0 space-y-3"
			class:notes-workflow-shimmer={loading}
			data-testid={`${testIdPrefix}-workflow-structured-section`}
		>
			<div class="space-y-1">
				<p class="text-sm font-semibold text-teal-950 dark:text-teal-100">{WORKFLOW_STRUCTURED_SECTION_TITLE}</p>
				<p class="text-[11px] text-teal-800/95 dark:text-teal-300/90 leading-snug max-w-prose">
					{WORKFLOW_STRUCTURED_SECTION_HELPER}
				</p>
				<p
					class="text-[11px] font-semibold text-gray-800 dark:text-gray-200"
					data-testid="{testIdPrefix}-workflow-review-structured-subhead"
				>
					{WORKFLOW_REVIEW_STRUCTURED_SUBHEAD}
				</p>
			</div>
		<div
			class="rounded border px-2.5 py-2 text-xs {data.validation.status === 'fail'
				? 'border-red-300 bg-red-50 text-red-900 dark:border-red-700 dark:bg-red-950/30 dark:text-red-200'
				: data.validation.status === 'pass_with_warnings'
					? 'border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-700 dark:bg-amber-950/25 dark:text-amber-100'
					: 'border-emerald-300 bg-emerald-50 text-emerald-950 dark:border-emerald-800 dark:bg-emerald-950/25 dark:text-emerald-100'}"
			data-testid="{testIdPrefix}-validation"
		>
			<p class="font-semibold text-sm">{validationHeadline(data.validation.status)}</p>
			{#if data.validation.blockedRender}
				<p class="mt-1 text-[11px] opacity-95">The draft text could not be built for this note. You can close or reject below.</p>
			{/if}
			{#if hasValidationDetails}
				<details class="mt-2 text-[11px]">
					<summary
						class="cursor-pointer select-none text-gray-600 dark:text-gray-400 hover:underline font-medium"
					>
						Technical details
					</summary>
					<div class="mt-2 pl-1 border-l-2 border-gray-200 dark:border-gray-600 space-y-2">
						{#if data.validation.errors.length > 0}
							<ul class="list-disc pl-4 space-y-0.5">
								{#each data.validation.errors as err}
									<li>{err.message}</li>
								{/each}
							</ul>
						{/if}
						{#if data.validation.warnings.length > 0}
							<ul class="list-disc pl-4 space-y-0.5">
								{#each data.validation.warnings as w}
									<li>{w.message}</li>
								{/each}
							</ul>
						{/if}
					</div>
				</details>
			{/if}
		</div>

		<!-- Primary: rendered draft (legacy structured workflow) -->
			<div>
				<p class="text-xs font-semibold text-gray-800 dark:text-gray-200 mb-1.5">Draft</p>
				{#if data.render.status === 'blocked'}
					<p class="text-xs text-gray-700 dark:text-gray-300">No draft text — generation was blocked.</p>
				{:else if !data.render.renderedText.trim() && data.render.blocks.length === 0}
					<p class="text-xs text-gray-600 dark:text-gray-400 italic">Empty draft output.</p>
				{:else}
					<p class="text-[10px] text-gray-500 dark:text-gray-500 mb-1.5">
						Optional: click a paragraph to highlight the matching line in the breakdown below.
					</p>
					<div class="space-y-1 max-h-56 overflow-y-auto mb-2" data-testid="{testIdPrefix}-blocks">
						{#each statementRenderBlocks as blk}
							<button
								type="button"
								class="w-full text-left rounded border px-2 py-1.5 text-xs whitespace-pre-wrap font-sans {traceBlockId ===
								blk.blockId
									? 'border-teal-500 bg-teal-50/90 dark:border-teal-500 dark:bg-teal-900/35'
									: 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/60'}"
								data-testid="{testIdPrefix}-render-block"
								data-block-id={blk.blockId}
								title="Show matching line in structured breakdown"
								aria-label="Structured trace: highlight matching statement"
								on:click={() => onRenderedBlockClick(blk)}
							>
								{blk.text}
							</button>
						{/each}
					</div>
				<textarea
					readonly
					class="w-full rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-2 py-2 text-xs text-gray-800 dark:text-gray-200 min-h-[6rem] max-h-[16rem] overflow-y-auto resize-y font-sans whitespace-pre-wrap"
					data-testid="{testIdPrefix}-rendered-text"
				>{cleanRenderedText}</textarea>
				{/if}
				{#if data.render.warnings.length > 0}
					<details class="mt-2 text-[10px] text-gray-600 dark:text-gray-400">
						<summary class="cursor-pointer hover:underline">Draft notices</summary>
						<ul class="list-disc pl-4 mt-1 space-y-0.5">
							{#each data.render.warnings as rw}
								<li>{rw.message}</li>
							{/each}
						</ul>
					</details>
				{/if}
			</div>

		<div class="space-y-2" data-testid="{testIdPrefix}-actions">
			<div class="flex flex-wrap gap-2 items-center">
				{#if showAcceptEdit && onAcceptDraft}
					<button
						type="button"
						class="text-xs px-3 py-2 rounded-md border border-teal-600 bg-teal-600 text-white font-medium hover:bg-teal-700 disabled:opacity-50"
						data-testid="{testIdPrefix}-accept"
						title="Load structured draft into the note editor; use Save note to persist"
						disabled={actionBusy}
						on:click={onAcceptDraft}
					>
						Accept Draft
					</button>
				{/if}
				{#if showAcceptEdit && onEditDraft}
					<button
						type="button"
						class="text-xs px-3 py-2 rounded-md border border-teal-500 text-teal-900 dark:text-teal-100 dark:border-teal-500 font-medium hover:bg-teal-100/80 dark:hover:bg-teal-900/40 disabled:opacity-50"
						data-testid="{testIdPrefix}-edit"
						title="Load draft into the editor to edit; use Save note to persist"
						disabled={actionBusy}
						on:click={onEditDraft}
					>
						Edit Draft
					</button>
				{/if}
				{#if onRejectPreview}
					<button
						type="button"
						class="text-xs px-3 py-2 rounded-md border border-gray-400 text-gray-800 dark:text-gray-200 dark:border-gray-600 font-medium hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50"
						data-testid="{testIdPrefix}-reject"
						title="Dismiss preview and keep your original note text"
						disabled={actionBusy}
						on:click={onRejectPreview}
					>
						Reject
					</button>
				{/if}
			</div>
			<div class="grid grid-cols-1 sm:grid-cols-3 gap-x-4 gap-y-1 text-[10px] text-gray-500 dark:text-gray-400 leading-snug">
				{#if showAcceptEdit && onAcceptDraft}
					<p>
						<span class="font-medium text-gray-600 dark:text-gray-300">Accept</span> — Load draft into the editor;
						use <span class="font-medium">Save note</span> to persist
					</p>
				{/if}
				{#if showAcceptEdit && onEditDraft}
					<p>
						<span class="font-medium text-gray-600 dark:text-gray-300">Edit</span> — Same as Accept, then change
						text; <span class="font-medium">Save note</span> to persist
					</p>
				{/if}
				{#if onRejectPreview}
					<p><span class="font-medium text-gray-600 dark:text-gray-300">Reject</span> — Keep your original note</p>
				{/if}
			</div>
			{#if data && (data.validation.blockedRender || data.render.status === 'blocked')}
				<p class="text-[11px] text-gray-600 dark:text-gray-400">
					Accept and Edit are not available. Use Reject or Close; your saved note is unchanged.
				</p>
			{:else if data && !showAcceptEdit && !editedCommitPending && !data.render.renderedText.trim()}
				<p class="text-[11px] text-gray-500 dark:text-gray-400 italic">No draft text was returned for this run.</p>
			{/if}
		</div>
		</div>
		{/if}

		{#if narrativePreviewSectionAllowed || (caseId && caseEngineToken)}
			<!-- P37 follow-up: parent-bounded flex column + single scroll host (no viewport max-height). -->
			<div
				class="mt-2.5 pt-2.5 border-t border-dashed border-teal-200/60 dark:border-teal-800/45 flex flex-col flex-1 min-h-0 gap-2"
				data-testid="{testIdPrefix}-narrative-preview"
			>
				{#if narrativePreviewSectionAllowed}
					<div class="shrink-0 space-y-2">
				{#if !narrativePrimaryWorkflow}
					<p class="text-[11px] font-semibold text-gray-800 dark:text-gray-200">Narrative preview</p>
				{/if}
				{#if !narrativePreviewVisible}
					<button
						type="button"
						class="text-xs px-2.5 py-1.5 rounded border border-violet-400/80 text-violet-900 dark:text-violet-100 dark:border-violet-600 hover:bg-violet-50/90 dark:hover:bg-violet-950/40 disabled:opacity-50"
						data-testid="{testIdPrefix}-narrative-generate"
						title="Run narrative preview from your note (does not save)"
						disabled={narrativePreviewLoading || actionBusy || loading}
						on:click={handleGenerateNarrativePreview}
					>
						{narrativePreviewLoading
							? NARRATIVE_GENERATING_PRIMARY_LABEL
							: NARRATIVE_GENERATE_PRIMARY_LABEL}
					</button>
				{/if}
				{#if narrativePreviewError}
					<p class="text-[11px] text-red-700 dark:text-red-300" data-testid="{testIdPrefix}-narrative-error">
						{narrativePreviewError}
					</p>
				{/if}
					</div>
				{/if}
				<div
					class="flex-1 min-h-0 overflow-y-auto space-y-2.5 pr-0.5"
					data-testid="{testIdPrefix}-narrative-preview-body-scroll"
				>
				{#if narrativePreviewSectionAllowed && narrativePreviewVisible}
					{#if !narrativePrimaryWorkflow}
						<div
							class="rounded border border-amber-300/90 bg-amber-50/95 dark:border-amber-700/80 dark:bg-amber-950/35 px-2.5 py-2 space-y-1.5"
							data-testid="{testIdPrefix}-narrative-framing"
							aria-label={NARRATIVE_PREVIEW_REVIEW_NOTICE_TITLE}
							title={NARRATIVE_PREVIEW_REVIEW_NOTICE_SHORT}
						>
							<p
								class="text-[11px] font-bold uppercase tracking-wide text-amber-900 dark:text-amber-100"
								data-testid="{testIdPrefix}-narrative-framing-label"
							>
								{NARRATIVE_PREVIEW_FRAMING_LABEL}
							</p>
							<details class="mt-1 text-[11px]">
								<summary
									class="cursor-pointer select-none text-amber-900/90 dark:text-amber-100/90 hover:underline font-medium"
								>
									{NARRATIVE_PREVIEW_FULL_NOTICE_SUMMARY}
								</summary>
								<div class="mt-1.5 space-y-1.5 text-amber-950/95 dark:text-amber-100/95 leading-snug">
									<p>{NARRATIVE_PREVIEW_REVIEW_NOTICE_BODY}</p>
									<p data-testid="{testIdPrefix}-narrative-framing-helper">{NARRATIVE_PREVIEW_FRAMING_HELPER}</p>
								</div>
							</details>
						</div>
						{#if narrativePreviewRejectedAiDebug && isNarrativePreviewAiFailureNoOutputDebug(narrativePreviewRejectedAiDebug)}
							<div
								class="rounded border border-red-300 bg-red-50 px-2.5 py-2 text-[11px] text-red-800 dark:border-red-700/80 dark:bg-red-950/40 dark:text-red-100"
								data-testid="{testIdPrefix}-narrative-ai-failure-ux-banner"
								role="status"
							>
								{NARRATIVE_PREVIEW_AI_FAILURE_UX_BANNER}
							</div>
						{/if}
						{#if narrativePreviewRejectedAiDebug && isNarrativePreviewAiGuardRejectionDebug(narrativePreviewRejectedAiDebug)}
							<div
								class="rounded border border-amber-300/90 bg-amber-50/95 dark:border-amber-700/80 dark:bg-amber-950/35 px-2.5 py-2 text-[11px] text-amber-950 dark:text-amber-100"
								data-testid="{testIdPrefix}-narrative-ai-guard-rejection-ux-banner"
								role="status"
							>
								{NARRATIVE_PREVIEW_AI_GUARD_REJECTION_UX_BANNER}
							</div>
						{/if}
						{#if narrativePreviewWarnings.length > 0}
							<details
								class="rounded border border-orange-300 dark:border-orange-800 bg-orange-50/90 dark:bg-orange-950/40 overflow-hidden"
								data-testid="{testIdPrefix}-narrative-warnings-legacy-wrap"
							>
								<summary
									class="cursor-pointer select-none px-2.5 py-2 text-[11px] font-semibold text-orange-950 dark:text-orange-100 list-none flex items-center gap-2 [&::-webkit-details-marker]:hidden"
								>
									<span class="text-orange-400">▸</span>
									{NARRATIVE_PREVIEW_WARNINGS_LEGACY_SUMMARY}
								</summary>
								<div
									class="px-2.5 pb-2 border-t border-orange-200/80 dark:border-orange-800/60 space-y-1"
									data-testid="{testIdPrefix}-narrative-warnings"
									role="alert"
								>
									<ul class="list-disc pl-4 space-y-1 text-[11px] text-orange-950 dark:text-orange-100/95">
										{#each narrativePreviewWarnings as w}
											<li data-testid="{testIdPrefix}-narrative-warning-item">{w}</li>
										{/each}
									</ul>
								</div>
							</details>
						{/if}
						{#if narrativePreviewTechnicalDetailVisible && narrativePreviewRejectedAiDebug}
							<RejectedAiNarrativeDebugSection
								{testIdPrefix}
								debug={narrativePreviewRejectedAiDebug}
							/>
						{/if}
					{/if}
					<div
						class="grid grid-cols-1 md:grid-cols-2 gap-3 min-h-0 items-start"
						data-testid="{testIdPrefix}-narrative-primary-compare"
					>
						<div class="flex flex-col min-h-0 space-y-1 w-full opacity-[0.92]">
							<p class="shrink-0 text-[11px] font-medium text-gray-600 dark:text-gray-400">{NOTES_REVIEW_ORIGINAL_LABEL}</p>
							<!-- Compare panes: content-sized; no inner scroll — outer narrative-preview-body-scroll only. -->
							<div
								class="rounded border border-gray-200/90 dark:border-gray-700/90 bg-white/95 dark:bg-gray-900/95 w-full min-h-0"
								data-testid="{testIdPrefix}-narrative-compare-original-pane"
							>
								<div
									class="min-h-[5.25rem] px-2 py-2 text-xs text-gray-800 dark:text-gray-200 font-sans whitespace-pre-wrap break-words leading-snug"
									data-testid="{testIdPrefix}-narrative-primary-original-note"
									role="document"
									aria-readonly="true"
								>{originalNoteText}</div>
							</div>
						</div>
						<div class="flex flex-col min-h-0 space-y-1 w-full">
							<p class="shrink-0 text-[11px] font-semibold text-violet-950 dark:text-violet-100">{NOTES_REVIEW_CLEANED_LABEL}</p>
							{#if !narrativePrimaryWorkflow}
								<p class="shrink-0 text-[10px] text-amber-900/95 dark:text-amber-100/90 leading-snug">
									{NARRATIVE_PREVIEW_REVIEW_NOTICE_SHORT}
								</p>
							{/if}
							<div
								class="rounded-md border border-violet-300/80 dark:border-violet-600/70 bg-white dark:bg-gray-900 ring-2 ring-violet-400/25 dark:ring-violet-500/20 shadow-sm w-full min-h-0"
								data-testid="{testIdPrefix}-narrative-compare-preview-pane"
							>
								<div
									class="min-h-[5.25rem] px-2.5 py-2.5 {narrativePrimaryWorkflow
										? 'text-sm leading-snug'
										: 'text-xs leading-snug'} text-gray-900 dark:text-gray-100 font-sans whitespace-pre-wrap break-words"
									data-testid="{testIdPrefix}-narrative-text"
									role="document"
									aria-readonly="true"
								>{narrativePreviewText}</div>
							</div>
						</div>
					</div>
					{#if narrativePrimaryWorkflow}
						{#if narrativePreviewTechnicalDetailVisible}
							<p
								class="text-[11px] text-teal-800/90 dark:text-teal-300/85 mt-1 leading-snug max-w-prose"
								data-testid="{testIdPrefix}-narrative-primary-header-helper"
							>
								{NARRATIVE_PRIMARY_HEADER_HELPER}
							</p>
						{:else}
							<p
								class="text-[11px] text-teal-800/80 dark:text-teal-300/80 mt-1 leading-snug max-w-prose"
								data-testid="{testIdPrefix}-narrative-decision-cue"
							>
								{NARRATIVE_PREVIEW_DECISION_CUE}
							</p>
						{/if}
					{/if}
					{#if narrativePreviewTechnicalDetailVisible && narrativePrimaryWorkflow && narrativePreviewRejectedAiDebug}
						<div
							class="text-xs text-amber-600 dark:text-amber-400 font-semibold shrink-0"
							data-testid="{testIdPrefix}-narrative-rejected-ai-debug-toplevel-hint"
							role="status"
						>
							⚠ {NARRATIVE_REJECTED_AI_DEBUG_TOPLEVEL_HINT}
						</div>
					{/if}
					{#if narrativePrimaryWorkflow && narrativePreviewRejectedAiDebug && isNarrativePreviewAiFailureNoOutputDebug(narrativePreviewRejectedAiDebug)}
						<div
							class="rounded border border-red-300 bg-red-50 px-2.5 py-2 text-[11px] text-red-800 dark:border-red-700/80 dark:bg-red-950/40 dark:text-red-100 shrink-0"
							data-testid="{testIdPrefix}-narrative-ai-failure-ux-banner"
							role="status"
						>
							{NARRATIVE_PREVIEW_AI_FAILURE_UX_BANNER}
						</div>
					{/if}
					{#if narrativePrimaryWorkflow && narrativePreviewRejectedAiDebug && isNarrativePreviewAiGuardRejectionDebug(narrativePreviewRejectedAiDebug)}
						<div
							class="rounded border border-amber-300/90 bg-amber-50/95 dark:border-amber-700/80 dark:bg-amber-950/35 px-2.5 py-2 text-[11px] text-amber-950 dark:text-amber-100 shrink-0"
							data-testid="{testIdPrefix}-narrative-ai-guard-rejection-ux-banner"
							role="status"
						>
							{NARRATIVE_PREVIEW_AI_GUARD_REJECTION_UX_BANNER}
						</div>
					{/if}
					<div
						class="flex flex-col gap-1 pt-3 mt-2 border-t border-gray-200/70 dark:border-gray-600/45"
						data-testid="{testIdPrefix}-narrative-review-actions"
					>
						<div class="flex flex-wrap items-stretch sm:items-center gap-2 sm:gap-3">
							<button
								type="button"
								class="text-xs px-4 py-2.5 rounded-md border border-emerald-600/90 bg-emerald-600 text-white font-semibold shadow-sm hover:bg-emerald-700 disabled:opacity-50"
								data-testid="{testIdPrefix}-narrative-accept"
								title="Insert narrative preview into the note editor; still unsaved until you save"
								disabled={narrativePreviewLoading || actionBusy || loading}
								on:click={handleNarrativeLocalAccept}
							>
								{NARRATIVE_ACCEPT_NARRATIVE_BUTTON_LABEL}
							</button>
							<div
								class="flex flex-wrap gap-2 items-center sm:pl-3 sm:ml-0.5 sm:border-l sm:border-gray-200/60 dark:sm:border-gray-600/50"
							>
								<button
									type="button"
									class="text-xs px-2.5 py-2 rounded-md border border-rose-400/70 text-rose-900 dark:text-rose-100 dark:border-rose-600/80 font-medium hover:bg-rose-50/90 dark:hover:bg-rose-950/40 disabled:opacity-50"
									data-testid="{testIdPrefix}-narrative-reject"
									title="Mark preview as not accepted this session (does not change the saved note)"
									disabled={narrativePreviewLoading || actionBusy || loading}
									on:click={handleNarrativeLocalReject}
								>
									{NARRATIVE_REJECT_NARRATIVE_BUTTON_LABEL}
								</button>
								<button
									type="button"
									class="text-xs px-2.5 py-2 rounded-md border border-violet-400/70 text-violet-900 dark:text-violet-100 dark:border-violet-600/80 font-medium hover:bg-violet-50/90 dark:hover:bg-violet-950/40 disabled:opacity-50"
									data-testid="{testIdPrefix}-narrative-regenerate"
									title="Request a fresh narrative preview from the server"
									disabled={narrativePreviewLoading || actionBusy || loading}
									on:click={handleGenerateNarrativePreview}
								>
									{narrativePreviewLoading ? NARRATIVE_GENERATING_PRIMARY_LABEL : NARRATIVE_REGENERATE_PRIMARY_LABEL}
								</button>
								<button
									type="button"
									class="text-xs px-2.5 py-1.5 rounded border border-gray-400/60 text-gray-600 dark:text-gray-400 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800/60 disabled:opacity-50"
									data-testid="{testIdPrefix}-narrative-clear"
									title="Clear preview from this panel; saved snapshots stay under Past snapshots"
									disabled={narrativePreviewLoading || actionBusy || loading}
									on:click={handleNarrativeLocalClear}
								>
									Clear Preview
								</button>
							</div>
						</div>
						<!-- Accept Preview · Reject Preview · Clear Preview — strings retained for source contract tests -->
						{#if narrativeLocalReviewStatus === 'accepted'}
							<p
								class="text-[11px] rounded border border-emerald-200/70 bg-emerald-50/70 dark:border-emerald-800/60 dark:bg-emerald-950/30 px-2 py-1.5 text-emerald-900 dark:text-emerald-100/95"
								data-testid="{testIdPrefix}-narrative-in-session-accepted"
							>
								{NARRATIVE_PREVIEW_IN_SESSION_ACCEPT_HINT}
							</p>
						{:else if narrativeLocalReviewStatus === 'rejected'}
							<p
								class="text-[11px] rounded border border-rose-200/70 bg-rose-50/70 dark:border-rose-900/40 dark:bg-rose-950/30 px-2 py-1.5 text-rose-900 dark:text-rose-100/95"
								data-testid="{testIdPrefix}-narrative-in-session-rejected"
							>
								{NARRATIVE_PREVIEW_IN_SESSION_REJECT_HINT}
							</p>
						{/if}
					{#if narrativePrimaryWorkflow && narrativePreviewWarnings.length > 0}
						<details
							class="rounded border border-orange-200/80 dark:border-orange-900/40 bg-orange-50/35 dark:bg-orange-950/20 text-[11px]"
							data-testid="{testIdPrefix}-narrative-warnings-audit"
						>
							<summary
								class="cursor-pointer select-none px-2.5 py-1.5 font-medium text-orange-900/90 dark:text-orange-200/90 list-none flex items-center gap-2 [&::-webkit-details-marker]:hidden"
							>
								<span class="text-orange-400/80">▸</span>
								{NARRATIVE_PREVIEW_WARNINGS_AUDIT_SUMMARY}
							</summary>
							<div
								class="px-2.5 pb-2 border-t border-orange-200/80 dark:border-orange-800/60 pt-2"
								data-testid="{testIdPrefix}-narrative-warnings"
								role="alert"
							>
								<ul class="list-disc pl-4 space-y-1 text-[11px] text-orange-950 dark:text-orange-100/95">
									{#each narrativePreviewWarnings as w}
										<li data-testid="{testIdPrefix}-narrative-warning-item">{w}</li>
									{/each}
								</ul>
							</div>
						</details>
					{/if}
					{#if narrativePrimaryWorkflow && narrativePreviewTechnicalDetailVisible}
						<div
							class="shrink-0 space-y-3 mt-2"
							class:notes-workflow-shimmer={loading}
							data-testid={`${testIdPrefix}-narrative-primary-surface`}
						>
							<details
								class="rounded border border-gray-300/80 dark:border-gray-600 bg-gray-50/60 dark:bg-gray-900/35"
								data-testid={`${testIdPrefix}-generation-audit-details`}
							>
								<summary
									class="cursor-pointer select-none px-2.5 py-2 text-[11px] font-semibold text-gray-700 dark:text-gray-200 list-none flex flex-wrap items-center gap-x-2 gap-y-0.5 [&::-webkit-details-marker]:hidden"
								>
									<span class="text-gray-400">▸</span>
									<span class="inline-flex flex-wrap items-center gap-x-1.5">
										{AUDIT_GENERATION_DETAILS_SUMMARY}
										{#if narrativePreviewTechnicalDetailVisible && narrativePreviewRejectedAiDebug && narrativePrimaryWorkflow}
											<span
												class="font-normal text-[10px] text-amber-800 dark:text-amber-200"
												data-testid={`${testIdPrefix}-generation-audit-rejected-ai-hint`}
											>
												({AUDIT_GENERATION_DETAILS_REJECTED_AI_INLINE_HINT})
											</span>
										{/if}
									</span>
								</summary>
								<div class="px-2.5 pb-3 space-y-3 border-t border-gray-200 dark:border-gray-700 pt-2">
									<p class="text-[10px] text-gray-500 dark:text-gray-400 leading-snug">{AUDIT_GENERATION_DETAILS_HELPER}</p>
									{#if narrativePreviewTechnicalDetailVisible && narrativePreviewRejectedAiDebug && narrativePrimaryWorkflow}
										<RejectedAiNarrativeDebugSection
											{testIdPrefix}
											debug={narrativePreviewRejectedAiDebug}
										/>
									{/if}
									<p class="text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-500">{WORKFLOW_STRUCTURED_SECTION_TITLE}</p>
									<div
										class="rounded border px-2.5 py-2 text-xs {data.validation.status === 'fail'
											? 'border-red-300 bg-red-50 text-red-900 dark:border-red-700 dark:bg-red-950/30 dark:text-red-200'
											: data.validation.status === 'pass_with_warnings'
												? 'border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-700 dark:bg-amber-950/25 dark:text-amber-100'
												: 'border-emerald-300 bg-emerald-50 text-emerald-950 dark:border-emerald-800 dark:bg-emerald-950/25 dark:text-emerald-100'}"
										data-testid="{testIdPrefix}-validation"
									>
										<p class="font-semibold text-sm">{validationHeadline(data.validation.status)}</p>
										{#if data.validation.blockedRender}
											<p class="mt-1 text-[11px] opacity-95">The draft text could not be built for this note.</p>
										{/if}
										{#if hasValidationDetails}
											<details class="mt-2 text-[11px]">
												<summary
													class="cursor-pointer select-none text-gray-600 dark:text-gray-400 hover:underline font-medium"
												>
													Technical details
												</summary>
												<div class="mt-2 pl-1 border-l-2 border-gray-200 dark:border-gray-600 space-y-2">
													{#if data.validation.errors.length > 0}
														<ul class="list-disc pl-4 space-y-0.5">
															{#each data.validation.errors as err}
																<li>{err.message}</li>
															{/each}
														</ul>
													{/if}
													{#if data.validation.warnings.length > 0}
														<ul class="list-disc pl-4 space-y-0.5">
															{#each data.validation.warnings as w}
																<li>{w.message}</li>
															{/each}
														</ul>
													{/if}
												</div>
											</details>
										{/if}
									</div>
									<div>
										<p class="text-[11px] font-semibold text-gray-700 dark:text-gray-200 mb-1">{AUDIT_STRUCTURED_RENDER_LABEL}</p>
										{#if data.render.status === 'blocked'}
											<p class="text-xs text-gray-700 dark:text-gray-300">No draft text — generation was blocked.</p>
										{:else if !data.render.renderedText.trim() && data.render.blocks.length === 0}
											<p class="text-xs text-gray-600 dark:text-gray-400 italic">Empty draft output.</p>
										{:else}
											{#if narrativePreviewTechnicalDetailVisible}
												<p class="text-[10px] text-gray-500 dark:text-gray-500 mb-1.5">
													Internal only: click a paragraph to highlight a statement row below.
												</p>
											{/if}
											<div class="space-y-1 max-h-56 overflow-y-auto mb-2" data-testid="{testIdPrefix}-blocks">
												{#each statementRenderBlocks as blk}
													<button
														type="button"
														class="w-full text-left rounded border px-2 py-1.5 text-xs whitespace-pre-wrap font-sans {traceBlockId ===
														blk.blockId
															? 'border-teal-500 bg-teal-50/90 dark:border-teal-500 dark:bg-teal-900/35'
															: 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/60'}"
														data-testid="{testIdPrefix}-render-block"
														data-block-id={blk.blockId}
														title="Show matching line in structured breakdown"
														aria-label="Structured trace: highlight matching statement"
														on:click={() => onRenderedBlockClick(blk)}
													>
														{blk.text}
													</button>
												{/each}
											</div>
										<textarea
											readonly
											tabindex="-1"
											class="w-full rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-2 py-2 text-xs text-gray-800 dark:text-gray-200 min-h-[6rem] max-h-[16rem] overflow-y-auto resize-y font-sans whitespace-pre-wrap"
											data-testid="{testIdPrefix}-rendered-text"
										>{cleanRenderedText}</textarea>
										{/if}
										{#if data.render.warnings.length > 0}
											<details class="mt-2 text-[10px] text-gray-600 dark:text-gray-400">
												<summary class="cursor-pointer hover:underline">Draft notices</summary>
												<ul class="list-disc pl-4 mt-1 space-y-0.5">
													{#each data.render.warnings as rw}
														<li>{rw.message}</li>
													{/each}
												</ul>
											</details>
										{/if}
									</div>
									<div>
										<p class="text-[11px] font-semibold text-gray-700 dark:text-gray-200 mb-1">{AUDIT_STATEMENT_BREAKDOWN_LABEL}</p>
										{#if data.proposal.statements.length === 0}
											<p class="text-xs text-gray-600 dark:text-gray-400 italic">No extracted lines in this response.</p>
										{:else}
											<ul class="space-y-1.5 max-h-48 overflow-y-auto" data-testid="{testIdPrefix}-statements">
												{#each data.proposal.statements as st}
													<li>
														<button
															type="button"
															class="w-full text-left rounded border px-2 py-1.5 transition text-xs {traceStatementId === st.statementId
																? 'border-teal-500 bg-teal-50/90 dark:border-teal-500 dark:bg-teal-900/35'
																: 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/60'}"
															data-testid="{testIdPrefix}-stmt-row"
															data-statement-id={st.statementId}
															title="Show matching paragraph in draft"
															aria-label="Structured trace: highlight matching draft paragraph"
															on:click={() => onStatementClick(st.statementId)}
														>
															<span class="block text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{st.verbatimText}</span>
															<span class="block text-[10px] text-gray-500 dark:text-gray-500 mt-0.5"
																>{st.statementId} · {st.statementType} · {st.sourceType} · {st.certainty}</span
															>
														</button>
													</li>
												{/each}
											</ul>
										{/if}
										{#if data.proposal.conflicts.length > 0 || data.proposal.ambiguities.length > 0 || data.proposal.actions.length > 0 || data.proposal.issues.length > 0}
											<details class="mt-2 text-[10px]">
												<summary class="cursor-pointer text-gray-600 dark:text-gray-400 hover:underline">More extraction fields</summary>
												<div class="mt-1.5 space-y-1 text-gray-700 dark:text-gray-300">
													{#if data.proposal.conflicts.length > 0}
														<p class="font-semibold">Conflicts</p>
														<ul class="list-disc pl-4">
															{#each data.proposal.conflicts as c}
																<li>{c.conflictId} ({c.conflictKind}): {c.statementIds.join(', ')}</li>
															{/each}
														</ul>
													{/if}
													{#if data.proposal.ambiguities.length > 0}
														<p class="font-semibold">Ambiguities</p>
														<ul class="list-disc pl-4">
															{#each data.proposal.ambiguities as a}
																<li>({a.ambiguityType}) {a.verbatimText}</li>
															{/each}
														</ul>
													{/if}
													{#if data.proposal.actions.length > 0}
														<p class="font-semibold">Actions</p>
														<ul class="list-disc pl-4">
															{#each data.proposal.actions as ac}
																<li>{ac.verbatimText}</li>
															{/each}
														</ul>
													{/if}
													{#if data.proposal.issues.length > 0}
														<p class="font-semibold">Issues</p>
														<ul class="list-disc pl-4">
															{#each data.proposal.issues as iss}
																<li>({iss.issueType}) {iss.message}</li>
															{/each}
														</ul>
													{/if}
												</div>
											</details>
										{/if}
									</div>
									<details class="mt-2 rounded border border-amber-200/80 dark:border-amber-800/60 bg-amber-50/50 dark:bg-amber-950/25 px-2 py-2 text-[11px]">
										<summary class="cursor-pointer font-semibold text-amber-900 dark:text-amber-100">{NARRATIVE_PREVIEW_FULL_NOTICE_SUMMARY}</summary>
										<div class="mt-2 space-y-1.5 text-amber-950/95 dark:text-amber-100/95 leading-snug">
											<p
												class="font-bold uppercase tracking-wide text-amber-900 dark:text-amber-100"
												data-testid="{testIdPrefix}-narrative-framing-label"
											>
												{NARRATIVE_PREVIEW_FRAMING_LABEL}
											</p>
											<p>{NARRATIVE_PREVIEW_REVIEW_NOTICE_BODY}</p>
											<p data-testid="{testIdPrefix}-narrative-framing-helper">{NARRATIVE_PREVIEW_FRAMING_HELPER}</p>
										</div>
									</details>
								</div>
							</details>
						</div>
					{/if}
					</div>
					<details
						class="rounded border border-gray-200/90 dark:border-gray-700/80 bg-gray-50/50 dark:bg-gray-900/25 overflow-hidden mt-2"
						data-testid="{testIdPrefix}-narrative-trace-details"
					>
						<summary
							class="cursor-pointer select-none px-2.5 py-1.5 text-[11px] font-medium text-gray-600 dark:text-gray-400 list-none flex items-center gap-2 [&::-webkit-details-marker]:hidden"
							data-testid="{testIdPrefix}-narrative-trace-summary"
						>
							<span class="text-gray-400 dark:text-gray-500">▸</span>
							{ADVANCED_REVIEW_TRACE_SUMMARY}
						</summary>
						<div
							class="rounded border-t border-gray-200/80 dark:border-gray-700/60 bg-white/40 dark:bg-gray-950/20 overflow-hidden"
							data-testid="{testIdPrefix}-narrative-trace-section"
						>
							<div class="px-2.5 py-1.5 border-b border-gray-200/70 dark:border-gray-700/50">
								<p class="text-[10px] text-gray-600 dark:text-gray-400 leading-snug" data-testid="{testIdPrefix}-narrative-trace-helper">
									{NARRATIVE_PREVIEW_TRACE_HELPER}
								</p>
							</div>
							<div class="px-2 py-2 space-y-2" data-testid="{testIdPrefix}-narrative-trace">
								{#if narrativePreviewTrace.length === 0}
									<p
										class="text-[11px] text-teal-900/85 dark:text-teal-100/90 leading-snug"
										data-testid="{testIdPrefix}-narrative-trace-empty"
									>
										{NARRATIVE_PREVIEW_TRACE_EMPTY}
									</p>
								{:else}
									<ol class="list-none space-y-2.5 max-h-[min(22rem,70vh)] overflow-y-auto pr-0.5">
										{#each narrativePreviewTrace as row, i (traceRowKey(i, row.statementId))}
											{@const rowKey = traceRowKey(i, row.statementId)}
											{@const expanded = !!narrativeTraceSourceExpandedKeys[rowKey]}
											{@const longSrc = isLongTraceSourceText(row.sourceText, TRACE_SOURCE_LONG_THRESHOLD_CHARS)}
											<li
												class="rounded border border-teal-200/70 dark:border-teal-800/60 bg-white/85 dark:bg-gray-950/50 px-2.5 py-2 space-y-1.5 shadow-sm"
												data-testid="{testIdPrefix}-narrative-trace-row"
												data-trace-order={i + 1}
											>
												<div class="flex items-start gap-2">
													<span
														class="mt-0.5 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded bg-teal-100/95 text-[10px] font-semibold tabular-nums text-teal-900 dark:bg-teal-900/50 dark:text-teal-100"
														aria-hidden="true"
														data-testid="{testIdPrefix}-narrative-trace-order"
														>{i + 1}</span
													>
													<div class="min-w-0 flex-1 space-y-1">
														<p class="text-[10px] font-medium text-gray-600 dark:text-gray-400">{NARRATIVE_TRACE_SOURCE_LABEL}</p>
														<div class="text-[11px] text-gray-900 dark:text-gray-100 whitespace-pre-wrap break-words leading-relaxed">
															{#if longSrc && !expanded}
																<span data-testid="{testIdPrefix}-narrative-trace-source-collapsed"
																	>{row.sourceText.slice(0, TRACE_SOURCE_LONG_THRESHOLD_CHARS).trimEnd()}…</span
																>
															{:else}
																<span data-testid="{testIdPrefix}-narrative-trace-source-full">{row.sourceText}</span>
															{/if}
														</div>
														{#if longSrc}
															<button
																type="button"
																class="text-[10px] font-medium text-teal-800 dark:text-teal-200 underline hover:no-underline"
																data-testid="{testIdPrefix}-narrative-trace-toggle-source"
																aria-expanded={expanded}
																title={expanded ? NARRATIVE_TRACE_SHOW_LESS : NARRATIVE_TRACE_SHOW_MORE}
																on:click={() => toggleNarrativeTraceSourceExpanded(rowKey)}
															>
																{expanded ? NARRATIVE_TRACE_SHOW_LESS : NARRATIVE_TRACE_SHOW_MORE}
															</button>
														{/if}
													</div>
												</div>
											</li>
										{/each}
									</ol>
								{/if}
							</div>
						</div>
					</details>
					{#if narrativePreviewTechnicalDetailVisible || narrativePreviewIntegrity != null}
						<details
							class="rounded border border-gray-200/90 dark:border-gray-700/80 bg-gray-50/40 dark:bg-gray-900/20 mt-2 overflow-hidden"
							data-testid="{testIdPrefix}-narrative-compare-details"
						>
							<summary
								class="cursor-pointer select-none px-2.5 py-1.5 text-[11px] font-medium text-gray-600 dark:text-gray-400 list-none flex items-center gap-2 [&::-webkit-details-marker]:hidden"
							>
								<span class="text-gray-400 dark:text-gray-500">▸</span>
								{ADVANCED_REVIEW_DIFF_SUMMARY}
							</summary>
							<div class="px-2.5 pb-2 space-y-2">
								{#if narrativePreviewIntegrity}
									<div
										class="rounded border border-stone-300/90 dark:border-stone-700 bg-stone-50/90 dark:bg-stone-950/35 px-2.5 py-2 space-y-2"
										data-testid="{testIdPrefix}-preview-integrity"
									>
										<p class="text-[11px] font-semibold text-stone-900 dark:text-stone-100">
											{NARRATIVE_INTEGRITY_SECTION_HEADING}
										</p>
										<p class="text-[10px] text-stone-800/90 dark:text-stone-200/90 leading-snug">
											{NARRATIVE_INTEGRITY_HELPER}
										</p>
										<p
											class="inline-flex rounded border px-2 py-1 text-[11px] font-semibold {narrativeIntegrityBadgeClass(
												narrativePreviewIntegrity.status
											)}"
											data-testid="{testIdPrefix}-preview-integrity-status"
											data-integrity-status={narrativePreviewIntegrity.status}
										>
											{narrativeIntegrityStatusLabel(narrativePreviewIntegrity.status)}
										</p>
										{#if narrativePreviewIntegrity.signals.length > 0}
											<ul class="list-disc pl-4 space-y-1 text-[11px] text-stone-900 dark:text-stone-100">
												{#each narrativePreviewIntegrity.signals as sig}
													<li data-testid="{testIdPrefix}-preview-integrity-signal">{sig.message}</li>
												{/each}
											</ul>
										{/if}
									</div>
								{/if}
								{#if narrativePreviewTrace.length > 0 && narrativePreviewText.trim()}
									<div
										class="rounded border border-sky-300/85 dark:border-sky-800/70 bg-sky-50/80 dark:bg-sky-950/25 px-2.5 py-2 space-y-2"
										data-testid="{testIdPrefix}-preview-diff-review"
									>
										<p class="text-[11px] font-semibold text-sky-950 dark:text-sky-100">
											{STRUCTURED_VS_NARRATIVE_DIFF_HEADING}
										</p>
										<p class="text-[10px] text-sky-900/90 dark:text-sky-200/90 leading-snug">
											{STRUCTURED_VS_NARRATIVE_DIFF_HELPER}
										</p>
										<div class="grid grid-cols-1 md:grid-cols-2 gap-2 min-h-0">
											<div
												class="rounded border border-teal-200/80 dark:border-teal-800/60 bg-white/90 dark:bg-gray-950/40 p-2 flex flex-col min-h-0"
												data-testid="{testIdPrefix}-preview-diff-structured"
											>
												<p class="text-[10px] font-semibold text-teal-900 dark:text-teal-100 mb-1">
													{COMPARE_SIDE_STRUCTURED_LABEL}
												</p>
												<ol class="list-none space-y-2 max-h-48 overflow-y-auto text-[11px]">
													{#each narrativePreviewTrace as row, i (traceRowKey(i, row.statementId))}
														<li
															class="rounded border border-gray-200 dark:border-gray-700 px-2 py-1.5"
															data-testid="{testIdPrefix}-preview-diff-source-row"
															data-diff-order={i + 1}
														>
															<span class="block text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{row.sourceText}</span>
														</li>
													{/each}
												</ol>
											</div>
											<div
												class="rounded border border-violet-200/80 dark:border-violet-800/60 bg-white/90 dark:bg-gray-950/40 p-2 flex flex-col min-h-0"
												data-testid="{testIdPrefix}-preview-diff-narrative"
											>
												<p class="text-[10px] font-semibold text-violet-900 dark:text-violet-100 mb-1">
													{COMPARE_SIDE_NARRATIVE_LABEL}
												</p>
												<textarea
													readonly
													tabindex="-1"
													class="w-full flex-1 min-h-[8rem] rounded border border-violet-200 dark:border-violet-800 bg-white dark:bg-gray-900 px-2 py-1.5 text-xs text-gray-800 dark:text-gray-200 overflow-y-auto resize-none font-sans whitespace-pre-wrap"
													data-testid="{testIdPrefix}-preview-diff-narrative-text"
												>{narrativePreviewText}</textarea>
											</div>
										</div>
									</div>
								{/if}
							</div>
						</details>
					{/if}
					{#if narrativePrimaryWorkflow && narrativePreviewTechnicalDetailVisible}
						<details class="rounded border border-slate-300/80 dark:border-slate-700 bg-slate-50/90 dark:bg-slate-950/40 mt-2 overflow-hidden">
							<summary
								class="cursor-pointer select-none px-2.5 py-2 text-[11px] font-semibold text-slate-800 dark:text-slate-100 list-none flex items-center gap-2 [&::-webkit-details-marker]:hidden"
							>
								<span class="text-slate-500 dark:text-slate-400">▸</span>
								{ADVANCED_REVIEW_SAVE_DERIVED_SUMMARY}
							</summary>
							<div class="rounded border border-slate-300/80 dark:border-slate-700 bg-slate-50/90 dark:bg-slate-950/40 px-2.5 py-2 space-y-2 mx-2 mb-2" data-testid="{testIdPrefix}-narrative-persist">
								<p class="text-[10px] text-slate-700 dark:text-slate-300 leading-snug">
									{NARRATIVE_SAVE_DERIVED_HELPER}
								</p>
							<button
								type="button"
								class="text-xs px-2.5 py-1.5 rounded border border-slate-600/80 text-slate-900 dark:text-slate-100 dark:border-slate-500 hover:bg-slate-100/90 dark:hover:bg-slate-900/50 disabled:opacity-50"
								data-testid="{testIdPrefix}-narrative-save-derived"
								title="Save narrative snapshot to the case (append-only reference; notebook unchanged)"
								disabled={narrativePreviewLoading ||
									narrativeSaveBusy ||
									actionBusy ||
									loading ||
									!narrativePreviewText.trim() ||
									narrativePreviewTrace.length === 0 ||
									lastNarrativePreviewScope == null ||
									lastNarrativePreviewScope.structuredNoteIds.length === 0}
								on:click={handleSaveAcceptedNarrative}
							>
									{narrativeSaveBusy ? 'Saving…' : NARRATIVE_SAVE_DERIVED_BUTTON_LABEL}
								</button>
								{#if narrativeSaveError}
									<p class="text-[11px] text-red-700 dark:text-red-300" data-testid="{testIdPrefix}-narrative-save-error">
										{narrativeSaveError}
									</p>
								{/if}
								{#if narrativeSaveFeedback}
									<p class="text-[11px] text-emerald-800 dark:text-emerald-200" data-testid="{testIdPrefix}-narrative-save-success">
										{narrativeSaveFeedback}
									</p>
								{/if}
							</div>
						</details>
					{/if}
				{/if}
				</div>
			{#if caseId && caseEngineToken}
			<div
				class="mt-3 pt-3 border-t border-dashed border-gray-300/80 dark:border-gray-600/55 rounded-md bg-slate-50/70 dark:bg-slate-950/35 px-2 py-2 space-y-2"
				data-testid="{testIdPrefix}-narrative-past-snapshots"
			>
				<p class="text-[11px] font-semibold text-gray-700 dark:text-gray-200">Past snapshots</p>
				<div
					class="pt-0.5 space-y-1.5"
					data-testid="{testIdPrefix}-saved-derived-narratives"
				>
				<details class="rounded border border-gray-200/90 dark:border-gray-700/70 bg-white/60 dark:bg-gray-900/30 px-0 py-0">
					<summary
						class="cursor-pointer select-none px-2 py-1.5 text-[11px] font-medium text-gray-600 dark:text-gray-400 list-none flex items-center gap-2 [&::-webkit-details-marker]:hidden"
					>
						<span class="text-gray-400 dark:text-gray-500">▸</span>
						{SAVED_DERIVED_WORKBENCH_SUMMARY}
					</summary>
					<div class="px-2 pb-2.5 space-y-2 border-t border-gray-200/70 dark:border-gray-700/50 pt-2">
				<p class="text-[11px] font-medium text-gray-700 dark:text-gray-300">{SAVED_DERIVED_NARRATIVE_LABEL}</p>
				<p class="text-[10px] text-gray-600 dark:text-gray-400 leading-snug">
					{SAVED_DERIVED_SOT_HELPER}
				</p>
				{#if narrativePreviewTechnicalDetailVisible}
					<div class="flex flex-wrap items-center gap-2">
						<button
							type="button"
							class="text-[10px] px-2 py-1 rounded border border-indigo-400/80 text-indigo-900 dark:text-indigo-100 dark:border-indigo-600"
							data-testid="{testIdPrefix}-narrative-show-deleted-toggle"
							title={showDeletedNarrativesInList
								? 'Hide soft-deleted narrative snapshots from the list'
								: 'Show soft-deleted narrative snapshots in the list'}
							on:click={toggleShowDeletedSavedNarratives}
						>
							{showDeletedNarrativesInList ? NARRATIVE_HIDE_DELETED_LABEL : NARRATIVE_SHOW_DELETED_LABEL}
						</button>
					</div>
				{/if}
				{#if savedListLoading}
					<p class="text-[11px] text-gray-600 dark:text-gray-400" data-testid="{testIdPrefix}-saved-list-loading">
						Loading saved narratives…
					</p>
				{:else if savedListError}
					<p class="text-[11px] text-red-700 dark:text-red-300" data-testid="{testIdPrefix}-saved-list-error">
						{savedListError}
					</p>
				{:else if savedRecordsActive.length === 0 && savedRecordsDeleted.length === 0}
					<p class="text-[11px] text-gray-600 dark:text-gray-400 italic" data-testid="{testIdPrefix}-saved-list-empty">
						No saved narratives for this case yet.
					</p>
				{:else}
					<div class="space-y-2" data-testid="{testIdPrefix}-saved-list-active-section">
						<p class="text-[10px] font-semibold text-indigo-900 dark:text-indigo-100">{NARRATIVE_SAVED_LIST_ACTIVE_HEADING}</p>
						{#if savedRecordsActive.length === 0}
							<p class="text-[11px] text-gray-600 dark:text-gray-400 italic">No active saved narratives.</p>
						{:else}
							<ul class="space-y-1 max-h-32 overflow-y-auto" data-testid="{testIdPrefix}-saved-list">
								{#each savedRecordsActive as rec}
									<li>
										<button
											type="button"
											class="w-full text-left rounded border px-2 py-1.5 text-[11px] transition {selectedSavedRecordId === rec.id
												? 'border-indigo-500 bg-indigo-50/95 dark:border-indigo-500 dark:bg-indigo-950/40'
												: 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/60'}"
											data-testid="{testIdPrefix}-saved-list-item"
											data-saved-record-id={rec.id}
											title="Open saved narrative snapshot"
											aria-label="Saved narrative snapshot"
											on:click={() => onSelectSavedRecord(rec.id)}
										>
											<span class="block font-mono text-[10px] text-indigo-800 dark:text-indigo-200/90"
												>#{rec.id} · {rec.createdAt}</span
											>
											<span class="block text-gray-800 dark:text-gray-200 mt-0.5 line-clamp-2">{rec.narrativeSnippet}</span>
											<span class="block text-[10px] text-gray-500 dark:text-gray-500 mt-0.5"
												>Notes: {rec.structuredNoteIds.join(', ')} · trace rows: {rec.traceRowCount}</span
											>
										</button>
									</li>
								{/each}
							</ul>
						{/if}
					</div>
					{#if narrativePreviewTechnicalDetailVisible && savedRecordsDeleted.length > 0}
						<div class="space-y-2 pt-2 border-t border-dashed border-indigo-200/80 dark:border-indigo-800/50" data-testid="{testIdPrefix}-saved-list-deleted-section">
							<p class="text-[10px] font-semibold text-amber-900 dark:text-amber-100">{NARRATIVE_SAVED_LIST_DELETED_HEADING}</p>
							<ul class="space-y-1 max-h-28 overflow-y-auto">
								{#each savedRecordsDeleted as rec}
									<li>
										<button
											type="button"
											class="w-full text-left rounded border px-2 py-1.5 text-[11px] transition border-amber-200 dark:border-amber-800 hover:bg-amber-50/80 dark:hover:bg-amber-950/40"
											data-testid="{testIdPrefix}-saved-list-deleted-item"
											data-saved-record-id={rec.id}
											title="Open soft-deleted narrative snapshot"
											aria-label="Soft-deleted narrative snapshot"
											on:click={() => onSelectSavedRecord(rec.id, { recordSoftDeleted: true })}
										>
											<span class="block font-mono text-[10px] text-amber-900 dark:text-amber-100"
												>#{rec.id} · {rec.createdAt}</span
											>
											<span class="block text-gray-800 dark:text-gray-200 mt-0.5 line-clamp-2">{rec.narrativeSnippet}</span>
										</button>
									</li>
								{/each}
							</ul>
						</div>
					{/if}
				{/if}
				{#if savedDetailLoading}
					<p class="text-[11px] text-gray-600 dark:text-gray-400" data-testid="{testIdPrefix}-saved-detail-loading">
						Loading record…
					</p>
				{:else if savedDetailError}
					<p class="text-[11px] text-red-700 dark:text-red-300" data-testid="{testIdPrefix}-saved-detail-error">
						{savedDetailError}
					</p>
				{/if}
				{#if savedDetail}
					<div
						class="rounded border border-indigo-300/80 bg-white/90 dark:bg-gray-950/50 dark:border-indigo-800/70 px-2 py-2 space-y-2"
						data-testid="{testIdPrefix}-saved-detail"
					>
						{#if savedRecordSoftDeleted}
							<p
								class="text-[11px] rounded border border-amber-300/80 bg-amber-50/90 dark:border-amber-800 dark:bg-amber-950/35 px-2 py-1.5 text-amber-950 dark:text-amber-100"
							>
								{NARRATIVE_SOFT_DELETED_BANNER}
							</p>
						{/if}
						<div class="flex flex-wrap gap-2">
							{#if !savedRecordSoftDeleted}
								<button
									type="button"
									class="text-xs px-2 py-1 rounded border border-rose-400/80 text-rose-900 dark:text-rose-100 disabled:opacity-50"
									data-testid="{testIdPrefix}-saved-delete-derived"
									title="Soft-delete this saved narrative (you can restore while eligible)"
									disabled={narrativeDeleteBusy}
									on:click={handleDeleteSavedNarrative}
								>
									{narrativeDeleteBusy ? '…' : NARRATIVE_SAVED_DELETE_LABEL}
								</button>
							{:else if narrativePreviewTechnicalDetailVisible}
								<button
									type="button"
									class="text-xs px-2 py-1 rounded border border-emerald-500/80 text-emerald-900 dark:text-emerald-100 disabled:opacity-50"
									data-testid="{testIdPrefix}-saved-restore-narrative"
									title="Restore this soft-deleted narrative snapshot"
									disabled={narrativeRestoreBusy}
									on:click={handleRestoreSavedNarrative}
								>
									{narrativeRestoreBusy ? '…' : NARRATIVE_RESTORE_LABEL}
								</button>
							{/if}
						</div>
						{#if narrativePreviewTechnicalDetailVisible && savedRecordIntegrity}
							<div
								class="rounded border border-stone-300/90 dark:border-stone-700 bg-stone-50/90 dark:bg-stone-950/35 px-2 py-2 space-y-2 mb-2"
								data-testid="{testIdPrefix}-saved-integrity"
							>
								<p class="text-[11px] font-semibold text-stone-900 dark:text-stone-100">
									{NARRATIVE_INTEGRITY_SECTION_HEADING}
								</p>
								<p class="text-[10px] text-stone-800/90 dark:text-stone-200/90 leading-snug">
									{NARRATIVE_INTEGRITY_HELPER}
								</p>
								<p
									class="inline-flex rounded border px-2 py-1 text-[11px] font-semibold {narrativeIntegrityBadgeClass(
										savedRecordIntegrity.status
									)}"
									data-testid="{testIdPrefix}-saved-integrity-status"
									data-integrity-status={savedRecordIntegrity.status}
								>
									{narrativeIntegrityStatusLabel(savedRecordIntegrity.status)}
								</p>
								{#if savedRecordIntegrity.signals.length > 0}
									<ul class="list-disc pl-4 space-y-1 text-[11px] text-stone-900 dark:text-stone-100">
										{#each savedRecordIntegrity.signals as sig}
											<li data-testid="{testIdPrefix}-saved-integrity-signal">{sig.message}</li>
										{/each}
									</ul>
								{/if}
							</div>
						{/if}
						<div
							class="rounded border border-indigo-200/80 dark:border-indigo-800/50 bg-indigo-50/60 dark:bg-indigo-950/25 px-2 py-2 space-y-1.5 mb-2"
							data-testid="{testIdPrefix}-saved-derived-export"
						>
							<p class="text-[10px] text-indigo-900/90 dark:text-indigo-200/90 leading-snug">
								{NARRATIVE_SAVED_DERIVED_EXPORT_HELPER}
							</p>
							{#if savedExportEligibility?.decision === 'not_eligible'}
								<p
									class="text-[11px] text-amber-900 dark:text-amber-100"
									data-testid="{testIdPrefix}-saved-export-not-eligible"
								>
									{savedExportEligibility.message}
								</p>
							{/if}
							<button
								type="button"
								class="text-xs px-2.5 py-1.5 rounded border border-indigo-500/80 text-indigo-950 dark:text-indigo-100 dark:border-indigo-600 hover:bg-indigo-100/80 dark:hover:bg-indigo-950/50 disabled:opacity-50"
								data-testid="{testIdPrefix}-saved-export-derived"
								title="Download this saved narrative as plain text"
								disabled={savedExportBusy || savedDetailLoading || savedRecordSoftDeleted}
								on:click={handleExportSavedNarrative}
							>
								{savedExportBusy ? 'Exporting…' : NARRATIVE_SAVED_DERIVED_EXPORT_LABEL}
							</button>
							{#if savedExportError}
								<p class="text-[11px] text-red-700 dark:text-red-300" data-testid="{testIdPrefix}-saved-export-error">
									{savedExportError}
								</p>
							{/if}
						</div>
						{#if !narrativePreviewTechnicalDetailVisible}
							<div class="space-y-1 mb-2">
								<p class="text-[10px] font-semibold text-indigo-950 dark:text-indigo-100">
									{COMPARE_SIDE_NARRATIVE_LABEL}
								</p>
								<textarea
									readonly
									tabindex="-1"
									class="w-full min-h-[8rem] rounded border border-indigo-200 dark:border-indigo-800 bg-white dark:bg-gray-900 px-2 py-1.5 text-xs text-gray-800 dark:text-gray-200 overflow-y-auto resize-none font-sans whitespace-pre-wrap"
									data-testid="{testIdPrefix}-saved-detail-narrative"
								>{savedDetail.narrative}</textarea>
							</div>
						{:else}
							<details
								class="rounded border border-indigo-200/85 dark:border-indigo-800/60 bg-indigo-50/40 dark:bg-indigo-950/20 overflow-hidden"
								data-testid="{testIdPrefix}-saved-compare-details"
							>
								<summary
									class="cursor-pointer select-none px-2 py-2 text-[11px] font-semibold text-indigo-950 dark:text-indigo-100 list-none flex items-center gap-2 [&::-webkit-details-marker]:hidden"
								>
									<span class="text-indigo-500 dark:text-indigo-400">▸</span>
									{ADVANCED_REVIEW_DIFF_SUMMARY}
								</summary>
								<div class="px-2 pb-2 space-y-2 border-t border-indigo-200/70 dark:border-indigo-800/50 pt-2">
									<p class="text-[11px] font-semibold text-indigo-950 dark:text-indigo-100">
										{STRUCTURED_VS_NARRATIVE_DIFF_HEADING}
									</p>
									<p class="text-[10px] text-indigo-900/90 dark:text-indigo-200/90 leading-snug">
										{STRUCTURED_VS_NARRATIVE_DIFF_HELPER}
									</p>
									<div
										class="grid grid-cols-1 md:grid-cols-2 gap-2 min-h-0"
										data-testid="{testIdPrefix}-saved-diff-review"
									>
										<div
											class="rounded border border-teal-200/80 dark:border-teal-800/60 bg-white/90 dark:bg-gray-950/40 p-2"
											data-testid="{testIdPrefix}-saved-diff-structured"
										>
											<p class="text-[10px] font-semibold text-teal-900 dark:text-teal-100 mb-1">
												{COMPARE_SIDE_STRUCTURED_LABEL}
											</p>
											<ol class="list-none space-y-2 max-h-48 overflow-y-auto text-[11px]">
												{#each savedDetail.trace as tr, i (tr.statementId + ':' + i)}
													<li
														class="rounded border border-gray-200 dark:border-gray-700 px-2 py-1.5"
														data-testid="{testIdPrefix}-saved-diff-source-row"
														data-diff-order={i + 1}
													>
														<span class="font-mono text-[10px] text-violet-800 dark:text-violet-200">{tr.statementId}</span>
														<span class="block text-gray-800 dark:text-gray-200 whitespace-pre-wrap mt-0.5">{tr.sourceText}</span>
													</li>
												{/each}
											</ol>
										</div>
										<div
											class="rounded border border-violet-200/80 dark:border-violet-800/60 bg-white/90 dark:bg-gray-950/40 p-2 flex flex-col"
											data-testid="{testIdPrefix}-saved-diff-narrative"
										>
											<p class="text-[10px] font-semibold text-violet-900 dark:text-violet-100 mb-1">
												{COMPARE_SIDE_NARRATIVE_LABEL}
											</p>
											<textarea
												readonly
												tabindex="-1"
												class="w-full min-h-[8rem] flex-1 rounded border border-indigo-200 dark:border-indigo-800 bg-white dark:bg-gray-900 px-2 py-1.5 text-xs text-gray-800 dark:text-gray-200 overflow-y-auto resize-none font-sans whitespace-pre-wrap"
												data-testid="{testIdPrefix}-saved-detail-narrative"
											>{savedDetail.narrative}</textarea>
										</div>
									</div>
								</div>
							</details>
						{/if}
					</div>
				{/if}
					</div>
				</details>
				{#if narrativePreviewTechnicalDetailVisible}
					<div
						class="mt-2 rounded border border-amber-300/80 bg-amber-50/90 dark:border-amber-800 dark:bg-amber-950/30 px-2 py-2 space-y-2"
						data-testid="{testIdPrefix}-narrative-admin-recover"
					>
						<p class="text-[11px] font-semibold text-amber-950 dark:text-amber-100">{NARRATIVE_ADMIN_RECOVER_HEADING}</p>
						<p class="text-[10px] text-amber-900 dark:text-amber-100/90 leading-snug">{NARRATIVE_ADMIN_RECOVER_HELPER}</p>
						<div class="flex flex-wrap gap-2 items-end">
							<label class="flex-1 min-w-[10rem] space-y-0.5">
								<span class="text-[10px] text-amber-900/90 dark:text-amber-200/90">{NARRATIVE_ADMIN_RECOVER_INPUT_PLACEHOLDER}</span>
								<input
									type="text"
									class="w-full rounded border border-amber-300 dark:border-amber-700 bg-white dark:bg-gray-900 px-2 py-1 text-xs text-gray-900 dark:text-gray-100"
									bind:value={adminRecoverRecordIdInput}
								/>
							</label>
							<button
								type="button"
								class="text-xs px-2.5 py-1.5 rounded border border-amber-600 text-amber-950 dark:text-amber-100 disabled:opacity-50"
								title="Load a soft-deleted narrative by record ID (admin)"
								aria-label="Load deleted narrative by ID"
								disabled={adminRecoverBusy}
								on:click={() => handleAdminRecoverLoadDeleted()}
							>
								{adminRecoverBusy ? '…' : NARRATIVE_ADMIN_RECOVER_LOAD_LABEL}
							</button>
						</div>
						{#if adminRecoverError}
							<p class="text-[11px] text-red-700 dark:text-red-300">{adminRecoverError}</p>
						{/if}
					</div>
				{/if}
				</div>
			</div>
		{/if}
			</div>
		{/if}

		<!-- Secondary: original note (hidden when primary compare already shows it) -->
		{#if !(narrativePrimaryWorkflow && narrativePreviewVisible)}
		<details class="group rounded border border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-900/40 px-2 py-1.5">
			<summary
				class="cursor-pointer text-xs font-semibold text-gray-700 dark:text-gray-300 list-none flex items-center gap-1 [&::-webkit-details-marker]:hidden"
			>
				<span class="text-gray-400 group-open:rotate-90 transition-transform inline-block">▸</span>
				Original note
			</summary>
			<textarea
				readonly
				class="w-full mt-2 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-2 py-1.5 text-xs text-gray-800 dark:text-gray-200 min-h-[4rem] max-h-[10rem] overflow-y-auto resize-y font-sans whitespace-pre-wrap"
				data-testid="{testIdPrefix}-original"
			>{originalNoteText}</textarea>
		</details>
		{/if}

		{#if !narrativePrimaryWorkflow}
		<!-- Secondary: structured breakdown (collapsed) -->
		<details class="group rounded border border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-900/40 px-2 py-1.5">
			<summary
				class="cursor-pointer text-xs font-semibold text-gray-700 dark:text-gray-300 list-none flex items-center gap-1 [&::-webkit-details-marker]:hidden"
			>
				<span class="text-gray-400 group-open:rotate-90 transition-transform inline-block">▸</span>
				Structured breakdown
			</summary>
			{#if data.proposal.statements.length === 0}
				<p class="text-xs text-gray-600 dark:text-gray-400 italic mt-2">No extracted lines in this response.</p>
			{:else}
				<ul class="space-y-1.5 max-h-48 overflow-y-auto mt-2" data-testid="{testIdPrefix}-statements">
					{#each data.proposal.statements as st}
						<li>
							<button
								type="button"
								class="w-full text-left rounded border px-2 py-1.5 transition text-xs {traceStatementId === st.statementId
									? 'border-teal-500 bg-teal-50/90 dark:border-teal-500 dark:bg-teal-900/35'
									: 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/60'}"
								data-testid="{testIdPrefix}-stmt-row"
								data-statement-id={st.statementId}
								title="Show matching paragraph in draft"
								aria-label="Structured trace: highlight matching draft paragraph"
								on:click={() => onStatementClick(st.statementId)}
							>
								<span class="block text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{st.verbatimText}</span>
								<span class="block text-[10px] text-gray-500 dark:text-gray-500 mt-0.5"
									>{st.statementId} · {st.statementType} · {st.sourceType} · {st.certainty}</span
								>
							</button>
						</li>
					{/each}
				</ul>
			{/if}
			{#if data.proposal.conflicts.length > 0 || data.proposal.ambiguities.length > 0 || data.proposal.actions.length > 0 || data.proposal.issues.length > 0}
				<details class="mt-2 text-[10px]">
					<summary class="cursor-pointer text-gray-600 dark:text-gray-400 hover:underline">More extraction fields</summary>
					<div class="mt-1.5 space-y-1 text-gray-700 dark:text-gray-300">
						{#if data.proposal.conflicts.length > 0}
							<p class="font-semibold">Conflicts</p>
							<ul class="list-disc pl-4">
								{#each data.proposal.conflicts as c}
									<li>{c.conflictId} ({c.conflictKind}): {c.statementIds.join(', ')}</li>
								{/each}
							</ul>
						{/if}
						{#if data.proposal.ambiguities.length > 0}
							<p class="font-semibold">Ambiguities</p>
							<ul class="list-disc pl-4">
								{#each data.proposal.ambiguities as a}
									<li>({a.ambiguityType}) {a.verbatimText}</li>
								{/each}
							</ul>
						{/if}
						{#if data.proposal.actions.length > 0}
							<p class="font-semibold">Actions</p>
							<ul class="list-disc pl-4">
								{#each data.proposal.actions as ac}
									<li>{ac.verbatimText}</li>
								{/each}
							</ul>
						{/if}
						{#if data.proposal.issues.length > 0}
							<p class="font-semibold">Issues</p>
							<ul class="list-disc pl-4">
								{#each data.proposal.issues as iss}
									<li>({iss.issueType}) {iss.message}</li>
								{/each}
							</ul>
						{/if}
					</div>
				</details>
			{/if}
		</details>
		{/if}
		</div>
	{/if}
</div>
