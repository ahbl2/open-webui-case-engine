<script lang="ts">
	/**
	 * P40-02 — Collapsible origin / lineage for non-manual timeline entries.
	 */
	import type { TimelineEntryProvenance } from '$lib/apis/caseEngine';

	export let caseId: string;
	export let provenance: TimelineEntryProvenance;
</script>

<details
	class="w-full max-w-full sm:max-w-md text-[10px] text-gray-500 dark:text-gray-400"
	data-testid="timeline-entry-provenance"
>
	<summary
		class="cursor-pointer list-none flex flex-wrap items-center gap-1.5 [&::-webkit-details-marker]:hidden"
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
		<p class="italic text-gray-500 dark:text-gray-500">
			{provenance.lineage_explanation}
		</p>
		{#if provenance.committed_via_proposal}
			<p data-testid="timeline-entry-provenance-proposal-path">
				Committed through the proposals workflow (review and commit) — not a direct silent write.
			</p>
		{/if}
		{#if provenance.source_file_display_name}
			<p data-testid="timeline-entry-provenance-source-file">
				<span class="font-medium text-gray-600 dark:text-gray-300">Source file:</span>
				{provenance.source_file_display_name}
				<a
					href="/case/{caseId}/files"
					class="ml-1 text-sky-600 dark:text-sky-400 hover:underline"
					data-testid="timeline-entry-provenance-files-link"
				>Open Case Files</a>
			</p>
		{/if}
		{#if provenance.ai_assisted_draft}
			<p data-testid="timeline-entry-provenance-ai-draft">
				Draft text was model-assisted; an investigator still reviewed and committed the official record.
			</p>
		{/if}
		{#if provenance.implies_chat_context_draft}
			<p data-testid="timeline-entry-provenance-chat-context">
				Draft came from case chat intake — not from a document extract.
			</p>
		{/if}
	</div>
</details>
