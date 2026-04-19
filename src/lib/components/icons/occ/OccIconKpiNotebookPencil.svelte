<script lang="ts">
	import { PencilSquareIcon } from 'heroicons-svelte/24/solid';
	import { occHeroIconClass } from './occHeroIconDefaults';

	export let className = '';
</script>

<PencilSquareIcon class="{occHeroIconClass.kpi} {className}" aria-hidden="true" />
