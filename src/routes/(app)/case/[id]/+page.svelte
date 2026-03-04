<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { caseEngineToken, activeCaseId, activeCaseNumber } from '$lib/stores';
	import { listCases } from '$lib/apis/caseEngine';
	import CaseFilesTab from '$lib/components/case/CaseFilesTab.svelte';
	import CaseAiIntakeTab from '$lib/components/case/CaseAiIntakeTab.svelte';
	import CaseAiAskTab from '$lib/components/case/CaseAiAskTab.svelte';
	import ChevronLeft from '$lib/components/icons/ChevronLeft.svelte';

	$: caseId = $page.params.id;

	let activeTab: 'files' | 'ai-intake' | 'ask' = 'files';
	let caseInfo: { case_number: string; title: string } | null = null;
	let loading = true;
	let notFound = false;

	$: if (caseId && $caseEngineToken) {
		loadCase();
	}

	async function loadCase() {
		loading = true;
		notFound = false;
		caseInfo = null;
		try {
			const cases = await listCases('ALL', $caseEngineToken!);
			const c = cases.find((x) => x.id === caseId);
			if (c) {
				caseInfo = {
					case_number: c.case_number ?? c.id,
					title: c.title ?? ''
				};
				activeCaseId.set(c.id);
				activeCaseNumber.set(c.case_number ?? null);
			} else {
				notFound = true;
			}
		} catch {
			notFound = true;
		} finally {
			loading = false;
		}
	}
</script>

<div class="flex flex-col h-full">
	<div class="shrink-0 flex items-center gap-2 px-4 py-2 border-b border-gray-200 dark:border-gray-700">
		<button
			type="button"
			class="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
			on:click={() => goto('/')}
			aria-label="Back"
		>
			<ChevronLeft class="size-5" />
		</button>
		{#if !$caseEngineToken}
			<div class="text-sm text-gray-600 dark:text-gray-400">
				Connect to Case Engine in the sidebar to view case files.
			</div>
		{:else if loading}
			<div class="text-sm text-gray-500">Loading...</div>
		{:else if notFound}
			<div class="text-sm text-red-600 dark:text-red-400">Case not found</div>
		{:else if caseInfo}
			<div>
				<h1 class="font-medium">{caseInfo.case_number}</h1>
				{#if caseInfo.title}
					<div class="text-xs text-gray-500 truncate max-w-md">{caseInfo.title}</div>
				{/if}
			</div>
		{/if}
	</div>

	{#if $caseEngineToken && !loading && !notFound && caseInfo}
		<div class="flex-1 min-h-0 overflow-auto flex flex-col">
			<div class="flex gap-2 px-2 pt-2 border-b border-gray-200 dark:border-gray-700">
				<button
					type="button"
					class="px-2 py-1.5 text-sm rounded {activeTab === 'files'
						? 'bg-gray-200 dark:bg-gray-700 font-medium'
						: 'hover:bg-gray-100 dark:hover:bg-gray-800'}"
					on:click={() => (activeTab = 'files')}
				>
					Files
				</button>
				<button
					type="button"
					class="px-2 py-1.5 text-sm rounded {activeTab === 'ai-intake'
						? 'bg-gray-200 dark:bg-gray-700 font-medium'
						: 'hover:bg-gray-100 dark:hover:bg-gray-800'}"
					on:click={() => (activeTab = 'ai-intake')}
				>
					AI Intake
				</button>
				<button
					type="button"
					class="px-2 py-1.5 text-sm rounded {activeTab === 'ask'
						? 'bg-gray-200 dark:bg-gray-700 font-medium'
						: 'hover:bg-gray-100 dark:hover:bg-gray-800'}"
					on:click={() => (activeTab = 'ask')}
				>
					Ask
				</button>
			</div>
			{#if activeTab === 'files'}
				<CaseFilesTab {caseId} token={$caseEngineToken} />
			{:else if activeTab === 'ask'}
				<CaseAiAskTab {caseId} token={$caseEngineToken} />
			{:else}
				<CaseAiIntakeTab {caseId} token={$caseEngineToken} />
			{/if}
		</div>
	{/if}
</div>
