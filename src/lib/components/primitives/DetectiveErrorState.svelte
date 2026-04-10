<script lang="ts">
	/**
	 * P74-07 — Detective error-state primitive (reuses `CaseErrorState` + DS classes).
	 */
	import CaseErrorState from '$lib/components/case/CaseErrorState.svelte';

	export let title = 'Failed to load';
	export let message: string;
	export let onRetry: (() => void) | undefined = undefined;
</script>

<CaseErrorState {title} {message} {onRetry}>
	<svelte:fragment slot="details">
		<slot name="details" />
	</svelte:fragment>
</CaseErrorState>
