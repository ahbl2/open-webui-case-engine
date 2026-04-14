<script lang="ts">
	/**
	 * P19-14 — Case Files Route
	 * P71-06 — Tier L shell / framing (P70-06 S1, P70-04 B); presentation only.
	 * P123-04 — Route case id via `getRouteCaseId` only; explicit no-case placeholder.
	 * P125-01 — Evidence framing (`CaseFilesEvidenceFraming`; static copy only; always above file list).
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
	import { getRouteCaseId } from '$lib/caseContext/routeCaseContext';
	import CaseFilesTab from '$lib/components/case/CaseFilesTab.svelte';
	import CaseFilesEvidenceFraming from '$lib/components/case/CaseFilesEvidenceFraming.svelte';
	import CaseWorkspaceContentRegion from '$lib/components/case/CaseWorkspaceContentRegion.svelte';
	import CaseWorkspaceRouteSurfacePlaceholder from '$lib/components/case/CaseWorkspaceRouteSurfacePlaceholder.svelte';

	$: routeCaseId = getRouteCaseId($page.params);
</script>

<!--
	Case Files
	All file operations are case-scoped and go through Case Engine.
	This route renders inside the P19-06 case shell (+layout.svelte).
-->
{#if !routeCaseId}
	<CaseWorkspaceRouteSurfacePlaceholder surface="Files" testId="case-files-placeholder" />
{:else}
	<CaseWorkspaceContentRegion testId="case-files-page">
		<div class="ce-l-files-shell">
			<!-- P125-01 — Evidence framing: always visible (empty, loading, populated, no-token). -->
			<CaseFilesEvidenceFraming />

			<!-- Case id line (primary label lives in CaseFilesEvidenceFraming) -->
			<div class="ce-l-files-hero">
				<div class="sr-only ce-l-files-hero-title">Files surface</div>
				<p
					class="ce-l-files-hero-meta text-xs mt-1 font-mono"
					data-testid="case-files-route-case-id"
				>
					{routeCaseId}
				</p>
			</div>

			<!-- Files content — reuse the existing well-tested component -->
			{#if $caseEngineToken}
				<div class="ce-l-files-primary-scroll" data-testid="case-files-primary-scroll">
					<CaseFilesTab
						caseId={routeCaseId}
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
{/if}
