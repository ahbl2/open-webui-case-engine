<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { caseEngineToken, caseEngineUser, unitFilter, activeCaseId, activeCaseNumber } from '$lib/stores';
	import { listCases, type CaseEngineCase } from '$lib/apis/caseEngine';

	let cases: CaseEngineCase[] = [];
	let loading = true;
	let error = '';

	async function loadCases() {
		loading = true;
		error = '';
		try {
			const unit = $unitFilter ?? 'ALL';
			cases = await listCases(unit as 'CID' | 'SIU' | 'ALL', $caseEngineToken!);
		} catch (e) {
			error = (e as Error).message ?? 'Failed to load cases';
		} finally {
			loading = false;
		}
	}

	function openCase(c: CaseEngineCase) {
		activeCaseId.set(c.id);
		activeCaseNumber.set(c.case_number);
		goto(`/case/${c.id}`);
	}

	onMount(() => {
		if ($caseEngineToken) {
			loadCases();
		} else {
			loading = false;
		}
	});
</script>

<div class="flex-1 flex flex-col w-full min-w-0 h-full overflow-y-auto px-4 py-6 md:px-8 md:py-8">
	<div class="max-w-4xl w-full mx-auto">
		<div class="flex items-center gap-3 mb-6">
			<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5"
				stroke="currentColor" class="size-6 text-gray-600 dark:text-gray-300">
				<path stroke-linecap="round" stroke-linejoin="round"
					d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z" />
			</svg>
			<h1 class="text-xl font-semibold text-gray-800 dark:text-gray-100">Cases</h1>
		</div>

		{#if !$caseEngineToken}
			<!-- No Case Engine session — surface the connect action inline -->
			<div class="rounded-xl border border-dashed border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 p-8 text-center">
				<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5"
					stroke="currentColor" class="size-10 mx-auto mb-3 text-gray-400 dark:text-gray-500">
					<path stroke-linecap="round" stroke-linejoin="round"
						d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
				</svg>
				<p class="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Case Engine not connected</p>
				<p class="text-xs text-gray-400 dark:text-gray-500">
					Use the Cases section in the sidebar to connect your account.
				</p>
			</div>
		{:else if loading}
			<div class="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
				<svg class="animate-spin size-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
					<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
					<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
				</svg>
				Loading cases…
			</div>
		{:else if error}
			<div class="rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/30 p-4">
				<p class="text-sm text-red-700 dark:text-red-400 font-medium">Failed to load cases</p>
				<p class="text-xs text-red-500 dark:text-red-500 mt-0.5">{error}</p>
				<button class="mt-2 text-xs text-red-600 dark:text-red-400 underline" on:click={loadCases}>
					Try again
				</button>
			</div>
		{:else if cases.length === 0}
			<div class="rounded-xl border border-dashed border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 p-8 text-center">
				<p class="text-sm text-gray-500 dark:text-gray-400">No cases found for your assigned units.</p>
			</div>
		{:else}
			<div class="flex flex-col gap-2">
				{#each cases as c (c.id)}
					<button
						class="w-full text-left rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750 px-4 py-3.5 transition group"
						on:click={() => openCase(c)}
					>
						<div class="flex items-start justify-between gap-4">
							<div class="flex-1 min-w-0">
								<div class="flex items-center gap-2 mb-0.5">
									<span class="text-xs font-mono text-gray-400 dark:text-gray-500 shrink-0">
										{c.case_number}
									</span>
									<span class="text-xs px-1.5 py-0.5 rounded-full font-medium
										{c.unit === 'CID' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' :
										 c.unit === 'SIU' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300' :
										 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'}">
										{c.unit}
									</span>
									<span class="text-xs px-1.5 py-0.5 rounded-full font-medium
										{c.status === 'OPEN' ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' :
										 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'}">
										{c.status}
									</span>
								</div>
								<p class="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">
									{c.title ?? '(untitled)'}
								</p>
							</div>
							<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5"
								stroke="currentColor"
								class="size-4 text-gray-300 dark:text-gray-600 group-hover:text-gray-500 dark:group-hover:text-gray-400 shrink-0 mt-1 transition">
								<path stroke-linecap="round" stroke-linejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
							</svg>
						</div>
					</button>
				{/each}
			</div>

			<p class="mt-4 text-xs text-gray-400 dark:text-gray-600 text-right">
				{cases.length} case{cases.length !== 1 ? 's' : ''} · connected as
				<span class="font-medium">{$caseEngineUser?.name ?? '…'}</span>
			</p>
		{/if}
	</div>
</div>
