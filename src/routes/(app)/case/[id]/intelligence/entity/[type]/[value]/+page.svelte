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
	import { splitEntityEvidenceByCase, isSupportedEntityFocusType, type EntityFocusType } from '$lib/utils/entityFocus';

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

	$: focusType = isSupportedEntityFocusType(typeParam) ? typeParam : null;
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

<div class="h-full min-h-0 overflow-auto p-4 md:p-6">
	<div class="mx-auto max-w-5xl space-y-4">
		<div class="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
			<p class="text-xs text-gray-500 dark:text-gray-400 mb-1">
				<a class="text-blue-700 dark:text-blue-400 hover:underline" href={`/case/${caseId}/intelligence`}>Back to Intelligence</a>
			</p>
			<h1 class="text-lg font-semibold text-gray-900 dark:text-gray-100">Entity Focus</h1>
			<p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
				Read-only, evidence-grounded entity review using existing backend entity endpoints only.
			</p>
			<div class="mt-3">
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
		</div>

		{#if !$caseEngineToken}
			<div class="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
				<p class="text-sm text-gray-600 dark:text-gray-300">Case Engine authentication is required.</p>
			</div>
		{:else if !focusType}
			<div class="rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/20 p-4">
				<p class="text-sm text-red-700 dark:text-red-300">Unsupported entity type: {typeParam}</p>
			</div>
		{:else if loading}
			<div class="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
				<p class="text-sm text-gray-500 dark:text-gray-400">Loading entity details...</p>
			</div>
		{:else if error}
			<div class="rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/20 p-4">
				<p class="text-sm text-red-700 dark:text-red-300">Entity details could not be loaded.</p>
				<p class="text-xs text-red-600 dark:text-red-400 mt-1">{error}</p>
			</div>
		{:else if profile}
			<div class="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 space-y-2">
				<h2 class="text-sm font-semibold text-gray-900 dark:text-gray-100">Entity Header</h2>
				<p class="text-sm text-gray-800 dark:text-gray-200">{profile.entity.display_label}</p>
				<p class="text-xs text-gray-500 dark:text-gray-400">
					Type: {formatType(profile.entity.type)} ({profile.entity.type})
				</p>
				<p class="text-xs text-gray-500 dark:text-gray-400">
					Normalized value: {profile.entity.normalized_id}
				</p>
			</div>

			<div class="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 space-y-2">
				<h2 class="text-sm font-semibold text-gray-900 dark:text-gray-100">Current Case Mentions</h2>
				{#if currentCaseEvidence.length === 0}
					<p class="text-sm text-gray-500 dark:text-gray-400">No mentions found for this entity in this case.</p>
				{:else}
					<ul class="space-y-2">
						{#each currentCaseEvidence as ev}
							<li class="rounded border border-gray-200 dark:border-gray-800 p-2 text-xs">
								<p class="text-gray-700 dark:text-gray-300">
									{ev.source.kind === 'timeline_entry' ? 'Timeline' : 'File'} — {ev.citation.label}
								</p>
								<p class="mt-1 text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
									{ev.match.excerpt || 'No evidence excerpts available.'}
								</p>
							</li>
						{/each}
					</ul>
				{/if}
			</div>

			<div class="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 space-y-2">
				<h2 class="text-sm font-semibold text-gray-900 dark:text-gray-100">Timeline Involvement</h2>
				{#if currentCaseTimeline.length === 0}
					<p class="text-sm text-gray-500 dark:text-gray-400">No timeline references found for this entity in this case.</p>
				{:else}
					<ul class="space-y-2">
						{#each currentCaseTimeline as item}
							<li class="rounded border border-gray-200 dark:border-gray-800 p-2 text-xs">
								<p class="text-gray-700 dark:text-gray-300">
									{formatTs(item.occurred_at || item.timestamp)} — {item.source_id}
								</p>
								<p class="mt-1 text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{item.excerpt}</p>
							</li>
						{/each}
					</ul>
				{/if}
			</div>

			<div class="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 space-y-2">
				<h2 class="text-sm font-semibold text-gray-900 dark:text-gray-100">Other Case References</h2>
				{#if otherCases.length === 0}
					<p class="text-sm text-gray-500 dark:text-gray-400">No other case references available for this entity.</p>
				{:else}
					<ul class="space-y-2">
						{#each otherCases as row}
							<li class="rounded border border-gray-200 dark:border-gray-800 p-2 text-xs">
								<div class="flex flex-wrap items-center gap-2">
									<a
										class="font-medium text-blue-700 dark:text-blue-400 hover:underline"
										href={`/case/${row.case.id}/chat`}
									>
										{row.case.case_number}
									</a>
									<span class="text-gray-500 dark:text-gray-400">{row.case.title}</span>
									<span class="text-gray-400 dark:text-gray-500">({row.case.unit})</span>
								</div>
								<p class="mt-1 text-gray-600 dark:text-gray-400">
									Occurrences: {row.summary.occurrence_count} · First seen: {formatTs(row.summary.first_seen_at)} · Last seen: {formatTs(row.summary.last_seen_at)}
								</p>
							</li>
						{/each}
					</ul>
				{/if}
			</div>

			<div class="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 space-y-2">
				<h2 class="text-sm font-semibold text-gray-900 dark:text-gray-100">Evidence / Citations</h2>
				{#if currentCaseEvidence.length === 0 && otherCaseEvidence.length === 0}
					<p class="text-sm text-gray-500 dark:text-gray-400">No evidence excerpts available.</p>
				{:else}
					{#if currentCaseEvidence.length > 0}
						<p class="text-xs font-medium text-gray-700 dark:text-gray-300">Current case evidence</p>
						<ul class="space-y-1 text-xs text-gray-600 dark:text-gray-400">
							{#each currentCaseEvidence as ev}
								<li>• {ev.citation.label} — {ev.citation.source_kind} — {ev.citation.source_id}</li>
							{/each}
						</ul>
					{/if}
					{#if otherCaseEvidence.length > 0}
						<p class="text-xs font-medium text-gray-700 dark:text-gray-300 mt-2">Other case evidence</p>
						<ul class="space-y-1 text-xs text-gray-600 dark:text-gray-400">
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
			<div class="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
				<p class="text-sm text-gray-600 dark:text-gray-300">
					No entity details were returned for this request.
				</p>
			</div>
		{/if}
	</div>
</div>

