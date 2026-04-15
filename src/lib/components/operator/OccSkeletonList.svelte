<script lang="ts">
	/**
	 * P131.6-02 — List-shaped skeleton rows (cases / threads / rail).
	 */
	export let rows = 5;
</script>

<div class="flex w-full flex-col gap-2" data-testid="occ-skeleton-list" aria-hidden="true">
	{#each Array(rows) as _, i (i)}
		<div class="ds-skeleton-row">
			<div class="ds-skeleton ds-skeleton-avatar ds-skeleton-shimmer"></div>
			<div class="ds-skeleton-lines">
				<div class="ds-skeleton ds-skeleton-line ds-skeleton-shimmer w-3/4"></div>
				<div class="ds-skeleton ds-skeleton-line ds-skeleton-shimmer w-full max-w-[14rem]"></div>
			</div>
		</div>
	{/each}
</div>
