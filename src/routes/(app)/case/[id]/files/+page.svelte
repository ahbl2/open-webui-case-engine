<script lang="ts">
	/**
	 * P19-14 — Case Files Route
	 * P71-06 — Tier L shell / framing (P70-06 S1, P70-04 B); presentation only.
	 *
	 * Route-native files page for the case workspace.
	 * Renders inside the P19-06 case shell layout.
	 *
	 * Backend capabilities exposed (honest, no fabrication):
	 *   - List case files (GET /cases/:id/files; P42-03 pagination, P42-04 `query`, P42-05 `mimeCategory` / `hasTags` in CaseFilesTab)
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
	import CaseWorkspaceContentRegion from '$lib/components/case/CaseWorkspaceContentRegion.svelte';
</script>

<!--
	Case Files
	All file operations are case-scoped and go through Case Engine.
	This route renders inside the P19-06 case shell (+layout.svelte).
-->
<CaseWorkspaceContentRegion testId="case-files-page">
	<div class="ce-l-files-shell">
		<!-- Section header -->
		<div class="ce-l-files-hero">
			<h2 class="ce-l-files-hero-title text-sm font-semibold">Case Files</h2>
			<span class="ce-l-files-hero-meta text-xs"
				>— case-scoped evidence and supporting documents</span
			>
		</div>

		<!-- Files content — reuse the existing well-tested component -->
		{#if $caseEngineToken}
			<div class="ce-l-files-primary-scroll" data-testid="case-files-primary-scroll">
				<CaseFilesTab
					caseId={$page.params.id}
					token={$caseEngineToken}
					focusFileId={$page.url.searchParams.get('file')}
					synthesisNavigationEnabled={true}
				/>
			</div>
		{:else}
			<div class="ce-l-files-primary-scroll" data-testid="case-files-primary-scroll">
				<div class="flex items-center justify-center min-h-[8rem] p-4">
					<p class="text-sm ce-l-files-hero-meta">Not authenticated to Case Engine.</p>
				</div>
			</div>
		{/if}
	</div>
</CaseWorkspaceContentRegion>
