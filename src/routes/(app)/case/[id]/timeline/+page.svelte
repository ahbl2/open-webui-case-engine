<script lang="ts">
	/**
	 * Official Case Timeline
	 *
	 * Displays the official case record from `timeline_entries` via
	 * GET /cases/:id/entries. This is distinct from notebook notes
	 * (working drafts) — these are immutable official records that can
	 * only be created through the proposal pipeline.
	 *
	 * Backend endpoint: GET /cases/:id/entries
	 * Table: timeline_entries
	 */
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { caseEngineToken } from '$lib/stores';
	import { listCaseTimelineEntries, type TimelineEntry } from '$lib/apis/caseEngine';

	const caseId = $page.params.id;

	let entries: TimelineEntry[] = [];
	let loading = true;
	let loadError = '';

	const TYPE_LABELS: Record<string, string> = {
		note: 'Note',
		surveillance: 'Surveillance',
		interview: 'Interview',
		evidence: 'Evidence'
	};

	const TYPE_COLORS: Record<string, string> = {
		note:         'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300',
		surveillance: 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
		interview:    'bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300',
		evidence:     'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
	};

	function typeLabel(type: string): string {
		return TYPE_LABELS[type] ?? type;
	}

	function typeColor(type: string): string {
		return TYPE_COLORS[type] ?? 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300';
	}

	function entryText(e: TimelineEntry): string {
		return (e.text_cleaned ?? e.text_original ?? '').trim();
	}

	function formatDate(iso: string): string {
		try {
			return new Intl.DateTimeFormat('en-US', {
				year: 'numeric', month: 'short', day: '2-digit',
				hour: '2-digit', minute: '2-digit', hour12: false
			}).format(new Date(iso));
		} catch {
			return iso;
		}
	}

	function parseTags(raw: string | string[] | null | undefined): string[] {
		if (!raw) return [];
		if (Array.isArray(raw)) return raw;
		try { return JSON.parse(raw); } catch { return []; }
	}

	async function loadEntries(): Promise<void> {
		if (!$caseEngineToken) {
			loading = false;
			loadError = 'Case Engine session not active.';
			return;
		}
		loading = true;
		loadError = '';
		try {
			entries = await listCaseTimelineEntries(caseId, $caseEngineToken);
		} catch (e: unknown) {
			loadError = e instanceof Error ? e.message : 'Failed to load timeline entries.';
		} finally {
			loading = false;
		}
	}

	onMount(() => { loadEntries(); });
</script>

<!--
	Official Case Timeline
	Backed by timeline_entries (official case records).
	Not to be confused with notebook notes (working drafts).
	Renders inside the P19-06 case shell (+layout.svelte).
