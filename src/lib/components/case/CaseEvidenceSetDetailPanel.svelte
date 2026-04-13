<script lang="ts">
	/**
	 * P109-04 — Read-only saved evidence set: metadata + explicit membership ids only (no edit actions).
	 * P109-05 — Audit labeling + read-only surface constraints.
	 * P110-02 — Read-only output preview from Case Engine expansion (resolved records; no edit actions).
	 * P110-03 — Deterministic composition (ordering) via `composeDeterministicEvidenceSetOutput`.
	 * P110-04 — Copy/download plain text via `serializeDeterministicPlainTextOutput` only.
	 * P110-05 — Traceability cues + output constraint copy (non-authoritative; deterministic).
	 * P111-04 — DOCX/PDF download via Case Engine export routes only (no client-side document assembly).
	 * P112-02 — Deterministic export copy: attribution + non-authority (no new behavior).
	 * P112-05 — Non-authority wording only; same preview/export path and fetch-only exports.
	 */
	import { onDestroy } from 'svelte';
	import {
		getEvidenceSetDetail,
		getEvidenceSetExpanded,
		fetchEvidenceSetExportDocx,
		fetchEvidenceSetExportPdf,
		type CaseEngineEvidenceSetWithItems,
		type CaseEngineEvidenceSetExpanded
	} from '$lib/apis/caseEngine/evidenceSetsApi';
	import {
		P109_EVIDENCE_SET_AUDIT_ATTRIBUTION_LINE,
		P109_EVIDENCE_SET_DETAIL_PAGE_TITLE,
		P109_EVIDENCE_SET_DETAIL_READONLY_BADGE,
		P109_EVIDENCE_SET_DETAIL_SUPPORTING_COPY,
		P109_EVIDENCE_SET_DETAIL_AUDIT_LABEL,
		P109_EVIDENCE_SET_DETAIL_BACK,
		P109_EVIDENCE_SET_DETAIL_LOADING,
		P109_EVIDENCE_SET_DETAIL_NOT_FOUND,
		P109_EVIDENCE_SET_DETAIL_ERROR,
		P109_EVIDENCE_SET_DETAIL_NO_SESSION,
		P109_EVIDENCE_SET_DETAIL_SECTION_TIMELINE,
		P109_EVIDENCE_SET_DETAIL_SECTION_FILES,
		P109_EVIDENCE_SET_DETAIL_TIMELINE_ROW,
		P109_EVIDENCE_SET_DETAIL_FILE_ROW,
		P109_EVIDENCE_SET_DETAIL_SECTION_EMPTY,
		P109_EVIDENCE_SET_DETAIL_IDS_ONLY_NOTE
	} from '$lib/case/p109EvidenceSetsCopy';
	import { formatEvidenceSetSavedAt } from '$lib/case/p109EvidenceSetsFormat';
	import {
		P110_OUTPUT_PREVIEW_SECTION_TITLE,
		P110_OUTPUT_PREVIEW_SECTION_SUPPORTING,
		P110_OUTPUT_PREVIEW_ERROR_GENERIC,
		P110_OUTPUT_PREVIEW_TIMELINE_HEADING,
		P110_OUTPUT_PREVIEW_FILES_HEADING,
		P110_OUTPUT_PREVIEW_EMPTY_SECTION,
		P110_OUTPUT_PREVIEW_TIMELINE_META_LINE,
		P110_OUTPUT_PREVIEW_FILE_META_LINE,
		P110_OUTPUT_COPY_BUTTON,
		P110_OUTPUT_DOWNLOAD_BUTTON,
		P110_OUTPUT_COPY_SUCCESS,
		P110_OUTPUT_COPY_FAILED,
		P110_OUTPUT_DOWNLOAD_SUCCESS,
		P110_OUTPUT_DOWNLOAD_FAILED,
		P110_OUTPUT_TRACEABILITY_LABEL,
		P110_OUTPUT_TRACEABILITY_CASE_SET_LINE,
		P110_OUTPUT_TRACEABILITY_NON_AUTHORITY,
		P110_OUTPUT_TRACEABILITY_PLAIN_TEXT_NOTE,
		P110_OUTPUT_VERSION_LINE
	} from '$lib/case/p110EvidenceSetOutputPreviewCopy';
	import {
		P110_COMPOSITION_RULES_VERSION,
		composeDeterministicEvidenceSetOutput,
		serializeDeterministicPlainTextOutput
	} from '$lib/case/p110EvidenceSetOutputComposition';
	import {
		buildDeterministicPlainTextFilename,
		triggerPlainTextDownload
	} from '$lib/case/p110EvidenceSetOutputDownload';
	import { writePlainTextToClipboard } from '$lib/case/p110EvidenceSetOutputClipboard';
	import {
		P111_EXPORT_DOCX_BUTTON,
		P111_EXPORT_PDF_BUTTON,
		P112_EXPORT_FROM_PREVIEW_HELPER,
		P111_EXPORT_LOADING_DOCX,
		P111_EXPORT_LOADING_PDF,
		P111_EXPORT_SUCCESS_DOCX,
		P111_EXPORT_SUCCESS_PDF,
		P112_EXPORT_FAILED_DOCX,
		P112_EXPORT_FAILED_PDF,
		P112_EXPORT_FAILED_GENERIC
	} from '$lib/case/p111EvidenceSetExportCopy';
	import {
		buildEvidenceSetExportDocxFilename,
		buildEvidenceSetExportPdfFilename,
		triggerBinaryDownload
	} from '$lib/case/p111EvidenceSetExportDownload';
	import Spinner from '$lib/components/common/Spinner.svelte';

	export let caseId: string;
	export let setId: string;
	export let caseEngineToken: string;

	let loading = false;
	let clientError = '';
	let notFound = false;
	let detail: CaseEngineEvidenceSetWithItems | null = null;
	let expanded: CaseEngineEvidenceSetExpanded | null = null;
	let expandedError = '';
	/** P110-04 feedback for copy/download (read-only output actions). */
	let outputActionFeedback: 'copy_ok' | 'copy_fail' | 'download_ok' | 'download_fail' | '' = '';

	/** P111-04: export busy + feedback (binary from Case Engine only). */
	let p111ExportBusy: 'none' | 'docx' | 'pdf' = 'none';
	let p111ExportFeedback: 'docx_ok' | 'pdf_ok' | 'docx_err' | 'pdf_err' | '' = '';
	let p111ExportErrorDetail = '';

	let requestGeneration = 0;
	let activeKey = '';

	function resetForSet(): void {
		loading = false;
		clientError = '';
		notFound = false;
		detail = null;
		expanded = null;
		expandedError = '';
		outputActionFeedback = '';
		p111ExportBusy = 'none';
		p111ExportFeedback = '';
		p111ExportErrorDetail = '';
		requestGeneration += 1;
		activeKey = `${caseId}|${setId}`;
	}

	$: if (caseId && setId && `${caseId}|${setId}` !== activeKey) {
		resetForSet();
	}

	onDestroy(() => {
		requestGeneration += 1;
	});

	async function loadDetail(): Promise<void> {
		const myCase = caseId;
		const mySet = setId;
		if (!myCase || !mySet) return;
		if (!caseEngineToken) {
			clientError = P109_EVIDENCE_SET_DETAIL_NO_SESSION;
			detail = null;
			notFound = false;
			return;
		}
		const gen = ++requestGeneration;
		loading = true;
		clientError = '';
		notFound = false;
		detail = null;
		expanded = null;
		expandedError = '';
		try {
			const d = await getEvidenceSetDetail(myCase, mySet, caseEngineToken);
			if (gen !== requestGeneration || myCase !== caseId || mySet !== setId) return;
			if (d === null) {
				notFound = true;
				detail = null;
				expanded = null;
			} else {
				notFound = false;
				detail = d;
				try {
					const ex = await getEvidenceSetExpanded(myCase, mySet, caseEngineToken);
					if (gen !== requestGeneration || myCase !== caseId || mySet !== setId) return;
					expanded = ex;
					expandedError =
						ex === null
							? P110_OUTPUT_PREVIEW_ERROR_GENERIC
							: '';
				} catch (exErr: unknown) {
					if (gen !== requestGeneration || myCase !== caseId || mySet !== setId) return;
					expanded = null;
					expandedError = exErr instanceof Error ? exErr.message : P110_OUTPUT_PREVIEW_ERROR_GENERIC;
				}
			}
		} catch (e: unknown) {
			if (gen !== requestGeneration || myCase !== caseId || mySet !== setId) return;
			detail = null;
			expanded = null;
			expandedError = '';
			notFound = false;
			clientError = e instanceof Error ? e.message : P109_EVIDENCE_SET_DETAIL_ERROR;
		} finally {
			if (gen === requestGeneration && myCase === caseId && mySet === setId) loading = false;
		}
	}

	$: if (caseId && setId && caseEngineToken && activeKey === `${caseId}|${setId}`) {
		void loadDetail();
	}

	$: if (caseId && setId && !caseEngineToken && activeKey === `${caseId}|${setId}`) {
		clientError = P109_EVIDENCE_SET_DETAIL_NO_SESSION;
		detail = null;
		notFound = false;
		loading = false;
	}

	/** UI sections: timeline entries first, then files; within each sort by `source_id` (deterministic). */
	$: timelineItems =
		detail?.items
			.filter((i) => i.item_kind === 'timeline_entry')
			.sort((a, b) => a.source_id.localeCompare(b.source_id)) ?? [];
	$: fileItems =
		detail?.items
			.filter((i) => i.item_kind === 'file')
			.sort((a, b) => a.source_id.localeCompare(b.source_id)) ?? [];

	/** P110-03: canonical ordering for preview (timeline / files / membership). */
	$: composedExpanded = expanded ? composeDeterministicEvidenceSetOutput(expanded) : null;

	async function copyOutputText(): Promise<void> {
		if (!composedExpanded) return;
		const text = serializeDeterministicPlainTextOutput(composedExpanded);
		try {
			await writePlainTextToClipboard(text);
			outputActionFeedback = 'copy_ok';
		} catch {
			outputActionFeedback = 'copy_fail';
		}
		window.setTimeout(() => {
			if (outputActionFeedback === 'copy_ok' || outputActionFeedback === 'copy_fail') {
				outputActionFeedback = '';
			}
		}, 5000);
	}

	function downloadOutputText(): void {
		if (!composedExpanded) return;
		const text = serializeDeterministicPlainTextOutput(composedExpanded);
		const filename = buildDeterministicPlainTextFilename(caseId, setId);
		try {
			triggerPlainTextDownload(text, filename);
			outputActionFeedback = 'download_ok';
		} catch {
			outputActionFeedback = 'download_fail';
		}
		window.setTimeout(() => {
			if (outputActionFeedback === 'download_ok' || outputActionFeedback === 'download_fail') {
				outputActionFeedback = '';
			}
		}, 5000);
	}

	async function downloadExportDocx(): Promise<void> {
		if (!caseEngineToken || !caseId || !setId) return;
		p111ExportBusy = 'docx';
		p111ExportFeedback = '';
		p111ExportErrorDetail = '';
		try {
			const blob = await fetchEvidenceSetExportDocx(caseId, setId, caseEngineToken);
			triggerBinaryDownload(blob, buildEvidenceSetExportDocxFilename(caseId, setId));
			p111ExportFeedback = 'docx_ok';
		} catch (e: unknown) {
			p111ExportFeedback = 'docx_err';
			p111ExportErrorDetail = e instanceof Error ? e.message : P112_EXPORT_FAILED_GENERIC;
		} finally {
			p111ExportBusy = 'none';
		}
		window.setTimeout(() => {
			if (p111ExportFeedback === 'docx_ok' || p111ExportFeedback === 'docx_err') {
				p111ExportFeedback = '';
				p111ExportErrorDetail = '';
			}
		}, 8000);
	}

	async function downloadExportPdf(): Promise<void> {
		if (!caseEngineToken || !caseId || !setId) return;
		p111ExportBusy = 'pdf';
		p111ExportFeedback = '';
		p111ExportErrorDetail = '';
		try {
			const blob = await fetchEvidenceSetExportPdf(caseId, setId, caseEngineToken);
			triggerBinaryDownload(blob, buildEvidenceSetExportPdfFilename(caseId, setId));
			p111ExportFeedback = 'pdf_ok';
		} catch (e: unknown) {
			p111ExportFeedback = 'pdf_err';
			p111ExportErrorDetail = e instanceof Error ? e.message : P112_EXPORT_FAILED_GENERIC;
		} finally {
			p111ExportBusy = 'none';
		}
		window.setTimeout(() => {
			if (p111ExportFeedback === 'pdf_ok' || p111ExportFeedback === 'pdf_err') {
				p111ExportFeedback = '';
				p111ExportErrorDetail = '';
			}
		}, 8000);
	}
