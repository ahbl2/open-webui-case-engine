<script lang="ts">
	import { FunnelIcon } from 'heroicons-svelte/24/outline';
	import { XMarkIcon } from 'heroicons-svelte/24/outline';

	import { DS_BTN_CLASSES, DS_STACK_CLASSES, DS_TYPE_CLASSES } from '$lib/case/detectivePrimitiveFoundation';
	import type { CasesDateRange } from '$lib/utils/casesBrowse';

	/** Popover open state (toggle from trigger). */
	export let open = false;
	export let disabled = false;
	export let unitId = 'cases-filters-unit';
	export let statusId = 'cases-filters-status';
	export let dateRangeId = 'cases-filters-date-range';
	export let yearInputId = 'cases-filters-year';

	export let selectedUnit: 'ALL' | 'CID' | 'SIU';
	export let selectedStatus: 'ALL' | 'OPEN' | 'CLOSED';
	export let dateRange: CasesDateRange;
	export let incidentYear = '';

	export let onUnitChange: () => void = () => {};
	export let onStatusChange: () => void = () => {};

	$: yearFilterActive = /^\d{4}$/.test(incidentYear.trim());
	$: dateWindowDisabled = yearFilterActive;
	$: yearInputDisabled = dateRange !== 'all';

	function close() {
		open = false;
	}

	function onDateRangeSelectChange() {
		if (dateRange !== 'all') incidentYear = '';
	}

	function onYearInput() {
		if (/^\d{4}$/.test(incidentYear.trim())) {
			dateRange = 'all';
		}
	}
</script>

<div class="relative inline-flex min-w-0" data-cases-filter-wrap>
	<button
		type="button"
		class="{DS_BTN_CLASSES.secondary} inline-flex w-full min-h-[2.75rem] items-center justify-center gap-1.5 whitespace-nowrap px-3 py-2 text-sm min-[1024px]:min-h-0 min-[1024px]:w-auto min-[1024px]:max-w-[10rem]"
		aria-expanded={open}
		aria-haspopup="dialog"
		{disabled}
		on:click|stopPropagation={() => (open = !open)}
	>
		<FunnelIcon class="size-4 shrink-0 opacity-90" aria-hidden="true" />
		Filters
	</button>
	{#if open}
		<div
			class="absolute right-0 top-full z-[60] mt-1 w-[min(calc(100vw-1.5rem),21rem)] rounded-[var(--ds-radius-lg)] border border-[color:var(--ds-border-default)] bg-[color:var(--ds-bg-elevated)] p-3 shadow-xl"
			role="dialog"
			aria-modal="true"
			aria-label="Case filters"
			data-cases-filters-panel
			on:click|stopPropagation
		>
			<div class="mb-3 flex items-center justify-between gap-2">
				<span class="{DS_TYPE_CLASSES.section} text-sm m-0">Filters</span>
				<button
					type="button"
					class="ds-btn ds-btn-ghost rounded p-1 min-h-0"
					aria-label="Close filters"
					on:click={close}
				>
					<XMarkIcon class="size-4 opacity-80" />
				</button>
			</div>
			<div class="{DS_STACK_CLASSES.stack} gap-3">
				<div>
					<label class="{DS_TYPE_CLASSES.label} text-xs uppercase tracking-wide opacity-80" for={unitId}>Unit</label>
					<select
						id={unitId}
						class="mt-1 w-full rounded-md border border-[color:var(--ds-border-default)] bg-[color:var(--ds-bg-muted)]/40 px-2 py-2 text-sm"
						bind:value={selectedUnit}
						{disabled}
						on:change={onUnitChange}
					>
						<option value="ALL">All</option>
						<option value="CID">CID</option>
						<option value="SIU">SIU</option>
					</select>
				</div>
				<div>
					<label class="{DS_TYPE_CLASSES.label} text-xs uppercase tracking-wide opacity-80" for={statusId}>Status</label>
					<select
						id={statusId}
						class="mt-1 w-full rounded-md border border-[color:var(--ds-border-default)] bg-[color:var(--ds-bg-muted)]/40 px-2 py-2 text-sm"
						bind:value={selectedStatus}
						{disabled}
						on:change={onStatusChange}
					>
						<option value="ALL">All</option>
						<option value="OPEN">OPEN</option>
						<option value="CLOSED">CLOSED</option>
					</select>
				</div>
				<div>
					<label class="{DS_TYPE_CLASSES.label} text-xs uppercase tracking-wide opacity-80" for={dateRangeId}>Date window</label>
					<select
						id={dateRangeId}
						class="mt-1 w-full rounded-md border border-[color:var(--ds-border-default)] bg-[color:var(--ds-bg-muted)]/40 px-2 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-55"
						bind:value={dateRange}
						disabled={disabled || dateWindowDisabled}
						on:change={onDateRangeSelectChange}
					>
						<option value="all">All dates</option>
						<option value="30d">Last 30 days</option>
						<option value="90d">Last 90 days</option>
						<option value="365d">Last 12 months</option>
					</select>
					{#if dateWindowDisabled}
						<p class="{DS_TYPE_CLASSES.meta} mt-1 text-[color:var(--ds-text-muted)]">
							Clear incident year below to use a date window.
						</p>
					{/if}
				</div>
				<div>
					<label class="{DS_TYPE_CLASSES.label} text-xs uppercase tracking-wide opacity-80" for={yearInputId}>Incident year</label>
					<input
						id={yearInputId}
						type="text"
						inputmode="numeric"
						maxlength="4"
						autocomplete="off"
						placeholder="e.g. 2024"
						class="mt-1 w-full rounded-md border border-[color:var(--ds-border-default)] bg-[color:var(--ds-bg-muted)]/40 px-2 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-55"
						bind:value={incidentYear}
						disabled={disabled || yearInputDisabled}
						on:input={onYearInput}
					/>
					{#if yearInputDisabled}
						<p class="{DS_TYPE_CLASSES.meta} mt-1 text-[color:var(--ds-text-muted)]">
							Set date window to “All dates” to filter by year.
						</p>
					{/if}
				</div>
			</div>
			<button type="button" class="{DS_BTN_CLASSES.primary} mt-3 w-full py-2 text-sm" on:click={close}>Done</button>
		</div>
	{/if}
</div>
