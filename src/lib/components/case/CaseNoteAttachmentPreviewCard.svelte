<script lang="ts">
	import { browser } from '$app/environment';
	import { onDestroy } from 'svelte';
	import { fetchNoteAttachmentBlob, type NoteAttachment } from '$lib/apis/caseEngine';
	import {
		DocumentIcon,
		DocumentTextIcon,
		FilmIcon,
		MusicalNoteIcon,
		PhotoIcon,
		TableCellsIcon
	} from 'heroicons-svelte/24/outline';
	import { PlayCircleIcon } from 'heroicons-svelte/24/solid';

	export let attachment: NoteAttachment;
	export let caseId: string;
	export let token: string;
	export let statusLabel = 'Ready';
	export let statusClass = 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400';
	export let formatBytes: (bytes: number) => string;
	export let formatDateTime: (value: string) => string;
	export let onDownload: () => void;

	let root: HTMLDivElement | undefined;
	let objectUrl: string | null = null;
	let phase: 'idle' | 'loading' | 'ready' | 'error' = 'idle';
	let observer: IntersectionObserver | undefined;
	let observerTargetKey = '';

	$: mime = attachment.mime_type ?? '';
	$: filename = attachment.original_filename;
	$: extension = filename.split('.').pop()?.toLowerCase() ?? '';
	$: thumbKind = classifyAttachmentPreview(mime, extension);
	$: rasterPreviewReady = phase === 'ready' && objectUrl != null;

	function classifyAttachmentPreview(
		mimeType: string,
		ext: string
	): 'image' | 'video' | 'audio' | 'pdf' | 'sheet' | 'doc' | 'other' {
		if (mimeType.startsWith('image/')) return 'image';
		if (mimeType.startsWith('video/')) return 'video';
		if (mimeType.startsWith('audio/')) return 'audio';
		if (mimeType === 'application/pdf' || ext === 'pdf') return 'pdf';
		if (mimeType.includes('spreadsheet') || mimeType.includes('excel') || ['xls', 'xlsx', 'csv'].includes(ext)) {
			return 'sheet';
		}
		if (mimeType.includes('word') || mimeType.includes('document') || ['doc', 'docx', 'rtf', 'txt', 'md'].includes(ext)) {
			return 'doc';
		}
		return 'other';
	}

	function canRasterize(kind: typeof thumbKind): boolean {
		return kind === 'image' || kind === 'video' || kind === 'pdf' || kind === 'doc' || kind === 'sheet';
	}

	function revokePreview(): void {
		if (objectUrl) URL.revokeObjectURL(objectUrl);
		objectUrl = null;
		phase = 'idle';
	}

	function stopObserving(): void {
		observer?.disconnect();
		observer = undefined;
	}

	async function loadPreview(): Promise<void> {
		if (!browser || !canRasterize(thumbKind) || !token) return;
		const key = `${attachment.id}:${thumbKind}`;
		phase = 'loading';
		try {
			const blob = await fetchNoteAttachmentBlob(caseId, attachment.id, token);
			if (key !== `${attachment.id}:${thumbKind}`) return;
			if (thumbKind === 'image') {
				const { blobToGridThumbObjectUrl } = await import('./caseFileImageThumb');
				objectUrl = await blobToGridThumbObjectUrl(blob);
				phase = 'ready';
				return;
			}
			const { snapPdfFirstPageToObjectUrl, snapVideoFrameToObjectUrl } = await import('./caseFileGridSnapshot');
			if (thumbKind === 'video') {
				const blobUrl = URL.createObjectURL(blob);
				objectUrl = await snapVideoFrameToObjectUrl(blobUrl);
				phase = 'ready';
				return;
			}
			if (thumbKind === 'pdf') {
				objectUrl = await snapPdfFirstPageToObjectUrl(await blob.arrayBuffer());
				phase = 'ready';
				return;
			}
			if (thumbKind === 'doc') {
				const { snapDocxToPreviewUrl } = await import('./caseFileOfficeSnapshot');
				objectUrl = await snapDocxToPreviewUrl(await blob.arrayBuffer());
				phase = 'ready';
				return;
			}
			if (thumbKind === 'sheet') {
				const { snapSpreadsheetToPreviewUrl } = await import('./caseFileOfficeSnapshot');
				objectUrl = await snapSpreadsheetToPreviewUrl(await blob.arrayBuffer());
				phase = 'ready';
			}
		} catch {
			phase = 'error';
		}
	}

	$: if (browser && root && canRasterize(thumbKind) && token) {
		const key = `${attachment.id}:${thumbKind}`;
		if (observerTargetKey !== key) {
			stopObserving();
			revokePreview();
			observerTargetKey = key;
			observer = new IntersectionObserver(
				(entries) => {
					if (!entries.some((entry) => entry.isIntersecting)) return;
					stopObserving();
					void loadPreview();
				},
				{ rootMargin: '260px 0px' }
			);
			observer.observe(root);
		}
	}

	onDestroy(() => {
		stopObserving();
		revokePreview();
	});
