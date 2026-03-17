<script lang="ts">
	import type {
		TaskCoordinationSummary,
		SurveillanceSummary,
		EvidenceWorkflowSummary
	} from '$lib/apis/operationsApi';

	export let task_summary: TaskCoordinationSummary | null = null;
	export let surveillance_summary: SurveillanceSummary | null = null;
	export let evidence_summary: EvidenceWorkflowSummary | null = null;
	export let timeline_event_count: number = 0;
</script>

<div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
	{#if task_summary != null}
		<div class="rounded border border-gray-200 dark:border-gray-600 p-2 bg-gray-50 dark:bg-gray-800">
			<div class="text-xs text-gray-500 dark:text-gray-400">Tasks</div>
			<div class="text-sm font-medium">{task_summary.total_tasks} total</div>
			<div class="text-xs">Open: {task_summary.open_count} · Done: {task_summary.done_count}</div>
		</div>
	{/if}
	{#if surveillance_summary != null}
		<div class="rounded border border-gray-200 dark:border-gray-600 p-2 bg-gray-50 dark:bg-gray-800">
			<div class="text-xs text-gray-500 dark:text-gray-400">Surveillance</div>
			<div class="text-sm font-medium">{surveillance_summary.session_count} sessions</div>
			<div class="text-xs">{surveillance_summary.total_event_count} events</div>
		</div>
	{/if}
	{#if evidence_summary != null}
		<div class="rounded border border-gray-200 dark:border-gray-600 p-2 bg-gray-50 dark:bg-gray-800">
			<div class="text-xs text-gray-500 dark:text-gray-400">Evidence workflows</div>
			<div class="text-sm font-medium">{evidence_summary.workflow_count} workflows</div>
			<div class="text-xs">{evidence_summary.completed_steps}/{evidence_summary.total_steps} steps done</div>
		</div>
	{/if}
	<div class="rounded border border-gray-200 dark:border-gray-600 p-2 bg-gray-50 dark:bg-gray-800">
		<div class="text-xs text-gray-500 dark:text-gray-400">Timeline events</div>
		<div class="text-sm font-medium">{timeline_event_count}</div>
	</div>
</div>
