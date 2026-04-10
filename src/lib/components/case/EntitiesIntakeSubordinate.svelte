<script lang="ts">
	/**
	 * P69-07 — Subordinate intake rail (P69-04 §1.6, P69-03 §18.2). Wraps existing Stage 1 / Stage 2 without governance changes.
	 */
	export let expanded = false;

	const railCollapsedClasses =
		'border-t border-dashed border-violet-500/30 bg-violet-950/10 hover:bg-violet-950/20';
</script>

<div
	class="entities-intake-subordinate rounded-2xl overflow-hidden border border-violet-500/30 bg-gradient-to-b from-violet-950/25 via-slate-950/70 to-slate-950 shadow-[0_16px_48px_-24px_rgba(0,0,0,0.55)] ring-1 ring-violet-400/15"
	data-testid="entities-intake-subordinate"
>
	<button
		type="button"
		class="w-full flex items-center justify-between gap-3 px-5 py-4 text-left {expanded
			? 'bg-gradient-to-r from-violet-950/40 to-slate-950/50 border-b border-violet-500/25'
			: railCollapsedClasses}"
		data-testid="entities-intake-toggle"
		aria-expanded={expanded}
		on:click={() => (expanded = !expanded)}
	>
		<div>
			<p class="text-[10px] font-bold uppercase tracking-[0.14em] text-violet-300/90">Intake / staging</p>
			<p class="text-xs text-slate-300/95 mt-1 leading-relaxed">
				Stage 1 entity proposals · Stage 2 association edges (non-authoritative until promoted)
			</p>
		</div>
		<span class="text-violet-300/80 text-lg shrink-0 font-light">{expanded ? '▾' : '▸'}</span>
	</button>

	{#if expanded}
		<div
			class="px-4 md:px-5 py-6 space-y-6 max-h-[min(420px,52vh)] md:max-h-[min(560px,58vh)] overflow-y-auto bg-slate-950/40 border-t border-violet-500/15"
			data-testid="entities-intake-body"
		>
			<slot />
		</div>
	{/if}
</div>
