<script lang="ts">
	/**
	 * P82-04 — Bounded recent case activity on Overview (read-only).
	 * P129 — Uses GET /cases/:id/activity-events (same source as Activity tab); rows match
	 * `CaseActivityList` card styling (`ds-case-activity-feed-card`).
	 */
	import { onDestroy } from 'svelte';
	import { caseEngineToken } from '$lib/stores';
	import { listCaseActivityEvents, type CaseActivityEvent } from '$lib/apis/caseEngine/caseP129ActivityEventsApi';
	import { p129ActivitySourceHref } from '$lib/case/p129ActivitySourceHref';
	import { p129ActivityEventTypeLabel } from '$lib/case/p129ActivityDisplay';
	import { p129ActivityDomainTheme } from '$lib/case/p129ActivityDomainTheme';
	import { p129ActivityActorDisplay, p129ActivityShortId } from '$lib/case/p129ActivityHumanTarget';
	import { p129ActivityEventSummary } from '$lib/case/p129ActivityEventSummary';
	import { p129ActivityOpenRecordCtaLabel } from '$lib/case/p129ActivityOpenRecordCta';
	import CaseActivityDomainIcon from '$lib/components/case/CaseActivityDomainIcon.svelte';
	import CaseLoadingState from '$lib/components/case/CaseLoadingState.svelte';
	import {
		P129_ACTIVITY_DETAIL_LINK_NOTE,
		P129_ACTIVITY_DETAIL_NO_LINK
	} from '$lib/caseContext/p129ActivityDetailCopy';
	import {
		P129_ACTIVITY_FEED_BY_PREFIX,
		P129_ACTIVITY_FEED_REFERENCE,
		P129_ACTIVITY_FEED_TIME_LABEL,
		P129_ACTIVITY_LIST_EMPTY_BODY,
		P129_ACTIVITY_LIST_EMPTY_TITLE,
		P129_ACTIVITY_LIST_ERROR_GENERIC,
		P129_ACTIVITY_LIST_LOADING,
		P129_ACTIVITY_LIST_LOAD_MORE,
		P129_ACTIVITY_LIST_NO_TOKEN
	} from '$lib/caseContext/p129ActivityListCopy';
	import {
		DS_BTN_CLASSES,
		DS_EMPTY_CLASSES,
		DS_STACK_CLASSES,
		DS_STATUS_SURFACE_CLASSES,
		DS_SUMMARY_CLASSES,
		DS_TYPE_CLASSES
	} from '$lib/case/detectivePrimitiveFoundation';
	import { formatCaseDateTime } from '$lib/utils/formatDateTime';

	export let caseId: string;
	/** Section heading (e.g. “Recent Case Activity”). */
	export let heading = 'Recent Case Activity';
	/** Optional description below the heading. */
	export let description: string | undefined = undefined;
	/** Max activity events to fetch (newest-first from Case Engine). Overview uses 20 with an inner scroll. */
	export let entryLimit = 20;
	/** Anchor id for in-page links (`#summary-module-recent-activity`). */
	export let sectionId = 'summary-module-recent-activity';
	export let headingElementId = 'case-overview-recent-activity-heading';
	export let testId = 'case-overview-recent-activity';
	/**
	 * When true (Overview dashboard ≥1200px), column stretches to match siblings and the feed scrolls inside the panel.
	 */
	export let balanceColumnHeight = false;

	type LoadState =
		| { kind: 'loading' }
		| { kind: 'ready'; events: CaseActivityEvent[]; totalCount: number }
		| { kind: 'empty' }
		| { kind: 'error'; message: string };

	let loadGeneration = 0;
	let state: LoadState = { kind: 'loading' };
	let loadingMoreActivity = false;

	function dedupeActivityEvents(rows: CaseActivityEvent[]): CaseActivityEvent[] {
		const seen = new Set<string>();
		const out: CaseActivityEvent[] = [];
		for (const ev of rows) {
			if (seen.has(ev.event_id)) continue;
			seen.add(ev.event_id);
			out.push(ev);
		}
		return out;
	}

	async function loadRecent(id: string, token: string, gen: number): Promise<void> {
		loadingMoreActivity = false;
		state = { kind: 'loading' };
		try {
			const res = await listCaseActivityEvents(id, token, {
				limit: entryLimit,
				offset: 0
			});
			if (gen !== loadGeneration) return;
			const rows = res.activity_events ?? [];
			const totalCount = res.pagination?.total_count ?? rows.length;
			if (rows.length === 0) {
				state = { kind: 'empty' };
			} else {
				state = { kind: 'ready', events: rows, totalCount };
			}
		} catch (e: unknown) {
			if (gen !== loadGeneration) return;
			state = {
				kind: 'error',
				message: e instanceof Error ? e.message : P129_ACTIVITY_LIST_ERROR_GENERIC
			};
		}
	}

	async function loadMoreActivity(): Promise<void> {
		if (state.kind !== 'ready' || !$caseEngineToken || loadingMoreActivity) return;
		const { events, totalCount } = state;
		if (events.length >= totalCount) return;
		loadingMoreActivity = true;
		const gen = loadGeneration;
		try {
			const res = await listCaseActivityEvents(caseId, $caseEngineToken, {
				limit: entryLimit,
				offset: events.length
			});
			if (gen !== loadGeneration) return;
			const more = res.activity_events ?? [];
			const merged = dedupeActivityEvents([...events, ...more]);
			state = {
				kind: 'ready',
				events: merged,
				totalCount: res.pagination?.total_count ?? totalCount
			};
		} catch (e: unknown) {
			if (gen !== loadGeneration) return;
			state = {
				kind: 'error',
				message: e instanceof Error ? e.message : P129_ACTIVITY_LIST_ERROR_GENERIC
			};
		} finally {
			if (gen === loadGeneration) loadingMoreActivity = false;
		}
	}

	$: activityHasMore = state.kind === 'ready' && state.events.length < state.totalCount;

	$: token = $caseEngineToken;

	$: if (caseId && token) {
		loadGeneration += 1;
		const gen = loadGeneration;
		void entryLimit;
		loadRecent(caseId, token, gen);
	} else {
		loadGeneration += 1;
		state = { kind: 'loading' };
	}

	onDestroy(() => {
		loadGeneration += 1;
	});
