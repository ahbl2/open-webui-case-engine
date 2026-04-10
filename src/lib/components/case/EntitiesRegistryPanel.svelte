<script lang="ts">
	/**
	 * P69-07 — Overview board registry panel (P69-04 §2). Four-up with preview / expand;
	 * PHONE may be placeholder (P69-02 Mode B). Row activate → parent (focus stub + detail).
	 */
	import {
		listCaseIntelligenceCommittedEntities,
		type CaseIntelligenceCommittedEntity,
		type CaseIntelligenceEntityKind
	} from '$lib/apis/caseEngine';
	import CaseErrorState from '$lib/components/case/CaseErrorState.svelte';
	import Spinner from '$lib/components/common/Spinner.svelte';
	import {
		buildRegistrySecondaryLine,
		committedEntityMatchesSearch,
		entityPortraitUrl,
		initialsFromDisplayLabel,
		sortCommittedEntities,
		type RegistrySortKey
	} from '$lib/utils/caseIntelligenceEntityRegistry';
	import type {
		EntitiesBoardPanelState,
		EntitiesRegistryKind,
		EntitiesRegistryPanelMode
	} from '$lib/utils/entitiesBoardTypes';
	import { tick } from 'svelte';

	export let caseId: string;
	export let token: string;
	export let entityKind: EntitiesRegistryKind;
	export let panelMode: EntitiesRegistryPanelMode = 'live';
	export let heading: string;
	export let subheader: string;
	export let testId: string;
	export let selectedEntityId: string | null = null;
	export let refreshNonce = 0;
	/** Preview row cap when not expanded (P69-04 default 4). */
	export let previewLimit = 4;

	export let onRowActivate: ((detail: { entity: CaseIntelligenceCommittedEntity }) => void) | undefined =
		undefined;
	export let onAddRequest: ((detail: { entityKind: CaseIntelligenceEntityKind }) => void) | undefined =
		undefined;
	export let onViewAllChange: ((detail: { expanded: boolean }) => void) | undefined = undefined;
	/** P69-08 — focus anchored column: full-height rail, roster + footer controls, seeded from board snapshot. */
	export let layoutVariant: 'board' | 'anchored' = 'board';
	export let seedPanelState: EntitiesBoardPanelState | null = null;

	let rawRows: CaseIntelligenceCommittedEntity[] = [];
	let loadError = '';
	let loading = false;
	let loadCompletedOnce = false;
	let prevCaseId: string | null = null;
	let loadId = 0;
	let lastAppliedRefreshNonce = -1;

	let searchQuery = '';
	let listScopeMode: 'active_only' | 'include_retired' = 'active_only';
	let sortKey: RegistrySortKey = 'name_asc';
	let portraitFailedIds = new Set<string>();
	let expanded = false;
	let panelBodyEl: HTMLDivElement | null = null;
	let pendingListScrollTop: number | undefined = undefined;

	$: includeRetired = listScopeMode === 'include_retired';
	$: isPlaceholder = panelMode === 'placeholder';
	$: apiKind =
		entityKind === 'PHONE' ? null : (entityKind as CaseIntelligenceEntityKind);

	$: addLabel =
		entityKind === 'PERSON'
			? 'Add person'
			: entityKind === 'VEHICLE'
				? 'Add vehicle'
				: entityKind === 'LOCATION'
					? 'Add location'
					: 'Add phone number';

	$: emptyKindWord =
		entityKind === 'PERSON'
			? 'people'
			: entityKind === 'VEHICLE'
				? 'vehicles'
				: entityKind === 'LOCATION'
					? 'locations'
					: 'phone numbers';

	$: filterHelp =
		includeRetired === false
			? 'Active committed entities only (Case Engine). Toggle to include retired rows.'
			: 'Retired entities included. List from Case Engine.';

	$: filteredRows = rawRows.filter((e) => committedEntityMatchesSearch(e, searchQuery));
	$: sortedRows = sortCommittedEntities(filteredRows, sortKey);
	$: displayRows = expanded ? sortedRows : sortedRows.slice(0, previewLimit);
	$: hasMoreRows = sortedRows.length > previewLimit;

	$: searchPlaceholder =
		entityKind === 'PERSON'
			? 'Search people…'
			: entityKind === 'VEHICLE'
				? 'Search vehicles…'
				: entityKind === 'LOCATION'
					? 'Search locations…'
					: 'Search numbers…';

	function requestDirectCreate(): void {
		if (isPlaceholder || !apiKind) return;
		onAddRequest?.({ entityKind: apiKind });
	}

	function toggleExpanded(): void {
		expanded = !expanded;
		onViewAllChange?.({ expanded });
	}

	function onRowClick(ent: CaseIntelligenceCommittedEntity): void {
		onRowActivate?.({ entity: ent });
	}

	function onRowKeydown(e: KeyboardEvent, ent: CaseIntelligenceCommittedEntity): void {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			onRowActivate?.({ entity: ent });
		}
	}

	async function load(): Promise<void> {
		if (!caseId || !token || isPlaceholder || !apiKind) {
			loading = false;
			if (isPlaceholder) loadCompletedOnce = true;
			return;
		}
		loadId += 1;
		const id = loadId;
		loading = true;
		loadError = '';
		try {
			const res = await listCaseIntelligenceCommittedEntities(caseId, token, {
				entityKind: apiKind,
				includeRetired
			});
			if (id !== loadId) return;
			rawRows = res.committed_entities;
			loadCompletedOnce = true;
		} catch (e) {
			if (id !== loadId) return;
			loadError = e instanceof Error ? e.message : 'Failed to load entities.';
			rawRows = [];
			loadCompletedOnce = true;
		} finally {
			if (id === loadId) {
				loading = false;
				void tick().then(() => {
					if (pendingListScrollTop != null && panelBodyEl) {
						panelBodyEl.scrollTop = pendingListScrollTop;
						pendingListScrollTop = undefined;
					}
				});
			}
		}
	}

	function onFilterChange(): void {
		void load();
	}

	function onRetry(): void {
		void load();
	}

	function markPortraitFailed(id: string): void {
		portraitFailedIds = new Set(portraitFailedIds).add(id);
	}

	$: if (caseId && token && caseId !== prevCaseId) {
		prevCaseId = caseId;
		rawRows = [];
		loadError = '';
		portraitFailedIds = new Set();
		lastAppliedRefreshNonce = refreshNonce;
		loadCompletedOnce = isPlaceholder;
		if (layoutVariant === 'anchored') {
			expanded = true;
			if (seedPanelState) {
				searchQuery = seedPanelState.searchQuery ?? '';
				sortKey =
					seedPanelState.sortKey === 'created_desc' || seedPanelState.sortKey === 'name_asc'
						? (seedPanelState.sortKey as RegistrySortKey)
						: 'name_asc';
				listScopeMode = seedPanelState.includeRetired ? 'include_retired' : 'active_only';
				pendingListScrollTop =
					typeof seedPanelState.scrollTop === 'number' ? seedPanelState.scrollTop : undefined;
			} else {
				searchQuery = '';
				listScopeMode = 'active_only';
				sortKey = 'name_asc';
				pendingListScrollTop = undefined;
			}
		} else {
			searchQuery = '';
			listScopeMode = 'active_only';
			sortKey = 'name_asc';
			expanded = false;
			pendingListScrollTop = undefined;
		}
		if (!isPlaceholder) void load();
	}

	$: if (layoutVariant === 'anchored') expanded = true;

	$: if (
		caseId &&
		token &&
		prevCaseId === caseId &&
		refreshNonce > lastAppliedRefreshNonce &&
		!isPlaceholder
	) {
		lastAppliedRefreshNonce = refreshNonce;
		void load();
	}

	$: countBadgeText = (() => {
		if (isPlaceholder) return '';
		if (!loadCompletedOnce && loading) return '';
		if (loadError) return '';
		if (!loadCompletedOnce) return '';
		const filtered = sortedRows.length;
		const loaded = rawRows.length;
		if (!searchQuery.trim()) return `${filtered}`;
		return `${filtered} / ${loaded}`;
	})();

	export function refreshPanel(): Promise<void> {
		return load();
	}

	export function getPanelState() {
		return {
			searchQuery,
			sortKey: sortKey as string,
			includeRetired,
			expanded,
			scrollTop: panelBodyEl?.scrollTop ?? 0
		};
	}

	export async function applyPanelState(
		partial: Partial<ReturnType<typeof getPanelState>>
	): Promise<void> {
		if (typeof partial.searchQuery === 'string') searchQuery = partial.searchQuery;
		if (partial.sortKey === 'name_asc' || partial.sortKey === 'created_desc')
			sortKey = partial.sortKey as RegistrySortKey;
		if (typeof partial.includeRetired === 'boolean') {
			listScopeMode = partial.includeRetired ? 'include_retired' : 'active_only';
		}
		if (layoutVariant !== 'anchored' && typeof partial.expanded === 'boolean') expanded = partial.expanded;
		await load();
		await tick();
		if (typeof partial.scrollTop === 'number' && panelBodyEl) {
			panelBodyEl.scrollTop = partial.scrollTop;
		}
	}

	function leadingTileClasses(kind: EntitiesRegistryKind): string {
		const base =
			'h-10 w-10 rounded-xl flex items-center justify-center text-[11px] font-bold shrink-0 shadow-inner shadow-black/25 ring-1 ';
		return (
			base +
			(kind === 'PERSON'
				? 'border border-slate-500/45 bg-gradient-to-br from-slate-700/95 to-slate-900 text-slate-50 ring-sky-400/18'
				: kind === 'VEHICLE'
					? 'border border-cyan-500/35 bg-gradient-to-br from-cyan-950/90 to-slate-950 text-cyan-100 ring-cyan-400/28'
					: kind === 'LOCATION'
						? 'border border-amber-500/35 bg-gradient-to-br from-amber-950/85 to-slate-950 text-amber-100 ring-amber-400/22'
						: 'border border-violet-500/40 bg-gradient-to-br from-violet-950/90 to-slate-950 text-violet-100 ring-violet-400/28')
		);
	}

	function leadingAbbrev(kind: EntitiesRegistryKind): string {
		if (kind === 'PERSON') return 'P';
		if (kind === 'VEHICLE') return 'V';
		if (kind === 'LOCATION') return 'L';
		return 'Ph';
	}

	/** P69-11-FU1 — kind identity + depth; premium panel treatment vs flat admin cards. */
	function panelShellClass(kind: EntitiesRegistryKind): string {
		const layout =
			layoutVariant === 'anchored'
				? 'min-h-0 h-full w-full min-w-[260px] max-w-[340px] flex-1 rounded-xl'
				: 'min-h-[17.5rem] h-full rounded-2xl';
		const base = `entities-registry-panel flex flex-col ${layout} min-w-0 backdrop-blur-md transition-shadow duration-300 `;
		if (layoutVariant === 'anchored') {
			switch (kind) {
				case 'PERSON':
					return (
						base +
						'border border-slate-600/55 bg-gradient-to-b from-slate-900/98 via-sky-950/8 to-slate-950 shadow-[0_8px_36px_-14px_rgba(0,0,0,0.65)] ring-1 ring-sky-500/12'
					);
				case 'VEHICLE':
					return (
						base +
						'border border-slate-600/55 bg-gradient-to-b from-slate-900/98 via-cyan-950/12 to-slate-950 shadow-[0_8px_36px_-14px_rgba(0,0,0,0.62)] ring-1 ring-cyan-500/15'
					);
				case 'LOCATION':
					return (
						base +
						'border border-slate-600/55 bg-gradient-to-b from-slate-900/98 via-amber-950/10 to-slate-950 shadow-[0_8px_36px_-14px_rgba(0,0,0,0.62)] ring-1 ring-amber-500/12'
					);
				case 'PHONE':
				default:
					return (
						base +
						'border border-slate-600/60 bg-gradient-to-b from-slate-900/98 via-violet-950/10 to-slate-950 shadow-[0_8px_36px_-14px_rgba(0,0,0,0.65)] ring-1 ring-violet-500/14'
					);
			}
		}
		switch (kind) {
			case 'PERSON':
				return (
					base +
					'border border-slate-500/30 bg-gradient-to-br from-slate-900/98 via-slate-900/92 to-slate-950 shadow-[0_16px_48px_-20px_rgba(0,0,0,0.7),inset_0_1px_0_0_rgba(255,255,255,0.06)] ring-1 ring-sky-400/15'
				);
			case 'VEHICLE':
				return (
					base +
					'border border-cyan-500/25 bg-gradient-to-br from-slate-900/98 via-cyan-950/12 to-slate-950 shadow-[0_16px_48px_-20px_rgba(0,0,0,0.65),inset_0_1px_0_0_rgba(255,255,255,0.05)] ring-1 ring-cyan-400/20'
				);
			case 'LOCATION':
				return (
					base +
					'border border-amber-500/22 bg-gradient-to-br from-slate-900/98 via-amber-950/12 to-slate-950 shadow-[0_16px_48px_-20px_rgba(0,0,0,0.65),inset_0_1px_0_0_rgba(255,255,255,0.05)] ring-1 ring-amber-400/18'
				);
			case 'PHONE':
			default:
				return (
					base +
					'border border-violet-500/35 bg-gradient-to-br from-slate-950 via-violet-950/18 to-slate-950 shadow-[0_16px_48px_-20px_rgba(0,0,0,0.72)] ring-1 ring-violet-400/22'
				);
		}
	}

	function headerChromeClass(kind: EntitiesRegistryKind): string {
		switch (kind) {
			case 'PERSON':
				return 'border-b border-slate-700/60 bg-slate-950/35 border-l-[3px] border-l-sky-500/70';
			case 'VEHICLE':
				return 'border-b border-slate-700/60 bg-slate-950/35 border-l-[3px] border-l-cyan-500/70';
			case 'LOCATION':
				return 'border-b border-slate-700/60 bg-slate-950/35 border-l-[3px] border-l-amber-500/70';
			case 'PHONE':
			default:
				return 'border-b border-slate-700/60 bg-slate-950/35 border-l-[3px] border-l-violet-500/70';
		}
	}

	/** P69-11-FU2 — compact footer controls (subordinate to roster; not a form-first panel). */
	const compactSearchClass =
		'flex-1 min-w-[6.5rem] max-w-[min(100%,14rem)] rounded-md border border-slate-600/60 bg-slate-950/85 px-2 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 shadow-inner shadow-black/20 focus:outline-none focus:ring-1 focus:ring-cyan-500/40';
	const compactSelectClass =
		'rounded-md border border-slate-600/60 bg-slate-950/85 px-2 py-1.5 text-[11px] text-slate-200 shadow-inner shadow-black/20 focus:outline-none focus:ring-1 focus:ring-cyan-500/40';
