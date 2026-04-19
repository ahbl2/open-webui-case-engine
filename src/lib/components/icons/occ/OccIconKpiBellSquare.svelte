<script lang="ts">
	import { BellAlertIcon } from 'heroicons-svelte/24/solid';
	import { occHeroIconClass } from './occHeroIconDefaults';

	export let className = '';
</script>

<BellAlertIcon class="{occHeroIconClass.kpi} {className}" aria-hidden="true" />
