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

	const RECENT_LIMIT = 10;

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

	function previewText(entry: TimelineEntry): string {
		const raw = (entry.text_cleaned ?? entry.text_original ?? '').trim();
		const collapsed = raw.replace(/\s+/g, ' ');
		const max = 160;
		if (collapsed.length <= max) return collapsed;
		return `${collapsed.slice(0, max - 1)}…`;
	}

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
			const offset = Math.max(0, total - RECENT_LIMIT);
			const take = Math.min(RECENT_LIMIT, total);
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
	id="summary-module-recent-activity"
	class="{DS_STACK_CLASSES.stack} border-b border-[color:var(--ds-border-default)] pb-6"
	data-testid="case-overview-recent-activity"
	aria-labelledby="case-overview-recent-activity-heading"
>
	<div class="flex flex-wrap items-start justify-between gap-2">
		<div class={DS_STACK_CLASSES.tight}>
			<h2 id="case-overview-recent-activity-heading" class={DS_TYPE_CLASSES.panel}>
				Recent activity
			</h2>
			<p class="{DS_TYPE_CLASSES.meta} max-w-2xl text-[var(--ds-text-secondary)]">
				Latest committed timeline entries, newest first (same occurred-at ordering as the full Timeline).
			</p>
		</div>
		<a
			href="/case/{caseId}/timeline"
			class={DS_SUMMARY_CLASSES.navLink}
			data-testid="case-overview-recent-activity-view-timeline"
			>View timeline</a
		>
	</div>

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
		<ul
			class="mt-4 divide-y divide-[color:var(--ds-border-default)] rounded-md border border-[color:var(--ds-border-default)] bg-[color:color-mix(in_oklab,var(--ds-bg-elevated)_88%,var(--ds-bg-muted))]"
			data-testid="case-overview-recent-activity-list"
		>
			{#each state.entries as entry (entry.id)}
				<li class="px-3 py-3 sm:px-4" data-timeline-entry-id={entry.id}>
					<div class="flex flex-wrap items-baseline gap-x-2 gap-y-1">
						<time
							class="{DS_TYPE_CLASSES.meta} text-[var(--ds-text-secondary)] tabular-nums"
							datetime={entry.occurred_at}
						>
							{formatOperationalCaseDateTimeWithSeconds(entry.occurred_at)}
						</time>
						<span class="{DS_BADGE_CLASSES.base} {DS_BADGE_CLASSES.neutral} max-w-[12rem] truncate">
							{typeLabel(entry.type)}
						</span>
					</div>
					<div class="mt-2">
						<p class="{DS_TYPE_CLASSES.body} line-clamp-3 break-words text-[var(--ds-text-primary)]">
							{previewText(entry)}
						</p>
						{#if entry.location_text?.trim()}
							<p class="{DS_TYPE_CLASSES.meta} mt-1 text-[var(--ds-text-secondary)]">
								<span class="font-medium">Location:</span>
								{entry.location_text.trim()}
							</p>
						{/if}
						{#if entry.created_by?.trim()}
							<p class="{DS_TYPE_CLASSES.meta} mt-1 text-[var(--ds-text-secondary)]">
								<span class="font-medium">Logged by:</span>
								<span class="font-mono text-xs">{entry.created_by}</span>
							</p>
						{/if}
					</div>
				</li>
			{/each}
		</ul>
	{/if}
</section>
