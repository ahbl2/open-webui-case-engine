<script lang="ts">
	/**
	 * P109-03 — Evidence set management (Case Engine list + create from session selection).
	 */
	import { page } from '$app/stores';
	import CaseEvidenceSetsPanel from '$lib/components/case/CaseEvidenceSetsPanel.svelte';
	import CaseWorkspaceContentRegion from '$lib/components/case/CaseWorkspaceContentRegion.svelte';
	import { caseEngineToken } from '$lib/stores';

	$: caseId = String($page.params.id ?? '');
</script>

<CaseWorkspaceContentRegion testId="case-evidence-sets-page">
	<div class="px-3 sm:px-4 pt-3 sm:pt-4 max-w-[960px] mx-auto w-full min-h-0 overflow-auto">
		{#key caseId}
			<CaseEvidenceSetsPanel caseId={caseId} caseEngineToken={$caseEngineToken ?? ''} />
		{/key}
	</div>
</CaseWorkspaceContentRegion>