</script>

<div
	class="flex flex-col gap-4 min-h-0"
	data-testid="case-evidence-set-detail-panel"
	data-case-evidence-set-detail-case-id={caseId}
	data-case-evidence-set-detail-set-id={setId}
	data-ce-p109-surface="evidence-set-readonly"
>
	<nav class="shrink-0" aria-label="Evidence set detail">
		<a
			href={`/case/${encodeURIComponent(caseId)}/evidence-sets`}
			class="text-sm text-[color:var(--ce-l-text-secondary)] hover:underline"
			data-testid="case-evidence-set-detail--back"
		>
			{P109_EVIDENCE_SET_DETAIL_BACK}
		</a>
	</nav>

	{#if loading}
		<div class="flex items-center gap-2 text-sm text-[color:var(--ce-l-text-secondary)]" data-testid="case-evidence-set-detail--loading">
			<Spinner />
			<span>{P109_EVIDENCE_SET_DETAIL_LOADING}</span>
		</div>
	{:else if clientError}
		<p class="text-sm text-[color:var(--ce-l-text-secondary)]" data-testid="case-evidence-set-detail--error" role="alert">
			{clientError}
		</p>
	{:else if notFound}
		<p class="text-sm text-[color:var(--ce-l-text-secondary)]" data-testid="case-evidence-set-detail--not-found" role="status">
			{P109_EVIDENCE_SET_DETAIL_NOT_FOUND}
		</p>
	{:else if detail}
		<header class="flex flex-col gap-1 shrink-0">
			<p
				class="text-xs font-semibold uppercase tracking-wide text-[color:var(--ce-l-text-muted)]"
				data-testid="case-evidence-set-detail--readonly-badge"
			>
				{P109_EVIDENCE_SET_DETAIL_READONLY_BADGE}
			</p>
			<p class="text-xs font-medium text-[color:var(--ce-l-text-muted)]">{P109_EVIDENCE_SET_DETAIL_PAGE_TITLE}</p>
			<h1 class="text-lg font-semibold text-[color:var(--ce-l-text-primary)]">{detail.name}</h1>
			<p class="text-sm text-[color:var(--ce-l-text-secondary)] max-w-prose">{P109_EVIDENCE_SET_DETAIL_SUPPORTING_COPY}</p>
			<p class="text-xs font-medium text-[color:var(--ce-l-text-muted)]">{P109_EVIDENCE_SET_DETAIL_AUDIT_LABEL}</p>
			<p class="text-xs text-[color:var(--ce-l-text-muted)]" data-testid="case-evidence-set-detail--meta">
				{P109_EVIDENCE_SET_AUDIT_ATTRIBUTION_LINE(
					formatEvidenceSetSavedAt(detail.created_at),
					detail.created_by
				)}
			</p>
		</header>

		<section
			class="flex flex-col gap-3 rounded-md border border-[color:var(--ce-l-border-subtle)] p-3 bg-[color:var(--ce-l-surface-elevated)]"
			data-testid="case-evidence-set-detail--output-preview"
			data-ce-p110-surface="evidence-set-output-preview"
			aria-labelledby="p110-output-preview-heading"
		>
			<div class="flex flex-col gap-1">
				<h2 id="p110-output-preview-heading" class="text-sm font-semibold text-[color:var(--ce-l-text-primary)]">
					{P110_OUTPUT_PREVIEW_SECTION_TITLE}
				</h2>
				<p class="text-xs text-[color:var(--ce-l-text-muted)] max-w-prose">{P110_OUTPUT_PREVIEW_SECTION_SUPPORTING}</p>
			</div>

			<div
				class="flex flex-col gap-1 shrink-0 border-t border-[color:var(--ce-l-border-subtle)] pt-2"
				data-testid="case-evidence-set-detail--output-traceability"
			>
				<p class="text-xs font-medium text-[color:var(--ce-l-text-muted)]">{P110_OUTPUT_TRACEABILITY_LABEL}</p>
				<p class="text-xs text-[color:var(--ce-l-text-muted)] break-all">
					{P110_OUTPUT_TRACEABILITY_CASE_SET_LINE(caseId, setId)}
				</p>
				<p class="text-xs text-[color:var(--ce-l-text-muted)] max-w-prose">{P110_OUTPUT_TRACEABILITY_NON_AUTHORITY}</p>
				<p class="text-xs text-[color:var(--ce-l-text-muted)] max-w-prose">{P110_OUTPUT_TRACEABILITY_PLAIN_TEXT_NOTE}</p>
				<p class="text-xs text-[color:var(--ce-l-text-muted)] break-all">
					{P110_OUTPUT_VERSION_LINE(P110_COMPOSITION_RULES_VERSION)}
				</p>
			</div>

			{#if expandedError}
				<p
					class="text-sm text-[color:var(--ce-l-text-secondary)]"
					data-testid="case-evidence-set-detail--preview-error"
					role="alert"
				>
					{expandedError}
				</p>
			{:else if composedExpanded}
				<p
					class="text-xs text-[color:var(--ce-l-text-muted)] max-w-prose shrink-0"
					data-testid="case-evidence-set-detail--export-helper-p112"
					data-ce-p112-surface="export-attribution-helper"
				>
					{P112_EXPORT_FROM_PREVIEW_HELPER}
				</p>
				<div
					class="flex flex-wrap gap-2 shrink-0"
					data-testid="case-evidence-set-detail--output-actions"
					data-ce-p110-output-action="toolbar"
					data-ce-p111-surface="evidence-set-export-actions"
				>
					<button
						type="button"
						class="text-sm px-2 py-1 rounded border border-[color:var(--ce-l-border-subtle)] text-[color:var(--ce-l-text-primary)] hover:opacity-90 disabled:opacity-50"
						data-testid="case-evidence-set-detail--copy-output"
						data-ce-p110-output-action="copy"
						on:click={() => void copyOutputText()}
					>
						{P110_OUTPUT_COPY_BUTTON}
					</button>
					<button
						type="button"
						class="text-sm px-2 py-1 rounded border border-[color:var(--ce-l-border-subtle)] text-[color:var(--ce-l-text-primary)] hover:opacity-90 disabled:opacity-50"
						data-testid="case-evidence-set-detail--download-output"
						data-ce-p110-output-action="download"
						on:click={downloadOutputText}
					>
						{P110_OUTPUT_DOWNLOAD_BUTTON}
					</button>
					<button
						type="button"
						class="text-sm px-2 py-1 rounded border border-[color:var(--ce-l-border-subtle)] text-[color:var(--ce-l-text-primary)] hover:opacity-90 disabled:opacity-50"
						data-testid="case-evidence-set-detail--export-docx"
						data-ce-p111-export="docx"
						disabled={p111ExportBusy !== 'none'}
						aria-busy={p111ExportBusy === 'docx'}
						on:click={() => void downloadExportDocx()}
					>
						{P111_EXPORT_DOCX_BUTTON}
					</button>
					<button
						type="button"
						class="text-sm px-2 py-1 rounded border border-[color:var(--ce-l-border-subtle)] text-[color:var(--ce-l-text-primary)] hover:opacity-90 disabled:opacity-50"
						data-testid="case-evidence-set-detail--export-pdf"
						data-ce-p111-export="pdf"
						disabled={p111ExportBusy !== 'none'}
						aria-busy={p111ExportBusy === 'pdf'}
						on:click={() => void downloadExportPdf()}
					>
						{P111_EXPORT_PDF_BUTTON}
					</button>
				</div>
				{#if p111ExportBusy === 'docx'}
					<p class="text-xs text-[color:var(--ce-l-text-muted)]" data-testid="case-evidence-set-detail--export-loading-docx" role="status">
						{P111_EXPORT_LOADING_DOCX}
					</p>
				{:else if p111ExportBusy === 'pdf'}
					<p class="text-xs text-[color:var(--ce-l-text-muted)]" data-testid="case-evidence-set-detail--export-loading-pdf" role="status">
						{P111_EXPORT_LOADING_PDF}
					</p>
				{/if}
				{#if p111ExportFeedback === 'docx_ok'}
					<p
						class="text-xs text-[color:var(--ce-l-text-muted)]"
						data-testid="case-evidence-set-detail--export-feedback-docx-success"
						role="status"
					>
						{P111_EXPORT_SUCCESS_DOCX}
					</p>
				{:else if p111ExportFeedback === 'pdf_ok'}
					<p
						class="text-xs text-[color:var(--ce-l-text-muted)]"
						data-testid="case-evidence-set-detail--export-feedback-pdf-success"
						role="status"
					>
						{P111_EXPORT_SUCCESS_PDF}
					</p>
				{:else if p111ExportFeedback === 'docx_err'}
					<p
						class="text-xs text-[color:var(--ce-l-text-secondary)]"
						data-testid="case-evidence-set-detail--export-feedback-error-docx"
						role="alert"
					>
						{P112_EXPORT_FAILED_DOCX}
						{#if p111ExportErrorDetail}
							{' '}
							<span class="break-all">{p111ExportErrorDetail}</span>
						{/if}
					</p>
				{:else if p111ExportFeedback === 'pdf_err'}
					<p
						class="text-xs text-[color:var(--ce-l-text-secondary)]"
						data-testid="case-evidence-set-detail--export-feedback-error-pdf"
						role="alert"
					>
						{P112_EXPORT_FAILED_PDF}
						{#if p111ExportErrorDetail}
							{' '}
							<span class="break-all">{p111ExportErrorDetail}</span>
						{/if}
					</p>
				{/if}
				{#if outputActionFeedback === 'copy_ok'}
					<p
						class="text-xs text-[color:var(--ce-l-text-muted)]"
						data-testid="case-evidence-set-detail--copy-feedback-success"
						role="status"
					>
						{P110_OUTPUT_COPY_SUCCESS}
					</p>
				{:else if outputActionFeedback === 'copy_fail'}
					<p
						class="text-xs text-[color:var(--ce-l-text-secondary)]"
						data-testid="case-evidence-set-detail--copy-feedback-error"
						role="alert"
					>
						{P110_OUTPUT_COPY_FAILED}
					</p>
				{:else if outputActionFeedback === 'download_ok'}
					<p
						class="text-xs text-[color:var(--ce-l-text-muted)]"
						data-testid="case-evidence-set-detail--download-feedback-success"
						role="status"
					>
						{P110_OUTPUT_DOWNLOAD_SUCCESS}
					</p>
				{:else if outputActionFeedback === 'download_fail'}
					<p
						class="text-xs text-[color:var(--ce-l-text-secondary)]"
						data-testid="case-evidence-set-detail--download-feedback-error"
						role="alert"
					>
						{P110_OUTPUT_DOWNLOAD_FAILED}
					</p>
				{/if}
				<div class="flex flex-col gap-4" data-testid="case-evidence-set-detail--preview-body">
					<section class="flex flex-col gap-2" aria-labelledby="p110-preview-timeline-heading">
						<h3 id="p110-preview-timeline-heading" class="text-xs font-semibold text-[color:var(--ce-l-text-primary)]">
							{P110_OUTPUT_PREVIEW_TIMELINE_HEADING}
						</h3>
						{#if composedExpanded.timeline_entries.length === 0}
							<p class="text-sm text-[color:var(--ce-l-text-secondary)]">{P110_OUTPUT_PREVIEW_EMPTY_SECTION}</p>
						{:else}
							<ul class="flex flex-col gap-3 list-none pl-0" data-testid="case-evidence-set-detail--preview-timeline">
								{#each composedExpanded.timeline_entries as row (row.source_id)}
									<li class="flex flex-col gap-1 border-b border-[color:var(--ce-l-border-subtle)] pb-3 last:border-0 last:pb-0">
										<p class="text-xs text-[color:var(--ce-l-text-muted)]">
											{P110_OUTPUT_PREVIEW_TIMELINE_META_LINE(
												formatEvidenceSetSavedAt(row.occurred_at),
												row.type,
												row.source_id,
												row.created_by,
												formatEvidenceSetSavedAt(row.created_at)
											)}
										</p>
										<pre
											class="text-sm text-[color:var(--ce-l-text-primary)] whitespace-pre-wrap break-words font-sans m-0"
											data-testid="case-evidence-set-detail--preview-timeline-text">{row.text_original}</pre>
									</li>
								{/each}
							</ul>
						{/if}
					</section>

					<section class="flex flex-col gap-2" aria-labelledby="p110-preview-files-heading">
						<h3 id="p110-preview-files-heading" class="text-xs font-semibold text-[color:var(--ce-l-text-primary)]">
							{P110_OUTPUT_PREVIEW_FILES_HEADING}
						</h3>
						{#if composedExpanded.files.length === 0}
							<p class="text-sm text-[color:var(--ce-l-text-secondary)]">{P110_OUTPUT_PREVIEW_EMPTY_SECTION}</p>
						{:else}
							<ul class="flex flex-col gap-2 list-none pl-0" data-testid="case-evidence-set-detail--preview-files">
								{#each composedExpanded.files as f (f.source_id)}
									<li class="text-sm text-[color:var(--ce-l-text-primary)]">
										<p class="text-xs text-[color:var(--ce-l-text-muted)]">
											{P110_OUTPUT_PREVIEW_FILE_META_LINE(
												f.original_filename,
												f.source_id,
												f.mime_type ?? '—',
												formatEvidenceSetSavedAt(f.uploaded_at),
												formatEvidenceSetSavedAt(f.created_at)
											)}
										</p>
									</li>
								{/each}
							</ul>
						{/if}
					</section>
				</div>
			{/if}
		</section>

		<p class="text-xs text-[color:var(--ce-l-text-muted)] max-w-prose">{P109_EVIDENCE_SET_DETAIL_IDS_ONLY_NOTE}</p>

		<section class="flex flex-col gap-2" data-testid="case-evidence-set-detail--section-timeline" aria-labelledby="p109-detail-timeline-heading">
			<h2 id="p109-detail-timeline-heading" class="text-sm font-semibold text-[color:var(--ce-l-text-primary)]">
				{P109_EVIDENCE_SET_DETAIL_SECTION_TIMELINE}
			</h2>
			{#if timelineItems.length === 0}
				<p class="text-sm text-[color:var(--ce-l-text-secondary)]">{P109_EVIDENCE_SET_DETAIL_SECTION_EMPTY}</p>
			{:else}
				<ul class="flex flex-col gap-1 list-none pl-0" data-testid="case-evidence-set-detail--list-timeline">
					{#each timelineItems as row (row.id)}
						<li class="text-sm font-mono text-[color:var(--ce-l-text-primary)] break-all">
							{P109_EVIDENCE_SET_DETAIL_TIMELINE_ROW(row.source_id)}
						</li>
					{/each}
				</ul>
			{/if}
		</section>

		<section class="flex flex-col gap-2" data-testid="case-evidence-set-detail--section-files" aria-labelledby="p109-detail-files-heading">
			<h2 id="p109-detail-files-heading" class="text-sm font-semibold text-[color:var(--ce-l-text-primary)]">
				{P109_EVIDENCE_SET_DETAIL_SECTION_FILES}
			</h2>
			{#if fileItems.length === 0}
				<p class="text-sm text-[color:var(--ce-l-text-secondary)]">{P109_EVIDENCE_SET_DETAIL_SECTION_EMPTY}</p>
			{:else}
				<ul class="flex flex-col gap-1 list-none pl-0" data-testid="case-evidence-set-detail--list-files">
					{#each fileItems as row (row.id)}
						<li class="text-sm font-mono text-[color:var(--ce-l-text-primary)] break-all">
							{P109_EVIDENCE_SET_DETAIL_FILE_ROW(row.source_id)}
						</li>
					{/each}
				</ul>
			{/if}
		</section>
	{/if}
</div>
