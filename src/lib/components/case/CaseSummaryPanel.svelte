<script lang="ts">
	import type { CaseSummaryResult } from '$lib/apis/caseEngine';
	import Spinner from '$lib/components/common/Spinner.svelte';
	import {
		caseSummaryEvidenceByIdMap,
		caseSummarySections,
		formatCaseSummaryCitationEvidenceLabels,
		hasLimitedCaseSummaryData
	} from '$lib/utils/caseSummary';

	export let loading = false;
	export let error = '';
	export let summary: CaseSummaryResult | null = null;
	/** P56-15: optional—Summary page passes cancel during regenerate. */
	export let onCancelRegenerate: (() => void) | undefined = undefined;

	/** P56-13: local only — collapsed by default; not persisted across loads. */
	let citationsExpanded = false;

	$: evidenceById = summary ? caseSummaryEvidenceByIdMap(summary) : new Map();
</script>

<section class="shrink-0 rounded-lg bg-gray-50/80 dark:bg-gray-800/30 px-4 py-4">
	{#if loading}
		<div class="flex items-start gap-3" role="status" aria-live="polite">
			<div class="shrink-0 text-blue-600 dark:text-blue-400"><Spinner className="size-5" /></div>
			<div class="min-w-0">
				<p class="text-sm font-medium text-gray-800 dark:text-gray-200">Regenerating summary…</p>
				<p class="mt-1 text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
					AI run in progress—preview below refreshes when complete.
				</p>
				{#if onCancelRegenerate}
					<div class="mt-3 flex flex-wrap gap-2">
						<button
							type="button"
							class="px-3 py-1.5 rounded-md text-sm border border-gray-300 bg-white text-gray-800 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 dark:hover:bg-gray-800"
							on:click={onCancelRegenerate}
							title="Stop this run in the browser. Keeps the previous saved snapshot if you already had one; the server may still finish."
						>
							Cancel
						</button>
					</div>
				{/if}
			</div>
		</div>
	{:else if error}
		<div
			class="rounded-md border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/30 px-3 py-2.5 text-sm leading-snug text-red-700 dark:text-red-400"
		>
			Unable to generate derived case summary. {error}
		</div>
	{:else if summary}
		<div class="space-y-5 text-gray-700 dark:text-gray-300">
			{#if caseSummarySections(summary).length > 0}
				{#each caseSummarySections(summary) as section}
					<div class="space-y-2">
						<p class="text-sm font-semibold tracking-tight text-gray-900 dark:text-gray-100">
							{section.title}
						</p>
						<ul
							class="list-disc space-y-1.5 pl-5 text-sm leading-relaxed marker:text-gray-400 dark:marker:text-gray-500"
						>
							{#each section.items as item}
								<li>{item}</li>
							{/each}
						</ul>
					</div>
				{/each}
			{:else}
				<p class="text-sm text-gray-500 dark:text-gray-400">No section lists in this snapshot.</p>
			{/if}
			{#if summary.citations?.length}
				<div class="space-y-2 border-t border-gray-200/90 pt-4 dark:border-gray-700/70">
					<button
						type="button"
						id="case-summary-citations-disclosure"
						class="flex w-full max-w-full flex-wrap items-center justify-between gap-x-2 gap-y-1 rounded-md border border-gray-200/80 bg-white/60 px-2.5 py-2 text-left text-gray-800 hover:bg-gray-100/80 dark:border-gray-600 dark:bg-gray-800/40 dark:text-gray-100 dark:hover:bg-gray-800/70"
						aria-expanded={citationsExpanded}
						aria-controls="case-summary-citations-region"
						title="Expand or collapse evidence-linked citation chips for this snapshot."
						on:click={() => (citationsExpanded = !citationsExpanded)}
					>
						<span class="text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-400">
							Citations
						</span>
						<span class="text-xs font-normal text-gray-600 dark:text-gray-400">
							{summary.citations.length} reference{summary.citations.length === 1 ? '' : 's'} · {citationsExpanded
								? 'Hide'
								: 'Show'}
						</span>
					</button>
					<div
						id="case-summary-citations-region"
						class="flex flex-wrap gap-1.5"
						role="region"
						aria-labelledby="case-summary-citations-disclosure"
						hidden={!citationsExpanded}
					>
						{#each summary.citations as c, idx}
							<span
								class="rounded-md border border-gray-200/80 bg-gray-100/90 px-2 py-1 text-xs leading-snug text-gray-800 dark:border-gray-600 dark:bg-gray-800/80 dark:text-gray-200"
							>
								<span class="font-medium text-gray-900 dark:text-gray-100">C{idx + 1}</span>
								<span class="text-gray-600 dark:text-gray-400">:</span>
								{' '}
								{formatCaseSummaryCitationEvidenceLabels(c.evidenceItemIds, evidenceById) || '—'}
								{#if c.note}
									<span class="text-gray-600 dark:text-gray-400"> — {c.note}</span>
								{/if}
							</span>
						{/each}
					</div>
					{#if !citationsExpanded}
						<p class="text-[11px] leading-relaxed text-gray-500 dark:text-gray-400">
							Evidence-linked citations are available — use Show to expand.
						</p>
					{/if}
				</div>
			{/if}
			{#if hasLimitedCaseSummaryData(summary)}
				<p
					class="mt-1 border-t border-dashed border-gray-200/80 pt-3 text-xs leading-relaxed text-gray-500 dark:border-gray-700/60 dark:text-gray-400"
				>
					Limited source material for this AI-derived view.
				</p>
			{/if}
		</div>
	{:else}
		<p class="text-sm text-gray-500 dark:text-gray-400">No snapshot content to show.</p>
	{/if}
</section>
