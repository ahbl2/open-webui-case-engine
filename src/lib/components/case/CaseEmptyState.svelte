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
	P74-06: DS classes (`ds-empty*`). Tier L `.ce-l-empty-framed` remains in `caseWorkspaceTierL.css` for other call sites; this component uses `ds-empty-framed` (same posture, token-backed).
	Use the "icon" named slot for an optional SVG icon.
	Use the "action" named slot for an optional CTA button.
-->
<div
	class="ds-empty {framed ? 'ds-empty-framed' : 'ds-empty-compact'}"
	data-testid={testId || undefined}
>
	<slot name="icon" />

	<p class="ds-empty-title">{title}</p>

	{#if description}
		<p class="ds-empty-description">{description}</p>
	{/if}

	<slot name="action" />
</div>
