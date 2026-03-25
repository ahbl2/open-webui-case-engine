<script>
	import { getContext, tick, onMount } from 'svelte';
	import { toast } from 'svelte-sonner';

	import { goto } from '$app/navigation';
	import { user } from '$lib/stores';
	import { page } from '$app/stores';

	import UserList from './Users/UserList.svelte';
	// P27-25: Groups import removed — Groups is not part of the Case Engine authority model.

	const i18n = getContext('i18n');

	let selectedTab;
	$: {
		const pathParts = $page.url.pathname.split('/');
		const tabFromPath = pathParts[pathParts.length - 1];
		// P27-25: 'groups' removed — any path to /admin/users/groups falls back to 'overview'.
		selectedTab = ['overview'].includes(tabFromPath) ? tabFromPath : 'overview';
	}

	$: if (selectedTab) {
		// scroll to selectedTab
		scrollToTab(selectedTab);
	}

	const scrollToTab = (tabId) => {
		const tabElement = document.getElementById(tabId);
		if (tabElement) {
			tabElement.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' });
		}
	};

	let loaded = false;

	onMount(async () => {
		if ($user?.role !== 'admin') {
			await goto('/');
		}

		loaded = true;

		const containerElement = document.getElementById('users-tabs-container');

		if (containerElement) {
			containerElement.addEventListener('wheel', function (event) {
				if (event.deltaY !== 0) {
					// Adjust horizontal scroll position based on vertical scroll
					containerElement.scrollLeft += event.deltaY;
				}
			});
		}

		// Scroll to the selected tab on mount
		scrollToTab(selectedTab);
	});
</script>

<div class="flex flex-col lg:flex-row w-full h-full pb-2 lg:space-x-4">
	<div
		id="users-tabs-container"
		class="mx-[16px] lg:mx-0 lg:px-[16px] flex flex-row overflow-x-auto gap-2.5 max-w-full lg:gap-1 lg:flex-col lg:flex-none lg:w-50 dark:text-gray-200 text-sm font-medium text-left scrollbar-none"
	>
		<a
			id="overview"
			href="/admin/users/overview"
			draggable="false"
			class="px-0.5 py-1 min-w-fit rounded-lg lg:flex-none flex text-right transition select-none {selectedTab ===
			'overview'
				? ''
				: ' text-gray-300 dark:text-gray-600 hover:text-gray-700 dark:hover:text-white'}"
		>
			<div class=" self-center mr-2">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					viewBox="0 0 16 16"
					fill="currentColor"
					class="size-4"
				>
					<path
						d="M8.5 4.5a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0ZM10.9 12.006c.11.542-.348.994-.9.994H2c-.553 0-1.01-.452-.902-.994a5.002 5.002 0 0 1 9.803 0ZM14.002 12h-1.59a2.556 2.556 0 0 0-.04-.29 6.476 6.476 0 0 0-1.167-2.603 3.002 3.002 0 0 1 3.633 1.911c.18.522-.283.982-.836.982ZM12 8a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"
					/>
				</svg>
			</div>
			<div class=" self-center">{$i18n.t('Overview')}</div>
		</a>

		<!-- P27-25: Groups tab removed — not part of the Case Engine authority model. -->
	</div>

	<div class="flex-1 mt-1 lg:mt-0 px-[16px] lg:pr-[16px] lg:pl-0 overflow-y-scroll">
		{#if selectedTab === 'overview'}
			<UserList />
		{/if}
	</div>
</div>
