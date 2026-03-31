<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { page } from '$app/stores';
	import { activeCaseMeta, caseEngineAuthState, caseEngineToken, caseEngineUser } from '$lib/stores';
	import {
		askCrossCase,
		CaseEngineRequestError,
		getTimelineIntelligence,
		listCaseTimelineEntries,
		listCaseIntelligenceAlerts,
		ackIntelligenceAlert,
		searchCaseIntelligence,
		searchCrossCaseIntelligence,
		type CrossCaseCitation,
		type IntelSearchResult,
		type IntelligenceAlert,
		type SearchResultItem
	} from '$lib/apis/caseEngine';
	import CaseEngineAskIntegrityBanner from '$lib/components/case/CaseEngineAskIntegrityBanner.svelte';
	import CaseEngineAskStructuredSections from '$lib/components/case/CaseEngineAskStructuredSections.svelte';
	import type { AskFactItem, AskInferenceItem, AskIntegrityPresentation } from '$lib/utils/askIntegrityUi';
	import { normalizeAskFactInferenceArrays } from '$lib/utils/askIntegrityUi';
	import {
		buildEvidenceCaseGroups,
		groupEntityEvidenceByType,
		mapCaseSearchResultToEvidenceItem,
		mapIntelResultToEvidenceItem
	} from '$lib/utils/intelligenceView';
	import { buildEntityFocusHref } from '$lib/utils/entityFocus';
	import CaseEmptyState from '$lib/components/case/CaseEmptyState.svelte';
	import CaseErrorState from '$lib/components/case/CaseErrorState.svelte';
	import CaseLoadingState from '$lib/components/case/CaseLoadingState.svelte';
	import ConfirmDialog from '$lib/components/common/ConfirmDialog.svelte';
	import {
		STRUCTURED_QUERY_ACTIONS,
		actionById,
		buildStructuredQueryPlan,
		mapCaseSearchToStructuredResults,
		mapTimelineEntriesToStructuredResults,
		mapTimelineIntelToStructuredResults,
		type StructuredQueryActionId,
		type StructuredQueryResultItem
	} from '$lib/utils/structuredQueries';

	// ── Cross-case entity alerts (P28-40 load, P28-41 case-switch reliability) ─
	// Read-only surface for ENTITY_OVERLAP alerts produced by the backend.
	// Only OPEN alerts are shown; ACK transitions to ACKED and removes from list.
	// Backend summary text is displayed verbatim — never reworded.

	let alerts: IntelligenceAlert[] = [];
	let alertsLoading = true;
	let alertsLoadError = '';
	let selectedAlertId: number | null = null;
	let showAckConfirm = false;
	let isAckSubmitting = false;
	type AlertViewState = 'loading' | 'error' | 'empty' | 'success';
	type AlertActionFeedbackKind = 'success' | 'error';
	type AlertActionFeedback = { kind: AlertActionFeedbackKind; message: string } | null;
	let alertActionFeedback: AlertActionFeedback = null;
	let alertViewState: AlertViewState = 'loading';
	let alertsHeadingEl: HTMLHeadingElement | null = null;
	$: alertViewState =
		alertsLoading ? 'loading' : alertsLoadError ? 'error' : alerts.length === 0 ? 'empty' : 'success';

	// ── Case-switch sentinel (P28-41 alerts, P28-42 query results) ───────────
	// Seeded to the initial route param so the reactive guard is a no-op on
	// first render (onMount handles initial loads). Fires only when caseId
	// actually changes — covers SvelteKit route reuse across cases.
	/** Tracks which case ID was last fully loaded; guards all case-scoped state resets. */
	let prevLoadedCaseId: string = $page.params.id ?? '';
	/** Incremented on each alert load; guards stale responses from writing newer case state. */
	let activeAlertsLoadId = 0;

	async function loadAlerts(id: string, tok: string): Promise<boolean> {
		activeAlertsLoadId += 1;
		const loadId = activeAlertsLoadId;
		alertsLoading = true;
		alertsLoadError = '';
		try {
			const result = await listCaseIntelligenceAlerts(id, tok);
			if (loadId !== activeAlertsLoadId) return false;
			alerts = result;
			return true;
		} catch (e: unknown) {
			if (loadId !== activeAlertsLoadId) return false;
			alertsLoadError =
				e instanceof Error && e.message
					? e.message
					: 'Could not load intelligence alerts. Please try again.';
			return false;
		} finally {
			if (loadId === activeAlertsLoadId) alertsLoading = false;
		}
	}

	function resetAckDialogState(): void {
		selectedAlertId = null;
		showAckConfirm = false;
	}

	function retryLoadAlerts(): void {
		if (!$caseEngineToken || !caseId || alertsLoading) return;
		alertActionFeedback = null;
		loadAlerts(caseId, $caseEngineToken);
	}

	function focusAlertAcknowledgeButton(alertId: number | null): void {
		if (alertId === null) {
			alertsHeadingEl?.focus();
			return;
		}
		const selector = `[data-alert-ack-id="${alertId}"]`;
		const button = document.querySelector<HTMLButtonElement>(selector);
		if (button && !button.disabled) {
			button.focus();
			return;
		}
		alertsHeadingEl?.focus();
	}

	async function handleAckDialogCancel(): Promise<void> {
		const cancelledAlertId = selectedAlertId;
		resetAckDialogState();
		await tick();
		focusAlertAcknowledgeButton(cancelledAlertId);
	}

	// P29-01: Open confirm dialog — no API call until user confirms.
	function handleAck(alertId: number): void {
		if (isAckSubmitting || showAckConfirm) return;
		selectedAlertId = alertId;
		showAckConfirm = true;
	}

	async function executeAck(): Promise<void> {
		if (!$caseEngineToken || selectedAlertId === null) return;
		const alertId = selectedAlertId;
		let restoreFocusAlertId: number | null = alertId;
		isAckSubmitting = true;
		alertActionFeedback = null;
		try {
			await ackIntelligenceAlert(alertId, $caseEngineToken);
			// No optimistic removal — reload from backend to reflect confirmed state.
			const refreshed = await loadAlerts(caseId, $caseEngineToken);
			if (!refreshed) {
				alertsLoadError =
					'Alert was acknowledged, but the alerts list could not be refreshed. Try reloading the case.';
				alertActionFeedback = null;
				restoreFocusAlertId = null;
			} else {
				alertActionFeedback = { kind: 'success', message: 'Alert acknowledged.' };
				restoreFocusAlertId = null;
			}
		} catch (e: unknown) {
			alertActionFeedback = {
				kind: 'error',
				message: 'Could not acknowledge the alert. Please try again.'
			};
		} finally {
			isAckSubmitting = false;
			resetAckDialogState();
			await tick();
			focusAlertAcknowledgeButton(restoreFocusAlertId);
		}
	}

	onMount(() => {
		if ($caseEngineToken && $page.params.id) {
			loadAlerts($page.params.id, $caseEngineToken);
		}
	});

	type IntelligenceScope = 'THIS_CASE' | 'CID' | 'SIU' | 'ALL';

	$: caseId = $page.params.id;

	// P28-41/P28-42: Reset all case-scoped state when the active case changes.
	// prevLoadedCaseId is seeded at declaration time → no-op on first render
	// (onMount handles initial alert load). Fires only on case switch.
	// User preferences (query text, selectedScope, structuredActionId, structuredInput)
	// are intentionally preserved across case switches.
	$: if (caseId && $caseEngineToken && caseId !== prevLoadedCaseId) {
		prevLoadedCaseId = caseId;

		// Alerts — reload for the new case
		alerts = [];
		alertsLoadError = '';
		alertActionFeedback = null;
		selectedAlertId = null;
		showAckConfirm = false;
		isAckSubmitting = false;
		loadAlerts(caseId, $caseEngineToken);

		// Intelligence query results — clear stale results; user re-runs if needed
		ranSearch = false;
		loading = false;
		error = '';
		groundedAnswer = '';
		askCitations = [];
		askIntegrityPresentation = undefined;
		askFacts = [];
		askInferences = [];
		askCrossIntegrityRefusal = '';
		caseResults = [];
		intelResults = [];
		intelScopeApplied = '';
		lastExecutedScope = null;
		lastExecutedQuery = '';

		// Structured query results — clear stale results; user re-runs if needed
		structuredRan = false;
		structuredLoading = false;
		structuredError = '';
		structuredResults = [];
		structuredQueryLabel = '';
	}

	$: authRole = String($caseEngineAuthState?.user?.role ?? '').toLowerCase();
	$: isAdmin = authRole === 'admin' || $caseEngineUser?.role === 'ADMIN';
	$: authUnits = Array.isArray($caseEngineAuthState?.user?.units)
		? $caseEngineAuthState.user.units.filter(
				(unit): unit is 'CID' | 'SIU' => unit === 'CID' || unit === 'SIU'
			)
		: [];
	$: legacyRoleUnit =
		$caseEngineUser?.role === 'CID' || $caseEngineUser?.role === 'SIU' ? $caseEngineUser.role : null;
	$: authorizedUnits = Array.from(
		new Set([...(legacyRoleUnit ? [legacyRoleUnit] : []), ...authUnits])
	) as Array<'CID' | 'SIU'>;
	$: allowedScopes = isAdmin
		? ([
				{ id: 'THIS_CASE', label: 'This Case' },
				{ id: 'CID', label: 'CID' },
				{ id: 'SIU', label: 'SIU' },
				{ id: 'ALL', label: 'All' }
			] as Array<{ id: IntelligenceScope; label: string }>)
		: ([
				{ id: 'THIS_CASE', label: 'This Case' },
				...authorizedUnits.map((unit) => ({ id: unit, label: unit }))
			] as Array<{ id: IntelligenceScope; label: string }>);

	const scopeDescriptions: Record<IntelligenceScope, string> = {
		THIS_CASE: 'This Case: search limited to the current case.',
		CID: 'CID: search across CID cases you can access.',
		SIU: 'SIU: search across SIU cases you can access.',
		ALL: 'All: search across all accessible cases.'
	};

	let selectedScope: IntelligenceScope = 'THIS_CASE';
	let query = '';
	let loading = false;
	let error = '';
	let ranSearch = false;
	let lastExecutedScope: IntelligenceScope | null = null;
	let lastExecutedQuery = '';

	let groundedAnswer = '';
	let askCitations: CrossCaseCitation[] = [];
	let askIntegrityPresentation: AskIntegrityPresentation | undefined = undefined;
	let askFacts: AskFactItem[] = [];
	let askInferences: AskInferenceItem[] = [];
	let askCrossIntegrityRefusal = '';
	let caseResults: SearchResultItem[] = [];
	let intelResults: IntelSearchResult[] = [];
	let intelScopeApplied = '';
	let structuredActionId: StructuredQueryActionId = 'recent_timeline_activity';
	let structuredInput = '';
	let structuredLoading = false;
	let structuredError = '';
	let structuredRan = false;
	let structuredQueryLabel = '';
	let structuredResults: StructuredQueryResultItem[] = [];

	$: if (!allowedScopes.some((s) => s.id === selectedScope)) {
		selectedScope = allowedScopes[0]?.id ?? 'THIS_CASE';
	}
	$: currentScopeDescription = scopeDescriptions[selectedScope] ?? scopeDescriptions.THIS_CASE;
	$: selectedScopeLabel = allowedScopes.find((s) => s.id === selectedScope)?.label ?? selectedScope;

	$: currentCaseContext = {
		id: caseId,
		caseNumber: $activeCaseMeta?.case_number ?? 'Current case',
		caseTitle: $activeCaseMeta?.title ?? '',
		unit: $activeCaseMeta?.unit ?? ''
	};

	$: evidenceItems =
		selectedScope === 'THIS_CASE'
			? caseResults.map((row) => mapCaseSearchResultToEvidenceItem(row, currentCaseContext))
			: intelResults.map((row) => mapIntelResultToEvidenceItem(row));

	$: evidenceCaseGroups = buildEvidenceCaseGroups(evidenceItems);
	$: matchedCaseSummaries =
		selectedScope === 'THIS_CASE'
			? []
			: evidenceCaseGroups.map((g) => ({
					caseId: g.caseId,
					caseNumber: g.caseNumber,
					caseTitle: g.caseTitle,
					unit: g.unit,
					matchCount: g.matchCount
				}));
	$: entityTypeGroups = groupEntityEvidenceByType(evidenceItems);
	$: structuredAction = actionById(structuredActionId);
	$: structuredEntityFocusHref =
		structuredRan &&
		(structuredActionId === 'phone_mentions' ||
			structuredActionId === 'location_mentions' ||
			structuredActionId === 'person_mentions') &&
		structuredInput.trim()
			? buildEntityFocusHref({
					caseId,
					type:
						structuredActionId === 'phone_mentions'
							? 'phone'
							: structuredActionId === 'location_mentions'
								? 'location'
								: 'person',
					normalizedValue: structuredInput.trim(),
					scope: 'THIS_CASE'
				})
			: null;

	function citationKey(c: CrossCaseCitation): string {
		return `${c.source_type}:${c.case_id}:${c.id}`;
	}

	function sourceBadgeClass(type: string): string {
		if (type === 'timeline') {
			return 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300';
		}
		if (type === 'file') {
			return 'bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300';
		}
		if (type === 'entity') {
			return 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300';
		}
		return 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300';
	}

	function entityFocusHref(item: {
		entityType?: string;
		entityNormalized?: string;
		entityValue?: string;
	}): string | null {
		const normalized = item.entityNormalized?.trim() || item.entityValue?.trim() || '';
		return buildEntityFocusHref({
			caseId,
			type: item.entityType ?? '',
			normalizedValue: normalized,
			scope: selectedScope
		});
	}

	$: uniqueAskCitations = Array.from(
		new Map(askCitations.map((c) => [citationKey(c), c])).values()
	);

	$: uniqueIntelCitations = Array.from(
		new Map(
			intelResults.map((r) => [
				`${r.citation.case_id}:${r.citation.source_kind}:${r.citation.source_id}`,
				r.citation
			])
		).values()
	);
	$: hasAnalysis = groundedAnswer.trim().length > 0;
	$: hasEvidence = evidenceCaseGroups.length > 0;
	$: hasCaseMatches = matchedCaseSummaries.length > 0;
	$: hasEntityRows = entityTypeGroups.length > 0;
	$: hasCitations = uniqueAskCitations.length > 0 || uniqueIntelCitations.length > 0;
	$: allSectionsEmpty =
		ranSearch &&
		!loading &&
		!error &&
		!hasAnalysis &&
		!hasEvidence &&
		!hasCitations &&
		(selectedScope === 'THIS_CASE' ? true : !hasCaseMatches && !hasEntityRows);

	async function runIntelligenceQuery(): Promise<void> {
		if (!$caseEngineToken || !caseId) return;
		const q = query.trim();
		if (q.length < 2) {
			error = 'Enter at least 2 characters to run intelligence search.';
			return;
		}

		// Capture caseId at invocation — discard response if case switches mid-flight
		const queryCaseId = caseId;

		loading = true;
		error = '';
		ranSearch = true;
		lastExecutedScope = selectedScope;
		lastExecutedQuery = q;
		groundedAnswer = '';
		askCitations = [];
		askIntegrityPresentation = undefined;
		askFacts = [];
		askInferences = [];
		askCrossIntegrityRefusal = '';
		caseResults = [];
		intelResults = [];
		intelScopeApplied = '';

		try {
			if (selectedScope === 'THIS_CASE') {
				const caseSearch = await searchCaseIntelligence(queryCaseId, { q }, $caseEngineToken);
				if (caseId !== queryCaseId) return;
				caseResults = caseSearch.results;
				return;
			}

			const crossScope = selectedScope === 'ALL' ? 'ALL' : 'UNIT';
			const crossUnit = selectedScope === 'CID' || selectedScope === 'SIU' ? selectedScope : undefined;
			const unitScope = selectedScope === 'CID' || selectedScope === 'SIU' ? selectedScope : 'ALL';
			const [askRes, intelRes] = await Promise.all([
				askCrossCase(q, $caseEngineToken, {
					topK: 8,
					unitScope
				}),
				searchCrossCaseIntelligence(
					{
						q,
						scope: crossScope,
						unit: crossUnit
					},
					$caseEngineToken
				)
			]);
			if (caseId !== queryCaseId) return;
			groundedAnswer = askRes.answer ?? '';
			askCitations = askRes.used_citations ?? [];
			const norm = normalizeAskFactInferenceArrays(askRes.facts, askRes.inferences);
			askFacts = norm.facts;
			askInferences = norm.inferences;
			askIntegrityPresentation = askRes.integrityPresentation;
			intelResults = Array.isArray(intelRes.results) ? intelRes.results : [];
			intelScopeApplied = intelRes.scope_applied ?? '';
		} catch (err) {
			if (caseId !== queryCaseId) return;
			askCrossIntegrityRefusal = '';
			askIntegrityPresentation = undefined;
			askFacts = [];
			askInferences = [];
			if (err instanceof CaseEngineRequestError && err.errorCode === 'ASK_INTEGRITY_REFUSED') {
				error = '';
				askCrossIntegrityRefusal = err.message;
			} else {
				error = err instanceof Error ? err.message : 'Failed to load intelligence results.';
			}
		} finally {
			if (caseId === queryCaseId) loading = false;
		}
	}

	async function runStructuredQuery(): Promise<void> {
		if (!$caseEngineToken || !caseId || structuredLoading) return;
		const plan = buildStructuredQueryPlan(structuredActionId, structuredInput);
		if (!plan.ok) {
			structuredError = plan.error;
			return;
		}

		// Capture caseId at invocation — discard response if case switches mid-flight
		const queryCaseId = caseId;

		structuredLoading = true;
		structuredError = '';
		structuredRan = true;
		structuredResults = [];
		structuredQueryLabel = plan.plan.label;
		try {
			if (plan.plan.kind === 'timeline_entries') {
				const entries = await listCaseTimelineEntries(queryCaseId, $caseEngineToken);
				if (caseId !== queryCaseId) return;
				structuredResults = mapTimelineEntriesToStructuredResults(entries, queryCaseId, plan.plan.limit);
				return;
			}
			if (plan.plan.kind === 'timeline_intelligence') {
				const intel = await getTimelineIntelligence(queryCaseId, $caseEngineToken, plan.plan.params);
				if (caseId !== queryCaseId) return;
				structuredResults = mapTimelineIntelToStructuredResults(intel.entries, queryCaseId, plan.plan.limit);
				return;
			}
			const search = await searchCaseIntelligence(queryCaseId, { q: plan.plan.q }, $caseEngineToken);
			if (caseId !== queryCaseId) return;
			structuredResults = mapCaseSearchToStructuredResults(
				search.results,
				queryCaseId,
				plan.plan.limit,
				plan.plan.resultFilter
			);
		} catch (err) {
			if (caseId !== queryCaseId) return;
			structuredError = err instanceof Error ? err.message : 'Unable to run query. Please try again.';
		} finally {
			if (caseId === queryCaseId) structuredLoading = false;
		}
	}
