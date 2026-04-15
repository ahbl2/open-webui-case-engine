<script lang="ts">
	/**
	 * P131.9-05B — Desktop board cell: Active / Assigned cases (shared with OccHomeLeftColumn composition).
	 */
	import type { CaseEngineCase } from '$lib/apis/caseEngine';
	import { DS_OCC_CLASSES } from '$lib/case/detectivePrimitiveFoundation';

	import HomeDesktopYourCases from './HomeDesktopYourCases.svelte';

	export let casesLoading: boolean;
	export let casesError: string;
	export let loadCases: () => void;
	export let recentCases: CaseEngineCase[];
	export let goToCases: () => void;
	export let statusBadgeClass: (status: string) => string;
</script>

<section
	class="{DS_OCC_CLASSES.mainSection} min-w-0"
	data-testid="occ-main-cases"
	aria-labelledby="occ-home-your-cases-heading"
>
	<HomeDesktopYourCases
		{casesLoading}
		{casesError}
		{loadCases}
		{recentCases}
		{goToCases}
		{statusBadgeClass}
		occBoardShell={true}
	/>
</section>
