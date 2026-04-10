<script lang="ts">
	/**
	 * P74-06 — Detective loading-state primitive (reuses `CaseLoadingState` + DS classes).
	 */
	import CaseLoadingState from '$lib/components/case/CaseLoadingState.svelte';

	export let label = '';
	export let testId = '';
</script>

<CaseLoadingState {label} {testId} />
