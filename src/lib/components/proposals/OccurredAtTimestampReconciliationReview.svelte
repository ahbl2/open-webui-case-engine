<script lang="ts">
	/**
	 * P41-05 — Read-only summary of Case Engine model vs deterministic timestamp reconciliation.
	 */
	import type { OccurredAtTimestampReconciliation } from '$lib/apis/caseEngine';
	import {
		occurredAtTimestampReconciliationBadgeClass,
		occurredAtTimestampReconciliationLabel
	} from '$lib/caseTimeline/occurredAtTimestampReconciliationUi';

	export let rec: OccurredAtTimestampReconciliation;
</script>

<div
	class="mt-2 rounded-md border border-slate-200/90 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-950/25 px-2 py-2 space-y-1"
	data-testid="occurred-at-timestamp-reconciliation"
>
	<p class="text-[9px] font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-200">
		Model vs deterministic time
	</p>
	<p class="text-[9px] text-slate-600 dark:text-slate-300 leading-snug">
		Rule-based comparison of the proposal <strong>Occurred at</strong> field and deterministic
		candidates from the excerpt. Calendar-day lines use the server operational timezone (default
		<strong>America/New_York</strong>) for review — stored instants stay UTC. <strong
			>Informational only</strong
		>
		— it does not change timestamps, approval, or commit.
	</p>
	{#if rec.operational_timezone || rec.model_operational_calendar_ymd != null}
		<p
			class="text-[9px] text-slate-500 dark:text-slate-400 font-mono"
			data-testid="reconciliation-operational-context"
		>
			{#if rec.operational_timezone}<span>Zone: {rec.operational_timezone}</span>{/if}
			{#if rec.model_operational_calendar_ymd != null && rec.model_operational_calendar_ymd !== ''}
				<span class={rec.operational_timezone ? ' ml-2' : ''}
					>Model local date: {rec.model_operational_calendar_ymd}</span
				>
			{/if}
		</p>
	{/if}
	<div class="flex flex-wrap items-center gap-1.5">
		<span
			class="text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded {occurredAtTimestampReconciliationBadgeClass(
				rec.reconciliation_state
			)}"
			data-testid="reconciliation-state-badge"
			data-reconciliation-state={rec.reconciliation_state}
		>
			{occurredAtTimestampReconciliationLabel(rec.reconciliation_state)}
		</span>
		{#if rec.model_occurred_at_normalized_utc}
			<span class="text-[9px] text-slate-500 dark:text-slate-400 font-mono truncate max-w-[14rem]">
				Model (UTC): {rec.model_occurred_at_normalized_utc}
			</span>
		{/if}
	</div>
	{#if rec.matched_candidate_summary}
		<p class="text-[9px] text-slate-600 dark:text-slate-400">
			<span class="font-semibold text-slate-700 dark:text-slate-300">Reference:</span>
			{rec.matched_candidate_summary}
			{#if rec.matched_candidate_index != null}
				<span class="font-mono text-slate-500">(index {rec.matched_candidate_index})</span>
			{/if}
		</p>
	{/if}
</div>
