<script lang="ts">
	/**
	 * Case-scoped P19 proposal_records dashboard — persistent review surface
	 * (same records as chat intake; no separate proposal system).
	 */
	import { page } from '$app/stores';
	import { caseEngineToken } from '$lib/stores';
	import ProposalReviewPanel from '$lib/components/proposals/ProposalReviewPanel.svelte';

	$: caseId = $page.params.id ?? '';
</script>

<div
	class="flex flex-col h-full min-h-0 overflow-hidden bg-white dark:bg-gray-950"
	data-testid="case-proposals-page"
>
	<div class="shrink-0 px-4 py-3 border-b border-gray-200 dark:border-gray-800">
		<h2 class="text-sm font-semibold text-gray-700 dark:text-gray-200">Proposals</h2>
		<p class="mt-1 text-xs text-gray-600 dark:text-gray-400 max-w-3xl leading-relaxed">
			Governed intake from chat and other sources: pending items are <strong>not</strong> on the Timeline
			or in official notes until you approve and commit. Timeline shows <strong>committed</strong> entries
			only; Notes remain investigator notebook drafts.
		</p>
	</div>

	<div class="flex-1 min-h-0 overflow-hidden px-2 sm:px-3 pb-2">
		{#if $caseEngineToken && caseId}
			<ProposalReviewPanel
				{caseId}
				token={$caseEngineToken}
				layout="page"
				refreshOnNav={true}
			/>
		{:else}
			<p class="text-sm text-gray-500 p-4">Connect to Case Engine to load proposals.</p>
		{/if}
	</div>
</div>