</script>

<section
	class="{panelShellClass(entityKind)}"
	data-testid={testId}
	data-entity-registry-kind={entityKind}
	data-panel-mode={panelMode}
	data-layout-variant={layoutVariant}
	aria-labelledby="{testId}-title"
>
	<header
		class="shrink-0 flex flex-wrap items-start justify-between gap-3 px-4 pt-4 pb-3 {headerChromeClass(entityKind)}"
	>
		<div class="min-w-0 flex-1">
			<h2 id="{testId}-title" class="text-[15px] font-bold tracking-tight text-slate-50 flex flex-wrap items-center gap-2.5">
				<span>{heading}</span>
				{#if !isPlaceholder}
					{#if loadCompletedOnce && !loadError && countBadgeText}
						<span
							class="text-[11px] font-semibold tabular-nums px-2.5 py-0.5 rounded-full bg-slate-800/90 text-slate-200 border border-slate-600/70 shadow-sm"
							data-testid="{testId}-count"
						>
							{countBadgeText}{#if searchQuery.trim()}
								<span class="text-slate-500 font-normal"> loaded</span>{/if}
						</span>
					{:else if loading && !loadCompletedOnce}
						<span
							class="inline-block h-4 w-10 rounded bg-slate-700/90 animate-pulse"
							aria-hidden="true"
							data-testid="{testId}-count-skeleton"
						></span>
					{/if}
				{/if}
			</h2>
			<p class="mt-1 text-[11px] text-slate-400/95 leading-snug line-clamp-1" title={subheader}>{subheader}</p>
		</div>
		<div class="flex flex-wrap items-center gap-2 shrink-0">
			<button
				type="button"
				class="text-xs px-3 py-1.5 rounded-lg border border-slate-600/80 text-slate-200 hover:bg-slate-800/90 hover:border-slate-500 disabled:opacity-50 transition-colors"
				disabled={loading || !token || isPlaceholder}
				data-testid="{testId}-refresh"
				on:click={() => void load()}
			>
				Refresh
			</button>
			<button
				type="button"
				class="px-3.5 py-1.5 rounded-lg text-xs font-bold tracking-wide uppercase disabled:opacity-50 disabled:cursor-not-allowed
				       border border-cyan-500/50 bg-gradient-to-b from-cyan-600/90 to-cyan-700/90 text-white shadow-[0_2px_12px_-4px_rgba(34,211,238,0.45)] hover:from-cyan-500 hover:to-cyan-600"
				data-testid="{testId}-add"
				disabled={isPlaceholder || loading || !token}
				title={isPlaceholder
					? 'Phone registry pending Case Engine capability (P69-10).'
					: `Register committed ${emptyKindWord.slice(0, -1)} in Case Engine`}
				on:click={requestDirectCreate}
			>
				{addLabel}
			</button>
		</div>
	</header>

	<div class="flex flex-col flex-1 min-h-0">
		<div
			class="entity-registry-roster flex-1 flex flex-col min-h-0 overflow-y-auto px-4 pt-3 pb-2 {layoutVariant === 'anchored'
				? 'max-h-none'
				: expanded
					? 'max-h-[min(60vh,28rem)]'
					: ''}"
			bind:this={panelBodyEl}
			data-testid="{testId}-body"
		>
			{#if isPlaceholder}
				<div
					class="rounded-xl border border-dashed border-violet-500/35 bg-slate-950/35 px-3 py-4 text-center min-h-[5.5rem] flex flex-col items-center justify-center gap-1.5"
					data-testid="{testId}-placeholder"
				>
					<p class="text-xs font-semibold text-slate-200">Phone registry</p>
					<p class="text-[10px] text-slate-500 leading-snug max-w-[18rem]">
						Not available this build (P69-10). List/create when Case Engine ships the contract.
					</p>
				</div>
			{:else if loadError}
				<div data-testid="{testId}-error">
					<CaseErrorState title="Unable to load registry" message={loadError} onRetry={onRetry} />
				</div>
			{:else if loading && rawRows.length === 0}
				<div
					class="flex items-center justify-center gap-2 py-7"
					data-testid="{testId}-loading"
					aria-busy="true"
				>
					<Spinner className="size-4 text-slate-500" />
					<span class="text-xs text-slate-500">Loading roster…</span>
				</div>
			{:else if rawRows.length === 0}
				<div
					class="rounded-xl border border-slate-600/40 bg-slate-950/45 px-3 py-3 text-center"
					data-testid="{testId}-empty"
				>
					<p class="text-xs font-medium text-slate-200">No {emptyKindWord} on the board yet.</p>
					<p class="text-[10px] text-slate-500 mt-0.5">Register with Add, or use intake below for staging first.</p>
					<button
						type="button"
						class="mt-2 text-xs font-semibold text-cyan-400 hover:text-cyan-300"
						data-testid="{testId}-empty-add"
						on:click={requestDirectCreate}
					>
						{addLabel}
					</button>
				</div>
			{:else if sortedRows.length === 0}
				<div
					class="rounded-xl border border-slate-600/35 bg-slate-950/40 px-3 py-3 text-center"
					data-testid="{testId}-filtered-empty"
				>
					<p class="text-xs text-slate-300">No matches in this roster slice.</p>
					<button
						type="button"
						class="mt-1.5 text-[11px] font-medium text-cyan-400 hover:underline"
						data-testid="{testId}-clear-search"
						on:click={() => {
							searchQuery = '';
						}}
					>
						Clear search
					</button>
				</div>
			{:else}
				<ul class="flex flex-col gap-2 flex-1 min-h-0" role="list" data-testid="{testId}-list">
				{#each displayRows as ent (ent.id)}
					{@const secondary = buildRegistrySecondaryLine(ent.entity_kind, ent)}
					{@const portrait = ent.entity_kind === 'PERSON' ? entityPortraitUrl(ent.core_attributes ?? {}) : null}
					{@const showPortrait = portrait && !portraitFailedIds.has(ent.id)}
					{@const isSelected = selectedEntityId === ent.id}
					<li>
						<div
							role="button"
							tabindex="0"
							aria-label="Open detail for {ent.display_label} (committed entity)"
							aria-pressed={isSelected ? 'true' : 'false'}
							data-testid="{testId}-row-{ent.id}"
							class="flex w-full min-h-[44px] items-stretch gap-3 rounded-xl border text-left transition-all duration-200 px-3 py-2.5 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/80 shadow-sm
								{isSelected
								? 'border-cyan-400/55 bg-gradient-to-r from-cyan-950/50 to-slate-950/60 ring-1 ring-cyan-400/35 shadow-[0_0_0_1px_rgba(34,211,238,0.12)]'
								: 'border-slate-600/55 bg-slate-950/35 hover:border-slate-500/70 hover:bg-slate-800/55 hover:shadow-md'}"
							on:click={() => onRowClick(ent)}
							on:keydown={(e) => onRowKeydown(e, ent)}
						>
							<div class="shrink-0 flex items-center">
								{#if ent.entity_kind === 'PERSON'}
									{#if showPortrait}
										<img
											src={portrait}
											alt=""
											class="h-10 w-10 rounded-full object-cover border border-slate-500/60 bg-slate-800 ring-1 ring-sky-400/15 shadow-md"
											loading="lazy"
											on:error={() => markPortraitFailed(ent.id)}
										/>
									{:else}
										<span
											class="{leadingTileClasses('PERSON')} rounded-full !w-10 !h-10 text-[11px]"
											aria-hidden="true"
										>
											{initialsFromDisplayLabel(ent.display_label)}
										</span>
									{/if}
								{:else}
									<span class={leadingTileClasses(ent.entity_kind)} aria-hidden="true">
										{leadingAbbrev(ent.entity_kind)}
									</span>
								{/if}
							</div>
							<div class="min-w-0 flex-1 py-0.5">
								<div class="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
									<span class="text-sm font-medium text-slate-100 line-clamp-2 break-words">{ent.display_label}</span>
									{#if ent.deleted_at}
										<span
											class="text-[10px] font-medium px-1.5 py-0.5 rounded bg-amber-900/40 text-amber-100 border border-amber-800/50"
										>Retired</span>
									{/if}
								</div>
								{#if secondary}
									<p class="mt-0.5 text-[11px] text-slate-400 line-clamp-1">{secondary}</p>
								{/if}
								<p class="mt-0.5 text-[9px] text-slate-500/70 font-mono truncate" title={ent.id}>
									{ent.id}
								</p>
							</div>
							<div class="shrink-0 flex items-center text-slate-500 text-sm" aria-hidden="true">›</div>
						</div>
					</li>
				{/each}
				</ul>
			{/if}
		</div>

		{#if !isPlaceholder}
			<footer
				class="shrink-0 border-t border-slate-700/50 bg-slate-950/55 px-3 py-2 flex flex-wrap items-center gap-x-2 gap-y-1.5"
				data-testid="{testId}-toolbar"
			>
				<input
					id="{testId}-search"
					type="search"
					class={compactSearchClass}
					placeholder={searchPlaceholder}
					aria-label="Search loaded roster rows"
					title="Client-side filter on rows already loaded in this panel"
					data-testid="{testId}-search"
					bind:value={searchQuery}
					autocomplete="off"
				/>
				<select
					id="{testId}-filter"
					class="{compactSelectClass} w-[7.25rem] sm:w-auto min-w-[6.5rem]"
					aria-label="List scope"
					title={filterHelp}
					data-testid="{testId}-filter"
					bind:value={listScopeMode}
					on:change={onFilterChange}
				>
					<option value="active_only">Active only</option>
					<option value="include_retired">Include retired</option>
				</select>
				<select
					id="{testId}-sort"
					class="{compactSelectClass} w-[7.5rem]"
					aria-label="Sort roster"
					data-testid="{testId}-sort"
					bind:value={sortKey}
				>
					<option value="name_asc">Name (A–Z)</option>
					<option value="created_desc">Newest first</option>
				</select>
				{#if layoutVariant !== 'anchored' && hasMoreRows && loadCompletedOnce && !loadError && sortedRows.length > 0}
					<button
						type="button"
						class="text-[11px] font-semibold px-2 py-1 rounded-md border border-slate-600/80 text-slate-300 hover:bg-slate-800/90 ml-auto sm:ml-0"
						data-testid="{testId}-view-all"
						on:click={toggleExpanded}
					>
						{expanded ? 'Preview' : 'View all'}
					</button>
				{/if}
			</footer>
		{/if}
	</div>
</section>
