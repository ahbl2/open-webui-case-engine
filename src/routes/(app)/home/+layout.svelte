<script lang="ts">
	import { onMount, getContext } from 'svelte';
	import { WEBUI_NAME, showSidebar, functions, mobile } from '$lib/stores';
	import Tooltip from '$lib/components/common/Tooltip.svelte';
	import Sidebar from '$lib/components/icons/Sidebar.svelte';
	import { isDetectiveWave2AppShellEnabled } from '$lib/case/detectiveWave2Shell';

	const i18n = getContext('i18n');

	/** P75-06-FU: document title matches OCC vs legacy home shell. */
	$: wave2ShellChrome = isDetectiveWave2AppShellEnabled();

	onMount(async () => {});
</script>

<svelte:head>
	<title>
		{wave2ShellChrome ? $i18n.t('Operator Command Center') : $i18n.t('Home')} • {$WEBUI_NAME}
	</title>
</svelte:head>

<div
	class="flex flex-col w-full h-screen max-h-[100dvh] transition-width duration-200 ease-in-out max-w-full"
>
	<!-- P19: My Desktop is detective-owned. No legacy OWUI tabs (Notes, Calendar, Completions). -->
	<nav class="px-2.5 pt-1.5 backdrop-blur-xl w-full drag-region">
		<div class="flex items-center">
			{#if $mobile}
				<div class="{$showSidebar ? 'md:hidden' : ''} flex flex-none items-center self-end mt-1.5">
					<Tooltip
						content={$showSidebar ? $i18n.t('Close Sidebar') : $i18n.t('Open Sidebar')}
						interactive={true}
					>
						<button
							id="sidebar-toggle-button"
							class="cursor-pointer flex rounded-lg hover:bg-gray-100 dark:hover:bg-gray-850 transition"
							on:click={() => {
								showSidebar.set(!$showSidebar);
							}}
						>
							<div class="self-center p-1.5">
								<Sidebar />
							</div>
						</button>
					</Tooltip>
				</div>
			{/if}
		</div>
	</nav>

	<div class=" flex-1 max-h-full overflow-y-auto">
		<slot />
	</div>
</div>
