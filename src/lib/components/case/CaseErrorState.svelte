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
	class="rounded-md border border-red-200 dark:border-red-900
	       bg-red-50 dark:bg-red-950/30 px-3 py-2.5"
>
	<p class="text-sm text-red-700 dark:text-red-400 font-medium">{title}</p>
	<p class="text-xs text-red-500 dark:text-red-500 mt-0.5">{message}</p>
	{#if onRetry}
		<button
			type="button"
			class="mt-1.5 text-xs text-red-600 dark:text-red-400 underline"
			on:click={onRetry}
		>Try again</button>
	{/if}
</div>
