<script lang="ts">
	import type { OperationalPlan } from '$lib/apis/operationsApi';

	export let plans: OperationalPlan[] = [];
	export let selectedPlanId: string | null = null;
	export let loading = false;

	export let onSelect: (plan: OperationalPlan) => void = () => {};
</script>

<div class="space-y-1">
	{#if loading}
		<p class="text-sm text-gray-500">Loading plans…</p>
	{:else if plans.length === 0}
		<p class="text-sm text-gray-500 dark:text-gray-400">No operational plans.</p>
	{:else}
		{#each plans as plan (plan.id)}
			<button
				type="button"
				class="w-full text-left px-3 py-2 rounded text-sm {selectedPlanId === plan.id
					? 'bg-gray-200 dark:bg-gray-700 font-medium'
					: 'hover:bg-gray-100 dark:hover:bg-gray-800'}"
				on:click={() => onSelect(plan)}
			>
				<span class="block truncate">{plan.title}</span>
				<span class="block text-xs text-gray-500 dark:text-gray-400 mt-0.5">{plan.status}</span>
			</button>
		{/each}
	{/if}
</div>
