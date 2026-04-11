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
	import CaseOverviewSummaryCards from '$lib/components/case/CaseOverviewSummaryCards.svelte';
	import CaseOverviewRecentActivity from '$lib/components/case/CaseOverviewRecentActivity.svelte';
	import CaseOverviewLinkedPanels from '$lib/components/case/CaseOverviewLinkedPanels.svelte';
	import Spinner from '$lib/components/common/Spinner.svelte';
	import CaseWorkspaceContentRegion from '$lib/components/case/CaseWorkspaceContentRegion.svelte';
	import { applyStatusOntoPostSnapshot } from '$lib/case/summaryTabSnapshotMerge';
	import {
		mapTimelineSummaryKeyEvents,
		buildTimelineSummaryContext,
		type TimelineSummaryEventView
	} from '$lib/utils/timelineSummary';
	import { formatOperationalCaseTimeHm } from '$lib/utils/formatDateTime';
	import {
		DS_SUMMARY_CLASSES,
		DS_TYPE_CLASSES,
		DS_BTN_CLASSES,
		DS_BADGE_CLASSES,
		DS_STATUS_SURFACE_CLASSES,
		DS_STATUS_TEXT_CLASSES,
		DS_STACK_CLASSES
	} from '$lib/case/detectivePrimitiveFoundation';

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
<div class={DS_SUMMARY_CLASSES.pageScroll}>
	<div class="{DS_SUMMARY_CLASSES.pageInner} {DS_STACK_CLASSES.stack}">
		<header class={DS_SUMMARY_CLASSES.identityBand}>
			<p class={DS_SUMMARY_CLASSES.pageEyebrow}>Case workspace · orientation</p>
			<div class={DS_SUMMARY_CLASSES.identityTitleRow}>
				<h1 class={DS_TYPE_CLASSES.display}>Overview</h1>
			</div>
			<p class="{DS_TYPE_CLASSES.meta} mt-2 max-w-2xl">
				Derived views from case data—not the committed record. Use <span class="font-semibold">Timeline</span> for
				the committed chronology and <span class="font-semibold">Notes</span> for drafts. Nothing here alters stored
				case records.
			</p>
		</header>

		{#if caseId}
			<CaseOverviewSummaryCards caseId={caseId} />
			<CaseOverviewRecentActivity caseId={caseId} />
			<CaseOverviewLinkedPanels caseId={caseId} />
		{/if}

		<nav class={DS_SUMMARY_CLASSES.inPageNav} aria-label="On this Summary page">
			<span class="{DS_TYPE_CLASSES.label} shrink-0 text-[var(--ds-text-secondary)]">On this page</span>
			<span class="{DS_SUMMARY_CLASSES.navSep} hidden sm:inline" aria-hidden="true">·</span>
			<div class="flex flex-wrap items-center gap-x-2 gap-y-1">
				<a
					href="#summary-module-case-summary"
					class={DS_SUMMARY_CLASSES.navLink}
					title="Jump to Case Summary (AI-derived saved snapshot)"
				>
					Case Summary
				</a>
				<span class={DS_SUMMARY_CLASSES.navSep} aria-hidden="true">·</span>
				<a
					href="#summary-module-recent-activity"
					class={DS_SUMMARY_CLASSES.navLink}
					title="Jump to Recent activity (committed timeline entries)"
				>
					Recent activity
				</a>
				<span class={DS_SUMMARY_CLASSES.navSep} aria-hidden="true">·</span>
				<a
					href="#summary-module-linked-panels"
					class={DS_SUMMARY_CLASSES.navLink}
					title="Jump to Files, entities and notes previews"
				>
					Linked panels
				</a>
				<span class={DS_SUMMARY_CLASSES.navSep} aria-hidden="true">·</span>
				<a
					href="#summary-module-timeline-summary"
					class={DS_SUMMARY_CLASSES.navLink}
					title="Jump to Timeline Summary (session-only AI digest)"
				>
					Timeline Summary
				</a>
				<span class={DS_SUMMARY_CLASSES.navSep} aria-hidden="true">·</span>
				<a
					href="#summary-module-case-brief"
					class={DS_SUMMARY_CLASSES.navLink}
					title="Jump to Case Brief (deterministic snapshot from Timeline)"
				>
					Case Brief
				</a>
			</div>
		</nav>

		<!-- Primary: Case Summary (AI-derived) -->
		<section
			id="summary-module-case-summary"
			class="{DS_SUMMARY_CLASSES.modulePrimary} {DS_STACK_CLASSES.stack}"
			aria-labelledby="summary-module-case-summary-heading"
		>
			<div class={DS_STACK_CLASSES.tight}>
				<div class="flex flex-wrap items-center gap-2">
					<h2 id="summary-module-case-summary-heading" class={DS_TYPE_CLASSES.panel}>
						Case Summary (AI-derived)
					</h2>
					{#if loading}
						<span
							title="Loading saved Case Summary status from Case Engine."
							class="{DS_BADGE_CLASSES.base} {DS_BADGE_CLASSES.neutral}"
							>Fetching</span
						>
					{:else if updatingSummary}
						<span
							title="AI Case Summary run in progress. Snapshot updates when this completes."
							class="{DS_BADGE_CLASSES.base} {DS_BADGE_CLASSES.info}"
							>Regenerating</span
						>
					{:else if summary && stale}
						<span
							title="Saved snapshot may predate recent case activity (time-based hint only—not a full diff)."
							class="{DS_BADGE_CLASSES.base} {DS_BADGE_CLASSES.warning}"
							>Stale</span
						>
					{:else if summary}
						<span
							title="A saved Case Summary snapshot is loaded."
							class="{DS_BADGE_CLASSES.base} {DS_BADGE_CLASSES.neutral}"
							>Generated</span
						>
					{:else if !error}
						<span
							title="No saved Case Summary snapshot for this case yet."
							class="{DS_BADGE_CLASSES.base} {DS_BADGE_CLASSES.neutral}"
							>No snapshot</span
						>
					{/if}
				</div>
				{#if lastUpdatedAt}
					<p class={DS_TYPE_CLASSES.meta}>Last snapshot: {lastUpdatedAt}</p>
				{:else}
					<p class={DS_TYPE_CLASSES.meta}>No summary snapshot saved yet.</p>
				{/if}
				{#if !updatingSummary && stale}
					<p class="{DS_TYPE_CLASSES.meta} {DS_STATUS_TEXT_CLASSES.warning}">
						May be out of date with recent Timeline, file, or Notes changes. <span class="font-semibold"
							>Stale</span
						>
						uses latest case activity time only—not a full diff against this snapshot.
					</p>
					{#if latestActivityAt && latestActivityAt.trim()}
						<p class="{DS_TYPE_CLASSES.meta} {DS_STATUS_TEXT_CLASSES.warning}">
							Latest case activity: {latestActivityAt}
						</p>
					{/if}
				{/if}
				{#if summaryError && !summary}
					<div class="rounded-md px-3 py-2 text-sm {DS_STATUS_SURFACE_CLASSES.error}" role="alert">
						<p class="ds-status-copy">{summaryError}</p>
					</div>
				{/if}
				{#if error}
					<div class="rounded-md px-3 py-2 text-sm {DS_STATUS_SURFACE_CLASSES.error}" role="alert">
						<p class="ds-status-copy">{error}</p>
					</div>
				{/if}
				<p class="{DS_TYPE_CLASSES.meta} max-w-2xl">
					Regenerates this AI-derived view only. Does not change Timeline entries or Notes.
				</p>
				<div class="flex flex-wrap gap-2 pt-1">
					<button
						type="button"
						class="{DS_BTN_CLASSES.primary} disabled:opacity-60"
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
							class={DS_BTN_CLASSES.secondary}
							on:click={cancelCaseSummaryRun}
							title="Stop this run in the browser. Keeps the previous saved snapshot if you already had one; the server may still finish."
						>
							Cancel
						</button>
					{/if}
				</div>
			</div>

			<div class={DS_SUMMARY_CLASSES.sectionDivider}>
				{#if loading}
					<div class={DS_SUMMARY_CLASSES.loadingPanel} role="status" aria-live="polite">
						<div class="shrink-0 {DS_STATUS_TEXT_CLASSES.info}"><Spinner className="size-5" /></div>
						<div class="min-w-0">
							<p class="{DS_TYPE_CLASSES.body} font-semibold">Fetching summary status…</p>
							<p class="{DS_TYPE_CLASSES.meta} mt-1">
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
						class={DS_SUMMARY_CLASSES.emptyDashed}
						role="region"
						aria-label="Case summary not generated"
					>
						<p class="{DS_TYPE_CLASSES.body} font-semibold">No AI-derived snapshot yet</p>
						<p class="{DS_TYPE_CLASSES.meta} mt-2 max-w-md mx-auto">
							Use <span class="font-semibold">Generate Case Summary</span> above for a structured,
							evidence-linked preview.
						</p>
					</div>
				{/if}
			</div>
		</section>

		<!-- Utility: Timeline Summary (session-derived) -->
		<section
			id="summary-module-timeline-summary"
			class="{DS_SUMMARY_CLASSES.moduleSession} {DS_STACK_CLASSES.stack}"
			aria-labelledby="summary-module-timeline-summary-heading"
		>
			<header class={DS_STACK_CLASSES.tight}>
				<div class="flex flex-wrap items-center gap-2">
					<h2 id="summary-module-timeline-summary-heading" class={DS_TYPE_CLASSES.panel}>
						Timeline Summary (session-derived)
					</h2>
					{#if timelineSummaryLoading}
						<span
							title="AI Timeline digest run in progress (session-only; not saved to the case)."
							class="{DS_BADGE_CLASSES.base} {DS_BADGE_CLASSES.info}"
							>Summarizing</span
						>
					{:else if timelineSummary}
						<span
							title="Session digest is shown here; leaving this tab or switching cases clears it."
							class="{DS_BADGE_CLASSES.base} {DS_BADGE_CLASSES.info}"
							>Digest</span
						>
					{:else if !timelineSummaryError}
						<span
							title="No AI digest loaded in this browser session yet."
							class="{DS_BADGE_CLASSES.base} {DS_BADGE_CLASSES.neutral}"
							>No digest</span
						>
					{/if}
				</div>
			</header>

			<div class={DS_SUMMARY_CLASSES.sessionScopeBanner}>
				<p class="{DS_TYPE_CLASSES.label} {DS_STATUS_TEXT_CLASSES.warning}">Session scope</p>
				<div class="{DS_STACK_CLASSES.tight} mt-2">
					<p class="{DS_TYPE_CLASSES.meta} {DS_STATUS_TEXT_CLASSES.warning}">
						AI-derived digest from current Timeline (committed) entries. Shown only in this session—leaving the
						tab or switching cases clears it. Does not change the Timeline.
					</p>
					<p class="{DS_TYPE_CLASSES.meta} {DS_STATUS_TEXT_CLASSES.warning}">
						Regenerates a session digest only. Does not change Timeline entries or Notes.
					</p>
				</div>
			</div>

			<div class={DS_SUMMARY_CLASSES.subpanelRun}>
				<p class={DS_TYPE_CLASSES.label}>Run digest</p>
				<div class="mt-2.5 flex flex-wrap gap-2">
					<button
						type="button"
						class="{DS_BTN_CLASSES.primary} disabled:opacity-60"
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
							class={DS_BTN_CLASSES.secondary}
							on:click={cancelTimelineSummaryRun}
							title="Stop this run in the browser. Keeps any digest from before this run; the server may still finish."
						>
							Cancel
						</button>
					{/if}
				</div>
				{#if !timelineSummaryLoading}
					<div class="mt-2">
						<p class={DS_TYPE_CLASSES.meta}>
							<span class="font-semibold">Timeline digest request scope:</span>
							{describeCaseBriefRequestScope(timelineSummaryFilters)}
						</p>
						{#if !timelineSummary}
							<p class="{DS_TYPE_CLASSES.meta} mt-1">This tab does not yet expose date/type filter controls.</p>
						{/if}
					</div>
				{/if}
			</div>

			{#if timelineSummaryError}
				<div class="rounded-md px-3 py-2 text-sm {DS_STATUS_SURFACE_CLASSES.error}" role="alert">
					<p class="ds-status-copy">{timelineSummaryError}</p>
				</div>
			{/if}
			{#if timelineSummaryLoading}
				<div class={DS_SUMMARY_CLASSES.loadingPanel} role="status" aria-live="polite">
					<div class="shrink-0 {DS_STATUS_TEXT_CLASSES.info}"><Spinner className="size-5" /></div>
					<div class="min-w-0">
						<p class="{DS_TYPE_CLASSES.body} font-semibold">Summarizing Timeline…</p>
						<p class="{DS_TYPE_CLASSES.meta} mt-1">
							AI digest from current committed entries—results stay in this browser session only.
						</p>
						<p class="{DS_TYPE_CLASSES.meta} mt-1.5">
							<span class="font-semibold">Timeline digest request scope:</span>
							{describeCaseBriefRequestScope(timelineSummaryFilters)}
						</p>
						<div class="mt-3 flex flex-wrap gap-2">
							<button
								type="button"
								class={DS_BTN_CLASSES.secondary}
								on:click={cancelTimelineSummaryRun}
								title="Stop this run in the browser. Keeps any digest from before this run; the server may still finish."
							>
								Cancel
							</button>
						</div>
					</div>
				</div>
			{:else if timelineSummary}
				<div class="{DS_SUMMARY_CLASSES.sectionDivider} {DS_STACK_CLASSES.stack}">
					<p class={DS_TYPE_CLASSES.label}>Session digest output</p>
					<div class={DS_STACK_CLASSES.stack}>
					<div class={DS_SUMMARY_CLASSES.outputCard}>
						<p class={DS_TYPE_CLASSES.label}>Run context</p>
						<p class="{DS_TYPE_CLASSES.meta} mt-2">
							<span class="font-semibold">Entries analyzed:</span>
							{timelineSummaryEntryCountLine}
						</p>
						<p class="{DS_TYPE_CLASSES.meta} mt-1.5">
							<span class="font-semibold">Digest metadata (filters):</span>
							{#if timelineSummaryFilterLine}
								{timelineSummaryFilterLine}
							{:else}
								None returned (no date range or types in response meta for this run).
							{/if}
						</p>
						<div class="{DS_SUMMARY_CLASSES.sectionDivider} mt-4">
							<h3 class={DS_TYPE_CLASSES.label}>
								Digest text
							</h3>
							<p class="{DS_TYPE_CLASSES.body} mt-2 whitespace-pre-wrap">
								{timelineSummary.summary}
							</p>
						</div>
					</div>

					<div class={DS_SUMMARY_CLASSES.outputCard}>
						<h3 class={DS_TYPE_CLASSES.label}>
							Key timeline events
						</h3>
						{#if timelineSummaryEvents.length === 0}
							<p class="{DS_TYPE_CLASSES.body} mt-2">No key events were identified.</p>
						{:else}
							<ul class="{DS_STACK_CLASSES.tight} mt-3 list-none p-0">
								{#each timelineSummaryEvents as event (event.entry_id)}
									<li class={DS_SUMMARY_CLASSES.keyEventItem}>
										<p class={DS_TYPE_CLASSES.body}>
											[{event.occurred_at ? formatEntryTime(event.occurred_at) : 'n/a'}] ({event.type}) - {event.excerpt}
										</p>
										<p class="{DS_TYPE_CLASSES.meta} mt-1">
											Source entry: {event.entry_id}
										</p>
										<p class={DS_TYPE_CLASSES.meta}>
											Selection reason: {event.reason}
										</p>
									</li>
								{/each}
							</ul>
						{/if}
					</div>

					<div class={DS_SUMMARY_CLASSES.outputCard}>
						<h3 class={DS_TYPE_CLASSES.label}>
							Timeline gaps
						</h3>
						{#if timelineSummary.gaps.length === 0}
							<p class="{DS_TYPE_CLASSES.body} mt-2">No timeline gaps identified.</p>
						{:else}
							<ul class="mt-3 list-disc space-y-1.5 pl-5 {DS_TYPE_CLASSES.body}">
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
					class={DS_SUMMARY_CLASSES.emptyDashed}
					role="region"
					aria-label="Timeline digest not generated"
				>
					<p class="{DS_TYPE_CLASSES.body} font-semibold">No Timeline digest yet</p>
					<p class="{DS_TYPE_CLASSES.meta} mt-2 max-w-md mx-auto">
						Use <span class="font-semibold">Summarize Timeline</span> under
						<span class="font-semibold">Run digest</span> for an optional AI digest; results clear when you leave this
						tab or switch cases (see Session scope above).
					</p>
				</div>
			{/if}
		</section>

		<!-- Secondary: Case Brief (snapshot) -->
		<section
			id="summary-module-case-brief"
			class="{DS_SUMMARY_CLASSES.moduleBrief} {DS_STACK_CLASSES.stack}"
			aria-labelledby="summary-module-case-brief-heading"
		>
			<header class={DS_STACK_CLASSES.tight}>
				<div class="flex flex-wrap items-center gap-2">
					<h2 id="summary-module-case-brief-heading" class={DS_TYPE_CLASSES.panel}>
						Case Brief (snapshot){brief ? ` — ${briefEntryCount} entr${briefEntryCount === 1 ? 'y' : 'ies'}` : ''}
					</h2>
					{#if briefLoading}
						<span
							title="Building the on-screen brief from committed Timeline (no AI)."
							class="{DS_BADGE_CLASSES.base} {DS_BADGE_CLASSES.info}"
							>Generating</span
						>
					{:else if brief}
						<span
							title="On-screen brief is loaded from the last Generate. Export PDF uses the same request scope."
							class="{DS_BADGE_CLASSES.base} {DS_BADGE_CLASSES.info}"
							>Brief</span
						>
					{:else if !briefError}
						<span
							title="No brief generated in this session yet. Use Generate below."
							class="{DS_BADGE_CLASSES.base} {DS_BADGE_CLASSES.neutral}"
							>No brief</span
						>
					{/if}
				</div>
				<p class="{DS_TYPE_CLASSES.meta} max-w-2xl">
					Deterministic layout from committed Timeline entries (no AI). The preview below is on-screen only—use
					<span class="font-semibold">Export PDF</span> for a download. Does not change Timeline or Notes.
				</p>
			</header>

			<div class={DS_SUMMARY_CLASSES.subpanel}>
				<p class={DS_TYPE_CLASSES.label}>Generate &amp; export</p>
				<div class="mt-2.5 flex flex-wrap items-center gap-2">
					<button
						type="button"
						class="{DS_BTN_CLASSES.primary} disabled:opacity-60"
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
						class="{DS_BTN_CLASSES.secondary} disabled:opacity-60"
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
					<p class="{DS_TYPE_CLASSES.meta} mt-2">
						Run <span class="font-semibold">Generate Case Brief</span> first to enable PDF export.
					</p>
					<div class="{DS_TYPE_CLASSES.meta} mt-1.5">
						<p>
							<span class="font-semibold">Brief request scope:</span>
							{describeCaseBriefRequestScope(briefFilters)}
						</p>
						<p class="mt-1">This tab does not yet expose date/type filter controls.</p>
					</div>
				{/if}
			</div>

			{#if briefError}
				<div class="rounded-md px-3 py-2 text-sm {DS_STATUS_SURFACE_CLASSES.error}" role="alert">
					<p class="ds-status-copy">{briefError}</p>
				</div>
			{/if}
			{#if briefExporting}
				<div class="flex items-center gap-2 {DS_TYPE_CLASSES.meta}" role="status" aria-live="polite">
					<span class="shrink-0 {DS_STATUS_TEXT_CLASSES.info}"><Spinner className="size-4" /></span>
					<span>Preparing PDF export…</span>
				</div>
			{/if}
			{#if briefExportRef}
				<p class="{DS_TYPE_CLASSES.meta} {DS_STATUS_TEXT_CLASSES.success}">
					Brief exported. Reference: <span class="{DS_TYPE_CLASSES.mono} select-all">{briefExportRef}</span>
				</p>
			{/if}

			<div class={DS_SUMMARY_CLASSES.sectionDivider}>
				{#if briefLoading}
					<div class={DS_SUMMARY_CLASSES.loadingPanel} role="status" aria-live="polite">
						<div class="shrink-0 {DS_STATUS_TEXT_CLASSES.info}"><Spinner className="size-5" /></div>
						<div class="min-w-0">
							<p class="{DS_TYPE_CLASSES.body} font-semibold">Building case brief…</p>
							<p class="{DS_TYPE_CLASSES.meta} mt-1">
								Assembling entries by date from committed Timeline (no AI).
							</p>
						</div>
					</div>
				{:else if brief}
					<div class={DS_STACK_CLASSES.stack}>
						<div class={DS_SUMMARY_CLASSES.briefMetaPanel}>
							<p class={DS_TYPE_CLASSES.label}>
								Case metadata
							</p>
							<dl class="mt-3 space-y-2.5 text-xs">
								<div class="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-4">
									<dt class="shrink-0 font-medium {DS_TYPE_CLASSES.meta} sm:w-28">Case number</dt>
									<dd class="{DS_TYPE_CLASSES.mono} text-[var(--ds-text-primary)]">{brief.case.case_number}</dd>
								</div>
								<div class="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-4">
									<dt class="shrink-0 font-medium {DS_TYPE_CLASSES.meta} sm:w-28">Title</dt>
									<dd class="{DS_TYPE_CLASSES.body}">{brief.case.title}</dd>
								</div>
								<div class="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-4">
									<dt class="shrink-0 font-medium {DS_TYPE_CLASSES.meta} sm:w-28">Unit</dt>
									<dd class="{DS_TYPE_CLASSES.body}">{brief.case.unit}</dd>
								</div>
								{#if briefGeneratedAt}
									<div class="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-4">
										<dt class="shrink-0 font-medium {DS_TYPE_CLASSES.meta} sm:w-28">Snapshot time</dt>
										<dd class="{DS_TYPE_CLASSES.body}">{briefGeneratedAt}</dd>
									</div>
								{/if}
							</dl>
						</div>

						<div class={DS_SUMMARY_CLASSES.subpanel}>
							<p class={DS_TYPE_CLASSES.label}>
								Brief request scope
							</p>
							<p class="{DS_TYPE_CLASSES.meta} mt-1.5">
								{describeCaseBriefRequestScope(briefFilters)}
							</p>
							<p class="{DS_TYPE_CLASSES.meta} mt-1.5 opacity-90">
								PDF export uses the same scope as the last successful Generate request.
							</p>
						</div>

						{#if brief.sections.length === 0}
							<div class={DS_SUMMARY_CLASSES.emptyDashed}>
								<p class={DS_TYPE_CLASSES.body}>
									No timeline entries available for this case.
								</p>
							</div>
						{:else}
							<div class={DS_STACK_CLASSES.stack}>
								<p class={DS_TYPE_CLASSES.label}>
									Entries by date
								</p>
								<div class={DS_STACK_CLASSES.stack}>
								{#each brief.sections as section (section.date)}
									<div class="{DS_SUMMARY_CLASSES.briefDateSection}">
										<h3 class="{DS_TYPE_CLASSES.body} font-semibold">{section.date}</h3>
										<div class="{DS_STACK_CLASSES.tight} mt-2">
											{#each section.entries as entry (entry.entry_id)}
												<div class={DS_SUMMARY_CLASSES.briefEntryCard}>
													<p class={DS_TYPE_CLASSES.body}>
														[{formatEntryTime(entry.occurred_at)}] ({entry.type}) - {entry.text}
													</p>
													<p class={DS_TYPE_CLASSES.meta}>
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
						class={DS_SUMMARY_CLASSES.emptyDashed}
						role="region"
						aria-label="Case brief not loaded"
					>
						<p class="{DS_TYPE_CLASSES.body} font-semibold">No brief loaded</p>
						<p class="{DS_TYPE_CLASSES.meta} mt-2 max-w-md mx-auto">
							Use <span class="font-semibold">Generate Case Brief</span> in Generate &amp; export above, then review
							the chronological layout here.
						</p>
					</div>
				{/if}
			</div>
		</section>
	</div>
</div>
</CaseWorkspaceContentRegion>
