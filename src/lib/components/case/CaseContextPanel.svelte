<script lang="ts">
	/** Ticket 7: Minimal display of recent entries when a case is active */
	import { caseContext } from '$lib/stores';
</script>

{#if $caseContext && $caseContext.recent_entries.length > 0}
	<div class="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-850/50 px-4 py-2">
		<div class="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
			{$caseContext.case.case_number} – Recent entries
		</div>
		<div class="max-h-32 overflow-y-auto space-y-1">
			{#each $caseContext.recent_entries as e (e.id)}
				<div class="text-xs">
					<span class="text-gray-500 dark:text-gray-500">{e.occurred_at} · {e.type}</span>
					<span class="block truncate text-gray-700 dark:text-gray-300">{e.text_original}</span>
				</div>
			{/each}
		</div>
	</div>
{/if}
