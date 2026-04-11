<script lang="ts">
	import { page } from '$app/stores';
	import { caseEngineAuthState, caseEngineToken, caseEngineUser } from '$lib/stores';
	import {
		getCaseById,
		getEntityProfile,
		getEntityTimeline,
		getEntityCases,
		type EntityProfileResponse,
		type EntityTimelineResponse,
		type EntityCasesResponse
	} from '$lib/apis/caseEngine';
	import {
		splitEntityEvidenceByCase,
		isSupportedEntityFocusType,
		entityFocusEvidenceBackendSupportsRouteType,
		type EntityFocusType
	} from '$lib/utils/entityFocus';
	import CaseWorkspaceContentRegion from '$lib/components/case/CaseWorkspaceContentRegion.svelte';
	import {
		DS_INTELLIGENCE_CLASSES,
		DS_TYPE_CLASSES,
		DS_TIMELINE_CLASSES,
		DS_STATUS_SURFACE_CLASSES,
		DS_STACK_CLASSES
	} from '$lib/case/detectivePrimitiveFoundation';
	import { ENTITY_FOCUS_UNSUPPORTED_COPY } from '$lib/utils/intelligenceUnsupportedCopy';
	import {
		CASE_DESTINATION_HINTS,
		CASE_DESTINATION_LABELS,
		CASE_DESTINATION_TITLES
	} from '$lib/utils/caseDestinationLabels';

	type FocusScope = 'THIS_CASE' | 'CID' | 'SIU' | 'ALL';
	const ENTITY_FOCUS_TIMEOUT_MS = 45_000;
	const CASE_UNIT_TIMEOUT_MS = 15_000;

	function safeDecode(input: string): string {
		try {
			return decodeURIComponent(input);
		} catch {
			return input;
		}
	}

	function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
		return new Promise<T>((resolve, reject) => {
			const timeoutId = setTimeout(() => {
				reject(new Error(`${label} timed out. Please try again.`));
			}, timeoutMs);
			promise.then(
				(value) => {
					clearTimeout(timeoutId);
					resolve(value);
				},
				(err) => {
					clearTimeout(timeoutId);
					reject(err);
				}
			);
		});
	}

	$: caseId = $page.params.id;
	$: typeParam = String($page.params.type ?? '').toLowerCase();
	$: valueParamRaw = String($page.params.value ?? '');
	$: normalizedValue = safeDecode(valueParamRaw);

	$: authRole = String($caseEngineAuthState?.user?.role ?? '').toLowerCase();
	$: isAdmin = $caseEngineUser?.role === 'ADMIN' || authRole === 'admin';
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
			] as Array<{ id: FocusScope; label: string }>)
		: ([
				{ id: 'THIS_CASE', label: 'This Case' },
				...authorizedUnits.map((unit) => ({ id: unit, label: unit }))
			] as Array<{ id: FocusScope; label: string }>);

	let selectedScope: FocusScope = 'THIS_CASE';
	let caseUnit: 'CID' | 'SIU' | '' = '';
	let loading = false;
	let error = '';
	let profile: EntityProfileResponse | null = null;
	let timeline: EntityTimelineResponse | null = null;
	let casesRef: EntityCasesResponse | null = null;
	let lastLoadKey = '';
	let lastAppliedScopeFromQuery = '';
	let focusType: EntityFocusType | null = null;
	let activeLoadId = 0;
	let activeLoadGuard: ReturnType<typeof setTimeout> | null = null;
	let evidenceRows: EntityProfileResponse['evidence'] = [];
	let currentCaseEvidence: EntityProfileResponse['evidence'] = [];
	let otherCaseEvidence: EntityProfileResponse['evidence'] = [];

	$: if (!allowedScopes.some((s) => s.id === selectedScope)) {
		selectedScope = allowedScopes[0]?.id ?? 'THIS_CASE';
	}
	$: queryScope = String($page.url.searchParams.get('scope') ?? '').toUpperCase();
	$: if (queryScope !== lastAppliedScopeFromQuery) {
		lastAppliedScopeFromQuery = queryScope;
		if (
			(queryScope === 'THIS_CASE' || queryScope === 'CID' || queryScope === 'SIU' || queryScope === 'ALL') &&
			allowedScopes.some((s) => s.id === queryScope)
		) {
			selectedScope = queryScope;
		}
	}

	$: focusType = isSupportedEntityFocusType(typeParam) ? (typeParam as EntityFocusType) : null;
	$: evidenceRows = Array.isArray(profile?.evidence) ? profile.evidence : [];
	$: ({ currentCaseEvidence, otherCaseEvidence } = splitEntityEvidenceByCase(evidenceRows, caseId));
	$: currentCaseTimeline = (timeline?.items ?? [])
		.filter((item) => item.case_id === caseId && item.source === 'timeline_entry')
		.sort((a, b) => (a.occurred_at ?? a.timestamp ?? '').localeCompare(b.occurred_at ?? b.timestamp ?? ''));
	$: otherCases = (casesRef?.cases ?? []).filter((c) => c.case.id !== caseId);

	function formatType(type: string): string {
		if (type === 'phone') return 'Phone';
		if (type === 'person') return 'Person';
		if (type === 'location') return 'Location';
		if (type === 'vehicle') return 'Vehicle';
		return 'Entity';
	}

	function formatTs(ts?: string | null): string {
		if (!ts) return '';
		const d = new Date(ts);
		return Number.isNaN(d.getTime()) ? ts : d.toLocaleString();
	}

	function toBackendScope(scope: FocusScope): { scope: 'UNIT' | 'ALL'; unit?: 'CID' | 'SIU' } {
		if (scope === 'ALL') return { scope: 'ALL' };
		if (!isAdmin) return { scope: 'UNIT' };
		if (scope === 'CID' || scope === 'SIU') return { scope: 'UNIT', unit: scope };
		// THIS_CASE for admin requires explicit unit by backend contract.
		return {
			scope: 'UNIT',
			unit: caseUnit === 'CID' || caseUnit === 'SIU' ? caseUnit : 'CID'
		};
	}

	async function ensureCaseUnit(): Promise<void> {
		if (caseUnit || !$caseEngineToken || !caseId) return;
		try {
			const c = await withTimeout(
				getCaseById(caseId, $caseEngineToken),
				CASE_UNIT_TIMEOUT_MS,
				'Case unit lookup'
			);
			if (c.unit === 'CID' || c.unit === 'SIU') {
				caseUnit = c.unit;
			}
		} catch {
			// Keep blank; load will still attempt with deterministic fallback.
		}
	}

	async function loadEntityFocus(): Promise<void> {
		if (!$caseEngineToken || !caseId || !focusType || !normalizedValue) return;
		activeLoadId += 1;
		const loadId = activeLoadId;
		if (activeLoadGuard) {
			clearTimeout(activeLoadGuard);
			activeLoadGuard = null;
		}
		if (!entityFocusEvidenceBackendSupportsRouteType(typeParam)) {
			caseUnit = '';
			loading = false;
			error = '';
			profile = null;
			timeline = null;
			casesRef = null;
			return;
		}
		// Reset caseUnit on every new load so a case switch doesn't carry over
		// the previous case's unit (affects admin THIS_CASE scope resolution).
		caseUnit = '';
		loading = true;
		error = '';
		activeLoadGuard = setTimeout(() => {
			if (loadId !== activeLoadId || !loading) return;
			profile = null;
			timeline = null;
			casesRef = null;
			error = 'Entity focus request timed out. Please try again.';
			loading = false;
		}, ENTITY_FOCUS_TIMEOUT_MS);
		try {
			if (isAdmin && selectedScope === 'THIS_CASE') {
				await ensureCaseUnit();
			}
			if (isAdmin && selectedScope === 'THIS_CASE' && !caseUnit) {
				throw new Error('Unable to resolve current case unit for this-case entity scope.');
			}
			const scopeParams = toBackendScope(selectedScope);
			const [p, t, c] = await withTimeout(
				Promise.all([
					getEntityProfile(focusType, normalizedValue, $caseEngineToken, scopeParams),
					getEntityTimeline(focusType, normalizedValue, $caseEngineToken, {
						...scopeParams,
						limit: 200
					}),
					getEntityCases(focusType, normalizedValue, $caseEngineToken, scopeParams)
				]),
				ENTITY_FOCUS_TIMEOUT_MS,
				'Entity focus request'
			);
			// Guard all state writes — a stale in-flight response must not overwrite
			// results from a newer load triggered by a case/entity/scope change.
			if (loadId !== activeLoadId) return;
			profile = p;
			timeline = t;
			casesRef = c;
		} catch (err) {
			if (loadId !== activeLoadId) return;
			profile = null;
			timeline = null;
			casesRef = null;
			error = err instanceof Error ? err.message : 'Entity details could not be loaded.';
		} finally {
			if (loadId === activeLoadId && activeLoadGuard) {
				clearTimeout(activeLoadGuard);
				activeLoadGuard = null;
			}
			// Only dismiss the loading spinner for the current load — a stale
			// completing load must not hide the spinner for the active load.
			if (loadId === activeLoadId) loading = false;
		}
	}

	$: {
		const hasTokenKey = $caseEngineToken ? 'token-present' : 'token-missing';
		const loadKey = `${caseId}|${focusType ?? 'invalid'}|${normalizedValue}|${selectedScope}|${hasTokenKey}`;
		if (loadKey !== lastLoadKey) {
			lastLoadKey = loadKey;
			void loadEntityFocus();
		}
	}
