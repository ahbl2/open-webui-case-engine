<!--
	Right column: mockup-aligned preview — viewer on top, file identity, tabs, primary footer.
-->
<script lang="ts">
	import {
		type CaseFile,
		getCaseFileText,
		getCaseFileTimelineLinks,
		type CaseFileTimelineLinkEntry
	} from '$lib/apis/caseEngine';
	import { DS_BTN_CLASSES, DS_TYPE_CLASSES } from '$lib/case/detectivePrimitiveFoundation';
	import { caseFileExtLabel } from '$lib/components/case/caseFilesExtractSupport';
	import { formatCaseDateTime } from '$lib/utils/formatDateTime';
	import { P125_FILES_LABEL_SIZE, P125_FILES_LABEL_TYPE } from '$lib/caseContext/p125FilesBrowserCopy';
	import {
		P125_FILE_VIEW_PREVIEW_HEADING,
		P125_FILE_VIEW_PREVIEW_IMG_ALT,
		P125_FILE_VIEW_PREVIEW_LOADING,
		P125_FILE_VIEW_PREVIEW_ERROR,
		P125_FILE_VIEW_PREVIEW_UNSUPPORTED
	} from '$lib/caseContext/p125FileViewingCopy';
	import {
		ArrowDownTrayIcon,
		ArrowTopRightOnSquareIcon
	} from 'heroicons-svelte/24/outline';

	export let caseId: string;
	export let token: string;
	export let file: CaseFile | null = null;
	export let previewPhase: 'off' | 'loading' | 'ready' | 'unsupported' | 'error' = 'off';
	export let previewObjectUrl: string | null = null;
	/** Sanitized DOCX HTML (scrollable); mutually exclusive with raster `previewObjectUrl` for DOCX. */
	export let previewHtml: string | null = null;
	export let previewKind: 'none' | 'image' | 'pdf' | 'docx' = 'none';
	export let formatSize: (bytes: unknown) => string;
	export let onClose: () => void;
	export let onDownload: () => void;
	export let onOpenFullView: () => void;
	export let onOpenInNewTab: (() => void) | undefined = undefined;

	let previewTab: 'details' | 'content' | 'activity' | 'links' | 'ai' = 'details';

	let pdfZoom = 1;

	let linkEntries: CaseFileTimelineLinkEntry[] = [];
	let linksLoading = false;
	let linksError = '';
	let linksPrefetchFor: string | null = null;

	let contentText: string | null = null;
	let contentLoading = false;
	let contentError = '';

	let detailWordCount: number | null = null;
	let detailWordLoading = false;

	let lastPreviewFileId: string | null = null;
	$: if (file?.id !== lastPreviewFileId) {
		lastPreviewFileId = file?.id ?? null;
		if (file) {
			previewTab = 'details';
			pdfZoom = 1;
			linkEntries = [];
			linksError = '';
			linksPrefetchFor = null;
			contentText = null;
			contentError = '';
			detailWordCount = null;
			void prefetchTimelineLinksForFile();
			void loadDetailWordCount();
		}
	}

	const tabBtn =
		'rounded-md px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wide transition';

	function bumpPdfZoom(delta: number): void {
		pdfZoom = Math.min(2.25, Math.max(0.5, Math.round((pdfZoom + delta) * 100) / 100));
	}

	function extractionStatus(f: CaseFile): string | undefined {
		const v = (f as { extraction_status?: string }).extraction_status;
		return typeof v === 'string' ? v : undefined;
	}

	async function prefetchTimelineLinksForFile(): Promise<void> {
		if (!file || !caseId || !token) return;
		try {
			const r = await getCaseFileTimelineLinks(caseId, file.id, token);
			linkEntries = r.entries;
			linksError = '';
			linksPrefetchFor = file.id;
		} catch (e: unknown) {
			linkEntries = [];
			linksError = e instanceof Error ? e.message : 'Failed to load links';
		}
	}

	async function loadTimelineLinks(): Promise<void> {
		if (!file || !caseId || !token) return;
		linksLoading = true;
		linksError = '';
		try {
			const r = await getCaseFileTimelineLinks(caseId, file.id, token);
			linkEntries = r.entries;
			linksPrefetchFor = file.id;
		} catch (e: unknown) {
			linkEntries = [];
			linksError = e instanceof Error ? e.message : 'Failed to load links';
		} finally {
			linksLoading = false;
		}
	}

	async function loadExtractedSnippet(): Promise<void> {
		if (!file || !token) return;
		contentLoading = true;
		contentError = '';
		contentText = null;
		try {
			const r = await getCaseFileText(file.id, token);
			const t = r.extracted_text ?? '';
			contentText = t.length > 6000 ? `${t.slice(0, 6000)}…` : t;
		} catch (e: unknown) {
			contentText = null;
			contentError = e instanceof Error ? e.message : 'Could not load text';
		} finally {
			contentLoading = false;
		}
	}

	async function loadDetailWordCount(): Promise<void> {
		if (!file || !token) return;
		const ex = extractionStatus(file);
		if (ex !== 'extracted') {
			detailWordCount = null;
			return;
		}
		detailWordLoading = true;
		try {
			const r = await getCaseFileText(file.id, token);
			const t = (r.extracted_text ?? '').trim();
			detailWordCount = t ? t.split(/\s+/).filter(Boolean).length : 0;
		} catch {
			detailWordCount = null;
		} finally {
			detailWordLoading = false;
		}
	}

	function setPreviewTab(t: typeof previewTab): void {
		previewTab = t;
		if (t === 'links' && linksPrefetchFor !== file?.id) void loadTimelineLinks();
		if (t === 'content') void loadExtractedSnippet();
	}

	$: linksTabLabel =
		linkEntries.length > 0 ? `Links (${linkEntries.length})` : 'Links';

	$: canOpenPreviewInTab =
		previewPhase === 'ready' &&
		(Boolean(previewObjectUrl) || (previewKind === 'docx' && Boolean(previewHtml?.length)));
