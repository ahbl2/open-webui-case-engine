<!--
	Timeline tab — OCC-style right column (mockup parity): AI summary, quick-add templates, stats.
	Presentation + honest metrics from loaded entries; AI summary body is placeholder until wired.
-->
<script lang="ts">
	import { goto } from '$app/navigation';
	import type { TimelineEntryTypeValue } from '$lib/caseTimeline/timelineEntryTypeOptions';
	import { timelineTypeQuickAddCircleClass } from '$lib/caseTimeline/timelineEntryTypeAccents';
	import {
		DS_BADGE_CLASSES,
		DS_BTN_CLASSES,
		DS_STACK_CLASSES,
		DS_SUMMARY_CLASSES,
		DS_TYPE_CLASSES
	} from '$lib/case/detectivePrimitiveFoundation';

	export let caseId: string;
	export let loading = false;
	/** Server total for the current query (matches header). */
	export let totalEntries = 0;
	export let entriesThisWeek = 0;
	export let lateLogCount = 0;
	export let chronologyGaps = 0;
	export let typeBars: { label: string; count: number; barClass: string; pct: number }[] = [];

	export let onQuickAdd: (preset: TimelineEntryTypeValue) => void = () => {};
	export let onReviewGaps: (() => void) | undefined = undefined;

	function goChat() {
		void goto(`/case/${encodeURIComponent(caseId)}/chat`);
	}
</script>

<div
	class="{DS_STACK_CLASSES.stack} min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden pe-0.5"
	data-testid="case-timeline-occ-sidebar"
