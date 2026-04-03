<script lang="ts">
	import { page } from '$app/stores';
	import { caseEngineToken, caseEngineAuthState, caseEngineUser } from '$lib/stores';
	import CaseWorkflowTab from '$lib/components/case/CaseWorkflowTab.svelte';

	$: caseId = $page.params.id;
	$: isAdmin =
		$caseEngineUser?.role === 'ADMIN' || $caseEngineAuthState?.user?.role === 'admin';
</script>

<div class="flex flex-col flex-1 min-h-0 overflow-hidden">
	{#if !$caseEngineToken}
		<div class="flex-1 min-h-0 overflow-auto p-4 md:p-6">
			<div class="mx-auto max-w-4xl rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
				<p class="text-sm text-gray-600 dark:text-gray-300">
					Case Engine authentication is required to load workflow items.
				</p>
			</div>
		</div>
	{:else}
		<CaseWorkflowTab {caseId} token={$caseEngineToken} {isAdmin} />
	{/if}
</div>
