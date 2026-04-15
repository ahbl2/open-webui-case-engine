<script lang="ts">
	/**
	 * P131.9-05B — Desktop board cell: Activity & review queue (shared with OccHomeCenterColumn composition).
	 */
	import { getContext } from 'svelte';

	import { DS_OCC_CLASSES, DS_TYPE_CLASSES } from '$lib/case/detectivePrimitiveFoundation';
	import OccStateContainer from '$lib/components/operator/OccStateContainer.svelte';

	const i18n = getContext('i18n');

	export let activityHasError = false;
	export let onRetryActivity: (() => void) | undefined = undefined;
	export let activityRetryDisabled = false;

	type OccHomeActivityIconKind = 'person' | 'ai' | 'approval' | 'intel' | 'note';
	type OccHomeActivityItem = {
		id: string;
		iconKind: OccHomeActivityIconKind;
		primaryText: string;
		secondaryText?: string;
		timestampLabel: string;
		badgeClass?: string;
		badgeLabel?: string;
	};

	const HOME_ACTIVITY_ITEMS: OccHomeActivityItem[] = [];
</script>

<section
	class="{DS_OCC_CLASSES.mainSection} min-w-0"
	data-testid="occ-main-activity"
	aria-labelledby="occ-home-activity-heading"
>
	<div class={DS_OCC_CLASSES.boardCardHeader}>
		<div class={DS_OCC_CLASSES.sectionHeaderRow}>
			<div class={DS_OCC_CLASSES.sectionHeaderTitle}>
				<h3
					id="occ-home-activity-heading"
					class="{DS_TYPE_CLASSES.meta} font-semibold uppercase tracking-wide text-[color:var(--ds-text-muted)]"
				>
					{$i18n.t('Activity & review queue')}
				</h3>
			</div>
		</div>
	</div>
	<div class={DS_OCC_CLASSES.boardCardBody}>
		<OccStateContainer
			hasError={activityHasError}
			onRetry={onRetryActivity}
			retryDisabled={activityRetryDisabled}
			retryAriaLabel={$i18n.t('Retry loading activity')}
			isLoading={false}
			isEmpty={!activityHasError}
			emptyTitle={$i18n.t('No activity available.')}
			emptySubtext={$i18n.t('Items will appear here when available.')}
			regionMinClass="min-h-[8rem]"
		>
			<div class="ds-occ-cfeed-list" role="list">
				{#each HOME_ACTIVITY_ITEMS as item (item.id)}
					<article class="ds-occ-cfeed-row" role="listitem">
						<div class="ds-occ-cfeed-row__avatar" aria-hidden="true">
							{#if item.iconKind === 'person'}
								<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z"
									/>
								</svg>
							{:else if item.iconKind === 'ai'}
								<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.847a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.847.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z"
									/>
								</svg>
							{:else if item.iconKind === 'approval'}
								<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
									/>
								</svg>
							{:else if item.iconKind === 'intel'}
								<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
									/>
								</svg>
							{:else}
								<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
									/>
								</svg>
							{/if}
						</div>
						<div class="ds-occ-cfeed-row__body">
							<p class="ds-occ-cfeed-row__primary">{item.primaryText}</p>
							{#if item.secondaryText}
								<p class="ds-occ-cfeed-row__secondary">{item.secondaryText}</p>
							{/if}
						</div>
						<div class="ds-occ-cfeed-row__meta">
							{#if item.badgeClass && item.badgeLabel}
								<span class={item.badgeClass}>{item.badgeLabel}</span>
							{/if}
							<span class="ds-occ-cfeed-row__time">{item.timestampLabel}</span>
						</div>
					</article>
				{/each}
			</div>
		</OccStateContainer>
	</div>
</section>
