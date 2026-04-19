<!--
	P129-03 — Read-only chronological activity list (Case Engine order preserved; no client reorder).
-->
<script lang="ts">
	import { listCaseActivityEvents, type CaseActivityEvent } from '$lib/apis/caseEngine/caseP129ActivityEventsApi';
	import { caseEngineToken } from '$lib/stores';
	import {
		DS_BANNER_CLASSES,
		DS_EMPTY_CLASSES,
		DS_TYPE_CLASSES
	} from '$lib/case/detectivePrimitiveFoundation';
	import { p129ActivitySourceHref } from '$lib/case/p129ActivitySourceHref';
	import { p129ActivityEventTypeLabel } from '$lib/case/p129ActivityDisplay';
	import { buildP129ActivityChromeRollup } from '$lib/case/p129ActivityChromeRollup';
	import { p129ActivityDomainTheme } from '$lib/case/p129ActivityDomainTheme';
	import {
		p129ActivityDistinctActorOptions,
		p129ActivityEventMatchesClientFilter,
		type P129ActivityClientFilterState
	} from '$lib/case/p129ActivityFeedFilter';
	import { p129ActivityActorDisplay, p129ActivityShortId } from '$lib/case/p129ActivityHumanTarget';
	import { p129ActivityEventSummary } from '$lib/case/p129ActivityEventSummary';
	import { p129ActivityOpenRecordCtaLabel } from '$lib/case/p129ActivityOpenRecordCta';
	import CaseActivityEventDetail from '$lib/components/case/CaseActivityEventDetail.svelte';
	import CaseActivityDomainIcon from '$lib/components/case/CaseActivityDomainIcon.svelte';
	import {
		P129_ACTIVITY_DETAIL_HIDE_EVENT_FIELDS,
		P129_ACTIVITY_DETAIL_LINK_NOTE,
		P129_ACTIVITY_DETAIL_NO_LINK,
		P129_ACTIVITY_DETAIL_SHOW_EVENT_FIELDS
	} from '$lib/caseContext/p129ActivityDetailCopy';
	import {
		P129_ACTIVITY_FEED_BY_PREFIX,
		P129_ACTIVITY_FEED_LOADED_ROWS,
		P129_ACTIVITY_FEED_OF_LOADED,
		P129_ACTIVITY_FEED_REFERENCE,
		P129_ACTIVITY_FEED_SHOWING,
		P129_ACTIVITY_FEED_TIME_LABEL,
		P129_ACTIVITY_FEED_TOTAL_IN_CASE,
		P129_ACTIVITY_LIST_CLEAR_FILTERS,
		P129_ACTIVITY_LIST_EMPTY_BODY,
		P129_ACTIVITY_LIST_EMPTY_TITLE,
		P129_ACTIVITY_LIST_ERROR_GENERIC,
		P129_ACTIVITY_LIST_LOADING,
		P129_ACTIVITY_LIST_LOAD_MORE,
		P129_ACTIVITY_LIST_NO_MATCH,
		P129_ACTIVITY_LIST_SEARCH_PLACEHOLDER,
		P129_ACTIVITY_LIST_SEARCH_TITLE
	} from '$lib/caseContext/p129ActivityListCopy';
	import CaseActivityFiltersPopover from '$lib/components/case/CaseActivityFiltersPopover.svelte';
	import CaseLoadingState from '$lib/components/case/CaseLoadingState.svelte';
	import { formatCaseDateTime } from '$lib/utils/formatDateTime';

	/** Route case id (from `getRouteCaseIdString` in parent). */
	export let caseId: string;

	const PAGE = 50;

	let events: CaseActivityEvent[] = [];
	let loading = true;
	let errorMsg = '';
	let totalCount = 0;
	let loadMoreBusy = false;
	let activeGen = 0;

	let expandedEventId: string | null = null;

	let searchQuery = '';
	let domainFilter: 'all' | string = 'all';
	let actorFilter: 'all' | string = 'all';
	let dateFrom = '';
	let dateTo = '';

	async function runLoad(reset: boolean): Promise<void> {
		const token = $caseEngineToken;
		if (!caseId?.trim() || !token) {
			loading = false;
			if (reset) {
				events = [];
				errorMsg = '';
				totalCount = 0;
				expandedEventId = null;
				searchQuery = '';
				domainFilter = 'all';
				actorFilter = 'all';
				dateFrom = '';
				dateTo = '';
			}
			return;
		}
		const gen = ++activeGen;
		if (reset) {
			loading = true;
			errorMsg = '';
			events = [];
			totalCount = 0;
			expandedEventId = null;
			searchQuery = '';
			domainFilter = 'all';
			actorFilter = 'all';
			dateFrom = '';
			dateTo = '';
		} else {
			loadMoreBusy = true;
		}
		const offset = reset ? 0 : events.length;
		try {
			const res = await listCaseActivityEvents(caseId, token, { limit: PAGE, offset });
			if (gen !== activeGen) return;
			errorMsg = '';
			if (reset) {
				events = res.activity_events;
			} else {
				events = [...events, ...res.activity_events];
			}
			totalCount = res.pagination.total_count;
		} catch (e: unknown) {
			if (gen !== activeGen) return;
			const msg = e instanceof Error ? e.message : P129_ACTIVITY_LIST_ERROR_GENERIC;
			if (reset) {
				errorMsg = msg;
				events = [];
			} else {
				errorMsg = msg;
			}
		} finally {
			if (gen === activeGen) {
				loading = false;
				loadMoreBusy = false;
			}
		}
	}

	let prevWatch = '';
	$: watch = `${caseId}::${$caseEngineToken ?? ''}`;
	$: if (watch !== prevWatch) {
		prevWatch = watch;
		if (caseId?.trim() && $caseEngineToken) {
			void runLoad(true);
		} else {
			activeGen += 1;
			events = [];
			loading = false;
			errorMsg = '';
			totalCount = 0;
			expandedEventId = null;
			searchQuery = '';
			domainFilter = 'all';
			actorFilter = 'all';
			dateFrom = '';
			dateTo = '';
		}
	}

	let activityFiltersOpen = false;

	function clearPopoverFilters(): void {
		domainFilter = 'all';
		actorFilter = 'all';
		dateFrom = '';
		dateTo = '';
	}

	function clearActivityFilters(): void {
		searchQuery = '';
		clearPopoverFilters();
	}

	function clickAwayActivityFilters(e: MouseEvent): void {
		if (!(e.target as HTMLElement).closest?.('[data-case-activity-filter-wrap]')) activityFiltersOpen = false;
	}

	$: activityFilterState = {
		searchRaw: searchQuery,
		domainFilter,
		actorFilter,
		dateFrom,
		dateTo
	} as P129ActivityClientFilterState;

	$: filteredEvents = events.filter((ev) =>
		p129ActivityEventMatchesClientFilter(ev, activityFilterState)
	);

	$: hasPopoverFiltersActive =
		domainFilter !== 'all' ||
		actorFilter !== 'all' ||
		dateFrom.trim().length > 0 ||
		dateTo.trim().length > 0;

	$: actorFilterOptions = p129ActivityDistinctActorOptions(events);

	function onLoadMore(): void {
		void runLoad(false);
	}

	$: canLoadMore = !loading && !loadMoreBusy && events.length < totalCount && totalCount > 0;

	function toggleDetail(eventId: string): void {
		expandedEventId = expandedEventId === eventId ? null : eventId;
	}

	$: chromeRollup = buildP129ActivityChromeRollup(filteredEvents);