</script>

{#if file}
	<aside
		class="hidden min-h-0 w-[min(100%,36rem)] shrink-0 flex-col border-l border-[color:var(--ce-l-border-default)] bg-[color:var(--ce-l-surface-raised)] lg:flex"
		data-testid="case-files-preview-pane"
		aria-label="File preview"
	>
		<div
			class="flex shrink-0 items-center justify-between gap-2 border-b border-[color:var(--ce-l-border-subtle)] px-3 py-2.5"
		>
			<p
				class="m-0 text-[10px] font-bold uppercase tracking-[0.14em] text-[color:var(--ce-l-text-muted)]"
			>
				Preview
			</p>
			<div class="flex items-center gap-0.5">
				<button
					type="button"
					class="{DS_BTN_CLASSES.secondary} inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium"
					data-testid="case-files-preview-open-full"
					on:click={onOpenFullView}
				>
					<ArrowTopRightOnSquareIcon class="h-4 w-4 shrink-0 opacity-90" aria-hidden="true" />
					Open full view
				</button>
				<button
					type="button"
					class="{DS_BTN_CLASSES.ghost} min-h-0 rounded p-1.5"
					aria-label="Close preview"
					data-testid="case-files-preview-close"
					on:click={onClose}
				>
					<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="size-5">
						<path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
					</svg>
				</button>
			</div>
		</div>

		<div class="flex min-h-0 flex-1 flex-col overflow-hidden">
			<div class="min-h-0 flex-1 overflow-y-auto px-3 pt-2">
				<!-- Document / image viewer (mockup: top stack) -->
				<section class="overflow-hidden rounded-lg border border-[color:var(--ce-l-border-strong)] bg-[color:var(--ce-l-surface-elevated)] shadow-inner" data-testid="case-files-preview-visual">
					{#if previewPhase === 'loading'}
						<div class="flex min-h-[12rem] items-center justify-center px-3 py-8">
							<p class="m-0 text-xs {DS_TYPE_CLASSES.meta}">{P125_FILE_VIEW_PREVIEW_LOADING}</p>
						</div>
					{:else if previewPhase === 'ready' && (previewObjectUrl || (previewKind === 'docx' && previewHtml))}
						{#if previewKind === 'docx' && previewHtml}
							<div
								class="max-h-[min(55vh,28rem)] min-h-[12rem] overflow-y-auto bg-[color:var(--ce-l-surface-elevated)] px-3 py-3 text-left text-[13px] leading-relaxed text-[color:var(--ce-l-text-primary)] [overflow-wrap:anywhere] [&_img]:max-h-48 [&_img]:max-w-full [&_img]:object-contain [&_p]:my-2 [&_p:first-child]:mt-0 [&_h1]:mb-2 [&_h1]:text-base [&_h1]:font-semibold [&_h2]:mb-2 [&_h2]:text-sm [&_h2]:font-semibold [&_ul]:my-2 [&_ol]:my-2 [&_li]:my-0.5 [&_table]:w-full [&_table]:text-xs [&_table]:border-collapse [&_td]:border [&_td]:border-[color:var(--ce-l-border-subtle)] [&_td]:p-1.5 [&_a]:text-sky-600 [&_a]:underline dark:[&_a]:text-sky-400"
								data-testid="case-files-preview-docx-html"
							>
								{@html previewHtml}
							</div>
						{:else if previewKind === 'image' && previewObjectUrl}
							<img
								src={previewObjectUrl}
								alt={P125_FILE_VIEW_PREVIEW_IMG_ALT}
								class="max-h-[min(55vh,22rem)] w-full object-contain"
							/>
						{:else if previewKind === 'pdf' && previewObjectUrl}
							<div class="max-h-[min(55vh,24rem)] overflow-auto bg-[color:var(--ce-l-surface-elevated)]">
								<div
									style="transform: scale({pdfZoom}); transform-origin: top left; width: {100 / pdfZoom}%;"
								>
									<iframe
										title={P125_FILE_VIEW_PREVIEW_HEADING}
										class="h-[min(50vh,22rem)] w-full min-h-[14rem] border-0"
										src={previewObjectUrl}
									></iframe>
								</div>
							</div>
						{/if}
					{:else if previewPhase === 'error'}
						<div class="flex min-h-[10rem] items-center px-3 py-6">
							<p class="m-0 text-xs {DS_TYPE_CLASSES.meta}">{P125_FILE_VIEW_PREVIEW_ERROR}</p>
						</div>
					{:else}
						<div class="flex min-h-[10rem] flex-col items-center justify-center gap-2 px-3 py-8 text-center">
							<p class="m-0 text-xs {DS_TYPE_CLASSES.meta}">{P125_FILE_VIEW_PREVIEW_UNSUPPORTED}</p>
						</div>
					{/if}
				</section>

				<!-- Viewer toolbar (mockup: pagination + zoom + actions) -->
				<div
					class="mt-2 flex flex-wrap items-center justify-between gap-2 border-b border-[color:var(--ce-l-border-subtle)] pb-2"
				>
					<div class="flex items-center gap-1 text-[10px] font-medium text-[color:var(--ce-l-text-muted)]">
						<button type="button" class="{DS_BTN_CLASSES.ghost} min-h-0 px-1 py-0.5 opacity-40" disabled aria-hidden="true"
							>‹</button
						>
						<span class="tabular-nums">View</span>
						<button type="button" class="{DS_BTN_CLASSES.ghost} min-h-0 px-1 py-0.5 opacity-40" disabled aria-hidden="true"
							>›</button
						>
					</div>
					<div class="flex flex-wrap items-center gap-1">
						{#if previewKind === 'pdf' && previewPhase === 'ready' && previewObjectUrl}
							<button
								type="button"
								class="{DS_BTN_CLASSES.ghost} min-h-0 px-1.5 py-0.5 text-xs"
								aria-label="Zoom out"
								on:click={() => bumpPdfZoom(-0.15)}
							>
								−
							</button>
							<span class="min-w-[3rem] text-center text-[10px] tabular-nums text-[color:var(--ce-l-text-muted)]"
								>{Math.round(pdfZoom * 100)}%</span
							>
							<button
								type="button"
								class="{DS_BTN_CLASSES.ghost} min-h-0 px-1.5 py-0.5 text-xs"
								aria-label="Zoom in"
								on:click={() => bumpPdfZoom(0.15)}
							>
								+
							</button>
						{/if}
						<button
							type="button"
							class="{DS_BTN_CLASSES.ghost} min-h-0 rounded p-1"
							title="Download"
							data-testid="case-files-preview-download-icon"
							on:click={onDownload}
						>
							<ArrowDownTrayIcon class="h-5 w-5 text-[color:var(--ce-l-text-muted)]" aria-hidden="true" />
						</button>
					</div>
				</div>

				<!-- File identity (mockup: title block under viewer) -->
				<div class="mt-3 border-b border-[color:var(--ce-l-border-subtle)] pb-3">
					<p class="m-0 break-words text-sm font-semibold leading-snug text-[color:var(--ce-l-text-primary)]" title={file.original_filename}>
						{file.original_filename}
					</p>
					<p class="m-0 mt-1 text-xs text-[color:var(--ce-l-text-muted)]">
						{formatSize(file.file_size_bytes)} · {caseFileExtLabel(file.original_filename, file.mime_type)}
					</p>
					<p class="m-0 mt-1.5 text-[11px] leading-snug text-[color:var(--ce-l-text-muted)]">
						Uploaded {formatCaseDateTime(String(file.uploaded_at ?? ''))}
						{#if file.uploaded_by}
							<span class="text-[color:var(--ce-l-text-muted)]"> · By {file.uploaded_by}</span>
						{/if}
					</p>
				</div>

				<div
					class="sticky top-0 z-10 -mx-1 flex flex-wrap gap-1 border-b border-[color:var(--ce-l-border-subtle)] bg-[color:var(--ce-l-surface-raised)] px-1 py-2"
					role="tablist"
					aria-label="Preview sections"
				>
					<button
						type="button"
						role="tab"
						aria-selected={previewTab === 'details'}
						class="{tabBtn} {previewTab === 'details'
							? 'bg-[color:var(--ce-l-surface-elevated)] text-[color:var(--ce-l-text-primary)] shadow-sm'
							: 'text-[color:var(--ce-l-text-muted)] hover:bg-black/[0.04] dark:hover:bg-white/[0.06]'}"
						on:click={() => setPreviewTab('details')}
					>
						Details
					</button>
					<button
						type="button"
						role="tab"
						aria-selected={previewTab === 'content'}
						class="{tabBtn} {previewTab === 'content'
							? 'bg-[color:var(--ce-l-surface-elevated)] text-[color:var(--ce-l-text-primary)] shadow-sm'
							: 'text-[color:var(--ce-l-text-muted)] hover:bg-black/[0.04] dark:hover:bg-white/[0.06]'}"
						on:click={() => setPreviewTab('content')}
					>
						Content
					</button>
					<button
						type="button"
						role="tab"
						aria-selected={previewTab === 'activity'}
						class="{tabBtn} {previewTab === 'activity'
							? 'bg-[color:var(--ce-l-surface-elevated)] text-[color:var(--ce-l-text-primary)] shadow-sm'
							: 'text-[color:var(--ce-l-text-muted)] hover:bg-black/[0.04] dark:hover:bg-white/[0.06]'}"
						on:click={() => setPreviewTab('activity')}
					>
						Activity
					</button>
					<button
						type="button"
						role="tab"
						aria-selected={previewTab === 'links'}
						class="{tabBtn} {previewTab === 'links'
							? 'bg-[color:var(--ce-l-surface-elevated)] text-[color:var(--ce-l-text-primary)] shadow-sm'
							: 'text-[color:var(--ce-l-text-muted)] hover:bg-black/[0.04] dark:hover:bg-white/[0.06]'}"
						on:click={() => setPreviewTab('links')}
					>
						{linksTabLabel}
					</button>
					<button
						type="button"
						role="tab"
						aria-selected={previewTab === 'ai'}
						class="{tabBtn} {previewTab === 'ai'
							? 'bg-[color:var(--ce-l-surface-elevated)] text-[color:var(--ce-l-text-primary)] shadow-sm'
							: 'text-[color:var(--ce-l-text-muted)] hover:bg-black/[0.04] dark:hover:bg-white/[0.06]'}"
						on:click={() => setPreviewTab('ai')}
					>
						AI notes
					</button>
				</div>

				<div class="pb-4 pt-3">
					{#if previewTab === 'details'}
						<dl
							class="m-0 grid grid-cols-[5.5rem_1fr] gap-x-2 gap-y-2 text-xs {DS_TYPE_CLASSES.meta}"
						>
							<dt class="text-[color:var(--ce-l-text-muted)]">{P125_FILES_LABEL_TYPE}</dt>
							<dd class="m-0 {DS_TYPE_CLASSES.mono}">{caseFileExtLabel(file.original_filename, file.mime_type)}</dd>
							<dt class="text-[color:var(--ce-l-text-muted)]">{P125_FILES_LABEL_SIZE}</dt>
							<dd class="m-0 {DS_TYPE_CLASSES.mono}">{formatSize(file.file_size_bytes)}</dd>
							<dt class="text-[color:var(--ce-l-text-muted)]">Pages</dt>
							<dd class="m-0 {DS_TYPE_CLASSES.mono}">
								{#if typeof file.pdf_page_count === 'number' && file.pdf_page_count > 0}
									{file.pdf_page_count}
								{:else}
									—
								{/if}
							</dd>
						</dl>

						{#if (file.tags ?? []).length > 0}
							<div class="mt-4">
								<p class="m-0 text-[10px] font-semibold uppercase tracking-wide text-[color:var(--ce-l-text-muted)]">Tags</p>
								<div class="mt-1.5 flex flex-wrap gap-1.5">
									{#each file.tags ?? [] as tag (tag)}
										<span
											class="inline-flex rounded-full border border-[color:var(--ce-l-border-subtle)] bg-[color:var(--ce-l-surface-elevated)] px-2 py-0.5 text-[11px] text-[color:var(--ce-l-text-primary)]"
										>
											{tag}
										</span>
									{/each}
								</div>
							</div>
						{/if}

						<div class="mt-4 space-y-2 rounded-md border border-[color:var(--ce-l-border-subtle)] bg-[color:var(--ce-l-surface-elevated)]/80 px-2.5 py-2 text-xs">
							<p class="m-0 font-medium text-[color:var(--ce-l-text-primary)]">Analysis</p>
							<p class="m-0 text-[color:var(--ce-l-text-muted)]">
								<span class="text-[color:var(--ce-l-text-secondary)]">Extracted text:</span>
								{#if detailWordLoading}
									…
								{:else if extractionStatus(file) === 'extracted' && detailWordCount !== null}
									Yes · {detailWordCount.toLocaleString()} words
								{:else if extractionStatus(file) === 'extracted'}
									Yes
								{:else}
									No
								{/if}
							</p>
							<p class="m-0 text-[color:var(--ce-l-text-muted)]">
								<span class="text-[color:var(--ce-l-text-secondary)]">Linked to Timeline:</span>
								{#if linksError}
									<span class="text-amber-800 dark:text-amber-200">{linksError}</span>
								{:else if linkEntries.length === 0}
									None yet
								{:else}
									{linkEntries.length} timeline entr{linkEntries.length === 1 ? 'y' : 'ies'}
								{/if}
							</p>
						</div>

						<div class="mt-4 flex flex-wrap items-center justify-between gap-2">
							<div class="flex items-center gap-2 text-xs">
								<span
									class="inline-flex h-2 w-2 rounded-full {extractionStatus(file) === 'extracted'
										? 'bg-emerald-500'
										: 'bg-amber-500'}"
									aria-hidden="true"
								></span>
								<span class="text-[color:var(--ce-l-text-primary)]">
									{extractionStatus(file) === 'extracted' ? 'Indexed' : 'Not indexed'}
								</span>
							</div>
							<button type="button" class="{DS_BTN_CLASSES.secondary} px-2 py-1 text-[11px]" disabled>
								Reprocess
							</button>
						</div>
					{:else if previewTab === 'content'}
						{#if contentLoading}
							<p class="m-0 text-xs {DS_TYPE_CLASSES.meta}">Loading extracted text…</p>
						{:else if contentError}
							<p class="m-0 text-xs text-amber-800 dark:text-amber-200">{contentError}</p>
							<p class="m-0 mt-2 text-xs text-[color:var(--ce-l-text-muted)]">
								Extract text from the file list if needed, then open full view for the complete document.
							</p>
						{:else if contentText !== null && contentText.length > 0}
							<pre
								class="m-0 max-h-64 overflow-y-auto whitespace-pre-wrap break-words rounded border border-[color:var(--ce-l-border-subtle)] bg-[color:var(--ce-l-surface-elevated)] p-2 text-[11px] leading-snug text-[color:var(--ce-l-text-primary)]"
							>{contentText}</pre>
							<p class="m-0 mt-2 text-[10px] text-[color:var(--ce-l-text-muted)]">
								Truncated preview — full text in “Open full view”.
							</p>
						{:else}
							<p class="m-0 text-xs text-[color:var(--ce-l-text-muted)]">No extracted text yet for this file.</p>
						{/if}
						<button
							type="button"
							class="{DS_BTN_CLASSES.secondary} mt-3 w-full text-sm"
							data-testid="case-files-preview-content-open-full"
							on:click={onOpenFullView}
						>
							Open full view
						</button>
					{:else if previewTab === 'activity'}
						<p class="m-0 text-xs text-[color:var(--ce-l-text-muted)]">
							No per-file activity log is shown here yet. Use the case Timeline for official entries.
						</p>
					{:else if previewTab === 'links'}
						{#if linksLoading}
							<p class="m-0 text-xs {DS_TYPE_CLASSES.meta}">Loading timeline links…</p>
						{:else if linksError}
							<p class="m-0 text-xs text-amber-800 dark:text-amber-200">{linksError}</p>
						{:else if linkEntries.length === 0}
							<p class="m-0 text-xs text-[color:var(--ce-l-text-muted)]">
								This file is not attached to any Timeline entry yet (image attachments only).
							</p>
						{:else}
							<ul class="m-0 list-none space-y-2 p-0">
								{#each linkEntries as e (e.entry_id)}
									<li class="rounded-md border border-[color:var(--ce-l-border-subtle)] bg-[color:var(--ce-l-surface-elevated)] p-2">
										<div class="flex flex-wrap items-center justify-between gap-1">
											<span class="text-[10px] font-semibold uppercase text-[color:var(--ce-l-text-muted)]">{e.type}</span>
											<time class="text-[10px] text-[color:var(--ce-l-text-muted)]" datetime={e.occurred_at}>
												{formatCaseDateTime(e.occurred_at)}
											</time>
										</div>
										{#if e.text_preview}
											<p class="m-0 mt-1 line-clamp-3 text-xs text-[color:var(--ce-l-text-primary)]">{e.text_preview}</p>
										{/if}
										<a
											class="mt-2 inline-block text-xs font-semibold text-blue-600 underline dark:text-blue-400"
											href={`/case/${caseId}/timeline?focusEntry=${encodeURIComponent(e.entry_id)}`}
											data-testid="case-files-preview-timeline-link"
										>
											View on Timeline
										</a>
									</li>
								{/each}
							</ul>
						{/if}
					{:else}
						<p class="m-0 text-xs text-[color:var(--ce-l-text-muted)]">
							AI-generated notes for this attachment are not stored in this preview yet.
						</p>
					{/if}
				</div>
			</div>

			<div class="shrink-0 border-t border-[color:var(--ce-l-border-subtle)] bg-[color:var(--ce-l-surface-raised)] p-3">
				<button
					type="button"
					class="{DS_BTN_CLASSES.primary} flex w-full items-center justify-center gap-2 py-2.5 text-sm font-semibold"
					disabled={!canOpenPreviewInTab}
					data-testid="case-files-preview-open-new-tab"
					title={!canOpenPreviewInTab ? 'Generate a preview first' : 'Open preview in a new browser tab'}
					on:click={() => onOpenInNewTab?.()}
				>
					<ArrowTopRightOnSquareIcon class="h-4 w-4 shrink-0" aria-hidden="true" />
					Open in new tab
				</button>
			</div>
		</div>
	</aside>
{/if}
