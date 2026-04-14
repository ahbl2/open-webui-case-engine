<!--
	P123-04 / P123-05 — Minimal surface shell when `/case/:id/...` has no valid case id segment.
	No data fetching, no stores, no inference.
-->
<script lang="ts">
	import CaseWorkspaceContentRegion from '$lib/components/case/CaseWorkspaceContentRegion.svelte';
	import CaseTimelineAuthorityFraming from '$lib/components/case/CaseTimelineAuthorityFraming.svelte';
	import { DS_EMPTY_CLASSES, DS_TYPE_CLASSES } from '$lib/case/detectivePrimitiveFoundation';
	import { P123_NO_CASE_ROUTE_BODY } from '$lib/caseContext/p123CaseWorkspaceCopy';

	export let surface: 'Timeline' | 'Notes' | 'Files';
	/** Region test id (e.g. case-timeline-placeholder). */
	export let testId = '';
</script>

<CaseWorkspaceContentRegion testId={testId || undefined}>
	<div
		class="{DS_EMPTY_CLASSES.root} {DS_EMPTY_CLASSES.framed} flex flex-1 min-h-0 flex-col gap-2 p-4"
		data-testid="case-workspace-route-surface-placeholder"
		data-surface={surface}
	>
		{#if surface === 'Timeline'}
			<!-- P124-01 — Same authority framing as populated Timeline (route id missing). -->
			<div class="mb-2 w-full shrink-0">
				<CaseTimelineAuthorityFraming />
			</div>
		{:else}
			<h2 class="{DS_TYPE_CLASSES.section} text-sm font-semibold text-[color:var(--ce-l-text-primary)]">
				{surface}
			</h2>
		{/if}
		<p
			class="{DS_EMPTY_CLASSES.description} text-sm text-[color:var(--ce-l-text-muted)]"
			data-testid="case-workspace-placeholder-no-case"
		>
			{P123_NO_CASE_ROUTE_BODY}
		</p>
	</div>
</CaseWorkspaceContentRegion>
