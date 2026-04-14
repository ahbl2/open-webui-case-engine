<script lang="ts">
	/**
	 * P106-03 / P106-05 — Entity detail + explicit evidence (read-only UI). Timeline holds the committed chronology.
	 * P126-01 — Same structured-reference framing as list route (static copy; always above detail panel).
	 */
	import { page } from '$app/stores';
	import CaseEntitiesFraming from '$lib/components/case/CaseEntitiesFraming.svelte';
	import CaseEntityDetailPanel from '$lib/components/case/CaseEntityDetailPanel.svelte';
	import CaseWorkspaceContentRegion from '$lib/components/case/CaseWorkspaceContentRegion.svelte';
	import { caseEngineToken } from '$lib/stores';

	$: caseId = String($page.params.id ?? '');
	$: entityId = String($page.params.entityId ?? '');
</script>

<CaseWorkspaceContentRegion testId="case-entity-detail-page">
	<div class="flex flex-col min-h-0 flex-1 w-full">
		<CaseEntitiesFraming />
		<div class="px-3 sm:px-4 pt-3 sm:pt-4 max-w-[960px] mx-auto w-full min-h-0 overflow-auto flex-1">
			{#key `${caseId}|${entityId}`}
				<CaseEntityDetailPanel
					caseId={caseId}
					entityId={entityId}
					caseEngineToken={$caseEngineToken ?? ''}
				/>
			{/key}
		</div>
	</div>
</CaseWorkspaceContentRegion>
