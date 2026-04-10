<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { caseEngineToken, caseEngineUser, unitFilter, activeCaseId, activeCaseNumber } from '$lib/stores';
	import { listCases, type CaseEngineCase } from '$lib/apis/caseEngine';
	import { applyCaseBrowse, type CasesBrowseSort } from '$lib/utils/casesBrowse';
	import CreateCaseModal from '$lib/components/case/CreateCaseModal.svelte';
	import EditCaseModal from '$lib/components/case/EditCaseModal.svelte';

	let cases: CaseEngineCase[] = [];
	let selectedUnit: 'ALL' | 'CID' | 'SIU' = 'ALL';
	let selectedStatus: 'ALL' | 'OPEN' | 'CLOSED' = 'ALL';
	let searchQuery = '';
	let sortBy: CasesBrowseSort = 'incident_date_desc';
	let visibleCases: CaseEngineCase[] = [];
	let loading = true;
	let error = '';
	let showCreateCaseModal = false;
	let showEditCaseModal = false;
	let editingCase: CaseEngineCase | null = null;

	async function loadCases() {
		loading = true;
		error = '';
		try {
			cases = await listCases(selectedUnit, $caseEngineToken!);
		} catch (e) {
			error = (e as Error).message ?? 'Failed to load cases';
		} finally {
			loading = false;
		}
	}

	function openCase(c: CaseEngineCase) {
		activeCaseId.set(c.id);
		activeCaseNumber.set(c.case_number);
		goto(`/case/${c.id}/chat`);
	}

	function openEditCase(c: CaseEngineCase) {
		editingCase = c;
		showEditCaseModal = true;
	}

	function onUnitChange() {
		unitFilter.set(selectedUnit);
		loadCases();
	}

	$: {
		visibleCases = applyCaseBrowse(cases, {
			unit: selectedUnit,
			status: selectedStatus,
			searchQuery,
			sortBy
		});
	}

	onMount(() => {
		selectedUnit = $unitFilter ?? 'ALL';
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
			{#if $caseEngineToken}
				<button
					type="button"
					class="ml-auto px-3 py-1.5 rounded-md bg-blue-600 text-white text-sm hover:bg-blue-700"
					on:click={() => (showCreateCaseModal = true)}
				>
					Create Case
				</button>
			{/if}
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
		{:else}
			<div class="mb-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3">
				<div class="grid grid-cols-1 gap-2 md:grid-cols-4">
					<div>
						<label class="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300">Unit</label>
						<select
							class="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-2.5 py-1.5 text-sm"
							bind:value={selectedUnit}
							on:change={onUnitChange}
						>
							<option value="ALL">All</option>
							<option value="CID">CID</option>
							<option value="SIU">SIU</option>
						</select>
					</div>
					<div>
						<label class="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300">Status</label>
						<select
							class="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-2.5 py-1.5 text-sm"
							bind:value={selectedStatus}
						>
							<option value="ALL">All</option>
							<option value="OPEN">OPEN</option>
							<option value="CLOSED">CLOSED</option>
						</select>
					</div>
					<div>
						<label class="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300">Search</label>
						<input
							type="text"
							class="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-2.5 py-1.5 text-sm"
							placeholder="Case number or title"
							bind:value={searchQuery}
						/>
					</div>
					<div>
						<label class="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300">Sort</label>
						<select
							class="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-2.5 py-1.5 text-sm"
							bind:value={sortBy}
						>
							<option value="created_desc">Created date newest</option>
							<option value="created_asc">Created date oldest</option>
							<option value="case_number_asc">Case number A-Z</option>
							<option value="incident_date_desc">Incident date newest</option>
							<option value="incident_date_asc">Incident date oldest</option>
						</select>
					</div>
				</div>
			</div>

			{#if visibleCases.length === 0}
			<div class="rounded-xl border border-dashed border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 p-8 text-center">
				<p class="text-sm text-gray-500 dark:text-gray-400">No cases match your current filters.</p>
			</div>
			{:else}
			<div class="flex flex-col gap-2">
				{#each visibleCases as c (c.id)}
					<div
						class="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3.5 transition group"
					>
						<div class="flex items-start justify-between gap-4">
							<button
								type="button"
								class="flex-1 min-w-0 text-left hover:bg-gray-50 dark:hover:bg-gray-750 rounded-md p-1 -m-1"
								on:click={() => openCase(c)}
							>
								<div class="flex items-center gap-2 mb-0.5 min-w-0 flex-wrap">
									<span class="text-xs font-mono text-gray-400 dark:text-gray-500 min-w-0 max-w-full truncate">
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
								<p class="text-sm font-medium leading-5 text-gray-800 dark:text-gray-100 overflow-hidden [display:-webkit-box] [-webkit-line-clamp:2] [-webkit-box-orient:vertical] break-words">
									{c.title ?? '(untitled)'}
								</p>
								{#if c.incident_date}
									<p class="mt-1 text-xs text-amber-700 dark:text-amber-300 truncate max-w-full">
										Incident: {c.incident_date}
									</p>
								{:else}
									<p class="mt-1 text-xs text-amber-700/80 dark:text-amber-300/80 truncate max-w-full">
										Incident date missing
									</p>
								{/if}
							</button>
							<div class="shrink-0 mt-1 flex items-center gap-2">
								<button
									type="button"
									class="px-2 py-1 text-xs rounded border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
									on:click={() => openEditCase(c)}
								>
									Edit
								</button>
								<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5"
									stroke="currentColor"
									class="size-4 text-gray-300 dark:text-gray-600 group-hover:text-gray-500 dark:group-hover:text-gray-400 transition">
									<path stroke-linecap="round" stroke-linejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
								</svg>
							</div>
						</div>
					</div>
				{/each}
			</div>

			<p class="mt-4 text-xs text-gray-400 dark:text-gray-600 text-right">
				{visibleCases.length} of {cases.length} case{cases.length !== 1 ? 's' : ''} · connected as
				<span class="font-medium">{$caseEngineUser?.name ?? '…'}</span>
			</p>
			{/if}
		{/if}
	</div>
</div>

<CreateCaseModal
	show={showCreateCaseModal}
	token={$caseEngineToken}
	on:close={() => (showCreateCaseModal = false)}
	on:created={(event) => {
		showCreateCaseModal = false;
		loadCases();
		const created = event.detail;
		if (created?.id) {
			activeCaseId.set(created.id);
			activeCaseNumber.set(created.case_number);
			goto(`/case/${created.id}/chat`);
		}
	}}
/>

<EditCaseModal
	show={showEditCaseModal}
	token={$caseEngineToken}
	caseData={editingCase}
	on:close={() => {
		showEditCaseModal = false;
		editingCase = null;
	}}
	on:saved={(event) => {
		const saved = event.detail.case as CaseEngineCase;
		cases = cases.map((c) => (c.id === saved.id ? saved : c));
		editingCase = saved;
		if ($activeCaseId === saved.id) {
			activeCaseNumber.set(saved.case_number);
		}
		showEditCaseModal = false;
	}}
/>
