<script lang="ts">
	import type { Action } from 'svelte/action';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { ArrowPathIcon, ChevronDownIcon, FolderIcon } from 'heroicons-svelte/24/solid';
	import { XMarkIcon } from 'heroicons-svelte/24/outline';
	import Search from '$lib/components/icons/Search.svelte';

	import { caseEngineToken, caseEngineUser, unitFilter, activeCaseId, activeCaseNumber } from '$lib/stores';
	import { listCases, type CaseEngineCase } from '$lib/apis/caseEngine';
	import {
		applyCaseBrowse,
		filterCasesByDateRange,
		filterCasesByIncidentYear,
		type CasesBrowseSort,
		type CasesDateRange
	} from '$lib/utils/casesBrowse';
	import CreateCaseModal from '$lib/components/case/CreateCaseModal.svelte';
	import EditCaseModal from '$lib/components/case/EditCaseModal.svelte';
	import OperatorCommandCenterFrame from '$lib/components/operator/OperatorCommandCenterFrame.svelte';
	import OccHeroCitySkyline from '$lib/components/operator/OccHeroCitySkyline.svelte';
	import CasesActiveDetailsPanel from '$lib/components/operator/CasesActiveDetailsPanel.svelte';
	import { isDetectiveWave2AppShellEnabled } from '$lib/case/detectiveWave2Shell';
	import { occHeroIconClass } from '$lib/components/icons/occ/occHeroIconDefaults';
	import CasesBrowseCaseCard from '$lib/components/operator/CasesBrowseCaseCard.svelte';
	import CasesFiltersPopover from '$lib/components/operator/CasesFiltersPopover.svelte';
	import {
		DS_APP_SHELL_CLASSES,
		DS_BTN_CLASSES,
		DS_CASE_BROWSE_CLASSES,
		DS_COMMAND_CENTER_CLASSES,
		DS_OCC_CLASSES,
		DS_STACK_CLASSES,
		DS_STATUS_SURFACE_CLASSES,
		DS_TYPE_CLASSES
	} from '$lib/case/detectivePrimitiveFoundation';

	let cases: CaseEngineCase[] = [];
	let selectedUnit: 'ALL' | 'CID' | 'SIU' = 'ALL';
	let selectedStatus: 'ALL' | 'OPEN' | 'CLOSED' = 'ALL';
	let searchQuery = '';
	let sortBy: CasesBrowseSort = 'incident_date_desc';
	let loading = true;
	let error = '';
	let showCreateCaseModal = false;
	let showEditCaseModal = false;
	let editingCase: CaseEngineCase | null = null;
	/** Expanded / “active” row in the browse list (drives card chrome + OCC right rail). */
	let listFocusCaseId: string | null = null;
	let viewMode: 'list' | 'grid' = 'list';
	let dateRange: CasesDateRange = 'all';
	/** Four-digit incident year filter — mutually exclusive with date window presets (handled in `CasesFiltersPopover`). */
	let incidentYear = '';
	/** Client-only window over `visibleCases` — Case Engine returns the full unit list; we render in chunks + infinite scroll. */
	const BROWSE_CHUNK = 40;
	let displayedCount = BROWSE_CHUNK;
	/** Scroll container for intersection observer (Wave 2 vs legacy layout). */
	let browseScrollRoot: HTMLDivElement | null = null;
	/** Split "+" hero control */
	let newCaseMenuOpen = false;
	/** Unit/status filters popover (replaces left filter column; matches Cases mock). */
	let filtersMenuOpen = false;

	$: wave2Shell = isDetectiveWave2AppShellEnabled();

	async function loadCases() {
		loading = true;
		error = '';
		try {
			cases = await listCases(selectedUnit, $caseEngineToken!);
		} catch (e) {
			error = (e as Error).message ?? 'Failed to load cases';
		} finally {
			loading = false;
		}
	}

	function openCase(c: CaseEngineCase) {
		activeCaseId.set(c.id);
		activeCaseNumber.set(c.case_number);
		goto(`/case/${c.id}/summary`);
	}

	function gotoCaseSection(c: CaseEngineCase, suffix: string) {
		activeCaseId.set(c.id);
		activeCaseNumber.set(c.case_number);
		goto(`/case/${c.id}${suffix}`);
	}

	function leadLabel(name: string | undefined): string {
		return name?.trim() ? name.trim() : 'Unassigned';
	}

	function leadInitials(name: string | undefined): string {
		const t = name?.trim();
		if (!t) return '—';
		const parts = t.split(/\s+/).filter(Boolean);
		if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
		return `${parts[0][0] ?? ''}${parts[parts.length - 1][0] ?? ''}`.toUpperCase();
	}

	function openEditCase(c: CaseEngineCase) {
		editingCase = c;
		showEditCaseModal = true;
	}

	function onUnitChange() {
		unitFilter.set(selectedUnit);
		loadCases();
	}

	$: filteredByBrowse = applyCaseBrowse(cases, {
		unit: selectedUnit,
		status: selectedStatus,
		searchQuery,
		sortBy
	});
	$: yearFilterKey = incidentYear.trim();
	$: visibleCases =
		yearFilterKey && /^\d{4}$/.test(yearFilterKey)
			? filterCasesByIncidentYear(filteredByBrowse, yearFilterKey)
			: filterCasesByDateRange(filteredByBrowse, dateRange);

	$: displayedCases = visibleCases.slice(0, displayedCount);
	$: hasMoreInBrowse = displayedCount < visibleCases.length;
	$: rangeEndDisplayed = visibleCases.length === 0 ? 0 : Math.min(displayedCount, visibleCases.length);

	/** Reset the browse window when filters / sort / dataset change (not when only loading more rows). */
	$: browseResetKey = `${searchQuery}\0${dateRange}\0${incidentYear}\0${selectedStatus}\0${selectedUnit}\0${sortBy}\0${cases.length}\0${visibleCases.length}`;
	$: {
		void browseResetKey;
		displayedCount = Math.min(BROWSE_CHUNK, visibleCases.length);
	}

	function loadMoreBrowse() {
		if (displayedCount >= visibleCases.length) return;
		displayedCount = Math.min(displayedCount + BROWSE_CHUNK, visibleCases.length);
	}

	const casesInfiniteScroll: Action<
		HTMLElement,
		{ root: HTMLElement | null; enabled: boolean; onIntersect: () => void }
	> = (node, params) => {
		let obs: IntersectionObserver | null = null;
		function apply() {
			obs?.disconnect();
			obs = null;
			if (!params.enabled || !params.root) return;
			obs = new IntersectionObserver(
				(entries) => {
					if (entries.some((e) => e.isIntersecting)) params.onIntersect();
				},
				{ root: params.root, rootMargin: '200px', threshold: 0 }
			);
			obs.observe(node);
		}
		apply();
		return {
			update(newParams: typeof params) {
				params = newParams;
				apply();
			},
			destroy() {
				obs?.disconnect();
			}
		};
	};

	function clickAwayFilters(e: MouseEvent) {
		if (!(e.target as HTMLElement).closest?.('[data-cases-filter-wrap]')) filtersMenuOpen = false;
	}

	function clickAwayNewCase(e: MouseEvent) {
		if (!(e.target as HTMLElement).closest?.('[data-cases-new-split]')) newCaseMenuOpen = false;
	}

	$: {
		if (!visibleCases.length) {
			listFocusCaseId = null;
		} else if (!listFocusCaseId || !visibleCases.some((c) => c.id === listFocusCaseId)) {
			listFocusCaseId = visibleCases[0].id;
		} else {
			const idx = visibleCases.findIndex((c) => c.id === listFocusCaseId);
			if (idx >= displayedCount) {
				displayedCount = Math.min(Math.max(displayedCount, idx + 1), visibleCases.length);
			} else {
				const shown = visibleCases.slice(0, displayedCount);
				if (shown.length && !shown.some((c) => c.id === listFocusCaseId)) {
					listFocusCaseId = shown[0].id;
				}
			}
		}
	}

	$: occContextCase =
		listFocusCaseId && cases.length > 0 ? cases.find((c) => c.id === listFocusCaseId) ?? null : null;

	onMount(() => {
		selectedUnit = $unitFilter ?? 'ALL';
		if ($caseEngineToken) {
			loadCases();
		} else {
			loading = false;
		}
	});
