<script lang="ts">
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

<div
	class="rounded-md border px-3 py-2.5 bg-[var(--ce-l-error-bg)] [border-color:var(--ce-l-error-border)]"
>
	<p class="text-sm font-medium text-[color:var(--ce-l-error-title)]">{title}</p>
	<p class="text-xs mt-0.5 text-[color:var(--ce-l-error-text)]">{message}</p>
	{#if onRetry}
		<button type="button" class="ce-l-error-retry-link" on:click={onRetry}>Try again</button>
	{/if}
</div>
