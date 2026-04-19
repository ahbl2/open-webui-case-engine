<script lang="ts">
	import { Squares2x2Icon } from 'heroicons-svelte/24/solid';
	import { occHeroIconClass } from './occHeroIconDefaults';

	export let className = '';
</script>

<Squares2x2Icon class="{occHeroIconClass.gnav} {className}" aria-hidden="true" />
