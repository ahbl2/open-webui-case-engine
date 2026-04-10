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
	import Spinner from '$lib/components/common/Spinner.svelte';
	import CaseWorkspaceContentRegion from '$lib/components/case/CaseWorkspaceContentRegion.svelte';
	import { applyStatusOntoPostSnapshot } from '$lib/case/summaryTabSnapshotMerge';
	import {
		mapTimelineSummaryKeyEvents,
		buildTimelineSummaryContext,
		type TimelineSummaryEventView
	} from '$lib/utils/timelineSummary';
	import { formatOperationalCaseTimeHm } from '$lib/utils/formatDateTime';

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
	/** P56-12: shared signal for POST timeline-summary + entries load—abort ends the UI run without clearing prior digest. */
	let timelineSummaryAbortController: AbortController | null = null;
	/** P56-15: POST case-summary + optional status reload—abort ends in-progress generate/regenerate without clearing prior snapshot. */
	let caseSummaryAbortController: AbortController | null = null;
	$: briefEntryCount = brief ? brief.sections.reduce((sum, section) => sum + section.entries.length, 0) : 0;
	/** P47-04: Must exceed worst-case Case Engine Summary AI time (timeline: 2× 600s Ollama + list; case summary: 1× 600s + status reload). */
	const SUMMARY_TAB_AI_CLIENT_TIMEOUT_MS = 1_260_000;

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
				if (import.meta.env.DEV) {
					console.warn('[summary-tab] client withTimeout', { label, timeoutMs, layer: 'open-webui-frontend' });
				}
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
		return formatOperationalCaseTimeHm(ts);
	}

	/** P56-10: Plain-language scope for CaseBriefRequest / timeline summary request (UI objects only—no new semantics). */
	function describeCaseBriefRequestScope(req: CaseBriefRequest): string {
		const dateFrom = typeof req.date_from === 'string' ? req.date_from.trim() : '';
		const dateTo = typeof req.date_to === 'string' ? req.date_to.trim() : '';
		const types = Array.isArray(req.types)
			? req.types.map((t) => String(t ?? '').trim()).filter(Boolean)
			: [];
		if (!dateFrom && !dateTo && types.length === 0) {
			return 'Full committed Timeline scope for this case—no date_from, date_to, or types on this request.';
		}
		const parts: string[] = [];
		if (dateFrom && dateTo) parts.push(`dates ${dateFrom}–${dateTo}`);
		else if (dateFrom) parts.push(`from ${dateFrom}`);
		else if (dateTo) parts.push(`up to ${dateTo}`);
		if (types.length > 0) parts.push(`types: ${types.join(', ')}`);
		return `Filtered request · ${parts.join(' · ')}`;
	}

	function cancelCaseSummaryRun(): void {
		if (!updatingSummary) return;
		activeStatusLoadId += 1;
		caseSummaryAbortController?.abort();
		caseSummaryAbortController = null;
		updatingSummary = false;
		summaryError = '';
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
		activeStatusLoadId += 1;
		const statusGuardId = activeStatusLoadId;
		caseSummaryAbortController?.abort();
		caseSummaryAbortController = new AbortController();
		const signal = caseSummaryAbortController.signal;
		loading = false;
		try {
			const postResult = await withTimeout(
				requestCaseSummary(caseId, $caseEngineToken, { signal }),
				SUMMARY_TAB_AI_CLIENT_TIMEOUT_MS,
				'Case summary'
			);
			if (statusGuardId !== activeStatusLoadId) return;
			summary = postResult;
			lastUpdatedAt = postResult.generatedAt;
			try {
				const status = await getCaseSummaryStatus(caseId, $caseEngineToken, { signal });
				if (statusGuardId !== activeStatusLoadId) return;
				const merged = applyStatusOntoPostSnapshot(postResult, status);
				summary = merged.summary;
				lastUpdatedAt = merged.lastSummaryGeneratedAt;
				latestActivityAt = merged.latestActivityAt;
				stale = merged.isStale;
			} catch {
				if (statusGuardId !== activeStatusLoadId) return;
			}
		} catch (err) {
			if (statusGuardId !== activeStatusLoadId) return;
			summaryError = err instanceof Error ? err.message : 'Failed to update case summary.';
		} finally {
			if (statusGuardId === activeStatusLoadId) {
				updatingSummary = false;
				caseSummaryAbortController = null;
			}
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

	function cancelTimelineSummaryRun(): void {
		if (!timelineSummaryLoading) return;
		activeTimelineSummaryLoadId += 1;
		timelineSummaryAbortController?.abort();
		timelineSummaryAbortController = null;
		timelineSummaryLoading = false;
		timelineSummaryError = '';
	}

	async function summarizeTimeline(): Promise<void> {
		if (!$caseEngineToken || !caseId || timelineSummaryLoading) return;
		activeTimelineSummaryLoadId += 1;
		const loadId = activeTimelineSummaryLoadId;
		timelineSummaryAbortController?.abort();
		timelineSummaryAbortController = new AbortController();
		const signal = timelineSummaryAbortController.signal;
		timelineSummaryLoading = true;
		timelineSummaryError = '';
		try {
			const summaryResult = await withTimeout(
				requestTimelineIntelligenceSummary(caseId, $caseEngineToken, timelineSummaryFilters, { signal }),
				SUMMARY_TAB_AI_CLIENT_TIMEOUT_MS,
				'Timeline summary'
			);
			const timelineEntries = await withTimeout(
				listCaseTimelineEntries(caseId, $caseEngineToken, { signal }),
				SUMMARY_TAB_AI_CLIENT_TIMEOUT_MS,
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
			if (loadId === activeTimelineSummaryLoadId) {
				timelineSummaryLoading = false;
				timelineSummaryAbortController = null;
			}
		}
	}

	onMount(() => {
		loadSummaryStatus();
	});
</script>

<CaseWorkspaceContentRegion testId="case-summary-page">
<div class="flex-1 min-h-0 overflow-auto p-4 md:p-6">
	<div class="mx-auto max-w-4xl space-y-6">
		<p class="text-xs text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-800 pb-3">
			Derived views from case data—not the committed record. Use <span class="font-medium">Timeline</span> for the
			committed chronology and <span class="font-medium">Notes</span> for drafts. Nothing here alters stored case
			records.
		</p>

		<nav class="-mx-1 flex flex-wrap items-center gap-x-2 gap-y-1 pt-2" aria-label="On this Summary page">
			<span class="shrink-0 text-xs font-medium text-gray-600 dark:text-gray-400">On this page</span>
			<span class="hidden text-gray-300 sm:inline dark:text-gray-600" aria-hidden="true">·</span>
			<div class="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
				<a
					href="#summary-module-case-summary"
					class="font-medium text-blue-600 hover:underline dark:text-blue-400"
					title="Jump to Case Summary (AI-derived saved snapshot)"
				>
					Case Summary
				</a>
				<span class="text-gray-300 dark:text-gray-600" aria-hidden="true">·</span>
				<a
					href="#summary-module-timeline-summary"
					class="font-medium text-blue-600 hover:underline dark:text-blue-400"
					title="Jump to Timeline Summary (session-only AI digest)"
				>
					Timeline Summary
				</a>
				<span class="text-gray-300 dark:text-gray-600" aria-hidden="true">·</span>
				<a
					href="#summary-module-case-brief"
					class="font-medium text-blue-600 hover:underline dark:text-blue-400"
					title="Jump to Case Brief (deterministic snapshot from Timeline)"
				>
					Case Brief
				</a>
			</div>
		</nav>

		<!-- Primary: Case Summary (AI-derived) -->
		<div
			id="summary-module-case-summary"
			class="scroll-mt-4 rounded-xl border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 shadow-sm p-5 md:p-6 space-y-4"
		>
			<div class="space-y-2">
				<div class="flex flex-wrap items-center gap-2">
					<h1 class="text-xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
						Case Summary (AI-derived)
					</h1>
					{#if loading}
						<span
							title="Loading saved Case Summary status from Case Engine."
							class="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
							>Fetching</span
						>
					{:else if updatingSummary}
						<span
							title="AI Case Summary run in progress. Snapshot updates when this completes."
							class="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide bg-blue-50 text-blue-900 dark:bg-blue-950/50 dark:text-blue-200"
							>Regenerating</span
						>
					{:else if summary && stale}
						<span
							title="Saved snapshot may predate recent case activity (time-based hint only—not a full diff)."
							class="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide bg-amber-100 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200"
							>Stale</span
						>
					{:else if summary}
						<span
							title="A saved Case Summary snapshot is loaded."
							class="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
							>Generated</span
						>
					{:else if !error}
						<span
							title="No saved Case Summary snapshot for this case yet."
							class="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
							>No snapshot</span
						>
					{/if}
				</div>
				{#if lastUpdatedAt}
					<p class="text-xs text-gray-500 dark:text-gray-400">Last snapshot: {lastUpdatedAt}</p>
				{:else}
					<p class="text-xs text-gray-500 dark:text-gray-400">No summary snapshot saved yet.</p>
				{/if}
				{#if !updatingSummary && stale}
					<p class="text-xs text-amber-700 dark:text-amber-300">
						May be out of date with recent Timeline, file, or Notes changes. <span class="font-medium">Stale</span>
						uses latest case activity time only—not a full diff against this snapshot.
					</p>
					{#if latestActivityAt && latestActivityAt.trim()}
						<p class="text-[11px] text-amber-700/80 dark:text-amber-300/80">
							Latest case activity: {latestActivityAt}
						</p>
					{/if}
				{/if}
				{#if summaryError && !summary}
					<div
						class="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-400"
						role="alert"
					>
						{summaryError}
					</div>
				{/if}
				{#if error}
					<div
						class="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-400"
						role="alert"
					>
						{error}
					</div>
				{/if}
				<p class="text-[11px] text-gray-500 dark:text-gray-400 max-w-2xl leading-relaxed">
					Regenerates this AI-derived view only. Does not change Timeline entries or Notes.
				</p>
				<div class="flex flex-wrap gap-2 pt-1">
					<button
						type="button"
						class="px-3 py-1.5 rounded-md text-sm bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
						on:click={updateSummary}
						disabled={updatingSummary || !$caseEngineToken}
						title={!$caseEngineToken
							? 'Case Engine sign-in required.'
							: summary
								? 'Replace the on-screen snapshot with a fresh AI run. Saves to Case Engine; does not edit Timeline or Notes.'
								: 'Request a new AI snapshot from Case Engine. Does not edit Timeline or Notes.'}
					>
						{updatingSummary ? 'Updating…' : (summary ? 'Update Case Summary' : 'Generate Case Summary')}
					</button>
					{#if updatingSummary}
						<button
							type="button"
							class="px-3 py-1.5 rounded-md text-sm border border-gray-300 bg-white text-gray-800 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 dark:hover:bg-gray-800"
							on:click={cancelCaseSummaryRun}
							title="Stop this run in the browser. Keeps the previous saved snapshot if you already had one; the server may still finish."
						>
							Cancel
						</button>
					{/if}
				</div>
			</div>

			<div class="border-t border-gray-100 dark:border-gray-800 pt-4">
				{#if loading}
					<div
						class="flex items-start gap-3 rounded-lg border border-gray-200/90 bg-gray-50/80 px-4 py-4 dark:border-gray-700 dark:bg-gray-800/40"
						role="status"
						aria-live="polite"
					>
						<div class="shrink-0 text-blue-600 dark:text-blue-400"><Spinner className="size-5" /></div>
						<div class="min-w-0">
							<p class="text-sm font-medium text-gray-800 dark:text-gray-200">Fetching summary status…</p>
							<p class="mt-1 text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
								Reading saved snapshot metadata from Case Engine.
							</p>
						</div>
					</div>
				{:else if summary}
					<CaseSummaryPanel
						loading={updatingSummary}
						error={summaryError}
						{summary}
						onCancelRegenerate={cancelCaseSummaryRun}
					/>
				{:else}
					<div
						class="rounded-lg border border-dashed border-gray-200 bg-gray-50/90 px-4 py-6 text-center dark:border-gray-700 dark:bg-gray-800/40"
						role="region"
						aria-label="Case summary not generated"
					>
						<p class="text-sm font-semibold text-gray-800 dark:text-gray-100">No AI-derived snapshot yet</p>
						<p class="mt-2 text-xs text-gray-500 dark:text-gray-400 max-w-md mx-auto leading-relaxed">
							Use <span class="font-medium text-gray-600 dark:text-gray-300">Generate Case Summary</span> above
							for a structured, evidence-linked preview.
						</p>
					</div>
				{/if}
			</div>
		</div>

		<!-- Utility: Timeline Summary (session-derived) -->
		<div
			id="summary-module-timeline-summary"
			class="scroll-mt-4 rounded-lg border border-dashed border-gray-200 bg-gray-50/70 p-5 dark:border-gray-700 dark:bg-gray-900/50 md:p-6 space-y-5"
		>
			<header class="space-y-2">
				<div class="flex flex-wrap items-center gap-2">
					<h2 class="text-base font-semibold tracking-tight text-gray-900 dark:text-gray-100">
						Timeline Summary (session-derived)
					</h2>
					{#if timelineSummaryLoading}
						<span
							title="AI Timeline digest run in progress (session-only; not saved to the case)."
							class="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide bg-blue-50 text-blue-900 dark:bg-blue-950/50 dark:text-blue-200"
							>Summarizing</span
						>
					{:else if timelineSummary}
						<span
							title="Session digest is shown here; leaving this tab or switching cases clears it."
							class="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide bg-blue-50 text-blue-900 dark:bg-blue-950/50 dark:text-blue-200"
							>Digest</span
						>
					{:else if !timelineSummaryError}
						<span
							title="No AI digest loaded in this browser session yet."
							class="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
							>No digest</span
						>
					{/if}
				</div>
			</header>

			<div
				class="rounded-lg border border-amber-200/90 bg-amber-50/50 px-3 py-3 dark:border-amber-900/45 dark:bg-amber-950/25"
			>
				<p class="text-xs font-semibold uppercase tracking-wide text-amber-900 dark:text-amber-200/90">
					Session scope
				</p>
				<div class="mt-2 space-y-2 text-[11px] leading-relaxed text-amber-900/95 dark:text-amber-100/85">
					<p>
						AI-derived digest from current Timeline (committed) entries. Shown only in this session—leaving the
						tab or switching cases clears it. Does not change the Timeline.
					</p>
					<p>
						Regenerates a session digest only. Does not change Timeline entries or Notes.
					</p>
				</div>
			</div>

			<div
				class="rounded-lg border border-gray-200/90 bg-gray-50/80 px-3 py-3 dark:border-gray-700 dark:bg-gray-800/35"
			>
				<p class="text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-400">Run digest</p>
				<div class="mt-2.5 flex flex-wrap gap-2">
					<button
						type="button"
						class="px-3 py-1.5 rounded-md text-sm bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
						on:click={summarizeTimeline}
						disabled={timelineSummaryLoading || !$caseEngineToken}
						title={!$caseEngineToken
							? 'Case Engine sign-in required.'
							: 'AI digest of committed Timeline entries. Result stays in this browser session only; does not change the Timeline.'}
					>
						{timelineSummaryLoading ? 'Summarizing…' : 'Summarize Timeline'}
					</button>
					{#if timelineSummaryLoading}
						<button
							type="button"
							class="px-3 py-1.5 rounded-md text-sm border border-gray-300 bg-white text-gray-800 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 dark:hover:bg-gray-800"
							on:click={cancelTimelineSummaryRun}
							title="Stop this run in the browser. Keeps any digest from before this run; the server may still finish."
						>
							Cancel
						</button>
					{/if}
				</div>
				{#if !timelineSummaryLoading}
					<div class="mt-2 text-[11px] leading-relaxed text-gray-500 dark:text-gray-400">
						<p>
							<span class="font-medium text-gray-600 dark:text-gray-300">Timeline digest request scope:</span>
							{describeCaseBriefRequestScope(timelineSummaryFilters)}
						</p>
						{#if !timelineSummary}
							<p class="mt-1">This tab does not yet expose date/type filter controls.</p>
						{/if}
					</div>
				{/if}
			</div>

			{#if timelineSummaryError}
				<div
					class="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-400"
					role="alert"
				>
					{timelineSummaryError}
				</div>
			{/if}
			{#if timelineSummaryLoading}
				<div
					class="flex items-start gap-3 rounded-lg border border-gray-200/90 bg-white/60 px-4 py-4 dark:border-gray-700 dark:bg-gray-900/40"
					role="status"
					aria-live="polite"
				>
					<div class="shrink-0 text-blue-600 dark:text-blue-400"><Spinner className="size-5" /></div>
					<div class="min-w-0">
						<p class="text-sm font-medium text-gray-800 dark:text-gray-200">Summarizing Timeline…</p>
						<p class="mt-1 text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
							AI digest from current committed entries—results stay in this browser session only.
						</p>
						<p class="mt-1.5 text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed">
							<span class="font-medium text-gray-600 dark:text-gray-300">Timeline digest request scope:</span>
							{describeCaseBriefRequestScope(timelineSummaryFilters)}
						</p>
						<div class="mt-3 flex flex-wrap gap-2">
							<button
								type="button"
								class="px-3 py-1.5 rounded-md text-sm border border-gray-300 bg-white text-gray-800 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 dark:hover:bg-gray-800"
								on:click={cancelTimelineSummaryRun}
								title="Stop this run in the browser. Keeps any digest from before this run; the server may still finish."
							>
								Cancel
							</button>
						</div>
					</div>
				</div>
			{:else if timelineSummary}
				<div class="space-y-4 border-t border-gray-200/80 pt-4 dark:border-gray-700/80">
					<p class="text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-400">
						Session digest output
					</p>
					<div class="space-y-4">
					<div class="rounded-lg border border-gray-200/90 bg-white/70 p-4 dark:border-gray-700 dark:bg-gray-900/45">
						<p class="text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-400">
							Run context
						</p>
						<p class="mt-2 text-[11px] text-gray-600 dark:text-gray-400 leading-relaxed">
							<span class="font-medium text-gray-700 dark:text-gray-300">Entries analyzed:</span>
							{timelineSummaryEntryCountLine}
						</p>
						<p class="mt-1.5 text-[11px] text-gray-600 dark:text-gray-400 leading-relaxed">
							<span class="font-medium text-gray-700 dark:text-gray-300">Digest metadata (filters):</span>
							{#if timelineSummaryFilterLine}
								{timelineSummaryFilterLine}
							{:else}
								None returned (no date range or types in response meta for this run).
							{/if}
						</p>
						<div class="mt-4 border-t border-gray-200/80 pt-4 dark:border-gray-700/70">
							<h3 class="text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-400">
								Digest text
							</h3>
							<p class="mt-2 text-sm leading-relaxed text-gray-800 dark:text-gray-100 whitespace-pre-wrap">
								{timelineSummary.summary}
							</p>
						</div>
					</div>

					<div class="rounded-lg border border-gray-200/90 bg-white/70 p-4 dark:border-gray-700 dark:bg-gray-900/45">
						<h3 class="text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-400">
							Key timeline events
						</h3>
						{#if timelineSummaryEvents.length === 0}
							<p class="mt-2 text-sm text-gray-600 dark:text-gray-300">No key events were identified.</p>
						{:else}
							<ul class="mt-3 space-y-2">
								{#each timelineSummaryEvents as event (event.entry_id)}
									<li class="rounded border border-gray-100 dark:border-gray-800 bg-gray-50/80 dark:bg-gray-800/30 p-2 text-sm">
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

					<div class="rounded-lg border border-gray-200/90 bg-white/70 p-4 dark:border-gray-700 dark:bg-gray-900/45">
						<h3 class="text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-400">
							Timeline gaps
						</h3>
						{#if timelineSummary.gaps.length === 0}
							<p class="mt-2 text-sm text-gray-600 dark:text-gray-300">No timeline gaps identified.</p>
						{:else}
							<ul class="mt-3 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-gray-700 dark:text-gray-300">
								{#each timelineSummary.gaps as gap}
									<li>{gap.description}</li>
								{/each}
							</ul>
						{/if}
					</div>
					</div>
				</div>
			{:else if !timelineSummaryError}
				<div
					class="rounded-lg border border-dashed border-gray-200 bg-white/40 px-4 py-6 text-center dark:border-gray-700 dark:bg-gray-900/30"
					role="region"
					aria-label="Timeline digest not generated"
				>
					<p class="text-sm font-semibold text-gray-800 dark:text-gray-100">No Timeline digest yet</p>
					<p class="mt-2 text-[11px] leading-relaxed text-gray-500 dark:text-gray-400 max-w-md mx-auto">
						Use <span class="font-medium text-gray-600 dark:text-gray-300">Summarize Timeline</span> under
						<span class="font-medium text-gray-600 dark:text-gray-300">Run digest</span> for an optional AI digest;
						results clear when you leave this tab or switch cases (see Session scope above).
					</p>
				</div>
			{/if}
		</div>

		<!-- Secondary: Case Brief (snapshot) -->
		<div
			id="summary-module-case-brief"
			class="scroll-mt-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 md:p-6 space-y-5"
		>
			<header class="space-y-2">
				<div class="flex flex-wrap items-center gap-2">
					<h2 class="text-lg font-semibold tracking-tight text-gray-900 dark:text-gray-100">
						Case Brief (snapshot){brief ? ` — ${briefEntryCount} entr${briefEntryCount === 1 ? 'y' : 'ies'}` : ''}
					</h2>
					{#if briefLoading}
						<span
							title="Building the on-screen brief from committed Timeline (no AI)."
							class="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide bg-blue-50 text-blue-900 dark:bg-blue-950/50 dark:text-blue-200"
							>Generating</span
						>
					{:else if brief}
						<span
							title="On-screen brief is loaded from the last Generate. Export PDF uses the same request scope."
							class="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide bg-blue-50 text-blue-900 dark:bg-blue-950/50 dark:text-blue-200"
							>Brief</span
						>
					{:else if !briefError}
						<span
							title="No brief generated in this session yet. Use Generate below."
							class="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
							>No brief</span
						>
					{/if}
				</div>
				<p class="text-xs text-gray-500 dark:text-gray-400 leading-relaxed max-w-2xl">
					Deterministic layout from committed Timeline entries (no AI). The preview below is on-screen only—use
					<span class="font-medium text-gray-700 dark:text-gray-300">Export PDF</span> for a download. Does not
					change Timeline or Notes.
				</p>
			</header>

			<div
				class="rounded-lg border border-gray-200/90 bg-gray-50/70 px-3 py-3 dark:border-gray-700 dark:bg-gray-800/35"
			>
				<p class="text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-400">Generate &amp; export</p>
				<div class="mt-2.5 flex flex-wrap items-center gap-2">
					<button
						type="button"
						class="px-3 py-1.5 rounded-md text-sm bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
						on:click={generateBrief}
						disabled={briefLoading || !$caseEngineToken}
						title={!$caseEngineToken
							? 'Case Engine sign-in required.'
							: 'Layout committed Timeline entries by date (no AI). Does not change Timeline or Notes.'}
					>
						{briefLoading ? 'Generating brief…' : 'Generate Case Brief'}
					</button>
					<button
						type="button"
						class="px-3 py-1.5 rounded-md text-sm border border-gray-300 bg-white text-gray-800 hover:bg-gray-50 disabled:opacity-60 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 dark:hover:bg-gray-800"
						on:click={onExportBrief}
						disabled={!brief || briefExporting}
						title={!brief
							? 'Generate a brief snapshot before exporting PDF.'
							: briefExporting
								? 'Preparing PDF download…'
								: 'Download the case brief as PDF using the same scope as the last successful Generate.'}
					>
						{briefExporting ? 'Preparing PDF…' : 'Export PDF'}
					</button>
				</div>
				{#if !brief && !briefLoading && !briefError}
					<p class="mt-2 text-[11px] leading-relaxed text-gray-500 dark:text-gray-400">
						Run <span class="font-medium text-gray-600 dark:text-gray-300">Generate Case Brief</span> first to
						enable PDF export.
					</p>
					<div class="mt-1.5 text-[11px] leading-relaxed text-gray-500 dark:text-gray-400">
						<p>
							<span class="font-medium text-gray-600 dark:text-gray-300">Brief request scope:</span>
							{describeCaseBriefRequestScope(briefFilters)}
						</p>
						<p class="mt-1">This tab does not yet expose date/type filter controls.</p>
					</div>
				{/if}
			</div>

			{#if briefError}
				<div
					class="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-400"
					role="alert"
				>
					{briefError}
				</div>
			{/if}
			{#if briefExporting}
				<div class="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400" role="status" aria-live="polite">
					<span class="shrink-0 text-blue-600 dark:text-blue-400"><Spinner className="size-4" /></span>
					<span>Preparing PDF export…</span>
				</div>
			{/if}
			{#if briefExportRef}
				<p class="text-xs text-green-700 dark:text-green-400">
					Brief exported. Reference: <span class="font-mono select-all">{briefExportRef}</span>
				</p>
			{/if}

			<div class="border-t border-gray-100 dark:border-gray-800 pt-4">
				{#if briefLoading}
					<div
						class="flex items-start gap-3 rounded-lg border border-gray-200/90 bg-gray-50/80 px-4 py-4 dark:border-gray-700 dark:bg-gray-800/40"
						role="status"
						aria-live="polite"
					>
						<div class="shrink-0 text-blue-600 dark:text-blue-400"><Spinner className="size-5" /></div>
						<div class="min-w-0">
							<p class="text-sm font-medium text-gray-800 dark:text-gray-200">Building case brief…</p>
							<p class="mt-1 text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
								Assembling entries by date from committed Timeline (no AI).
							</p>
						</div>
					</div>
				{:else if brief}
					<div class="space-y-5">
						<div
							class="rounded-lg border border-gray-200 bg-gray-50/50 p-4 dark:border-gray-800 dark:bg-gray-800/25"
						>
							<p class="text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-400">
								Case metadata
							</p>
							<dl class="mt-3 space-y-2.5 text-xs">
								<div class="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-4">
									<dt class="shrink-0 font-medium text-gray-500 dark:text-gray-400 sm:w-28">Case number</dt>
									<dd class="font-mono text-gray-900 dark:text-gray-100">{brief.case.case_number}</dd>
								</div>
								<div class="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-4">
									<dt class="shrink-0 font-medium text-gray-500 dark:text-gray-400 sm:w-28">Title</dt>
									<dd class="text-gray-800 dark:text-gray-100">{brief.case.title}</dd>
								</div>
								<div class="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-4">
									<dt class="shrink-0 font-medium text-gray-500 dark:text-gray-400 sm:w-28">Unit</dt>
									<dd class="text-gray-800 dark:text-gray-100">{brief.case.unit}</dd>
								</div>
								{#if briefGeneratedAt}
									<div class="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-4">
										<dt class="shrink-0 font-medium text-gray-500 dark:text-gray-400 sm:w-28">Snapshot time</dt>
										<dd class="text-gray-800 dark:text-gray-100">{briefGeneratedAt}</dd>
									</div>
								{/if}
							</dl>
						</div>

						<div
							class="rounded-lg border border-gray-200/80 bg-white/60 p-3 dark:border-gray-700 dark:bg-gray-900/35"
						>
							<p class="text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-400">
								Brief request scope
							</p>
							<p class="mt-1.5 text-[11px] leading-relaxed text-gray-600 dark:text-gray-400">
								{describeCaseBriefRequestScope(briefFilters)}
							</p>
							<p class="mt-1.5 text-[10px] leading-relaxed text-gray-500 dark:text-gray-500">
								PDF export uses the same scope as the last successful Generate request.
							</p>
						</div>

						{#if brief.sections.length === 0}
							<div
								class="rounded-lg border border-dashed border-gray-200 dark:border-gray-700 px-4 py-5 text-center"
							>
								<p class="text-sm text-gray-600 dark:text-gray-300">
									No timeline entries available for this case.
								</p>
							</div>
						{:else}
							<div class="space-y-3">
								<p class="text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-400">
									Entries by date
								</p>
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
							</div>
						{/if}
					</div>
				{:else}
					<div
						class="rounded-lg border border-dashed border-gray-200 bg-gray-50/50 px-4 py-6 text-center dark:border-gray-700 dark:bg-gray-800/20"
						role="region"
						aria-label="Case brief not loaded"
					>
						<p class="text-sm font-semibold text-gray-800 dark:text-gray-100">No brief loaded</p>
						<p class="mt-2 text-xs text-gray-500 dark:text-gray-400 max-w-md mx-auto leading-relaxed">
							Use <span class="font-medium text-gray-600 dark:text-gray-300">Generate Case Brief</span> in
							Generate &amp; export above, then review the chronological layout here.
						</p>
					</div>
				{/if}
			</div>
		</div>
	</div>
</div>
</CaseWorkspaceContentRegion>
