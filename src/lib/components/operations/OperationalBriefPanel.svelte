<script lang="ts">
	import type { OperationalBrief } from '$lib/apis/operationsApi';
	import OperationalSummaryCards from './OperationalSummaryCards.svelte';

	export let brief: OperationalBrief | null = null;
	export let loading = false;

	function formatTime(iso: string): string {
		try {
			return new Date(iso).toLocaleString();
		} catch {
			return iso;
		}
	}
</script>

<div class="space-y-4">
	{#if loading}
		<p class="text-sm text-gray-500 dark:text-gray-400">Loading brief…</p>
	{:else if !brief}
		<p class="text-sm text-gray-500 dark:text-gray-400">No operational brief available.</p>
	{:else}
		<div class="text-xs text-gray-500 dark:text-gray-400">
			Generated: {formatTime(brief.generated_at)}
			{#if brief.operational_plan_id}
				· Plan-specific
			{:else}
				· Case-wide
			{/if}
		</div>

		<OperationalSummaryCards
			task_summary={brief.task_summary}
			surveillance_summary={brief.surveillance_summary}
			evidence_summary={brief.evidence_summary}
			timeline_event_count={brief.timeline_event_count}
		/>

		{#if brief.plan_summary}
			<section class="rounded border border-gray-200 dark:border-gray-600 p-3">
				<h4 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Plan summary</h4>
				<p class="text-sm">{brief.plan_summary.title} · {brief.plan_summary.status}</p>
				<p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
					Tasks: {brief.plan_summary.task_count} ({brief.plan_summary.completed_task_count} completed) ·
					Sessions: {brief.plan_summary.surveillance_session_count} ·
					Workflows: {brief.plan_summary.evidence_workflow_count}
				</p>
			</section>
		{/if}

		<section class="rounded border border-gray-200 dark:border-gray-600 p-3">
			<h4 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Surveillance summary</h4>
			<p class="text-sm">
				{brief.surveillance_summary.session_count} sessions ·
				{brief.surveillance_summary.total_event_count} events ·
				{brief.surveillance_summary.active_session_count} active ·
				{brief.surveillance_summary.completed_session_count} completed
			</p>
			{#if brief.surveillance_summary.latest_session_at}
				<p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
					Latest session: {formatTime(brief.surveillance_summary.latest_session_at)}
				</p>
			{/if}
		</section>

		<section class="rounded border border-gray-200 dark:border-gray-600 p-3">
			<h4 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Evidence workflow summary</h4>
			<p class="text-sm">
				{brief.evidence_summary.workflow_count} workflows ·
				{brief.evidence_summary.completed_steps}/{brief.evidence_summary.total_steps} steps completed ·
				{brief.evidence_summary.pending_steps} pending
			</p>
		</section>

		<section class="rounded border border-gray-200 dark:border-gray-600 p-3">
			<h4 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Task coordination summary</h4>
			<p class="text-sm">
				{brief.task_summary.total_tasks} total ·
				Open: {brief.task_summary.open_count} ·
				In progress: {brief.task_summary.in_progress_count} ·
				Done: {brief.task_summary.done_count} ·
				Cancelled: {brief.task_summary.cancelled_count}
			</p>
			<p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
				Assigned: {brief.task_summary.assigned_count} · Unassigned: {brief.task_summary.unassigned_count}
			</p>
		</section>

		<section class="rounded border border-gray-200 dark:border-gray-600 p-3">
			<h4 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Recent timeline events ({brief.recent_timeline_events.length})</h4>
			{#if brief.recent_timeline_events.length === 0}
				<p class="text-xs text-gray-500 dark:text-gray-400">No recent events.</p>
			{:else}
				<ul class="list-none space-y-1 mt-1">
					{#each brief.recent_timeline_events as ev (ev.id)}
						<li class="text-sm py-0.5 border-b border-gray-100 dark:border-gray-700 last:border-0">
							<span class="text-gray-500 dark:text-gray-400">{formatTime(ev.timestamp)}</span>
							<span class="font-medium ml-1">{ev.event_type}</span>
							{#if ev.description}
								<span class="ml-1">{ev.description}</span>
							{/if}
						</li>
					{/each}
				</ul>
			{/if}
		</section>
	{/if}
</div>
