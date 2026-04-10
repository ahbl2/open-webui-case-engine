<script lang="ts">
	/**
	 * P74-04 — Detective-styled tooltip: wraps upstream `Tooltip` (tippy) with `theme="detective"` + DS CSS.
	 */
	import Tooltip from '$lib/components/common/Tooltip.svelte';
	import type { Placement } from 'tippy.js';
	import type { Props as TippyProps } from 'tippy.js';

	export let content = '';
	export let placement: Placement = 'top';
	export let as = 'div';
	export let touch = true;
	export let allowHTML = true;
	export let interactive = false;
	export let elementId = '';
	export let offset: TippyProps['offset'] = [0, 6];
	export let tippyOptions: Partial<TippyProps> = {};
	export let onClick = () => {};
	/** Icon-dense chrome: default `help` cursor; use dense for default cursor. */
	export let dense = false;
	export let className = '';

	$: triggerClass = [
		dense ? 'ds-tooltip-trigger ds-tooltip-trigger--dense' : 'ds-tooltip-trigger',
		'inline-flex',
		className
	]
		.filter(Boolean)
		.join(' ');
</script>

<Tooltip
	{as}
	theme="detective"
	className={triggerClass}
	{elementId}
	{content}
	{placement}
	{touch}
	{allowHTML}
	{interactive}
	{offset}
	{tippyOptions}
	{onClick}
>
	<slot />
</Tooltip>
