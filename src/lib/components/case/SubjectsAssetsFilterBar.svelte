<script lang="ts">
	/**
	 * Global search + type / status / identity facets + view mode — mockup-aligned strip below the board title.
	 */
	import { FunnelIcon, MagnifyingGlassIcon } from 'heroicons-svelte/24/outline';
	import { DS_BTN_CLASSES } from '$lib/case/detectivePrimitiveFoundation';

	export let globalSearch = '';
	export let layoutView: 'cards' | 'table' | 'graph' = 'cards';
	/** When not `all`, only that registry column is shown. */
	export let typeFilter: 'all' | 'PERSON' | 'VEHICLE' | 'LOCATION' | 'PHONE' = 'all';
	/** Maps to workspace status + API `includeRetired`. Default `active` matches prior per-panel default. */
	export let statusFilter: 'all' | 'active' | 'retired' = 'active';
	/**
	 * Person identity posture (`''` = all). Other kinds hidden when set (people-only facet).
	 */
	export let tagFilter = '';

	const segBtn =
		'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wide transition';

	const selectClass =
		'min-w-[8.5rem] rounded-lg border border-[color:var(--ce-l-border-default)] bg-[color:var(--ce-l-surface-elevated)] px-2 py-1.5 text-xs text-[color:var(--ce-l-text-primary)] focus:border-[color:var(--ce-l-border-strong)] focus:outline-none focus:ring-1 focus:ring-[color:var(--ce-l-border-strong)]';

	function clearFilters(): void {
		globalSearch = '';
		typeFilter = 'all';
		statusFilter = 'active';
		tagFilter = '';
	}

	$: hasActiveFilters =
		globalSearch.trim().length > 0 ||
		typeFilter !== 'all' ||
		statusFilter !== 'active' ||
		tagFilter.trim().length > 0;
</script>

<div
	class="flex flex-col gap-3 border-b border-[color:var(--ce-l-border-subtle)] bg-[color:var(--ce-l-surface-raised)]/80 px-1 py-3"
	data-testid="subjects-assets-filter-bar"
>
	<div class="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between sm:gap-3">
		<div class="relative min-w-[min(100%,20rem)] flex-1">
			<label class="sr-only" for="subjects-assets-global-search">Search subjects and assets</label>
			<MagnifyingGlassIcon
				class="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--ce-l-text-muted)]"
				aria-hidden="true"
			/>
			<input
				id="subjects-assets-global-search"
				type="search"
				class="w-full rounded-lg border border-[color:var(--ce-l-border-default)] bg-[color:var(--ce-l-surface-elevated)] py-2 pl-9 pr-3 text-sm text-[color:var(--ce-l-text-primary)] placeholder:text-[color:var(--ce-l-text-muted)] focus:border-[color:var(--ce-l-border-strong)] focus:outline-none focus:ring-1 focus:ring-[color:var(--ce-l-border-strong)]"
				placeholder="Search names, aliases, phones, IDs…"
				bind:value={globalSearch}
				autocomplete="off"
				data-testid="subjects-assets-global-search"
			/>
		</div>

		<div
			class="flex min-w-0 flex-wrap items-end gap-2 sm:gap-2.5"
			data-testid="subjects-assets-filter-dropdowns"
		>
			<span class="sr-only">Facet filters</span>
			<FunnelIcon
				class="mb-0.5 h-4 w-4 shrink-0 self-end text-[color:var(--ce-l-text-muted)]"
				aria-hidden="true"
			/>
			<label
				class="flex min-w-0 flex-col gap-0.5 text-[10px] font-semibold uppercase tracking-wide text-[color:var(--ce-l-text-muted)]"
			>
				Type
				<select class={selectClass} bind:value={typeFilter} data-testid="subjects-assets-filter-type">
					<option value="all">All types</option>
					<option value="PERSON">People</option>
					<option value="VEHICLE">Vehicles</option>
					<option value="LOCATION">Locations</option>
					<option value="PHONE">Phones</option>
				</select>
			</label>
			<label
				class="flex min-w-0 flex-col gap-0.5 text-[10px] font-semibold uppercase tracking-wide text-[color:var(--ce-l-text-muted)]"
			>
				Status
				<select class={selectClass} bind:value={statusFilter} data-testid="subjects-assets-filter-status">
					<option value="all">All statuses</option>
					<option value="active">Active</option>
					<option value="retired">Retired</option>
				</select>
			</label>
			<label
				class="flex min-w-0 flex-col gap-0.5 text-[10px] font-semibold uppercase tracking-wide text-[color:var(--ce-l-text-muted)]"
			>
				Identity
				<select class={selectClass} bind:value={tagFilter} data-testid="subjects-assets-filter-identity">
					<option value="">All</option>
					<option value="IDENTIFIED">Identified</option>
					<option value="UNKNOWN_PARTIAL">Unknown (partial)</option>
					<option value="UNKNOWN_PLACEHOLDER">Placeholder</option>
				</select>
			</label>
			<button
				type="button"
				class="{DS_BTN_CLASSES.ghost} h-[2.25rem] shrink-0 self-end text-xs"
				disabled={!hasActiveFilters}
				data-testid="subjects-assets-clear-filters"
				on:click={clearFilters}
			>
				Clear filters
			</button>
			<div
				class="inline-flex rounded-lg border border-[color:var(--ce-l-border-default)] bg-[color:var(--ce-l-surface-elevated)] p-0.5"
				role="group"
				aria-label="Registry layout"
			>
				<button
					type="button"
					class="{segBtn} {layoutView === 'graph'
						? 'bg-[color:var(--ce-l-surface-muted)] text-[color:var(--ce-l-text-primary)] shadow-sm'
						: 'text-[color:var(--ce-l-text-muted)] hover:text-[color:var(--ce-l-text-secondary)]'}"
					aria-pressed={layoutView === 'graph'}
					data-testid="subjects-assets-view-graph"
					on:click={() => (layoutView = 'graph')}
				>
					Graph
				</button>
				<button
					type="button"
					class="{segBtn} {layoutView === 'table'
						? 'bg-[color:var(--ce-l-surface-muted)] text-[color:var(--ce-l-text-primary)] shadow-sm'
						: 'text-[color:var(--ce-l-text-muted)] hover:text-[color:var(--ce-l-text-secondary)]'}"
					aria-pressed={layoutView === 'table'}
					data-testid="subjects-assets-view-table"
					on:click={() => (layoutView = 'table')}
				>
					Table
				</button>
				<button
					type="button"
					class="{segBtn} {layoutView === 'cards'
						? 'bg-[color:var(--ce-l-surface-muted)] text-[color:var(--ce-l-text-primary)] shadow-sm'
						: 'text-[color:var(--ce-l-text-muted)] hover:text-[color:var(--ce-l-text-secondary)]'}"
					aria-pressed={layoutView === 'cards'}
					data-testid="subjects-assets-view-cards"
					on:click={() => (layoutView = 'cards')}
				>
					Cards
				</button>
			</div>
		</div>
	</div>
</div>
