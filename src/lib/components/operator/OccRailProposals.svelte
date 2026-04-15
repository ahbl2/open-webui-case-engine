<script lang="ts">
	/**
	 * P75-07 — OCC proposal navigation rail panel (extracted for dashboard column composition).
	 * P131.6-02 — Explicit empty state (no workspace-wide proposal list; navigation retained).
	 * P131.6-03 — Optional error surface when parent wires a failed request (none today).
	 * P131.6-04 — Region label (h3) + aria-labelledby.
	 * P131.7-08 — Header + count + View all; governance strip; row styling via CSS for future queue wiring.
	 */
	import { getContext } from 'svelte';

	import { DS_TYPE_CLASSES, DS_BTN_CLASSES, DS_OCC_CLASSES } from '$lib/case/detectivePrimitiveFoundation';
	import OccStateContainer from '$lib/components/operator/OccStateContainer.svelte';

	const i18n = getContext('i18n');

	export let goToCases: () => void;
	export let hasError = false;
	export let onRetry: (() => void) | undefined = undefined;
	export let retryDisabled = false;
	export let retryAriaLabel = '';
</script>

<section
	class={DS_OCC_CLASSES.railPanel}
	data-occ-rail-slot="proposals"
	data-testid="occ-rail-proposals"
	aria-labelledby="occ-home-proposals-heading"
>
	<div class={DS_OCC_CLASSES.boardCardHeader}>
		<div class={DS_OCC_CLASSES.sectionHeaderRow}>
			<div class={DS_OCC_CLASSES.sectionHeaderTitle}>
				<h3
					id="occ-home-proposals-heading"
					class="{DS_TYPE_CLASSES.meta} font-semibold uppercase tracking-wide text-[color:var(--ds-text-muted)]"
				>
					{$i18n.t('Proposal review')}
				</h3>
				<span class="ds-occ-rail-prop-count" aria-hidden="true">0</span>
			</div>
			<button
				type="button"
				class="{DS_BTN_CLASSES.ghost} text-sm shrink-0"
				on:click={goToCases}
				data-testid="occ-rail-proposals-view-all"
			>
				{$i18n.t('View all cases →')}
			</button>
		</div>
	</div>
	<div class={DS_OCC_CLASSES.boardCardBody}>
		<OccStateContainer
			{hasError}
			{onRetry}
			{retryDisabled}
			retryAriaLabel={retryAriaLabel || $i18n.t('Retry loading proposals')}
			isLoading={false}
			isEmpty={!hasError}
			emptyTitle={$i18n.t('No proposals awaiting review.')}
			emptySubtext={$i18n.t('Items will appear here when available.')}
			regionMinClass="min-h-[8rem]"
		>
			<svelte:fragment slot="empty">
				<div class="ds-empty-framed ds-empty-compact w-full">
					<p class="ds-empty-title">{$i18n.t('No proposals awaiting review.')}</p>
					<p class="ds-empty-description max-w-none">{$i18n.t('Items will appear here when available.')}</p>
					<button
						type="button"
						class="{DS_BTN_CLASSES.secondary} w-full mt-3 justify-center text-sm"
						on:click={goToCases}
						data-testid="occ-rail-open-cases"
					>
						{$i18n.t('Open Cases')}
					</button>
				</div>
			</svelte:fragment>
		</OccStateContainer>
	</div>
	<div class="ds-occ-rail-prop-governance">
		<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
			<path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
		</svg>
		<p>
			{$i18n.t('Proposals require review before becoming part of the case record.')}
		</p>
	</div>
</section>
