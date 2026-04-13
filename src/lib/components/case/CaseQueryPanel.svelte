<script lang="ts">
	/**
	 * P102-04 — Single-case read-only query (Case Engine `POST /cases/:id/query`).
	 * P102-05 — Shared presentation + case_id match hardening (no cross-case display).
	 * P103-04 — Citation affordances → existing P103 navigation (explicit operator action only).
	 * P103-05 — Shared operator copy + case-id alignment with P103 intent validators.
	 * P118-04 — Citation navigation resolved via Case Engine `/navigation/citation` only (no client route tables).
	 */
	import { onDestroy } from 'svelte';
	import {
		postCaseQuery,
		type CaseQueryCitation,
		type CaseQueryResponseEnvelope
	} from '$lib/apis/caseEngine/caseQueryApi';
	import { postCaseCitationNavigation } from '$lib/apis/caseEngine/caseNavigationApi';
	import type { CitationNavigationResult } from '$lib/case/p118CitationNavigationTypes';
	import { navigateFromCitationNavigationResult } from '$lib/case/p118CitationNavigationNavigate';
	import {
		hasActiveStructuredFiltersUi,
		structuredFiltersFromUiFields
	} from '$lib/case/caseQueryStructuredFiltersUi';
	import {
		P102_CASE_QUERY_SCOPE_COPY,
		caseQueryResponseMatchesActiveCase,
		caseQueryStatusHeadline,
		formatCaseQueryCitationLabel
	} from '$lib/case/p102CaseQueryPresentation';
	import {
		P113_CASE_QUERY_RETRIEVAL_TRANSPARENCY_FRAMING,
		P113_CASE_QUERY_RETRIEVAL_TRANSPARENCY_TITLE,
		referentialFactsCitationsAligned
	} from '$lib/case/p113CaseQueryRetrievalTransparency';
	import { referentialFactInclusionLabel } from '$lib/case/p115CaseQueryRelationshipProvenance';
	import {
		P103_QUERY_NAVIGATION_CASE_MISMATCH_COPY,
		P103_QUERY_NAVIGATION_FAILED_COPY
	} from '$lib/case/p103NavigationOperatorCopy';
	import {
		P118_NAVIGATION_CASE_MISMATCH_COPY,
		P118_NAVIGATION_INVALID_REFERENCE_COPY,
		P118_NAVIGATION_LOADING_COPY,
		P118_NAVIGATION_MISSING_CASE_COPY,
		P118_NAVIGATION_PREFETCH_FAILED_COPY,
		P118_NAVIGATION_RECORD_UNAVAILABLE_COPY,
		P118_NAVIGATION_UNKNOWN_KIND_COPY,
		P118_NAVIGATION_UNSUPPORTED_KIND_COPY,
		P118_NAVIGATION_WORKFLOW_ITEM_COPY
	} from '$lib/case/p118NavigationOperatorCopy';
	import Spinner from '$lib/components/common/Spinner.svelte';

	export let caseId: string;
	export let caseEngineToken: string;

	let question = '';
	/** P114-04: Explicit UI-only fields — not derived from the question text. */
	let filterTypeToken = '';
	let filterOccurredAtFrom = '';
	let filterOccurredAtTo = '';
	let filterTagsCommaSeparated = '';
	let filterLocationText = '';
	/** P115-04: default off — operator must enable explicitly. */
	let includeRelationshipLinkedRecords = false;
	let loading = false;
	let clientError = '';
	let citationNavError = '';
	let envelope: CaseQueryResponseEnvelope | null = null;

	/** P118-04: Case Engine navigation results per citation key (no client-side route construction). */
	let citationNavByKey: Record<string, CitationNavigationResult | 'loading'> = {};
	let citationNavPrefetchError = '';
	let citationPrefetchGen = 0;

	/** Monotonic guard: ignore slow responses from a previous case or superseded request. */
	let requestGeneration = 0;
	let activeCaseKey = '';

	function resetForCase(nextId: string): void {
		question = '';
		filterTypeToken = '';
		filterOccurredAtFrom = '';
		filterOccurredAtTo = '';
		filterTagsCommaSeparated = '';
		filterLocationText = '';
		includeRelationshipLinkedRecords = false;
		loading = false;
		clientError = '';
		citationNavError = '';
		envelope = null;
		citationNavByKey = {};
		citationNavPrefetchError = '';
		citationPrefetchGen += 1;
		requestGeneration += 1;
		activeCaseKey = nextId;
	}

	$: if (caseId && caseId !== activeCaseKey) {
		resetForCase(caseId);
	}

	onDestroy(() => {
		requestGeneration += 1;
	});

	$: structuredFiltersPayload = structuredFiltersFromUiFields({
		typeToken: filterTypeToken,
		occurredAtFrom: filterOccurredAtFrom,
		occurredAtTo: filterOccurredAtTo,
		tagsCommaSeparated: filterTagsCommaSeparated,
		locationText: filterLocationText
	});
	$: structuredFiltersActive =
		structuredFiltersPayload != null && hasActiveStructuredFiltersUi(structuredFiltersPayload);

	function clearStructuredFilters(): void {
		filterTypeToken = '';
		filterOccurredAtFrom = '';
		filterOccurredAtTo = '';
		filterTagsCommaSeparated = '';
		filterLocationText = '';
	}

	async function prefetchCitationNavigations(env: CaseQueryResponseEnvelope): Promise<void> {
		if (!caseEngineToken || !caseId) return;
		const gen = ++citationPrefetchGen;
		const myCase = caseId;
		const envCase = env.case_id;
		citationNavPrefetchError = '';
		const initial: Record<string, CitationNavigationResult | 'loading'> = {};
		for (const c of env.citations) {
			initial[citationStableKey(c)] = 'loading';
		}
		citationNavByKey = initial;
		try {
			for (const c of env.citations) {
				if (gen !== citationPrefetchGen || myCase !== caseId) return;
				const k = citationStableKey(c);
				const nav = await postCaseCitationNavigation(myCase, caseEngineToken, {
					citation: c,
					enforce_envelope_case_id: envCase
				});
				if (gen !== citationPrefetchGen || myCase !== caseId) return;
				citationNavByKey = { ...citationNavByKey, [k]: nav };
			}
		} catch (e: unknown) {
			if (gen !== citationPrefetchGen || myCase !== caseId) return;
			citationNavPrefetchError =
				e instanceof Error ? e.message : P118_NAVIGATION_PREFETCH_FAILED_COPY;
		}
	}

	async function submitQuery(): Promise<void> {
		const q = question.trim();
		clientError = '';
		citationNavError = '';
		if (!q) {
			clientError = 'Enter a question.';
			return;
		}
		if (!caseEngineToken) {
			clientError = 'Case Engine session is required.';
			return;
		}
		const myCase = caseId;
		const gen = ++requestGeneration;
		loading = true;
		envelope = null;
		citationNavByKey = {};
		citationNavPrefetchError = '';
		try {
			const filters = structuredFiltersFromUiFields({
				typeToken: filterTypeToken,
				occurredAtFrom: filterOccurredAtFrom,
				occurredAtTo: filterOccurredAtTo,
				tagsCommaSeparated: filterTagsCommaSeparated,
				locationText: filterLocationText
			});
			const res = await postCaseQuery(myCase, caseEngineToken, {
				question: q,
				...(filters ? { filters } : {}),
				...(includeRelationshipLinkedRecords ? { include_relationship_linked_records: true } : {})
			});
			if (gen !== requestGeneration || myCase !== caseId) return;
			if (!caseQueryResponseMatchesActiveCase(res.case_id, caseId)) {
				envelope = null;
				clientError =
					'Case Engine response did not match this case. Nothing was shown. Try again or reload the case.';
				return;
			}
			envelope = res;
			void prefetchCitationNavigations(res);
		} catch (e: unknown) {
			if (gen !== requestGeneration || myCase !== caseId) return;
			envelope = null;
			clientError = e instanceof Error ? e.message : 'Request failed.';
		} finally {
			if (gen === requestGeneration && myCase === caseId) loading = false;
		}
	}

	$: statusClass =
		envelope == null
			? ''
			: envelope.status === 'ok'
				? 'ce-l-case-query-status--ok'
				: envelope.status === 'degraded'
					? 'ce-l-case-query-status--degraded'
					: envelope.status === 'refused'
						? 'ce-l-case-query-status--refused'
						: 'ce-l-case-query-status--error';

	function citationStableKey(c: CaseQueryCitation): string {
		if (c.kind === 'case_read_model') {
			return `case_read_model:${c.id}:${c.read_surface}`;
		}
		if (c.kind === 'case_file' && c.text_span) {
			return `case_file:${c.id}:${c.text_span.start}:${c.text_span.end}`;
		}
		return `${c.kind}:${c.id}`;
	}

	function unavailableNavigationCopy(
		r: Extract<CitationNavigationResult, { ok: false }>
	): string {
		const code = r.unavailable.reason_code;
		if (code === 'UNSUPPORTED_CITATION_KIND') {
			return P118_NAVIGATION_WORKFLOW_ITEM_COPY;
		}
		if (code === 'RECORD_NOT_AVAILABLE') {
			return P118_NAVIGATION_RECORD_UNAVAILABLE_COPY;
		}
		if (code === 'UNKNOWN_RECORD_KIND') {
			return P118_NAVIGATION_UNKNOWN_KIND_COPY;
		}
		if (code === 'INVALID_CITATION') {
			return P118_NAVIGATION_INVALID_REFERENCE_COPY;
		}
		if (code === 'MISSING_CASE_CONTEXT') {
			return P118_NAVIGATION_MISSING_CASE_COPY;
		}
		if (code === 'CASE_ID_MISMATCH') {
			return P118_NAVIGATION_CASE_MISMATCH_COPY;
		}
		return P118_NAVIGATION_UNSUPPORTED_KIND_COPY;
	}

	type CitationNavUi =
		| { kind: 'loading' }
		| { kind: 'prefetch_error' }
		| { kind: 'navigable' }
		| { kind: 'unavailable'; detail: string };

	function citationNavUi(c: CaseQueryCitation): CitationNavUi {
		if (!envelope) return { kind: 'loading' };
		if (citationNavPrefetchError) {
			return { kind: 'prefetch_error' };
		}
		const k = citationStableKey(c);
		const r = citationNavByKey[k];
		if (r === undefined || r === 'loading') {
			return { kind: 'loading' };
		}
		if (r.ok) {
			return { kind: 'navigable' };
		}
		return { kind: 'unavailable', detail: unavailableNavigationCopy(r) };
	}

	async function openCitationFromQuery(c: CaseQueryCitation): Promise<void> {
		if (!envelope) return;
		citationNavError = '';
		const k = citationStableKey(c);
		const r = citationNavByKey[k];
		if (r === undefined || r === 'loading' || !r.ok) return;
		const res = await navigateFromCitationNavigationResult(r, caseId);
		if (!res.ok) {
			citationNavError =
				res.reason === 'CASE_ID_MISMATCH'
					? P103_QUERY_NAVIGATION_CASE_MISMATCH_COPY
					: P103_QUERY_NAVIGATION_FAILED_COPY;
		}
	}

	/** P113-03: Pairwise transparency rows for `ok` when backend sends aligned facts + citations. */
	function showRetrievalTransparency(e: CaseQueryResponseEnvelope): boolean {
		return e.status === 'ok' && referentialFactsCitationsAligned(e.referential_facts, e.citations);
	}

	function transparencyPairwiseMismatch(e: CaseQueryResponseEnvelope): boolean {
		return (
			e.status === 'ok' &&
			Array.isArray(e.referential_facts) &&
			e.referential_facts.length > 0 &&
			e.referential_facts.length !== e.citations.length
		);
	}
