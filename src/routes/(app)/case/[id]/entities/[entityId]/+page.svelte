<script lang="ts">
	/**
	 * P106-03 / P106-05 — Entity detail + explicit evidence (read-only UI). Timeline is authoritative.
	 */
	import { page } from '$app/stores';
	import CaseEntityDetailPanel from '$lib/components/case/CaseEntityDetailPanel.svelte';
	import CaseWorkspaceContentRegion from '$lib/components/case/CaseWorkspaceContentRegion.svelte';
	import { caseEngineToken } from '$lib/stores';

	$: caseId = String($page.params.id ?? '');
	$: entityId = String($page.params.entityId ?? '');
</script>

<CaseWorkspaceContentRegion testId="case-entity-detail-page">
	<div class="px-3 sm:px-4 pt-3 sm:pt-4 max-w-[960px] mx-auto w-full min-h-0 overflow-auto">
		{#key `${caseId}|${entityId}`}
			<CaseEntityDetailPanel
				caseId={caseId}
				entityId={entityId}
				caseEngineToken={$caseEngineToken ?? ''}
			/>
		{/key}
	</div>
</CaseWorkspaceContentRegion>
