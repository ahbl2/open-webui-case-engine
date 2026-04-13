<script lang="ts">
	/** P109-01 — session-only manual selection counts (shared across timeline + files). */
	import {
		evidenceSelection,
		clearEvidenceSelection,
		evidenceSelectionCounts
	} from '$lib/case/p109EvidenceSelection';
	import {
		P109_EVIDENCE_SELECTION_BAR_LABEL,
		P109_EVIDENCE_SELECTION_BAR_EMPTY,
		P109_EVIDENCE_SELECTION_BAR_COUNTS,
		P109_EVIDENCE_SELECTION_CLEAR
	} from '$lib/case/p109EvidenceSelectionCopy';
	import { DS_BTN_CLASSES } from '$lib/case/detectivePrimitiveFoundation';

	$: counts = evidenceSelectionCounts($evidenceSelection);
</script>

<div
	class="flex flex-wrap items-baseline gap-x-2 gap-y-1 px-3 py-2 text-xs border-b border-gray-200/80 dark:border-gray-800/80 bg-gray-50/80 dark:bg-gray-900/40"
	role="status"
	data-testid="p109-evidence-selection-status"
>
	<span class="font-medium text-gray-700 dark:text-gray-300">{P109_EVIDENCE_SELECTION_BAR_LABEL}</span>
	{#if counts.total === 0}
		<span class="text-gray-500 dark:text-gray-400 max-w-[56rem]">{P109_EVIDENCE_SELECTION_BAR_EMPTY}</span>
	{:else}
		<span class="text-gray-600 dark:text-gray-400 tabular-nums"
			>{P109_EVIDENCE_SELECTION_BAR_COUNTS(counts.total, counts.timeline, counts.files)}</span
		>
		<button
			type="button"
			class="{DS_BTN_CLASSES.ghost} text-xs min-h-0 py-0.5 px-1.5"
			data-testid="p109-evidence-selection-clear"
			on:click={() => clearEvidenceSelection()}
		>
			{P109_EVIDENCE_SELECTION_CLEAR}
		</button>
	{/if}
</div>
