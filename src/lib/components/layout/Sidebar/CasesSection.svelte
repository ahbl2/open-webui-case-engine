<script lang="ts">
	import {
		caseEngineToken,
		activeCaseId,
		activeCaseNumber,
		unitFilter,
		caseContext,
		aiCaseContext
	} from '$lib/stores';
	import { listCasesSidebar, getCaseContext, getCaseAiContext, type CaseEngineCase } from '$lib/apis/caseEngine';
	import Folder from '$lib/components/common/Folder.svelte';
	import ConnectCaseEngineModal from './ConnectCaseEngineModal.svelte';

	let cases: CaseEngineCase[] = [];
	let casesLoading = false;
	let casesError = '';
	let searchQuery = '';
	let showConnectModal = false;
	let showCases = true;

	$: filteredCases = cases.filter((c) => {
		if ($unitFilter !== 'ALL' && c.unit !== $unitFilter) return false;
		if (!searchQuery.trim()) return true;
		const q = searchQuery.toLowerCase();
		return (
			(c.case_number ?? '').toLowerCase().includes(q) ||
			(c.title ?? '').toLowerCase().includes(q)
		);
	});

	async function loadCases() {
		const token = $caseEngineToken;
		if (!token) {
			cases = [];
			return;
		}
		casesLoading = true;
		casesError = '';
		try {
			cases = await listCasesSidebar(token);
		} catch (e: any) {
			casesError = e?.message ?? 'Failed to load cases';
			cases = [];
		} finally {
			casesLoading = false;
		}
	}

	$: if ($caseEngineToken) {
		loadCases();
	}

	$: if (!$caseEngineToken) {
		cases = [];
		caseContext.set(null);
		aiCaseContext.set(null);
	}

	/** Fetch context + ai-context for active case. Single path with stale-response guard. */
	async function fetchContextForActiveCase() {
		const requestedId = $activeCaseId;
		const token = $caseEngineToken;
		if (!requestedId || !token) return;
		try {
			const [ctx, aiCtx] = await Promise.all([
				getCaseContext(requestedId, token),
				getCaseAiContext(requestedId, token)
			]);
			if ($activeCaseId === requestedId) {
				caseContext.set(ctx);
				aiCaseContext.set(aiCtx ?? null);
			}
		} catch {
			if ($activeCaseId === requestedId) {
				caseContext.set(null);
				aiCaseContext.set(null);
			}
		}
	}

	// Ticket 7.1/8: Single reactive – fetch when activeCaseId set and context missing or stale
	$: if ($caseEngineToken && $activeCaseId && $caseContext?.case?.id !== $activeCaseId) {
		fetchContextForActiveCase();
	}

	function selectCase(c: CaseEngineCase) {
		activeCaseId.set(c.id);
		activeCaseNumber.set(c.case_number ?? null);
		// Reactive block will trigger fetchContextForActiveCase
	}

	$: activeCase = cases.find((c) => c.id === $activeCaseId);
</script>

<Folder
	id="sidebar-cases"
	bind:open={showCases}
	className="px-2 mt-0.5"
	name="Cases"
	chevron={false}
	dragAndDrop={false}
>
	<div class="flex flex-col gap-2 px-1">
		{#if !$caseEngineToken}
			<button
				type="button"
				class="rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition"
				on:click={() => (showConnectModal = true)}
			>
				Connect to Case Engine
			</button>
		{:else}
			<div class="flex items-center gap-1">
				<select
					bind:value={$unitFilter}
					class="flex-1 rounded border border-gray-200 dark:border-gray-700 bg-transparent px-2 py-1 text-xs"
				>
					<option value="ALL">ALL</option>
					<option value="CID">CID</option>
					<option value="SIU">SIU</option>
				</select>
				<input
					type="text"
					placeholder="Search..."
					bind:value={searchQuery}
					class="flex-1 rounded border border-gray-200 dark:border-gray-700 bg-transparent px-2 py-1 text-xs placeholder-gray-500"
				/>
			</div>
			{#if casesError}
				<div class="text-xs text-red-600 dark:text-red-400">{casesError}</div>
			{/if}
			{#if casesLoading}
				<div class="text-xs text-gray-500">Loading...</div>
			{:else}
				<div class="flex flex-col max-h-48 overflow-y-auto scrollbar-hidden space-y-0.5">
					{#each filteredCases as c (c.id)}
						<div
							class="flex items-center gap-1 rounded px-2 py-1.5 text-xs {c.id === $activeCaseId
								? 'bg-gray-100 dark:bg-gray-800'
								: ''}"
						>
							<button
								type="button"
								class="flex-1 text-left hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition min-w-0"
								on:click={() => selectCase(c)}
							>
								<span class="font-medium">{c.case_number ?? c.id}</span>
								<span class="block truncate text-gray-600 dark:text-gray-400">{c.title ?? ''}</span>
							</button>
							<a
								href="/case/{c.id}"
								class="shrink-0 text-blue-600 dark:text-blue-400 hover:underline px-1"
								title="View case files"
							>Files</a>
						</div>
					{/each}
					{#if filteredCases.length === 0}
						<div class="text-xs text-gray-500 py-2">No cases</div>
					{/if}
				</div>
			{/if}
			{#if activeCase}
				<div
					class="rounded-lg bg-gray-100 dark:bg-gray-800 px-2 py-1.5 text-xs font-medium"
				>
					Active Case: {activeCase.case_number}
				</div>
			{/if}
		{/if}
	</div>
</Folder>

<ConnectCaseEngineModal
	show={showConnectModal}
	on:close={() => (showConnectModal = false)}
	on:connected={async () => {
		showConnectModal = false;
		await loadCases();
	}}
/>