</script>

<svelte:window
	on:click={(e) => {
		if (activityFiltersOpen) clickAwayActivityFilters(e);
	}}
/>

<div class="flex min-h-0 flex-1 flex-col" data-testid="case-activity-list-root">
	{#if loading && events.length === 0}
		<div class="flex flex-1 flex-col items-start gap-2 px-1 py-2" data-testid="case-activity-list-loading">
			<CaseLoadingState label={P129_ACTIVITY_LIST_LOADING} testId="case-activity-list-loading-spinner" />
		</div>
	{:else if errorMsg && events.length === 0}
		<div
			class="{DS_BANNER_CLASSES.base} {DS_BANNER_CLASSES.denseModifier} border border-[color:var(--ce-l-border-default)] bg-[color:var(--ce-l-surface-raised)] p-3"
			data-testid="case-activity-list-error"
			role="alert"
		>
			<p class="{DS_BANNER_CLASSES.body} m-0 text-sm text-[color:var(--ce-l-text-primary)]">{errorMsg}</p>
		</div>
	{:else}
		{#if events.length === 0}
			<div
				class="{DS_EMPTY_CLASSES.root} {DS_EMPTY_CLASSES.compact} ce-l-empty-framed px-3 py-6"
				data-testid="case-activity-list-empty"
			>
				<p class="{DS_EMPTY_CLASSES.title} m-0 text-sm text-[color:var(--ce-l-text-secondary)]">
					{P129_ACTIVITY_LIST_EMPTY_TITLE}
				</p>
				<p class="{DS_TYPE_CLASSES.meta} m-0 mt-2 max-w-md text-[color:var(--ce-l-text-muted)]">
					{P129_ACTIVITY_LIST_EMPTY_BODY}
				</p>
			</div>
		{:else}
			<div class="ds-case-activity-chrome px-0.5" data-testid="case-activity-toolbar">
				<div class="ds-case-activity-chrome__left">
					<input
						class="ds-case-activity-toolbar__search"
						type="search"
						autocomplete="off"
						spellcheck="false"
						bind:value={searchQuery}
						placeholder={P129_ACTIVITY_LIST_SEARCH_PLACEHOLDER}
						title={P129_ACTIVITY_LIST_SEARCH_TITLE}
						data-testid="case-activity-search"
					/>
					<CaseActivityFiltersPopover
						bind:open={activityFiltersOpen}
						{caseId}
						bind:domainFilter
						bind:actorFilter
						bind:dateFrom
						bind:dateTo
						actorFilterOptions={actorFilterOptions}
						filtersActive={hasPopoverFiltersActive}
						onClear={clearPopoverFilters}
					/>
				</div>
				{#if filteredEvents.length > 0}
					<div
						class="ds-case-activity-chrome__right ds-case-activity-feed-summary ds-case-activity-feed-summary--in-chrome"
						data-testid="case-activity-feed-summary"
					>
						<span class="{DS_TYPE_CLASSES.meta} text-[color:var(--ce-l-text-secondary)]">
							{P129_ACTIVITY_FEED_SHOWING}
							{filteredEvents.length}
							{P129_ACTIVITY_FEED_OF_LOADED}
							{events.length}
							{P129_ACTIVITY_FEED_LOADED_ROWS}
							·
							{totalCount}
							{P129_ACTIVITY_FEED_TOTAL_IN_CASE}
						</span>
						<span
							class="inline-flex flex-wrap items-center justify-end gap-x-1.5 gap-y-1"
							role="group"
							aria-label="Domain counts for filtered activity"
						>
							{#each chromeRollup as row (row.label)}
								<span
									class="ds-case-activity-feed-summary__chip {row.theme.kpiModifierClass}{row.count === 0
										? ' ds-case-activity-feed-summary__chip--zero'
										: ''}"
									data-testid="case-activity-feed-summary-chip"
									data-activity-domain={row.label}
									title="{row.label}: {row.count} events in current filter view"
								>
									<span class="ds-case-activity-feed-summary__chip-dot" aria-hidden="true"></span>
									{row.label}
									· {row.count}
								</span>
							{/each}
						</span>
					</div>
				{/if}
			</div>

			{#if filteredEvents.length === 0}
				<div
					class="rounded-md border border-[color:var(--ce-l-border-subtle)] bg-[color:var(--ce-l-surface-muted)] px-3 py-2.5"
					data-testid="case-activity-filter-empty"
				>
					<p class="{DS_TYPE_CLASSES.body} m-0 text-sm text-[color:var(--ce-l-text-secondary)]">
						{P129_ACTIVITY_LIST_NO_MATCH}
					</p>
					<button
						type="button"
						class="mt-2 cursor-pointer border-0 bg-transparent p-0 text-xs text-[color:var(--ce-l-text-primary)] underline"
						data-testid="case-activity-filter-empty-reset"
						on:click={clearActivityFilters}
					>
						{P129_ACTIVITY_LIST_CLEAR_FILTERS}
					</button>
				</div>
			{:else}
			<ol
				class="m-0 flex list-none flex-col gap-2 p-0"
				data-testid="case-activity-list"
				aria-label="Case activity events (read-only)"
			>
				{#each filteredEvents as ev (ev.event_id)}
					{@const sourceHref = p129ActivitySourceHref(caseId, ev)}
					{@const theme = p129ActivityDomainTheme(ev)}
					<li data-testid="case-activity-row" data-activity-event-id={ev.event_id} data-activity-domain={theme.domainLabel}>
						<div class="ds-case-activity-feed-card {theme.kpiModifierClass}">
							<div class="ds-case-activity-feed-card__inner">
								<div class="ds-case-activity-feed-card__icon-well" aria-hidden="true">
									<CaseActivityDomainIcon variant={theme.variant} />
								</div>
								<div class="ds-case-activity-feed-card__body">
									<div class="ds-case-activity-feed-card__title-row">
										<div class="ds-case-activity-feed-card__title-main">
											<span class="ds-case-activity-feed-domain-chip">{theme.domainLabel}</span>
											<span class="text-sm font-semibold leading-tight text-[color:var(--ce-l-text-primary)]">
												{p129ActivityEventTypeLabel(ev.event_type)}
											</span>
										</div>
										<span
											class="ds-case-activity-feed-card__by"
											title={String(ev.actor_user_id ?? '').trim() || undefined}
										>
											{P129_ACTIVITY_FEED_BY_PREFIX}
											{p129ActivityActorDisplay(ev.actor_user_id)}
										</span>
										<span
											class="ds-case-activity-feed-card__when"
											title="{P129_ACTIVITY_FEED_TIME_LABEL}: {formatCaseDateTime(ev.occurred_at)}"
										>
											{formatCaseDateTime(ev.occurred_at)}
										</span>
									</div>
									<p class="ds-case-activity-feed-card__summary">{p129ActivityEventSummary(ev)}</p>
									{#if ev.target_id?.trim()}
										<p class="ds-case-activity-feed-card__meta-line">
											<span class="{DS_TYPE_CLASSES.mono}">
												{P129_ACTIVITY_FEED_REFERENCE}: {p129ActivityShortId(ev.target_id)}
											</span>
										</p>
									{/if}
								</div>
								<div class="ds-case-activity-feed-card__actions" data-testid="case-activity-row-actions">
									{#if sourceHref}
										<a
											class="inline-flex max-w-[10.5rem] truncate rounded border border-[color:var(--ce-l-border-default)] bg-[color:var(--ce-l-surface)] px-1.5 py-0.5 text-center text-[0.6875rem] font-medium leading-tight text-[color:var(--ce-l-text-primary)] no-underline transition hover:bg-[color:var(--ce-l-surface-muted)]"
											href={sourceHref}
											title={P129_ACTIVITY_DETAIL_LINK_NOTE}
											data-testid="case-activity-open-source"
											data-activity-source-href={sourceHref}
										>
											{p129ActivityOpenRecordCtaLabel(ev)}
										</a>
									{:else}
										<span class="max-w-[9rem] text-right text-[0.6875rem] text-[color:var(--ce-l-text-muted)]">
											{P129_ACTIVITY_DETAIL_NO_LINK}
										</span>
									{/if}
									<button
										type="button"
										class="cursor-pointer border-0 bg-transparent p-0 text-right text-[0.6875rem] leading-tight text-[color:var(--ce-l-text-primary)] underline"
										data-testid="case-activity-toggle-detail"
										on:click={() => toggleDetail(ev.event_id)}
									>
										{expandedEventId === ev.event_id
											? P129_ACTIVITY_DETAIL_HIDE_EVENT_FIELDS
											: P129_ACTIVITY_DETAIL_SHOW_EVENT_FIELDS}
									</button>
								</div>
							</div>
							{#if expandedEventId === ev.event_id}
								<div class="border-t border-[color:var(--ce-l-border-subtle)] px-2 pb-2 pt-1.5">
									<CaseActivityEventDetail event={ev} embedded />
								</div>
							{/if}
						</div>
					</li>
				{/each}
			</ol>
			{/if}
		{/if}
		{#if errorMsg && events.length > 0}
			<div
				class="{DS_BANNER_CLASSES.base} {DS_BANNER_CLASSES.denseModifier} mt-3 border border-[color:var(--ce-l-border-default)] bg-[color:var(--ce-l-surface-raised)] p-3"
				data-testid="case-activity-list-error-append"
				role="alert"
			>
				<p class="{DS_BANNER_CLASSES.body} m-0 text-sm text-[color:var(--ce-l-text-primary)]">{errorMsg}</p>
			</div>
		{/if}
	{/if}

	{#if canLoadMore}
		<div class="mt-4 shrink-0" data-testid="case-activity-load-more-wrap">
			<button
				type="button"
				class="rounded-md border border-[color:var(--ce-l-border-default)] bg-[color:var(--ce-l-surface-elevated)] px-4 py-2 text-sm font-medium text-[color:var(--ce-l-text-primary)] shadow-sm transition hover:bg-[color:var(--ce-l-surface-muted)] disabled:opacity-60"
				disabled={loadMoreBusy}
				data-testid="case-activity-load-more"
				on:click={onLoadMore}
			>
				{loadMoreBusy ? P129_ACTIVITY_LIST_LOADING : P129_ACTIVITY_LIST_LOAD_MORE}
			</button>
		</div>
	{/if}
</div>
