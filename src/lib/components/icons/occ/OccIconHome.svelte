<script lang="ts">
	import { HomeIcon } from 'heroicons-svelte/24/solid';
	import { occHeroIconClass } from './occHeroIconDefaults';

	export let className = '';
	/** `gnav` — primary nav; `hero` — OCC banner; `legacy` — 24px (pre–Wave-2 home). */
	export let variant: 'gnav' | 'hero' | 'legacy' = 'gnav';
</script>

<HomeIcon
	class="{variant === 'gnav'
		? occHeroIconClass.gnav
		: variant === 'hero'
			? occHeroIconClass.hero
			: 'inline-block h-6 w-6'} {className}"
	aria-hidden="true"
/>
