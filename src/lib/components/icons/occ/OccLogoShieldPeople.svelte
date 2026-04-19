<script lang="ts">
	/**
	 * Sidebar mark — Heroicons solid: shield (check) + users cluster (mockup: shield + people).
	 */
	import { ShieldCheckIcon } from 'heroicons-svelte/24/solid';
	import { UsersIcon } from 'heroicons-svelte/24/solid';
	import { occHeroIconClass } from './occHeroIconDefaults';

	export let className = '';
</script>

<div class={`relative inline-flex items-center justify-center ${className}`} aria-hidden="true">
	<ShieldCheckIcon class={occHeroIconClass.logoShield} />
	<UsersIcon class={occHeroIconClass.logoUsers} />
</div>
