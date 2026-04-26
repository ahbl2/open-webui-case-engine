<!--
	Lazy snapshots for Files grid: images, video frame, PDF (top of p1), DOCX / spreadsheets (rendered preview).
	Thumb area is fixed height so grid cards stay a consistent size.
-->
<script lang="ts">
	import { browser } from '$app/environment';
	import { onDestroy } from 'svelte';
	import { fetchCaseFileBlob, fetchCaseFileGridPreviewBlob } from '$lib/apis/caseEngine';
	import {
		DocumentIcon,
		DocumentTextIcon,
		FilmIcon,
		MusicalNoteIcon,
		PhotoIcon,
		TableCellsIcon
	} from 'heroicons-svelte/24/outline';
	import { PlayCircleIcon } from 'heroicons-svelte/24/solid';

	export let fileId: string;
	export let token: string;
	export let thumbKind: 'image' | 'video' | 'audio' | 'pdf' | 'sheet' | 'doc' | 'other';
	export let fetchEnabled: boolean;
	/** When the API stores duration (future), show immediately without probing the blob. */
	export let durationMsHint: number | null = null;

	let root: HTMLDivElement | undefined;
	let objectUrl: string | null = null;
	let phase: 'idle' | 'loading' | 'ready' | 'error' = 'idle';
	let observer: IntersectionObserver | undefined;
	/** Key (`fileId:thumbKind`) we attached IO for — kept after IO disconnects so we don’t revoke mid-load. */
	let observerTargetKey: string | null = null;

	function stopObservingOnly(): void {
		observer?.disconnect();
		observer = undefined;
	}
	function formatVideoDuration(sec: number): string {
		if (!Number.isFinite(sec) || sec < 0) return '';
		const s = Math.floor(sec % 60);
		const m = Math.floor(sec / 60) % 60;
		const h = Math.floor(sec / 3600);
		if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
		return `${m}:${String(s).padStart(2, '0')}`;
	}

	$: hintSec =
		durationMsHint != null && durationMsHint > 0 ? durationMsHint / 1000 : null;
	$: durationLabel = hintSec != null ? formatVideoDuration(hintSec) : '';

	function revoke(): void {
		if (objectUrl) {
			URL.revokeObjectURL(objectUrl);
			objectUrl = null;
		}
		phase = 'idle';
	}

	function teardownThumb(): void {
		stopObservingOnly();
		observerTargetKey = null;
	}

	function isSnapshotKind(k: typeof thumbKind): boolean {
		return k === 'image' || k === 'video' || k === 'pdf' || k === 'doc' || k === 'sheet';
	}

	/**
	 * Must be a `$:` store — if this logic lives in a plain function used from `{#if fn()}`,
	 * Svelte won’t subscribe to `phase` / `objectUrl`, so images never appear after load.
	 */
	$: rasterPreviewReady =
		isSnapshotKind(thumbKind) && phase === 'ready' && objectUrl != null && objectUrl.length > 0;

	async function loadSnapshot(): Promise<void> {
		if (!browser || !isSnapshotKind(thumbKind) || !fetchEnabled) return;
		const id = fileId;
		phase = 'loading';
		try {
			if (thumbKind === 'image') {
				const preview = await fetchCaseFileGridPreviewBlob(id, token, { fetchPriority: 'high' });
				if (id !== fileId) return;
				if (preview) {
					objectUrl = URL.createObjectURL(preview);
					phase = 'ready';
					return;
				}
				const blob = await fetchCaseFileBlob(id, token, { fetchPriority: 'high' });
				if (id !== fileId) return;
				const { blobToGridThumbObjectUrl } = await import('./caseFileImageThumb');
				const url = await blobToGridThumbObjectUrl(blob);
				if (id !== fileId) {
					URL.revokeObjectURL(url);
					return;
				}
				objectUrl = url;
				phase = 'ready';
				return;
			}
			const { snapPdfFirstPageToObjectUrl, snapVideoFrameToObjectUrl } = await import(
				'./caseFileGridSnapshot'
			);
			if (thumbKind === 'video') {
				const blob = await fetchCaseFileBlob(id, token);
				if (id !== fileId) return;
				const blobUrl = URL.createObjectURL(blob);
				const snap = await snapVideoFrameToObjectUrl(blobUrl);
				if (id !== fileId) {
					URL.revokeObjectURL(snap);
					return;
				}
				objectUrl = snap;
				phase = 'ready';
				return;
			}
			if (thumbKind === 'pdf') {
				const preview = await fetchCaseFileGridPreviewBlob(id, token, { fetchPriority: 'high' });
				if (id !== fileId) return;
				if (preview) {
					objectUrl = URL.createObjectURL(preview);
					phase = 'ready';
					return;
				}
				const blob = await fetchCaseFileBlob(id, token);
				if (id !== fileId) return;
				const ab = await blob.arrayBuffer();
				const snap = await snapPdfFirstPageToObjectUrl(ab);
				if (id !== fileId) {
					URL.revokeObjectURL(snap);
					return;
				}
				objectUrl = snap;
				phase = 'ready';
				return;
			}
			if (thumbKind === 'doc') {
				const preview = await fetchCaseFileGridPreviewBlob(id, token, { fetchPriority: 'high' });
				if (id !== fileId) return;
				if (preview) {
					objectUrl = URL.createObjectURL(preview);
					phase = 'ready';
					return;
				}
				const { snapDocxToPreviewUrl } = await import('./caseFileOfficeSnapshot');
				const blob = await fetchCaseFileBlob(id, token);
				if (id !== fileId) return;
				const ab = await blob.arrayBuffer();
				const snap = await snapDocxToPreviewUrl(ab);
				if (id !== fileId) {
					URL.revokeObjectURL(snap);
					return;
				}
				objectUrl = snap;
				phase = 'ready';
				return;
			}
			if (thumbKind === 'sheet') {
				const { snapSpreadsheetToPreviewUrl } = await import('./caseFileOfficeSnapshot');
				const blob = await fetchCaseFileBlob(id, token);
				if (id !== fileId) return;
				const ab = await blob.arrayBuffer();
				const snap = await snapSpreadsheetToPreviewUrl(ab);
				if (id !== fileId) {
					URL.revokeObjectURL(snap);
					return;
				}
				objectUrl = snap;
				phase = 'ready';
			}
		} catch {
			if (id === fileId) phase = 'error';
		}
	}

	$: if (!fetchEnabled || !isSnapshotKind(thumbKind)) {
		teardownThumb();
		revoke();
	}

	$: if (browser && fetchEnabled && isSnapshotKind(thumbKind) && root) {
		const key = `${fileId}:${thumbKind}`;
		// Still have an active observer for this card — nothing to do.
		// IO already fired: load running or finished — do not revoke / re-attach (prevents PNG flash loop).
		// (Svelte reactive blocks are not functions — use if/else, not `return`.)
		if (observerTargetKey === key && observer) {
			/* no-op */
		} else if (observerTargetKey === key && !observer && phase !== 'idle') {
			/* no-op */
		} else {
			if (observerTargetKey !== key) {
				stopObservingOnly();
				revoke();
				observerTargetKey = key;
			}

			if (!observer) {
				observer = new IntersectionObserver(
					(entries) => {
						if (!entries.some((e) => e.isIntersecting)) return;
						// Only stop listening; keep observerTargetKey so reactive block doesn’t revoke blob URL.
						stopObservingOnly();
						void loadSnapshot();
					},
					/* Prefetch well before cards enter view so thumbs often decode by scroll time */
				{ rootMargin: '380px 0px 280px 0px' }
				);
				observer.observe(root);
			}
		}
	}

	onDestroy(() => {
		teardownThumb();
		revoke();
	});
