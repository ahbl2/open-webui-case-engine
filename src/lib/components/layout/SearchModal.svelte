<script lang="ts">
	/**
	 * P75-09 — Wave 2 global search / command foundation (single `showSearch` + `SearchModal` path).
	 * P78-05 — Workspace mode: case lookup by number/title via Case Engine `listCases` + client filter (no writes).
	 * Chat list + preview on Search tab remain OWUI-backed. Jump links are real navigation.
	 */
	import { toast } from 'svelte-sonner';
	import { getContext, onDestroy, onMount, tick } from 'svelte';
	import { get } from 'svelte/store';
	const i18n = getContext('i18n');

	import Modal from '$lib/components/common/Modal.svelte';
	import SearchInput from './Sidebar/SearchInput.svelte';
	import { getChatById, getChatList, getChatListBySearchText } from '$lib/apis/chats';
	import Spinner from '../common/Spinner.svelte';

	import dayjs from '$lib/dayjs';
	import localizedFormat from 'dayjs/plugin/localizedFormat';
	import calendar from 'dayjs/plugin/calendar';
	import Loader from '../common/Loader.svelte';
	import { createMessagesList } from '$lib/utils';
	import { config, user, showShortcuts, caseEngineToken, activeCaseId, activeCaseNumber } from '$lib/stores';
	import { listCases, type CaseEngineCase } from '$lib/apis/caseEngine';
	import { applyCaseBrowse } from '$lib/utils/casesBrowse';
	import Messages from '../chat/Messages.svelte';
	import { goto } from '$app/navigation';
	import PencilSquare from '../icons/PencilSquare.svelte';
	import PageEdit from '../icons/PageEdit.svelte';
	import {
		DS_TYPE_CLASSES,
		DS_PANEL_CLASSES,
		DS_EMPTY_CLASSES,
		DS_CHIP_CLASSES,
		DS_BTN_CLASSES,
		DS_SECTION_HEADER_CLASSES,
		DS_BADGE_CLASSES
	} from '$lib/case/detectivePrimitiveFoundation';
	dayjs.extend(calendar);
	dayjs.extend(localizedFormat);

	export let show = false;
	export let onClose = () => {};

	type SearchSurfaceMode = 'search' | 'jump' | 'command' | 'workspace';

	let surfaceMode: SearchSurfaceMode = 'search';
	let searchModalWasOpen = false;

	function setSurfaceMode(mode: SearchSurfaceMode) {
		surfaceMode = mode;
		selectedIdx = null;
		messages = null;
		selectedChat = null;
		if (workspaceDebounceTimeout) {
			clearTimeout(workspaceDebounceTimeout);
			workspaceDebounceTimeout = undefined;
		}
	}

	$: {
		if (show && !searchModalWasOpen) {
			surfaceMode = 'search';
		}
		searchModalWasOpen = show;
	}

	$: if (surfaceMode !== 'search' && searchDebounceTimeout) {
		clearTimeout(searchDebounceTimeout);
		searchDebounceTimeout = undefined;
	}

	let actions = [
		{
			label: $i18n.t('Start a new conversation'),
			onClick: async () => {
				await goto(`/${query ? `?q=${query}` : ''}`);
				show = false;
				onClose();
			},
			icon: PencilSquare
		}
	];

	let query = '';
	let page = 1;

	let chatList = null;

	let chatListLoading = false;
	let allChatsLoaded = false;

	let searchDebounceTimeout: ReturnType<typeof setTimeout> | undefined;

	/** P78-05: Workspace tab — Case Engine case directory (read-only), debounced load + client filter. */
	let workspaceQuery = '';
	let workspaceListCache: CaseEngineCase[] | null = null;
	let workspaceLoading = false;
	let workspaceError = '';
	let workspaceDebounceTimeout: ReturnType<typeof setTimeout> | undefined;
	const WORKSPACE_CASE_MAX = 25;

	function workspaceUnitBadgeClass(unit: string): string {
		const u = String(unit ?? '').toUpperCase();
		if (u === 'CID') return DS_BADGE_CLASSES.unitCid;
		if (u === 'SIU') return DS_BADGE_CLASSES.unitSiu;
		return DS_BADGE_CLASSES.neutral;
	}

	function scheduleWorkspaceCaseLoad() {
		if (workspaceDebounceTimeout) clearTimeout(workspaceDebounceTimeout);
		workspaceDebounceTimeout = setTimeout(async () => {
			const q = workspaceQuery.trim();
			if (q.length < 2) return;
			const token = get(caseEngineToken);
			if (!token) return;
			if (workspaceListCache !== null) return;
			workspaceLoading = true;
			workspaceError = '';
			try {
				const rows = await listCases('ALL', token);
				if (!show) return;
				workspaceListCache = rows;
			} catch (e) {
				if (!show) return;
				workspaceError = (e as Error).message ?? 'Failed to load cases';
				workspaceListCache = null;
			} finally {
				if (show) workspaceLoading = false;
			}
		}, 300);
	}

	$: workspaceFilteredCases =
		workspaceListCache && workspaceQuery.trim().length >= 2
			? applyCaseBrowse(workspaceListCache, {
					unit: 'ALL',
					status: 'ALL',
					searchQuery: workspaceQuery,
					sortBy: 'case_number_asc'
				}).slice(0, WORKSPACE_CASE_MAX)
			: [];

	$: if (!show) {
		workspaceQuery = '';
		workspaceListCache = null;
		workspaceError = '';
		workspaceLoading = false;
		if (workspaceDebounceTimeout) {
			clearTimeout(workspaceDebounceTimeout);
			workspaceDebounceTimeout = undefined;
		}
	}

	async function openWorkspaceCase(c: CaseEngineCase) {
		activeCaseId.set(c.id);
		activeCaseNumber.set(c.case_number);
		await goto(`/case/${c.id}/summary`);
		await closeAfterNavigate();
	}

	let selectedIdx = null;
	let selectedChat = null;

	let selectedModels = [''];
	let history = null;
	let messages = null;

	$: if (!chatListLoading && chatList && surfaceMode === 'search') {
		loadChatPreview(selectedIdx);
	}

	const loadChatPreview = async (selectedIdx) => {
		if (!chatList || chatList.length === 0 || selectedIdx === null) {
			selectedChat = null;
			messages = null;
			history = null;
			selectedModels = [''];
			return;
		}

		const selectedChatIdx = selectedIdx - actions.length;
		if (selectedChatIdx < 0 || selectedChatIdx >= chatList.length) {
			selectedChat = null;
			messages = null;
			history = null;
			selectedModels = [''];
			return;
		}

		const chatId = chatList[selectedChatIdx].id;

		const chat = await getChatById(localStorage.token, chatId).catch(async (error) => {
			return null;
		});

		if (chat) {
			if (chat?.chat?.history) {
				selectedModels =
					(chat?.chat?.models ?? undefined) !== undefined
						? chat?.chat?.models
						: [chat?.chat?.models ?? ''];

				history = chat?.chat?.history;
				messages = createMessagesList(chat?.chat?.history, chat?.chat?.history?.currentId);

				// scroll to the bottom of the messages container
				await tick();
				const messagesContainerElement = document.getElementById('chat-preview');
				if (messagesContainerElement) {
					messagesContainerElement.scrollTop = messagesContainerElement.scrollHeight;
				}
			} else {
				messages = [];
			}
		} else {
			toast.error($i18n.t('Failed to load chat preview'));
			selectedChat = null;
			messages = null;
			history = null;
			selectedModels = [''];
			return;
		}
	};

	const searchHandler = async () => {
		if (!show || surfaceMode !== 'search') {
			return;
		}

		if (searchDebounceTimeout) {
			clearTimeout(searchDebounceTimeout);
		}

		page = 1;
		chatList = null;
		if (query === '') {
			chatList = await getChatList(localStorage.token, page);
		} else {
			searchDebounceTimeout = setTimeout(async () => {
				chatList = await getChatListBySearchText(localStorage.token, query, page);

				if ((chatList ?? []).length === 0) {
					allChatsLoaded = true;
				} else {
					allChatsLoaded = false;
				}
			}, 500);
		}

		selectedChat = null;
		messages = null;
		history = null;
		selectedModels = [''];

		if ((chatList ?? []).length === 0) {
			allChatsLoaded = true;
		} else {
			allChatsLoaded = false;
		}
	};

	const loadMoreChats = async () => {
		chatListLoading = true;
		page += 1;

		let newChatList = [];

		if (query) {
			newChatList = await getChatListBySearchText(localStorage.token, query, page);
		} else {
			newChatList = await getChatList(localStorage.token, page);
		}

		// once the bottom of the list has been reached (no results) there is no need to continue querying
		allChatsLoaded = newChatList.length === 0;

		if (newChatList.length > 0) {
			chatList = [...chatList, ...newChatList];
		}

		chatListLoading = false;
	};

	$: if (show && surfaceMode === 'search') {
		searchHandler();
	}

	const onKeyDown = (e) => {
		const searchOptions = document.getElementById('search-options-container');
		if (searchOptions || !show) {
			return;
		}

		if (surfaceMode !== 'search') {
			if (e.code === 'Escape') {
				show = false;
				onClose();
			}
			return;
		}

		if (e.code === 'Escape') {
			show = false;
			onClose();
		} else if (e.code === 'Enter') {
			const item = document.querySelector(`[data-arrow-selected="true"]`);
			if (item) {
				item?.click();
				show = false;
			}

			return;
		} else if (e.code === 'ArrowDown') {
			const searchInput = document.getElementById('search-input');

			if (searchInput) {
				// check if focused on the search input
				if (document.activeElement === searchInput) {
					searchInput.blur();
					selectedIdx = 0;
					return;
				}
			}

			selectedIdx = Math.min(selectedIdx + 1, (chatList ?? []).length - 1 + actions.length);
		} else if (e.code === 'ArrowUp') {
			if (selectedIdx === 0) {
				const searchInput = document.getElementById('search-input');

				if (searchInput) {
					// check if focused on the search input
					if (document.activeElement !== searchInput) {
						searchInput.focus();
						selectedIdx = 0;
						return;
					}
				}
			}

			selectedIdx = Math.max(selectedIdx - 1, 0);
		}

		const item = document.querySelector(`[data-arrow-selected="true"]`);
		item?.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' });
	};

	onMount(() => {
		actions = [
			...actions,
			...(($config?.features?.enable_notes ?? false) &&
			($user?.role === 'admin' || ($user?.permissions?.features?.notes ?? true))
				? [
						{
							label: $i18n.t('Create a new note'),
							onClick: async () => {
								await goto(`/notes?content=${query}`);
								show = false;
								onClose();
							},
							icon: PageEdit
						}
					]
				: [])
		];

		document.addEventListener('keydown', onKeyDown);
	});

	onDestroy(() => {
		if (searchDebounceTimeout) {
			clearTimeout(searchDebounceTimeout);
		}
		if (workspaceDebounceTimeout) {
			clearTimeout(workspaceDebounceTimeout);
		}
		document.removeEventListener('keydown', onKeyDown);
	});

	const surfaceModes: { id: SearchSurfaceMode; label: string }[] = [
		{ id: 'search', label: 'Search' },
		{ id: 'jump', label: 'Jump' },
		{ id: 'command', label: 'Command' },
		{ id: 'workspace', label: 'Workspace' }
	];

	function chipClass(id: SearchSurfaceMode): string {
		return surfaceMode === id ? DS_CHIP_CLASSES.active : DS_CHIP_CLASSES.base;
	}

	async function closeAfterNavigate() {
		show = false;
		onClose();
	}
