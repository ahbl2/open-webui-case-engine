<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { caseEngineToken } from '$lib/stores';
	import {
		getCaseSummaryStatus,
		requestCaseSummary,
		requestCaseBrief,
		exportCaseBriefPdf,
		requestTimelineIntelligenceSummary,
		listCaseTimelineEntries,
		type CaseBriefRequest,
		type CaseSummaryResult,
		type CaseBriefResponse,
		type TimelineIntelligenceSummaryResult
	} from '$lib/apis/caseEngine';
	import CaseSummaryPanel from '$lib/components/case/CaseSummaryPanel.svelte';
	import {
		mapTimelineSummaryKeyEvents,
		buildTimelineSummaryContext,
		type TimelineSummaryEventView
	} from '$lib/utils/timelineSummary';

	$: caseId = $page.params.id;

	// ── Route-reuse case-switch guard (P28-45) ─────────────────────────────────
	// prevLoadedCaseId is seeded to the initial param so the reactive block is a
	// no-op on first render (onMount handles initial load); fires only on switch.
	let prevLoadedCaseId: string = $page.params.id ?? '';
	/** Per-function load IDs; guard stale async responses from writing to new case. */
	let activeStatusLoadId = 0;
	let activeBriefLoadId = 0;
	let activeTimelineSummaryLoadId = 0;

	let loading = true;
	let updatingSummary = false;
	let error = '';
	let summaryError = '';
	let summary: CaseSummaryResult | null = null;
	let lastUpdatedAt: string | null = null;
	let latestActivityAt = '';
	let stale = false;
	let briefLoading = false;
	let briefExporting = false;
	let briefError = '';
	let briefExportRef = '';
	let brief: CaseBriefResponse | null = null;
	let briefGeneratedAt: string | null = null;
	let briefFilters: CaseBriefRequest = {};
	let timelineSummaryLoading = false;
	let timelineSummaryError = '';
	let timelineSummary: TimelineIntelligenceSummaryResult | null = null;
	let timelineSummaryEvents: TimelineSummaryEventView[] = [];
	let timelineSummaryFilters: CaseBriefRequest = {};
	let timelineSummaryEntryCountLine = '';
	let timelineSummaryFilterLine: string | null = null;
	$: briefEntryCount = brief ? brief.sections.reduce((sum, section) => sum + section.entries.length, 0) : 0;
	const TIMELINE_SUMMARY_TIMEOUT_MS = 60_000;

	$: if (caseId && $caseEngineToken && caseId !== prevLoadedCaseId) {
		prevLoadedCaseId = caseId;
		// Clear all case-bound state immediately so stale data is never shown.
		summary = null;
		lastUpdatedAt = null;
		latestActivityAt = '';
		stale = false;
		error = '';
		summaryError = '';
		brief = null;
		briefGeneratedAt = null;
		briefError = '';
		briefExportRef = '';
		timelineSummary = null;
		timelineSummaryEvents = [];
		timelineSummaryEntryCountLine = '';
		timelineSummaryFilterLine = null;
		timelineSummaryError = '';
		// Reload status for the new case.
		loadSummaryStatus();
	}

	function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
		return new Promise<T>((resolve, reject) => {
			const timeoutId = window.setTimeout(() => {
				reject(new Error(`${label} timed out. Please try again.`));
			}, timeoutMs);
			promise.then(
				(value) => {
					window.clearTimeout(timeoutId);
					resolve(value);
				},
				(err) => {
					window.clearTimeout(timeoutId);
					reject(err);
				}
			);
		});
	}

	function formatEntryTime(ts: string): string {
		const d = new Date(ts);
		if (Number.isNaN(d.getTime())) return ts;
		return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
	}

	async function loadSummaryStatus(): Promise<void> {
		if (!$caseEngineToken || !caseId) {
			loading = false;
			return;
		}
		activeStatusLoadId += 1;
		const loadId = activeStatusLoadId;
		loading = true;
		error = '';
		try {
			const status = await getCaseSummaryStatus(caseId, $caseEngineToken);
			if (loadId !== activeStatusLoadId) return;
			summary = status.summary;
			lastUpdatedAt = status.lastSummaryGeneratedAt;
			latestActivityAt = status.latestActivityAt;
			stale = status.isStale;
		} catch (err) {
			if (loadId !== activeStatusLoadId) return;
			error = err instanceof Error ? err.message : 'Failed to load case summary.';
		} finally {
			if (loadId === activeStatusLoadId) loading = false;
		}
	}

	async function updateSummary(): Promise<void> {
		if (!$caseEngineToken || !caseId || updatingSummary) return;
		updatingSummary = true;
		summaryError = '';
		try {
			await requestCaseSummary(caseId, $caseEngineToken);
			await loadSummaryStatus();
		} catch (err) {
			summaryError = err instanceof Error ? err.message : 'Failed to update case summary.';
		} finally {
			updatingSummary = false;
		}
	}

	async function generateBrief(): Promise<void> {
		if (!$caseEngineToken || !caseId || briefLoading) return;
		activeBriefLoadId += 1;
		const loadId = activeBriefLoadId;
		briefLoading = true;
		briefError = '';
		try {
			const result = await requestCaseBrief(caseId, $caseEngineToken, briefFilters);
			if (loadId !== activeBriefLoadId) return;
			brief = result;
			briefGeneratedAt = new Date().toISOString();
		} catch (err) {
			if (loadId !== activeBriefLoadId) return;
			brief = null;
			briefGeneratedAt = null;
			briefError = err instanceof Error ? err.message : 'Unable to generate brief. Please try again.';
		} finally {
			if (loadId === activeBriefLoadId) briefLoading = false;
		}
	}

	async function onExportBrief(): Promise<void> {
		if (!$caseEngineToken || !caseId || !brief || briefExporting) return;
		briefExporting = true;
		briefError = '';
		briefExportRef = '';
		try {
			const result = await exportCaseBriefPdf(caseId, $caseEngineToken, {
				format: 'pdf',
				...briefFilters
			});
			const url = URL.createObjectURL(result.blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = result.filename;
			a.click();
			URL.revokeObjectURL(url);
			briefExportRef = result.requestId ?? '';
		} catch (err) {
			briefError = err instanceof Error ? err.message : 'Export failed. Please try again.';
		} finally {
			briefExporting = false;
		}
	}

	async function summarizeTimeline(): Promise<void> {
		if (!$caseEngineToken || !caseId || timelineSummaryLoading) return;
		activeTimelineSummaryLoadId += 1;
		const loadId = activeTimelineSummaryLoadId;
		timelineSummaryLoading = true;
		timelineSummaryError = '';
		try {
			const summaryResult = await withTimeout(
				requestTimelineIntelligenceSummary(caseId, $caseEngineToken, timelineSummaryFilters),
				TIMELINE_SUMMARY_TIMEOUT_MS,
				'Timeline summary'
			);
			const timelineEntries = await withTimeout(
				listCaseTimelineEntries(caseId, $caseEngineToken),
				TIMELINE_SUMMARY_TIMEOUT_MS,
				'Timeline entries load'
			);
			if (loadId !== activeTimelineSummaryLoadId) return;
			timelineSummary = summaryResult;
			timelineSummaryEvents = mapTimelineSummaryKeyEvents(summaryResult, timelineEntries);
			const context = buildTimelineSummaryContext(summaryResult);
			timelineSummaryEntryCountLine = context.entryCountLine;
			timelineSummaryFilterLine = context.filterLine;
		} catch (err) {
			if (loadId !== activeTimelineSummaryLoadId) return;
			timelineSummary = null;
			timelineSummaryEvents = [];
			timelineSummaryEntryCountLine = '';
			timelineSummaryFilterLine = null;
			timelineSummaryError =
				err instanceof Error && err.message.trim()
					? err.message
					: 'Unable to generate summary. Please try again.';
		} finally {
			if (loadId === activeTimelineSummaryLoadId) timelineSummaryLoading = false;
		}
	}

	onMount(() => {
		loadSummaryStatus();
	});
</script>

<div class="flex-1 min-h-0 overflow-auto p-4 md:p-6">
	<div class="mx-auto max-w-4xl space-y-4">
		<div class="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
			<div class="flex flex-wrap items-center justify-between gap-3">
				<div>
					<h1 class="text-lg font-semibold text-gray-900 dark:text-gray-100">Case Summary</h1>
					{#if lastUpdatedAt}
						<p class="text-xs text-gray-500 dark:text-gray-400">Last updated: {lastUpdatedAt}</p>
					{:else}
						<p class="text-xs text-gray-500 dark:text-gray-400">No summary generated yet.</p>
					{/if}
				</div>
				<button
					type="button"
					class="px-3 py-1.5 rounded-md text-sm bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
					on:click={updateSummary}
					disabled={updatingSummary || !$caseEngineToken}
				>
					{updatingSummary ? 'Updating…' : (summary ? 'Update Case Summary' : 'Generate Case Summary')}
				</button>
			</div>
			{#if !updatingSummary && stale}
				<p class="mt-2 text-xs text-amber-700 dark:text-amber-300">
					New information has been added since last summary update.
				</p>
				{#if latestActivityAt && latestActivityAt.trim()}
					<p class="mt-0.5 text-[11px] text-amber-700/80 dark:text-amber-300/80">
						Latest activity: {latestActivityAt}
					</p>
				{/if}
			{/if}
			{#if summaryError}
				<p class="mt-2 text-xs text-red-600 dark:text-red-400">{summaryError}</p>
			{/if}
			{#if error}
				<p class="mt-2 text-xs text-red-600 dark:text-red-400">{error}</p>
			{/if}
		</div>

		{#if loading}
			<div class="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
				<p class="text-sm text-gray-500 dark:text-gray-400">Loading case summary...</p>
			</div>
		{:else if summary}
			<CaseSummaryPanel loading={updatingSummary} error={summaryError} {summary} />
		{:else}
			<div class="rounded-xl border border-dashed border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 p-6">
				<p class="text-sm text-gray-600 dark:text-gray-300">No case summary has been generated yet.</p>
				<p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
					Generate a summary to get an overview of this case.
				</p>
			</div>
		{/if}

		<div class="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
			<div class="flex flex-wrap items-center justify-between gap-2">
				<div>
					<h2 class="text-base font-semibold text-gray-900 dark:text-gray-100">Timeline Intelligence Summary</h2>
					<p class="text-xs text-gray-500 dark:text-gray-400">
						AI-generated summary based on current timeline entries.
					</p>
				</div>
				<button
					type="button"
					class="px-3 py-1.5 rounded-md text-sm bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
					on:click={summarizeTimeline}
					disabled={timelineSummaryLoading || !$caseEngineToken}
				>
					{timelineSummaryLoading ? 'Summarizing…' : 'Summarize Timeline'}
				</button>
			</div>

			{#if timelineSummaryError}
				<p class="mt-3 text-sm text-red-600 dark:text-red-400">{timelineSummaryError}</p>
			{/if}
			{#if timelineSummaryLoading}
				<p class="mt-3 text-sm text-gray-600 dark:text-gray-300">Generating summary...</p>
			{:else if timelineSummary}
				<div class="mt-4 space-y-4">
					<div class="rounded-lg border border-gray-200 dark:border-gray-800 p-3">
						<p class="text-xs text-gray-500 dark:text-gray-400">Entries analyzed: {timelineSummaryEntryCountLine}</p>
						{#if timelineSummaryFilterLine}
							<p class="mt-0.5 text-xs text-gray-500 dark:text-gray-400">Applied filters: {timelineSummaryFilterLine}</p>
						{/if}
						<h3 class="text-sm font-semibold text-gray-900 dark:text-gray-100">Timeline Summary</h3>
						<p class="mt-1 text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
							{timelineSummary.summary}
						</p>
					</div>

					<div class="rounded-lg border border-gray-200 dark:border-gray-800 p-3">
						<h3 class="text-sm font-semibold text-gray-900 dark:text-gray-100">Key Timeline Events</h3>
						{#if timelineSummaryEvents.length === 0}
							<p class="mt-1 text-sm text-gray-600 dark:text-gray-300">No key events were identified.</p>
						{:else}
							<ul class="mt-2 space-y-2">
								{#each timelineSummaryEvents as event (event.entry_id)}
									<li class="rounded-md border border-gray-100 dark:border-gray-800 bg-gray-50/70 dark:bg-gray-800/40 p-2 text-sm">
										<p class="text-gray-800 dark:text-gray-100">
											[{event.occurred_at ? formatEntryTime(event.occurred_at) : 'n/a'}] ({event.type}) - {event.excerpt}
										</p>
										<p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
											Source entry: {event.entry_id}
										</p>
										<p class="text-xs text-gray-500 dark:text-gray-400">
											Selection reason: {event.reason}
										</p>
									</li>
								{/each}
							</ul>
						{/if}
					</div>

					<div class="rounded-lg border border-gray-200 dark:border-gray-800 p-3">
						<h3 class="text-sm font-semibold text-gray-900 dark:text-gray-100">Timeline Gaps</h3>
						{#if timelineSummary.gaps.length === 0}
							<p class="mt-1 text-sm text-gray-600 dark:text-gray-300">No timeline gaps identified.</p>
						{:else}
							<ul class="mt-2 list-disc pl-5 space-y-1 text-sm text-gray-700 dark:text-gray-300">
								{#each timelineSummary.gaps as gap}
									<li>{gap.description}</li>
								{/each}
							</ul>
						{/if}
					</div>
				</div>
			{/if}
		</div>

		<div class="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
			<div class="flex flex-wrap items-center justify-between gap-2">
				<div>
					<h2 class="text-base font-semibold text-gray-900 dark:text-gray-100">
						Case Brief (Deterministic){brief ? ` - ${briefEntryCount} entr${briefEntryCount === 1 ? 'y' : 'ies'}` : ''}
					</h2>
					<p class="text-xs text-gray-500 dark:text-gray-400">
						Chronological preview from existing timeline data. No AI rewriting.
					</p>
				</div>
				<div class="flex items-center gap-2">
					<button
						type="button"
						class="px-3 py-1.5 rounded-md text-sm bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
						on:click={generateBrief}
						disabled={briefLoading || !$caseEngineToken}
					>
						{briefLoading ? 'Generating brief…' : 'Generate Case Brief'}
					</button>
					<button
						type="button"
						class="px-3 py-1.5 rounded-md text-sm border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-60"
						on:click={onExportBrief}
						disabled={!brief || briefExporting}
					>
						{briefExporting ? 'Generating export…' : 'Export'}
					</button>
				</div>
			</div>

			{#if briefError}
				<p class="mt-3 text-sm text-red-600 dark:text-red-400">{briefError}</p>
			{/if}
			{#if briefExportRef}
				<p class="mt-3 text-xs text-green-700 dark:text-green-400">
					Brief exported. Reference: <span class="font-mono select-all">{briefExportRef}</span>
				</p>
			{/if}
			{#if briefLoading}
				<p class="mt-4 text-sm text-gray-600 dark:text-gray-300">Generating brief...</p>
			{:else if brief}
				<div class="mt-4 space-y-4">
					<div class="rounded-lg border border-gray-200 dark:border-gray-800 p-3">
						<p class="text-sm font-medium text-gray-900 dark:text-gray-100">Case Brief</p>
						<p class="text-xs text-gray-500 dark:text-gray-400">
							<strong>Case Number:</strong> {brief.case.case_number}
						</p>
						<p class="text-xs text-gray-500 dark:text-gray-400">
							<strong>Title:</strong> {brief.case.title}
						</p>
						<p class="text-xs text-gray-500 dark:text-gray-400">
							<strong>Unit:</strong> {brief.case.unit}
						</p>
						{#if briefGeneratedAt}
							<p class="text-xs text-gray-500 dark:text-gray-400">
								<strong>Generated:</strong> {briefGeneratedAt}
							</p>
						{/if}
					</div>

					{#if brief.sections.length === 0}
						<p class="text-sm text-gray-600 dark:text-gray-300">
							No timeline entries available for this case.
						</p>
					{:else}
						<div class="space-y-4">
							{#each brief.sections as section (section.date)}
								<div class="rounded-lg border border-gray-200 dark:border-gray-800 p-3">
									<h3 class="text-sm font-semibold text-gray-900 dark:text-gray-100">{section.date}</h3>
									<div class="mt-2 space-y-2">
										{#each section.entries as entry (entry.entry_id)}
											<div class="rounded-md border border-gray-100 dark:border-gray-800 bg-gray-50/70 dark:bg-gray-800/40 p-2">
												<p class="text-sm text-gray-800 dark:text-gray-100">
													[{formatEntryTime(entry.occurred_at)}] ({entry.type}) - {entry.text}
												</p>
												<p class="text-xs text-gray-500 dark:text-gray-400">
													Added by: {entry.created_by_name || entry.created_by}
												</p>
											</div>
										{/each}
									</div>
								</div>
							{/each}
						</div>
					{/if}
				</div>
			{/if}
		</div>
	</div>
</div>
