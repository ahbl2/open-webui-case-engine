<script lang="ts">
	/**
	 * Overview center column — latest committed timeline entries (newest first); overview loads 20 with inner scroll.
	 */
	import { onDestroy } from 'svelte';
	import { caseEngineToken } from '$lib/stores';
	import { listCaseTimelineEntriesPage, type TimelineEntry } from '$lib/apis/caseEngine';
	import CaseLoadingState from '$lib/components/case/CaseLoadingState.svelte';
	import { P129_ACTIVITY_LIST_LOAD_MORE, P129_ACTIVITY_LIST_NO_TOKEN } from '$lib/caseContext/p129ActivityListCopy';
	import { stripLeadingDateTimePrefix } from '$lib/utils/timelineEntryText';
	import {
		DS_BTN_CLASSES,
		DS_EMPTY_CLASSES,
		DS_STACK_CLASSES,
		DS_STATUS_SURFACE_CLASSES,
		DS_SUMMARY_CLASSES,
		DS_TYPE_CLASSES
	} from '$lib/case/detectivePrimitiveFoundation';

	export let caseId: string;
	export let heading = 'Timeline Snapshot';
	export let sectionId = 'summary-module-timeline-snapshot';
	export let headingElementId = 'case-overview-timeline-snapshot-heading';
	export let testId = 'case-overview-timeline-snapshot';
	/** Match Overview dashboard column stretch + internal scroll (≥1200px). */
	export let balanceColumnHeight = false;

	const SNAPSHOT_LIMIT = 20;

	type SnapshotBoundary = { maxOccurredAt: string; maxId: string };

	type LoadState =
		| { kind: 'loading' }
		| { kind: 'ready'; entries: TimelineEntry[]; total: number; snapshotBoundary: SnapshotBoundary | null }
		| { kind: 'empty' }
		| { kind: 'error'; message: string };

	let loadGeneration = 0;
	let state: LoadState = { kind: 'loading' };
	let loadingMoreTimeline = false;

	function buildSnapshotBoundary(first: { snapshotMaxOccurredAt?: string | null; snapshotMaxId?: string | null }): SnapshotBoundary | null {
		const a = first.snapshotMaxOccurredAt;
		const b = first.snapshotMaxId;
		if (a && b) return { maxOccurredAt: a, maxId: b };
		return null;
	}

	function dedupeTimelineEntries(rows: TimelineEntry[]): TimelineEntry[] {
		const seen = new Set<string>();
		const out: TimelineEntry[] = [];
		for (const e of rows) {
			if (seen.has(e.id)) continue;
			seen.add(e.id);
			out.push(e);
		}
		return out;
	}

	function sortNewestFirst(entries: TimelineEntry[]): TimelineEntry[] {
		return [...entries].sort((a, b) => {
			const dt = new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime();
			if (dt !== 0) return dt;
			return b.id.localeCompare(a.id);
		});
	}

	function entryPreview(e: TimelineEntry): string {
		const raw = (e.text_cleaned && e.text_cleaned.trim()) || e.text_original || '';
		const oneLine = raw.replace(/\s+/g, ' ').trim();
		if (!oneLine) return '(No text)';
		const body = stripLeadingDateTimePrefix(oneLine);
		const display = body.length ? body : oneLine;
		if (display.length <= 140) return display;
		return `${display.slice(0, 137)}…`;
	}

	function formatEntryType(t: string): string {
		if (!t?.trim()) return 'Entry';
		return t.replace(/_/g, ' ');
	}

	function formatOccurredShort(iso: string): string {
		const t = Date.parse(iso);
		if (Number.isNaN(t)) return '—';
		return new Date(t).toLocaleString(undefined, {
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	async function loadSnapshot(id: string, token: string, gen: number): Promise<void> {
		loadingMoreTimeline = false;
		state = { kind: 'loading' };
		try {
			const first = await listCaseTimelineEntriesPage(id, token, { limit: SNAPSHOT_LIMIT, offset: 0 });
			if (gen !== loadGeneration) return;
			if (first.total === 0) {
				state = { kind: 'empty' };
				return;
			}
			const snapshotBoundary = buildSnapshotBoundary(first);
			const boundaryOpts = snapshotBoundary ?? {};
			let rows: TimelineEntry[];
			if (first.total <= SNAPSHOT_LIMIT) {
				rows = sortNewestFirst(first.entries);
			} else {
				const last = await listCaseTimelineEntriesPage(id, token, {
					limit: SNAPSHOT_LIMIT,
					offset: first.total - SNAPSHOT_LIMIT,
					...boundaryOpts
				});
				if (gen !== loadGeneration) return;
				rows = sortNewestFirst(last.entries);
			}
			state = { kind: 'ready', entries: rows, total: first.total, snapshotBoundary };
		} catch (e: unknown) {
			if (gen !== loadGeneration) return;
			state = {
				kind: 'error',
				message: e instanceof Error ? e.message : 'Failed to load timeline entries.'
			};
		}
	}

	async function loadMoreTimeline(): Promise<void> {
		if (state.kind !== 'ready' || !$caseEngineToken || loadingMoreTimeline) return;
		const { entries, total, snapshotBoundary } = state;
		if (entries.length >= total) return;
		const oldestLoadedIndex = total - entries.length;
		if (oldestLoadedIndex <= 0) return;

		loadingMoreTimeline = true;
		const gen = loadGeneration;
		try {
			const chunkSize = Math.min(SNAPSHOT_LIMIT, oldestLoadedIndex);
			const offset = Math.max(0, oldestLoadedIndex - SNAPSHOT_LIMIT);
			const res = await listCaseTimelineEntriesPage(caseId, $caseEngineToken, {
				limit: chunkSize,
				offset,
				...(snapshotBoundary ?? {})
			});
			if (gen !== loadGeneration) return;
			const merged = dedupeTimelineEntries([...entries, ...res.entries]);
			state = {
				kind: 'ready',
				entries: sortNewestFirst(merged),
				total,
				snapshotBoundary
			};
		} catch (e: unknown) {
			if (gen !== loadGeneration) return;
			state = {
				kind: 'error',
				message: e instanceof Error ? e.message : 'Failed to load timeline entries.'
			};
		} finally {
			if (gen === loadGeneration) loadingMoreTimeline = false;
		}
	}

	$: timelineHasMore =
		state.kind === 'ready' && state.entries.length < state.total;

	$: token = $caseEngineToken;

	$: if (caseId && token) {
		loadGeneration += 1;
		const gen = loadGeneration;
		void loadSnapshot(caseId, token, gen);
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
				href={`/case/${caseId}/timeline`}
				class="shrink-0 whitespace-nowrap text-sm font-medium text-[color:var(--ce-l-text-primary)] underline-offset-2 hover:underline"
				data-testid="case-overview-timeline-snap-view-all"
				>View timeline →</a
			>
		</div>

		<div
			class="{balanceColumnHeight
				? 'mt-4 flex min-h-0 min-[1200px]:flex-1 min-[1200px]:flex-col min-[1200px]:overflow-hidden min-[1200px]:overflow-x-hidden'
				: 'contents'}"
		>
			{#if !token}
				<p class="{DS_TYPE_CLASSES.meta} {balanceColumnHeight ? '' : 'mt-4'}" data-testid="case-overview-timeline-snap-no-token">
					{P129_ACTIVITY_LIST_NO_TOKEN}
				</p>
			{:else if state.kind === 'loading'}
				<div class="{balanceColumnHeight ? '' : 'mt-4'}" data-testid="case-overview-timeline-snap-loading">
					<CaseLoadingState label="Loading timeline…" testId="case-overview-timeline-snap-spinner" />
				</div>
			{:else if state.kind === 'error'}
				<div
					class="{balanceColumnHeight ? '' : 'mt-4'} rounded-md px-3 py-2 text-sm {DS_STATUS_SURFACE_CLASSES.error}"
					role="alert"
					data-testid="case-overview-timeline-snap-error"
				>
					<p class="ds-status-copy">{state.message}</p>
				</div>
			{:else if state.kind === 'empty'}
				<div
					class="{DS_EMPTY_CLASSES.root} {DS_EMPTY_CLASSES.compact} ce-l-empty-framed {balanceColumnHeight ? '' : 'mt-4'} px-2 py-4"
					role="region"
					aria-label="No timeline entries"
					data-testid="case-overview-timeline-snap-empty"
				>
					<p class="{DS_EMPTY_CLASSES.title} m-0 text-sm text-[color:var(--ce-l-text-secondary)]">
						No timeline entries yet
					</p>
					<p class="{DS_TYPE_CLASSES.meta} m-0 mt-2 max-w-md text-[color:var(--ce-l-text-muted)]">
						Add entries on the Timeline tab to see them here.
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
						<ul
							class="m-0 flex list-none flex-col gap-2 p-0"
							data-testid="case-overview-timeline-snap-list"
							aria-label="Most recent timeline entries"
						>
							{#each state.entries as entry (entry.id)}
								<li data-testid="case-overview-timeline-snap-row" data-timeline-entry-id={entry.id}>
									<a
										href={`/case/${caseId}/timeline?highlight=${encodeURIComponent(entry.id)}`}
										class="block rounded-md border border-[color:var(--ce-l-border-subtle)] bg-[color:var(--ce-l-surface)] p-2.5 transition hover:bg-[color:var(--ce-l-surface-muted)]"
										data-testid="case-overview-timeline-snap-open"
									>
										<div class="{DS_TYPE_CLASSES.meta} text-[0.6875rem] leading-tight text-[color:var(--ce-l-text-secondary)]">
											<span class="font-medium text-[color:var(--ce-l-text-primary)]">{formatEntryType(entry.type)}</span>
											<span class="text-[color:var(--ce-l-text-muted)]"> · </span>
											<span title="Occurred">{formatOccurredShort(entry.occurred_at)}</span>
											{#if entry.location_text?.trim()}
												<span class="text-[color:var(--ce-l-text-muted)]"> · {entry.location_text.trim()}</span>
											{/if}
										</div>
										<p class="mt-1.5 text-sm leading-snug text-[color:var(--ce-l-text-primary)] line-clamp-3">
											{entryPreview(entry)}
										</p>
									</a>
								</li>
							{/each}
						</ul>
						{#if timelineHasMore}
							<div class="mt-3 border-t border-[color:var(--ce-l-border-subtle)] pt-3">
								<button
									type="button"
									class="{DS_BTN_CLASSES.secondary} w-full"
									data-testid="case-overview-timeline-snap-load-more"
									disabled={loadingMoreTimeline}
									on:click={loadMoreTimeline}
								>
									{loadingMoreTimeline ? 'Loading…' : P129_ACTIVITY_LIST_LOAD_MORE}
								</button>
							</div>
						{/if}
					</div>
				</div>
			{/if}
		</div>
	</div>
</section>
