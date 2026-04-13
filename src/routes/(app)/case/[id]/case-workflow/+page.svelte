<script lang="ts">
	/**
	 * P117-04 — Phase 117 case workflow items (operational records; not legacy P13 workflow).
	 */
	import { page } from '$app/stores';
	import CaseCaseWorkflowItemsPanel from '$lib/components/case/CaseCaseWorkflowItemsPanel.svelte';
	import CaseWorkspaceContentRegion from '$lib/components/case/CaseWorkspaceContentRegion.svelte';
	import { caseEngineToken } from '$lib/stores';

	$: caseId = String($page.params.id ?? '');
</script>

<CaseWorkspaceContentRegion testId="case-case-workflow-page">
	<div class="px-3 sm:px-4 pt-3 sm:pt-4 max-w-[960px] mx-auto w-full min-h-0 overflow-auto">
		{#key caseId}
			<CaseCaseWorkflowItemsPanel caseId={caseId} caseEngineToken={$caseEngineToken ?? ''} />
		{/key}
	</div>
</CaseWorkspaceContentRegion>
