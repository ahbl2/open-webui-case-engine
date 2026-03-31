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
-->
<script lang="ts">
	import type { StructuredNotesExtractionPreviewData } from '$lib/types/structuredNotes/extractionPreview';
	import {
		downloadNarrativeRecordExport,
		getNarrativeRecordDetail,
		getNarrativeRecordsList,
		postNarrativePreview,
		postNarrativeRecord,
		type NarrativeRecordDetailDto,
		type NarrativeRecordListItemDto,
		type NarrativeRecordSaveBody
	} from '$lib/apis/caseEngine';
	import {
		NARRATIVE_PREVIEW_FRAMING_HELPER,
		NARRATIVE_PREVIEW_FRAMING_LABEL,
		NARRATIVE_PREVIEW_IN_SESSION_ACCEPT_HINT,
		NARRATIVE_PREVIEW_IN_SESSION_REJECT_HINT,
		NARRATIVE_PREVIEW_TRACE_HEADING,
		NARRATIVE_PREVIEW_TRACE_HELPER,
		NARRATIVE_PREVIEW_TRACE_EMPTY,
		NARRATIVE_TRACE_SOURCE_LABEL,
		NARRATIVE_TRACE_SHOW_LESS,
		NARRATIVE_TRACE_SHOW_MORE,
		TRACE_SOURCE_LONG_THRESHOLD_CHARS,
		isLongTraceSourceText,
		traceRowKey,
		applySuccessfulNarrativePayload,
		emptyNarrativePreviewLocalBundle,
		markNarrativePreviewLocalAccept,
		markNarrativePreviewLocalReject,
		NARRATIVE_SAVE_DERIVED_HELPER,
		NARRATIVE_SAVE_SUCCESS_MESSAGE,
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
		type NarrativeIntegrityResult
	} from '$lib/caseNotes/narrativePreviewReviewUi';

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
	let savedRecordIntegrity: NarrativeIntegrityResult | null = null;
	let savedExportBusy = false;
	let savedExportError = '';

	async function refreshSavedNarrativeList(): Promise<void> {
		if (!caseId || !caseEngineToken) return;
		savedListLoading = true;
		savedListError = '';
		const r = await getNarrativeRecordsList(caseId, caseEngineToken);
		savedListLoading = false;
		if (!r.success) {
			savedListError = r.errorMessage;
			savedRecords = [];
			return;
		}
		savedRecords = r.records;
	}

	async function onSelectSavedRecord(recordId: number): Promise<void> {
		if (!caseId || !caseEngineToken) return;
		selectedSavedRecordId = recordId;
		savedDetailLoading = true;
		savedDetailError = '';
		savedDetail = null;
		savedRecordIntegrity = null;
		savedExportError = '';
		const r = await getNarrativeRecordDetail(caseId, recordId, caseEngineToken);
		savedDetailLoading = false;
		if (!r.success) {
			savedDetailError = r.errorMessage;
			return;
		}
		savedDetail = r.record;
		savedRecordIntegrity = r.integrity ?? null;
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
	}

	function handleNarrativeLocalAccept(): void {
		narrativeLocalReviewStatus = markNarrativePreviewLocalAccept();
	}

	function handleNarrativeLocalReject(): void {
		narrativeLocalReviewStatus = markNarrativePreviewLocalReject();
	}

	async function handleGenerateNarrativePreview(): Promise<void> {
		if (!caseId || !caseEngineToken || notebookNoteId == null || !data) return;
		narrativePreviewLoading = true;
		narrativePreviewError = '';
		const stmtIds = data.proposal.statements.map((s) => s.statementId);
		/** P35-01A: explicit mode — never send both multi-note and structuredStatementIds; statement mode uses exactly one note id + non-empty ids only. */
		const body =
			stmtIds.length > 0
				? { structuredNoteIds: [notebookNoteId], structuredStatementIds: stmtIds }
				: { structuredNoteIds: [notebookNoteId] };
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
			return;
		}
		resetNarrativeTraceExpandState();
		lastNarrativePreviewScope =
			stmtIds.length > 0
				? { structuredNoteIds: [notebookNoteId], structuredStatementIds: [...stmtIds] }
				: { structuredNoteIds: [notebookNoteId] };
		narrativeSaveError = '';
		narrativeSaveFeedback = '';
		const applied = applySuccessfulNarrativePayload(r.data);
		narrativePreviewText = applied.narrative;
		narrativePreviewTrace = applied.trace;
		narrativePreviewWarnings = applied.warnings;
		narrativeLocalReviewStatus = applied.reviewStatus;
		narrativePreviewVisible = applied.visible;
		narrativePreviewIntegrity = r.data.integrity ?? null;
	}

	async function handleSaveAcceptedNarrative(): Promise<void> {
		if (!caseId || !caseEngineToken || !lastNarrativePreviewScope) return;
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
		savedExportBusy = true;
		savedExportError = '';
		const r = await downloadNarrativeRecordExport(caseId, selectedSavedRecordId, caseEngineToken);
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
		data?.render?.blocks?.filter((b) => b.kind === 'statement') ?? [];

	$: showAcceptEdit =
		canCommitDraft && !editedCommitPending && !actionBusy && !loading && data != null;

	$: hasValidationDetails =
		data != null &&
		(data.validation.errors.length > 0 ||
			data.validation.warnings.length > 0 ||
			data.validation.blockedRender);
</script>

<div
	class="shrink-0 mx-5 mt-2 mb-1 rounded border border-teal-200/90 dark:border-teal-800/80 bg-teal-50/90 dark:bg-teal-950/30 px-3 py-3 text-xs space-y-3"
	data-testid="{testIdPrefix}-panel"
>
	<div class="flex flex-wrap items-start justify-between gap-2">
		<div>
			<p class="text-sm font-semibold text-teal-950 dark:text-teal-100">
				Structured Draft (from your note)
			</p>
			<p class="text-[11px] text-teal-800/95 dark:text-teal-300/90 mt-1 leading-snug max-w-prose">
				This draft is generated from your original note. Review before saving.
			</p>
		</div>
		{#if onClosePanel}
			<button
				type="button"
				class="shrink-0 text-xs px-2.5 py-1 rounded border border-teal-400/70 text-teal-900 dark:text-teal-100 dark:border-teal-600 hover:bg-teal-100/80 dark:hover:bg-teal-900/40"
				data-testid="{testIdPrefix}-close"
				on:click={onClosePanel}
			>
				Close
			</button>
		{/if}
	</div>

	{#if editedCommitPending && data}
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
			Generating structured draft…
		</p>
	{:else if errorMessage}
		<p class="text-xs text-red-700 dark:text-red-300" data-testid="{testIdPrefix}-error">{errorMessage}</p>
	{:else if data}
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

		<!-- Primary: rendered draft -->
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
				>{data.render.renderedText}</textarea>
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

		{#if data && caseId && caseEngineToken && notebookNoteId != null}
			<div
				class="mt-3 pt-3 border-t border-dashed border-teal-200/80 dark:border-teal-800/60 space-y-2"
				data-testid="{testIdPrefix}-narrative-preview"
			>
				<p class="text-[11px] font-semibold text-gray-800 dark:text-gray-200">Narrative preview</p>
				<button
					type="button"
					class="text-xs px-2.5 py-1.5 rounded border border-violet-400/80 text-violet-900 dark:text-violet-100 dark:border-violet-600 hover:bg-violet-50/90 dark:hover:bg-violet-950/40 disabled:opacity-50"
					data-testid="{testIdPrefix}-narrative-generate"
					disabled={narrativePreviewLoading || actionBusy || loading}
					on:click={handleGenerateNarrativePreview}
				>
					{narrativePreviewLoading
						? 'Generating…'
						: narrativePreviewVisible
							? 'Regenerate Narrative Preview'
							: 'Generate Narrative Preview'}
				</button>
				{#if narrativePreviewError}
					<p class="text-[11px] text-red-700 dark:text-red-300" data-testid="{testIdPrefix}-narrative-error">
						{narrativePreviewError}
					</p>
				{/if}
				{#if narrativePreviewVisible}
					<div
						class="rounded border border-amber-300/90 bg-amber-50/95 dark:border-amber-700/80 dark:bg-amber-950/35 px-2.5 py-2 space-y-1.5"
						data-testid="{testIdPrefix}-narrative-framing"
					>
						<p
							class="text-[11px] font-bold uppercase tracking-wide text-amber-900 dark:text-amber-100"
							data-testid="{testIdPrefix}-narrative-framing-label"
						>
							{NARRATIVE_PREVIEW_FRAMING_LABEL}
						</p>
						<p class="text-[11px] text-amber-950/95 dark:text-amber-100/95 leading-snug" data-testid="{testIdPrefix}-narrative-framing-helper">
							{NARRATIVE_PREVIEW_FRAMING_HELPER}
						</p>
					</div>
					{#if narrativePreviewWarnings.length > 0}
						<div
							class="rounded border border-orange-300 dark:border-orange-800 bg-orange-50/90 dark:bg-orange-950/40 px-2.5 py-2 space-y-1"
							data-testid="{testIdPrefix}-narrative-warnings"
							role="alert"
						>
							<p class="text-[11px] font-semibold text-orange-950 dark:text-orange-100">Warnings</p>
							<ul class="list-disc pl-4 space-y-1 text-[11px] text-orange-950 dark:text-orange-100/95">
								{#each narrativePreviewWarnings as w}
									<li data-testid="{testIdPrefix}-narrative-warning-item">{w}</li>
								{/each}
							</ul>
						</div>
					{/if}
					{#if narrativeLocalReviewStatus === 'accepted'}
						<p
							class="text-[11px] rounded border border-emerald-300/80 bg-emerald-50/90 dark:border-emerald-800 dark:bg-emerald-950/40 px-2 py-1.5 text-emerald-950 dark:text-emerald-100"
							data-testid="{testIdPrefix}-narrative-in-session-accepted"
						>
							{NARRATIVE_PREVIEW_IN_SESSION_ACCEPT_HINT}
						</p>
					{:else if narrativeLocalReviewStatus === 'rejected'}
						<p
							class="text-[11px] rounded border border-rose-300/80 bg-rose-50/90 dark:border-rose-900/50 dark:bg-rose-950/35 px-2 py-1.5 text-rose-950 dark:text-rose-100"
							data-testid="{testIdPrefix}-narrative-in-session-rejected"
						>
							{NARRATIVE_PREVIEW_IN_SESSION_REJECT_HINT}
						</p>
					{/if}
					<textarea
						readonly
						class="w-full rounded border border-violet-200 dark:border-violet-800 bg-white dark:bg-gray-900 px-2 py-2 text-xs text-gray-800 dark:text-gray-200 min-h-[4rem] max-h-[14rem] overflow-y-auto resize-y font-sans whitespace-pre-wrap"
						data-testid="{testIdPrefix}-narrative-text"
					>{narrativePreviewText}</textarea>
					<div
						class="rounded border border-teal-300/90 bg-teal-50/50 dark:border-teal-800/80 dark:bg-teal-950/30 overflow-hidden"
						data-testid="{testIdPrefix}-narrative-trace-section"
					>
						<div class="px-2.5 py-2 border-b border-teal-200/80 dark:border-teal-800/60 space-y-1">
							<p class="text-[11px] font-semibold text-teal-950 dark:text-teal-100">{NARRATIVE_PREVIEW_TRACE_HEADING}</p>
							<p class="text-[10px] text-teal-900/90 dark:text-teal-200/90 leading-snug" data-testid="{testIdPrefix}-narrative-trace-helper">
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
												<div class="min-w-0 flex-1 space-y-0.5">
													<p class="text-[10px] font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
														Statement ID
													</p>
													<p class="font-mono text-[10px] text-violet-800 dark:text-violet-200 break-all leading-snug">
														{row.statementId}
													</p>
												</div>
											</div>
											<div class="border-t border-dashed border-teal-200/60 dark:border-teal-800/50 pt-1.5 space-y-1">
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
														on:click={() => toggleNarrativeTraceSourceExpanded(rowKey)}
													>
														{expanded ? NARRATIVE_TRACE_SHOW_LESS : NARRATIVE_TRACE_SHOW_MORE}
													</button>
												{/if}
											</div>
										</li>
									{/each}
								</ol>
							{/if}
						</div>
					</div>
					{#if narrativePreviewIntegrity}
						<div
							class="rounded border border-stone-300/90 dark:border-stone-700 bg-stone-50/90 dark:bg-stone-950/35 px-2.5 py-2 space-y-2 mt-1"
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
							class="rounded border border-sky-300/85 dark:border-sky-800/70 bg-sky-50/80 dark:bg-sky-950/25 px-2.5 py-2 space-y-2 mt-1"
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
												<span class="font-mono text-[10px] text-violet-800 dark:text-violet-200">{row.statementId}</span>
												<span class="block text-gray-800 dark:text-gray-200 whitespace-pre-wrap mt-0.5">{row.sourceText}</span>
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
					<div class="flex flex-wrap gap-2 pt-0.5" data-testid="{testIdPrefix}-narrative-review-actions">
						<button
							type="button"
							class="text-xs px-2.5 py-1.5 rounded border border-emerald-500/80 text-emerald-900 dark:text-emerald-100 dark:border-emerald-700 hover:bg-emerald-50/90 dark:hover:bg-emerald-950/50 disabled:opacity-50"
							data-testid="{testIdPrefix}-narrative-accept"
							disabled={narrativePreviewLoading || actionBusy || loading}
							on:click={handleNarrativeLocalAccept}
						>
							Accept Preview
						</button>
						<button
							type="button"
							class="text-xs px-2.5 py-1.5 rounded border border-rose-400/80 text-rose-900 dark:text-rose-100 dark:border-rose-700 hover:bg-rose-50/90 dark:hover:bg-rose-950/40 disabled:opacity-50"
							data-testid="{testIdPrefix}-narrative-reject"
							disabled={narrativePreviewLoading || actionBusy || loading}
							on:click={handleNarrativeLocalReject}
						>
							Reject Preview
						</button>
						<button
							type="button"
							class="text-xs px-2.5 py-1.5 rounded border border-gray-400/70 text-gray-800 dark:text-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800/60 disabled:opacity-50"
							data-testid="{testIdPrefix}-narrative-clear"
							disabled={narrativePreviewLoading || actionBusy || loading}
							on:click={handleNarrativeLocalClear}
						>
							Clear Preview
						</button>
					</div>
					<div class="rounded border border-slate-300/80 dark:border-slate-700 bg-slate-50/90 dark:bg-slate-950/40 px-2.5 py-2 space-y-2 mt-1" data-testid="{testIdPrefix}-narrative-persist">
						<p class="text-[10px] text-slate-700 dark:text-slate-300 leading-snug">
							{NARRATIVE_SAVE_DERIVED_HELPER}
						</p>
						<button
							type="button"
							class="text-xs px-2.5 py-1.5 rounded border border-slate-600/80 text-slate-900 dark:text-slate-100 dark:border-slate-500 hover:bg-slate-100/90 dark:hover:bg-slate-900/50 disabled:opacity-50"
							data-testid="{testIdPrefix}-narrative-save-derived"
							disabled={narrativePreviewLoading ||
								narrativeSaveBusy ||
								actionBusy ||
								loading ||
								!narrativePreviewText.trim() ||
								narrativePreviewTrace.length === 0 ||
								lastNarrativePreviewScope == null}
							on:click={handleSaveAcceptedNarrative}
						>
							{narrativeSaveBusy ? 'Saving…' : 'Save Accepted Narrative'}
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
				{/if}
			</div>
		{/if}

		{#if caseId && caseEngineToken}
			<div
				class="mt-3 pt-3 border-t border-dashed border-indigo-200/90 dark:border-indigo-800/60 space-y-2"
				data-testid="{testIdPrefix}-saved-derived-narratives"
			>
				<p class="text-[11px] font-semibold text-indigo-950 dark:text-indigo-100">{SAVED_DERIVED_NARRATIVE_LABEL}</p>
				<p class="text-[10px] text-indigo-900/90 dark:text-indigo-200/90 leading-snug">
					{SAVED_DERIVED_SOT_HELPER} This is separate from the live narrative preview above.
				</p>
				{#if savedListLoading}
					<p class="text-[11px] text-gray-600 dark:text-gray-400" data-testid="{testIdPrefix}-saved-list-loading">
						Loading saved narratives…
					</p>
				{:else if savedListError}
					<p class="text-[11px] text-red-700 dark:text-red-300" data-testid="{testIdPrefix}-saved-list-error">
						{savedListError}
					</p>
				{:else if savedRecords.length === 0}
					<p class="text-[11px] text-gray-600 dark:text-gray-400 italic" data-testid="{testIdPrefix}-saved-list-empty">
						No saved derived narratives for this case yet.
					</p>
				{:else}
					<ul class="space-y-1 max-h-32 overflow-y-auto" data-testid="{testIdPrefix}-saved-list">
						{#each savedRecords as rec}
							<li>
								<button
									type="button"
									class="w-full text-left rounded border px-2 py-1.5 text-[11px] transition {selectedSavedRecordId === rec.id
										? 'border-indigo-500 bg-indigo-50/95 dark:border-indigo-500 dark:bg-indigo-950/40'
										: 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/60'}"
									data-testid="{testIdPrefix}-saved-list-item"
									data-saved-record-id={rec.id}
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
						{#if savedRecordIntegrity}
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
							<button
								type="button"
								class="text-xs px-2.5 py-1.5 rounded border border-indigo-500/80 text-indigo-950 dark:text-indigo-100 dark:border-indigo-600 hover:bg-indigo-100/80 dark:hover:bg-indigo-950/50 disabled:opacity-50"
								data-testid="{testIdPrefix}-saved-export-derived"
								disabled={savedExportBusy || savedDetailLoading}
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
				{/if}
			</div>
		{/if}

		<!-- Secondary: original note -->
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