</script>

<article
	class="overflow-hidden rounded-xl border border-cyan-500/20 bg-[color:var(--ce-l-surface-raised)] shadow-sm"
	data-testid="case-note-attachment-preview-card"
>
	<div
		bind:this={root}
		class="relative flex h-36 items-center justify-center overflow-hidden border-b border-white/5 bg-gradient-to-br from-slate-800/90 via-slate-950 to-black"
	>
		{#if rasterPreviewReady}
			<img src={objectUrl!} alt="" class="h-full w-full object-cover object-top" decoding="async" draggable="false" />
			{#if thumbKind === 'video'}
				<div class="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/20" aria-hidden="true">
					<div class="rounded-full bg-black/55 p-2 shadow-lg">
						<PlayCircleIcon class="h-9 w-9 text-white" />
					</div>
				</div>
			{/if}
		{:else if thumbKind === 'image' && phase === 'loading'}
			<div class="h-8 w-8 animate-pulse rounded-full bg-white/10" aria-hidden="true"></div>
		{:else if thumbKind === 'video'}
			<FilmIcon class="h-12 w-12 text-sky-300/80" aria-hidden="true" />
		{:else if thumbKind === 'audio'}
			<MusicalNoteIcon class="h-12 w-12 text-violet-300/80" aria-hidden="true" />
		{:else if thumbKind === 'pdf'}
			<DocumentTextIcon class="h-12 w-12 text-rose-300/85" aria-hidden="true" />
		{:else if thumbKind === 'sheet'}
			<TableCellsIcon class="h-12 w-12 text-amber-300/85" aria-hidden="true" />
		{:else if thumbKind === 'doc'}
			<DocumentTextIcon class="h-12 w-12 text-blue-300/85" aria-hidden="true" />
		{:else if thumbKind === 'image'}
			<PhotoIcon class="h-12 w-12 text-white/50" aria-hidden="true" />
		{:else}
			<DocumentIcon class="h-12 w-12 text-slate-400/90" aria-hidden="true" />
		{/if}
	</div>

	<div class="p-3">
		<div class="flex items-start justify-between gap-2">
			<div class="min-w-0">
				<p class="m-0 truncate text-xs font-semibold text-[color:var(--ce-l-text-primary)]" title={filename}>{filename}</p>
				<p class="m-0 mt-1 text-[10px] text-[color:var(--ce-l-text-muted)]">
					{formatBytes(attachment.file_size_bytes)} · {formatDateTime(attachment.created_at)}
				</p>
			</div>
			<span class="shrink-0 rounded-md px-2 py-0.5 text-[10px] font-medium {statusClass}">{statusLabel}</span>
		</div>
		<div class="mt-3 flex items-center justify-end">
			<button
				type="button"
				class="rounded-md bg-cyan-950/35 px-2.5 py-1 text-[11px] font-medium text-cyan-100 hover:bg-cyan-900/45"
				title="Download {filename}"
				aria-label="Download {filename}"
				on:click={onDownload}
			>
				Download
			</button>
		</div>
	</div>
</article>
