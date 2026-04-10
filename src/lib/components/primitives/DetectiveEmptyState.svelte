<script lang="ts">
	/**
	 * P74-06 — Detective empty-state primitive (reuses `CaseEmptyState` implementation + DS classes).
	 */
	import CaseEmptyState from '$lib/components/case/CaseEmptyState.svelte';

	export let title: string;
	export let description = '';
	export let testId = '';
	export let framed = true;
</script>

<CaseEmptyState {title} {description} {testId} {framed}>
	<svelte:fragment slot="icon">
		<slot name="icon" />
	</svelte:fragment>
	<svelte:fragment slot="action">
		<slot name="action" />
	</svelte:fragment>
</CaseEmptyState>
