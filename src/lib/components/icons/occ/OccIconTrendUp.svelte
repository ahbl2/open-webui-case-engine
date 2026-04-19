<script lang="ts">
	import { ArrowTrendingUpIcon } from 'heroicons-svelte/24/solid';
	import { occHeroIconClass } from './occHeroIconDefaults';

	export let className = '';
</script>

<ArrowTrendingUpIcon class="{occHeroIconClass.trend} {className}" aria-hidden="true" />
