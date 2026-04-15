<script lang="ts">
	/**
	 * P131.6-03 — Factual dashboard error surface (no raw backend messages).
	 * P131.6-04 — Optional `retryAriaLabel` when multiple Retry controls exist on the page.
	 */
	import { getContext } from 'svelte';

	import { DS_BTN_CLASSES, DS_TYPE_CLASSES } from '$lib/case/detectivePrimitiveFoundation';

	const i18n = getContext('i18n');

	export let onRetry: (() => void) | undefined = undefined;
	export let retryDisabled = false;
	export let retryAriaLabel = '';
</script>

<div
	class="rounded-[var(--ds-radius-md)] border border-[color:var(--ds-border-default)] bg-[color:var(--ds-bg-muted)] p-4"
	data-testid="occ-error-block"
>
	<p class="{DS_TYPE_CLASSES.body} font-medium text-[color:var(--ds-text-primary)]">
		{$i18n.t('Unable to load data.')}
	</p>
	<p class="{DS_TYPE_CLASSES.meta} mt-1.5 text-[color:var(--ds-text-secondary)]">
		{$i18n.t('Please try again.')}
	</p>
	{#if onRetry}
		<button
			type="button"
			class="{DS_BTN_CLASSES.secondary} mt-3 w-full justify-center text-sm sm:w-auto"
			disabled={retryDisabled}
			on:click={onRetry}
			data-testid="occ-error-retry"
			aria-label={retryAriaLabel || undefined}
		>
			{$i18n.t('Retry')}
		</button>
	{/if}
</div>