</script>

<div class="h-full min-h-0 overflow-auto p-4 md:p-6">
	<div class="mx-auto max-w-5xl space-y-4">
		<div class="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
			<h1 class="text-lg font-semibold text-gray-900 dark:text-gray-100">Intelligence</h1>
			<p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
				Read-only cross-case intelligence workspace using backend evidence only. Results are grounded and citation-backed.
			</p>
		</div>

		{#if !$caseEngineToken}
			<div class="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
				<p class="text-sm text-gray-600 dark:text-gray-300">
					Case Engine authentication is required to load intelligence data.
				</p>
			</div>
		{:else}
			<!-- ── Cross-case entity alerts (P28-40) ──────────────────────────── -->
			<div
				class="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 space-y-3"
				data-testid="intelligence-alerts-section"
			>
				<div class="flex items-center justify-between gap-2 flex-wrap">
					<div>
						<h2
							bind:this={alertsHeadingEl}
							tabindex="-1"
							class="text-sm font-semibold text-gray-900 dark:text-gray-100 focus:outline-none"
						>
							Cross-case entity alerts
						</h2>
						<p class="mt-0.5 text-[11px] text-gray-500 dark:text-gray-400">
							Automated signal: text overlap detected across cases. Review supporting excerpts before drawing conclusions.
						</p>
					</div>
					{#if alertViewState === 'success'}
						<span
							class="shrink-0 text-xs font-medium px-2 py-0.5 rounded-full
							       bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400"
							data-testid="intelligence-alerts-count"
						>
							{alerts.length} open
						</span>
					{/if}
				</div>

				{#if alertActionFeedback && alertViewState !== 'error'}
					<div
						class={`rounded-md border px-3 py-2 text-xs ${
							alertActionFeedback.kind === 'success'
								? 'border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-300'
								: 'border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300'
						}`}
						data-testid="intelligence-alerts-action-feedback"
					>
						{alertActionFeedback.message}
					</div>
				{/if}

				{#if alertViewState === 'loading'}
					<CaseLoadingState
						label="Loading intelligence alerts..."
						testId="intelligence-alerts-loading"
					/>
				{:else if alertViewState === 'error'}
					<div data-testid="intelligence-alerts-error">
						<CaseErrorState
							title="Unable to load intelligence alerts"
							message={alertsLoadError}
							onRetry={retryLoadAlerts}
						/>
					</div>
				{:else if alertViewState === 'empty'}
					<CaseEmptyState
						title="No intelligence alerts for this case."
						testId="intelligence-alerts-empty"
					/>
				{:else}
					<ul class="flex flex-col divide-y divide-gray-100 dark:divide-gray-800" data-testid="intelligence-alerts-list">
						{#each alerts as alert (alert.id)}
							{@const isSubmittingThisAlert = isAckSubmitting && selectedAlertId === alert.id}
							<li
								class="py-3 flex flex-col gap-1.5 {isSubmittingThisAlert ? 'opacity-70' : ''}"
								aria-busy={isSubmittingThisAlert ? 'true' : undefined}
								data-testid="intelligence-alert-{alert.id}"
							>

								<!-- Summary (backend text — verbatim) -->
								<p class="text-sm text-gray-800 dark:text-gray-100" data-testid="intelligence-alert-summary">
									{alert.summary}
								</p>

								<!-- Entity + case reference row -->
								<div class="flex flex-wrap items-center gap-2">
									<!-- Entity badge -->
									<span
										class="text-[11px] font-medium px-1.5 py-0.5 rounded
										       bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300"
										title="Matched entity"
									>
										{alert.match.entity_kind === 'PHONE' ? 'Phone' : 'Address'}:
										{alert.match.display}
									</span>

									<!-- Source case reference -->
									{#if alert.source_case?.case_number}
										<a
											href="/case/{alert.source_case.id}/timeline"
											class="text-[11px] text-blue-600 dark:text-blue-400 hover:underline {isSubmittingThisAlert ? 'pointer-events-none opacity-60' : ''}"
											title="Source case: {alert.source_case.title || alert.source_case.case_number}"
											tabindex={isSubmittingThisAlert ? -1 : undefined}
											aria-disabled={isSubmittingThisAlert ? 'true' : undefined}
										>
											{alert.source_case.case_number}
										</a>
									{/if}

									<span class="text-[11px] text-gray-400 dark:text-gray-500">↔</span>

									<!-- Target case reference -->
									{#if alert.target_case?.case_number}
										<a
											href="/case/{alert.target_case.id}/timeline"
											class="text-[11px] text-blue-600 dark:text-blue-400 hover:underline {isSubmittingThisAlert ? 'pointer-events-none opacity-60' : ''}"
											title="Target case: {alert.target_case.title || alert.target_case.case_number}"
											tabindex={isSubmittingThisAlert ? -1 : undefined}
											aria-disabled={isSubmittingThisAlert ? 'true' : undefined}
										>
											{alert.target_case.case_number}
										</a>
									{/if}

									<span class="text-[11px] text-gray-400 dark:text-gray-500 font-mono">
										{new Date(alert.created_at).toLocaleDateString()}
									</span>
								</div>

								<!-- Citations: compact excerpts from explanation_json -->
								{#if alert.explanation_json?.target?.citations?.length > 0}
									<div class="mt-0.5 pl-2 border-l-2 border-gray-200 dark:border-gray-700 flex flex-col gap-1">
										{#each alert.explanation_json.target.citations.slice(0, 2) as citation}
											<p
												class="text-[11px] text-gray-500 dark:text-gray-400 italic leading-snug"
												data-testid="intelligence-alert-excerpt"
											>
												"{citation.excerpt}"
												<span class="not-italic text-gray-400 dark:text-gray-500 ml-1">
													— {citation.case_number}, {citation.source_kind === 'timeline_entry' ? 'timeline' : 'file'}
												</span>
											</p>
										{/each}
									</div>
								{/if}

								<!-- Acknowledge action -->
								<div class="flex items-center gap-3 mt-0.5">
									<button
										type="button"
										class="text-xs text-gray-400 dark:text-gray-500
										       hover:text-gray-700 dark:hover:text-gray-200
										       px-1.5 py-0.5 rounded
										       hover:bg-gray-100 dark:hover:bg-gray-800
										       disabled:opacity-40 transition"
										disabled={isAckSubmitting || showAckConfirm}
										on:click|stopPropagation={() => handleAck(alert.id)}
										title="Mark this alert as reviewed. This does not confirm or dismiss any investigative finding."
										data-alert-ack-id={alert.id}
										data-testid="intelligence-alert-ack-{alert.id}"
									>
										{isSubmittingThisAlert ? 'Acknowledging…' : 'Acknowledge'}
									</button>
									<span class="text-[10px] text-gray-400 dark:text-gray-500">
										Marking acknowledged does not confirm a connection.
									</span>
								</div>
							</li>
						{/each}
					</ul>
				{/if}
			</div>

			<div class="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 space-y-3">
				<div class="flex flex-wrap items-end gap-2">
					<div>
						<label class="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Scope</label>
						<select
							class="px-2 py-1.5 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm"
							bind:value={selectedScope}
						>
							{#each allowedScopes as item}
								<option value={item.id}>{item.label}</option>
							{/each}
						</select>
					</div>
					<div class="flex-1 min-w-[240px]">
						<label class="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Ask / Search</label>
						<input
							type="text"
							class="w-full px-3 py-1.5 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm"
							bind:value={query}
							placeholder="Ask an intelligence question or search term"
							on:keydown={(e) => {
								if (e.key === 'Enter') {
									e.preventDefault();
									runIntelligenceQuery();
								}
							}}
						/>
					</div>
					<button
						type="button"
						class="px-3 py-1.5 rounded bg-blue-600 text-white text-sm hover:bg-blue-700 disabled:opacity-60"
						on:click={runIntelligenceQuery}
						disabled={loading}
					>
						{loading ? 'Running…' : 'Run Intelligence'}
					</button>
				</div>
				<p class="text-[11px] text-gray-500 dark:text-gray-400">{currentScopeDescription}</p>
				{#if selectedScope === 'THIS_CASE'}
					<p class="text-[11px] text-gray-500 dark:text-gray-400">
						This Case scope is case-limited. Cross-case analysis is shown only in CID, SIU, or All scope.
					</p>
				{/if}
				{#if loading}
					<p class="text-[11px] text-gray-500 dark:text-gray-400">
						Running query "{lastExecutedQuery || query.trim()}" in {selectedScopeLabel} scope...
					</p>
				{/if}
				{#if intelScopeApplied && !loading && selectedScope !== 'THIS_CASE' && lastExecutedScope === selectedScope}
					<p class="text-[11px] text-gray-500 dark:text-gray-400">
						Applied scope: {intelScopeApplied}
					</p>
				{/if}
				{#if ranSearch && !loading && lastExecutedScope !== null && lastExecutedScope !== selectedScope}
					<p class="text-[11px] text-amber-700 dark:text-amber-300">
						Scope changed. Run Intelligence to refresh results for {selectedScopeLabel}.
					</p>
				{/if}
				{#if askCrossIntegrityRefusal}
					<div
						class="rounded border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/40 p-3 text-sm text-amber-950 dark:text-amber-50"
						data-ask-integrity-refusal=""
						role="alert"
					>
						<p class="text-xs font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-200">
							Integrity refusal
						</p>
						<p class="mt-2 whitespace-pre-wrap">{askCrossIntegrityRefusal}</p>
					</div>
				{/if}
				{#if error}
					<p class="text-xs text-red-600 dark:text-red-400">{error}</p>
				{/if}
			</div>

			<div class="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 space-y-3">
				<div>
					<h2 class="text-sm font-semibold text-gray-900 dark:text-gray-100">Structured Queries</h2>
					<p class="text-[11px] text-gray-500 dark:text-gray-400">
						Current case only. Explicit investigator queries using existing backend endpoints.
					</p>
				</div>
				<div class="flex flex-wrap items-end gap-2">
					<div>
						<label class="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Query</label>
						<select
							class="px-2 py-1.5 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm"
							bind:value={structuredActionId}
						>
							{#each STRUCTURED_QUERY_ACTIONS as action}
								<option value={action.id}>{action.label}</option>
							{/each}
						</select>
					</div>
					<div class="flex-1 min-w-[240px]">
						<label class="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">
							{structuredAction.inputLabel ?? 'Input'}
						</label>
						<input
							type="text"
							class="w-full px-3 py-1.5 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm disabled:opacity-60"
							bind:value={structuredInput}
							placeholder={structuredAction.inputPlaceholder ?? 'No input required'}
							disabled={!structuredAction.requiresInput}
							on:keydown={(e) => {
								if (e.key === 'Enter') {
									e.preventDefault();
									runStructuredQuery();
								}
							}}
						/>
					</div>
					<button
						type="button"
						class="px-3 py-1.5 rounded bg-blue-600 text-white text-sm hover:bg-blue-700 disabled:opacity-60"
						on:click={runStructuredQuery}
						disabled={structuredLoading}
					>
						{structuredLoading ? 'Running…' : 'Run Query'}
					</button>
				</div>
				<p class="text-[11px] text-gray-500 dark:text-gray-400">
					Use the value you expect to find in timeline or file text. Runs an explicit structured query and does not infer missing details.
				</p>
				{#if structuredError}
					<p class="text-xs text-red-600 dark:text-red-400">{structuredError}</p>
				{/if}
				{#if structuredRan && !structuredLoading}
					<p class="text-[11px] text-gray-500 dark:text-gray-400">Ran: {structuredQueryLabel}</p>
					{#if structuredEntityFocusHref}
						<p class="text-[11px] text-gray-500 dark:text-gray-400">
							<a class="text-blue-700 dark:text-blue-400 hover:underline" href={structuredEntityFocusHref}>
								Open Entity Focus for this query value
							</a>
						</p>
					{/if}
					{#if structuredResults.length === 0}
						<p class="text-sm text-gray-500 dark:text-gray-400">No results found for this query.</p>
					{:else}
						<ul class="space-y-2">
							{#each structuredResults as row (row.type + ':' + row.id)}
								<li class="rounded border border-gray-200 dark:border-gray-800 p-2 text-xs">
									<div class="flex items-center gap-2">
										<span class={`inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium ${sourceBadgeClass(row.type)}`}>
											{row.type === 'file' ? 'File' : 'Timeline'}
										</span>
										<span class="text-[11px] text-gray-500 dark:text-gray-400">{row.id}</span>
										{#if row.timestamp}
											<span class="ml-auto text-[11px] text-gray-500 dark:text-gray-400">{row.timestamp}</span>
										{/if}
									</div>
									<p class="mt-1 text-gray-600 dark:text-gray-400">{row.excerpt}</p>
									<p class="mt-1">
										<a class="text-blue-700 dark:text-blue-400 hover:underline" href={row.sourcePath}>Open source</a>
									</p>
								</li>
							{/each}
						</ul>
					{/if}
				{/if}
			</div>

			{#if allSectionsEmpty}
				<div class="rounded-xl border border-dashed border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 p-4">
					<p class="text-sm text-gray-600 dark:text-gray-300">No intelligence results found for this query.</p>
					<p class="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
						Try a broader term or change scope.
					</p>
				</div>
			{/if}

			<div class="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 space-y-2">
				<h2 class="text-sm font-semibold text-gray-900 dark:text-gray-100">Cross-case analysis</h2>
				{#if loading}
					<p class="text-sm text-gray-500 dark:text-gray-400">Loading intelligence results...</p>
				{:else if !ranSearch}
					<p class="text-sm text-gray-500 dark:text-gray-400">Run a query to load intelligence results.</p>
				{:else if selectedScope === 'THIS_CASE'}
					<p class="text-sm text-gray-500 dark:text-gray-400">
						Cross-case analysis is available for CID, SIU, or All scope.
					</p>
				{:else}
					{#if groundedAnswer}
						<div class="space-y-3">
							<CaseEngineAskIntegrityBanner integrityPresentation={askIntegrityPresentation} />
							<div class="text-sm text-gray-700 dark:text-gray-200 whitespace-pre-wrap">{groundedAnswer}</div>
							<CaseEngineAskStructuredSections facts={askFacts} inferences={askInferences} />
						</div>
						{#if evidenceItems.length === 0}
							<p class="text-[11px] text-gray-500 dark:text-gray-400">
								No supporting evidence rows were returned for this analysis text.
							</p>
						{/if}
					{:else if !allSectionsEmpty}
						<p class="text-sm text-gray-500 dark:text-gray-400">
							No analysis text was returned.
							{#if evidenceItems.length > 0}
								Review supporting evidence below.
							{/if}
						</p>
					{/if}
				{/if}
			</div>

			<div class="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 space-y-2">
				<h2 class="text-sm font-semibold text-gray-900 dark:text-gray-100">Supporting evidence</h2>
				<p class="text-[11px] text-gray-500 dark:text-gray-400">
					These backend evidence matches support the analysis; they are not the analysis itself.
				</p>
				{#if loading}
					<p class="text-sm text-gray-500 dark:text-gray-400">Loading supporting evidence...</p>
				{:else if !ranSearch}
					<p class="text-sm text-gray-500 dark:text-gray-400">Run a query to load supporting evidence.</p>
				{:else if evidenceCaseGroups.length === 0 && !allSectionsEmpty}
					<p class="text-sm text-gray-500 dark:text-gray-400">
						No supporting evidence found for this query.
						{#if groundedAnswer}
							The analysis text above was returned without evidence rows.
						{/if}
					</p>
				{:else}
					<div class="space-y-3">
						{#each evidenceCaseGroups as caseGroup}
							<div class="rounded border border-gray-200 dark:border-gray-800 p-3 space-y-2">
								<div class="flex flex-wrap items-center gap-2">
									<span class="font-medium text-sm text-gray-900 dark:text-gray-100">
										{caseGroup.caseNumber}
									</span>
									{#if caseGroup.caseTitle}
										<span class="text-xs text-gray-500 dark:text-gray-400">{caseGroup.caseTitle}</span>
									{/if}
									{#if caseGroup.unit}
										<span class="text-[11px] text-gray-500 dark:text-gray-400">({caseGroup.unit})</span>
									{/if}
									<span class="ml-auto text-[11px] text-gray-500 dark:text-gray-400">
										{caseGroup.matchCount} match(es)
									</span>
								</div>

								{#each caseGroup.typeGroups as typeGroup}
									<div class="space-y-1">
										<div class="flex items-center gap-2">
											<span class="text-[11px] font-medium text-gray-600 dark:text-gray-300">{typeGroup.label}</span>
											<span class="text-[11px] text-gray-500 dark:text-gray-400">{typeGroup.items.length}</span>
										</div>
										<ul class="space-y-1">
											{#each typeGroup.items.slice(0, 8) as item}
												<li class="rounded border border-gray-100 dark:border-gray-800 p-2 text-xs">
													<div class="flex items-center gap-2">
														<span class={`inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium ${sourceBadgeClass(item.sourceType)}`}>
															{item.label}
														</span>
														<span class="text-[11px] text-gray-500 dark:text-gray-400">{item.id}</span>
														{#if item.timestamp}
															<span class="ml-auto text-[11px] text-gray-500 dark:text-gray-400">{item.timestamp}</span>
														{/if}
													</div>
													<p class="mt-1 text-gray-600 dark:text-gray-400">{item.excerpt}</p>
													{#if item.sourceType === 'entity'}
														{@const href = entityFocusHref(item)}
														{#if href}
															<p class="mt-1">
																<a class="text-blue-700 dark:text-blue-400 hover:underline" href={href}>
																	Open Entity Focus
																</a>
															</p>
														{/if}
													{/if}
												</li>
											{/each}
										</ul>
									</div>
								{/each}
							</div>
						{/each}
					</div>
				{/if}
			</div>

			{#if selectedScope !== 'THIS_CASE'}
				<div class="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 space-y-2">
					<h2 class="text-sm font-semibold text-gray-900 dark:text-gray-100">Cases matching this query</h2>
					<p class="text-[11px] text-gray-500 dark:text-gray-400">
						Listed from backend evidence matches. This is not a confirmed relationship model.
					</p>
					{#if ranSearch && !loading && matchedCaseSummaries.length === 0 && !allSectionsEmpty}
						<p class="text-sm text-gray-500 dark:text-gray-400">No cases matched this query.</p>
					{:else}
						<ul class="space-y-2">
							{#each matchedCaseSummaries.slice(0, 8) as rc}
								<li class="rounded border border-gray-200 dark:border-gray-800 p-2 text-xs">
									<div class="flex flex-wrap items-center gap-2">
										<a
											class="font-medium text-blue-700 dark:text-blue-400 hover:underline"
											href={`/case/${rc.caseId}/chat`}
										>
											{rc.caseNumber}
										</a>
										<span class="text-gray-500 dark:text-gray-400">{rc.title}</span>
										<span class="text-gray-400 dark:text-gray-500">({rc.unit})</span>
										<span class="ml-auto text-gray-500 dark:text-gray-400">{rc.matchCount} match(es)</span>
									</div>
								</li>
							{/each}
						</ul>
					{/if}
				</div>
				<div class="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 space-y-2">
					<h2 class="text-sm font-semibold text-gray-900 dark:text-gray-100">Entity Intelligence</h2>
					{#if ranSearch && !loading && entityTypeGroups.length === 0 && !allSectionsEmpty}
						<p class="text-sm text-gray-500 dark:text-gray-400">No entity intelligence available for this query.</p>
						<p class="text-[11px] text-gray-500 dark:text-gray-400">
							Entity intelligence appears when identifiable entities are returned by backend intelligence results.
						</p>
						{#if matchedCaseSummaries.length > 0}
							<p class="text-[11px] text-gray-500 dark:text-gray-400">
								Cases matching this query can exist even when no entity-type rows are returned.
							</p>
						{/if}
					{:else}
						<div class="space-y-3">
							{#each entityTypeGroups as entityGroup}
								<div class="rounded border border-gray-200 dark:border-gray-800 p-2">
									<p class="text-xs font-medium text-gray-700 dark:text-gray-300">
										{entityGroup.type} ({entityGroup.items.length})
									</p>
									<ul class="mt-1 space-y-1">
										{#each entityGroup.items.slice(0, 8) as item}
											<li class="text-xs text-gray-600 dark:text-gray-400">
												• {item.caseNumber} {#if item.unit}({item.unit}){/if}:
												{#if entityFocusHref(item)}
													<a
														class="text-blue-700 dark:text-blue-400 hover:underline"
														href={entityFocusHref(item) ?? '#'}
													>
														{item.entityValue || item.entityNormalized || 'Entity'}
													</a>
													- {item.excerpt}
												{:else}
													{item.excerpt}
												{/if}
											</li>
										{/each}
									</ul>
								</div>
							{/each}
						</div>
					{/if}
				</div>
			{/if}

			<div class="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 space-y-2">
				<h2 class="text-sm font-semibold text-gray-900 dark:text-gray-100">Citations / Evidence</h2>
				{#if ranSearch && !loading && uniqueAskCitations.length === 0 && uniqueIntelCitations.length === 0 && !allSectionsEmpty}
					<p class="text-sm text-gray-500 dark:text-gray-400">No citations returned for this query.</p>
				{:else}
					{#if uniqueAskCitations.length > 0}
						<p class="text-xs font-medium text-gray-700 dark:text-gray-300">Cross-case ask citations</p>
						<ul class="space-y-1 text-xs text-gray-600 dark:text-gray-400">
							{#each uniqueAskCitations as c}
								<li>
									• {c.case_number} — {c.source_type} — {c.id}
								</li>
							{/each}
						</ul>
					{/if}
					{#if uniqueIntelCitations.length > 0}
						<p class="text-xs font-medium text-gray-700 dark:text-gray-300">Intelligence search citations</p>
						<ul class="space-y-1 text-xs text-gray-600 dark:text-gray-400">
							{#each uniqueIntelCitations as c}
								<li>
									• {c.label} — {c.source_kind} — {c.source_id}
								</li>
							{/each}
						</ul>
					{/if}
				{/if}
			</div>
		{/if}
	</div>
</div>

<!-- P29-01: ACK confirm dialog — prevents accidental state mutation -->
<ConfirmDialog
	bind:show={showAckConfirm}
	title="Mark this alert as reviewed?"
	message="This will acknowledge the alert and remove it from the open alerts view for this case. This action is audited."
	cancelLabel="Keep open"
	confirmLabel="Acknowledge"
	on:cancel={handleAckDialogCancel}
	onConfirm={executeAck}
/>
