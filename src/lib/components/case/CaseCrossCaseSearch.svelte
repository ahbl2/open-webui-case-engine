<script lang="ts">
	import { goto } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import {
		askCrossCase,
		CaseEngineRequestError,
		downloadCaseFile,
		type AskCrossCaseResponse,
		type CrossCaseCitation
	} from '$lib/apis/caseEngine';
	import CaseEngineAskIntegrityBanner from '$lib/components/case/CaseEngineAskIntegrityBanner.svelte';
	import CaseEngineAskStructuredSections from '$lib/components/case/CaseEngineAskStructuredSections.svelte';
	import { normalizeAskFactInferenceArrays } from '$lib/utils/askIntegrityUi';
	import { caseEngineAuthState, caseEngineUser } from '$lib/stores';
	import { formatNonAdminScopeLabel, resolveAuthorizedUnits } from '$lib/utils/crossCaseScope';

	export let token: string;

	const TOPK_OPTIONS = [6, 8, 10, 12, 16, 20] as const;
	let question = '';
	let topK = 10;
	let unitScope: 'CID' | 'SIU' | 'ALL' = 'CID';
	let asking = false;
	let result: AskCrossCaseResponse | null = null;
	let errorMessage = '';
	let integrityRefusalMessage = '';
	let parseErrorCitations: CrossCaseCitation[] = [];
	let citationModal: CrossCaseCitation | null = null;

	$: authRole = String($caseEngineAuthState?.user?.role ?? '').toLowerCase();
	$: isAdmin = $caseEngineUser?.role === 'ADMIN' || authRole === 'admin';
	$: authorizedUnits = resolveAuthorizedUnits($caseEngineAuthState?.user?.units);
	$: nonAdminScopeLabel = formatNonAdminScopeLabel(authorizedUnits);

	function confidenceClass(c: 'LOW' | 'MEDIUM' | 'HIGH') {
		if (c === 'LOW') return 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200';
		if (c === 'MEDIUM') return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200';
		return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200';
	}

	function citationKey(c: CrossCaseCitation): string {
		return c.source_type === 'timeline_entry' ? `TE:${c.id}` : `CF:${c.id}`;
	}

	function groupByCase(citations: CrossCaseCitation[]): Map<string, { caseId: string; cites: CrossCaseCitation[] }> {
		const map = new Map<string, { caseId: string; cites: CrossCaseCitation[] }>();
		for (const c of citations) {
			const key = c.case_number;
			if (!map.has(key)) map.set(key, { caseId: c.case_id, cites: [] });
			map.get(key)!.cites.push(c);
		}
		return map;
	}

	async function handleAsk() {
		const q = question.trim();
		if (q.length < 3) {
			toast.error('Question must be at least 3 characters');
			return;
		}
		if (q.length > 2000) {
			toast.error('Question must not exceed 2000 characters');
			return;
		}
		asking = true;
		errorMessage = '';
		integrityRefusalMessage = '';
		parseErrorCitations = [];
		result = null;
		try {
			result = await askCrossCase(q, token, {
				topK,
				unitScope: isAdmin ? unitScope : undefined
			});
		} catch (e: unknown) {
			if (e instanceof CaseEngineRequestError && e.errorCode === 'ASK_INTEGRITY_REFUSED') {
				integrityRefusalMessage = e.message;
				errorMessage = '';
				parseErrorCitations = [];
				toast.error(integrityRefusalMessage);
			} else {
				const err = e as Error & { citations?: CrossCaseCitation[] };
				errorMessage = err?.message ?? 'Ask failed';
				if (err?.citations) parseErrorCitations = err.citations;
				toast.error(errorMessage);
			}
		} finally {
			asking = false;
		}
	}

	async function handleOpenFile(c: CrossCaseCitation) {
		if (c.source_type !== 'case_file') return;
		try {
			await downloadCaseFile(c.id, c.filename, token);
		} catch (e) {
			toast.error((e as Error)?.message ?? 'Download failed');
		}
	}
</script>

