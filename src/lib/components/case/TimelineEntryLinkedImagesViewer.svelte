<script lang="ts">
	/**
	 * Modal viewer for timeline-linked case images (read-only preview + download).
	 */
	import { onDestroy } from 'svelte';
	import type { TimelineLinkedImageFile } from '$lib/apis/caseEngine';
	import { downloadCaseFile, fetchCaseFileObjectUrl } from '$lib/apis/caseEngine';

	export let show = false;
	export let token: string;
	export let files: TimelineLinkedImageFile[];
	export let onClose: () => void = () => {};

	let selectedIndex = 0;
	let objectUrls = new Map<string, string>();
	let loadError = '';
	let loading = false;

	$: if (files.length > 0 && selectedIndex >= files.length) {
		selectedIndex = files.length - 1;
	}

	function revokeAll(): void {
		for (const u of objectUrls.values()) {
			try {
				URL.revokeObjectURL(u);
			} catch {
				// ignore
			}
		}
		objectUrls = new Map();
	}

	$: if (!show) {
		revokeAll();
		loadError = '';
		selectedIndex = 0;
	}

	async function ensureUrlsForFiles(list: TimelineLinkedImageFile[], tok: string): Promise<void> {
		if (!list.length || !tok) return;
		loading = true;
		loadError = '';
		try {
			const next = new Map(objectUrls);
			for (const f of list) {
				if (next.has(f.id)) continue;
				const url = await fetchCaseFileObjectUrl(f.id, tok);
				next.set(f.id, url);
			}
			objectUrls = next;
		} catch (e: unknown) {
			loadError = e instanceof Error ? e.message : 'Could not load images.';
		} finally {
			loading = false;
		}
	}

	$: if (show && token && files.length) {
		void ensureUrlsForFiles(files, token);
	}

	$: currentFile = files[selectedIndex];
	$: previewUrl = currentFile ? objectUrls.get(currentFile.id) : undefined;

	function pickIndex(i: number): void {
		selectedIndex = i;
	}

	function handleGlobalKeydown(e: KeyboardEvent): void {
		if (show && e.key === 'Escape') onClose();
	}

	async function downloadSelected(): Promise<void> {
		const f = files[selectedIndex];
		if (!f || !token) return;
		try {
			await downloadCaseFile(f.id, f.original_filename, token);
		} catch (e: unknown) {
			loadError = e instanceof Error ? e.message : 'Download failed.';
		}
	}

	onDestroy(() => {
		revokeAll();
	});
</script>

<svelte:window on:keydown={handleGlobalKeydown} />

{#if show && files.length > 0}
	<!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
	<div
		class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50"
		role="dialog"
		aria-modal="true"
		aria-label="Linked images"
		data-testid="timeline-linked-images-viewer"
		on:click|self={() => onClose()}
	>
		<div
			class="max-w-4xl w-full max-h-[90vh] flex flex-col rounded-lg border border-gray-200 dark:border-gray-700
			       bg-white dark:bg-gray-900 shadow-xl overflow-hidden"
			role="document"
		>
			<div
				class="flex items-center justify-between gap-2 px-3 py-2 border-b border-gray-200 dark:border-gray-800"
			>
				<span class="text-sm font-medium text-gray-800 dark:text-gray-100">
					Linked images ({files.length})
				</span>
				<div class="flex items-center gap-2">
					<button
						type="button"
						class="text-xs px-2 py-1 rounded border border-gray-300 dark:border-gray-600
						       text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
						data-testid="timeline-linked-images-download"
						on:click={() => void downloadSelected()}
					>
						Download
					</button>
					<button
						type="button"
						class="text-xs px-2 py-1 rounded text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
						data-testid="timeline-linked-images-close"
						on:click={() => onClose()}
					>
						Close
					</button>
				</div>
			</div>

			<div class="flex-1 min-h-0 flex flex-col md:flex-row gap-2 p-3 overflow-hidden">
				<div
					class="flex md:flex-col gap-1 overflow-x-auto md:overflow-y-auto md:max-w-[7rem] shrink-0"
					data-testid="timeline-linked-images-thumbs"
				>
					{#each files as f, i (f.id)}
						<button
							type="button"
							class="shrink-0 size-16 rounded border-2 overflow-hidden bg-gray-100 dark:bg-gray-800
							       {i === selectedIndex
								? 'border-blue-500 ring-1 ring-blue-400'
								: 'border-transparent opacity-80 hover:opacity-100'}"
							on:click={() => pickIndex(i)}
							title={f.original_filename}
						>
							{#if objectUrls.get(f.id)}
								<img
									src={objectUrls.get(f.id)}
									alt=""
									class="size-full object-cover"
								/>
							{:else}
								<span class="text-[10px] text-gray-500 p-1 truncate block w-full text-center"
									>…</span
								>
							{/if}
						</button>
					{/each}
				</div>

				<div class="flex-1 min-h-[12rem] flex flex-col gap-2 min-w-0">
					{#if loadError}
						<p class="text-xs text-red-600 dark:text-red-400" data-testid="timeline-linked-images-error">
							{loadError}
						</p>
					{/if}
					{#if loading && !previewUrl}
						<p class="text-xs text-gray-500">Loading preview…</p>
					{/if}
					{#if previewUrl && currentFile}
						<div
							class="flex-1 min-h-0 flex items-center justify-center rounded border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 overflow-auto"
						>
							<img
								src={previewUrl}
								alt={currentFile.original_filename}
								class="max-w-full max-h-[55vh] object-contain"
								data-testid="timeline-linked-images-preview"
							/>
						</div>
						<p class="text-xs text-gray-500 truncate" title={currentFile.original_filename}>
							{currentFile.original_filename}
						</p>
					{/if}
				</div>
			</div>
		</div>
	</div>
{/if}
