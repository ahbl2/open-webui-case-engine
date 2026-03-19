<script lang="ts">
	/**
	 * Unified workspace sidebar (detective + admin).
	 * Used for /home, /cases, /search, /case/[id]/..., /admin — retractable, state persisted in localStorage.
	 */
	import { onMount, getContext } from 'svelte';
	import { goto } from '$app/navigation';
	import {
		showSidebar,
		sidebarWidth,
		mobile,
		user,
		config,
		showSearch
	} from '$lib/stores';
	import { slide } from 'svelte/transition';
	import Tooltip from '$lib/components/common/Tooltip.svelte';
	import CasesSection from '$lib/components/layout/Sidebar/CasesSection.svelte';
	import UserMenu from '$lib/components/layout/Sidebar/UserMenu.svelte';
	import SearchModal from '$lib/components/layout/SearchModal.svelte';
	import SidebarIcon from '$lib/components/icons/Sidebar.svelte';
	import { WEBUI_API_BASE_URL } from '$lib/constants';

	const i18n = getContext('i18n');

	const MIN_WIDTH = 220;
	const MAX_WIDTH = 480;
	const APP_NAME = 'Detective Workspace';

	let navElement: HTMLElement | undefined;
	let isResizing = false;
	let startWidth = 0;
	let startClientX = 0;
	let scrollTop = 0;

	function itemClickHandler() {
		if ($mobile) showSidebar.set(false);
	}

	const resizeStartHandler = (e: MouseEvent) => {
		if ($mobile) return;
		isResizing = true;
		startClientX = e.clientX;
		startWidth = $sidebarWidth ?? 260;
		document.body.style.userSelect = 'none';
	};

	const resizeEndHandler = () => {
		if (!isResizing) return;
		isResizing = false;
		document.body.style.userSelect = '';
		localStorage.setItem('sidebarWidth', String($sidebarWidth));
	};

	const resizeSidebarHandler = (endClientX: number) => {
		const dx = endClientX - startClientX;
		const newSidebarWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startWidth + dx));
		sidebarWidth.set(newSidebarWidth);
		document.documentElement.style.setProperty('--sidebar-width', `${newSidebarWidth}px`);
	};

	onMount(() => {
		try {
			const width = Number(localStorage.getItem('sidebarWidth'));
			if (!Number.isNaN(width) && width >= MIN_WIDTH && width <= MAX_WIDTH) {
				sidebarWidth.set(width);
			}
		} catch {}
		document.documentElement.style.setProperty('--sidebar-width', `${$sidebarWidth}px`);
		const unsubWidth = sidebarWidth.subscribe((w) => {
			document.documentElement.style.setProperty('--sidebar-width', `${w}px`);
		});
		// Desktop default: OPEN. Remember last choice after first interaction (persist on change).
		const saved = localStorage.getItem('sidebar');
		showSidebar.set(!$mobile ? (saved !== null ? saved === 'true' : true) : false);
		const unsubSidebar = showSidebar.subscribe((value) => {
			localStorage.setItem('sidebar', String(value));
		});
		return () => {
			unsubWidth();
			unsubSidebar();
		};
	});
</script>

<svelte:window
	on:mousemove={(e) => {
		if (!isResizing) return;
		resizeSidebarHandler(e.clientX);
	}}
	on:mouseup={resizeEndHandler}
/>

<SearchModal
	bind:show={$showSearch}
	onClose={() => {
		if ($mobile) showSidebar.set(false);
	}}
/>

