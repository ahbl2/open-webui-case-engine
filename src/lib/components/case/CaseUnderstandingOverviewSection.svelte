<script lang="ts">
	/**
	 * P100-04 / P100-05 — Loads Case Engine reads, runs P100-02 aggregation, renders {@link CaseUnderstandingPanel}.
	 */
	import { caseEngineToken } from '$lib/stores';
	import { aggregateCaseEntitiesFromSourceRecords } from '$lib/case/p100EntityAggregation';
	import type { CaseEntityAggregationResult } from '$lib/case/p100EntityAggregationContract';
	import { loadCaseUnderstandingSourceRecords } from '$lib/case/caseUnderstandingLoad';
	import CaseUnderstandingPanel from '$lib/components/case/CaseUnderstandingPanel.svelte';
	import { P100_OVERVIEW_SECTION_DECK } from '$lib/case/p100Phase100Copy';
	import {
		DS_STACK_CLASSES,
		DS_TYPE_CLASSES,
		DS_SUMMARY_CLASSES
	} from '$lib/case/detectivePrimitiveFoundation';

	export let caseId: string;

	let loadSeq = 0;
	let loading = false;
	let error: string | null = null;
	let aggregation: CaseEntityAggregationResult | null = null;

	async function load(): Promise<void> {
		const token = $caseEngineToken;
		const cid = caseId?.trim();
		if (!cid) {
			aggregation = null;
			error = null;
			loading = false;
			return;
		}
		if (!token) {
			aggregation = null;
			error = null;
			loading = false;
			return;
		}
		const seq = ++loadSeq;
		loading = true;
		error = null;
		try {
			const records = await loadCaseUnderstandingSourceRecords(cid, token);
			if (seq !== loadSeq) return;
			aggregation = aggregateCaseEntitiesFromSourceRecords({ case_id: cid, records });
		} catch (e) {
			if (seq !== loadSeq) return;
			aggregation = null;
			error = e instanceof Error ? e.message : 'Failed to load case understanding.';
		} finally {
			if (seq === loadSeq) loading = false;
		}
	}

	$: if (caseId && $caseEngineToken) {
		void load();
	}
	$: if (caseId && !$caseEngineToken) {
		aggregation = null;
		error = null;
		loading = false;
	}
</script>

<section
	class="{DS_SUMMARY_CLASSES.moduleBrief} {DS_STACK_CLASSES.stack}"
	id="summary-module-case-understanding"
	aria-labelledby="summary-module-case-understanding-heading"
	data-region="case-understanding-section"
>
	<header class={DS_STACK_CLASSES.tight}>
		<h2 id="summary-module-case-understanding-heading" class={DS_TYPE_CLASSES.panel}>
			Case understanding (read-only)
		</h2>
		<p class="{DS_TYPE_CLASSES.meta} max-w-2xl" data-testid="case-understanding-overview-deck">
			{P100_OVERVIEW_SECTION_DECK}
		</p>
	</header>

	<div class={DS_SUMMARY_CLASSES.sectionDivider}>
		<CaseUnderstandingPanel
			{caseId}
			{aggregation}
			{loading}
			{error}
			caseEngineLinked={!!$caseEngineToken}
		/>
	</div>
</section>
