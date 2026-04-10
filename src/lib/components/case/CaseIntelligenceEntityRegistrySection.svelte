<script lang="ts">
	/**
	 * P67-05 — Case Intelligence committed entity registry section (People / Vehicles / Locations).
	 * P68-05 — direct-create modal (POST …/intelligence/entities); list via GET.
	 * P68-08-FU1 — Svelte 5: callback props (`onCreateRequest` / `onRowSelect`); `on:` + dispatcher unreliable on components.
	 */
	import {
		listCaseIntelligenceCommittedEntities,
		type CaseIntelligenceCommittedEntity,
		type CaseIntelligenceEntityKind
	} from '$lib/apis/caseEngine';
	import CaseEmptyState from '$lib/components/case/CaseEmptyState.svelte';
	import CaseErrorState from '$lib/components/case/CaseErrorState.svelte';
	import CaseLoadingState from '$lib/components/case/CaseLoadingState.svelte';
	import {
		buildRegistrySecondaryLine,
		committedEntityMatchesSearch,
		entityPortraitUrl,
		initialsFromDisplayLabel,
		sortCommittedEntities,
		type RegistrySortKey
	} from '$lib/utils/caseIntelligenceEntityRegistry';

	export let caseId: string;
	export let token: string;
	export let entityKind: CaseIntelligenceEntityKind;
	export let heading: string;
	export let description: string;
	export let testId: string;
	/** For P67-06: highlight selected row when id matches an entity in this section */
	export let selectedEntityId: string | null = null;
	/** P68-05: parent increments after successful direct-create to refetch this section */
	export let refreshNonce = 0;

	/** P68-08-FU1 — must be callback prop in Svelte 5 (not `on:createRequest` + dispatcher). */
	export let onCreateRequest: ((detail: { entityKind: CaseIntelligenceEntityKind }) => void) | undefined = undefined;
	export let onRowSelect: ((detail: { entity: CaseIntelligenceCommittedEntity }) => void) | undefined = undefined;

	let rawRows: CaseIntelligenceCommittedEntity[] = [];
	let loadError = '';
	let loading = false;
	let prevCaseId: string | null = null;
	let loadId = 0;
	let lastAppliedRefreshNonce = -1;

	let searchQuery = '';
	let listScopeMode: 'active_only' | 'include_retired' = 'active_only';
	let sortKey: RegistrySortKey = 'name_asc';
	/** Portrait URLs that failed to load — fall back to initials */
	let portraitFailedIds = new Set<string>();

	$: includeRetired = listScopeMode === 'include_retired';

	$: addLabel =
		entityKind === 'PERSON'
			? 'Add person'
			: entityKind === 'VEHICLE'
				? 'Add vehicle'
				: 'Add location';

	$: emptyKindWord =
		entityKind === 'PERSON' ? 'people' : entityKind === 'VEHICLE' ? 'vehicles' : 'locations';

	$: filterHelp =
		includeRetired === false
			? 'Active committed entities only (from Case Engine). Toggle to include retired rows.'
			: 'Retired entities included; labels mark retired rows. List still comes from Case Engine.';

	$: filteredRows = rawRows.filter((e) => committedEntityMatchesSearch(e, searchQuery));
	$: visibleRows = sortCommittedEntities(filteredRows, sortKey);

	$: searchPlaceholder =
		entityKind === 'PERSON'
			? 'Search people in this case…'
			: entityKind === 'VEHICLE'
				? 'Search vehicles in this case…'
				: 'Search locations in this case…';

	async function load(): Promise<void> {
		if (!caseId || !token) return;
		loadId += 1;
		const id = loadId;
		loading = true;
		loadError = '';
		try {
			const res = await listCaseIntelligenceCommittedEntities(caseId, token, {
				entityKind,
				includeRetired
			});
			if (id !== loadId) return;
			rawRows = res.committed_entities;
		} catch (e) {
			if (id !== loadId) return;
			loadError = e instanceof Error ? e.message : 'Failed to load entities.';
			rawRows = [];
		} finally {
			if (id === loadId) loading = false;
		}
	}

	function onFilterChange(): void {
		void load();
	}

	function onRetry(): void {
		void load();
	}

	function requestDirectCreate(): void {
		onCreateRequest?.({ entityKind });
	}

	function onRowActivate(ent: CaseIntelligenceCommittedEntity): void {
		onRowSelect?.({ entity: ent });
	}

	/** Keyboard: avoid duplicate handler name with row click */
	function onRowKeydown(e: KeyboardEvent, ent: CaseIntelligenceCommittedEntity): void {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			onRowSelect?.({ entity: ent });
		}
	}

	$: if (caseId && token && caseId !== prevCaseId) {
		prevCaseId = caseId;
		rawRows = [];
		loadError = '';
		searchQuery = '';
		listScopeMode = 'active_only';
		sortKey = 'name_asc';
		portraitFailedIds = new Set();
		lastAppliedRefreshNonce = refreshNonce;
		void load();
	}

	$: if (
		caseId &&
		token &&
		prevCaseId === caseId &&
		refreshNonce > lastAppliedRefreshNonce
	) {
		lastAppliedRefreshNonce = refreshNonce;
		void load();
	}

	function markPortraitFailed(id: string): void {
		portraitFailedIds = new Set(portraitFailedIds).add(id);
	}