-->
<div class="flex flex-col h-full overflow-y-auto" data-testid="case-timeline-page">

	<!-- Section header -->
	<div class="shrink-0 flex items-center justify-between gap-2 px-4 pt-4 pb-2 border-b border-gray-100 dark:border-gray-800">
		<div class="flex items-center gap-2 min-w-0">
			<h2 class="text-sm font-semibold text-gray-700 dark:text-gray-200">Case Timeline</h2>
			<span
				class="shrink-0 text-xs font-medium px-1.5 py-0.5 rounded
				       bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
				title="Official case records from the proposal pipeline"
			>Official record</span>
			{#if !loading && entries.length > 0}
				<span class="shrink-0 text-xs text-gray-400 dark:text-gray-500">
					{entries.length} {entries.length === 1 ? 'entry' : 'entries'}
				</span>
			{/if}
		</div>
	</div>

	<!-- Doctrine banner — distinguishes from Notes tab -->
	<div
		class="shrink-0 mx-4 mt-3 px-3 py-2 rounded-md text-xs
		       bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400
		       border border-blue-200 dark:border-blue-800"
		role="note"
	>
		<strong>Official case record.</strong> Entries here are committed facts added through the proposal pipeline.
		For working drafts, use the <strong>Notes</strong> tab.
	</div>

	<!-- Timeline list -->
	<div class="flex-1 px-4 pt-4 pb-6 min-h-0">
		{#if loading}
			<div class="flex items-center justify-center h-24">
				<p class="text-sm text-gray-400 dark:text-gray-500" data-testid="case-timeline-loading">
					Loading timeline…
				</p>
			</div>

		{:else if loadError}
			<div class="rounded-md border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/30 px-3 py-2.5">
				<p class="text-sm text-red-700 dark:text-red-400 font-medium">Failed to load timeline</p>
				<p class="text-xs text-red-500 dark:text-red-500 mt-0.5">{loadError}</p>
				<button
					class="mt-1.5 text-xs text-red-600 dark:text-red-400 underline"
					on:click={loadEntries}
				>Try again</button>
			</div>

		{:else if entries.length === 0}
			<div
				class="flex flex-col items-center justify-center gap-2 h-40 rounded-md
				       border border-dashed border-gray-200 dark:border-gray-700
				       bg-gray-50 dark:bg-gray-900 text-center"
				data-testid="case-timeline-empty"
			>
				<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
					stroke-width="1.5" stroke="currentColor"
					class="size-7 text-gray-300 dark:text-gray-600">
					<path stroke-linecap="round" stroke-linejoin="round"
						d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
				</svg>
				<p class="text-sm text-gray-500 dark:text-gray-400 font-medium">
					No official timeline entries recorded for this case.
				</p>
				<p class="text-xs text-gray-400 dark:text-gray-500 max-w-xs">
					Official entries are added through the proposal pipeline in the Chat tab.
					Working drafts are in the Notes tab.
				</p>
			</div>

		{:else}
			<!-- Chronological list — occurred_at ASC (earliest at top) -->
			<ol class="flex flex-col gap-3" aria-label="Official case timeline">
				{#each entries as entry (entry.id)}
					{@const tags = parseTags(entry.tags)}
					<li
						class="flex flex-col gap-1.5 rounded-lg border border-gray-200 dark:border-gray-700
						       bg-white dark:bg-gray-900 px-4 py-3 shadow-sm"
						data-testid="timeline-entry"
						data-entry-id={entry.id}
					>
						<!-- Entry meta row -->
						<div class="flex items-center gap-2 flex-wrap">
							<!-- Type badge -->
							<span class="text-xs font-medium px-1.5 py-0.5 rounded {typeColor(entry.type)}">
								{typeLabel(entry.type)}
							</span>

							<!-- occurred_at — primary timestamp (when it happened) -->
							<time
								datetime={entry.occurred_at}
								class="text-xs font-mono text-gray-500 dark:text-gray-400"
								title="When this occurred"
							>
								{formatDate(entry.occurred_at)}
							</time>

							{#if entry.location_text}
								<span class="text-xs text-gray-400 dark:text-gray-500 truncate max-w-[16rem]"
									title={entry.location_text}>
									📍 {entry.location_text}
								</span>
							{/if}
						</div>

						<!-- Entry body -->
						<p class="text-sm text-gray-800 dark:text-gray-100 whitespace-pre-wrap leading-relaxed">
							{entryText(entry)}
						</p>

						<!-- Tags -->
						{#if tags.length > 0}
							<div class="flex flex-wrap gap-1 mt-0.5">
								{#each tags as tag}
									<span class="text-xs px-1 py-0.5 rounded
									            bg-gray-100 dark:bg-gray-800
									            text-gray-500 dark:text-gray-400 font-mono">
										{tag}
									</span>
								{/each}
							</div>
						{/if}

						<!-- Recorded-by / created_at footer -->
						<div class="flex items-center gap-2 pt-0.5 border-t border-gray-100 dark:border-gray-800 mt-0.5">
							<span class="text-xs text-gray-400 dark:text-gray-500">
								Recorded
								<time datetime={entry.created_at} class="font-mono">
									{formatDate(entry.created_at)}
								</time>
								by <span class="font-medium text-gray-600 dark:text-gray-300">{entry.created_by}</span>
							</span>
						</div>
					</li>
				{/each}
			</ol>
		{/if}
	</div>
</div>
