<script lang="ts">
	/**
	 * P19-14 — Case Files Route
	 *
	 * Route-native files page for the case workspace.
	 * Renders inside the P19-06 case shell layout.
	 *
	 * Backend capabilities exposed (honest, no fabrication):
	 *   - List case files (GET /cases/:id/files)
	 *   - Upload file (POST /cases/:id/files)
	 *   - Download file
	 *   - Extract text (txt, csv, log, json, pdf)
	 *   - View extracted text
	 *   - Add / remove evidence tags (Ticket 25)
	 *
	 * This page is the primary surface for case files.
	 * CaseFilesTab.svelte is reused — it is a well-tested standalone component
	 * that communicates only with Case Engine.
	 */
	import { page } from '$app/stores';
	import { caseEngineToken } from '$lib/stores';
	import CaseFilesTab from '$lib/components/case/CaseFilesTab.svelte';
</script>

<!--
	Case Files
	All file operations are case-scoped and go through Case Engine.
	This route renders inside the P19-06 case shell (+layout.svelte).
-->
<div
	class="flex flex-col flex-1 min-h-0 overflow-y-auto"
	data-testid="case-files-page"
>
	<!-- Section header -->
	<div
		class="shrink-0 flex items-center gap-2 px-4 py-3 border-b border-gray-200 dark:border-gray-800"
	>
		<h2 class="text-sm font-semibold text-gray-700 dark:text-gray-200">Case Files</h2>
		<span class="text-xs text-gray-400 dark:text-gray-500">— case-scoped evidence and supporting documents</span>
	</div>

	<!-- Files content — reuse the existing well-tested component -->
	{#if $caseEngineToken}
		<CaseFilesTab caseId={$page.params.id} token={$caseEngineToken} />
	{:else}
		<div class="flex items-center justify-center h-32">
			<p class="text-sm text-gray-400 dark:text-gray-500">Not authenticated to Case Engine.</p>
		</div>
	{/if}
</div>
