<script lang="ts">
	/**
	 * P74-07 — DS error primitive (`ds-error*`); retry uses `DS_BTN_CLASSES` (no separate link dialect).
	 */
	import { DS_BTN_CLASSES } from '$lib/case/detectivePrimitiveFoundation';

	/** Primary heading — override for context-specific wording. */
	export let title = 'Failed to load';

	/** Error message text from the caught exception. Required. */
	export let message: string;

	/**
	 * When provided, a "Try again" button is shown that calls this handler.
	 * Omit to render error information only (no retry affordance).
	 */
	export let onRetry: (() => void) | undefined = undefined;
</script>

<div class="ds-error">
	<p class="ds-error-title">{title}</p>
	<p class="ds-error-message">{message}</p>
	<div class="ds-error-details">
		<slot name="details" />
	</div>
	{#if onRetry}
		<div class="ds-error-actions">
			<button type="button" class={DS_BTN_CLASSES.secondary} on:click={onRetry}>Try again</button>
		</div>
	{/if}
</div>