</script>

<div
	bind:this={root}
	class="relative h-[10.5rem] w-full shrink-0 overflow-hidden rounded-lg border border-white/5 bg-gradient-to-br from-slate-800/90 via-slate-900/95 to-slate-950 dark:from-slate-900/90 dark:via-slate-950 dark:to-black/80"
	data-testid="case-file-grid-thumb"
>
	{#if rasterPreviewReady}
		<img
			src={objectUrl!}
			alt=""
			class="h-full w-full object-cover object-top"
			decoding="async"
			fetchpriority="high"
			draggable="false"
		/>
		{#if thumbKind === 'video'}
			<div
				class="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/20"
				aria-hidden="true"
			>
				<div class="rounded-full bg-black/55 p-3 shadow-lg backdrop-blur-[1px]">
					<PlayCircleIcon class="h-11 w-11 text-white drop-shadow-md" />
				</div>
			</div>
			{#if durationLabel}
				<span
					class="pointer-events-none absolute bottom-2 right-2 rounded bg-black/70 px-1.5 py-0.5 font-mono text-[10px] font-semibold tabular-nums text-white"
					data-testid="case-file-grid-video-duration"
				>
					{durationLabel}
				</span>
			{/if}
		{/if}
	{:else if thumbKind === 'video' && (phase === 'loading' || phase === 'idle')}
		<FilmIcon class="h-14 w-14 text-sky-300/85" aria-hidden="true" />
	{:else if thumbKind === 'video' && phase === 'error'}
		<FilmIcon class="h-14 w-14 text-sky-300/60" aria-hidden="true" />
	{:else if thumbKind === 'pdf' && (phase === 'loading' || phase === 'idle')}
		<div class="flex flex-col items-center gap-2">
			<div class="h-8 w-8 animate-pulse rounded-full bg-white/10" aria-hidden="true"></div>
			<DocumentTextIcon class="h-10 w-10 text-rose-300/70" aria-hidden="true" />
		</div>
		<span class="sr-only">Loading PDF preview</span>
	{:else if (thumbKind === 'doc' || thumbKind === 'sheet') && (phase === 'loading' || phase === 'idle')}
		<div class="flex flex-col items-center gap-2">
			<div class="h-8 w-8 animate-pulse rounded-full bg-white/10" aria-hidden="true"></div>
			{#if thumbKind === 'doc'}
				<DocumentTextIcon class="h-10 w-10 text-blue-300/70" aria-hidden="true" />
			{:else}
				<TableCellsIcon class="h-10 w-10 text-amber-300/70" aria-hidden="true" />
			{/if}
		</div>
		<span class="sr-only">Loading document preview</span>
	{:else if thumbKind === 'pdf' && phase === 'error'}
		<DocumentTextIcon class="h-14 w-14 text-rose-300/85" aria-hidden="true" />
	{:else if thumbKind === 'doc' && phase === 'error'}
		<DocumentTextIcon class="h-14 w-14 text-blue-300/85" aria-hidden="true" />
	{:else if thumbKind === 'sheet' && phase === 'error'}
		<TableCellsIcon class="h-14 w-14 text-amber-300/85" aria-hidden="true" />
	{:else if thumbKind === 'image' && phase === 'loading'}
		<div class="h-8 w-8 animate-pulse rounded-full bg-white/10" aria-hidden="true"></div>
		<span class="sr-only">Loading thumbnail</span>
	{:else if thumbKind === 'image' && phase === 'error'}
		<PhotoIcon class="h-14 w-14 text-white/40" aria-hidden="true" />
	{:else if thumbKind === 'audio'}
		<MusicalNoteIcon class="h-14 w-14 text-violet-300/80" aria-hidden="true" />
	{:else if thumbKind === 'sheet'}
		<TableCellsIcon class="h-14 w-14 text-amber-300/85" aria-hidden="true" />
	{:else if thumbKind === 'doc'}
		<DocumentTextIcon class="h-14 w-14 text-blue-300/85" aria-hidden="true" />
	{:else}
		<DocumentIcon class="h-14 w-14 text-slate-400/90" aria-hidden="true" />
	{/if}
	{#if thumbKind === 'doc' && phase !== 'ready'}
		<div
			class="pointer-events-none absolute inset-0 opacity-[0.07]"
			style="background-image: repeating-linear-gradient(0deg, transparent, transparent 11px, rgba(255,255,255,0.5) 11px, rgba(255,255,255,0.5) 12px);"
			aria-hidden="true"
		></div>
	{/if}
</div>
