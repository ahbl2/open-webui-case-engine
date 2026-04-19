<script lang="ts">
	/**
	 * P82-04 — Bounded recent timeline entries on Overview (read-only; same GET /cases/:id/entries paginated path as Timeline).
	 * Ordering: server returns occurred_at ASC; we take the last N rows (most recent by occurred_at) and reverse for display (newest first).
	 */
	import { onDestroy } from 'svelte';
	import { caseEngineToken } from '$lib/stores';
	import { listCaseTimelineEntriesPage, type TimelineEntry } from '$lib/apis/caseEngine';
	import { TIMELINE_TYPE_NOTE_DISPLAY_LABEL } from '$lib/caseTimeline/timelineTypeNoteClarity';
	import { formatOperationalCaseDateTimeWithSeconds } from '$lib/utils/formatDateTime';
	import { stripLeadingDateTimePrefix } from '$lib/utils/timelineEntryText';
	import Spinner from '$lib/components/common/Spinner.svelte';
	import {
		DS_BADGE_CLASSES,
		DS_SUMMARY_CLASSES,
		DS_STACK_CLASSES,
		DS_TYPE_CLASSES,
		DS_STATUS_TEXT_CLASSES,
		DS_STATUS_SURFACE_CLASSES
	} from '$lib/case/detectivePrimitiveFoundation';

	export let caseId: string;
	/** Section heading (e.g. “Recent case activity” vs “Timeline snapshot”). */
	export let heading = 'Recent activity';
	/** Optional description; defaults by variant. */
	export let description: string | undefined = undefined;
	/** Max entries to fetch and show (newest first). */
	export let entryLimit = 5;
	/** `snapshot` uses a denser vertical layout for the dashboard center column. */
	export let variant: 'default' | 'snapshot' = 'default';
	/** Anchor id for in-page links (`#summary-module-recent-activity`). */
	export let sectionId = 'summary-module-recent-activity';
	export let headingElementId = 'case-overview-recent-activity-heading';
	/** `data-testid` for integration tests (distinct when two instances mount on Overview). */
	export let testId = 'case-overview-recent-activity';

	type LoadState =
		| { kind: 'loading' }
		| { kind: 'ready'; entries: TimelineEntry[] }
		| { kind: 'empty' }
		| { kind: 'error'; message: string };

	let loadGeneration = 0;
	let state: LoadState = { kind: 'loading' };

	function typeLabel(t: string): string {
		const s = (t ?? '').trim();
		if (s === 'note') return TIMELINE_TYPE_NOTE_DISPLAY_LABEL;
		if (!s) return '—';
		return s;
	}

	function snapshotDateUpper(iso: string): string {
		const d = new Date(iso);
		if (Number.isNaN(d.getTime())) return '—';
		return d
			.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
			.replace(/,/g, '')
			.toUpperCase();
	}

	function snapshotTimeHm(iso: string): string {
		const d = new Date(iso);
		if (Number.isNaN(d.getTime())) return '';
		return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false });
	}

	function formatRelativeShort(iso: string): string {
		const t = Date.parse(iso);
		if (Number.isNaN(t)) return '—';
		const diff = Date.now() - t;
		const sec = Math.floor(diff / 1000);
		if (sec < 45) return 'Just now';
		const min = Math.floor(sec / 60);
		if (min < 60) return `${min}m ago`;
		const hr = Math.floor(min / 60);
		if (hr < 24) return `${hr}h ago`;
		const day = Math.floor(hr / 24);
		if (day < 7) return `${day}d ago`;
		return new Date(t).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
	}

	function displayActorName(createdBy: string | undefined): string {
		const s = (createdBy ?? '').trim();
		if (!s) return 'Timeline';
		if (s.includes('@')) {
			const local = s.split('@')[0]?.replace(/\./g, ' ').trim();
			return local?.length ? local : s;
		}
		return s;
	}

	function initialsFromActor(createdBy: string | undefined): string {
		const name = displayActorName(createdBy);
		if (name === 'Timeline') return 'CE';
		const parts = name.split(/\s+/).filter(Boolean);
		if (parts.length >= 2) return `${parts[0]![0] ?? ''}${parts[1]![0] ?? ''}`.toUpperCase();
		if (parts.length === 1 && parts[0]!.length >= 2) return parts[0]!.slice(0, 2).toUpperCase();
		return (parts[0]?.[0] ?? '?').toUpperCase();
	}

	function previewText(entry: TimelineEntry): string {
		const raw = (entry.text_cleaned ?? entry.text_original ?? '').trim();
		const collapsed = stripLeadingDateTimePrefix(raw.replace(/\s+/g, ' '));
		const max = variant === 'snapshot' ? 120 : 200;
		if (collapsed.length <= max) return collapsed;
		return `${collapsed.slice(0, max - 1)}…`;
	}

	const panelShell =
		'rounded-xl border border-[color:var(--ds-border-default)] bg-[color:color-mix(in_oklab,var(--ds-bg-elevated)_94%,var(--ds-bg-muted))] p-4 shadow-sm';

	async function loadRecent(id: string, token: string, gen: number): Promise<void> {
		state = { kind: 'loading' };
		try {
			const first = await listCaseTimelineEntriesPage(id, token, { limit: 1, offset: 0 });
			if (gen !== loadGeneration) return;
			const total = first.total;
			if (typeof total !== 'number' || !Number.isFinite(total) || total < 0) {
				state = { kind: 'error', message: 'Invalid timeline total from Case Engine.' };
				return;
			}
			if (total === 0) {
				state = { kind: 'empty' };
				return;
			}
			const offset = Math.max(0, total - entryLimit);
			const take = Math.min(entryLimit, total);
			const page = await listCaseTimelineEntriesPage(id, token, {
				limit: take,
				offset
			});
			if (gen !== loadGeneration) return;
			const rows = page.entries ?? [];
			// Newest occurred_at first: within the slice returned in ASC order, reverse for display only.
			const reversed = rows.slice().reverse();
			state = { kind: 'ready', entries: reversed };
		} catch (e: unknown) {
			if (gen !== loadGeneration) return;
			state = {
				kind: 'error',
				message: e instanceof Error ? e.message : 'Could not load recent timeline activity.'
			};
		}
	}

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
	class="{DS_STACK_CLASSES.stack} pb-6"
	data-testid={testId}
	aria-labelledby={headingElementId}