</script>

<section
	id={sectionId}
	class="{balanceColumnHeight
		? `${DS_STACK_CLASSES.stack} min-[1200px]:flex-1 min-[1200px]:min-h-0 min-[1200px]:pb-0 pb-6`
		: `${DS_STACK_CLASSES.stack} pb-6`}"
	data-testid={testId}
	aria-labelledby={headingElementId}
>
	<div
		class="{DS_SUMMARY_CLASSES.modulePrimary} flex min-h-0 flex-col {balanceColumnHeight
			? 'case-overview-equal-cell min-[1200px]:min-h-0 min-[1200px]:flex-1'
			: ''}"
	>
		<div class="flex shrink-0 flex-wrap items-center justify-between gap-x-3 gap-y-2">
			<h2 id={headingElementId} class="{DS_TYPE_CLASSES.panel} min-w-0 flex-1">
				{heading}
			</h2>
			<a
				href="/case/{caseId}/activity"
				class="shrink-0 whitespace-nowrap text-sm font-medium text-[color:var(--ce-l-text-primary)] underline-offset-2 hover:underline"
				data-testid="case-overview-recent-activity-view-all"
				>View all activity →</a
			>
		</div>
		{#if description}
			<p class="{DS_TYPE_CLASSES.meta} mt-2 max-w-2xl text-[color:var(--ce-l-text-secondary)]">
				{description}
			</p>
		{/if}

		<div
			class="{balanceColumnHeight
				? 'mt-4 flex min-h-0 min-[1200px]:flex-1 min-[1200px]:flex-col min-[1200px]:overflow-hidden min-[1200px]:overflow-x-hidden'
				: 'contents'}"
		>
		{#if !token}
			<p class="{DS_TYPE_CLASSES.meta} {balanceColumnHeight ? '' : 'mt-4'}" data-testid="case-overview-recent-activity-no-token">
				{P129_ACTIVITY_LIST_NO_TOKEN}
			</p>
		{:else if state.kind === 'loading'}
			<div class="{balanceColumnHeight ? '' : 'mt-4'}" data-testid="case-overview-recent-activity-loading">
				<CaseLoadingState label={P129_ACTIVITY_LIST_LOADING} testId="case-overview-recent-activity-spinner" />
			</div>
		{:else if state.kind === 'error'}
			<div
				class="{balanceColumnHeight ? '' : 'mt-4'} rounded-md px-3 py-2 text-sm {DS_STATUS_SURFACE_CLASSES.error}"
				role="alert"
				data-testid="case-overview-recent-activity-error"
			>
				<p class="ds-status-copy">{state.message}</p>
			</div>
		{:else if state.kind === 'empty'}
			<div
				class="{DS_EMPTY_CLASSES.root} {DS_EMPTY_CLASSES.compact} ce-l-empty-framed {balanceColumnHeight ? '' : 'mt-4'} px-2 py-4"
				role="region"
				aria-label="No activity events"
				data-testid="case-overview-recent-activity-empty"
			>
				<p class="{DS_EMPTY_CLASSES.title} m-0 text-sm text-[color:var(--ce-l-text-secondary)]">
					{P129_ACTIVITY_LIST_EMPTY_TITLE}
				</p>
				<p class="{DS_TYPE_CLASSES.meta} m-0 mt-2 max-w-md text-[color:var(--ce-l-text-muted)]">
					{P129_ACTIVITY_LIST_EMPTY_BODY}
				</p>
			</div>
		{:else}
			<div
				class="{balanceColumnHeight
					? 'flex min-h-0 min-[1200px]:flex-1 min-[1200px]:flex-col min-[1200px]:overflow-hidden min-[1200px]:overflow-x-hidden'
					: ''} {balanceColumnHeight ? '' : 'mt-4'}"
			>
				<div
					class="{balanceColumnHeight
						? 'min-h-0 min-[1200px]:flex-1 min-[1200px]:overflow-y-auto min-[1200px]:overflow-x-hidden'
						: ''}"
				>
					<ol
						class="m-0 flex list-none flex-col gap-2 p-0"
						data-testid="case-overview-recent-activity-list"
						aria-label="Recent case activity events"
					>
						{#each state.events as ev (ev.event_id)}
							{@const sourceHref = p129ActivitySourceHref(caseId, ev)}
							{@const theme = p129ActivityDomainTheme(ev)}
							<li
								data-testid="case-overview-recent-activity-row"
								data-activity-event-id={ev.event_id}
								data-activity-domain={theme.domainLabel}
							>
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
										<div class="ds-case-activity-feed-card__actions" data-testid="case-overview-recent-activity-actions">
											{#if sourceHref}
												<a
													class="inline-flex max-w-[10.5rem] truncate rounded border border-[color:var(--ce-l-border-default)] bg-[color:var(--ce-l-surface)] px-1.5 py-0.5 text-center text-[0.6875rem] font-medium leading-tight text-[color:var(--ce-l-text-primary)] no-underline transition hover:bg-[color:var(--ce-l-surface-muted)]"
													href={sourceHref}
													title={P129_ACTIVITY_DETAIL_LINK_NOTE}
													data-testid="case-overview-recent-activity-open-source"
													data-activity-source-href={sourceHref}
												>
													{p129ActivityOpenRecordCtaLabel(ev)}
												</a>
											{:else}
												<span class="max-w-[9rem] text-right text-[0.6875rem] text-[color:var(--ce-l-text-muted)]">
													{P129_ACTIVITY_DETAIL_NO_LINK}
												</span>
											{/if}
										</div>
									</div>
								</div>
							</li>
						{/each}
					</ol>
					{#if activityHasMore}
						<div class="mt-3 border-t border-[color:var(--ce-l-border-subtle)] pt-3">
							<button
								type="button"
								class="{DS_BTN_CLASSES.secondary} w-full"
								data-testid="case-overview-recent-activity-load-more"
								disabled={loadingMoreActivity}
								on:click={loadMoreActivity}
							>
								{loadingMoreActivity ? 'Loading…' : P129_ACTIVITY_LIST_LOAD_MORE}
							</button>
						</div>
					{/if}
				</div>
			</div>
		{/if}
		</div>
	</div>
</section>
