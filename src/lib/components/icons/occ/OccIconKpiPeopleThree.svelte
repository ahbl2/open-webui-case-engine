<script lang="ts">
	import { FolderOpenIcon } from 'heroicons-svelte/24/solid';
	import { occHeroIconClass } from './occHeroIconDefaults';

	export let className = '';
</script>

<FolderOpenIcon class="{occHeroIconClass.kpi} {className}" aria-hidden="true" />