{#if $showSidebar}
	<div
		class="fixed top-0 right-0 left-0 bottom-0 z-40 md:hidden bg-black/60 w-full min-h-screen h-screen flex justify-center overflow-hidden overscroll-contain"
		on:mousedown={() => showSidebar.set(!$showSidebar)}
		role="presentation"
		aria-hidden="true"
	/>
{/if}

{#if !$mobile && !$showSidebar}
	<!-- Collapsed rail -->
	<div
		class="fixed left-0 top-0 bottom-0 z-50 pt-[7px] pb-2 px-2 flex flex-col justify-between text-black dark:text-white hover:bg-gray-50/30 dark:hover:bg-gray-950/30 h-full transition-all border-e-[0.5px] border-gray-50 dark:border-gray-850/30 w-[4.5rem]"
		id="sidebar-rail"
	>
		<Tooltip content={$showSidebar ? $i18n.t('Close Sidebar') : $i18n.t('Open Sidebar')} placement="right">
			<button
				class="flex rounded-xl size-9 items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-850 transition cursor-pointer"
				aria-label={$showSidebar ? $i18n.t('Close Sidebar') : $i18n.t('Open Sidebar')}
				on:click={() => showSidebar.set(!$showSidebar)}
			>
				<SidebarIcon className="size-5" />
			</button>
		</Tooltip>
	</div>
{/if}

{#if $showSidebar}
	<div
		bind:this={navElement}
		id="sidebar"
		class="h-screen max-h-[100dvh] min-h-screen select-none fixed top-0 left-0 overflow-x-hidden shrink-0 text-gray-900 dark:text-gray-200 text-sm flex flex-row
			{$mobile ? 'bg-gray-50 dark:bg-gray-950' : 'bg-gray-50/70 dark:bg-gray-950/70'} z-50
			ml-[4.5rem] md:ml-0
		"
		transition:slide={{ duration: 250, axis: 'x' }}
		data-state="open"
	>
		<div
			class="my-auto flex flex-col justify-between h-screen max-h-[100dvh] w-[var(--sidebar-width)] overflow-x-hidden scrollbar-hidden z-50"
		>
			<!-- Header -->
			<div
				class="sidebar px-[0.5625rem] pt-2 pb-1.5 flex justify-between space-x-1 text-gray-600 dark:text-gray-400 sticky top-0 z-10 -mb-3"
			>
				<span
					class="flex flex-1 items-center px-1.5 font-medium text-gray-850 dark:text-white font-primary text-sm"
				>
					{APP_NAME}
				</span>
				<Tooltip
					content={$showSidebar ? $i18n.t('Close Sidebar') : $i18n.t('Open Sidebar')}
					placement="bottom"
				>
					<button
						class="flex rounded-xl size-8.5 justify-center items-center hover:bg-gray-100/50 dark:hover:bg-gray-850/50 transition cursor-pointer"
						on:click={() => showSidebar.set(!$showSidebar)}
						aria-label={$showSidebar ? $i18n.t('Close Sidebar') : $i18n.t('Open Sidebar')}
					>
						<SidebarIcon className="size-5 p-1.5" />
					</button>
				</Tooltip>
				<div
					class="{scrollTop > 0 ? 'visible' : 'invisible'} sidebar-bg-gradient-to-b bg-linear-to-b from-gray-50 dark:from-gray-950 to-transparent from-50% pointer-events-none absolute inset-0 -z-10 -mb-6"
				></div>
			</div>

			<!-- Scrollable: primary nav + case switcher -->
			<div
				class="relative flex flex-col flex-1 overflow-y-auto scrollbar-hidden pt-3 pb-3"
				on:scroll={(e) => {
					scrollTop = (e.target as HTMLElement).scrollTop;
				}}
			>
				<div class="px-[0.4375rem] mt-1 mb-0.5">
					<div class="text-xs text-gray-400 dark:text-gray-600 font-medium uppercase tracking-wide px-2.5 pb-1 pt-0.5 select-none">
						Navigation
					</div>
					<a
						href="/home"
						on:click={itemClickHandler}
						draggable="false"
						class="flex items-center space-x-3 rounded-2xl px-2.5 py-2 text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-900 transition"
						aria-label="My Desktop"
					>
						<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="size-4.5 shrink-0">
							<path stroke-linecap="round" stroke-linejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
						</svg>
						<span class="self-center text-sm font-primary">My Desktop</span>
					</a>
					<a
						href="/cases"
						on:click={itemClickHandler}
						draggable="false"
						class="flex items-center space-x-3 rounded-2xl px-2.5 py-2 text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-900 transition"
						aria-label="Cases"
					>
						<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="size-4.5 shrink-0">
							<path stroke-linecap="round" stroke-linejoin="round" d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z" />
						</svg>
						<span class="self-center text-sm font-primary">Cases</span>
					</a>
					<button
						class="w-full flex items-center space-x-3 rounded-2xl px-2.5 py-2 text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-900 transition text-left"
						on:click={() => showSearch.set(true)}
						aria-label="Search"
					>
						<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="size-4.5 shrink-0">
							<path stroke-linecap="round" stroke-linejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 15.803a7.5 7.5 0 0 0 10.607 0Z" />
						</svg>
						<span class="self-center text-sm font-primary">Search</span>
					</button>
					{#if $user?.role === 'admin'}
						<a
							href="/admin"
							on:click={itemClickHandler}
							draggable="false"
							class="flex items-center space-x-3 rounded-2xl px-2.5 py-2 text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-900 transition"
							aria-label="Admin"
						>
							<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="size-4.5 shrink-0">
								<path stroke-linecap="round" stroke-linejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
								<path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
							</svg>
							<span class="self-center text-sm font-primary">Admin</span>
						</a>
					{/if}
				</div>

				<CasesSection />
			</div>

			<!-- User section (bottom) -->
			<div class="px-1.5 pt-1.5 pb-2 sticky bottom-0 z-10 -mt-3 sidebar">
				<div
					class="sidebar-bg-gradient-to-t bg-linear-to-t from-gray-50 dark:from-gray-950 to-transparent from-50% pointer-events-none absolute inset-0 -z-10 -mt-6"
				></div>
				<div class="flex flex-col font-primary">
					{#if $user !== undefined && $user !== null}
						<UserMenu
							role={$user?.role}
							profile={$config?.features?.enable_user_status ?? true}
							showActiveUsers={false}
							className="max-w-[calc(var(--sidebar-width)-1rem)]"
						>
							<div
								class="flex items-center rounded-2xl py-2 px-1.5 w-full hover:bg-gray-100/50 dark:hover:bg-gray-900/50 transition"
							>
								<div class="self-center mr-3 relative">
									<img
										src={`${WEBUI_API_BASE_URL}/users/${$user?.id}/profile/image`}
										class="size-7 object-cover rounded-full"
										alt={$i18n.t('Open User Profile Menu')}
										aria-label={$i18n.t('Open User Profile Menu')}
									/>
								</div>
								<div class="self-center font-medium">{$user?.name}</div>
							</div>
						</UserMenu>
					{/if}
				</div>
			</div>
		</div>
	</div>

	{#if !$mobile}
		<div
			class="relative flex items-center justify-center group border-l border-gray-50 dark:border-gray-850/30 hover:border-gray-200 dark:hover:border-gray-800 transition z-20 w-1"
			id="sidebar-resizer"
			on:mousedown={resizeStartHandler}
			role="separator"
			aria-label="Resize sidebar"
		>
			<div class="absolute -left-1.5 -right-1.5 -top-0 -bottom-0 z-20 cursor-col-resize bg-transparent" />
		</div>
	{/if}
{/if}
