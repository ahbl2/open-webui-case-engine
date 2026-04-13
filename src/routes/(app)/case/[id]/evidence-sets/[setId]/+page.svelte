<script lang="ts">
	/**
	 * P109-04 — Read-only evidence set detail (explicit saved membership; Case Engine).
	 */
	import { page } from '$app/stores';
	import CaseEvidenceSetDetailPanel from '$lib/components/case/CaseEvidenceSetDetailPanel.svelte';
	import CaseWorkspaceContentRegion from '$lib/components/case/CaseWorkspaceContentRegion.svelte';
	import { caseEngineToken } from '$lib/stores';

	$: caseId = String($page.params.id ?? '');
	$: setId = String($page.params.setId ?? '');
</script>

<CaseWorkspaceContentRegion testId="case-evidence-set-detail-page">
	<div class="px-3 sm:px-4 pt-3 sm:pt-4 max-w-[960px] mx-auto w-full min-h-0 overflow-auto">
		{#key `${caseId}|${setId}`}
			<CaseEvidenceSetDetailPanel caseId={caseId} setId={setId} caseEngineToken={$caseEngineToken ?? ''} />
		{/key}
	</div>
</CaseWorkspaceContentRegion>
