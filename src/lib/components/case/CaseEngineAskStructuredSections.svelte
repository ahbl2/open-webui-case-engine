<script lang="ts">
	import type { AskFactItem, AskInferenceItem } from '$lib/utils/askIntegrityUi';

	export let facts: AskFactItem[] = [];
	export let inferences: AskInferenceItem[] = [];
</script>

{#if facts.length > 0}
	<div class="mt-3 space-y-1.5" data-ask-integrity-facts="">
		<div class="text-xs font-semibold text-gray-800 dark:text-gray-200">Facts (cited)</div>
		<ul class="list-none space-y-2 pl-0">
			{#each facts as item, i (i + ':' + item.text.slice(0, 24))}
				<li
					class="rounded border border-gray-200 dark:border-gray-700 bg-white/60 dark:bg-gray-900/40 px-2.5 py-2 text-sm text-gray-800 dark:text-gray-100"
				>
					<div class="whitespace-pre-wrap">{item.text}</div>
					{#if item.supporting_citation_ids.length > 0}
						<div class="mt-1 flex flex-wrap gap-1">
							{#each item.supporting_citation_ids as cid}
								<span
									class="rounded bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 text-[11px] text-gray-600 dark:text-gray-300 font-mono"
									>{cid}</span
								>
							{/each}
						</div>
					{/if}
				</li>
			{/each}
		</ul>
	</div>
{/if}

{#if inferences.length > 0}
	<div class="mt-3 space-y-1.5" data-ask-integrity-inferences="">
		<div class="text-xs font-semibold text-gray-800 dark:text-gray-200">Analysis (inference)</div>
		<ul class="list-none space-y-2 pl-0">
			{#each inferences as item, i (i + ':' + item.text.slice(0, 24))}
				<li
					class="rounded border border-violet-200 dark:border-violet-800 bg-violet-50/50 dark:bg-violet-950/30 px-2.5 py-2 text-sm text-gray-800 dark:text-gray-100"
				>
					<div class="whitespace-pre-wrap">{item.text}</div>
					{#if item.anchored_citation_ids.length > 0}
						<div class="mt-1 flex flex-wrap gap-1">
							{#each item.anchored_citation_ids as cid}
								<span
									class="rounded bg-violet-100 dark:bg-violet-900/40 px-1.5 py-0.5 text-[11px] text-violet-800 dark:text-violet-200 font-mono"
									>{cid}</span
								>
							{/each}
						</div>
					{/if}
				</li>
			{/each}
		</ul>
	</div>
{/if}
