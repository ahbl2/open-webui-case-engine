<script lang="ts">
	/**
	 * P129-01 — Activity audit framing (`CaseActivityFraming`); case id via `getRouteCaseIdString` only.
	 * P129-03 — Chronological activity list (`CaseActivityList`); Case Engine order preserved (no client reorder).
	 */
	import { page } from '$app/stores';
	import { caseEngineToken } from '$lib/stores';
	import CaseWorkspaceContentRegion from '$lib/components/case/CaseWorkspaceContentRegion.svelte';
	import CaseActivityFraming from '$lib/components/case/CaseActivityFraming.svelte';
	import CaseActivityList from '$lib/components/case/CaseActivityList.svelte';
	import { getRouteCaseIdString } from '$lib/caseContext/routeCaseContext';
	import { P129_ACTIVITY_LIST_NO_TOKEN } from '$lib/caseContext/p129ActivityListCopy';
	import { DS_BANNER_CLASSES } from '$lib/case/detectivePrimitiveFoundation';

	$: routeCaseId = getRouteCaseIdString($page.params);
</script>

<CaseWorkspaceContentRegion testId="case-activity-page">
	<div
		class="ce-l-activity-shell flex min-h-0 flex-1 flex-col overflow-hidden"
		data-route-case-id={routeCaseId || undefined}
	>
		<!-- P129-01 — Identity framing: always first; visible in all states. -->
		<CaseActivityFraming />
		<div
			class="ce-l-activity-primary-scroll flex min-h-0 flex-1 flex-col overflow-y-auto px-4 pt-3 pb-4"
			data-testid="case-activity-primary-scroll"
			data-region="case-activity-primary-scroll"
		>
			{#if !$caseEngineToken}
				<div class="min-h-0 flex-1" data-testid="case-activity-no-token">
					<div
						class="{DS_BANNER_CLASSES.base} {DS_BANNER_CLASSES.denseModifier} border border-[color:var(--ce-l-border-default)] bg-[color:var(--ce-l-surface-raised)] p-3"
					>
						<p class="{DS_BANNER_CLASSES.body} m-0 text-sm text-[color:var(--ce-l-text-primary)]">
							{P129_ACTIVITY_LIST_NO_TOKEN}
						</p>
					</div>
				</div>
			{:else}
				<CaseActivityList caseId={routeCaseId} />
			{/if}
		</div>
	</div>
</CaseWorkspaceContentRegion>
