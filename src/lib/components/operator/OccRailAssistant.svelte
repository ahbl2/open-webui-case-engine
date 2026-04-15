<script lang="ts">
	/**
	 * P75-07 — OCC AI Assistant rail panel (extracted for dashboard column composition).
	 * P131.6-02 — Loading / empty / data states (session + binding).
	 * P131.6-03 — Binding failure uses standardized error + Retry (no raw messages).
	 * P131.6-04 — Region label (h3) + aria-labelledby.
	 * P131.7-08 — Header actions + input/send row + suggestion pill chrome (behavior unchanged).
	 * P131.8-06 — Input/send emphasis via `detectiveSurfaces.css` only (no logic changes).
	 */
	import { getContext } from 'svelte';

	import { DS_BTN_CLASSES, DS_OCC_CLASSES, DS_TYPE_CLASSES } from '$lib/case/detectivePrimitiveFoundation';
	import OccStateContainer from '$lib/components/operator/OccStateContainer.svelte';
	import OccSkeletonList from '$lib/components/operator/OccSkeletonList.svelte';

	const i18n = getContext('i18n');

	export let newChat: () => void;
	export let bindingInProgress: boolean;
	export let hasToken: boolean;
	/** True when a personal-thread binding attempt failed (session present). */
	export let bindingErrorActive = false;
	export let onRetryBinding: (() => void) | undefined = undefined;

	$: hasErr = Boolean(hasToken && bindingErrorActive);
	$: loading = Boolean(hasToken && bindingInProgress && !bindingErrorActive);
	$: empty = !hasToken;

	/** Populated when quick prompts are wired; structure only. */
	const HOME_ASSISTANT_SUGGESTIONS: { id: string; text: string }[] = [];

	function sendOrOpenChat(): void {
		newChat();
	}
</script>

<section
	class={DS_OCC_CLASSES.railPanel}
	data-occ-rail-slot="assistant"
	data-testid="occ-rail-assistant"
	aria-labelledby="occ-home-assistant-heading"
>
	<div class={DS_OCC_CLASSES.boardCardHeader}>
		<div class={DS_OCC_CLASSES.sectionHeaderRow}>
			<div class={DS_OCC_CLASSES.sectionHeaderTitle}>
				<h3
					id="occ-home-assistant-heading"
					class="{DS_TYPE_CLASSES.meta} font-semibold uppercase tracking-wide text-[color:var(--ds-text-muted)]"
				>
					{$i18n.t('AI Assistant — Quick Ask')}
				</h3>
			</div>
			<button
				type="button"
				class="{DS_BTN_CLASSES.ghost} text-sm shrink-0 inline-flex items-center gap-1"
				on:click={newChat}
				disabled={bindingInProgress || !hasToken}
			>
				<span aria-hidden="true" class="font-semibold">+</span>
				<span>{$i18n.t('New desktop chat')}</span>
			</button>
		</div>
	</div>
	<div class={DS_OCC_CLASSES.boardCardBody}>
		<OccStateContainer
			hasError={hasErr}
			onRetry={onRetryBinding}
			retryDisabled={bindingInProgress}
			retryAriaLabel={$i18n.t('Retry personal thread setup')}
			isLoading={loading}
			isEmpty={empty}
			emptyTitle={$i18n.t('Case Engine session required.')}
			emptySubtext=""
			regionMinClass="min-h-[8rem]"
		>
			<svelte:fragment slot="loading">
				<OccSkeletonList rows={2} />
			</svelte:fragment>
			<div class="ds-occ-rail-assist-stack">
				<p class="ds-occ-rail-assist-intro {DS_TYPE_CLASSES.body}">
					{$i18n.t('Start a personal desktop thread for full chat, or open a case for Ask with case context.')}
				</p>
				<div class="ds-occ-rail-assist-input-shell">
					<input
						type="text"
						class="ds-occ-rail-assist-input"
						disabled={bindingInProgress || !hasToken}
						aria-label={$i18n.t('Ask a question')}
						value=""
					/>
					<button
						type="button"
						class="ds-occ-rail-assist-send"
						on:click={sendOrOpenChat}
						disabled={bindingInProgress || !hasToken}
						data-testid="occ-rail-new-chat"
						aria-label={$i18n.t('New desktop chat')}
					>
						<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.847a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.847.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z"
							/>
						</svg>
					</button>
				</div>
				{#if HOME_ASSISTANT_SUGGESTIONS.length > 0}
					<ul class="ds-occ-rail-assist-pills" aria-label={$i18n.t('Suggested prompts')}>
						{#each HOME_ASSISTANT_SUGGESTIONS as s (s.id)}
							<li>
								<div class="ds-occ-rail-assist-pill" role="presentation">
									<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
										<path stroke-linecap="round" stroke-linejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
									</svg>
									<span>{s.text}</span>
								</div>
							</li>
						{/each}
					</ul>
				{/if}
			</div>
		</OccStateContainer>
	</div>
</section>
