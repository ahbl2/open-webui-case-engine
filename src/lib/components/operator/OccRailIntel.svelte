<script lang="ts">
	/**
	 * P75-07 — OCC intelligence placeholder rail panel (extracted for dashboard column composition).
	 * P131.6-02 — Explicit empty state (no workspace feed API).
	 * P131.6-03 — Optional error surface (parent-owned; no raw messages).
	 * P131.6-04 — Region label (h3) + aria-labelledby.
	 * P131.7-07 — Alert row chrome (signal icon | text stack | meta); data array empty until feed API exists.
	 */
	import { getContext } from 'svelte';

	import { DS_OCC_CLASSES, DS_TYPE_CLASSES } from '$lib/case/detectivePrimitiveFoundation';
	import OccStateContainer from '$lib/components/operator/OccStateContainer.svelte';

	const i18n = getContext('i18n');

	export let hasError = false;
	export let onRetry: (() => void) | undefined = undefined;
	export let retryDisabled = false;
	export let retryAriaLabel = '';

	type OccHomeIntelIconKind = 'vehicle' | 'person' | 'location' | 'phone' | 'generic';
	type OccHomeIntelAlert = {
		id: string;
		iconKind: OccHomeIntelIconKind;
		categoryLabel: string;
		subject: string;
		contextLine?: string;
		timestampLabel: string;
		badgeClass?: string;
		badgeLabel?: string;
	};

	const HOME_INTEL_ALERTS: OccHomeIntelAlert[] = [];
</script>

<section
	class="{DS_OCC_CLASSES.railPanel}"
	data-occ-rail-slot="intel"
	data-testid="occ-rail-intel"
	aria-labelledby="occ-home-intel-heading"
>
	<div class={DS_OCC_CLASSES.boardCardHeader}>
		<div class={DS_OCC_CLASSES.sectionHeaderRow}>
			<div class={DS_OCC_CLASSES.sectionHeaderTitle}>
				<h3
					id="occ-home-intel-heading"
					class="{DS_TYPE_CLASSES.meta} font-semibold uppercase tracking-wide text-[color:var(--ds-text-muted)]"
				>
					{$i18n.t('Intelligence / alert feed')}
				</h3>
			</div>
		</div>
	</div>
	<div class={DS_OCC_CLASSES.boardCardBody}>
		<OccStateContainer
			{hasError}
			{onRetry}
			{retryDisabled}
			retryAriaLabel={retryAriaLabel || $i18n.t('Retry loading intelligence feed')}
			isLoading={false}
			isEmpty={!hasError}
			emptyTitle={$i18n.t('No intelligence alerts available.')}
			emptySubtext={$i18n.t('Items will appear here when available.')}
			regionMinClass="min-h-[6rem]"
		>
			<div class="ds-occ-cintel-list" role="list">
				{#each HOME_INTEL_ALERTS as alert (alert.id)}
					<article class="ds-occ-cintel-row" role="listitem">
						<div class="ds-occ-cintel-row__icon" aria-hidden="true">
							{#if alert.iconKind === 'vehicle'}
								<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
									<path stroke-linecap="round" stroke-linejoin="round" d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0h.375c.621 0 1.125.504 1.125 1.125V21M18 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h.375c.621 0 1.125.504 1.125 1.125V21M4.5 3.75h15l-1.5 6h-12l-1.5-6Z" />
								</svg>
							{:else if alert.iconKind === 'person'}
								<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
									<path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
								</svg>
							{:else if alert.iconKind === 'location'}
								<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
									<path stroke-linecap="round" stroke-linejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
									<path stroke-linecap="round" stroke-linejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
								</svg>
							{:else if alert.iconKind === 'phone'}
								<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
									<path stroke-linecap="round" stroke-linejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z" />
								</svg>
							{:else}
								<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
									<path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
								</svg>
							{/if}
						</div>
						<div class="ds-occ-cintel-row__stack">
							<p class="ds-occ-cintel-row__cat">{alert.categoryLabel}</p>
							<p class="ds-occ-cintel-row__subject">{alert.subject}</p>
							{#if alert.contextLine}
								<p class="ds-occ-cintel-row__ctx">{alert.contextLine}</p>
							{/if}
						</div>
						<div class="ds-occ-cintel-row__meta">
							{#if alert.badgeClass && alert.badgeLabel}
								<span class={alert.badgeClass}>{alert.badgeLabel}</span>
							{/if}
							<span class="ds-occ-cintel-row__time">{alert.timestampLabel}</span>
						</div>
					</article>
				{/each}
			</div>
		</OccStateContainer>
	</div>
</section>
