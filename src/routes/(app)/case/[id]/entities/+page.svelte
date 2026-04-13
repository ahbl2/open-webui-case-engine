<script lang="ts">
	/**
	 * P106-02 / P106-05 — Case entities list (read-only UI). Timeline is authoritative; entities are supporting.
	 */
	import { page } from '$app/stores';
	import CaseEntitiesPanel from '$lib/components/case/CaseEntitiesPanel.svelte';
	import CaseWorkspaceContentRegion from '$lib/components/case/CaseWorkspaceContentRegion.svelte';
	import { caseEngineToken } from '$lib/stores';

	$: caseId = String($page.params.id ?? '');
</script>

<CaseWorkspaceContentRegion testId="case-entities-page">
	<div class="px-3 sm:px-4 pt-3 sm:pt-4 max-w-[960px] mx-auto w-full min-h-0 overflow-auto">
		{#key caseId}
			<CaseEntitiesPanel caseId={caseId} caseEngineToken={$caseEngineToken ?? ''} />
		{/key}
	</div>
</CaseWorkspaceContentRegion>
