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
		locationRegistryRowDisplay,
		personRegistryRowDisplay,
		phoneRegistryRowDisplay,
		sortCommittedEntities,
		type RegistrySortKey,
		vehicleRegistryRowDisplay
	} from '$lib/utils/caseIntelligenceEntityRegistry';
	import {
		DevicePhoneMobileIcon,
		MapPinIcon,
		PlusIcon,
		TruckIcon,
		UserIcon
	} from 'heroicons-svelte/24/outline';
	import {
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
	import { onMount, tick } from 'svelte';

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
	/** Workspace-level search (Subjects & Assets filter bar) — combined with panel search. */
	export let globalSearchFilter = '';
	/** When set, overrides panel Active / Include retired (filter bar). `null` = panel-local scope. */
	export let workspaceStatusFilter: 'all' | 'active' | 'retired' | null = null;
	/** Person identity posture filter (`''` = all); non-PERSON rows excluded when set. */
	export let workspaceTagFilter = '';
	/** P69-08 — focus anchored column: full-height rail, roster + footer controls, seeded from board snapshot. */
	export let layoutVariant: 'board' | 'anchored' = 'board';
	export let seedPanelState: EntitiesBoardPanelState | null = null;

	let rawRows: CaseIntelligenceCommittedEntity[] = [];
	let loadError = '';
	let loading = false;
	let loadCompletedOnce = false;
	let loadId = 0;
	let lastAppliedRefreshNonce = -1;
	/** Match `SubjectsAssetsRegistryRail`: empty string so first real caseId differs and load runs. */
	let prevCaseId = '';
	/** Reload when auth token first arrives or rotates (case block alone can miss token-after-case ordering). */
	let prevToken = '';
	let prevIncludeRetiredSnapshot: boolean | undefined = undefined;
	/** When workspace status filter defers to panels (`null`), controls `includeRetired` on list fetch. */
	let panelIncludeRetired = false;
	let sortKey: RegistrySortKey = 'name_asc';
	let portraitFailedIds = new Set<string>();
	let expanded = false;
	let panelBodyEl: HTMLDivElement | null = null;
	let pendingListScrollTop: number | undefined = undefined;

	$: includeRetired =
		workspaceStatusFilter === null ? panelIncludeRetired : workspaceStatusFilter !== 'active';
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

	$: filteredRows = rawRows.filter((e) => {
		if (!committedEntityMatchesSearch(e, globalSearchFilter)) {
			return false;
		}
		if (workspaceStatusFilter === 'retired') return !!e.deleted_at;
		if (workspaceStatusFilter === 'active') return !e.deleted_at;
		if (workspaceTagFilter.trim()) {
			if (e.entity_kind !== 'PERSON') return false;
			if ((e.person_identity_posture ?? '') !== workspaceTagFilter) return false;
		}
		return true;
	});
	$: sortedRows = sortCommittedEntities(filteredRows, sortKey);
	$: displayRows = expanded ? sortedRows : sortedRows.slice(0, previewLimit);
	$: hasMoreRows = sortedRows.length > previewLimit;

	function requestDirectCreate(e?: MouseEvent): void {
		e?.preventDefault();
		e?.stopPropagation();
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

	function onRetry(): void {
		void load();
	}

	function markPortraitFailed(id: string): void {
		portraitFailedIds = new Set(portraitFailedIds).add(id);
	}

	$: if (caseId && token && (caseId !== prevCaseId || token !== prevToken)) {
		if (caseId !== prevCaseId) {
			prevCaseId = caseId;
			rawRows = [];
			loadError = '';
			portraitFailedIds = new Set();
			lastAppliedRefreshNonce = refreshNonce;
			prevIncludeRetiredSnapshot = undefined;
			loadCompletedOnce = isPlaceholder;
			if (layoutVariant === 'anchored') {
				expanded = true;
				if (seedPanelState) {
					sortKey =
						seedPanelState.sortKey === 'created_desc' || seedPanelState.sortKey === 'name_asc'
							? (seedPanelState.sortKey as RegistrySortKey)
							: 'name_asc';
					panelIncludeRetired = Boolean(seedPanelState.includeRetired);
					pendingListScrollTop =
						typeof seedPanelState.scrollTop === 'number' ? seedPanelState.scrollTop : undefined;
				} else {
					panelIncludeRetired = false;
					sortKey = 'name_asc';
					pendingListScrollTop = undefined;
				}
			} else {
				panelIncludeRetired = false;
				sortKey = 'name_asc';
				expanded = false;
				pendingListScrollTop = undefined;
			}
		}
		prevToken = token;
		if (!isPlaceholder && apiKind) void load();
	}

	/** Safety net if reactive ordering ever skips the first fetch (token + case already stable on mount). */
	onMount(() => {
		if (caseId && token && !isPlaceholder && apiKind && !loadCompletedOnce && !loading) {
			void load();
		}
	});

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

	$: if (caseId && token && prevCaseId === caseId && loadCompletedOnce && !isPlaceholder) {
		if (prevIncludeRetiredSnapshot !== undefined && prevIncludeRetiredSnapshot !== includeRetired) {
			void load();
		}
		prevIncludeRetiredSnapshot = includeRetired;
	}

	$: countBadgeText = (() => {
		if (isPlaceholder) return '';
		if (!loadCompletedOnce && loading) return '';
		if (loadError) return '';
		if (!loadCompletedOnce) return '';
		const filtered = sortedRows.length;
		const loaded = rawRows.length;
		if (!globalSearchFilter.trim()) return `${filtered}`;
		return `${filtered} / ${loaded}`;
	})();

	export function refreshPanel(): Promise<void> {
		return load();
	}

	export function getPanelState() {
		return {
			searchQuery: '',
			sortKey: sortKey as string,
			includeRetired,
			expanded,
			scrollTop: panelBodyEl?.scrollTop ?? 0
		};
	}

	export async function applyPanelState(
		partial: Partial<ReturnType<typeof getPanelState>>
	): Promise<void> {
		if (partial.sortKey === 'name_asc' || partial.sortKey === 'created_desc')
			sortKey = partial.sortKey as RegistrySortKey;
		if (typeof partial.includeRetired === 'boolean') {
			panelIncludeRetired = partial.includeRetired;
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
		const parts: string[] = [DS_ENTITY_BOARD_CLASSES.registryRoster];
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
	<header class="shrink-0 {headerChromeClass(entityKind)}">
		<div class="{DS_ENTITY_BOARD_CLASSES.registryHeaderTop}">
			<div class="flex min-w-0 flex-1 items-start gap-2.5">
				<span class="{DS_ENTITY_BOARD_CLASSES.registryKindIcon}" aria-hidden="true">
					{#if entityKind === 'PERSON'}
						<UserIcon class="h-5 w-5" />
					{:else if entityKind === 'LOCATION'}
						<MapPinIcon class="h-5 w-5" />
					{:else if entityKind === 'VEHICLE'}
						<TruckIcon class="h-5 w-5" />
					{:else}
						<DevicePhoneMobileIcon class="h-5 w-5" />
					{/if}
				</span>
				<div class="min-w-0 flex-1">
					<h2 id="{testId}-title" class="{DS_ENTITY_BOARD_CLASSES.registryTitle}">
						<span>{heading}</span>
						{#if !isPlaceholder}
							{#if loadCompletedOnce && !loadError && countBadgeText}
								<span class="tabular-nums text-[color:var(--ds-text-secondary)]" data-testid="{testId}-count">
									{countBadgeText}{#if globalSearchFilter.trim()}
										<span class="font-normal opacity-80"> / loaded</span>{/if}
								</span>
							{:else if loading && !loadCompletedOnce}
								<span
									class="{DS_SKELETON_CLASSES.base} {DS_SKELETON_CLASSES.shimmer} inline-block h-3.5 w-8 max-w-[2rem]"
									aria-hidden="true"
									data-testid="{testId}-count-skeleton"
								></span>
							{/if}
						{/if}
					</h2>
					<p
						class="{DS_ENTITY_BOARD_CLASSES.registrySubtitle} {layoutVariant === 'board' ? 'sr-only' : ''}"
						title={subheader}
					>
						{subheader}
					</p>
				</div>
			</div>
			<div
				class="flex min-w-0 shrink-0 flex-wrap items-center justify-end gap-1.5"
				data-testid="{testId}-toolbar"
			>
				{#if !isPlaceholder}
					<button
						type="button"
						class="{DS_ENTITY_BOARD_CLASSES.registryHeaderAdd}"
						data-testid="{testId}-add"
						disabled={!token}
						title={addLabel}
						aria-label={addLabel}
						on:click|stopPropagation|preventDefault={requestDirectCreate}
					>
						<PlusIcon class="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
						<span aria-hidden="true">ADD</span>
					</button>
				{/if}
				{#if layoutVariant !== 'anchored' && hasMoreRows && loadCompletedOnce && !loadError && sortedRows.length > 0}
					<button
						type="button"
						class="{DS_ENTITY_BOARD_CLASSES.registryViewAll} {DS_BTN_CLASSES.ghost} !px-2 !py-1 !text-[10px] !font-semibold !uppercase !tracking-wide !text-[color:var(--ds-text-muted)] hover:!text-[color:var(--ds-text-secondary)]"
						data-testid="{testId}-view-all"
						on:click={toggleExpanded}
					>
						{expanded ? 'Preview' : 'View all'}
					</button>
				{/if}
			</div>
		</div>
		<div class="{DS_ENTITY_BOARD_CLASSES.registryHeaderDivider}" aria-hidden="true"></div>
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
					<p class="ds-type-meta mt-1 opacity-90">
						Use <span class="font-semibold">+ ADD</span> in the card title, or use intake below for staging first.
					</p>
				</div>
			{:else if sortedRows.length === 0}
				<div class="{DS_ENTITY_BOARD_CLASSES.registryFilteredEmpty}" data-testid="{testId}-filtered-empty">
					<p class="ds-type-body">No matches in this roster slice.</p>
					<button
						type="button"
						class="{DS_INTELLIGENCE_CLASSES.inlineLink} mt-1.5 text-[11px] font-medium"
						data-testid="{testId}-clear-search"
						on:click={() => {
							globalSearchFilter = '';
						}}
					>
						Clear search
					</button>
				</div>
			{:else}
				<ul class="{DS_ENTITY_BOARD_CLASSES.registryList}" role="list" data-testid="{testId}-list">
				{#each displayRows as ent (ent.id)}
					{@const portrait = entityKind === 'PERSON' ? entityPortraitUrl(ent.core_attributes ?? {}) : null}
					{@const showPortrait = portrait && !portraitFailedIds.has(ent.id)}
					{@const isSelected = selectedEntityId === ent.id}
					{@const personRow = entityKind === 'PERSON' ? personRegistryRowDisplay(ent) : null}
					{@const vehicleRow = entityKind === 'VEHICLE' ? vehicleRegistryRowDisplay(ent) : null}
					{@const locationRow = entityKind === 'LOCATION' ? locationRegistryRowDisplay(ent) : null}
					{@const phoneRow = entityKind === 'PHONE' ? phoneRegistryRowDisplay(ent) : null}
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
							<div class="flex w-full min-w-0 items-start gap-3">
								<div class="flex shrink-0 items-start pt-0.5">
									{#if entityKind === 'PERSON'}
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
												class="{leadingTileClasses('PERSON')} !flex !h-11 !w-11 !items-center !justify-center !rounded-md !text-[11px]"
												aria-hidden="true"
											>
												{initialsFromDisplayLabel(ent.display_label)}
											</span>
										{/if}
									{:else if entityKind === 'VEHICLE'}
										<span class="{leadingTileClasses('VEHICLE')} !flex !h-11 !w-11 !items-center !justify-center !p-0" aria-hidden="true">
											<TruckIcon class="h-5 w-5" />
										</span>
									{:else if entityKind === 'LOCATION'}
										<span class="{leadingTileClasses('LOCATION')} !flex !h-11 !w-11 !items-center !justify-center !p-0" aria-hidden="true">
											<MapPinIcon class="h-5 w-5" />
										</span>
									{:else}
										<span class="{leadingTileClasses('PHONE')} !flex !h-11 !w-11 !items-center !justify-center !p-0" aria-hidden="true">
											<DevicePhoneMobileIcon class="h-5 w-5" />
										</span>
									{/if}
								</div>
								<div class="min-w-0 flex-1">
									<div class="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
										<span class="{DS_ENTITY_BOARD_CLASSES.registryRowLabel}">{ent.display_label}</span>
										{#if ent.deleted_at}
											<span class="{DS_ENTITY_BOARD_CLASSES.registryRetiredPill}">Retired</span>
										{/if}
									</div>
									{#if entityKind === 'PERSON' && personRow}
										{#if personRow.showPoiBadge}
											<span class="{DS_ENTITY_BOARD_CLASSES.registryPoiBadge}">Person of interest</span>
										{:else if personRow.roleLine}
											<p class="{DS_ENTITY_BOARD_CLASSES.registryRowRole}">{personRow.roleLine}</p>
										{/if}
										{#if personRow.dobLine}
											<p class="{DS_ENTITY_BOARD_CLASSES.registryRowMeta}">{personRow.dobLine}</p>
										{/if}
										{#if personRow.demoLine}
											<p class="{DS_ENTITY_BOARD_CLASSES.registryRowMeta}">{personRow.demoLine}</p>
										{/if}
									{:else if entityKind === 'VEHICLE' && vehicleRow}
										{#if vehicleRow.plateLine}
											<p class="{DS_ENTITY_BOARD_CLASSES.registryRowRole}">{vehicleRow.plateLine}</p>
										{/if}
										{#if vehicleRow.lastSeenLine}
											<p class="{DS_ENTITY_BOARD_CLASSES.registryRowMeta}">{vehicleRow.lastSeenLine}</p>
										{/if}
										{#if vehicleRow.locationLine}
											<p class="{DS_ENTITY_BOARD_CLASSES.registryRowMeta}">{vehicleRow.locationLine}</p>
										{/if}
									{:else if entityKind === 'LOCATION' && locationRow}
										{#if locationRow.cityLine}
											<p class="{DS_ENTITY_BOARD_CLASSES.registryRowRole}">{locationRow.cityLine}</p>
										{/if}
										{#if locationRow.roleLabel}
											<p class="{DS_ENTITY_BOARD_CLASSES.registryRowMeta}">{locationRow.roleLabel}</p>
										{/if}
										{#if locationRow.lastSeenLine}
											<p class="{DS_ENTITY_BOARD_CLASSES.registryRowMeta}">{locationRow.lastSeenLine}</p>
										{/if}
									{:else if entityKind === 'PHONE' && phoneRow}
										{#if phoneRow.ownerLine}
											<p class="{DS_ENTITY_BOARD_CLASSES.registryRowRole}">{phoneRow.ownerLine}</p>
										{/if}
										{#if phoneRow.lastPingLine}
											<p class="{DS_ENTITY_BOARD_CLASSES.registryRowMeta}">{phoneRow.lastPingLine}</p>
										{/if}
									{:else}
										{@const secondary = buildRegistrySecondaryLine(ent.entity_kind, ent)}
										{#if secondary}
											<p class="{DS_ENTITY_BOARD_CLASSES.registryRowSecondary}">{secondary}</p>
										{/if}
									{/if}
									<span class="sr-only" title={ent.id}>ID {ent.id}</span>
								</div>
							</div>
						</div>
					</li>
				{/each}
				</ul>
			{/if}
		</div>

	</div>
</section>
