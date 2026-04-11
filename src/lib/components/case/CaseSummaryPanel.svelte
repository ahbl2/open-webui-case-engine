<script lang="ts">
	import type { CaseSummaryResult } from '$lib/apis/caseEngine';
	import Spinner from '$lib/components/common/Spinner.svelte';
	import {
		caseSummaryEvidenceByIdMap,
		caseSummarySections,
		formatCaseSummaryCitationEvidenceLabels,
		hasLimitedCaseSummaryData
	} from '$lib/utils/caseSummary';
	import {
		DS_SUMMARY_CLASSES,
		DS_TYPE_CLASSES,
		DS_BTN_CLASSES,
		DS_STATUS_SURFACE_CLASSES,
		DS_STATUS_TEXT_CLASSES,
		DS_STACK_CLASSES
	} from '$lib/case/detectivePrimitiveFoundation';

	export let loading = false;
	export let error = '';
	export let summary: CaseSummaryResult | null = null;
	/** P56-15: optional—Summary page passes cancel during regenerate. */
	export let onCancelRegenerate: (() => void) | undefined = undefined;

	/** P56-13: local only — collapsed by default; not persisted across loads. */
	let citationsExpanded = false;

	$: evidenceById = summary ? caseSummaryEvidenceByIdMap(summary) : new Map();
</script>

<section class={DS_SUMMARY_CLASSES.panelShell}>
	{#if loading}
		<div class={DS_SUMMARY_CLASSES.loadingPanel} role="status" aria-live="polite">
			<div class="shrink-0 {DS_STATUS_TEXT_CLASSES.info}"><Spinner className="size-5" /></div>
			<div class="min-w-0">
				<p class="{DS_TYPE_CLASSES.body} font-semibold">Regenerating summary…</p>
				<p class="{DS_TYPE_CLASSES.meta} mt-1">
					AI run in progress—preview below refreshes when complete.
				</p>
				{#if onCancelRegenerate}
					<div class="mt-3 flex flex-wrap gap-2">
						<button
							type="button"
							class={DS_BTN_CLASSES.secondary}
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
		<div class="rounded-md px-3 py-2 text-sm {DS_STATUS_SURFACE_CLASSES.error}">
			<p class="ds-status-copy">Unable to generate derived case summary. {error}</p>
		</div>
	{:else if summary}
		<div class={DS_STACK_CLASSES.stack}>
			{#if caseSummarySections(summary).length > 0}
				{#each caseSummarySections(summary) as section}
					<div class={DS_STACK_CLASSES.tight}>
						<p class="{DS_TYPE_CLASSES.panel}">{section.title}</p>
						<ul class="list-disc space-y-1.5 pl-5 marker:text-[var(--ds-text-muted)] {DS_TYPE_CLASSES.body}">
							{#each section.items as item}
								<li>{item}</li>
							{/each}
						</ul>
					</div>
				{/each}
			{:else}
				<p class={DS_TYPE_CLASSES.meta}>No section lists in this snapshot.</p>
			{/if}
			{#if summary.citations?.length}
				<div class="{DS_SUMMARY_CLASSES.sectionDivider}">
					<button
						type="button"
						id="case-summary-citations-disclosure"
						class={DS_SUMMARY_CLASSES.citationsToggle}
						aria-expanded={citationsExpanded}
						aria-controls="case-summary-citations-region"
						title="Expand or collapse evidence-linked citation chips for this snapshot."
						on:click={() => (citationsExpanded = !citationsExpanded)}
					>
						<span class={DS_TYPE_CLASSES.label}>Citations</span>
						<span class="font-normal {DS_TYPE_CLASSES.meta}">
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
							<span class={DS_SUMMARY_CLASSES.citationChip}>
								<span class="font-semibold">C{idx + 1}</span>
								<span class="text-[var(--ds-text-muted)]">:</span>
								{' '}
								{formatCaseSummaryCitationEvidenceLabels(c.evidenceItemIds, evidenceById) || '—'}
								{#if c.note}
									<span class="text-[var(--ds-text-muted)]"> — {c.note}</span>
								{/if}
							</span>
						{/each}
					</div>
					{#if !citationsExpanded}
						<p class="{DS_TYPE_CLASSES.meta} mt-1">
							Evidence-linked citations are available — use Show to expand.
						</p>
					{/if}
				</div>
			{/if}
			{#if hasLimitedCaseSummaryData(summary)}
				<p class="{DS_TYPE_CLASSES.meta} mt-1 border-t border-dashed border-[var(--ds-border-default)] pt-3">
					Limited source material for this AI-derived view.
				</p>
			{/if}
		</div>
	{:else}
		<p class={DS_TYPE_CLASSES.meta}>No snapshot content to show.</p>
	{/if}
</section>
