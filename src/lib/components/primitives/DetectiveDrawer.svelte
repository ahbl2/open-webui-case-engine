<script lang="ts">
	/**
	 * P74-08 — Detective drawer / bottom sheet entry point (reuses `Drawer` + DS overlay/panel classes).
	 */
	import Drawer from '$lib/components/common/Drawer.svelte';

	export let show = false;
	export let className = '';
	export let onClose = () => {};
</script>

<Drawer bind:show {onClose} className={className || undefined}>
	<slot />
</Drawer>
