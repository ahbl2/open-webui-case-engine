<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { caseEngineToken } from '$lib/stores';
	import { getCaseSummaryStatus, requestCaseSummary, type CaseSummaryResult } from '$lib/apis/caseEngine';
	import CaseSummaryPanel from '$lib/components/case/CaseSummaryPanel.svelte';
	import CaseOverviewSummaryCards from '$lib/components/case/CaseOverviewSummaryCards.svelte';
	import CaseOverviewRecentActivity from '$lib/components/case/CaseOverviewRecentActivity.svelte';
	import CaseOverviewTimelineSnap from '$lib/components/case/CaseOverviewTimelineSnap.svelte';
	import CaseOverviewAssets from '$lib/components/case/CaseOverviewAssets.svelte';
	import Spinner from '$lib/components/common/Spinner.svelte';
	import CaseWorkspaceContentRegion from '$lib/components/case/CaseWorkspaceContentRegion.svelte';
	import OperatorCommandCenterFrame from '$lib/components/operator/OperatorCommandCenterFrame.svelte';
	import { applyStatusOntoPostSnapshot } from '$lib/case/summaryTabSnapshotMerge';
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

	let loading = true;
	let updatingSummary = false;
	let error = '';
	let summaryError = '';
	let summary: CaseSummaryResult | null = null;
	let lastUpdatedAt: string | null = null;
	let latestActivityAt = '';
	let stale = false;
	/** P56-15: POST case-summary + optional status reload—abort ends in-progress generate/regenerate without clearing prior snapshot. */
	let caseSummaryAbortController: AbortController | null = null;
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

	onMount(() => {
		loadSummaryStatus();
	});
</script>

<CaseWorkspaceContentRegion testId="case-summary-page" delegatePageScroll={true}>
	<OperatorCommandCenterFrame
		showHeroBand={false}
		occDesktopBoard={false}
		occRootExtraClass="case-summary-occ-root flex w-full min-h-0 min-w-0 flex-col"
		mainId="case-occ-command-center-main"
		mainAriaLabel="Case overview"
	>
		<svelte:fragment slot="summary">
			{#if caseId}
				<CaseOverviewSummaryCards caseId={caseId} />
			{/if}
		</svelte:fragment>
		<div class="contents" slot="colLeft">
			{#if caseId}
				<div class="case-summary-dashboard-col flex min-w-0 flex-col gap-6">
					<CaseOverviewRecentActivity caseId={caseId} heading="Recent Case Activity" balanceColumnHeight={true} />
				</div>
			{/if}
		</div>
		<div class="contents" slot="colCenter">
			{#if caseId}
				<div class="case-summary-dashboard-col flex min-w-0 flex-col">
					<CaseOverviewTimelineSnap caseId={caseId} balanceColumnHeight={true} />
				</div>
			{/if}
		</div>
		<div class="contents" slot="colRight">
			{#if caseId}
				<div class="case-summary-dashboard-col flex min-w-0 flex-col">
					<!-- Primary: Case Summary (AI-derived) — dashboard column -->
					<section
						id="summary-module-case-summary"
						class="{DS_SUMMARY_CLASSES.modulePrimary} {DS_STACK_CLASSES.stack} case-overview-equal-cell min-w-0 flex flex-col overflow-hidden min-[1200px]:min-h-0"
						aria-labelledby="summary-module-case-summary-heading"
					>
						<div class="{DS_STACK_CLASSES.tight} shrink-0">
							<div class="flex flex-wrap items-center gap-x-3 gap-y-2">
								<h2
									id="summary-module-case-summary-heading"
									class="{DS_TYPE_CLASSES.panel} m-0 shrink-0"
								>
									Case Summary (AI-Derived)
								</h2>
								<div class="flex flex-wrap items-center gap-2">
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
									{:else if !summary && !error}
										<span
											title="No saved Case Summary snapshot for this case yet."
											class="{DS_BADGE_CLASSES.base} {DS_BADGE_CLASSES.neutral}"
											>No snapshot</span
										>
									{/if}
								</div>
								<div class="flex flex-wrap items-center gap-2 ms-auto">
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
						</div>

						<div
							class="{DS_SUMMARY_CLASSES.sectionDivider} flex min-h-0 flex-1 flex-col overflow-hidden"
						>
							<div class="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
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
						</div>
					</section>
				</div>
			{/if}
		</div>
		<svelte:fragment slot="afterColumns">
			{#if caseId}
				<CaseOverviewAssets caseId={caseId} />
			{/if}
		</svelte:fragment>
	</OperatorCommandCenterFrame>
</CaseWorkspaceContentRegion>
