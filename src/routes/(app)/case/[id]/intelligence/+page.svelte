<script lang="ts">
	/** P71-09 — Tier L shell / secondary nav demotion (P70-05 §3.2, P70-06); presentation only. */
	import { onMount, tick } from 'svelte';
	import { get } from 'svelte/store';
	import { afterNavigate, goto } from '$app/navigation';
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
		type CaseIntelligenceCommittedEntity,
		type CaseIntelligenceEntityKind,
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
	import {
		buildEntityFocusHref,
		entityEvidenceFocusControlLabel,
		looksLikePhoneDigitsQuery
	} from '$lib/utils/entityFocus';
	import CaseEmptyState from '$lib/components/case/CaseEmptyState.svelte';
	import EntitiesFocusModeShell from '$lib/components/case/EntitiesFocusModeShell.svelte';
	import EntitiesOverviewBoardShell from '$lib/components/case/EntitiesOverviewBoardShell.svelte';
	import CaseIntelligenceEntityCreateModal from '$lib/components/case/CaseIntelligenceEntityCreateModal.svelte';
	import CaseIntelligenceEntityDetailModal from '$lib/components/case/CaseIntelligenceEntityDetailModal.svelte';
	import CaseErrorState from '$lib/components/case/CaseErrorState.svelte';
	import CaseLoadingState from '$lib/components/case/CaseLoadingState.svelte';
	import CaseWorkspaceContentRegion from '$lib/components/case/CaseWorkspaceContentRegion.svelte';
	import ConfirmDialog from '$lib/components/common/ConfirmDialog.svelte';
	import type { EntitiesBoardSnapshot } from '$lib/utils/entitiesBoardTypes';
	import { toast } from 'svelte-sonner';
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
	import { INTELLIGENCE_UNSUPPORTED_COPY } from '$lib/utils/intelligenceUnsupportedCopy';
	import {
		CASE_DESTINATION_HINTS,
		CASE_DESTINATION_LABELS,
		CASE_DESTINATION_TITLES
	} from '$lib/utils/caseDestinationLabels';
	import {
		DS_INTELLIGENCE_CLASSES,
		DS_TYPE_CLASSES,
		DS_BTN_CLASSES,
		DS_BADGE_CLASSES,
		DS_STATUS_SURFACE_CLASSES,
		DS_STATUS_TEXT_CLASSES,
		DS_STACK_CLASSES,
		DS_TIMELINE_CLASSES
	} from '$lib/case/detectivePrimitiveFoundation';

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

	/** P67-04: primary workspace mode — Entities default per IA spec */
	type CaseIntelligenceWorkspaceMode = 'entities' | 'intelligence';
	let workspaceMode: CaseIntelligenceWorkspaceMode = 'entities';

	/** P78-15 — `/case/:id/intelligence` only (not entity focus sub-routes). */
	function isCaseIntelligenceWorkspacePath(pathname: string): boolean {
		return /\/case\/[^/]+\/intelligence$/.test(pathname);
	}

	function setWorkspaceMode(next: CaseIntelligenceWorkspaceMode): void {
		workspaceMode = next;
		const p = get(page);
		const id = p.params.id;
		if (id && isCaseIntelligenceWorkspacePath(p.url.pathname)) {
			void goto(`/case/${id}/intelligence?mode=${next}`, {
				replaceState: true,
				noScroll: true,
				keepFocus: true
			});
		}
	}

	afterNavigate(() => {
		const p = get(page);
		if (!isCaseIntelligenceWorkspacePath(p.url.pathname)) return;
		const m = p.url.searchParams.get('mode');
		if (m === 'intelligence' || m === 'entities') {
			workspaceMode = m;
		}
	});
	/** P67-05 / P67-06 prep: committed entity row selection (detail modal in P67-06) */
	let selectedRegistryEntityId: string | null = null;
	let entityDetailOpen = false;
	let entityDetailSeed: CaseIntelligenceCommittedEntity | null = null;

	/** P68-05 — direct committed create modal (POST …/intelligence/entities) */
	let createModalOpen = false;
	let createModalKind: CaseIntelligenceEntityKind = 'PERSON';
	let entityRegistryRefreshNonce = 0;
	/** P69-08 — board vs focus (Pattern X: cross-type only via back-to-board). */
	type EntitiesWorkspaceFocusMode = 'board' | 'focus';
	let entitiesFocusMode: EntitiesWorkspaceFocusMode = 'board';
	let entitiesBoardSnapshot: EntitiesBoardSnapshot | null = null;
	let entitiesBoardShell: EntitiesOverviewBoardShell | null = null;
	let entitiesFocusSeed: CaseIntelligenceCommittedEntity | null = null;
	let directCreateSuccessMessage: string | null = null;
	let directCreateSuccessClearHandle: ReturnType<typeof setTimeout> | null = null;

	function clearDirectCreateSuccessTimer(): void {
		if (directCreateSuccessClearHandle !== null) {
			clearTimeout(directCreateSuccessClearHandle);
			directCreateSuccessClearHandle = null;
		}
	}

	function flashDirectCreateSuccess(message: string): void {
		directCreateSuccessMessage = message;
		clearDirectCreateSuccessTimer();
		directCreateSuccessClearHandle = setTimeout(() => {
			directCreateSuccessMessage = null;
			directCreateSuccessClearHandle = null;
		}, 5000);
	}

	function handleIntelCreateRequest(detail: { entityKind: CaseIntelligenceEntityKind }): void {
		createModalKind = detail.entityKind;
		createModalOpen = true;
	}

	function requestEntityFocus(detail: { entity: CaseIntelligenceCommittedEntity }): void {
		const k = detail.entity.entity_kind;
		if (k !== 'PERSON' && k !== 'VEHICLE' && k !== 'LOCATION') {
			toast.error('Focus mode is not available for this registry until the capability ships (P69-10).');
			return;
		}
		if (!entitiesBoardShell) return;
		entitiesBoardSnapshot = entitiesBoardShell.getBoardSnapshot();
		entitiesFocusSeed = detail.entity;
		entitiesFocusMode = 'focus';
	}

	async function exitEntityFocus(): Promise<void> {
		entitiesFocusMode = 'board';
		const snap = entitiesBoardSnapshot;
		entitiesBoardSnapshot = null;
		entitiesFocusSeed = null;
		await tick();
		if (entitiesBoardShell && snap) {
			await entitiesBoardShell.applyBoardSnapshot(snap);
		}
	}

	function handleIntelCreateModalClose(): void {
		createModalOpen = false;
	}

	function registryRowTestIdPrefix(kind: CaseIntelligenceEntityKind): string {
		switch (kind) {
			case 'PERSON':
				return 'entities-registry-people';
			case 'VEHICLE':
				return 'entities-registry-vehicles';
			case 'LOCATION':
				return 'entities-registry-locations';
		}
	}

	async function scrollCreatedEntityRowIntoView(ent: CaseIntelligenceCommittedEntity): Promise<void> {
		await tick();
		const rowTestId = `${registryRowTestIdPrefix(ent.entity_kind)}-row-${ent.id}`;
		document.querySelector<HTMLElement>(`[data-testid="${rowTestId}"]`)?.scrollIntoView({
			block: 'nearest',
			behavior: 'smooth'
		});
	}

	function handleIntelDirectEntityCreated(e: CustomEvent<{ entity: CaseIntelligenceCommittedEntity }>): void {
		const ent = e.detail.entity;
		entityRegistryRefreshNonce += 1;
		const kindMsg =
			ent.entity_kind === 'PERSON'
				? 'Person registered.'
				: ent.entity_kind === 'VEHICLE'
					? 'Vehicle registered.'
					: 'Location registered.';
		flashDirectCreateSuccess(
			`${kindMsg} Detail opened — the new row is highlighted in the registry above.`
		);
		selectedRegistryEntityId = ent.id;
		entityDetailSeed = ent;
		entityDetailOpen = true;
		void scrollCreatedEntityRowIntoView(ent);
	}

	$: caseId = $page.params.id;

	// P28-41/P28-42: Reset all case-scoped state when the active case changes.
	// prevLoadedCaseId is seeded at declaration time → no-op on first render
	// (onMount handles initial alert load). Fires only on case switch.
	// User preferences (query text, selectedScope, structuredActionId, structuredInput)
	// are intentionally preserved across case switches.
	$: if (caseId && $caseEngineToken && caseId !== prevLoadedCaseId) {
		prevLoadedCaseId = caseId;
		workspaceMode = 'entities';
		selectedRegistryEntityId = null;
		entityDetailOpen = false;
		entityDetailSeed = null;
		createModalOpen = false;
		entityRegistryRefreshNonce = 0;
		clearDirectCreateSuccessTimer();
		directCreateSuccessMessage = null;
		entitiesFocusMode = 'board';
		entitiesBoardSnapshot = null;
		entitiesFocusSeed = null;

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

	function sourceBadgeClasses(type: string): string {
		const { base, neutral, info, warning, success } = DS_BADGE_CLASSES;
		if (type === 'timeline') return `${base} ${info}`;
		if (type === 'file') return `${base} ${warning}`;
		if (type === 'entity') return `${base} ${success}`;
		return `${base} ${neutral}`;
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

<!-- P71-09 — Tier L shell; secondary mode segmented control demoted vs primary case tabs (P70-05 §3.2). -->
<CaseWorkspaceContentRegion testId="case-intelligence-page">
<div class="ce-l-intelligence-shell">
	<div class="ce-l-intelligence-primary-scroll" data-testid="case-intelligence-primary-scroll">
		<div class="{DS_INTELLIGENCE_CLASSES.primaryInner}">
		<div class="ce-l-intelligence-intro">
			<p class={DS_INTELLIGENCE_CLASSES.identityEyebrow}>Investigation · entity context</p>
			<h1 class="ce-l-intelligence-intro-title {DS_TYPE_CLASSES.display}">Entity Intelligence</h1>
			<p class="ce-l-intelligence-intro-body leading-relaxed">
				<strong>Entities</strong> starts with <strong>committed registries</strong> (browse; <strong>Register</strong> with each
				<strong>Add …</strong>). <strong>Stage&nbsp;1</strong> is for <strong>staging</strong> (intake / propose → promote), not
				the default manual register path. <strong>Stage&nbsp;2</strong> covers association edges. Case Engine holds authority.
				<strong>Intelligence</strong> mode adds alerts, Ask/search, and lookups (support only). <strong>P19</strong> stays on the
				Proposals tab. Model text never replaces committed records.
			</p>
		</div>

		{#if !$caseEngineToken}
			<div class="ce-l-intelligence-intro">
				<p class={DS_INTELLIGENCE_CLASSES.noAuthNote}>
					Case Engine authentication is required to load intelligence data.
				</p>
			</div>
		{:else}
			<div
				class="ce-l-intelligence-segmented"
				role="tablist"
				aria-label="Case Intelligence workspace: Entities or Intelligence mode"
			>
				<button
					type="button"
					role="tab"
					aria-selected={workspaceMode === 'entities'}
					class="{DS_INTELLIGENCE_CLASSES.workspaceTab} {workspaceMode === 'entities'
						? DS_INTELLIGENCE_CLASSES.workspaceTabActive
						: DS_INTELLIGENCE_CLASSES.workspaceTabInactive}"
					data-testid="intelligence-workspace-mode-entities"
					title="Registries first (Register via Add); Stage 1 staging; Stage 2 associations — Case Engine"
					on:click={() => setWorkspaceMode('entities')}
				>
					Entities
				</button>
				<button
					type="button"
					role="tab"
					aria-selected={workspaceMode === 'intelligence'}
					class="{DS_INTELLIGENCE_CLASSES.workspaceTab} {workspaceMode === 'intelligence'
						? DS_INTELLIGENCE_CLASSES.workspaceTabActive
						: DS_INTELLIGENCE_CLASSES.workspaceTabInactive}"
					data-testid="intelligence-workspace-mode-intelligence"
					title="Cross-case alerts, Ask/search, structured queries, analysis readouts — not a substitute for committed records"
					on:click={() => setWorkspaceMode('intelligence')}
				>
					Intelligence
				</button>
			</div>

			{#if workspaceMode === 'entities'}
				<div class="space-y-4 -mx-2 md:-mx-4" data-testid="intelligence-workspace-entities-panel">
					{#if directCreateSuccessMessage}
						<div
							class="rounded-md px-3 py-2 text-sm {DS_STATUS_SURFACE_CLASSES.success}"
							data-testid="intelligence-direct-create-success"
							role="status"
						>
							<p class="ds-status-copy">{directCreateSuccessMessage}</p>
						</div>
					{/if}
					<div class="{DS_INTELLIGENCE_CLASSES.entitiesRibbon} {DS_STACK_CLASSES.tight}" data-testid="intelligence-entities-workflow-path">
						<p class="{DS_TYPE_CLASSES.label} text-[var(--ds-text-primary)]">Entities overview board</p>
						<p class="{DS_TYPE_CLASSES.meta} leading-relaxed">
							Four registries (phone column is placeholder until P69-10 — use Intelligence mode search for phone evidence focus). <strong class="text-[var(--ds-text-primary)]">Register</strong> via panel Add or
							toolbar — Case Engine commit. Staging: expand <strong class="text-[var(--ds-text-primary)]">Intake / staging</strong>.
							<strong class="text-[var(--ds-text-primary)]">P19</strong> remains on <a
								class={DS_INTELLIGENCE_CLASSES.inlineLink}
								href="/case/{caseId}/proposals"
								title={CASE_DESTINATION_TITLES.caseProposals}
								>{CASE_DESTINATION_LABELS.caseProposals}</a
							>.
						</p>
					</div>

					<div
						class={entitiesFocusMode === 'focus' ? 'hidden' : ''}
						inert={entitiesFocusMode === 'focus'}
						aria-hidden={entitiesFocusMode === 'focus' ? 'true' : 'false'}
						data-testid="intelligence-entities-board-slot"
					>
						<EntitiesOverviewBoardShell
							bind:this={entitiesBoardShell}
							caseId={caseId ?? ''}
							token={$caseEngineToken ?? ''}
							caseTitle={$activeCaseMeta?.title ?? ''}
							caseNumber={$activeCaseMeta?.case_number ?? ''}
							refreshNonce={entityRegistryRefreshNonce}
							selectedEntityId={selectedRegistryEntityId}
							onFocusRequested={requestEntityFocus}
							onRegistryRowActivate={(d) => {
								if (entitiesFocusMode !== 'board') return;
								selectedRegistryEntityId = d.entity.id;
								entityDetailSeed = d.entity;
								entityDetailOpen = true;
							}}
							onAddRequest={handleIntelCreateRequest}
						/>
					</div>
					{#if entitiesFocusMode === 'focus' && entitiesFocusSeed && entitiesBoardSnapshot}
						<EntitiesFocusModeShell
							caseId={caseId ?? ''}
							token={$caseEngineToken ?? ''}
							focusedEntity={entitiesFocusSeed}
							caseTitle={$activeCaseMeta?.title ?? ''}
							caseNumber={$activeCaseMeta?.case_number ?? ''}
							refreshNonce={entityRegistryRefreshNonce}
							seedPanelState={entitiesBoardSnapshot.panels?.[entitiesFocusSeed.entity_kind]}
							onBack={() => void exitEntityFocus()}
							onAddRequest={handleIntelCreateRequest}
							onOpenAssociationComposer={(ent) => {
								entityDetailSeed = ent;
								selectedRegistryEntityId = ent.id;
								entityDetailOpen = true;
							}}
						/>
					{/if}
					<span data-testid="entities-focus-mode" class="sr-only">{entitiesFocusMode}</span>
				</div>
			{:else}
				<div class="{DS_INTELLIGENCE_CLASSES.panelSectionStack}" data-testid="intelligence-workspace-intelligence-panel">
				<div class="{DS_INTELLIGENCE_CLASSES.modeBanner} {DS_STACK_CLASSES.tight}" data-testid="intelligence-ws-framing">
					<h2 class="{DS_TYPE_CLASSES.panel}">
						Intelligence mode — analysis &amp; non-authoritative support
					</h2>
					<p class="{DS_TYPE_CLASSES.meta} leading-relaxed">
						<strong class="font-semibold text-[var(--ds-text-primary)]">Entities</strong> — registries first, then Stage&nbsp;1 staging and
						Stage&nbsp;2 edges (Case Engine authority). This <strong class="font-semibold text-[var(--ds-text-primary)]">Intelligence</strong>
						mode is for signals, Ask/search, and lookups. Treat outputs as support until they appear in committed registries,
						governed proposals, or associations as appropriate.
					</p>
					<p class="{DS_TYPE_CLASSES.meta} leading-relaxed">
						<strong class="font-semibold">Governed timeline / notebook changes</strong> (P19) belong on the
						<a
							class={DS_INTELLIGENCE_CLASSES.inlineLink}
							href="/case/{caseId}/proposals"
							title={CASE_DESTINATION_TITLES.caseProposals}
							>{CASE_DESTINATION_LABELS.caseProposals}</a
						>
						tab — review and commit there; do not treat analysis text or search hits as automatic case records.
					</p>
				</div>

				<div class={DS_STACK_CLASSES.stack} data-testid="intelligence-ws-signals">
				<div class="{DS_INTELLIGENCE_CLASSES.sectionIntro} {DS_STACK_CLASSES.tight}">
					<h2 class={DS_TYPE_CLASSES.label}>
						Signals &amp; cross-case alerts
					</h2>
					<p class="{DS_TYPE_CLASSES.meta} leading-relaxed">
						Cross-case overlap hints — triage with excerpts; they are not committed entity or association facts. For case
						intel truth, open <strong class="font-semibold">Entities</strong> (registries first).
					</p>
				</div>

				<!-- ── Cross-case entity alerts (P28-40) ──────────────────────────── -->
				<div class="{DS_INTELLIGENCE_CLASSES.panel} {DS_STACK_CLASSES.tight}" data-testid="intelligence-alerts-section">
				<div class="flex flex-wrap items-center justify-between gap-2">
					<div>
						<h2
							bind:this={alertsHeadingEl}
							tabindex="-1"
							class="{DS_TYPE_CLASSES.panel} focus:outline-none"
						>
							Cross-case entity alerts
						</h2>
						<p class="mt-0.5 {DS_TYPE_CLASSES.meta}">
							Automated signal: text overlap detected across cases. Review supporting excerpts before drawing conclusions.
						</p>
					</div>
					{#if alertViewState === 'success'}
						<span
							class="{DS_BADGE_CLASSES.base} {DS_BADGE_CLASSES.warning} shrink-0"
							data-testid="intelligence-alerts-count"
						>
							{alerts.length} open
						</span>
					{/if}
				</div>

				{#if alertActionFeedback && alertViewState !== 'error'}
					<div
						class={`rounded-md px-3 py-2 text-xs ${
							alertActionFeedback.kind === 'success'
								? DS_STATUS_SURFACE_CLASSES.success
								: DS_STATUS_SURFACE_CLASSES.error
						}`}
						data-testid="intelligence-alerts-action-feedback"
					>
						<p class="ds-status-copy">{alertActionFeedback.message}</p>
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
					<ul class={DS_INTELLIGENCE_CLASSES.alertList} data-testid="intelligence-alerts-list">
						{#each alerts as alert (alert.id)}
							{@const isSubmittingThisAlert = isAckSubmitting && selectedAlertId === alert.id}
							<li
								class="{DS_INTELLIGENCE_CLASSES.alertItem} {isSubmittingThisAlert ? 'opacity-70' : ''}"
								aria-busy={isSubmittingThisAlert ? 'true' : undefined}
								data-testid="intelligence-alert-{alert.id}"
							>

								<!-- Summary (backend text — verbatim) -->
								<p class="{DS_TYPE_CLASSES.body}" data-testid="intelligence-alert-summary">
									{alert.summary}
								</p>

								<!-- Entity + case reference row -->
								<div class="flex flex-wrap items-center gap-2">
									<!-- Entity badge -->
									<span
										class="{DS_BADGE_CLASSES.base} {DS_BADGE_CLASSES.neutral}"
										title="Matched entity"
									>
										{alert.match.entity_kind === 'PHONE' ? 'Phone' : 'Address'}:
										{alert.match.display}
									</span>

									<!-- Source case reference -->
									{#if alert.source_case?.case_number}
										<a
											href="/case/{alert.source_case.id}/timeline"
											class="{DS_TYPE_CLASSES.meta} {DS_INTELLIGENCE_CLASSES.inlineLink} {isSubmittingThisAlert ? 'pointer-events-none opacity-60' : ''}"
											title="Source case: {alert.source_case.title || alert.source_case.case_number}"
											tabindex={isSubmittingThisAlert ? -1 : undefined}
											aria-disabled={isSubmittingThisAlert ? 'true' : undefined}
										>
											{alert.source_case.case_number}
										</a>
									{/if}

									<span class="{DS_TYPE_CLASSES.meta} text-[var(--ds-text-muted)]">↔</span>

									<!-- Target case reference -->
									{#if alert.target_case?.case_number}
										<a
											href="/case/{alert.target_case.id}/timeline"
											class="{DS_TYPE_CLASSES.meta} {DS_INTELLIGENCE_CLASSES.inlineLink} {isSubmittingThisAlert ? 'pointer-events-none opacity-60' : ''}"
											title="Target case: {alert.target_case.title || alert.target_case.case_number}"
											tabindex={isSubmittingThisAlert ? -1 : undefined}
											aria-disabled={isSubmittingThisAlert ? 'true' : undefined}
										>
											{alert.target_case.case_number}
										</a>
									{/if}

									<span class="{DS_TYPE_CLASSES.mono} text-[var(--ds-text-muted)]">
										{new Date(alert.created_at).toLocaleDateString()}
									</span>
								</div>

								<!-- Citations: compact excerpts from explanation_json -->
								{#if alert.explanation_json?.target?.citations?.length > 0}
									<div class={DS_INTELLIGENCE_CLASSES.alertExcerptRail}>
										{#each alert.explanation_json.target.citations.slice(0, 2) as citation}
											<p
												class="{DS_TYPE_CLASSES.meta} italic leading-snug text-[var(--ds-text-secondary)]"
												data-testid="intelligence-alert-excerpt"
											>
												"{citation.excerpt}"
												<span class="not-italic ml-1 text-[var(--ds-text-muted)]">
													— {citation.case_number}, {citation.source_kind === 'timeline_entry' ? 'timeline' : 'file'}
												</span>
											</p>
										{/each}
									</div>
								{/if}

								<!-- Acknowledge action -->
								<div class="mt-0.5 flex items-center gap-3">
									<button
										type="button"
										class="{DS_INTELLIGENCE_CLASSES.ackButton}"
										disabled={isAckSubmitting || showAckConfirm}
										on:click|stopPropagation={() => handleAck(alert.id)}
										title="Mark this alert as reviewed. This does not confirm or dismiss any investigative finding."
										data-alert-ack-id={alert.id}
										data-testid="intelligence-alert-ack-{alert.id}"
									>
										{isSubmittingThisAlert ? 'Acknowledging…' : 'Acknowledge'}
									</button>
									<span class="{DS_TYPE_CLASSES.meta} text-[var(--ds-text-muted)]">
										Marking acknowledged does not confirm a connection.
									</span>
								</div>
							</li>
						{/each}
					</ul>
				{/if}
			</div>
				</div>

				<div class="{DS_INTELLIGENCE_CLASSES.panelSectionStack}" data-testid="intelligence-ws-retrieval">
				<div class="{DS_INTELLIGENCE_CLASSES.sectionIntro} {DS_STACK_CLASSES.tight}">
					<h2 class={DS_TYPE_CLASSES.label}>
						Ask, search &amp; structured queries
					</h2>
					<p class="{DS_TYPE_CLASSES.meta} leading-relaxed">
						Run Ask/search and structured queries here (read-only retrieval). Results do not create timeline, notebook, or intel
						records — use <strong class="font-semibold">Proposals</strong> or <strong
							class="font-semibold">Entities</strong> when something must become official.
					</p>
				</div>

			<div class="{DS_INTELLIGENCE_CLASSES.panel} {DS_STACK_CLASSES.tight}" data-testid="intelligence-ws-ask-search">
				<div class={DS_INTELLIGENCE_CLASSES.formToolbar}>
					<div>
						<label class="mb-1 block {DS_TYPE_CLASSES.meta} font-semibold" for="intel-scope-select">Scope</label>
						<select
							id="intel-scope-select"
							class={DS_TIMELINE_CLASSES.formControl}
							bind:value={selectedScope}
						>
							{#each allowedScopes as item}
								<option value={item.id}>{item.label}</option>
							{/each}
						</select>
					</div>
					<div class="min-w-[240px] flex-1">
						<label class="mb-1 block {DS_TYPE_CLASSES.meta} font-semibold" for="intel-ask-input">Ask / Search</label>
						<input
							id="intel-ask-input"
							type="text"
							class="{DS_TIMELINE_CLASSES.formControl} w-full"
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
						class="{DS_BTN_CLASSES.primary} disabled:opacity-60"
						on:click={runIntelligenceQuery}
						disabled={loading}
					>
						{loading ? 'Running…' : 'Run Intelligence'}
					</button>
				</div>
				<p class={DS_TYPE_CLASSES.meta}>{currentScopeDescription}</p>
				{#if looksLikePhoneDigitsQuery(query.trim())}
					<p
						class="mt-2 rounded-md border border-dashed border-[var(--ds-border-subtle)] bg-[var(--ds-surface-raised)]/50 px-3 py-2 text-sm {DS_TYPE_CLASSES.meta}"
						data-testid="intelligence-ws-phone-search-hint"
						role="note"
					>
						<strong class="text-[var(--ds-text-primary)]">Phone tip:</strong> For evidence-backed phone focus in this case,
						use <strong>Structured Queries</strong> → <strong>Phone mentions</strong>, enter this number, run the query, then
						use the phone evidence focus control below — not the Entities board phone column.
					</p>
				{/if}
				{#if selectedScope === 'THIS_CASE'}
					<p class={DS_TYPE_CLASSES.meta} data-testid="intelligence-scope-this-case-ribbon">
						{INTELLIGENCE_UNSUPPORTED_COPY.thisCaseScopeRibbon}
					</p>
				{/if}
				{#if loading}
					<p class={DS_TYPE_CLASSES.meta}>
						Running query "{lastExecutedQuery || query.trim()}" in {selectedScopeLabel} scope...
					</p>
				{/if}
				{#if intelScopeApplied && !loading && selectedScope !== 'THIS_CASE' && lastExecutedScope === selectedScope}
					<p class={DS_TYPE_CLASSES.meta}>
						Applied scope: {intelScopeApplied}
					</p>
				{/if}
				{#if ranSearch && !loading && lastExecutedScope !== null && lastExecutedScope !== selectedScope}
					<p class="{DS_TYPE_CLASSES.meta} {DS_STATUS_TEXT_CLASSES.warning}">
						Scope changed. Run Intelligence to refresh results for {selectedScopeLabel}.
					</p>
				{/if}
				{#if askCrossIntegrityRefusal}
					<div
						class={DS_INTELLIGENCE_CLASSES.integrityRefusalBox}
						data-ask-integrity-refusal=""
						role="alert"
					>
						<p class="{DS_TYPE_CLASSES.meta} font-semibold uppercase tracking-wide {DS_STATUS_TEXT_CLASSES.warning}">Integrity refusal</p>
						<p class="mt-2 whitespace-pre-wrap">{askCrossIntegrityRefusal}</p>
					</div>
				{/if}
				{#if error}
					<p class="{DS_TYPE_CLASSES.meta} {DS_STATUS_TEXT_CLASSES.error}">{error}</p>
				{/if}
			</div>

			<div class="{DS_INTELLIGENCE_CLASSES.panel} {DS_STACK_CLASSES.tight}" data-testid="intelligence-ws-structured-queries">
				<div>
					<h2 class={DS_TYPE_CLASSES.panel}>Structured Queries</h2>
					<p class={DS_TYPE_CLASSES.meta}>
						Current case only. Explicit investigator queries using existing backend endpoints.
					</p>
				</div>
				<div class={DS_INTELLIGENCE_CLASSES.formToolbar}>
					<div>
						<label class="mb-1 block {DS_TYPE_CLASSES.meta} font-semibold" for="intel-structured-query">Query</label>
						<select
							id="intel-structured-query"
							class={DS_TIMELINE_CLASSES.formControl}
							bind:value={structuredActionId}
						>
							{#each STRUCTURED_QUERY_ACTIONS as action}
								<option value={action.id}>{action.label}</option>
							{/each}
						</select>
					</div>
					<div class="min-w-[240px] flex-1">
						<label class="mb-1 block {DS_TYPE_CLASSES.meta} font-semibold" for="intel-structured-input">
							{structuredAction.inputLabel ?? 'Input'}
						</label>
						<input
							id="intel-structured-input"
							type="text"
							class="{DS_TIMELINE_CLASSES.formControl} w-full disabled:opacity-60"
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
						class="{DS_BTN_CLASSES.primary} disabled:opacity-60"
						on:click={runStructuredQuery}
						disabled={structuredLoading}
					>
						{structuredLoading ? 'Running…' : 'Run Query'}
					</button>
				</div>
				<p class={DS_TYPE_CLASSES.meta}>
					Use the value you expect to find in timeline or file text. Runs an explicit structured query and does not infer missing details.
				</p>
				{#if structuredActionId === 'phone_mentions'}
					<p class="{DS_TYPE_CLASSES.meta} mt-2" data-testid="intelligence-ws-phone-structured-hint">
						<strong class="font-semibold text-[var(--ds-text-primary)]">Next step:</strong> Run the query, then use
						<strong>Phone evidence focus</strong> below — opens the evidence-backed entity focus route for this number (not the
						board registry).
					</p>
				{/if}
				{#if structuredError}
					<p class="{DS_TYPE_CLASSES.meta} {DS_STATUS_TEXT_CLASSES.error}">{structuredError}</p>
				{/if}
				{#if structuredRan && !structuredLoading}
					<p class={DS_TYPE_CLASSES.meta}>Ran: {structuredQueryLabel}</p>
					{#if structuredEntityFocusHref}
						{#if structuredActionId === 'phone_mentions'}
							<div
								class="mt-3 rounded-lg border border-[var(--ds-border-default)] bg-[var(--ds-surface-raised)]/60 px-3 py-3 {DS_STACK_CLASSES.tight}"
								data-testid="intelligence-ws-phone-focus-cta"
							>
								<p class="{DS_TYPE_CLASSES.body} font-semibold text-[var(--ds-text-primary)]">
									Phone evidence focus (this number)
								</p>
								<p class="{DS_TYPE_CLASSES.meta} opacity-95">
									Goes to case entity intelligence for this phone — evidence-backed profile and timeline. Not the board
									registry.
								</p>
								<a
									class="{DS_BTN_CLASSES.primary} !mt-2 inline-flex !no-underline"
									href={structuredEntityFocusHref}
									data-testid="intelligence-ws-phone-focus-cta-link"
								>
									Phone evidence focus
								</a>
							</div>
						{:else}
							<p class={DS_TYPE_CLASSES.meta}>
								<a class={DS_INTELLIGENCE_CLASSES.inlineLink} href={structuredEntityFocusHref}>
									{CASE_DESTINATION_LABELS.entityIntelligenceFocusDrillDown} for this query value
								</a>
							</p>
						{/if}
					{/if}
					{#if structuredResults.length === 0}
						<p
							class="{DS_TYPE_CLASSES.body} text-[var(--ds-text-muted)]"
							data-testid="intelligence-empty-structured"
						>
							{INTELLIGENCE_UNSUPPORTED_COPY.noStructuredResults}
						</p>
					{:else}
						<ul class="{DS_STACK_CLASSES.tight} list-none p-0">
							{#each structuredResults as row (row.type + ':' + row.id)}
								<li class={DS_INTELLIGENCE_CLASSES.resultCard} data-testid="intelligence-structured-result-row">
									<div class="flex items-center gap-2">
										<span class={sourceBadgeClasses(row.type)}>
											{row.type === 'file' ? 'File' : 'Timeline'}
										</span>
										<span class="{DS_TYPE_CLASSES.meta} text-[var(--ds-text-muted)]">{row.id}</span>
										{#if row.timestamp}
											<span class="ml-auto {DS_TYPE_CLASSES.meta} text-[var(--ds-text-muted)]">{row.timestamp}</span>
										{/if}
									</div>
									<p class="mt-1.5">
										<a
											class="{DS_INTELLIGENCE_CLASSES.inlineLink} font-semibold text-[var(--ds-text-primary)]"
											href={row.sourcePath}
											data-testid="intelligence-structured-open-source"
										>
											Open source
										</a>
									</p>
									<p class="mt-1 {DS_TYPE_CLASSES.body} text-[var(--ds-text-secondary)]">{row.excerpt}</p>
								</li>
							{/each}
						</ul>
					{/if}
				{/if}
			</div>
				</div>

				<div class="{DS_INTELLIGENCE_CLASSES.sectionIntro} {DS_STACK_CLASSES.tight} mb-1" data-testid="intelligence-ws-results-intro">
					<h2 class={DS_TYPE_CLASSES.label}>
						Analysis, evidence &amp; citations
					</h2>
					<p class="{DS_TYPE_CLASSES.meta} leading-relaxed">
						From your last run — compare to <strong class="font-semibold">Entities</strong> for who/what is
						committed; citations support traceability only.
					</p>
				</div>

			{#if allSectionsEmpty}
				<div class={DS_INTELLIGENCE_CLASSES.emptyDashed} data-testid="intelligence-empty-all-sections">
					<p class="{DS_TYPE_CLASSES.body} text-[var(--ds-text-secondary)]">
						{INTELLIGENCE_UNSUPPORTED_COPY.noResultsThisSearch}
					</p>
					<p class="mt-1 {DS_TYPE_CLASSES.meta}">
						{INTELLIGENCE_UNSUPPORTED_COPY.allSectionsEmptyHint}
					</p>
				</div>
			{/if}

			<div class="{DS_INTELLIGENCE_CLASSES.panel} {DS_STACK_CLASSES.tight}">
				<h2 class={DS_TYPE_CLASSES.panel}>Cross-case analysis</h2>
				{#if loading}
					<p class="{DS_TYPE_CLASSES.body} text-[var(--ds-text-muted)]">Loading intelligence results...</p>
				{:else if !ranSearch}
					<p
						class="{DS_TYPE_CLASSES.body} text-[var(--ds-text-muted)]"
						data-testid="intelligence-empty-cross-case-no-run"
					>
						{INTELLIGENCE_UNSUPPORTED_COPY.runSearchFirst}
					</p>
				{:else if selectedScope === 'THIS_CASE'}
					<p
						class="{DS_TYPE_CLASSES.body} text-[var(--ds-text-muted)]"
						data-testid="intelligence-empty-cross-case-scope"
					>
						{INTELLIGENCE_UNSUPPORTED_COPY.crossCaseNotInThisScope}
					</p>
				{:else}
					{#if groundedAnswer}
						<div class={DS_STACK_CLASSES.stack}>
							<CaseEngineAskIntegrityBanner integrityPresentation={askIntegrityPresentation} />
							<div class="{DS_TYPE_CLASSES.body} whitespace-pre-wrap">{groundedAnswer}</div>
							<CaseEngineAskStructuredSections facts={askFacts} inferences={askInferences} />
						</div>
						{#if evidenceItems.length === 0}
							<p class={DS_TYPE_CLASSES.meta} data-testid="intelligence-empty-analysis-no-evidence-rows">
								{INTELLIGENCE_UNSUPPORTED_COPY.noSupportingEvidenceRowsForAnalysis}
							</p>
						{/if}
					{:else if !allSectionsEmpty}
						<p class="{DS_TYPE_CLASSES.body} text-[var(--ds-text-muted)]" data-testid="intelligence-empty-no-analysis-text">
							{INTELLIGENCE_UNSUPPORTED_COPY.noAnalysisText}
							{#if evidenceItems.length > 0}
								{' '}{INTELLIGENCE_UNSUPPORTED_COPY.noAnalysisTextReviewEvidence}
							{/if}
						</p>
					{/if}
				{/if}
			</div>

			<div class="{DS_INTELLIGENCE_CLASSES.panel} {DS_STACK_CLASSES.tight}">
				<h2 class={DS_TYPE_CLASSES.panel}>Supporting evidence</h2>
				<p class={DS_TYPE_CLASSES.meta}>
					These backend evidence matches support the analysis; they are not the analysis itself.
				</p>
				<p class="{DS_TYPE_CLASSES.meta} text-[var(--ds-text-secondary)]" data-testid="intelligence-supporting-evidence-action-hint">
					<strong class="text-[var(--ds-text-primary)]">Row order:</strong> entity hits show evidence focus (drill-down) first, then the excerpt.
					Timeline and file hits show source metadata first, then the excerpt (no entity focus on those rows).
				</p>
				{#if loading}
					<p class="{DS_TYPE_CLASSES.body} text-[var(--ds-text-muted)]">Loading supporting evidence...</p>
				{:else if !ranSearch}
					<p
						class="{DS_TYPE_CLASSES.body} text-[var(--ds-text-muted)]"
						data-testid="intelligence-empty-supporting-no-run"
					>
						{INTELLIGENCE_UNSUPPORTED_COPY.runSearchFirst}
					</p>
				{:else if evidenceCaseGroups.length === 0 && !allSectionsEmpty}
					<p class="{DS_TYPE_CLASSES.body} text-[var(--ds-text-muted)]" data-testid="intelligence-empty-supporting-no-rows">
						{INTELLIGENCE_UNSUPPORTED_COPY.noSupportingEvidenceForSearch}
						{#if groundedAnswer}
							{' '}{INTELLIGENCE_UNSUPPORTED_COPY.supportingEvidenceAnalysisWithoutRows}
						{/if}
					</p>
				{:else}
					<div class={DS_STACK_CLASSES.stack}>
						{#each evidenceCaseGroups as caseGroup}
							<div class="{DS_INTELLIGENCE_CLASSES.evidenceCaseCard} {DS_STACK_CLASSES.tight}">
								<div class="flex flex-wrap items-center gap-2">
									<span class="{DS_TYPE_CLASSES.body} font-semibold">
										{caseGroup.caseNumber}
									</span>
									{#if caseGroup.caseTitle}
										<span class="{DS_TYPE_CLASSES.meta} text-[var(--ds-text-muted)]">{caseGroup.caseTitle}</span>
									{/if}
									{#if caseGroup.unit}
										<span class="{DS_TYPE_CLASSES.meta} text-[var(--ds-text-muted)]">({caseGroup.unit})</span>
									{/if}
									<span class="ml-auto {DS_TYPE_CLASSES.meta} text-[var(--ds-text-muted)]">
										{caseGroup.matchCount} match(es)
									</span>
								</div>

								{#each caseGroup.typeGroups as typeGroup}
									<div class={DS_STACK_CLASSES.tight}>
										<div class="flex items-center gap-2">
											<span class="{DS_TYPE_CLASSES.meta} font-semibold">{typeGroup.label}</span>
											<span class="{DS_TYPE_CLASSES.meta} text-[var(--ds-text-muted)]">{typeGroup.items.length}</span>
										</div>
										<ul class="{DS_STACK_CLASSES.tight} list-none p-0">
											{#each typeGroup.items.slice(0, 8) as item}
												<li class={DS_INTELLIGENCE_CLASSES.evidenceHitRow}>
													<div class="flex items-center gap-2">
														<span class={sourceBadgeClasses(item.sourceType)}>
															{item.label}
														</span>
														<span class="{DS_TYPE_CLASSES.meta} text-[var(--ds-text-muted)]">{item.id}</span>
														{#if item.timestamp}
															<span class="ml-auto {DS_TYPE_CLASSES.meta} text-[var(--ds-text-muted)]">{item.timestamp}</span>
														{/if}
													</div>
													{#if item.sourceType === 'entity'}
														{@const href = entityFocusHref(item)}
														{#if href}
															<p class="mt-1.5" data-testid="intelligence-supporting-evidence-primary-action">
																<a
																	class="{DS_INTELLIGENCE_CLASSES.inlineLink} font-semibold text-[var(--ds-text-primary)]"
																	href={href}
																>
																	{entityEvidenceFocusControlLabel(item.entityType)}
																</a>
															</p>
														{/if}
													{/if}
													<p class="mt-1 {DS_TYPE_CLASSES.body} text-[var(--ds-text-secondary)]">{item.excerpt}</p>
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
				<div class="{DS_INTELLIGENCE_CLASSES.panel} {DS_STACK_CLASSES.tight}">
					<h2 class={DS_TYPE_CLASSES.panel}>Cases matching this query</h2>
					<p class={DS_TYPE_CLASSES.meta}>
						Listed from backend evidence matches. This is not a confirmed relationship model.
					</p>
					<p class="{DS_TYPE_CLASSES.meta} text-[var(--ds-text-secondary)]" data-testid="intelligence-cases-match-action-hint">
						{CASE_DESTINATION_HINTS.crossCaseMatches}
					</p>
					{#if ranSearch && !loading && matchedCaseSummaries.length === 0 && !allSectionsEmpty}
						<p
							class="{DS_TYPE_CLASSES.body} text-[var(--ds-text-muted)]"
							data-testid="intelligence-empty-cases-matched"
						>
							{INTELLIGENCE_UNSUPPORTED_COPY.noCasesMatched}
						</p>
					{:else}
						<ul class="{DS_STACK_CLASSES.tight} list-none p-0">
							{#each matchedCaseSummaries.slice(0, 8) as rc}
								<li class={DS_INTELLIGENCE_CLASSES.resultCard} data-testid="intelligence-cases-match-row">
									<div class="flex flex-col gap-2.5">
										<div
											class="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1"
											data-testid="intelligence-cases-match-identity"
										>
											<span class="{DS_TYPE_CLASSES.body} font-semibold text-[var(--ds-text-primary)]">{rc.caseNumber}</span>
											<span class="{DS_TYPE_CLASSES.meta} text-[var(--ds-text-muted)]">{rc.caseTitle}</span>
											<span class="{DS_TYPE_CLASSES.meta} text-[var(--ds-text-muted)]">({rc.unit})</span>
											<span class="{DS_TYPE_CLASSES.meta} text-[var(--ds-text-muted)]">{rc.matchCount} match(es)</span>
										</div>
										<div
											class="flex flex-wrap items-center gap-x-2 gap-y-1"
											data-testid="intelligence-cases-match-actions"
											role="group"
											aria-label="Case entry actions for this match"
										>
											<a
												class="{DS_INTELLIGENCE_CLASSES.inlineLink} font-semibold text-[var(--ds-text-primary)]"
												href={`/case/${rc.caseId}/summary`}
												data-testid="intelligence-cases-match-open-case"
												title={CASE_DESTINATION_TITLES.overview}
											>
												{CASE_DESTINATION_LABELS.overview}
											</a>
											<span
												class="{DS_TYPE_CLASSES.meta} text-[var(--ds-text-muted)] select-none"
												aria-hidden="true"
											>
												·
											</span>
											<a
												class="{DS_INTELLIGENCE_CLASSES.inlineLink} font-semibold text-[var(--ds-text-primary)]"
												href={`/case/${rc.caseId}/chat`}
												data-testid="intelligence-cases-match-open-chat"
												title={CASE_DESTINATION_TITLES.aiWorkspace}
											>
												{CASE_DESTINATION_LABELS.aiWorkspace}
											</a>
										</div>
									</div>
								</li>
							{/each}
						</ul>
					{/if}
				</div>
				<div class="{DS_INTELLIGENCE_CLASSES.panel} {DS_STACK_CLASSES.tight}">
					<h2 class={DS_TYPE_CLASSES.panel}>Entity Intelligence (search)</h2>
					<p class={DS_TYPE_CLASSES.meta}>
						<strong>Read-only:</strong> entity-shaped <strong>hits from intelligence search</strong>, not the
						<strong>committed</strong> registry entities in Entities mode above.
					</p>
					<p class="{DS_TYPE_CLASSES.meta} text-[var(--ds-text-secondary)]" data-testid="intelligence-ws-entity-search-action-hint">
						<strong class="text-[var(--ds-text-primary)]">Row order:</strong> entity drill-down link first (when present), then
						the match excerpt.
					</p>
					{#if entityTypeGroups.some((g) => String(g.type).toLowerCase() === 'phone')}
						<p
							class="{DS_TYPE_CLASSES.meta} text-[var(--ds-text-secondary)]"
							data-testid="intelligence-ws-entity-search-phone-note"
						>
							<strong class="text-[var(--ds-text-primary)]">Phone matches:</strong> use the phone evidence focus link on
							the row for the supported evidence-backed view — not the Entities board phone column.
						</p>
					{/if}
					{#if ranSearch && !loading && entityTypeGroups.length === 0 && !allSectionsEmpty}
						<p
							class="{DS_TYPE_CLASSES.body} text-[var(--ds-text-muted)]"
							data-testid="intelligence-empty-entity-search-hits"
						>
							{INTELLIGENCE_UNSUPPORTED_COPY.noEntityHits}
						</p>
						<p class={DS_TYPE_CLASSES.meta}>
							This list appears when the backend returns identifiable entity-type matches for your search — separate
							from the Entities workspace registries / staging panels.
						</p>
						{#if matchedCaseSummaries.length > 0}
							<p class={DS_TYPE_CLASSES.meta}>
								Cases matching this query can exist even when no entity-type rows are returned.
							</p>
						{/if}
					{:else}
						<div class={DS_STACK_CLASSES.stack}>
							{#each entityTypeGroups as entityGroup}
								<div class={DS_INTELLIGENCE_CLASSES.entitySearchGroup}>
									<p class="{DS_TYPE_CLASSES.meta} font-semibold">
										{entityGroup.type} ({entityGroup.items.length})
									</p>
									<ul class="mt-1 {DS_STACK_CLASSES.tight} list-none p-0">
										{#each entityGroup.items.slice(0, 8) as item}
											<li
												class="{DS_INTELLIGENCE_CLASSES.resultCard} {DS_TYPE_CLASSES.meta} text-left"
												data-testid="intelligence-entity-search-hit-row"
											>
												<p class="{DS_TYPE_CLASSES.meta} text-[var(--ds-text-muted)]">
													{item.caseNumber}{#if item.unit}
														<span> ({item.unit})</span>{/if}
												</p>
												{#if entityFocusHref(item)}
													<p class="mt-1" data-testid="intelligence-entity-search-primary-action">
														<a
															class="{DS_INTELLIGENCE_CLASSES.inlineLink} font-semibold text-[var(--ds-text-primary)]"
															href={entityFocusHref(item) ?? '#'}
														>
															{#if String(item.entityType ?? '').toLowerCase() === 'phone'}
																{entityEvidenceFocusControlLabel(item.entityType)} — {item.entityValue ||
																	item.entityNormalized ||
																	'phone'}
															{:else}
																{entityEvidenceFocusControlLabel(item.entityType)}: {item.entityValue ||
																	item.entityNormalized ||
																	'Entity'}
															{/if}
														</a>
													</p>
													<p class="mt-1 {DS_TYPE_CLASSES.body} text-[var(--ds-text-secondary)]">{item.excerpt}</p>
												{:else}
													<p class="mt-1 {DS_TYPE_CLASSES.body} text-[var(--ds-text-secondary)]">{item.excerpt}</p>
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

			<div class="{DS_INTELLIGENCE_CLASSES.panel} {DS_STACK_CLASSES.tight}">
				<h2 class={DS_TYPE_CLASSES.panel}>Citations / Evidence</h2>
				{#if ranSearch && !loading && uniqueAskCitations.length === 0 && uniqueIntelCitations.length === 0 && !allSectionsEmpty}
					<p
						class="{DS_TYPE_CLASSES.body} text-[var(--ds-text-muted)]"
						data-testid="intelligence-empty-citations"
					>
						{INTELLIGENCE_UNSUPPORTED_COPY.noCitations}
					</p>
				{:else}
					{#if uniqueAskCitations.length > 0}
						<p class="{DS_TYPE_CLASSES.meta} font-semibold">Cross-case ask citations</p>
						<ul class={DS_INTELLIGENCE_CLASSES.citationList}>
							{#each uniqueAskCitations as c}
								<li>
									• {c.case_number} — {c.source_type} — {c.id}
								</li>
							{/each}
						</ul>
					{/if}
					{#if uniqueIntelCitations.length > 0}
						<p class="{DS_TYPE_CLASSES.meta} font-semibold">Intelligence search citations</p>
						<ul class={DS_INTELLIGENCE_CLASSES.citationList}>
							{#each uniqueIntelCitations as c}
								<li>
									• {c.label} — {c.source_kind} — {c.source_id}
								</li>
							{/each}
						</ul>
					{/if}
				{/if}
			</div>
				</div>
			{/if}
		{/if}
		</div>
	</div>
</div>
</CaseWorkspaceContentRegion>

<CaseIntelligenceEntityCreateModal
	open={createModalOpen}
	caseId={caseId ?? ''}
	token={$caseEngineToken ?? ''}
	entityKind={createModalKind}
	on:close={handleIntelCreateModalClose}
	on:created={handleIntelDirectEntityCreated}
/>

<CaseIntelligenceEntityDetailModal
	open={entityDetailOpen}
	caseId={caseId}
	token={$caseEngineToken ?? ''}
	seedEntity={entityDetailSeed}
	on:close={async () => {
		entityDetailOpen = false;
		await tick();
		entityDetailSeed = null;
	}}
/>

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
