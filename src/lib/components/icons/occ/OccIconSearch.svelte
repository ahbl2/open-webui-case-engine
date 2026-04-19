<script lang="ts">
	import { MagnifyingGlassIcon } from 'heroicons-svelte/24/solid';
	import { occHeroIconClass } from './occHeroIconDefaults';

	export let className = '';
</script>

<MagnifyingGlassIcon class="{occHeroIconClass.gnav} {className}" aria-hidden="true" />
