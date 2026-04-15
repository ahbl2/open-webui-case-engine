<!--
	P132.5-05 — 24×24 outline icons (Heroicons-style stroke) for right-stack internal tabs; decorative only.
-->
<script lang="ts">
	import { DS_WORKSPACE_SHELL_CLASSES } from '$lib/case/detectivePrimitiveFoundation';

	/** Matches `CaseWorkspaceRightPanelStack` tab ids. */
	export let variant: 'activity' | 'ai-workspace' | 'proposals';
</script>

{#if variant === 'activity'}
	<!-- queue-list / activity feed -->
	<svg
		class={DS_WORKSPACE_SHELL_CLASSES.rightStackTabIcon}
		xmlns="http://www.w3.org/2000/svg"
		fill="none"
		viewBox="0 0 24 24"
		stroke-width="1.5"
		stroke="currentColor"
		aria-hidden="true"
	>
		<path
			stroke-linecap="round"
			stroke-linejoin="round"
			d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0ZM3.75 12h.007v.008H3.75V12Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm-.375 5.25h.007v.008H3.75v-.008Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z"
		/>
	</svg>
{:else if variant === 'ai-workspace'}
	<!-- cpu-chip -->
	<svg
		class={DS_WORKSPACE_SHELL_CLASSES.rightStackTabIcon}
		xmlns="http://www.w3.org/2000/svg"
		fill="none"
		viewBox="0 0 24 24"
		stroke-width="1.5"
		stroke="currentColor"
		aria-hidden="true"
	>
		<path
			stroke-linecap="round"
			stroke-linejoin="round"
			d="M8.25 3v3.5M8.25 17.5V21M12 3v3.5M12 17.5V21M15.75 3v3.5M15.75 17.5V21M3 12h3.5M17.5 12H21M5.25 8.25h13.5a1.5 1.5 0 0 1 1.5 1.5v4.5a1.5 1.5 0 0 1-1.5 1.5H5.25a1.5 1.5 0 0 1-1.5-1.5V9.75a1.5 1.5 0 0 1 1.5-1.5Z"
		/>
	</svg>
{:else}
	<!-- document-text -->
	<svg
		class={DS_WORKSPACE_SHELL_CLASSES.rightStackTabIcon}
		xmlns="http://www.w3.org/2000/svg"
		fill="none"
		viewBox="0 0 24 24"
		stroke-width="1.5"
		stroke="currentColor"
		aria-hidden="true"
	>
		<path
			stroke-linecap="round"
			stroke-linejoin="round"
			d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
		/>
	</svg>
{/if}
