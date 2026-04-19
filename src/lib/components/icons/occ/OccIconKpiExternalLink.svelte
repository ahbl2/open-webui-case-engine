<script lang="ts">
	import { ArrowTopRightOnSquareIcon } from 'heroicons-svelte/24/solid';
	import { occHeroIconClass } from './occHeroIconDefaults';

	export let className = '';
</script>

<ArrowTopRightOnSquareIcon class="{occHeroIconClass.kpi} {className}" aria-hidden="true" />