</script>

<div
	class="ce-l-case-query-panel rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/40 p-4"
	data-testid="case-query-panel"
	data-case-query-case-id={caseId}
>
	<h2 class="text-sm font-semibold text-gray-900 dark:text-gray-100">Case query</h2>
	<p class="text-xs text-gray-600 dark:text-gray-400 mt-1" data-testid="case-query-scope-copy">
		{P102_CASE_QUERY_SCOPE_COPY}
	</p>

	<div class="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
		<label class="flex-1 flex flex-col gap-1 min-w-0">
			<span class="text-xs font-medium text-gray-700 dark:text-gray-300">Question</span>
			<textarea
				class="ce-l-case-query-input w-full min-h-[88px] rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-950 px-2 py-1.5 text-sm"
				placeholder="Ask about facts in this case…"
				bind:value={question}
				disabled={loading}
				data-testid="case-query-question-input"
			/>
		</label>
		<button
			type="button"
			class="shrink-0 rounded px-3 py-2 text-sm font-medium bg-gray-800 text-white hover:bg-gray-700 disabled:opacity-50 dark:bg-gray-200 dark:text-gray-900 dark:hover:bg-white"
			disabled={loading || !caseEngineToken}
			on:click={() => void submitQuery()}
			data-testid="case-query-submit"
		>
			{#if loading}
				<span class="inline-flex items-center gap-2"><Spinner className="w-4 h-4" /> Running…</span>
			{:else}
				Run query
			{/if}
		</button>
	</div>

	<div
		class="mt-4 rounded border border-gray-200 dark:border-gray-600 p-3 space-y-3"
		data-testid="case-query-structured-filters"
	>
		<div class="flex flex-wrap items-center justify-between gap-2">
			<div>
				<div class="text-xs font-medium text-gray-800 dark:text-gray-200">Structured filters (optional)</div>
				<p class="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
					Explicit limits only. Values are sent to Case Engine as entered; the engine validates them. All set fields
					apply together (AND).
				</p>
			</div>
			{#if structuredFiltersActive}
				<span
					class="text-xs font-medium text-gray-800 dark:text-gray-200"
					data-testid="case-query-filters-active-indicator"
				>
					Structured filters: active
				</span>
			{/if}
		</div>
		<div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
			<label class="flex flex-col gap-1 min-w-0 sm:col-span-2">
				<span class="text-xs font-medium text-gray-700 dark:text-gray-300">Timeline entry type (token)</span>
				<input
					type="text"
					class="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-950 px-2 py-1.5 text-sm font-mono"
					placeholder="e.g. OBSERVATION"
					autocomplete="off"
					spellcheck="false"
					bind:value={filterTypeToken}
					disabled={loading}
					data-testid="case-query-filter-type"
				/>
			</label>
			<label class="flex flex-col gap-1 min-w-0">
				<span class="text-xs font-medium text-gray-700 dark:text-gray-300">Occurred at from</span>
				<input
					type="text"
					class="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-950 px-2 py-1.5 text-sm font-mono"
					placeholder="2024-06-15T00:00:00.000Z"
					autocomplete="off"
					spellcheck="false"
					bind:value={filterOccurredAtFrom}
					disabled={loading}
					data-testid="case-query-filter-occurred-from"
				/>
			</label>
			<label class="flex flex-col gap-1 min-w-0">
				<span class="text-xs font-medium text-gray-700 dark:text-gray-300">Occurred at to</span>
				<input
					type="text"
					class="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-950 px-2 py-1.5 text-sm font-mono"
					placeholder="2024-06-16T23:59:59.000Z"
					autocomplete="off"
					spellcheck="false"
					bind:value={filterOccurredAtTo}
					disabled={loading}
					data-testid="case-query-filter-occurred-to"
				/>
			</label>
			<label class="flex flex-col gap-1 min-w-0 sm:col-span-2">
				<span class="text-xs font-medium text-gray-700 dark:text-gray-300">Tags (comma-separated)</span>
				<input
					type="text"
					class="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-950 px-2 py-1.5 text-sm"
					placeholder="tag-one, tag-two"
					autocomplete="off"
					bind:value={filterTagsCommaSeparated}
					disabled={loading}
					data-testid="case-query-filter-tags"
				/>
			</label>
			<label class="flex flex-col gap-1 min-w-0 sm:col-span-2">
				<span class="text-xs font-medium text-gray-700 dark:text-gray-300">Location text (exact)</span>
				<input
					type="text"
					class="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-950 px-2 py-1.5 text-sm"
					placeholder="Exact value to match stored location"
					autocomplete="off"
					bind:value={filterLocationText}
					disabled={loading}
					data-testid="case-query-filter-location"
				/>
			</label>
		</div>
		<button
			type="button"
			class="text-xs font-medium text-gray-700 dark:text-gray-300 underline decoration-gray-400 hover:text-gray-900 dark:hover:text-white"
			disabled={loading}
			on:click={clearStructuredFilters}
			data-testid="case-query-filters-clear"
		>
			Clear structured filters
		</button>
	</div>

	<div
		class="mt-4 rounded border border-gray-200 dark:border-gray-600 p-3 space-y-2"
		data-testid="case-query-relationship-linked-toggle-section"
	>
		<label class="flex items-start gap-2 cursor-pointer">
			<input
				type="checkbox"
				class="mt-1"
				bind:checked={includeRelationshipLinkedRecords}
				disabled={loading}
				data-testid="case-query-include-relationship-linked"
			/>
			<span class="text-sm text-gray-800 dark:text-gray-200">
				<span class="font-medium">Include relationship-linked records</span>
				<span class="block text-xs text-gray-600 dark:text-gray-400 mt-0.5">
					When enabled, Case Engine may include rows reached by explicit same-case relationships (one hop). Linked
					inclusions are not direct query matches.
				</span>
			</span>
		</label>
	</div>

	{#if !caseEngineToken}
		<p class="mt-3 text-sm text-amber-800 dark:text-amber-200" data-testid="case-query-no-token">
			Case Engine session is required for this case.
		</p>
	{/if}

	{#if clientError}
		<p class="mt-3 text-sm text-red-700 dark:text-red-300" data-testid="case-query-client-error" role="alert">
			{clientError}
		</p>
	{/if}

	{#if envelope}
		<div
			class="mt-4 rounded border p-3 {statusClass}"
			data-testid="case-query-result"
			data-case-query-status={envelope.status}
			data-case-query-result-case-id={envelope.case_id}
		>
			<div class="text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-400">Result</div>
			<p class="mt-1 text-sm font-medium" data-testid="case-query-status-label">
				Status: {envelope.status}
			</p>
			<p class="mt-0.5 text-xs text-gray-600 dark:text-gray-400" data-testid="case-query-status-headline">
				{caseQueryStatusHeadline(envelope.status)}
			</p>
			{#if envelope.message}
				<p class="mt-1 text-sm text-gray-800 dark:text-gray-200" data-testid="case-query-message">
					{envelope.message}
				</p>
			{/if}
			{#if envelope.reason_code}
				<p class="mt-1 text-xs font-mono text-gray-700 dark:text-gray-300" data-testid="case-query-reason-code">
					Reason code: {envelope.reason_code}
				</p>
			{/if}

			{#if transparencyPairwiseMismatch(envelope)}
				<p
					class="mt-3 text-sm text-red-700 dark:text-red-300"
					data-testid="case-query-transparency-mismatch"
					role="alert"
				>
					Referential facts and citations are not aligned; pairwise retrieval transparency cannot be shown.
				</p>
			{/if}

			{#if showRetrievalTransparency(envelope)}
				<div class="mt-3" data-testid="case-query-retrieval-transparency">
					<div class="text-xs font-medium text-gray-600 dark:text-gray-400">
						{P113_CASE_QUERY_RETRIEVAL_TRANSPARENCY_TITLE}
					</div>
					<p
						class="mt-1 text-xs text-gray-600 dark:text-gray-400"
						data-testid="case-query-retrieval-framing"
					>
						{P113_CASE_QUERY_RETRIEVAL_TRANSPARENCY_FRAMING}
					</p>
					<ul class="mt-2 space-y-3 list-none pl-0">
						{#each envelope.referential_facts as fact, i (fact.source_type + '-' + fact.source_id + '-' + fact.field_name + '-' + i)}
							{@const sup = envelope.citations[i]}
							{@const ui = sup ? citationNavUi(sup) : null}
							<li
								class="rounded border border-gray-200 dark:border-gray-600 p-2 text-sm"
								data-testid="case-query-transparency-row"
								data-transparency-index={i}
							>
								{#if envelope.trace.relationship_retrieval}
									<p
										class="mb-2 text-xs text-gray-700 dark:text-gray-300"
										data-testid="case-query-fact-inclusion-provenance"
										data-inclusion-label={referentialFactInclusionLabel(fact, envelope.trace)}
									>
										<span class="font-medium text-gray-800 dark:text-gray-200">Inclusion:</span>
										<span class="ml-1 font-mono">{referentialFactInclusionLabel(fact, envelope.trace)}</span>
									</p>
								{/if}
								<dl class="grid grid-cols-1 gap-1 sm:grid-cols-2 text-xs sm:text-sm">
									<div>
										<span class="text-gray-500 dark:text-gray-400">source_type</span>
										<span class="ml-1 font-mono">{fact.source_type}</span>
									</div>
									<div>
										<span class="text-gray-500 dark:text-gray-400">source_id</span>
										<span class="ml-1 font-mono">{fact.source_id}</span>
									</div>
									<div>
										<span class="text-gray-500 dark:text-gray-400">field_name</span>
										<span class="ml-1 font-mono">{fact.field_name}</span>
									</div>
									<div class="sm:col-span-2">
										<span class="text-gray-500 dark:text-gray-400">value</span>
										<span class="ml-1 font-mono whitespace-pre-wrap break-words">{fact.value ?? ''}</span>
									</div>
								</dl>
								{#if sup}
									<div
										class="mt-2 text-xs text-gray-600 dark:text-gray-400"
										data-testid="case-query-transparency-support"
									>
										<span class="font-medium text-gray-700 dark:text-gray-300">Cited support</span>
										<span class="ml-1 font-mono">{formatCaseQueryCitationLabel(sup)}</span>
									</div>
									{#if ui?.kind === 'navigable'}
										<div class="mt-2">
											<button
												type="button"
												class="rounded px-2 py-1 text-xs font-medium bg-gray-800 text-white hover:bg-gray-700 dark:bg-gray-200 dark:text-gray-900 dark:hover:bg-white"
												data-testid="case-query-transparency-open"
												aria-label="Open cited record for this citation"
												on:click={() => void openCitationFromQuery(sup)}
											>
												Open record
											</button>
										</div>
									{:else if ui?.kind === 'loading'}
										<p class="mt-2 text-xs text-gray-600 dark:text-gray-400" data-testid="case-query-transparency-citation-loading">
											{P118_NAVIGATION_LOADING_COPY}
										</p>
									{:else if ui?.kind === 'prefetch_error'}
										<p
											class="mt-2 text-xs text-red-700 dark:text-red-300"
											data-testid="case-query-transparency-citation-prefetch-error"
											role="alert"
										>
											{citationNavPrefetchError}
										</p>
									{:else if ui?.kind === 'unavailable'}
										<p
											class="mt-2 text-xs text-gray-600 dark:text-gray-400"
											data-testid="case-query-transparency-citation-unavailable"
										>
											{ui.detail}
										</p>
									{/if}
								{/if}
							</li>
						{/each}
					</ul>
				</div>
				<details class="mt-3 rounded border border-dashed border-gray-300 dark:border-gray-600 p-2 text-xs text-gray-500">
					<summary class="cursor-pointer">Canonical payload (JSON)</summary>
					<pre
						class="mt-2 whitespace-pre-wrap text-xs font-mono text-gray-700 dark:text-gray-300"
						data-testid="case-query-answer-debug">{envelope.answer}</pre>
				</details>
			{:else if envelope.answer}
				<div class="mt-3" data-testid="case-query-answer">
					<div class="text-xs font-medium text-gray-600 dark:text-gray-400">Answer</div>
					<pre
						class="mt-1 whitespace-pre-wrap text-sm text-gray-900 dark:text-gray-100 font-sans">{envelope.answer}</pre>
				</div>
			{:else if envelope.status === 'ok'}
				<p class="mt-2 text-sm text-amber-800 dark:text-amber-200" data-testid="case-query-missing-answer">
					No answer text returned for an ok status — treat as unsupported presentation.
				</p>
			{/if}

			{#if envelope.citations.length > 0 && !showRetrievalTransparency(envelope)}
				<div class="mt-3" data-testid="case-query-citations">
					<div class="text-xs font-medium text-gray-600 dark:text-gray-400">Citations</div>
					{#if citationNavError}
						<p
							class="mt-2 text-sm text-red-700 dark:text-red-300"
							data-testid="case-query-citation-nav-error"
							role="alert"
						>
							{citationNavError}
						</p>
					{/if}
					<ul class="mt-1 space-y-2 list-none pl-0">
						{#each envelope.citations as c, i (i + '-' + c.kind + '-' + c.id)}
							{@const ui = citationNavUi(c)}
							<li
								class="rounded border border-gray-200 dark:border-gray-600 p-2 text-sm"
								data-testid="case-query-citation-row"
								data-citation-kind={c.kind}
							>
								<div class="font-mono text-xs text-gray-700 dark:text-gray-300">
									{formatCaseQueryCitationLabel(c)}
								</div>
								{#if 'excerpt' in c && c.excerpt}
									<div class="mt-1 text-gray-800 dark:text-gray-200">{c.excerpt}</div>
								{/if}
								{#if c.kind === 'case_file' && c.text_span}
									<div class="mt-1 text-xs font-mono text-gray-600 dark:text-gray-400">
										Span: {c.text_span.start}–{c.text_span.end}
									</div>
								{/if}
								{#if ui.kind === 'navigable'}
									<div class="mt-2">
										<button
											type="button"
											class="rounded px-2 py-1 text-xs font-medium bg-gray-800 text-white hover:bg-gray-700 dark:bg-gray-200 dark:text-gray-900 dark:hover:bg-white"
											data-testid="case-query-citation-open"
											aria-label="Open cited record for this citation"
											on:click={() => void openCitationFromQuery(c)}
										>
											Open record
										</button>
									</div>
								{:else if ui.kind === 'loading'}
									<p class="mt-2 text-xs text-gray-600 dark:text-gray-400" data-testid="case-query-citation-loading">
										{P118_NAVIGATION_LOADING_COPY}
									</p>
								{:else if ui.kind === 'prefetch_error'}
									<p
										class="mt-2 text-xs text-red-700 dark:text-red-300"
										data-testid="case-query-citation-prefetch-error"
										role="alert"
									>
										{citationNavPrefetchError}
									</p>
								{:else if ui.kind === 'unavailable'}
									<p class="mt-2 text-xs text-gray-600 dark:text-gray-400" data-testid="case-query-citation-unavailable">
										{ui.detail}
									</p>
								{/if}
							</li>
						{/each}
					</ul>
				</div>
			{/if}

			<div class="mt-3" data-testid="case-query-trace">
				<div class="text-xs font-medium text-gray-600 dark:text-gray-400">Trace</div>
				{#if envelope.trace.structured_filters && Object.keys(envelope.trace.structured_filters).length > 0}
					<div class="mt-2" data-testid="case-query-trace-structured-filters">
						<div class="text-xs text-gray-600 dark:text-gray-400">Structured filters applied (from Case Engine)</div>
						<pre
							class="mt-1 whitespace-pre-wrap text-xs font-mono text-gray-800 dark:text-gray-200 rounded border border-gray-200 dark:border-gray-600 p-2"
						>{JSON.stringify(envelope.trace.structured_filters)}</pre>
					</div>
				{/if}
				{#if envelope.trace.relationship_retrieval}
					<div class="mt-2" data-testid="case-query-trace-relationship-retrieval">
						<div class="text-xs text-gray-600 dark:text-gray-400">Relationship-linked retrieval (from Case Engine)</div>
						<pre
							class="mt-1 whitespace-pre-wrap text-xs font-mono text-gray-800 dark:text-gray-200 rounded border border-gray-200 dark:border-gray-600 p-2"
						>{JSON.stringify(envelope.trace.relationship_retrieval)}</pre>
					</div>
				{/if}
				<p class="mt-1 text-sm text-gray-800 dark:text-gray-200">
					Support coverage: <span class="font-mono">{envelope.trace.support_coverage}</span>
				</p>
				{#if envelope.trace.reason_code}
					<p class="text-xs font-mono text-gray-700 dark:text-gray-300">
						Trace reason: {envelope.trace.reason_code}
					</p>
				{/if}
				{#if envelope.trace.contract_violation}
					<p class="text-xs font-mono text-gray-700 dark:text-gray-300" data-testid="case-query-trace-contract-violation">
						Contract violation: {envelope.trace.contract_violation}
					</p>
				{/if}
				{#if envelope.trace.supporting_record_refs.length > 0}
					<ul class="mt-2 space-y-1 list-none pl-0 text-sm text-gray-800 dark:text-gray-200">
						{#each envelope.trace.supporting_record_refs as r, j (j + '-' + r.kind + '-' + r.id)}
							<li class="font-mono text-xs">{formatCaseQueryCitationLabel(r)}</li>
						{/each}
					</ul>
				{/if}
			</div>
		</div>
	{/if}
</div>

<style>
	.ce-l-case-query-status--ok {
		border-color: rgb(16 185 129 / 0.45);
		background: rgb(16 185 129 / 0.06);
	}
	:global(.dark) .ce-l-case-query-status--ok {
		background: rgb(16 185 129 / 0.1);
	}
	.ce-l-case-query-status--degraded {
		border-color: rgb(245 158 11 / 0.55);
		background: rgb(245 158 11 / 0.08);
	}
	:global(.dark) .ce-l-case-query-status--degraded {
		background: rgb(245 158 11 / 0.12);
	}
	.ce-l-case-query-status--refused {
		border-color: rgb(249 115 22 / 0.55);
		background: rgb(249 115 22 / 0.08);
	}
	:global(.dark) .ce-l-case-query-status--refused {
		background: rgb(249 115 22 / 0.12);
	}
	.ce-l-case-query-status--error {
		border-color: rgb(239 68 68 / 0.55);
		background: rgb(239 68 68 / 0.06);
	}
	:global(.dark) .ce-l-case-query-status--error {
		background: rgb(239 68 68 / 0.12);
	}
</style>
