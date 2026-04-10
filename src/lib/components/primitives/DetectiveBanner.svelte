<script lang="ts">
	/**
	 * P74-07 — Dense inline/panel-top banner: layout + semantic surface (non-domain copy).
	 * Pair `ds-banner` with `ds-status-surface-*` via `variant`.
	 */
	import {
		DS_BANNER_CLASSES,
		DS_STATUS_SURFACE_CLASSES
	} from '$lib/case/detectivePrimitiveFoundation';

	export type DetectiveBannerVariant = keyof typeof DS_STATUS_SURFACE_CLASSES;

	export let variant: DetectiveBannerVariant = 'info';
	export let dense = false;

	$: surfaceClass = DS_STATUS_SURFACE_CLASSES[variant];
	$: rootClass = [
		DS_BANNER_CLASSES.base,
		surfaceClass,
		dense ? DS_BANNER_CLASSES.denseModifier : ''
	]
		.filter(Boolean)
		.join(' ');
</script>

<div class={rootClass} role="status">
	{#if $$slots.label}
		<span class={DS_BANNER_CLASSES.label}><slot name="label" /></span>
	{/if}
	<div class="{DS_BANNER_CLASSES.body} ds-status-copy">
		<slot />
	</div>
</div>
