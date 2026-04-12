<script lang="ts">
	/**
	 * P97-04 — Ephemeral read-only orientation strip after synthesis drill-down (subordinate to the row/card).
	 */
	export let role: 'authoritative' | 'supporting';
	export let surface: 'timeline' | 'tasks' | 'files';
	export let headline: string;
	/** Non-interpretive lines from existing row data only; empty strings omitted at render. */
	export let lines: readonly string[];
</script>

<div
	class="ds-p97-synthesis-nav-context-preview rounded-md border border-slate-200/90 dark:border-slate-700/90 bg-slate-50/80 dark:bg-slate-900/50 px-2.5 py-2 mb-2"
	role="note"
	data-testid="synthesis-nav-context-preview"
	data-synthesis-preview-role={role}
	data-synthesis-preview-surface={surface}
>
	<p class="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 m-0">
		Orientation (read-only)
	</p>
	<p class="text-xs font-medium text-slate-800 dark:text-slate-100 m-0 mt-0.5">{headline}</p>
	{#each lines as line}
		{#if line}
			<p class="text-[11px] leading-snug text-slate-600 dark:text-slate-300 m-0 mt-1 break-words [overflow-wrap:anywhere]">
				{line}
			</p>
		{/if}
	{/each}
</div>
