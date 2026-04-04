<script lang="ts">
	/**
	 * P41-09 — Read-only advisory summary from Case Engine `occurred_at_guidance`.
	 */
	import type { OccurredAtGuidance } from '$lib/apis/caseEngine';

	export let guidance: OccurredAtGuidance;

	const stateLabel: Record<string, string> = {
		clear_deterministic_exact: 'Clear — deterministic instant matches model',
		deterministic_preferred: 'Prefer deterministic source time',
		model_preferred: 'Prefer model Occurred at',
		date_level_alignment: 'Same calendar date — check precision',
		ambiguous_requires_operator_choice: 'Ambiguous — operator must choose',
		partial_requires_operator_input: 'Partial time evidence — confirm manually',
		conflict_requires_operator_review: 'Conflict — review before commit',
		no_timestamp_available: 'No usable timestamp signals',
		unresolved: 'Unresolved — manual review'
	};

	$: label =
		typeof guidance.guidance_state === 'string' && stateLabel[guidance.guidance_state]
			? stateLabel[guidance.guidance_state]!
			: String(guidance.guidance_state ?? '—');

	$: confBadge =
		guidance.confidence_label === 'high'
			? 'bg-emerald-100/90 text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-100'
			: guidance.confidence_label === 'medium'
				? 'bg-sky-100/90 text-sky-950 dark:bg-sky-950/40 dark:text-sky-100'
				: 'bg-amber-100/90 text-amber-950 dark:bg-amber-950/40 dark:text-amber-100';
</script>

<div
	class="mt-2 rounded-md border border-violet-200/90 dark:border-violet-800/80 bg-violet-50/40 dark:bg-violet-950/20 px-2 py-2 space-y-1"
	data-testid="occurred-at-guidance-review"
>
	<p class="text-[9px] font-semibold uppercase tracking-wider text-violet-800 dark:text-violet-200">
		Advisory — timestamp guidance
	</p>
	<p class="text-[9px] text-violet-900/90 dark:text-violet-100/90 leading-snug">
		<strong>Not authoritative.</strong> This line summarizes deterministic hints, reconciliation, and
		segment assist (when enabled). It does <strong>not</strong> change Occurred at, approval, or
		commit.
	</p>
	<div class="flex flex-wrap items-center gap-1.5">
		<span
			class="text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded {confBadge}"
			data-testid="occurred-at-guidance-confidence"
			data-confidence={guidance.confidence_label}
		>
			{guidance.confidence_label} confidence
		</span>
		<span
			class="text-[9px] font-semibold text-violet-900 dark:text-violet-100"
			data-testid="occurred-at-guidance-state"
			data-guidance-state={guidance.guidance_state}
		>
			{label}
		</span>
	</div>
	{#if guidance.recommended_summary}
		<p class="text-[9px] text-violet-900/85 dark:text-violet-100/85 leading-snug">
			{guidance.recommended_summary}
		</p>
	{/if}
	{#if guidance.recommended_candidate_index != null}
		<p class="text-[9px] text-violet-800/80 dark:text-violet-200/80 font-mono">
			Suggested candidate index (advisory): {guidance.recommended_candidate_index}
		</p>
	{/if}
	<p
		class="text-[8px] text-violet-700/70 dark:text-violet-300/70 font-mono leading-tight"
		data-testid="occurred-at-guidance-inputs-snapshot"
	>
		Zone: {guidance.operational_timezone} · reconciliation:
		{guidance.inputs_snapshot.reconciliation_state} · deterministic count:
		{guidance.inputs_snapshot.deterministic_candidate_count} · AI assist:
		{guidance.inputs_snapshot.has_ai_assist ? 'yes' : 'no'}
		{#if guidance.inputs_snapshot.ai_suggested_candidate_index != null}
			· AI index: {guidance.inputs_snapshot.ai_suggested_candidate_index}
		{/if}
	</p>
</div>
