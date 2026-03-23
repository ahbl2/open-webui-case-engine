<script lang="ts">
	/** Primary message. Required. */
	export let title: string;

	/** Secondary help text. Optional. */
	export let description = '';

	/** Optional data-testid forwarded to the root element. */
	export let testId = '';
</script>

<!--
	Shared empty-state shell for case workspace tabs.
	Use the "icon" named slot for an optional SVG icon.
	Use the "action" named slot for an optional CTA button.
-->
<div
	class="flex flex-col items-center justify-center gap-2 py-10 rounded-md
	       border border-dashed border-gray-200 dark:border-gray-700
	       bg-gray-50 dark:bg-gray-900 text-center"
	data-testid={testId || undefined}
>
	<slot name="icon" />

	<p class="text-sm text-gray-500 dark:text-gray-400 font-medium">{title}</p>

	{#if description}
		<p class="text-xs text-gray-400 dark:text-gray-500 max-w-xs">{description}</p>
	{/if}

	<slot name="action" />
</div>