>
	<!-- AI Timeline Summary -->
	<section
		class="{DS_SUMMARY_CLASSES.modulePrimary} {DS_STACK_CLASSES.stack} shrink-0"
		aria-labelledby="case-timeline-ai-summary-heading"
	>
		<div class="flex flex-wrap items-center gap-2 justify-between">
			<h2 id="case-timeline-ai-summary-heading" class="{DS_TYPE_CLASSES.panel} m-0">
				AI Timeline Summary
			</h2>
			<span class="{DS_BADGE_CLASSES.base} {DS_BADGE_CLASSES.success} text-[10px]">Beta</span>
		</div>
		<p class="{DS_TYPE_CLASSES.meta} m-0 text-[color:var(--ce-l-text-muted)]">
			Updated when synthesis is wired to this case.
		</p>
		<p class="{DS_TYPE_CLASSES.body} m-0 text-[color:var(--ce-l-text-secondary)] leading-snug">
			{#if loading}
				Loading timeline context…
			{:else if totalEntries === 0}
				Add entries to generate a structured chronology summary.
			{:else}
				High-level narrative from official timeline entries will appear here — same doctrine as Case Summary:
				evidence-linked, operator-reviewable.
			{/if}
		</p>
		<div class="flex flex-col gap-2 sm:flex-row sm:items-center">
			<button
				type="button"
				class="{DS_BTN_CLASSES.secondary} w-full sm:w-auto"
				disabled={true}
				title="Not available yet"
			>
				Regenerate
			</button>
			<button
				type="button"
				class="{DS_BTN_CLASSES.ghost} w-full sm:flex-1 text-start"
				on:click={goChat}
				data-testid="case-timeline-ai-ask-chat"
			>
				Ask AI about timeline…
			</button>
		</div>
	</section>

	<!-- Quick add -->
	<section
		class="{DS_SUMMARY_CLASSES.modulePrimary} {DS_STACK_CLASSES.stack} shrink-0"
		aria-labelledby="case-timeline-quick-add-heading"
	>
		<h2 id="case-timeline-quick-add-heading" class="{DS_TYPE_CLASSES.panel} m-0">Quick add templates</h2>
		<div class="grid grid-cols-2 gap-2 sm:grid-cols-3" role="group" aria-label="Quick add timeline entry type">
			<button
				type="button"
				class="flex flex-col items-center gap-1.5 rounded-lg border border-[color:var(--ce-l-border-strong)] bg-[color:var(--ce-l-canvas)] px-2 py-3 text-center transition hover:bg-[color:var(--ce-l-chrome)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--ds-accent)] disabled:opacity-50"
				disabled={loading}
				on:click={() => onQuickAdd('surveillance')}
				data-testid="case-timeline-quick-add-surveillance"
			>
				<span
					class="size-8 rounded-full flex items-center justify-center text-xs font-semibold {timelineTypeQuickAddCircleClass('surveillance')}"
					>S</span>
				<span class="text-[11px] font-medium text-[color:var(--ce-l-text-primary)]">Surveillance</span>
			</button>
			<button
				type="button"
				class="flex flex-col items-center gap-1.5 rounded-lg border border-[color:var(--ce-l-border-strong)] bg-[color:var(--ce-l-canvas)] px-2 py-3 text-center transition hover:bg-[color:var(--ce-l-chrome)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--ds-accent)] disabled:opacity-50"
				disabled={loading}
				on:click={() => onQuickAdd('interview')}
				data-testid="case-timeline-quick-add-interview"
			>
				<span
					class="size-8 rounded-full flex items-center justify-center text-[10px] font-semibold leading-none tracking-tight {timelineTypeQuickAddCircleClass('interview')}"
					title="Interview (Int)"
					aria-hidden="true"
				>Int</span>
				<span class="text-[11px] font-medium text-[color:var(--ce-l-text-primary)]">Interview</span>
			</button>
			<button
				type="button"
				class="flex flex-col items-center gap-1.5 rounded-lg border border-[color:var(--ce-l-border-strong)] bg-[color:var(--ce-l-canvas)] px-2 py-3 text-center transition hover:bg-[color:var(--ce-l-chrome)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--ds-accent)] disabled:opacity-50"
				disabled={loading}
				on:click={() => onQuickAdd('evidence')}
				data-testid="case-timeline-quick-add-evidence"
			>
				<span
					class="size-8 rounded-full flex items-center justify-center text-xs font-semibold {timelineTypeQuickAddCircleClass('evidence')}"
					>E</span>
				<span class="text-[11px] font-medium text-[color:var(--ce-l-text-primary)]">Evidence</span>
			</button>
			<button
				type="button"
				class="flex flex-col items-center gap-1.5 rounded-lg border border-[color:var(--ce-l-border-strong)] bg-[color:var(--ce-l-canvas)] px-2 py-3 text-center transition hover:bg-[color:var(--ce-l-chrome)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--ds-accent)] disabled:opacity-50"
				disabled={loading}
				on:click={() => onQuickAdd('controlled_buy')}
				data-testid="case-timeline-quick-add-controlled-buy"
			>
				<span
					class="size-8 rounded-full flex items-center justify-center text-xs font-semibold {timelineTypeQuickAddCircleClass('controlled_buy')}"
					>C</span>
				<span class="text-[11px] font-medium text-[color:var(--ce-l-text-primary)]">Controlled Buy</span>
			</button>
			<button
				type="button"
				class="flex flex-col items-center gap-1.5 rounded-lg border border-[color:var(--ce-l-border-strong)] bg-[color:var(--ce-l-canvas)] px-2 py-3 text-center transition hover:bg-[color:var(--ce-l-chrome)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--ds-accent)] disabled:opacity-50"
				disabled={loading}
				on:click={() => onQuickAdd('search_warrant')}
				data-testid="case-timeline-quick-add-warrant"
			>
				<span
					class="size-8 rounded-full flex items-center justify-center text-xs font-semibold {timelineTypeQuickAddCircleClass('search_warrant')}"
					>W</span>
				<span class="text-[11px] font-medium text-[color:var(--ce-l-text-primary)]">Search Warrant</span>
			</button>
			<button
				type="button"
				class="flex flex-col items-center gap-1.5 rounded-lg border border-[color:var(--ce-l-border-strong)] bg-[color:var(--ce-l-canvas)] px-2 py-3 text-center transition hover:bg-[color:var(--ce-l-chrome)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--ds-accent)] disabled:opacity-50"
				disabled={loading}
				on:click={() => onQuickAdd('incident')}
				data-testid="case-timeline-quick-add-incident"
			>
				<span
					class="size-8 rounded-full flex items-center justify-center text-[10px] font-semibold leading-none tracking-tight {timelineTypeQuickAddCircleClass('incident')}"
					title="Incident (Inc)"
					aria-hidden="true"
				>Inc</span>
				<span class="text-[11px] font-medium text-[color:var(--ce-l-text-primary)]">Incident</span>
			</button>
		</div>
	</section>

	<!-- Stats -->
	<section
		class="{DS_SUMMARY_CLASSES.modulePrimary} {DS_STACK_CLASSES.stack} shrink-0"
		aria-labelledby="case-timeline-stats-heading"
	>
		<h2 id="case-timeline-stats-heading" class="{DS_TYPE_CLASSES.panel} m-0">Timeline stats</h2>
		<div class="grid grid-cols-1 gap-2 sm:grid-cols-3 text-center">
			<div class="rounded-md bg-[color:var(--ce-l-chrome)] px-2 py-2">
				<div class="text-lg font-semibold tabular-nums text-[color:var(--ce-l-text-primary)]">{totalEntries}</div>
				<div class="text-[10px] uppercase tracking-wide text-[color:var(--ce-l-text-muted)]">Total entries</div>
			</div>
			<div class="rounded-md bg-[color:var(--ce-l-chrome)] px-2 py-2">
				<div class="text-lg font-semibold tabular-nums text-[color:var(--ce-l-text-primary)]">{entriesThisWeek}</div>
				<div class="text-[10px] uppercase tracking-wide text-[color:var(--ce-l-text-muted)]">This week</div>
			</div>
			<div class="rounded-md bg-amber-500/10 px-2 py-2">
				<div class="text-lg font-semibold tabular-nums text-amber-900 dark:text-amber-100">{lateLogCount}</div>
				<div class="text-[10px] uppercase tracking-wide text-[color:var(--ce-l-text-muted)]">Late-log alerts</div>
			</div>
		</div>
		<div>
			<p class="{DS_TYPE_CLASSES.meta} m-0 mb-2 text-[color:var(--ce-l-text-muted)]">Entry types (top 6)</p>
			<ul class="flex flex-col gap-2" data-testid="case-timeline-type-distribution">
				{#each typeBars as row (row.label)}
					<li class="flex flex-col gap-0.5 min-w-0">
						<div class="flex justify-between text-[11px] text-[color:var(--ce-l-text-secondary)]">
							<span class="truncate">{row.label}</span>
							<span class="tabular-nums">{row.count}</span>
						</div>
						<div
							class="h-1.5 w-full rounded-full bg-[color:var(--ce-l-chrome)] overflow-hidden"
							aria-hidden="true"
						>
							<div class="h-full rounded-full {row.barClass}" style:width={`${row.pct}%`}></div>
						</div>
					</li>
				{/each}
			</ul>
		</div>
		{#if chronologyGaps > 0}
			<div
				class="flex items-center justify-between gap-2 rounded-md border border-amber-500/35 bg-amber-500/10 px-3 py-2 text-xs text-amber-950 dark:text-amber-100"
				role="status"
			>
				<span>{chronologyGaps} potential chronology gaps</span>
				<button
					type="button"
					class="{DS_BTN_CLASSES.ghost} !px-2 !py-0.5 text-xs"
					on:click={() => onReviewGaps?.()}
					data-testid="case-timeline-chronology-gaps-review"
				>
					Review
				</button>
			</div>
		{/if}
	</section>
</div>
