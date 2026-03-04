<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount, onDestroy } from 'svelte';
	import { caseEngineToken, activeCaseId } from '$lib/stores';
	import { searchCases, type SearchResultItem } from '$lib/apis/caseEngine';

	type SearchScope = 'case' | 'unit' | 'all';

	let q = '';
	let scopeSelect: 'case' | 'CID' | 'SIU' | 'all' = 'case';
	let results: SearchResultItem[] = [];
	let searching = false;
	let showResults = false;
	let resultsContainer: HTMLElement;

	async function doSearch() {
		const token = $caseEngineToken;
		if (!token) return;
		const trimmed = q.trim();
		if (trimmed.length < 2) return;

		let scope: SearchScope;
		let caseId: string | undefined;
		let unit: 'CID' | 'SIU' | undefined;

		if (scopeSelect === 'case') {
			scope = 'case';
			caseId = $activeCaseId ?? undefined;
			if (!caseId) return;
		} else if (scopeSelect === 'CID' || scopeSelect === 'SIU') {
			scope = 'unit';
			unit = scopeSelect;
		} else {
			scope = 'all';
		}

		searching = true;
		showResults = true;
		try {
			const params: { q: string; scope: SearchScope; caseId?: string; unit?: 'CID' | 'SIU' } = {
				q: trimmed,
				scope
			};
			if (scope === 'case' && caseId) params.caseId = caseId;
			if (scope === 'unit' && unit) params.unit = unit;
			const res = await searchCases(params, token);
			results = res.results ?? [];
			dispatch('results', results);
		} catch {
			results = [];
		} finally {
			searching = false;
		}
	}

	function goToResult(r: SearchResultItem) {
		goto(`/case/${r.caseId}`);
		showResults = false;
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			doSearch();
		}
	}

	function handleClickOutside(e: MouseEvent) {
		if (resultsContainer && !resultsContainer.contains(e.target as Node)) {
			showResults = false;
		}
	}
	onMount(() => {
		document.addEventListener('click', handleClickOutside);
	});
	onDestroy(() => {
		document.removeEventListener('click', handleClickOutside);
	});
</script>

{#if $caseEngineToken}
	<div class="relative" bind:this={resultsContainer}>
		<div class="flex items-center gap-1 flex-wrap">
			<input
				type="text"
				bind:value={q}
				on:keydown={handleKeydown}
				placeholder="Search cases..."
				class="rounded border border-gray-200 dark:border-gray-700 bg-transparent px-2 py-1 text-xs w-28 sm:w-36 min-w-0"
			/>
			<select
				bind:value={scopeSelect}
				class="rounded border border-gray-200 dark:border-gray-700 bg-transparent px-2 py-1 text-xs"
			>
				<option value="case">This Case</option>
				<option value="CID">CID</option>
				<option value="SIU">SIU</option>
				<option value="all">All</option>
			</select>
			<button
				type="button"
				class="rounded bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 px-2 py-1 text-xs"
				on:click={doSearch}
				disabled={searching || q.trim().length < 2 || (scopeSelect === 'case' && !$activeCaseId)}
			>
				{searching ? '...' : 'Search'}
			</button>
		</div>

		{#if showResults && (results.length > 0 || searching)}
			<div
				class="absolute left-0 top-full mt-1 z-50 max-h-64 overflow-y-auto rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-850 shadow-lg min-w-[240px]"
			>
				{#if searching}
					<div class="p-3 text-sm text-gray-500">Searching...</div>
				{:else}
					{#each results as r (r.type + r.id)}
						<button
							type="button"
							class="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 border-b border-gray-100 dark:border-gray-800 last:border-0 transition"
							on:click={() => goToResult(r)}
						>
							<span class="text-xs font-medium text-gray-500 dark:text-gray-400">{r.type}</span>
							<div class="text-sm truncate">{r.snippet || '(no snippet)'}</div>
						</button>
					{/each}
				{/if}
			</div>
		{/if}
	</div>
{/if}
