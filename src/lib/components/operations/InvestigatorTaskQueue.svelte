<script lang="ts">
	import type { OperationalTask } from '$lib/apis/operationsApi';
	import type { InvestigatorTaskQueueResponse } from '$lib/apis/operationsApi';

	export let queue: InvestigatorTaskQueueResponse | null = null;
	export let loading = false;

	function allTasks(): OperationalTask[] {
		if (!queue) return [];
		return [
			...queue.open,
			...queue.in_progress,
			...queue.done,
			...queue.cancelled
		];
	}
</script>

<div class="space-y-2">
	{#if loading}
		<p class="text-sm text-gray-500">Loading task queue…</p>
	{:else if !queue}
		<p class="text-sm text-gray-500 dark:text-gray-400">No queue loaded.</p>
	{:else}
		<div class="grid grid-cols-1 sm:grid-cols-4 gap-2">
			<div>
				<div class="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Open ({queue.open.length})</div>
				<ul class="space-y-1">
					{#each queue.open as t (t.id)}
						<li class="text-sm p-2 rounded border border-gray-200 dark:border-gray-600">{t.title}</li>
					{/each}
				</ul>
			</div>
			<div>
				<div class="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">In progress ({queue.in_progress.length})</div>
				<ul class="space-y-1">
					{#each queue.in_progress as t (t.id)}
						<li class="text-sm p-2 rounded border border-gray-200 dark:border-gray-600">{t.title}</li>
					{/each}
				</ul>
			</div>
			<div>
				<div class="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Done ({queue.done.length})</div>
				<ul class="space-y-1">
					{#each queue.done as t (t.id)}
						<li class="text-sm p-2 rounded border border-gray-200 dark:border-gray-600">{t.title}</li>
					{/each}
				</ul>
			</div>
			<div>
				<div class="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Cancelled ({queue.cancelled.length})</div>
				<ul class="space-y-1">
					{#each queue.cancelled as t (t.id)}
						<li class="text-sm p-2 rounded border border-gray-200 dark:border-gray-600 opacity-75">{t.title}</li>
					{/each}
				</ul>
			</div>
		</div>
		{#if allTasks().length === 0}
			<p class="text-sm text-gray-500 dark:text-gray-400">No tasks assigned to you.</p>
		{/if}
	{/if}
</div>
