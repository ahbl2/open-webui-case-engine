<script lang="ts">
	/**
	 * P127-03 — Phase 117 workflow item detail (attributes only). Case id via `getRouteCaseIdString` only.
	 */
	import { page } from '$app/stores';
	import { caseEngineToken } from '$lib/stores';
	import CaseWorkflowDetailPanel from '$lib/components/case/CaseWorkflowDetailPanel.svelte';
	import CaseWorkflowFraming from '$lib/components/case/CaseWorkflowFraming.svelte';
	import CaseWorkspaceContentRegion from '$lib/components/case/CaseWorkspaceContentRegion.svelte';
	import { getRouteCaseIdString } from '$lib/caseContext/routeCaseContext';
	import { P127_WORKFLOW_DETAIL_PAGE_TITLE } from '$lib/caseContext/p127WorkflowListDetailCopy';
	import {
		DS_BANNER_CLASSES,
		DS_STATUS_SURFACE_CLASSES,
		DS_STATUS_TEXT_CLASSES
	} from '$lib/case/detectivePrimitiveFoundation';

	$: routeCaseId = getRouteCaseIdString($page.params);
	$: workflowItemId = String($page.params.workflowItemId ?? '').trim();
	$: backHref = `/case/${encodeURIComponent(routeCaseId)}/workflow`;
</script>

<svelte:head>
	<title>{P127_WORKFLOW_DETAIL_PAGE_TITLE}</title>
</svelte:head>

<CaseWorkspaceContentRegion testId="case-workflow-witem-page">
	<div class="flex min-h-0 flex-1 flex-col overflow-hidden">
		<CaseWorkflowFraming />
		{#if !$caseEngineToken}
			<div class="ds-workflow-primary-scroll flex-1 p-4 md:p-6">
				<div
					class="{DS_BANNER_CLASSES.base} {DS_BANNER_CLASSES.denseModifier} {DS_STATUS_SURFACE_CLASSES.warning} p-4"
				>
					<p class="{DS_BANNER_CLASSES.body} m-0 text-sm {DS_STATUS_TEXT_CLASSES.warning}">
						Case Engine connection required to view workflow items for this case.
					</p>
				</div>
			</div>
		{:else}
			<div class="ds-workflow-primary-scroll flex-1 min-h-0 px-3 sm:px-4 py-3 sm:py-4 max-w-[960px] mx-auto w-full">
				{#key `${routeCaseId}|${workflowItemId}`}
					<CaseWorkflowDetailPanel
						caseId={routeCaseId}
						workflowItemId={workflowItemId}
						token={$caseEngineToken}
						backHref={backHref}
					/>
				{/key}
			</div>
		{/if}
	</div>
</CaseWorkspaceContentRegion>
