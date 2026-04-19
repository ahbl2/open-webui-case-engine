<script lang="ts">
	/**
	 * P75-07 — OCC right rail: assistant entry, intel placeholder, proposal navigation (no fake queues).
	 * P77-02 — Elevated rail panels aligned with command-center DS.
	 * P131.6-01 — Composed from OccRail* modules (same DOM as before).
	 */
	import { DS_STACK_CLASSES } from '$lib/case/detectivePrimitiveFoundation';

	import type { PersonalThreadAssociation } from '$lib/apis/caseEngine';
	import OccRailAssistant from '$lib/components/operator/OccRailAssistant.svelte';
	import OccRailIntel from '$lib/components/operator/OccRailIntel.svelte';
	import OccRailProposals from '$lib/components/operator/OccRailProposals.svelte';

	export let newChat: () => void;
	export let bindingInProgress: boolean;
	export let hasToken: boolean;
	export let goToCases: () => void;

	export let openPersonalThread: (threadId: string) => void = () => {};
	export let activePersonalThreadId: string | null = null;
	export let threadsLoading = false;
	export let recentPersonalThreads: PersonalThreadAssociation[] = [];
</script>

<div class={DS_STACK_CLASSES.stack}>
	<OccRailAssistant
		{newChat}
		{bindingInProgress}
		{hasToken}
		{openPersonalThread}
		{activePersonalThreadId}
		{threadsLoading}
		{recentPersonalThreads}
	/>
	<OccRailIntel />
	<OccRailProposals {goToCases} />
</div>
