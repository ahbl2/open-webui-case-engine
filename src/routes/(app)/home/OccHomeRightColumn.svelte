<script lang="ts">
	/**
	 * P131.6-01 — Home dashboard right column: AI assistant + proposals (composition only).
	 * P131.6-03 — Assistant binding error + optional proposal error wiring from parent.
	 */
	import { DS_STACK_CLASSES } from '$lib/case/detectivePrimitiveFoundation';

	import OccRailAssistant from '$lib/components/operator/OccRailAssistant.svelte';
	import OccRailProposals from '$lib/components/operator/OccRailProposals.svelte';

	export let newChat: () => void;
	export let bindingInProgress: boolean;
	export let hasToken: boolean;
	export let goToCases: () => void;
	export let bindingErrorActive = false;
	export let onRetryBinding: (() => void) | undefined = undefined;

	export let proposalsHasError = false;
	export let onRetryProposals: (() => void) | undefined = undefined;
	export let proposalsRetryDisabled = false;
</script>

<div class="{DS_STACK_CLASSES.stack} min-w-0" data-testid="occ-home-dashboard-right">
	<OccRailAssistant
		{newChat}
		{bindingInProgress}
		{hasToken}
		bindingErrorActive={bindingErrorActive}
		{onRetryBinding}
	/>
	<OccRailProposals
		{goToCases}
		hasError={proposalsHasError}
		onRetry={onRetryProposals}
		retryDisabled={proposalsRetryDisabled}
	/>
</div>
