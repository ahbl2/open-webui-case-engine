<script lang="ts">
	/**
	 * P131.6-02 — Four KPI-shaped skeleton tiles for summary band loading (layout-stable).
	 * P131.7-04 — Matches `ds-occ-kpi-card` row height + horizontal structure.
	 */
</script>

<div
	class="grid w-full grid-cols-1 gap-[var(--ds-space-3)] md:grid-cols-2 lg:grid-cols-4"
	data-testid="occ-skeleton-tile-row"
	aria-hidden="true"
>
	{#each Array(4) as _, i (i)}
		<div class="ds-occ-kpi-card ds-occ-kpi-card--skeleton">
			<div class="ds-occ-kpi-card__icon-tile">
				<div class="ds-skeleton ds-skeleton-shimmer h-4 w-4 rounded-[var(--ds-radius-sm)]"></div>
			</div>
			<div class="ds-occ-kpi-card__body min-h-[2.5rem] justify-center gap-1">
				<div class="ds-skeleton ds-skeleton-shimmer h-2 w-16 max-w-full rounded-[var(--ds-radius-sm)]"></div>
				<div class="ds-skeleton ds-skeleton-shimmer h-6 w-10 rounded-[var(--ds-radius-sm)]"></div>
				<div class="ds-skeleton ds-skeleton-shimmer h-2 w-full max-w-[9rem] rounded-[var(--ds-radius-sm)]"></div>
			</div>
			<div class="ds-occ-kpi-card__action-tile">
				<div class="ds-skeleton ds-skeleton-shimmer h-4 w-4 rounded-[var(--ds-radius-sm)]"></div>
			</div>
			<div class="ds-occ-kpi-card__trend">
				<div class="ds-skeleton ds-skeleton-shimmer h-3 w-2 rounded-[var(--ds-radius-sm)]"></div>
			</div>
		</div>
	{/each}
</div>
