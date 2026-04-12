<script lang="ts">
	/**
	 * P100-04 / P100-05 — Case Understanding (read-only): P100-02 groups + P100-03 trace + same-case navigation.
	 * No record bodies, no second viewer, no ranking copy.
	 */
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import type { CaseEntityAggregationResult } from '$lib/case/p100EntityAggregationContract';
	import type { CaseEntityType } from '$lib/case/p100EntityExtractionContract';
	import { CASE_ENTITY_TYPES } from '$lib/case/p100EntityExtractionContract';
	import { buildEntityTraceFromAggregateGroup } from '$lib/case/p100EntityTraceability';
	import type { CaseEntitySourceKind } from '$lib/case/p100EntityExtractionContract';
	import {
		navigateCaseUnderstandingTraceContributor,
		openTraceContributorAriaLabel,
		traceContributorSurfaceLabel
	} from '$lib/case/p100CaseUnderstandingNavigation';
	import {
		P100_PANEL_AUTHORITY_LINE,
		P100_PANEL_CASE_ENGINE_REQUIRED,
		P100_PANEL_EMPTY_NO_MATCHES,
		P100_PANEL_FILE_ROW_LIMITATION
	} from '$lib/case/p100Phase100Copy';
	import type { GotoFn } from '$lib/case/caseSynthesisSourceNavigation';
	import {
		DS_TYPE_CLASSES,
		DS_STACK_CLASSES,
		DS_SUMMARY_CLASSES,
		DS_BTN_CLASSES
	} from '$lib/case/detectivePrimitiveFoundation';

	export let caseId: string;
	export let aggregation: CaseEntityAggregationResult | null = null;
	export let loading = false;
	export let error: string | null = null;
	/** When false, record text was not loaded (no Case Engine token)—show a factual session line, not “no matches”. */
	export let caseEngineLinked = true;
	/** Test override — default uses `goto` with Phase 97 handoff. */
	export let gotoFn: GotoFn | undefined = undefined;

	function sectionTitle(t: CaseEntityType): string {
		switch (t) {
			case 'person_name':
				return 'Names';
			case 'phone_number':
				return 'Phone numbers';
			case 'address':
				return 'Addresses';
			case 'vehicle':
				return 'Vehicles';
			case 'simple_identifier':
				return 'Identifiers';
			default: {
				const _e: never = t;
				return _e;
			}
		}
	}

	function kindCountLine(
		rows: readonly { source_kind: CaseEntitySourceKind; match_count: number }[]
	): string {
		return rows.map((r) => `${traceContributorSurfaceLabel(r.source_kind)}: ${r.match_count}`).join(' · ');
	}

	async function openContributor(kind: CaseEntitySourceKind, recordId: string): Promise<void> {
		if (!browser) return;
		const nav = gotoFn ?? goto;
		await navigateCaseUnderstandingTraceContributor(caseId.trim(), kind, recordId, nav);
	}

	$: grouped =
		aggregation == null
			? []
			: CASE_ENTITY_TYPES.map((entityType) => ({
					entityType,
					groups: aggregation.groups.filter((g) => g.entity_type === entityType)
				}));

</script>

<div
	class="{DS_SUMMARY_CLASSES.moduleBrief} {DS_STACK_CLASSES.stack}"
	data-region="case-understanding-panel"
	data-testid="case-understanding-panel"
	aria-busy={loading}
>
	{#if loading}
		<p class={DS_TYPE_CLASSES.meta} data-testid="case-understanding-loading">Loading record text…</p>
	{:else if error}
		<p class="{DS_TYPE_CLASSES.body} text-red-600 dark:text-red-400" data-testid="case-understanding-error">
			{error}
		</p>
	{:else if !caseEngineLinked}
		<p class={DS_TYPE_CLASSES.meta} data-testid="case-understanding-no-session">
			{P100_PANEL_CASE_ENGINE_REQUIRED}
		</p>
	{:else if !aggregation || aggregation.groups.length === 0}
		<p class={DS_TYPE_CLASSES.meta} data-testid="case-understanding-empty">
			{P100_PANEL_EMPTY_NO_MATCHES}
		</p>
	{:else}
		<p class="{DS_TYPE_CLASSES.meta} max-w-2xl" data-testid="case-understanding-authority">
			{P100_PANEL_AUTHORITY_LINE}
		</p>
		<p class="{DS_TYPE_CLASSES.meta} max-w-2xl" data-testid="case-understanding-file-limit">
			{P100_PANEL_FILE_ROW_LIMITATION}
		</p>

		{#each grouped as section (section.entityType)}
			{#if section.groups.length > 0}
				<section class={DS_STACK_CLASSES.tight} data-testid={`case-understanding-section-${section.entityType}`}>
					<h3 class="{DS_TYPE_CLASSES.panel}">{sectionTitle(section.entityType)}</h3>
					<ul class="list-none space-y-2 p-0 m-0">
						{#each section.groups as group (group.grouping_key)}
							{@const trace = buildEntityTraceFromAggregateGroup(caseId.trim(), group)}
							<li class="border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden">
								<details class="group">
									<summary
										class="cursor-pointer select-none px-3 py-2 bg-gray-50 dark:bg-gray-900/40 text-sm"
										data-testid="case-understanding-entity-summary"
									>
										<span class={DS_TYPE_CLASSES.body}>{group.display_value}</span>
										<span class="{DS_TYPE_CLASSES.meta} ml-2">
											{group.total_match_count} match{group.total_match_count === 1 ? '' : 'es'} ·
											{group.source_record_count} record{group.source_record_count === 1 ? '' : 's'}
										</span>
									</summary>
									<div class="px-3 py-2 space-y-2 border-t border-gray-200 dark:border-gray-700">
										<p class={DS_TYPE_CLASSES.meta}>
											{kindCountLine(group.source_kind_counts)}
										</p>
										{#if trace}
											<ul class="list-none space-y-1 m-0 p-0" data-testid="case-understanding-trace-list">
												{#each trace.record_level as rec (rec.source_kind + rec.source_record_id)}
													<li class="flex flex-wrap items-center gap-2 text-sm">
														<span class={DS_TYPE_CLASSES.mono}>{rec.source_record_id}</span>
														<span class={DS_TYPE_CLASSES.meta}>{traceContributorSurfaceLabel(rec.source_kind)}</span>
														<span class={DS_TYPE_CLASSES.meta}>({rec.match_count} match{rec.match_count === 1 ? '' : 'es'})</span>
														<button
															type="button"
															class="{DS_BTN_CLASSES.ghost} text-xs"
															data-testid="case-understanding-open-record"
															aria-label={openTraceContributorAriaLabel(
																rec.source_kind,
																rec.source_record_id
															)}
															on:click|preventDefault={() =>
																openContributor(rec.source_kind, rec.source_record_id)}
														>
															Open
														</button>
													</li>
												{/each}
											</ul>
										{/if}
									</div>
								</details>
							</li>
						{/each}
					</ul>
				</section>
			{/if}
		{/each}
	{/if}
</div>
