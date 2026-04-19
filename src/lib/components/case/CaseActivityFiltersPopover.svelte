<script lang="ts">
	import { FunnelIcon } from 'heroicons-svelte/24/outline';
	import { XMarkIcon } from 'heroicons-svelte/24/outline';

	import { DS_BTN_CLASSES, DS_STACK_CLASSES, DS_TYPE_CLASSES } from '$lib/case/detectivePrimitiveFoundation';
	import { P129_ACTIVITY_DOMAIN_FILTER_LABELS } from '$lib/case/p129ActivityDomainTheme';
	import {
		P129_ACTIVITY_LIST_CLEAR_FILTERS,
		P129_ACTIVITY_LIST_FILTER_ACTOR,
		P129_ACTIVITY_LIST_FILTER_ALL,
		P129_ACTIVITY_LIST_FILTER_DATE_FROM,
		P129_ACTIVITY_LIST_FILTER_DATE_TO,
		P129_ACTIVITY_LIST_FILTER_DOMAIN,
		P129_ACTIVITY_LIST_FILTERS,
		P129_ACTIVITY_LIST_FILTERS_ARIA_DIALOG,
		P129_ACTIVITY_LIST_FILTERS_CLOSE,
		P129_ACTIVITY_LIST_FILTERS_DONE
	} from '$lib/caseContext/p129ActivityListCopy';

	export let open = false;
	export let caseId: string;
	export let domainFilter = 'all';
	export let actorFilter = 'all';
	export let dateFrom = '';
	export let dateTo = '';
	export let actorFilterOptions: { userId: string; displayLabel: string }[] = [];
	export let filtersActive = false;
	export let onClear: () => void = () => {};

	function close() {
		open = false;
	}

	$: domainSelectId = `case-activity-filters-domain-${caseId}`;
	$: actorSelectId = `case-activity-filters-actor-${caseId}`;
	$: dateFromId = `case-activity-filters-date-from-${caseId}`;
	$: dateToId = `case-activity-filters-date-to-${caseId}`;
</script>

<div class="relative inline-flex min-w-0" data-case-activity-filter-wrap>
	<button
		type="button"
		class="{DS_BTN_CLASSES.secondary} relative inline-flex w-full min-h-[2.75rem] items-center justify-center gap-1.5 whitespace-nowrap px-3 py-2 text-sm min-[1024px]:min-h-0 min-[1024px]:w-auto min-[1024px]:max-w-[10rem]"
		aria-expanded={open}
		aria-haspopup="dialog"
		data-testid="case-activity-filters-trigger"
		on:click|stopPropagation={() => (open = !open)}
	>
		<FunnelIcon class="size-4 shrink-0 opacity-90" aria-hidden="true" />
		{P129_ACTIVITY_LIST_FILTERS}
		{#if filtersActive}
			<span
				class="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-[color:var(--ds-accent)] ring-2 ring-[color:var(--ds-bg-elevated)]"
				aria-hidden="true"
			></span>
		{/if}
	</button>
	{#if open}
		<div
			class="absolute right-0 top-full z-[60] mt-1 w-[min(calc(100vw-1.5rem),21rem)] rounded-[var(--ds-radius-lg)] border border-[color:var(--ds-border-default)] bg-[color:var(--ds-bg-elevated)] p-3 shadow-xl"
			role="dialog"
			aria-modal="true"
			aria-label={P129_ACTIVITY_LIST_FILTERS_ARIA_DIALOG}
			data-testid="case-activity-filters-panel"
			on:click|stopPropagation
		>
			<div class="mb-3 flex items-center justify-between gap-2">
				<span class="{DS_TYPE_CLASSES.section} m-0 text-sm">{P129_ACTIVITY_LIST_FILTERS}</span>
				<button
					type="button"
					class="ds-btn ds-btn-ghost min-h-0 rounded p-1"
					aria-label={P129_ACTIVITY_LIST_FILTERS_CLOSE}
					data-testid="case-activity-filters-close"
					on:click={close}
				>
					<XMarkIcon class="size-4 opacity-80" />
				</button>
			</div>
			<div class="{DS_STACK_CLASSES.stack} gap-3">
				<div>
					<label class="{DS_TYPE_CLASSES.label} text-xs uppercase tracking-wide opacity-80" for={domainSelectId}>
						{P129_ACTIVITY_LIST_FILTER_DOMAIN}
					</label>
					<select
						id={domainSelectId}
						class="mt-1 w-full rounded-md border border-[color:var(--ds-border-default)] bg-[color:var(--ds-bg-muted)]/40 px-2 py-2 text-sm"
						bind:value={domainFilter}
						data-testid="case-activity-domain-filter"
					>
						<option value="all">{P129_ACTIVITY_LIST_FILTER_ALL}</option>
						{#each P129_ACTIVITY_DOMAIN_FILTER_LABELS as d (d)}
							<option value={d}>{d}</option>
						{/each}
					</select>
				</div>
				<div>
					<label class="{DS_TYPE_CLASSES.label} text-xs uppercase tracking-wide opacity-80" for={actorSelectId}>
						{P129_ACTIVITY_LIST_FILTER_ACTOR}
					</label>
					<select
						id={actorSelectId}
						class="mt-1 w-full rounded-md border border-[color:var(--ds-border-default)] bg-[color:var(--ds-bg-muted)]/40 px-2 py-2 text-sm"
						bind:value={actorFilter}
						data-testid="case-activity-actor-filter"
					>
						<option value="all">{P129_ACTIVITY_LIST_FILTER_ALL}</option>
						{#each actorFilterOptions as row (row.userId)}
							<option value={row.userId}>{row.displayLabel}</option>
						{/each}
					</select>
				</div>
				<div>
					<label class="{DS_TYPE_CLASSES.label} text-xs uppercase tracking-wide opacity-80" for={dateFromId}>
						{P129_ACTIVITY_LIST_FILTER_DATE_FROM}
					</label>
					<input
						id={dateFromId}
						class="mt-1 w-full rounded-md border border-[color:var(--ds-border-default)] bg-[color:var(--ds-bg-muted)]/40 px-2 py-2 text-sm"
						type="date"
						bind:value={dateFrom}
						data-testid="case-activity-date-from"
					/>
				</div>
				<div>
					<label class="{DS_TYPE_CLASSES.label} text-xs uppercase tracking-wide opacity-80" for={dateToId}>
						{P129_ACTIVITY_LIST_FILTER_DATE_TO}
					</label>
					<input
						id={dateToId}
						class="mt-1 w-full rounded-md border border-[color:var(--ds-border-default)] bg-[color:var(--ds-bg-muted)]/40 px-2 py-2 text-sm"
						type="date"
						bind:value={dateTo}
						data-testid="case-activity-date-to"
					/>
				</div>
			</div>
			<button
				type="button"
				class="{DS_BTN_CLASSES.secondary} mt-3 w-full py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
				disabled={!filtersActive}
				data-testid="case-activity-clear-filters"
				on:click={() => {
					onClear();
				}}
			>
				{P129_ACTIVITY_LIST_CLEAR_FILTERS}
			</button>
			<button type="button" class="{DS_BTN_CLASSES.primary} mt-2 w-full py-2 text-sm" data-testid="case-activity-filters-done" on:click={close}>
				{P129_ACTIVITY_LIST_FILTERS_DONE}
			</button>
		</div>
	{/if}
</div>