<div class="flex flex-col gap-4 p-4">
	<h2 class="text-sm font-medium">Unit Search</h2>
	<p class="text-xs text-gray-600 dark:text-gray-400">
		Search across all cases in your unit. Ask questions like "Which cases mention 502-555-1234?"
	</p>

	<div>
		<label class="block text-xs text-gray-600 dark:text-gray-400 mb-1">Question</label>
		<textarea
			bind:value={question}
			placeholder="e.g. Where does 502-555-1234 appear?"
			class="w-full rounded border border-gray-200 dark:border-gray-700 bg-transparent p-2 text-sm min-h-[100px]"
			disabled={asking}
		></textarea>
	</div>

	<div class="flex flex-wrap gap-2 items-center">
		<label class="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
			TopK:
			<select
				bind:value={topK}
				class="rounded border border-gray-200 dark:border-gray-700 bg-transparent px-1.5 py-0.5 text-sm"
				disabled={asking}
			>
				{#each TOPK_OPTIONS as opt}
					<option value={opt}>{opt}</option>
				{/each}
			</select>
		</label>
		{#if isAdmin}
			<label class="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
				Scope:
				<select
					bind:value={unitScope}
					class="rounded border border-gray-200 dark:border-gray-700 bg-transparent px-1.5 py-0.5 text-sm"
					disabled={asking}
				>
					<option value="CID">CID only</option>
					<option value="SIU">SIU only</option>
					<option value="ALL">All units</option>
				</select>
			</label>
		{:else}
			<span class="text-xs text-gray-500">Scope: {nonAdminScopeLabel}</span>
		{/if}
		<button
			type="button"
			class="rounded bg-blue-600 text-white px-3 py-1.5 text-sm hover:bg-blue-700 disabled:opacity-50"
			on:click={handleAsk}
			disabled={asking || !question.trim()}
		>
			{asking ? 'Searching…' : 'Ask'}
		</button>
	</div>

	{#if integrityRefusalMessage}
		<div
			class="rounded border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/40 p-3 text-sm text-amber-950 dark:text-amber-50"
			data-ask-integrity-refusal=""
			role="alert"
		>
			<p class="text-xs font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-200">
				Integrity refusal
			</p>
			<p class="mt-2 whitespace-pre-wrap">{integrityRefusalMessage}</p>
		</div>
	{/if}
	{#if errorMessage}
		<div class="rounded border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-2 text-sm text-red-700 dark:text-red-300">
			{errorMessage}
		</div>
		{#if parseErrorCitations.length > 0}
			<div class="text-xs text-gray-600 dark:text-gray-400">Retrieved context (not used):</div>
			<div class="space-y-1 max-h-32 overflow-y-auto">
				{#each parseErrorCitations as c (citationKey(c))}
					<button
						type="button"
						class="block w-full text-left rounded border border-gray-200 dark:border-gray-700 p-1.5 text-xs hover:bg-gray-50 dark:hover:bg-gray-800"
						on:click={() => (citationModal = c)}
					>
						{c.case_number} — {c.source_type === 'timeline_entry' ? c.occurred_at : c.filename}: {c.snippet.slice(0, 50)}…
					</button>
				{/each}
			</div>
		{/if}
	{/if}

	{#if result}
		{@const normalized = normalizeAskFactInferenceArrays(result.facts, result.inferences)}
		<div class="space-y-4">
			<div class="rounded border border-gray-200 dark:border-gray-700 p-3 text-sm bg-gray-50 dark:bg-gray-800/50 space-y-3">
				<CaseEngineAskIntegrityBanner integrityPresentation={result.integrityPresentation} />
				<div class="whitespace-pre-wrap">{result.answer}</div>
				<div class="mt-2">
					<span
						class="inline-block rounded px-2 py-0.5 text-xs font-medium {confidenceClass(result.confidence)}"
					>
						{result.confidence}
					</span>
				</div>
			</div>
			<CaseEngineAskStructuredSections facts={normalized.facts} inferences={normalized.inferences} />

			{#if result.used_citations.length > 0}
				<div>
					<h3 class="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">Citations by case</h3>
					{#each [...groupByCase(result.used_citations)] as [caseNum, { caseId, cites }]}
						<div class="mb-3">
							<div class="flex items-center gap-2 mb-1">
								<span class="text-sm font-medium text-gray-700 dark:text-gray-300">{caseNum}</span>
								<button
									type="button"
									class="text-xs text-blue-600 dark:text-blue-400 underline hover:no-underline"
									on:click={() => goto(`/case/${caseId}/chat`)}
								>
									Open Case
								</button>
							</div>
							<div class="space-y-1 pl-2 border-l-2 border-gray-200 dark:border-gray-600">
								{#each cites as c (citationKey(c))}
									<button
										type="button"
										class="block w-full text-left rounded p-2 text-xs hover:bg-gray-50 dark:hover:bg-gray-800"
										on:click={() => (citationModal = c)}
									>
										{#if c.source_type === 'timeline_entry'}
											<div class="text-gray-600 dark:text-gray-400">
												Occurred: {c.occurred_at}
											</div>
											<div class="text-gray-800 dark:text-gray-200 mt-0.5 truncate">
												"{c.snippet}"
											</div>
										{:else}
											<div class="text-gray-600 dark:text-gray-400">
												{c.filename}
												<button
													type="button"
													class="ml-2 text-blue-600 dark:text-blue-400 underline hover:no-underline"
													on:click={(e) => {
														e.stopPropagation();
														handleOpenFile(c);
													}}
												>
													Open file
												</button>
											</div>
											<div class="text-gray-800 dark:text-gray-200 mt-0.5 truncate">
												"{c.snippet}"
											</div>
										{/if}
									</button>
								{/each}
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	{/if}
</div>

{#if citationModal}
	<div
		class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
		role="dialog"
		aria-modal="true"
		on:click={() => (citationModal = null)}
		on:keydown={(e) => e.key === 'Escape' && (citationModal = null)}
	>
		<div
			class="rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-4 max-w-lg max-h-[80vh] overflow-y-auto shadow-xl"
			on:click|stopPropagation
			role="document"
		>
			<h3 class="text-sm font-medium mb-2">
				{citationModal.case_number} — {citationModal.source_type === 'timeline_entry' ? 'Timeline' : citationModal.filename}
			</h3>
			{#if citationModal.source_type === 'timeline_entry'}
				<div class="text-xs text-gray-500 mb-2">Occurred: {citationModal.occurred_at}</div>
			{/if}
			<div class="text-xs text-gray-500 mb-2 font-mono">{citationKey(citationModal)}</div>
			<div class="text-sm whitespace-pre-wrap border-t border-gray-200 dark:border-gray-700 pt-2">
				{citationModal.snippet}
			</div>
			<div class="mt-4 flex justify-end">
				<button
					type="button"
					class="rounded border border-gray-300 dark:border-gray-600 px-2 py-1 text-sm hover:bg-gray-100 dark:hover:bg-gray-800"
					on:click={() => (citationModal = null)}
				>
					Close
				</button>
			</div>
		</div>
	</div>
{/if}
