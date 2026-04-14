<!--
	P132.5-01 — Shell-level panel frame: optional title strip + scrollable body slot.
	Presentation only; parent supplies content. No data loading or mutation controls.
	P132.5-02 — `delegateBodyScroll`: body is a bounded flex column so route content (e.g. `.ce-l-content-region`) owns the scrollport.
-->
<script lang="ts">
	import { DS_TYPE_CLASSES } from '$lib/case/detectivePrimitiveFoundation';

	const PANEL_BODY_ARIA = 'body';

	/** Visible heading for the panel chrome (structural). */
	export let title = '';
	export let testId = 'case-workspace-shell-panel';

	/**
	 * When true, panel body does not scroll; child is expected to fill height and manage overflow (Tier L nested scroll).
	 * When false (default), body uses `overflow-auto` for self-contained panels.
	 */
	export let delegateBodyScroll = false;
</script>

<section
	class="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded border border-[color:var(--ce-l-border-subtle)] bg-[color:var(--ce-l-surface)]"
	data-testid={testId}
	data-region="case-workspace-shell-panel"
	data-p1325-delegate-body-scroll={delegateBodyScroll ? 'true' : undefined}
>
	{#if title}
		<header
			class="shrink-0 border-b border-[color:var(--ce-l-border-subtle)] px-2 py-1.5"
			data-testid="{testId}-title"
			data-region="case-workspace-shell-panel-title"
		>
			<h2
				class="{DS_TYPE_CLASSES.meta} m-0 font-medium text-[color:var(--ce-l-text-secondary)]"
			>
				{title}
			</h2>
		</header>
	{/if}
	<div
		class="min-h-0 flex-1 {delegateBodyScroll
			? 'flex flex-col overflow-hidden p-0'
			: 'overflow-auto p-2'}"
		data-testid="{testId}-body"
		data-region="case-workspace-shell-panel-body"
		aria-label={title ? `${title} ${PANEL_BODY_ARIA}` : PANEL_BODY_ARIA}
	>
		<slot />
	</div>
</section>
