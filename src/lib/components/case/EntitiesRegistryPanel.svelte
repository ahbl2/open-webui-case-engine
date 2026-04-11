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
	import {
		DS_BADGE_CLASSES,
		DS_BTN_CLASSES,
		DS_ENTITY_BOARD_CLASSES,
		DS_INTELLIGENCE_CLASSES,
		DS_SKELETON_CLASSES
	} from '$lib/case/detectivePrimitiveFoundation';
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
		const k =
			kind === 'PERSON'
				? DS_ENTITY_BOARD_CLASSES.registryTilePerson
				: kind === 'VEHICLE'
					? DS_ENTITY_BOARD_CLASSES.registryTileVehicle
					: kind === 'LOCATION'
						? DS_ENTITY_BOARD_CLASSES.registryTileLocation
						: DS_ENTITY_BOARD_CLASSES.registryTilePhone;
		return `${DS_ENTITY_BOARD_CLASSES.registryTile} ${k}`;
	}

	function leadingAbbrev(kind: EntitiesRegistryKind): string {
		if (kind === 'PERSON') return 'P';
		if (kind === 'VEHICLE') return 'V';
		if (kind === 'LOCATION') return 'L';
		return 'Ph';
	}

	/** P69-11-FU1 — kind identity + depth; DS entity board surfaces (P77-11). */
	function panelShellClass(kind: EntitiesRegistryKind): string {
		const layout =
			layoutVariant === 'anchored'
				? DS_ENTITY_BOARD_CLASSES.registryPanelAnchored
				: DS_ENTITY_BOARD_CLASSES.registryPanelBoard;
		const kindMod =
			kind === 'PERSON'
				? DS_ENTITY_BOARD_CLASSES.registryPanelPerson
				: kind === 'VEHICLE'
					? DS_ENTITY_BOARD_CLASSES.registryPanelVehicle
					: kind === 'LOCATION'
						? DS_ENTITY_BOARD_CLASSES.registryPanelLocation
						: DS_ENTITY_BOARD_CLASSES.registryPanelPhone;
		return `entities-registry-panel flex flex-col min-w-0 ${DS_ENTITY_BOARD_CLASSES.registryPanel} ${layout} ${kindMod}`;
	}

	function headerChromeClass(kind: EntitiesRegistryKind): string {
		const accent =
			kind === 'PERSON'
				? DS_ENTITY_BOARD_CLASSES.registryHeaderPerson
				: kind === 'VEHICLE'
					? DS_ENTITY_BOARD_CLASSES.registryHeaderVehicle
					: kind === 'LOCATION'
						? DS_ENTITY_BOARD_CLASSES.registryHeaderLocation
						: DS_ENTITY_BOARD_CLASSES.registryHeaderPhone;
		return `${DS_ENTITY_BOARD_CLASSES.registryHeader} ${accent}`;
	}

	function rosterBodyClass(): string {
		const parts = [DS_ENTITY_BOARD_CLASSES.registryRoster];
		if (layoutVariant === 'anchored') parts.push(DS_ENTITY_BOARD_CLASSES.registryRosterAnchored);
		else if (expanded) parts.push(DS_ENTITY_BOARD_CLASSES.registryRosterExpanded);
		return parts.join(' ');
	}
</script>

<section
	class="{panelShellClass(entityKind)}"
	data-testid={testId}
	data-entity-registry-kind={entityKind}
	data-panel-mode={panelMode}
	data-layout-variant={layoutVariant}
	aria-labelledby="{testId}-title"
