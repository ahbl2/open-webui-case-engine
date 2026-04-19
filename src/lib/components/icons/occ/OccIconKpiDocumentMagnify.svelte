<script lang="ts">
	import { DocumentTextIcon } from 'heroicons-svelte/24/solid';
	import { occHeroIconClass } from './occHeroIconDefaults';

	export let className = '';
</script>

<DocumentTextIcon class="{occHeroIconClass.kpi} {className}" aria-hidden="true" />
