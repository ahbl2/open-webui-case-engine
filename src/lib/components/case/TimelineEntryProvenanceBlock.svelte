<script lang="ts">
	/**
	 * P40-02 — Collapsible origin / lineage for non-manual timeline entries.
	 * P95-04 — summary + files link: focus-visible / interaction classes (scoped via Timeline card).
	 * Panel variant — full content for popovers (e.g. timeline card footer control).
	 */
	import type { TimelineEntryProvenance } from '$lib/apis/caseEngine';
	import TimelineEntryProvenanceBody from './TimelineEntryProvenanceBody.svelte';

	export let caseId: string;
	export let provenance: TimelineEntryProvenance;
	/** `collapsible` = inline `<details>`; `panel` = always-open block for popovers */
	export let variant: 'collapsible' | 'panel' = 'collapsible';
</script>

{#if variant === 'panel'}
	<div
		class="w-full max-w-full text-[10px] text-gray-500 dark:text-gray-400"
		data-testid="timeline-entry-provenance"
		data-timeline-provenance-variant="panel"
	>
		<div class="flex flex-wrap items-center gap-1.5 mb-2 pb-2 border-b border-gray-100 dark:border-gray-800">
			<span
				class="font-medium px-1.5 py-0.5 rounded bg-sky-50 dark:bg-sky-900/25 text-sky-800 dark:text-sky-200"
				data-testid="timeline-entry-origin-badge"
			>
				{provenance.origin_label}
			</span>
			<span class="font-semibold text-gray-600 dark:text-gray-300">Origin &amp; lineage</span>
		</div>
		<div
			class="max-h-[min(50vh,20rem)] overflow-y-auto pr-1 pl-2 border-l-2 border-sky-100 dark:border-sky-900/40 space-y-1.5 text-[10px] leading-snug"
			data-testid="timeline-entry-provenance-body"
		>
			<TimelineEntryProvenanceBody {caseId} {provenance} />
		</div>
	</div>
{:else}
	<details
		class="w-full max-w-full sm:max-w-md text-[10px] text-gray-500 dark:text-gray-400"
		data-testid="timeline-entry-provenance"
		data-timeline-provenance-variant="collapsible"
	>
		<summary
			class="ds-timeline-entry-provenance-summary cursor-pointer list-none flex flex-wrap items-center gap-1.5 rounded-sm px-0.5 -mx-0.5 [&::-webkit-details-marker]:hidden"
		>
			<span
				class="font-medium px-1.5 py-0.5 rounded bg-sky-50 dark:bg-sky-900/25 text-sky-800 dark:text-sky-200"
				data-testid="timeline-entry-origin-badge"
			>
				{provenance.origin_label}
			</span>
			<span class="underline underline-offset-2">Origin &amp; lineage</span>
		</summary>
		<div
			class="mt-1.5 pl-2 border-l-2 border-sky-100 dark:border-sky-900/40 space-y-1.5 text-[10px] leading-snug"
			data-testid="timeline-entry-provenance-body"
		>
			<TimelineEntryProvenanceBody {caseId} {provenance} />
		</div>
	</details>
{/if}