</script>

<section
	class="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 space-y-3"
	data-testid={testId}
	data-entity-registry-kind={entityKind}
	aria-labelledby="{testId}-title"
>
	<header class="flex flex-wrap items-start justify-between gap-3 border-b border-gray-100 dark:border-gray-800 pb-3">
		<div class="min-w-0 flex-1">
			<h2 id="{testId}-title" class="text-sm font-semibold text-gray-900 dark:text-gray-100">
				{heading}
				{#if !loading && !loadError}
					<span class="ml-1.5 text-xs font-normal text-gray-500 dark:text-gray-400 tabular-nums"
						>({visibleRows.length}{searchQuery.trim() ? ` / ${rawRows.length}` : ''})</span
					>
				{/if}
			</h2>
			<p class="mt-0.5 text-[11px] text-gray-500 dark:text-gray-400">
				{description}
			</p>
		</div>
		<div class="flex flex-wrap items-center gap-2 shrink-0">
			<button
				type="button"
				class="text-xs px-2 py-1 rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
				disabled={loading || !token}
				data-testid="{testId}-refresh"
				on:click={() => void load()}
			>
				Refresh
			</button>
			<button
				type="button"
				class="px-3 py-1.5 rounded-md text-xs font-medium border border-blue-600 dark:border-blue-500
				       bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-200 hover:bg-blue-100 dark:hover:bg-blue-950/70"
				data-testid="{testId}-add"
				title="Register a new committed {emptyKindWord.slice(0, -1)} in Case Engine (direct save, not staging)"
				on:click={requestDirectCreate}
			>
				{addLabel}
			</button>
		</div>
	</header>

	<div class="flex flex-wrap items-end gap-2" data-testid="{testId}-toolbar">
		<div class="flex-1 min-w-[160px] max-w-md">
			<label class="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-0.5" for="{testId}-search"
				>Search (this list)</label
			>
			<input
				id="{testId}-search"
				type="search"
				class="w-full px-2 py-1.5 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm"
				placeholder={searchPlaceholder}
				data-testid="{testId}-search"
				bind:value={searchQuery}
				autocomplete="off"
			/>
			<p class="mt-0.5 text-[10px] text-gray-400 dark:text-gray-500">
				Narrows the loaded rows in your browser only.
			</p>
		</div>
		<div>
			<label class="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-0.5" for="{testId}-filter"
				>List scope</label
			>
			<select
				id="{testId}-filter"
				class="px-2 py-1.5 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm min-w-[10rem]"
				data-testid="{testId}-filter"
				bind:value={listScopeMode}
				on:change={onFilterChange}
			>
				<option value="active_only">Active only</option>
				<option value="include_retired">Include retired</option>
			</select>
			<p class="mt-0.5 text-[10px] text-gray-400 dark:text-gray-500 max-w-[14rem]">{filterHelp}</p>
		</div>
		<div>
			<label class="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-0.5" for="{testId}-sort"
				>Sort</label
			>
			<select
				id="{testId}-sort"
				class="px-2 py-1.5 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm"
				data-testid="{testId}-sort"
				bind:value={sortKey}
			>
				<option value="name_asc">Name (A–Z)</option>
				<option value="created_desc">Newest first</option>
			</select>
			<p class="mt-0.5 text-[10px] text-gray-400 dark:text-gray-500">Client-side ordering.</p>
		</div>
	</div>

	{#if loadError}
		<div data-testid="{testId}-error">
			<CaseErrorState title="Unable to load registry" message={loadError} onRetry={onRetry} />
		</div>
	{:else if loading && rawRows.length === 0}
		<CaseLoadingState label="Loading committed entities…" testId="{testId}-loading" />
	{:else if rawRows.length === 0}
		<CaseEmptyState
			title="No {emptyKindWord} committed yet."
			description="Add registers a committed row immediately. For intake that should stay non-authoritative first, use Stage 1 staging below."
			testId="{testId}-empty"
		/>
		<div class="flex justify-center pt-1">
			<button
				type="button"
				class="text-sm font-medium text-blue-700 dark:text-blue-400 hover:underline"
				data-testid="{testId}-empty-add"
				on:click={requestDirectCreate}
			>
				{addLabel}
			</button>
		</div>
	{:else if visibleRows.length === 0}
		<div
			class="rounded-lg border border-dashed border-gray-300 dark:border-gray-600 px-4 py-6 text-center"
			data-testid="{testId}-filtered-empty"
		>
			<p class="text-sm text-gray-600 dark:text-gray-300">No matches — adjust search or list scope.</p>
			<button
				type="button"
				class="mt-2 text-xs font-medium text-blue-700 dark:text-blue-400 hover:underline"
				data-testid="{testId}-clear-search"
				on:click={() => {
					searchQuery = '';
				}}
			>
				Clear search
			</button>
		</div>
	{:else}
		<ul class="flex flex-col gap-2" role="list" data-testid="{testId}-list">
			{#each visibleRows as ent (ent.id)}
				{@const secondary = buildRegistrySecondaryLine(entityKind, ent)}
				{@const portrait =
					entityKind === 'PERSON' ? entityPortraitUrl(ent.core_attributes ?? {}) : null}
				{@const showPortrait = portrait && !portraitFailedIds.has(ent.id)}
				{@const isSelected = selectedEntityId === ent.id}
				<li>
					<div
						role="button"
						tabindex="0"
						aria-label="Open detail for {ent.display_label} (committed entity in Case Engine)"
						aria-pressed={isSelected ? 'true' : 'false'}
						data-testid="{testId}-row-{ent.id}"
						class="flex w-full min-h-[44px] items-stretch gap-3 rounded-lg border text-left transition
							   {isSelected
							? 'border-blue-500 dark:border-blue-400 bg-blue-50/80 dark:bg-blue-950/30 ring-1 ring-blue-400/50'
							: 'border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/40 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-900/70'}
							   px-3 py-2 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
						on:click={() => onRowActivate(ent)}
						on:keydown={(e) => onRowKeydown(e, ent)}
					>
						<div class="shrink-0 flex items-center">
							{#if entityKind === 'PERSON'}
								{#if showPortrait}
									<img
										src={portrait}
										alt=""
										class="h-10 w-10 rounded-full object-cover border border-gray-200 dark:border-gray-600 bg-gray-100 dark:bg-gray-800"
										loading="lazy"
										on:error={() => markPortraitFailed(ent.id)}
									/>
								{:else}
									<span
										class="h-10 w-10 rounded-full flex items-center justify-center text-xs font-semibold
										       border border-gray-200 dark:border-gray-600 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-100"
										aria-hidden="true"
									>
										{initialsFromDisplayLabel(ent.display_label)}
									</span>
								{/if}
							{:else if entityKind === 'VEHICLE'}
								<span
									class="h-10 w-10 rounded-lg flex items-center justify-center text-lg border border-gray-200 dark:border-gray-600 bg-gray-100 dark:bg-gray-800"
									title="Vehicle"
									aria-hidden="true"
								>🚗</span>
							{:else}
								<span
									class="h-10 w-10 rounded-lg flex items-center justify-center text-lg border border-gray-200 dark:border-gray-600 bg-gray-100 dark:bg-gray-800"
									title="Location"
									aria-hidden="true"
								>📍</span>
							{/if}
						</div>
						<div class="min-w-0 flex-1 py-0.5">
							<div class="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
								<span class="text-sm font-medium text-gray-900 dark:text-gray-100 line-clamp-2 break-words">{ent.display_label}</span>
								{#if ent.deleted_at}
									<span
										class="text-[10px] font-medium px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/40 text-amber-900 dark:text-amber-200"
									>Retired</span>
								{/if}
							</div>
							{#if secondary}
								<p class="mt-0.5 text-[11px] text-gray-500 dark:text-gray-400 line-clamp-1">{secondary}</p>
							{/if}
							<p class="mt-0.5 text-[10px] text-gray-400 dark:text-gray-500 font-mono truncate" title={ent.id}>
								{ent.id}
							</p>
						</div>
						<div class="shrink-0 flex items-center text-gray-400 dark:text-gray-500 text-sm" aria-hidden="true">
							›
						</div>
					</div>
				</li>
			{/each}
		</ul>
	{/if}
</section>
