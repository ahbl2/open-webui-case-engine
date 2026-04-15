<script lang="ts">
	/**
	 * P131.6-02 — Feed-shaped skeleton blocks (activity / intel placeholders).
	 */
	export let items = 4;
</script>

<div class="flex w-full flex-col gap-3" data-testid="occ-skeleton-feed" aria-hidden="true">
	{#each Array(items) as _, i (i)}
		<div class="flex flex-col gap-2 rounded-[var(--ds-radius-md)] border border-[color:var(--ds-border-default)] bg-[color:var(--ds-bg-surface)] p-3">
			<div class="ds-skeleton ds-skeleton-line ds-skeleton-shimmer h-3 w-20"></div>
			<div class="ds-skeleton ds-skeleton-line ds-skeleton-shimmer h-3 w-full"></div>
			<div class="ds-skeleton ds-skeleton-line ds-skeleton-shimmer h-3 max-w-[18rem] w-[92%]"></div>
		</div>
	{/each}
</div>
