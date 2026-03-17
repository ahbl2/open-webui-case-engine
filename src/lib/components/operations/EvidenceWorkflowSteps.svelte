<script lang="ts">
	import type { EvidenceWorkflow, EvidenceWorkflowStep } from '$lib/apis/operationsApi';

	export let workflow: EvidenceWorkflow;
	export let loading = false;
	export let onCompleteStep: (stepId: string) => Promise<void> = async () => {};
	export let completingStepId: string | null = null;

	$: steps = workflow?.steps ?? [];
	$: total = steps.length;
	$: completed = steps.filter((s) => s.status === 'COMPLETED').length;
	$: progressPercent = total === 0 ? 100 : Math.round((completed / total) * 100);
</script>

<div class="border border-gray-200 dark:border-gray-600 rounded p-2 space-y-2">
	<div class="text-xs text-gray-500 dark:text-gray-400">
		Progress: {completed}/{total} steps ({progressPercent}%)
	</div>
	<ul class="list-none space-y-1">
		{#each steps as step (step.step_id)}
			<li
				class="flex items-center justify-between gap-2 py-1.5 px-2 rounded {step.status === 'COMPLETED'
					? 'bg-gray-100 dark:bg-gray-700'
					: 'bg-white dark:bg-gray-800'} border border-gray-200 dark:border-gray-600"
			>
				<div class="min-w-0 flex-1">
					<span class="text-sm font-medium">{step.title}</span>
					{#if step.description}
						<p class="text-xs text-gray-500 dark:text-gray-400 truncate">{step.description}</p>
					{/if}
					<span class="text-xs text-gray-400 dark:text-gray-500">{step.status}</span>
					{#if step.completed_at}
						<span class="text-xs text-gray-400 dark:text-gray-500 ml-1">· {new Date(step.completed_at).toLocaleString()}</span>
					{/if}
				</div>
				{#if step.status !== 'COMPLETED'}
					<button
						type="button"
						class="text-xs px-2 py-1 rounded bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
						disabled={loading || completingStepId === step.step_id}
						on:click={() => onCompleteStep(step.step_id)}
					>
						{completingStepId === step.step_id ? '…' : 'Complete'}
					</button>
				{/if}
			</li>
		{/each}
	</ul>
	{#if steps.length === 0}
		<p class="text-sm text-gray-500 dark:text-gray-400">No steps.</p>
	{/if}
</div>