>
	<header class="shrink-0 flex flex-wrap items-start justify-between gap-3 {headerChromeClass(entityKind)}">
		<div class="min-w-0 flex-1">
			<h2 id="{testId}-title" class="{DS_ENTITY_BOARD_CLASSES.registryTitle}">
				<span>{heading}</span>
				{#if !isPlaceholder}
					{#if loadCompletedOnce && !loadError && countBadgeText}
						<span class="{DS_BADGE_CLASSES.neutral} tabular-nums" data-testid="{testId}-count">
							{countBadgeText}{#if searchQuery.trim()}
								<span class="font-normal opacity-80"> loaded</span>{/if}
						</span>
					{:else if loading && !loadCompletedOnce}
						<span
							class="{DS_SKELETON_CLASSES.base} {DS_SKELETON_CLASSES.shimmer} inline-block h-4 w-10 max-w-[2.5rem]"
							aria-hidden="true"
							data-testid="{testId}-count-skeleton"
						></span>
					{/if}
				{/if}
			</h2>
			<p class="{DS_ENTITY_BOARD_CLASSES.registrySubtitle}" title={subheader}>{subheader}</p>
		</div>
		<div class="flex flex-wrap items-center gap-2 shrink-0">
			<button
				type="button"
				class="{DS_BTN_CLASSES.ghost} !px-3 !py-1.5 !text-xs"
				disabled={loading || !token || isPlaceholder}
				data-testid="{testId}-refresh"
				on:click={() => void load()}
			>
				Refresh
			</button>
			<button
				type="button"
				class="{DS_BTN_CLASSES.primary} !px-3.5 !py-1.5 !text-xs !font-bold !tracking-wide !uppercase"
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
			class="entity-registry-roster {rosterBodyClass()}"
			bind:this={panelBodyEl}
			data-testid="{testId}-body"
		>
			{#if isPlaceholder}
				<div class="{DS_ENTITY_BOARD_CLASSES.registryPlaceholder}" data-testid="{testId}-placeholder">
					<p class="ds-type-body font-semibold">Phone registry (board)</p>
					<p class="ds-type-meta max-w-[22rem] opacity-90">
						<strong class="font-semibold text-[var(--ds-text-primary)]">Why this is empty:</strong> Case Engine does not
						expose a committed phone list or add-phone action in this column yet (P69-10). You cannot start phone focus
						from this board panel.
					</p>
					{#if entityKind === 'PHONE'}
						<div
							class="mt-3 rounded-lg border border-dashed border-[var(--ds-border-subtle)] bg-[var(--ds-surface-raised)]/40 px-3 py-2.5 text-left"
							data-testid="{testId}-phone-action-path"
							role="status"
						>
							<p class="ds-type-body font-semibold">Phone investigation — what works today</p>
							<p class="ds-type-meta mt-1 max-w-[22rem] opacity-90 leading-relaxed">
								<strong class="font-semibold text-[var(--ds-text-primary)]">Supported path:</strong> Select the
								<strong class="font-semibold">Intelligence</strong> sub-tab at the top of this page, run a search with the
								phone number, then use the entity evidence focus control on a matching result row (evidence-backed
								phone focus). This board column is not part of that path until the committed phone registry ships.
							</p>
						</div>
					{/if}
				</div>
			{:else if loadError}
				<div data-testid="{testId}-error">
					<CaseErrorState title="Unable to load registry" message={loadError} onRetry={onRetry} />
				</div>
			{:else if loading && rawRows.length === 0}
				<div class="{DS_ENTITY_BOARD_CLASSES.registryLoading}" data-testid="{testId}-loading" aria-busy="true">
					<Spinner className="size-4 opacity-70" />
					<span class="ds-type-meta">Loading roster…</span>
				</div>
			{:else if rawRows.length === 0}
				<div class="{DS_ENTITY_BOARD_CLASSES.registryEmpty}" data-testid="{testId}-empty">
					<p class="ds-type-body font-medium">No {emptyKindWord} on the board yet.</p>
					<p class="ds-type-meta mt-1 opacity-90">Register with Add, or use intake below for staging first.</p>
					<button
						type="button"
						class="{DS_INTELLIGENCE_CLASSES.inlineLink} mt-2 text-xs font-semibold"
						data-testid="{testId}-empty-add"
						on:click={requestDirectCreate}
					>
						{addLabel}
					</button>
				</div>
			{:else if sortedRows.length === 0}
				<div class="{DS_ENTITY_BOARD_CLASSES.registryFilteredEmpty}" data-testid="{testId}-filtered-empty">
					<p class="ds-type-body">No matches in this roster slice.</p>
					<button
						type="button"
						class="{DS_INTELLIGENCE_CLASSES.inlineLink} mt-1.5 text-[11px] font-medium"
						data-testid="{testId}-clear-search"
						on:click={() => {
							searchQuery = '';
						}}
					>
						Clear search
					</button>
				</div>
			{:else}
				<ul class="{DS_ENTITY_BOARD_CLASSES.registryList}" role="list" data-testid="{testId}-list">
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
							class="{DS_ENTITY_BOARD_CLASSES.registryRow} {isSelected
								? DS_ENTITY_BOARD_CLASSES.registryRowSelected
								: ''}"
							on:click={() => onRowClick(ent)}
							on:keydown={(e) => onRowKeydown(e, ent)}
						>
							<div class="shrink-0 flex items-center">
								{#if ent.entity_kind === 'PERSON'}
									{#if showPortrait}
										<img
											src={portrait}
											alt=""
											class="{DS_ENTITY_BOARD_CLASSES.registryPortrait}"
											loading="lazy"
											on:error={() => markPortraitFailed(ent.id)}
										/>
									{:else}
										<span
											class="{leadingTileClasses('PERSON')} !h-10 !w-10 rounded-full !text-[11px]"
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
									<span class="{DS_ENTITY_BOARD_CLASSES.registryRowLabel}">{ent.display_label}</span>
									{#if ent.deleted_at}
										<span class="{DS_ENTITY_BOARD_CLASSES.registryRetiredPill}">Retired</span>
									{/if}
								</div>
								{#if secondary}
									<p class="{DS_ENTITY_BOARD_CLASSES.registryRowSecondary}">{secondary}</p>
								{/if}
								<p class="{DS_ENTITY_BOARD_CLASSES.registryRowId}" title={ent.id}>
									{ent.id}
								</p>
							</div>
							<div class="{DS_ENTITY_BOARD_CLASSES.registryChevron}" aria-hidden="true">›</div>
						</div>
					</li>
				{/each}
				</ul>
			{/if}
		</div>

		{#if !isPlaceholder}
			<footer class="{DS_ENTITY_BOARD_CLASSES.registryFooter}" data-testid="{testId}-toolbar">
				<input
					id="{testId}-search"
					type="search"
					class="{DS_ENTITY_BOARD_CLASSES.registryFooterSearch}"
					placeholder={searchPlaceholder}
					aria-label="Search loaded roster rows"
					title="Client-side filter on rows already loaded in this panel"
					data-testid="{testId}-search"
					bind:value={searchQuery}
					autocomplete="off"
				/>
				<select
					id="{testId}-filter"
					class="{DS_ENTITY_BOARD_CLASSES.registryFooterSelect} w-[7.25rem] min-w-[6.5rem] sm:w-auto"
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
					class="{DS_ENTITY_BOARD_CLASSES.registryFooterSelect} w-[7.5rem]"
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
						class="{DS_ENTITY_BOARD_CLASSES.registryViewAll} ml-auto sm:ml-0"
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
