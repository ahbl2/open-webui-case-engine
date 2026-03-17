<script lang="ts">
	import type { OperationProgressSummaryResponse } from '$lib/apis/operationsApi';

	export let summary: OperationProgressSummaryResponse | null = null;
</script>

<div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
	{#if summary}
		<div class="rounded border border-gray-200 dark:border-gray-600 p-2 bg-gray-50 dark:bg-gray-800/50">
			<div class="text-xs text-gray-500 dark:text-gray-400">Total tasks</div>
			<div class="font-medium">{summary.total_tasks}</div>
		</div>
		<div class="rounded border border-gray-200 dark:border-gray-600 p-2 bg-gray-50 dark:bg-gray-800/50">
			<div class="text-xs text-gray-500 dark:text-gray-400">Open</div>
			<div class="font-medium">{summary.open_count}</div>
		</div>
		<div class="rounded border border-gray-200 dark:border-gray-600 p-2 bg-gray-50 dark:bg-gray-800/50">
			<div class="text-xs text-gray-500 dark:text-gray-400">In progress</div>
			<div class="font-medium">{summary.in_progress_count}</div>
		</div>
		<div class="rounded border border-gray-200 dark:border-gray-600 p-2 bg-gray-50 dark:bg-gray-800/50">
			<div class="text-xs text-gray-500 dark:text-gray-400">Done</div>
			<div class="font-medium">{summary.done_count}</div>
		</div>
		<div class="rounded border border-gray-200 dark:border-gray-600 p-2 bg-gray-50 dark:bg-gray-800/50">
			<div class="text-xs text-gray-500 dark:text-gray-400">Cancelled</div>
			<div class="font-medium">{summary.cancelled_count}</div>
		</div>
		<div class="rounded border border-gray-200 dark:border-gray-600 p-2 bg-gray-50 dark:bg-gray-800/50">
			<div class="text-xs text-gray-500 dark:text-gray-400">Assigned</div>
			<div class="font-medium">{summary.assigned_count}</div>
		</div>
		<div class="rounded border border-gray-200 dark:border-gray-600 p-2 bg-gray-50 dark:bg-gray-800/50">
			<div class="text-xs text-gray-500 dark:text-gray-400">Unassigned</div>
			<div class="font-medium">{summary.unassigned_count}</div>
		</div>
		<div class="rounded border border-gray-200 dark:border-gray-600 p-2 bg-gray-50 dark:bg-gray-800/50">
			<div class="text-xs text-gray-500 dark:text-gray-400">Completed</div>
			<div class="font-medium">{summary.completed_count}</div>
		</div>
	{:else}
		<div class="col-span-2 sm:col-span-4 text-sm text-gray-500">No summary loaded.</div>
	{/if}
</div>
