<!--
	Left column for timeline feed rows: operational date pill (first row of day), local time,
	colored arrow + circular emblem matching Quick add template styling.
-->
<script lang="ts">
	import { formatOperationalOccurredTime12h } from '$lib/utils/formatDateTime';
	import { timelineRailEmblemForType } from '$lib/caseTimeline/timelineEntryRailEmblem';

	/** Banner label for this operational day (e.g. MARCH 31, 2026). */
	export let dayLabel: string;
	/** When true, show the date pill (first entry of the calendar day group). */
	export let showDatePill = false;
	/** ISO occurred_at for time + datetime attribute. */
	export let occurredAt: string;
	export let entryType: string;

	$: parts = timelineRailEmblemForType(entryType);
	$: timeLabel = formatOperationalOccurredTime12h(occurredAt);
</script>

<div
	class="ce-timeline-entry-left-rail flex w-[5.75rem] shrink-0 flex-col items-stretch gap-1.5 pt-0.5 sm:w-[6.5rem]"
	data-testid="timeline-entry-left-rail"
	aria-hidden="false"
>
	{#if showDatePill}
		<div
			class="relative z-[2] rounded-md border border-slate-500/35 bg-[color:var(--ds-bg-muted)] px-1.5 py-1 text-center text-[9px] font-semibold uppercase leading-tight tracking-wide text-[color:var(--ds-text-primary)] shadow-sm"
			data-testid="timeline-entry-rail-date"
		>
			{dayLabel}
		</div>
	{:else}
		<div class="min-h-[1.625rem]" aria-hidden="true"></div>
	{/if}

	<div class="relative z-[2] flex flex-1 flex-col items-end gap-1.5">
		<div class="relative z-[2] flex w-full items-center justify-end gap-1 pl-0">
			<time
				class="text-[11px] tabular-nums text-[color:var(--ds-text-secondary)]"
				datetime={occurredAt}
				data-testid="timeline-entry-rail-time"
				title={occurredAt}
			>
				{timeLabel}
			</time>
			<span class="text-[10px] font-medium leading-none {parts.arrowClass}" aria-hidden="true">→</span>
			<div
				class="flex size-7 shrink-0 items-center justify-center rounded-full border-2 text-[10px] font-semibold leading-none tracking-tight {parts.circleClass}"
				data-testid="timeline-entry-rail-emblem"
			>
				{parts.emblem}
			</div>
		</div>
	</div>
</div>
