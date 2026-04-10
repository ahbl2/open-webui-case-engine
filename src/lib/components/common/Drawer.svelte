<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { flyAndScale } from '$lib/utils/transitions';
	import { fade, fly, slide } from 'svelte/transition';

	export let show = false;
	/** P74-08 — Extra classes on drawer panel (defaults to DS drawer surface). */
	export let className = 'ds-drawer-panel';
	export let onClose = () => {};

	let modalElement = null;
	let mounted = false;

	const handleKeyDown = (event: KeyboardEvent) => {
		if (event.key === 'Escape' && isTopModal()) {
			console.log('Escape');
			show = false;
		}
	};

	const isTopModal = () => {
		const modals = document.getElementsByClassName('modal');
		return modals.length && modals[modals.length - 1] === modalElement;
	};

	onMount(() => {
		mounted = true;
	});

	$: if (show && modalElement) {
		document.body.appendChild(modalElement);
		window.addEventListener('keydown', handleKeyDown);
		document.body.style.overflow = 'hidden';
	} else if (modalElement) {
		onClose();
		window.removeEventListener('keydown', handleKeyDown);

		if (document.body.contains(modalElement)) {
			document.body.removeChild(modalElement);
			document.body.style.overflow = 'unset';
		}
	}

	onDestroy(() => {
		show = false;
		if (modalElement) {
			if (document.body.contains(modalElement)) {
				document.body.removeChild(modalElement);
				document.body.style.overflow = 'unset';
			}
		}
	});
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
{#if show}
	<div
		bind:this={modalElement}
		class="modal ds-overlay-backdrop ds-overlay-backdrop-drawer z-999 flex h-screen max-h-[100dvh] w-full overflow-hidden overscroll-contain"
		in:fly={{ y: 100, duration: 100 }}
		on:mousedown={() => {
			show = false;
		}}
	>
		<div
			class="modal-content mt-auto w-full scrollbar-hidden max-h-[100dvh] overflow-y-auto {className}"
			on:mousedown={(e) => {
				e.stopPropagation();
			}}
		>
			<slot />
		</div>
	</div>
{/if}

<style>
	.modal-content {
		animation: scaleUp 0.1s ease-out forwards;
	}

	@keyframes scaleUp {
		from {
			transform: scale(0.985);
			opacity: 0;
		}
		to {
			transform: scale(1);
			opacity: 1;
		}
	}
</style>
