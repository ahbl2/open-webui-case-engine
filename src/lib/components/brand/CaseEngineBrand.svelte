<script lang="ts">
	/**
	 * Case Engine brand lockup — canonical raster in `static/brand/` (e.g. `case-engine-lockup-medium.png`).
	 * Variants only control layout size; no CSS color/glow filters on the image.
	 */
	import type { CaseEngineBrandVariant } from './caseEngineBrandTypes';

	interface Props {
		variant?: CaseEngineBrandVariant;
		class?: string;
	}

	let { variant = 'sidebar', class: className = '' }: Props = $props();

	const variantClass = $derived(
		({
			sidebar: 'ds-case-engine-brand--sidebar',
			header: 'ds-case-engine-brand--header',
			compact: 'ds-case-engine-brand--compact'
		})[variant]
	);

	const LOCKUP_SRC = '/brand/case-engine-lockup-medium.png';
</script>

<div
	class="ds-case-engine-brand {variantClass} {className}"
	role="img"
	aria-label="Case Engine"
>
	<img
		class="ds-case-engine-brand__img"
		src={LOCKUP_SRC}
		alt=""
		width="1536"
		height="1024"
		decoding="async"
		draggable="false"
	/>
</div>