</script>

<svelte:window
	on:click={(e) => {
		if (newCaseMenuOpen) clickAwayNewCase(e);
		if (filtersMenuOpen) clickAwayFilters(e);
	}}
/>

{#if wave2Shell}
	<OperatorCommandCenterFrame occDesktopBoard={false} heroHeadingId="occ-cases-hero-heading" dashboardGridVariant="cases">
		<div class="ds-occ-dashboard-hero-banner__stack" slot="heroBanner">
			<OccHeroCitySkyline />
			<div class="ds-occ-hero-band__inner ds-occ-hero-band__inner--on-banner w-full">
				<div class="flex items-center gap-3 min-w-0 flex-1">
					<FolderIcon
						class="{occHeroIconClass.hero} shrink-0 text-[color:var(--ds-accent)] opacity-90"
						aria-hidden="true"
					/>
					<div class="min-w-0">
						<h1 id="occ-cases-hero-heading" class={DS_TYPE_CLASSES.display}>
							Cases
						</h1>
						<p class="{DS_TYPE_CLASSES.meta} mt-1 max-w-2xl">
							Create / Select across CID and SIU.
						</p>
					</div>
				</div>
				<div class="ds-occ-hero-actions flex items-stretch gap-0" data-testid="cases-hero-actions" data-cases-new-split>
					{#if $caseEngineToken}
						<button
							type="button"
							class="{DS_BTN_CLASSES.primary} rounded-e-none px-3"
							on:click={() => {
								newCaseMenuOpen = false;
								showCreateCaseModal = true;
							}}
						>
							+ New Case
						</button>
						<div class="relative inline-flex">
							<button
								type="button"
								class="{DS_BTN_CLASSES.primary} rounded-s-none border-s border-[color:var(--ds-border-default)] px-2 min-w-[2rem]"
								aria-label="More new case options"
								aria-expanded={newCaseMenuOpen}
								aria-haspopup="menu"
								on:click|stopPropagation={() => (newCaseMenuOpen = !newCaseMenuOpen)}
							>
								<ChevronDownIcon class="size-4" aria-hidden="true" />
							</button>
							{#if newCaseMenuOpen}
								<ul
									class="absolute right-0 top-full z-30 mt-1 min-w-[12rem] rounded-md border border-[color:var(--ds-border-default)] bg-[color:var(--ds-bg-elevated)] py-1 text-sm shadow-lg"
									role="menu"
								>
									<li role="none">
										<button
											type="button"
											class="block w-full text-left px-3 py-2 hover:bg-[color:var(--ds-bg-muted)]"
											role="menuitem"
											on:click={() => {
												newCaseMenuOpen = false;
												showCreateCaseModal = true;
											}}
										>
											Blank case
										</button>
									</li>
								</ul>
							{/if}
						</div>
					{/if}
				</div>
			</div>
		</div>
		<div class="hidden" slot="hero" aria-hidden="true"></div>

		<div class="hidden" slot="summary" aria-hidden="true"></div>

		<div class="flex min-h-0 min-w-0 flex-1 flex-col" slot="colCenter" data-testid="cases-occ-center">
			{#if !$caseEngineToken}
				<div class="{DS_STATUS_SURFACE_CLASSES.neutral} rounded-[var(--ds-radius-md)] p-8 text-center">
					<p class="{DS_TYPE_CLASSES.panel}">Case Engine not connected</p>
					<p class="{DS_TYPE_CLASSES.meta} mt-1">
						Use the Cases section in the sidebar to connect your account.
					</p>
				</div>
			{:else if loading}
				<div class="flex items-center gap-2 {DS_TYPE_CLASSES.meta} py-6">
					<svg class="animate-spin size-4 shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
						<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
						<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
					</svg>
					Loading cases…
				</div>
			{:else if error}
				<div class="{DS_STATUS_SURFACE_CLASSES.danger} rounded-[var(--ds-radius-md)] p-4">
					<p class="{DS_TYPE_CLASSES.panel}">Failed to load cases</p>
					<p class="{DS_TYPE_CLASSES.meta} mt-0.5">{error}</p>
					<button type="button" class="{DS_BTN_CLASSES.secondary} mt-3" on:click={loadCases}>
						Try again
					</button>
				</div>
			{:else}
				<div class="{DS_OCC_CLASSES.mainSection} flex min-h-0 flex-1 flex-col">
					<div class="{DS_CASE_BROWSE_CLASSES.toolbar}">
						<div class={DS_CASE_BROWSE_CLASSES.toolbarGrid}>
							<div class="relative min-w-0">
								<label class="{DS_TYPE_CLASSES.label} sr-only" for="cases-occ-search">Search cases</label>
								<div
									class="{DS_APP_SHELL_CLASSES.topSearchComposite} w-full min-w-0 !max-w-none pe-[4.25rem]"
								>
									<Search className="size-4 shrink-0 opacity-85" strokeWidth="1.5" />
									<input
										id="cases-occ-search"
										type="text"
										placeholder="Search case numbers, titles, assigned…"
										bind:value={searchQuery}
										class="min-w-0 flex-1"
									/>
								</div>
								<div
									class="absolute end-1.5 top-1/2 flex -translate-y-1/2 items-center gap-0.5"
									aria-hidden="true"
								>
									{#if searchQuery.trim()}
										<button
											type="button"
											class="ds-btn ds-btn-ghost p-1.5 min-h-0 rounded"
											aria-label="Clear search"
											on:click={() => {
												searchQuery = '';
											}}
										>
											<XMarkIcon class="size-4 opacity-80" />
										</button>
									{/if}
									<button
										type="button"
										class="ds-btn ds-btn-ghost p-1.5 min-h-0 rounded"
										aria-label="Refresh case list"
										on:click={() => loadCases()}
									>
										<ArrowPathIcon class="size-4 opacity-85" />
									</button>
								</div>
							</div>
							<div class="min-w-0 w-full max-w-full min-[1024px]:w-auto min-[1024px]:max-w-[11rem]">
								<span class="{DS_TYPE_CLASSES.label} sr-only">Filters</span>
								<CasesFiltersPopover
									bind:open={filtersMenuOpen}
									bind:selectedUnit
									bind:selectedStatus
									bind:dateRange
									bind:incidentYear
									disabled={!$caseEngineToken || loading}
									unitId="cases-occ-filter-unit"
									statusId="cases-occ-filter-status"
									dateRangeId="cases-occ-filter-date-range"
									yearInputId="cases-occ-filter-year"
									onUnitChange={onUnitChange}
								/>
							</div>
							<div class="min-w-0 min-[1024px]:min-w-[12rem]">
								<label class="{DS_TYPE_CLASSES.label} sr-only" for="cases-occ-sort">Sort</label>
								<select
									id="cases-occ-sort"
									bind:value={sortBy}
									class="w-full min-h-[2.75rem] rounded-md border border-[color:var(--ds-border-default)] bg-[color:var(--ds-bg-muted)]/40 px-2 py-2 text-sm"
								>
									<option value="created_desc">Created date newest</option>
									<option value="created_asc">Created date oldest</option>
									<option value="case_number_asc">Case number A-Z</option>
									<option value="incident_date_desc">Incident date newest</option>
									<option value="incident_date_asc">Incident date oldest</option>
								</select>
							</div>
							<div class="flex min-w-0 justify-end min-[1024px]:justify-start">
								<span class="{DS_TYPE_CLASSES.label} sr-only">Layout</span>
								<div class={DS_CASE_BROWSE_CLASSES.viewToggle} role="group" aria-label="Case layout">
									<button
										type="button"
										class="{DS_CASE_BROWSE_CLASSES.viewToggleBtn}{viewMode === 'grid' ? ' ds-case-browse-view-toggle__btn--active' : ''}"
										on:click={() => (viewMode = 'grid')}
									>
										Grid
									</button>
									<button
										type="button"
										class="{DS_CASE_BROWSE_CLASSES.viewToggleBtn}{viewMode === 'list' ? ' ds-case-browse-view-toggle__btn--active' : ''}"
										on:click={() => (viewMode = 'list')}
									>
										List
									</button>
								</div>
							</div>
						</div>
					</div>
					<div
						class="{DS_OCC_CLASSES.boardCardBody} min-h-0 flex-1 overflow-auto"
						bind:this={browseScrollRoot}
						data-testid="cases-occ-browse-scroll"
					>
						{#if visibleCases.length === 0}
							<div class="{DS_STATUS_SURFACE_CLASSES.neutral} rounded-[var(--ds-radius-md)] p-8 text-center">
								<p class="{DS_TYPE_CLASSES.body}">No cases match your current filters.</p>
							</div>
						{:else}
							<div
								class={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 gap-3' : 'flex flex-col gap-3'}
							>
								{#each displayedCases as c (c.id)}
									<CasesBrowseCaseCard
										c={c}
										selected={listFocusCaseId === c.id}
										assigneeLabel={leadLabel($caseEngineUser?.name)}
										assigneeInitials={leadInitials($caseEngineUser?.name)}
										on:select={(e) => (listFocusCaseId = e.detail.id)}
										on:open={(e) => openCase(e.detail.case)}
										on:edit={(e) => openEditCase(e.detail.case)}
										on:gotoNotes={(e) => gotoCaseSection(e.detail.case, '/notes')}
										on:gotoFiles={(e) => gotoCaseSection(e.detail.case, '/files')}
										on:gotoTimeline={(e) => gotoCaseSection(e.detail.case, '/timeline')}
									/>
								{/each}
							</div>
							{#if hasMoreInBrowse}
								<div
									class="h-px w-full shrink-0"
									aria-hidden="true"
									data-testid="cases-occ-infinite-sentinel"
									use:casesInfiniteScroll={{
										root: browseScrollRoot,
										enabled: hasMoreInBrowse && !!browseScrollRoot,
										onIntersect: loadMoreBrowse
									}}
								></div>
							{/if}
						{/if}
					</div>
					{#if visibleCases.length > 0}
						<div
							class="mt-3 flex flex-col gap-2 border-t border-[color:var(--ds-border-default)] pt-3 px-1 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between"
							data-testid="cases-occ-pagination"
						>
							<p class="{DS_TYPE_CLASSES.meta} m-0">
								Showing {rangeEndDisplayed} of {visibleCases.length} matching
								{visibleCases.length !== 1 ? 'cases' : 'case'}
								{#if hasMoreInBrowse}
									<span class="text-[color:var(--ds-text-muted)]"> · scroll for more</span>
								{/if}
							</p>
							{#if hasMoreInBrowse}
								<button
									type="button"
									class="{DS_BTN_CLASSES.secondary} py-1.5 px-3 text-sm"
									on:click={loadMoreBrowse}
								>
									Load more
								</button>
							{/if}
						</div>
					{/if}
					<p class="{DS_TYPE_CLASSES.meta} mt-3 text-right px-1">
						{cases.length} loaded · {visibleCases.length} after filters · connected as
						<span class="font-medium text-[var(--ds-text-secondary)]">{$caseEngineUser?.name ?? '…'}</span>
					</p>
				</div>
			{/if}
		</div>

		<div class="{DS_STACK_CLASSES.stack} flex min-h-0 min-w-0 flex-col" slot="colRight" data-testid="cases-occ-right">
			<CasesActiveDetailsPanel
				tokenPresent={!!$caseEngineToken}
				caseEngineToken={$caseEngineToken}
				caseData={occContextCase}
				emptyMessage={$caseEngineToken
					? 'Select a case from the list or create a new case.'
					: 'Connect Case Engine to browse cases.'}
				onOpenCase={() => occContextCase && openCase(occContextCase)}
				onRefreshList={() => loadCases()}
			/>
		</div>
	</OperatorCommandCenterFrame>
{:else}
	<div class={DS_COMMAND_CENTER_CLASSES.page}>
		<div class={DS_COMMAND_CENTER_CLASSES.pageInner}>
			<header class={DS_COMMAND_CENTER_CLASSES.header}>
				<div class="flex items-start gap-3 min-w-0">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						fill="none"
						viewBox="0 0 24 24"
						stroke-width="1.5"
						stroke="currentColor"
						class="size-7 shrink-0 text-[var(--ds-accent)] opacity-90"
						aria-hidden="true"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z"
						/>
					</svg>
					<div class="min-w-0">
						<h1 class={DS_TYPE_CLASSES.display}>Cases</h1>
						<p class="{DS_TYPE_CLASSES.meta} mt-1 max-w-xl">Create / Select across CID and SIU.</p>
					</div>
				</div>
				{#if $caseEngineToken}
					<div class="flex items-stretch gap-0" data-cases-new-split>
						<button
							type="button"
							class="{DS_BTN_CLASSES.primary} rounded-e-none px-4"
							on:click={() => (showCreateCaseModal = true)}
						>
							+ New Case
						</button>
						<button
							type="button"
							class="{DS_BTN_CLASSES.primary} rounded-s-none border-s border-[color:var(--ds-border-default)] px-2 min-w-[2.5rem]"
							aria-label="New case options"
							on:click={() => (showCreateCaseModal = true)}
						>
							<ChevronDownIcon class="size-4" aria-hidden="true" />
						</button>
					</div>
				{/if}
			</header>

			{#if !$caseEngineToken}
				<div class="{DS_STATUS_SURFACE_CLASSES.neutral} rounded-[var(--ds-radius-md)] p-8 text-center">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						fill="none"
						viewBox="0 0 24 24"
						stroke-width="1.5"
						stroke="currentColor"
						class="size-10 mx-auto mb-3 opacity-70"
						aria-hidden="true"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z"
						/>
					</svg>
					<p class="{DS_TYPE_CLASSES.panel}">Case Engine not connected</p>
					<p class="{DS_TYPE_CLASSES.meta} mt-1">
						Use the Cases section in the sidebar to connect your account.
					</p>
				</div>
			{:else if loading}
				<div class="flex items-center gap-2 {DS_TYPE_CLASSES.meta}">
					<svg class="animate-spin size-4 shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
						<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
						<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
					</svg>
					Loading cases…
				</div>
			{:else if error}
				<div class="{DS_STATUS_SURFACE_CLASSES.danger} rounded-[var(--ds-radius-md)] p-4">
					<p class="{DS_TYPE_CLASSES.panel}">Failed to load cases</p>
					<p class="{DS_TYPE_CLASSES.meta} mt-0.5">{error}</p>
					<button type="button" class="{DS_BTN_CLASSES.secondary} mt-3" on:click={loadCases}>Try again</button>
				</div>
			{:else}
				<div class={DS_COMMAND_CENTER_CLASSES.filterBar}>
					<div class="flex flex-col gap-3">
						<div class="flex flex-wrap items-end gap-2">
							<div class="relative min-w-[min(100%,12rem)] flex-1">
								<label class={DS_TYPE_CLASSES.label} for="cases-filter-search">Search</label>
								<input
									id="cases-filter-search"
									type="text"
									class="mt-1 w-full min-h-[2.875rem] rounded-md border border-[color:var(--ds-border-default)] bg-[color:var(--ds-bg-surface)] px-3 py-2.5 text-sm leading-snug"
									placeholder="Search case numbers, titles, assigned…"
									bind:value={searchQuery}
								/>
							</div>
							<div class="min-w-0 w-full max-w-full sm:w-auto sm:max-w-[11rem]">
								<span class="{DS_TYPE_CLASSES.label} sr-only">Filters</span>
								<CasesFiltersPopover
									bind:open={filtersMenuOpen}
									bind:selectedUnit
									bind:selectedStatus
									bind:dateRange
									bind:incidentYear
									disabled={!$caseEngineToken || loading}
									unitId="cases-legacy-filter-unit"
									statusId="cases-legacy-filter-status"
									dateRangeId="cases-legacy-filter-date-range"
									yearInputId="cases-legacy-filter-year"
									onUnitChange={onUnitChange}
								/>
							</div>
							<div class="min-w-[10rem]">
								<label class="{DS_TYPE_CLASSES.label} sr-only" for="cases-filter-sort">Sort</label>
								<select
									id="cases-filter-sort"
									bind:value={sortBy}
									class="w-full min-h-[2.75rem] rounded-md border border-[color:var(--ds-border-default)] bg-[color:var(--ds-bg-surface)] px-2 py-2 text-sm"
								>
									<option value="created_desc">Created date newest</option>
									<option value="created_asc">Created date oldest</option>
									<option value="case_number_asc">Case number A-Z</option>
									<option value="incident_date_desc">Incident date newest</option>
									<option value="incident_date_asc">Incident date oldest</option>
								</select>
							</div>
							<div class="flex shrink-0 pb-0.5">
								<span class="{DS_TYPE_CLASSES.label} sr-only">Layout</span>
								<div class={DS_CASE_BROWSE_CLASSES.viewToggle} role="group" aria-label="Case layout">
									<button
										type="button"
										class="{DS_CASE_BROWSE_CLASSES.viewToggleBtn}{viewMode === 'grid' ? ' ds-case-browse-view-toggle__btn--active' : ''}"
										on:click={() => (viewMode = 'grid')}
									>
										Grid
									</button>
									<button
										type="button"
										class="{DS_CASE_BROWSE_CLASSES.viewToggleBtn}{viewMode === 'list' ? ' ds-case-browse-view-toggle__btn--active' : ''}"
										on:click={() => (viewMode = 'list')}
									>
										List
									</button>
								</div>
							</div>
						</div>
					</div>
				</div>

				{#if visibleCases.length === 0}
					<div class="{DS_STATUS_SURFACE_CLASSES.neutral} rounded-[var(--ds-radius-md)] p-8 text-center">
						<p class="{DS_TYPE_CLASSES.body}">No cases match your current filters.</p>
					</div>
				{:else}
					<div
						class="mt-2 max-h-[min(70vh,40rem)] min-h-[12rem] overflow-y-auto rounded-[var(--ds-radius-md)] border border-[color:var(--ds-border-default)] bg-[color:var(--ds-bg-elevated)]/40 p-3"
						bind:this={browseScrollRoot}
						data-testid="cases-legacy-browse-scroll"
					>
						<div
							class={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 gap-3' : 'flex flex-col gap-3'}
						>
							{#each displayedCases as c (c.id)}
								<CasesBrowseCaseCard
									c={c}
									selected={listFocusCaseId === c.id}
									assigneeLabel={leadLabel($caseEngineUser?.name)}
									assigneeInitials={leadInitials($caseEngineUser?.name)}
									on:select={(e) => (listFocusCaseId = e.detail.id)}
									on:open={(e) => openCase(e.detail.case)}
									on:edit={(e) => openEditCase(e.detail.case)}
									on:gotoNotes={(e) => gotoCaseSection(e.detail.case, '/notes')}
									on:gotoFiles={(e) => gotoCaseSection(e.detail.case, '/files')}
									on:gotoTimeline={(e) => gotoCaseSection(e.detail.case, '/timeline')}
								/>
							{/each}
						</div>
						{#if hasMoreInBrowse}
							<div
								class="h-px w-full shrink-0"
								aria-hidden="true"
								data-testid="cases-legacy-infinite-sentinel"
								use:casesInfiniteScroll={{
									root: browseScrollRoot,
									enabled: hasMoreInBrowse && !!browseScrollRoot,
									onIntersect: loadMoreBrowse
								}}
							></div>
						{/if}
					</div>
					<div
						class="mt-3 flex flex-col gap-2 border-t border-[color:var(--ds-border-default)] pt-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between"
						data-testid="cases-legacy-pagination"
					>
						<p class="{DS_TYPE_CLASSES.meta} m-0">
							Showing {rangeEndDisplayed} of {visibleCases.length} matching
							{visibleCases.length !== 1 ? 'cases' : 'case'}
							{#if hasMoreInBrowse}
								<span class="text-[color:var(--ds-text-muted)]"> · scroll for more</span>
							{/if}
						</p>
						{#if hasMoreInBrowse}
							<button
								type="button"
								class="{DS_BTN_CLASSES.secondary} py-1.5 px-3 text-sm"
								on:click={loadMoreBrowse}
							>
								Load more
							</button>
						{/if}
					</div>
				{/if}

				<div class="mt-6">
					<CasesActiveDetailsPanel
						tokenPresent={!!$caseEngineToken}
						caseEngineToken={$caseEngineToken}
						caseData={occContextCase}
						emptyMessage={$caseEngineToken
							? 'Select a case from the list or create a new case.'
							: 'Connect Case Engine to browse cases.'}
						onOpenCase={() => occContextCase && openCase(occContextCase)}
						onRefreshList={() => loadCases()}
					/>
				</div>

				<p class="{DS_TYPE_CLASSES.meta} mt-4 text-right">
					{cases.length} loaded · {visibleCases.length} after filters · connected as
					<span class="font-medium text-[var(--ds-text-secondary)]">{$caseEngineUser?.name ?? '…'}</span>
				</p>
			{/if}
		</div>
	</div>
{/if}

<CreateCaseModal
	show={showCreateCaseModal}
	token={$caseEngineToken}
	on:close={() => (showCreateCaseModal = false)}
	on:created={(event) => {
		showCreateCaseModal = false;
		loadCases();
		const created = event.detail;
		if (created?.id) {
			activeCaseId.set(created.id);
			activeCaseNumber.set(created.case_number);
			goto(`/case/${created.id}/summary`);
		}
	}}
/>

<EditCaseModal
	show={showEditCaseModal}
	token={$caseEngineToken}
	caseData={editingCase}
	on:close={() => {
		showEditCaseModal = false;
		editingCase = null;
	}}
	on:saved={(event) => {
		const saved = event.detail.case as CaseEngineCase;
		cases = cases.map((c) => (c.id === saved.id ? saved : c));
		editingCase = saved;
		if ($activeCaseId === saved.id) {
			activeCaseNumber.set(saved.case_number);
		}
		showEditCaseModal = false;
	}}
/>
