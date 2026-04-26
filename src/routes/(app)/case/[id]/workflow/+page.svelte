<script lang="ts">
	/**
	 * P77-08 — Wave 4 DS operational surface + route identity (scroll/layout preserved).
	 * P127-01 — Hero + tab (`CaseWorkflowTab` includes `CaseWorkflowWorkspaceHero`); case id via `getRouteCaseIdString` only.
	 */
	import { page } from '$app/stores';
	import { caseEngineToken, caseEngineAuthState, caseEngineUser } from '$lib/stores';
	import CaseWorkflowTab from '$lib/components/case/CaseWorkflowTab.svelte';
	import CaseWorkspaceContentRegion from '$lib/components/case/CaseWorkspaceContentRegion.svelte';
	import { getRouteCaseIdString } from '$lib/caseContext/routeCaseContext';
	import {
		DS_BANNER_CLASSES,
		DS_STATUS_SURFACE_CLASSES,
		DS_STATUS_TEXT_CLASSES
	} from '$lib/case/detectivePrimitiveFoundation';

	$: routeCaseId = getRouteCaseIdString($page.params);
	$: isAdmin =
		$caseEngineUser?.role === 'ADMIN' || $caseEngineAuthState?.user?.role === 'admin';
</script>

<CaseWorkspaceContentRegion testId="case-workflow-page">
	<div class="flex min-h-0 flex-1 flex-col overflow-hidden">
		{#if !$caseEngineToken}
			<div class="ds-workflow-primary-scroll flex-1 p-4 md:p-6">
				<div
					class="{DS_BANNER_CLASSES.base} {DS_BANNER_CLASSES.denseModifier} {DS_STATUS_SURFACE_CLASSES.warning} p-4"
				>
					<p class="{DS_BANNER_CLASSES.body} m-0 text-sm {DS_STATUS_TEXT_CLASSES.warning}">
						Case Engine connection required to load workflow items for this case.
					</p>
				</div>
			</div>
		{:else}
			<div class="ds-workflow-primary-scroll flex-1 min-h-0">
				<CaseWorkflowTab caseId={routeCaseId} token={$caseEngineToken} {isAdmin} />
			</div>
		{/if}
	</div>
</CaseWorkspaceContentRegion>
