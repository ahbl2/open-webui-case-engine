<script lang="ts">
	/**
	 * P77-08 — Wave 4 DS operational surface + route identity (scroll/layout preserved).
	 */
	import { page } from '$app/stores';
	import { caseEngineToken, caseEngineAuthState, caseEngineUser } from '$lib/stores';
	import CaseWorkflowTab from '$lib/components/case/CaseWorkflowTab.svelte';
	import CaseWorkspaceContentRegion from '$lib/components/case/CaseWorkspaceContentRegion.svelte';
	import {
		DS_BADGE_CLASSES,
		DS_BANNER_CLASSES,
		DS_STATUS_SURFACE_CLASSES,
		DS_STATUS_TEXT_CLASSES,
		DS_TYPE_CLASSES,
		DS_WORKFLOW_CLASSES
	} from '$lib/case/detectivePrimitiveFoundation';

	$: caseId = $page.params.id;
	$: isAdmin =
		$caseEngineUser?.role === 'ADMIN' || $caseEngineAuthState?.user?.role === 'admin';
</script>

<CaseWorkspaceContentRegion testId="case-workflow-page">
	<div class="flex min-h-0 flex-1 flex-col overflow-hidden">
		<div class="ce-l-workflow-hero shrink-0 border-b border-[var(--ds-border-default)] px-4 pb-4 pt-4 md:px-6">
			<div class="{DS_WORKFLOW_CLASSES.pageIdentity}">
				<h2 class="m-0 text-base font-semibold tracking-tight {DS_TYPE_CLASSES.section} {DS_WORKFLOW_CLASSES.pageIdentityHeading}">
					Workflow & Leads
				</h2>
				<span
					class="{DS_BADGE_CLASSES.info}"
					title="Workflow tab — hypotheses, gaps, and the workflow proposal queue (not the case Proposals tab)"
					>Execution surface</span
				>
				<p class="{DS_WORKFLOW_CLASSES.pageIdentityMeta}">
					Planning and follow-up on this tab — not the official Timeline, Notes drafts, case Proposals tab review, or
					Files evidence store.
				</p>
			</div>
		</div>

		{#if !$caseEngineToken}
			<div class="{DS_WORKFLOW_CLASSES.primaryScroll} flex-1 p-4 md:p-6">
				<div
					class="{DS_BANNER_CLASSES.base} {DS_BANNER_CLASSES.denseModifier} {DS_STATUS_SURFACE_CLASSES.warning} p-4"
				>
					<p class="{DS_BANNER_CLASSES.body} m-0 text-sm {DS_STATUS_TEXT_CLASSES.warning}">
						Case Engine connection required to load workflow items for this case.
					</p>
				</div>
			</div>
		{:else}
			<div class="{DS_WORKFLOW_CLASSES.primaryScroll} flex-1 min-h-0">
				<CaseWorkflowTab {caseId} token={$caseEngineToken} {isAdmin} />
			</div>
		{/if}
	</div>
</CaseWorkspaceContentRegion>
