<script lang="ts">
	import { FolderIcon } from 'heroicons-svelte/24/solid';
	import { occHeroIconClass } from './occHeroIconDefaults';

	export let className = '';
	export let variant: 'gnav' | 'kpi' = 'gnav';
</script>

<FolderIcon
	class="{variant === 'kpi' ? occHeroIconClass.kpi : occHeroIconClass.gnav} {className}"
	aria-hidden="true"
/>
