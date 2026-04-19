<script lang="ts">
	import { ShieldCheckIcon } from 'heroicons-svelte/24/solid';
	import { occHeroIconClass } from './occHeroIconDefaults';

	export let className = '';
</script>

<ShieldCheckIcon class="{occHeroIconClass.gnav} {className}" aria-hidden="true" />
