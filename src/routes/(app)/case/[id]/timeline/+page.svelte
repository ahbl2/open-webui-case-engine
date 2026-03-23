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
	import CaseLoadingState from '$lib/components/case/CaseLoadingState.svelte';
	import CaseEmptyState from '$lib/components/case/CaseEmptyState.svelte';
	import CaseErrorState from '$lib/components/case/CaseErrorState.svelte';
	import TimelineEntryCard from '$lib/components/case/TimelineEntryCard.svelte';

	const caseId = $page.params.id;

	let entries: TimelineEntry[] = [];
	let loading = true;
	let loadError = '';

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
	<div class="shrink-0 flex items-center justify-between gap-2 px-4 py-3 border-b border-gray-200 dark:border-gray-800">
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
			<CaseLoadingState label="Loading timeline…" testId="case-timeline-loading" />

		{:else if loadError}
			<CaseErrorState
				title="Failed to load timeline"
				message={loadError}
				onRetry={loadEntries}
			/>

		{:else if entries.length === 0}
			<CaseEmptyState
				title="No official timeline entries recorded for this case."
				description="Official entries are added through the proposal pipeline in the Chat tab. Working drafts are in the Notes tab."
				testId="case-timeline-empty"
			>
				<svelte:fragment slot="icon">
					<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
						stroke-width="1.5" stroke="currentColor"
						class="size-7 text-gray-300 dark:text-gray-600">
						<path stroke-linecap="round" stroke-linejoin="round"
							d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
					</svg>
				</svelte:fragment>
			</CaseEmptyState>

		{:else}
			<!-- Chronological list — occurred_at ASC (earliest at top) -->
			<ol class="flex flex-col gap-3" aria-label="Official case timeline">
				{#each entries as entry (entry.id)}
					<TimelineEntryCard {entry} />
				{/each}
			</ol>
		{/if}
	</div>
</div>
