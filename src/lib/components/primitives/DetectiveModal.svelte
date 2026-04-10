<script lang="ts">
	/**
	 * P74-08 — Detective modal entry point (reuses `Modal` + DS overlay/panel classes).
	 */
	import Modal from '$lib/components/common/Modal.svelte';

	export let show = true;
	export let size = 'md';
	export let containerClassName = 'p-3';
	export let className = '';
</script>

<Modal bind:show {size} {containerClassName} className={className || undefined}>
	<slot />
</Modal>