</script>

<CaseWorkspaceContentRegion testId="case-intelligence-entity-page">
<div class={DS_INTELLIGENCE_CLASSES.entityPageScroll}>
	<div class={DS_INTELLIGENCE_CLASSES.entityPageInner}>
		<div class={DS_INTELLIGENCE_CLASSES.entityPanel}>
			<p class="mb-1 {DS_TYPE_CLASSES.meta}">
				<a
					class={DS_INTELLIGENCE_CLASSES.entityBackLink}
					href={`/case/${caseId}/intelligence?mode=intelligence`}
					data-testid="intelligence-entity-focus-back"
				>{CASE_DESTINATION_HINTS.backToEntityIntelligence}</a>
			</p>
			<p class={DS_INTELLIGENCE_CLASSES.identityEyebrow}>{CASE_DESTINATION_LABELS.entityIntelligenceFocusEyebrow}</p>
			<h1 class={DS_TYPE_CLASSES.display}>Entity Focus</h1>
			<p class="mt-1 {DS_TYPE_CLASSES.meta}">
				Read-only, evidence-grounded entity review using existing backend entity endpoints only.
			</p>
			<div class="mt-3">
				<label class="mb-1 block {DS_TYPE_CLASSES.meta} font-semibold" for="entity-focus-scope">Scope</label>
				<select
					id="entity-focus-scope"
					class={DS_TIMELINE_CLASSES.formControl}
					bind:value={selectedScope}
				>
					{#each allowedScopes as item}
						<option value={item.id}>{item.label}</option>
					{/each}
				</select>
			</div>
		</div>

		{#if !$caseEngineToken}
			<div class={DS_INTELLIGENCE_CLASSES.entityPanel}>
				<p class="{DS_TYPE_CLASSES.body} text-[var(--ds-text-secondary)]">Case Engine authentication is required.</p>
			</div>
		{:else if !focusType}
			<div class="rounded-xl px-4 py-3 text-sm {DS_STATUS_SURFACE_CLASSES.error}">
				<p class="ds-status-copy">
					{ENTITY_FOCUS_UNSUPPORTED_COPY.badRouteTypePrefix}: {typeParam}
				</p>
			</div>
		{:else if focusType && !entityFocusEvidenceBackendSupportsRouteType(typeParam)}
			<div
				class="rounded-xl px-4 py-3 text-sm {DS_STATUS_SURFACE_CLASSES.info}"
				data-testid="intelligence-entity-focus-unsupported-type"
			>
				<p class="ds-status-copy">{ENTITY_FOCUS_UNSUPPORTED_COPY.notAvailableYet}</p>
				<p class="ds-status-copy mt-1 {DS_TYPE_CLASSES.meta}">
					{ENTITY_FOCUS_UNSUPPORTED_COPY.vehicleBody}
				</p>
				<p class="mt-2 {DS_TYPE_CLASSES.meta}">
					<a
						class={DS_INTELLIGENCE_CLASSES.inlineLink}
						href={`/case/${caseId}/intelligence?mode=intelligence`}
						data-testid="intelligence-entity-focus-back"
					>{CASE_DESTINATION_HINTS.backToEntityIntelligence}</a>
				</p>
			</div>
		{:else if loading}
			<div class={DS_INTELLIGENCE_CLASSES.entityPanel}>
				<p class="{DS_TYPE_CLASSES.body} text-[var(--ds-text-muted)]">Loading entity details...</p>
			</div>
		{:else if error}
			<div class="rounded-xl px-4 py-3 {DS_STATUS_SURFACE_CLASSES.error}">
				<p class="ds-status-copy">Entity details could not be loaded.</p>
				<p class="ds-status-copy mt-1 {DS_TYPE_CLASSES.meta}">{error}</p>
			</div>
		{:else if profile}
			<div class="{DS_INTELLIGENCE_CLASSES.entityPanel} {DS_STACK_CLASSES.tight}">
				<h2 class={DS_TYPE_CLASSES.panel}>Entity Header</h2>
				<p class={DS_TYPE_CLASSES.body}>{profile.entity.display_label}</p>
				<p class={DS_TYPE_CLASSES.meta}>
					Type: {formatType(profile.entity.type)} ({profile.entity.type})
				</p>
				<p class={DS_TYPE_CLASSES.meta}>
					Normalized value: {profile.entity.normalized_id}
				</p>
			</div>

			<div class="{DS_INTELLIGENCE_CLASSES.entityPanel} {DS_STACK_CLASSES.tight}">
				<h2 class={DS_TYPE_CLASSES.panel}>Current Case Mentions</h2>
				{#if currentCaseEvidence.length === 0}
					<p class="{DS_TYPE_CLASSES.body} text-[var(--ds-text-muted)]" data-testid="intelligence-entity-focus-empty-mentions">
						{ENTITY_FOCUS_UNSUPPORTED_COPY.noMentions}
					</p>
				{:else}
					<ul class={DS_STACK_CLASSES.stack}>
						{#each currentCaseEvidence as ev}
							<li class={DS_INTELLIGENCE_CLASSES.resultCard}>
								<p class="text-[var(--ds-text-primary)]">
									{ev.source.kind === 'timeline_entry' ? 'Timeline' : 'File'} — {ev.citation.label}
								</p>
								<p class="mt-1 {DS_TYPE_CLASSES.body} whitespace-pre-wrap text-[var(--ds-text-secondary)]">
									{ev.match.excerpt || ENTITY_FOCUS_UNSUPPORTED_COPY.noEvidenceExcerpts}
								</p>
							</li>
						{/each}
					</ul>
				{/if}
			</div>

			<div class="{DS_INTELLIGENCE_CLASSES.entityPanel} {DS_STACK_CLASSES.tight}">
				<h2 class={DS_TYPE_CLASSES.panel}>Timeline Involvement</h2>
				{#if currentCaseTimeline.length === 0}
					<p class="{DS_TYPE_CLASSES.body} text-[var(--ds-text-muted)]" data-testid="intelligence-entity-focus-empty-timeline">
						{ENTITY_FOCUS_UNSUPPORTED_COPY.noTimelineRefs}
					</p>
				{:else}
					<ul class={DS_STACK_CLASSES.stack}>
						{#each currentCaseTimeline as item}
							<li class={DS_INTELLIGENCE_CLASSES.resultCard}>
								<p class="text-[var(--ds-text-primary)]">
									{formatTs(item.occurred_at || item.timestamp)} — {item.source_id}
								</p>
								<p class="mt-1 {DS_TYPE_CLASSES.body} whitespace-pre-wrap text-[var(--ds-text-secondary)]">{item.excerpt}</p>
							</li>
						{/each}
					</ul>
				{/if}
			</div>

			<div class="{DS_INTELLIGENCE_CLASSES.entityPanel} {DS_STACK_CLASSES.tight}">
				<h2 class={DS_TYPE_CLASSES.panel}>Other Case References</h2>
				{#if otherCases.length === 0}
					<p class="{DS_TYPE_CLASSES.body} text-[var(--ds-text-muted)]" data-testid="intelligence-entity-focus-empty-other-cases">
						{ENTITY_FOCUS_UNSUPPORTED_COPY.noOtherCases}
					</p>
				{:else}
					<ul class={DS_STACK_CLASSES.stack}>
						{#each otherCases as row}
							<li class={DS_INTELLIGENCE_CLASSES.resultCard}>
								<div class="flex flex-wrap items-center gap-2">
									<a
										class="font-semibold {DS_INTELLIGENCE_CLASSES.inlineLink}"
										href={`/case/${row.case.id}/chat`}
										title={CASE_DESTINATION_TITLES.aiWorkspace}
										aria-label={`${CASE_DESTINATION_TITLES.aiWorkspace} (${row.case.case_number})`}
									>
										{row.case.case_number}
									</a>
									<span class="{DS_TYPE_CLASSES.meta} text-[var(--ds-text-muted)]">{row.case.title}</span>
									<span class="{DS_TYPE_CLASSES.meta} text-[var(--ds-text-muted)]">({row.case.unit})</span>
								</div>
								<p class="mt-1 {DS_TYPE_CLASSES.body} text-[var(--ds-text-secondary)]">
									Occurrences: {row.summary.occurrence_count} · First seen: {formatTs(row.summary.first_seen_at)} · Last seen: {formatTs(row.summary.last_seen_at)}
								</p>
							</li>
						{/each}
					</ul>
				{/if}
			</div>

			<div class="{DS_INTELLIGENCE_CLASSES.entityPanel} {DS_STACK_CLASSES.tight}">
				<h2 class={DS_TYPE_CLASSES.panel}>Evidence / Citations</h2>
				{#if currentCaseEvidence.length === 0 && otherCaseEvidence.length === 0}
					<p class="{DS_TYPE_CLASSES.body} text-[var(--ds-text-muted)]" data-testid="intelligence-entity-focus-empty-evidence">
						{ENTITY_FOCUS_UNSUPPORTED_COPY.noEvidenceExcerpts}
					</p>
				{:else}
					{#if currentCaseEvidence.length > 0}
						<p class="{DS_TYPE_CLASSES.meta} font-semibold">Current case evidence</p>
						<ul class={DS_INTELLIGENCE_CLASSES.citationList}>
							{#each currentCaseEvidence as ev}
								<li>• {ev.citation.label} — {ev.citation.source_kind} — {ev.citation.source_id}</li>
							{/each}
						</ul>
					{/if}
					{#if otherCaseEvidence.length > 0}
						<p class="mt-2 {DS_TYPE_CLASSES.meta} font-semibold">Other case evidence</p>
						<ul class={DS_INTELLIGENCE_CLASSES.citationList}>
							{#each otherCaseEvidence as ev}
								<li>
									• {ev.case.case_number} — {ev.citation.label} — {ev.citation.source_kind} — {ev.citation.source_id}
								</li>
							{/each}
						</ul>
					{/if}
				{/if}
			</div>
		{:else}
			<div class={DS_INTELLIGENCE_CLASSES.entityPanel} data-testid="intelligence-entity-focus-no-details">
				<p class="{DS_TYPE_CLASSES.body} text-[var(--ds-text-secondary)]">
					{ENTITY_FOCUS_UNSUPPORTED_COPY.noDetailsReturned}
				</p>
			</div>
		{/if}
	</div>
</div>
</CaseWorkspaceContentRegion>

