<script lang="ts">
	/**
	 * P106-02 / P106-05 — Case entities list (read-only UI). Timeline holds the committed chronology; entities are supporting.
	 * P126-01 — Structured-reference framing (`CaseEntitiesFraming`; static copy only; always above list chrome).
	 */
	import { page } from '$app/stores';
	import CaseEntitiesFraming from '$lib/components/case/CaseEntitiesFraming.svelte';
	import CaseEntitiesPanel from '$lib/components/case/CaseEntitiesPanel.svelte';
	import CaseWorkspaceContentRegion from '$lib/components/case/CaseWorkspaceContentRegion.svelte';
	import { caseEngineToken } from '$lib/stores';

	$: caseId = String($page.params.id ?? '');
</script>

<CaseWorkspaceContentRegion testId="case-entities-page">
	<div class="flex flex-col min-h-0 flex-1 w-full">
		<!-- P126-01 — Identity framing: always visible (empty, loading, populated, no-token). -->
		<CaseEntitiesFraming />
		<div class="px-3 sm:px-4 pt-3 sm:pt-4 max-w-[960px] mx-auto w-full min-h-0 overflow-auto flex-1">
			{#key caseId}
				<CaseEntitiesPanel caseId={caseId} caseEngineToken={$caseEngineToken ?? ''} />
			{/key}
		</div>
	</div>
</CaseWorkspaceContentRegion>