>
	<div class="{panelShell} flex min-h-0 flex-col">
		<div class="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
			<h2 id={headingElementId} class="{DS_TYPE_CLASSES.panel} min-w-0 flex-1">
				{heading}
			</h2>
			<a
				href="/case/{caseId}/activity"
				class="{DS_SUMMARY_CLASSES.navLink} shrink-0 whitespace-nowrap"
				data-testid="case-overview-recent-activity-view-all"
				>View all activity -></a
			>
		</div>
		{#if description}
			<p class="{DS_TYPE_CLASSES.meta} mt-2 max-w-2xl text-[var(--ds-text-secondary)]">
				{description}
			</p>
		{/if}

		{#if !token}
			<p class="{DS_TYPE_CLASSES.meta} mt-4" data-testid="case-overview-recent-activity-no-token">
				Case Engine sign-in required to load timeline activity.
			</p>
		{:else if state.kind === 'loading'}
			<div
				class="{DS_SUMMARY_CLASSES.loadingPanel} mt-4"
				role="status"
				aria-live="polite"
				data-testid="case-overview-recent-activity-loading"
			>
				<span class={DS_STATUS_TEXT_CLASSES.info}><Spinner className="size-5" /></span>
				<div class="min-w-0">
					<p class="{DS_TYPE_CLASSES.body} font-semibold">Loading recent timeline…</p>
					<p class="{DS_TYPE_CLASSES.meta} mt-1">Reading committed entries from Case Engine.</p>
				</div>
			</div>
		{:else if state.kind === 'error'}
			<div
				class="mt-4 rounded-md px-3 py-2 text-sm {DS_STATUS_SURFACE_CLASSES.error}"
				role="alert"
				data-testid="case-overview-recent-activity-error"
			>
				<p class="ds-status-copy">{state.message}</p>
			</div>
		{:else if state.kind === 'empty'}
			<div
				class="{DS_SUMMARY_CLASSES.emptyDashed} mt-4"
				role="region"
				aria-label="No timeline entries"
				data-testid="case-overview-recent-activity-empty"
			>
				<p class="{DS_TYPE_CLASSES.body} font-semibold">No committed timeline entries yet</p>
				<p class="{DS_TYPE_CLASSES.meta} mt-2 max-w-md mx-auto">
					When entries are logged on the Timeline tab, the most recent ones will appear here.
				</p>
			</div>
		{:else}
			{#if variant === 'snapshot'}
				<ul
					class="mt-4 list-none space-y-0 p-0"
					data-testid="case-overview-recent-activity-list"
				>
					{#each state.entries as entry (entry.id)}
						<li
							class="flex flex-wrap items-start gap-3 border-b border-[color:var(--ds-border-subtle)] py-3 last:border-b-0"
							data-timeline-entry-id={entry.id}
						>
							<div class="flex w-[4.5rem] shrink-0 flex-col items-end text-right">
								<time
									class="text-[0.65rem] font-bold uppercase leading-tight tracking-wide text-[var(--ds-text-muted)]"
									datetime={entry.occurred_at}
								>
									{snapshotDateUpper(entry.occurred_at)}
								</time>
								<time
									class="mt-0.5 text-xs tabular-nums text-[var(--ds-text-secondary)]"
									datetime={entry.occurred_at}
								>
									{snapshotTimeHm(entry.occurred_at)}
								</time>
							</div>
							<div class="relative min-w-0 flex-1 border-l border-[color:var(--ds-border-default)] pl-4">
								<span
									class="absolute -left-[5px] top-2 z-10 size-2 rounded-full bg-sky-500 ring-2 ring-[color:color-mix(in_oklab,var(--ds-bg-elevated)_96%,var(--ds-bg-muted))]"
									aria-hidden="true"
								></span>
								<div class="flex flex-wrap items-start justify-between gap-2">
									<p class="{DS_TYPE_CLASSES.body} min-w-0 flex-1 line-clamp-3 break-words text-[var(--ds-text-primary)]">
										{previewText(entry)}
									</p>
									<span
										class="{DS_BADGE_CLASSES.base} {DS_BADGE_CLASSES.info} max-w-[7rem] shrink-0 truncate text-[0.65rem] uppercase"
									>
										{typeLabel(entry.type)}
									</span>
								</div>
								{#if entry.location_text?.trim()}
									<p class="{DS_TYPE_CLASSES.meta} mt-1 text-[var(--ds-text-secondary)]">
										{entry.location_text.trim()}
									</p>
								{/if}
							</div>
						</li>
					{/each}
				</ul>
			{:else}
				<ul
					class="mt-4 list-none divide-y divide-[color:var(--ds-border-default)] space-y-0 p-0"
					data-testid="case-overview-recent-activity-list"
				>
					{#each state.entries as entry (entry.id)}
						<li
							class="flex gap-3 py-3 first:pt-0"
							data-timeline-entry-id={entry.id}
						>
							<div
								class="flex size-9 shrink-0 items-center justify-center rounded-full bg-[color:color-mix(in_oklab,var(--ds-bg-muted)_92%,transparent)] text-[0.7rem] font-semibold uppercase tracking-tight text-[var(--ds-text-secondary)]"
								aria-hidden="true"
								title={displayActorName(entry.created_by)}
							>
								{initialsFromActor(entry.created_by)}
							</div>
							<div class="min-w-0 flex-1">
								<div class="flex flex-wrap items-center gap-x-2 gap-y-0.5">
									<span class="text-sm font-semibold text-[var(--ds-text-primary)]">
										{displayActorName(entry.created_by)}
									</span>
									<span
										class="{DS_BADGE_CLASSES.base} {DS_BADGE_CLASSES.neutral} max-w-[10rem] truncate text-[0.65rem] uppercase"
									>
										{typeLabel(entry.type)}
									</span>
								</div>
								<p class="mt-1 line-clamp-3 break-words text-sm leading-snug text-[var(--ds-text-secondary)]">
									{previewText(entry)}
								</p>
								{#if entry.location_text?.trim()}
									<p class="{DS_TYPE_CLASSES.meta} mt-1 text-[var(--ds-text-muted)]">
										<span class="font-medium text-[var(--ds-text-secondary)]">Location:</span>
										{entry.location_text.trim()}
									</p>
								{/if}
							</div>
							<div class="shrink-0 text-right">
								<time
									class="text-xs font-medium tabular-nums text-[var(--ds-text-muted)]"
									datetime={entry.occurred_at}
									title={formatOperationalCaseDateTimeWithSeconds(entry.occurred_at)}
								>
									{formatRelativeShort(entry.occurred_at)}
								</time>
							</div>
						</li>
					{/each}
				</ul>
			{/if}
		{/if}
	</div>
</section>
