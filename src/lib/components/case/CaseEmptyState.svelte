<script lang="ts">
	/** Primary message. Required. */
	export let title: string;

	/** Secondary help text. Optional. */
	export let description = '';

	/** Optional data-testid forwarded to the root element. */
	export let testId = '';

	/** When false, omit the dashed outer card (for embedding inside a parent shell). Defaults true. */
	export let framed = true;
</script>

<!--
	Shared empty-state shell for case workspace tabs.
	Use the "icon" named slot for an optional SVG icon.
	Use the "action" named slot for an optional CTA button.
-->
<div
	class="flex flex-col items-center justify-center gap-2 text-center
	       {framed ? 'py-10 ce-l-empty-framed' : 'py-6'}"
	data-testid={testId || undefined}
>
	<slot name="icon" />

	<p class="text-sm font-medium text-[color:var(--ce-l-text-secondary)]">{title}</p>

	{#if description}
		<p class="text-xs max-w-xs text-[color:var(--ce-l-text-muted)]">{description}</p>
	{/if}

	<slot name="action" />
</div>
