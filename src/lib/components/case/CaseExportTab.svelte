<script lang="ts">
	import { toast } from 'svelte-sonner';
	import {
		openRunningNotesHtml,
		downloadRunningNotesHtml,
		downloadRunningNotesPdf
	} from '$lib/apis/caseEngine';

	export let caseId: string;
	export let token: string;
	export let caseNumber: string = '';

	let includeOriginal = false;
	let includeFiles = false;
	let loading = false;
	let pdfSupported: boolean | null = null;

	async function handleOpenHtml() {
		loading = true;
		try {
			await openRunningNotesHtml(caseId, token, { includeOriginal, includeFiles });
			toast.success('Running Notes opened in new tab');
		} catch (e) {
			toast.error((e as Error)?.message ?? 'Export failed');
		} finally {
			loading = false;
		}
	}

	async function handleDownloadHtml() {
		loading = true;
		try {
			await downloadRunningNotesHtml(caseId, token, {
				includeOriginal,
				includeFiles,
				caseNumber
			});
			toast.success('HTML downloaded');
		} catch (e) {
			toast.error((e as Error)?.message ?? 'Export failed');
		} finally {
			loading = false;
		}
	}

	async function handleDownloadPdf() {
		if (pdfSupported === false) return;
		loading = true;
		try {
			const ok = await downloadRunningNotesPdf(caseId, token, {
				includeOriginal,
				includeFiles
			});
			if (ok) {
				toast.success('PDF downloaded');
			} else {
				pdfSupported = false;
				toast.error('PDF export not available yet');
			}
		} catch (e) {
			toast.error((e as Error)?.message ?? 'Export failed');
		} finally {
			loading = false;
		}
	}
</script>

<div class="flex flex-col gap-4 p-4">
	<h2 class="text-sm font-medium">Export Running Case Notes</h2>
	<p class="text-xs text-gray-600 dark:text-gray-400">
		Generate a chronological, attributed document of all timeline entries for this case.
	</p>

	<div class="space-y-2">
		<label class="flex items-center gap-2 cursor-pointer">
			<input type="checkbox" bind:checked={includeOriginal} class="rounded" />
			<span class="text-sm">Include original text (verbatim)</span>
		</label>
		<label class="flex items-center gap-2 cursor-pointer">
			<input type="checkbox" bind:checked={includeFiles} class="rounded" />
			<span class="text-sm">Include file list</span>
		</label>
	</div>

	<div class="flex flex-wrap gap-2">
		<button
			type="button"
			class="rounded bg-blue-600 text-white px-3 py-1.5 text-sm hover:bg-blue-700 disabled:opacity-50"
			on:click={handleOpenHtml}
			disabled={loading}
			title="Open Running Notes in a new browser tab"
		>
			{loading ? 'Opening…' : 'Open Running Notes (HTML)'}
		</button>
		<button
			type="button"
			class="rounded border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50"
			on:click={handleDownloadHtml}
			disabled={loading}
			title="Download HTML with friendly filename"
		>
			{loading ? '…' : 'Download HTML'}
		</button>
		<button
			type="button"
			class="rounded border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
			on:click={handleDownloadPdf}
			disabled={loading || pdfSupported === false}
			title={pdfSupported === false ? 'PDF export not enabled yet' : 'Download as PDF'}
		>
			{loading ? '…' : 'Download PDF'}
		</button>
	</div>
	{#if pdfSupported === false}
		<p class="text-xs text-gray-500">PDF export is not available yet. Use HTML for now.</p>
	{/if}
</div>