</script>

<Modal size="xl" bind:show>
	<div
		class="py-3 dark:text-gray-300 text-gray-700"
		data-testid="global-search-modal"
		aria-label={$i18n.t('Global search and command')}
	>
		<div class="px-4 pb-3 border-b border-gray-100 dark:border-gray-800/80">
			<div class="mb-2">
				<h2
					class="{DS_TYPE_CLASSES.section} text-[length:var(--ds-type-section-size,1rem)] font-semibold text-[color:var(--ds-text-primary)]"
				>
					{$i18n.t('Global search & command')}
				</h2>
				<p class="{DS_TYPE_CLASSES.meta} text-[color:var(--ds-text-muted)] mt-0.5 leading-snug">
					{$i18n.t(
						'Search chat history here. Jump to app destinations. Case-wide tools stay on each case — a full command palette is future work (see P73-05).'
					)}
				</p>
			</div>
			<div
				class="flex flex-wrap gap-1.5"
				role="tablist"
				aria-label={$i18n.t('Search and command modes')}
			>
				{#each surfaceModes as m (m.id)}
					<button
						type="button"
						role="tab"
						aria-selected={surfaceMode === m.id}
						class="{chipClass(m.id)} text-xs font-medium"
						data-surface-mode={m.id}
						on:click={() => setSurfaceMode(m.id)}
					>
						{$i18n.t(m.label)}
					</button>
				{/each}
			</div>
		</div>

		{#if surfaceMode === 'search'}
			<div class="px-4 pb-1.5 pt-3">
				<SearchInput
					bind:value={query}
					on:input={searchHandler}
					placeholder={$i18n.t('Search conversations…')}
					showClearButton={true}
					onFocus={() => {
						selectedIdx = null;
						messages = null;
					}}
					onKeydown={(e) => {
						if (e.code === 'Enter' && (chatList ?? []).length > 0) {
							const item = document.querySelector(`[data-arrow-selected="true"]`);
							if (item) {
								item?.click();
							}

							show = false;
							return;
						} else if (e.code === 'ArrowDown') {
							selectedIdx = Math.min(selectedIdx + 1, (chatList ?? []).length - 1 + actions.length);
						} else if (e.code === 'ArrowUp') {
							selectedIdx = Math.max(selectedIdx - 1, 0);
						} else {
							selectedIdx = 0;
						}

						const item = document.querySelector(`[data-arrow-selected="true"]`);
						item?.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' });
					}}
				/>
			</div>

			<div class="flex px-4 pb-1">
				<div
					class="flex flex-col overflow-y-auto h-96 md:h-[40rem] max-h-full scrollbar-hidden w-full flex-1 pr-2"
				>
					<div class="w-full text-xs text-gray-500 dark:text-gray-500 font-medium pb-2 px-2">
						{$i18n.t('Quick actions')}
					</div>

					{#each actions as action, idx (action.label)}
						<button
							class=" w-full flex items-center rounded-xl text-sm py-2 px-3 hover:bg-gray-50 dark:hover:bg-gray-850 {selectedIdx ===
							idx
								? 'bg-gray-50 dark:bg-gray-850'
								: ''}"
							data-arrow-selected={selectedIdx === idx ? 'true' : undefined}
							dragabble="false"
							on:mouseenter={() => {
								selectedIdx = idx;
							}}
							on:click={async () => {
								await action.onClick();
							}}
						>
							<div class="pr-2">
								<svelte:component this={action.icon} />
							</div>
							<div class=" flex-1 text-left">
								<div class="text-ellipsis line-clamp-1 w-full">
									{$i18n.t(action.label)}
								</div>
							</div>
						</button>
					{/each}

					{#if chatList}
						<hr class="border-gray-50 dark:border-gray-850/30 my-3" />

						<div class="w-full text-xs text-gray-500 dark:text-gray-500 font-medium pb-2 px-2">
							{$i18n.t('Conversations')}
						</div>

						{#if chatList.length === 0}
							<div class="text-xs text-gray-500 dark:text-gray-400 text-center px-5 py-4">
								{$i18n.t('No results found')}
							</div>
						{/if}

						{#each chatList as chat, idx (chat.id)}
							{#if idx === 0 || (idx > 0 && chat.time_range !== chatList[idx - 1].time_range)}
								<div
									class="w-full text-xs text-gray-500 dark:text-gray-500 font-medium {idx === 0
										? ''
										: 'pt-5'} pb-2 px-2"
								>
									{$i18n.t(chat.time_range)}
									<!-- localisation keys for time_range to be recognized from the i18next parser (so they don't get automatically removed):
							{$i18n.t('Today')}
							{$i18n.t('Yesterday')}
							{$i18n.t('Previous 7 days')}
							{$i18n.t('Previous 30 days')}
							{$i18n.t('January')}
							{$i18n.t('February')}
							{$i18n.t('March')}
							{$i18n.t('April')}
							{$i18n.t('May')}
							{$i18n.t('June')}
							{$i18n.t('July')}
							{$i18n.t('August')}
							{$i18n.t('September')}
							{$i18n.t('October')}
							{$i18n.t('November')}
							{$i18n.t('December')}
							-->
								</div>
							{/if}

							<a
								class=" w-full flex justify-between items-center rounded-xl text-sm py-2 px-3 hover:bg-gray-50 dark:hover:bg-gray-850 {selectedIdx ===
								idx + actions.length
									? 'bg-gray-50 dark:bg-gray-850'
									: ''}"
								href="/c/{chat.id}"
								draggable="false"
								data-arrow-selected={selectedIdx === idx + actions.length ? 'true' : undefined}
								on:mouseenter={() => {
									selectedIdx = idx + actions.length;
								}}
								on:click={async () => {
									await goto(`/c/${chat.id}`);
									show = false;
									onClose();
								}}
							>
								<div class=" flex-1">
									<div class="text-ellipsis line-clamp-1 w-full">
										{chat?.title}
									</div>
								</div>

								<div class=" pl-3 shrink-0 text-gray-500 dark:text-gray-400 text-xs">
									{$i18n.t(
										dayjs(chat?.updated_at * 1000).calendar(null, {
											sameDay: '[Today]',
											nextDay: '[Tomorrow]',
											nextWeek: 'dddd',
											lastDay: '[Yesterday]',
											lastWeek: '[Last] dddd',
											sameElse: 'L' // use localized format, otherwise dayjs.calendar() defaults to DD/MM/YYYY
										})
									)}
								</div>
							</a>
						{/each}

						{#if !allChatsLoaded}
							<Loader
								on:visible={(e) => {
									if (!chatListLoading) {
										loadMoreChats();
									}
								}}
							>
								<div class="w-full flex justify-center py-4 text-xs animate-pulse items-center gap-2">
									<Spinner className=" size-4" />
									<div class=" ">{$i18n.t('Loading...')}</div>
								</div>
							</Loader>
						{/if}
					{:else}
						<div class="w-full h-full flex justify-center items-center">
							<Spinner className="size-5" />
						</div>
					{/if}
				</div>
				<div
					id="chat-preview"
					class="hidden md:flex md:flex-1 w-full overflow-y-auto h-96 md:h-[40rem] scrollbar-hidden"
				>
					{#if messages === null}
						<div
							class="w-full h-full flex justify-center items-center text-gray-500 dark:text-gray-400 text-sm"
						>
							{$i18n.t('Select a conversation to preview')}
						</div>
					{:else}
						<div class="w-full h-full flex flex-col">
							<Messages
								className="h-full flex pt-4 pb-8 w-full"
								chatId={`chat-preview-${selectedChat?.id ?? ''}`}
								user={$user}
								readOnly={true}
								{selectedModels}
								bind:history
								bind:messages
								autoScroll={true}
								sendMessage={() => {}}
								continueResponse={() => {}}
								regenerateResponse={() => {}}
							/>
						</div>
					{/if}
				</div>
			</div>
		{:else if surfaceMode === 'jump'}
			<div class="px-4 py-4 min-h-[14rem] space-y-3">
				<div class="{DS_SECTION_HEADER_CLASSES.header}">
					<span class="{DS_TYPE_CLASSES.meta} font-semibold uppercase tracking-wide text-[color:var(--ds-text-muted)]">
						{$i18n.t('Navigate')}
					</span>
				</div>
				<p class="{DS_EMPTY_CLASSES.description}">
					{$i18n.t('Open a destination in the app shell. Case detail routes open from Cases or the sidebar.')}
				</p>
				<div class="flex flex-col gap-2 max-w-md">
					<button
						type="button"
						class="{DS_BTN_CLASSES.secondary} w-full justify-start gap-2"
						data-testid="global-search-jump-home"
						on:click={async () => {
							await goto('/home');
							await closeAfterNavigate();
						}}
					>
						{$i18n.t('Home — Operator Command Center')}
					</button>
					<button
						type="button"
						class="{DS_BTN_CLASSES.secondary} w-full justify-start gap-2"
						data-testid="global-search-jump-cases"
						on:click={async () => {
							await goto('/cases');
							await closeAfterNavigate();
						}}
					>
						{$i18n.t('Cases — browse investigations')}
					</button>
					<button
						type="button"
						class="{DS_BTN_CLASSES.ghost} w-full justify-start gap-2"
						on:click={() => {
							showShortcuts.set(true);
							void closeAfterNavigate();
						}}
					>
						{$i18n.t('Keyboard shortcuts')}
					</button>
				</div>
			</div>
		{:else if surfaceMode === 'command'}
			<div class="px-4 py-4 min-h-[14rem]">
				<div class="{DS_PANEL_CLASSES.muted} ds-panel-dense">
					<div class="{DS_SECTION_HEADER_CLASSES.header}">
						<span class="{DS_TYPE_CLASSES.meta} font-semibold uppercase tracking-wide text-[color:var(--ds-text-muted)]">
							{$i18n.t('Command palette')}
						</span>
					</div>
					<p class="{DS_EMPTY_CLASSES.description} mt-2 leading-snug">
						{$i18n.t(
							'A full command palette (scriptable actions, cross-surface commands) is not implemented in this build. Use Keyboard shortcuts for the shortcut list, or stay on Search for chat lookup.'
						)}
					</p>
					<button
						type="button"
						class="{DS_BTN_CLASSES.primary} w-full max-w-md mt-3 justify-center"
						on:click={() => {
							showShortcuts.set(true);
							void closeAfterNavigate();
						}}
					>
						{$i18n.t('Open keyboard shortcuts')}
					</button>
				</div>
			</div>
		{:else}
			<div class="px-4 py-4 min-h-[14rem]">
				<div class="{DS_PANEL_CLASSES.muted} ds-panel-dense">
					<div class="{DS_SECTION_HEADER_CLASSES.header}">
						<span class="{DS_TYPE_CLASSES.meta} font-semibold uppercase tracking-wide text-[color:var(--ds-text-muted)]">
							{$i18n.t('Case & workspace')}
						</span>
					</div>
					<p class="{DS_EMPTY_CLASSES.description} mt-2 leading-snug">
						{$i18n.t(
							'Search Case Engine cases by number or title below. Chat history stays on the Search tab. Opening a case goes to its summary workspace.'
						)}
					</p>
					<div class="mt-3 max-w-md">
						<SearchInput
							bind:value={workspaceQuery}
							on:input={scheduleWorkspaceCaseLoad}
							placeholder={$i18n.t('Search cases by number or title…')}
							showClearButton={true}
						/>
					</div>
					{#if !$caseEngineToken}
						<p class="{DS_EMPTY_CLASSES.description} mt-3 text-sm">
							{$i18n.t('Case Engine session required — sign in with Case Engine linked to use case search.')}
						</p>
					{:else if workspaceLoading && !workspaceListCache && workspaceQuery.trim().length >= 2}
						<div class="mt-4 flex justify-center py-6">
							<Spinner className="size-5" />
						</div>
					{:else if workspaceError}
						<p class="mt-3 text-sm text-red-600 dark:text-red-400">{workspaceError}</p>
					{:else if workspaceQuery.trim().length < 2}
						<p class="{DS_TYPE_CLASSES.meta} text-[color:var(--ds-text-muted)] mt-3 text-sm">
							{$i18n.t('Type at least two characters to match case number or title (Case Engine).')}
						</p>
					{:else if workspaceFilteredCases.length === 0}
						<p class="{DS_EMPTY_CLASSES.description} mt-3 text-sm">
							{$i18n.t('No matching cases')}
						</p>
					{:else}
						<div class="mt-4 space-y-2">
							<div class="w-full text-xs font-medium pb-1 px-0.5 text-[color:var(--ds-text-muted)]">
								{$i18n.t('Cases')}
								<span class="text-gray-400 dark:text-gray-500 font-normal"> — {$i18n.t('Case Engine')}</span>
							</div>
							<ul class="flex flex-col gap-1.5 max-h-64 overflow-y-auto pr-0.5" role="list">
								{#each workspaceFilteredCases as c (c.id)}
									<li>
										<button
											type="button"
											class="{DS_BTN_CLASSES.ghost} w-full justify-start text-left gap-2 h-auto py-2 px-2 normal-case font-normal"
											data-testid="global-search-workspace-case-row"
											data-case-id={c.id}
											on:click={() => void openWorkspaceCase(c)}
										>
											<span
												class="{DS_BADGE_CLASSES.neutral} shrink-0 text-[0.65rem] uppercase tracking-wide"
												aria-hidden="true"
											>
												{$i18n.t('Case')}
											</span>
											<span class="flex-1 min-w-0">
												<span class="block text-sm font-medium text-[color:var(--ds-text-primary)] truncate">
													{c.case_number}
													<span class="font-normal text-[color:var(--ds-text-muted)]"> — {c.title}</span>
												</span>
											</span>
											{#if c.unit}
												<span class="{workspaceUnitBadgeClass(c.unit)} shrink-0 text-[0.65rem]">
													{String(c.unit).toUpperCase()}
												</span>
											{/if}
										</button>
									</li>
								{/each}
							</ul>
						</div>
					{/if}
					<button
						type="button"
						class="{DS_BTN_CLASSES.secondary} w-full max-w-md mt-4 justify-center"
						data-testid="global-search-workspace-cases"
						on:click={async () => {
							await goto('/cases');
							await closeAfterNavigate();
						}}
					>
						{$i18n.t('Go to Cases')}
					</button>
				</div>
			</div>
		{/if}
	</div>
</Modal>
