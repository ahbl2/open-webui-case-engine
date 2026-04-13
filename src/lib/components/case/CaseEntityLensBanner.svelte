<script lang="ts">
	/**
	 * P108-04 — Shared explicit `entityLens` filter-state banner.
	 * P108-05 — Copy from `p108EntityTimelineLensCopy` (read-only, explicit links; operator framing only).
	 * Clear action is surface-specific.
	 */
	import {
		P108_ENTITY_LENS_RETURN_TO_ENTITY,
		P108_ENTITY_TIMELINE_LENS_BANNER,
		P108_ENTITY_TIMELINE_LENS_CLEAR
	} from '$lib/case/p108EntityTimelineLensCopy';
	import {
		p108EntityLensBannerTestIds,
		P108_ENTITY_LENS_BANNER_OUTER_CLASS,
		type P108EntityLensSurface
	} from '$lib/case/p108EntityLensViewState';

	export let surface: P108EntityLensSurface;
	export let caseId: string;
	export let entityId: string;
	export let entityLabel: string;
	export let onClear: () => void;

	$: ids = p108EntityLensBannerTestIds(surface);
	$: outerClass = P108_ENTITY_LENS_BANNER_OUTER_CLASS[surface];
	$: displayLabel = entityLabel.trim() || entityId;
	$: returnHref = `/case/${encodeURIComponent(caseId)}/entities/${encodeURIComponent(entityId)}`;
</script>

<div class={outerClass} data-testid={ids.banner} role="status">
	<div class="flex flex-wrap items-center gap-3 min-w-0">
		<span class="text-xs text-amber-950 dark:text-amber-100">
			{P108_ENTITY_TIMELINE_LENS_BANNER}
			<span class="font-medium">{displayLabel}</span>
		</span>
		<a
			href={returnHref}
			class="text-xs font-medium text-amber-950 dark:text-amber-100 underline hover:opacity-90 shrink-0"
			data-testid={ids.returnToEntity}
		>
			{P108_ENTITY_LENS_RETURN_TO_ENTITY}
		</a>
	</div>
	<button
		type="button"
		class="text-xs font-medium px-2.5 py-1 rounded border border-amber-300 dark:border-amber-700 text-amber-950 dark:text-amber-100 hover:bg-amber-100/80 dark:hover:bg-amber-900/40 shrink-0"
		data-testid={ids.clear}
		on:click={onClear}
	>
		{P108_ENTITY_TIMELINE_LENS_CLEAR}
	</button>
</div>
