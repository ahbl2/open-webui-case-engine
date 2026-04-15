<script lang="ts">
	/**
	 * P131.6-01 — Home dashboard left column (composition only).
	 * P131.7-02 — Cases (top) + Workflow / task queue (bottom); Personal Threads removed from Home OCC only.
	 * P131.6-04 — Section labels via aria-labelledby (panel headings).
	 * P131.9-05B — Cases + workflow cells shared with desktop `ds-occ-dashboard-board` via OccHomeBoardCases.
	 */
	import { DS_STACK_CLASSES } from '$lib/case/detectivePrimitiveFoundation';
	import type { CaseEngineCase } from '$lib/apis/caseEngine';

	import OccHomeBoardCases from './OccHomeBoardCases.svelte';
	import OccHomeWorkflowQueueZone from './OccHomeWorkflowQueueZone.svelte';

	export let casesLoading: boolean;
	export let casesError: string;
	export let loadCases: () => void;
	export let recentCases: CaseEngineCase[];
	export let goToCases: () => void;
	export let statusBadgeClass: (status: string) => string;
</script>

<div class="{DS_STACK_CLASSES.stack} min-w-0" data-testid="occ-home-dashboard-left">
	<OccHomeBoardCases
		{casesLoading}
		{casesError}
		{loadCases}
		{recentCases}
		{goToCases}
		{statusBadgeClass}
	/>

	<OccHomeWorkflowQueueZone />
</div>
