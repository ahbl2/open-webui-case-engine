<script lang="ts">
	/**
	 * P69-07 — Subordinate intake rail (P69-04 §1.6, P69-03 §18.2). Wraps existing Stage 1 / Stage 2 without governance changes.
	 */
	import { DS_ENTITY_BOARD_CLASSES } from '$lib/case/detectivePrimitiveFoundation';

	export let expanded = false;
</script>

<div class="{DS_ENTITY_BOARD_CLASSES.intakeRail} entities-intake-subordinate" data-testid="entities-intake-subordinate">
	<button
		type="button"
		class="{DS_ENTITY_BOARD_CLASSES.intakeToggle} {expanded
			? DS_ENTITY_BOARD_CLASSES.intakeToggleExpanded
			: DS_ENTITY_BOARD_CLASSES.intakeToggleCollapsed}"
		data-testid="entities-intake-toggle"
		aria-expanded={expanded}
		on:click={() => (expanded = !expanded)}
	>
		<div>
			<p class="ds-type-label" style="color: color-mix(in oklab, var(--ds-status-info-fg) 88%, var(--ds-text-primary))">
				Intake / staging
			</p>
			<p class="ds-type-meta mt-1 leading-relaxed">
				Stage 1 entity proposals · Stage 2 association edges (non-authoritative until promoted)
			</p>
		</div>
		<span class="text-lg shrink-0 font-light opacity-90" style="color: var(--ds-status-info-fg)">{expanded ? '▾' : '▸'}</span>
	</button>

	{#if expanded}
		<div class="{DS_ENTITY_BOARD_CLASSES.intakeBody}" data-testid="entities-intake-body">
			<slot />
		</div>
	{/if}
</div>
