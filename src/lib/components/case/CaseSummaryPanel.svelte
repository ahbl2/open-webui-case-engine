<script lang="ts">
	import type { CaseSummaryResult } from '$lib/apis/caseEngine';
	import { caseSummarySections, hasLimitedCaseSummaryData } from '$lib/utils/caseSummary';

	export let loading = false;
	export let error = '';
	export let summary: CaseSummaryResult | null = null;
</script>

<section class="shrink-0 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 px-3 py-3">
	<div class="flex items-center justify-between gap-2 mb-2">
		<h3 class="text-sm font-semibold text-gray-800 dark:text-gray-100">Case Summary</h3>
		{#if summary?.generatedAt}
			<span class="text-[11px] text-gray-500 dark:text-gray-400">Generated: {summary.generatedAt}</span>
		{/if}
	</div>

	{#if loading}
		<p class="text-xs text-gray-500 dark:text-gray-400">Generating case summary...</p>
	{:else if error}
		<div class="rounded-md border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/30 px-2.5 py-2 text-xs text-red-700 dark:text-red-400">
			Unable to generate case summary. {error}
		</div>
	{:else if summary}
		<div class="space-y-2 text-xs text-gray-700 dark:text-gray-300">
			{#if caseSummarySections(summary).length > 0}
				{#each caseSummarySections(summary) as section}
					<div>
						<p class="font-semibold">{section.title}</p>
						<ul class="list-disc pl-4">
							{#each section.items as item}
								<li>{item}</li>
							{/each}
						</ul>
					</div>
				{/each}
			{:else}
				<div>
					<p class="text-gray-500 dark:text-gray-400">No summary data returned.</p>
				</div>
			{/if}
			{#if summary.citations?.length}
				<div>
					<p class="font-semibold">Citations</p>
					<div class="mt-1 flex flex-wrap gap-1">
						{#each summary.citations as c, idx}
							<span class="rounded bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5">
								C{idx + 1}: {(c.evidenceItemIds ?? []).join(', ')}{c.note ? ` - ${c.note}` : ''}
							</span>
						{/each}
					</div>
				</div>
			{/if}
			{#if hasLimitedCaseSummaryData(summary)}
				<p class="text-[11px] text-gray-500 dark:text-gray-400">
					Limited case data available for summary.
				</p>
			{/if}
		</div>
	{:else}
		<p class="text-xs text-gray-500 dark:text-gray-400">No summary data returned.</p>
	{/if}
</section>
