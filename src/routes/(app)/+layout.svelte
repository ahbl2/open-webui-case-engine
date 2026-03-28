<script lang="ts">
	import { toast } from 'svelte-sonner';
	import { onMount, tick, getContext } from 'svelte';
	import { get } from 'svelte/store';
	import { openDB, deleteDB } from 'idb';
	import fileSaver from 'file-saver';
	const { saveAs } = fileSaver;

	import { goto } from '$app/navigation';
	import { page } from '$app/stores';

	import { getModels, getToolServersData } from '$lib/apis';
	import { getTools } from '$lib/apis/tools';
	import { getBanners } from '$lib/apis/configs';
	import { getTerminalServers } from '$lib/apis/terminal';
	import { getUserSettings } from '$lib/apis/users';

	import { WEBUI_API_BASE_URL } from '$lib/constants';

	import {
		config,
		user,
		settings,
		models,
		knowledge,
		tools,
		functions,
		tags,
		banners,
		showSettings,
		showShortcuts,
		temporaryChatEnabled,
		toolServers,
		terminalServers,
		showSearch,
		showSidebar,
	showControls,
	mobile,
	caseEngineAuthState,
	caseEngineToken,
	caseEngineUser,
	caseModeActive
} from '$lib/stores';
	import {
		resolveBrowserAuthOnce,
		BrowserResolveFailure,
		type BrowserResolveFailureClassification
	} from '$lib/apis/caseEngine';
	import { resolveAuthStateDecision, blockedRedirectPath } from '$lib/utils/authStateDecision';
	import type { CaseEngineAuthState } from '$lib/stores/caseEngine';

	/** P19.75-02: Map classified browser-resolve failures to Case Engine auth store (not all imply “unavailable”). */
	function mapBrowserResolveFailureToAuthState(err: BrowserResolveFailure): CaseEngineAuthState {
		switch (err.classification) {
			case 'network_unreachable':
				return { state: 'unavailable', user: null, reason: 'backend_unreachable' };
			case 'rate_limited':
				return { state: 'rate_limited', user: null, reason: 'RATE_LIMIT_EXCEEDED' };
			case 'unauthorized':
				return { state: 'auth_http_error', user: null, reason: 'HTTP_UNAUTHORIZED' };
			case 'server_error':
				return { state: 'ce_server_error', user: null, reason: 'HTTP_5XX' };
			case 'client_error':
				return { state: 'ce_client_error', user: null, reason: 'HTTP_4XX' };
		}
	}

	function gateLabelForClassification(c: BrowserResolveFailureClassification): string {
		if (c === 'network_unreachable') return 'redirect_access_unavailable';
		return 'redirect_access_unavailable'; // P20-PRE-01: transient_ce → /access-unavailable (no partial shell)
	}

	function toastForBrowserResolveFailure(err: BrowserResolveFailure): void {
		if (err.classification === 'network_unreachable') return;
		const msg =
			err.classification === 'rate_limited'
				? 'System is temporarily busy. Please wait a moment and try again.'
				: err.classification === 'unauthorized'
					? 'Case Engine rejected the authorization check. Try refreshing or signing in again.'
					: err.classification === 'server_error'
						? 'Case Engine returned a server error. Try again shortly.'
						: 'Case Engine rejected the authorization request.';
		toast.warning(msg);
	}

	import Sidebar from '$lib/components/layout/Sidebar.svelte';
	import DetectiveWorkspaceSidebar from '$lib/components/layout/DetectiveWorkspaceSidebar.svelte';

	/** Detective workspace routes: one coherent shell. */
	$: isDetectiveWorkspace =
		$page.url.pathname === '/home' ||
		$page.url.pathname === '/cases' ||
		$page.url.pathname === '/search' ||
		$page.url.pathname.startsWith('/case/');
	/** Unified sidebar shell: detective + admin. Same custom sidebar, no OWUI sidebar. */
	$: isUnifiedSidebar =
		isDetectiveWorkspace || $page.url.pathname.startsWith('/admin');
	import SettingsModal from '$lib/components/chat/SettingsModal.svelte';
	import AccountPending from '$lib/components/layout/Overlay/AccountPending.svelte';
	import Spinner from '$lib/components/common/Spinner.svelte';
	import { Shortcut, shortcuts } from '$lib/shortcuts';
	import { isShortcutMatch } from '$lib/utils/isShortcutMatch';

	const i18n = getContext('i18n');

	let loaded = false;
	// P19-05: Guards app shell from rendering before Case Engine auth state is resolved.
	// Remains false until an 'active' state is confirmed; prevents pre-redirect flash.
	let ceAuthChecked = false;
	let authRedirectInProgress = false;
	let DB = null;
	let localDBChats = [];


	const clearChatInputStorage = () => {
		const chatInputKeys = Object.keys(localStorage).filter((key) => key.startsWith('chat-input'));
		if (chatInputKeys.length > 0) {
			chatInputKeys.forEach((key) => {
				localStorage.removeItem(key);
			});
		}
	};

	const checkLocalDBChats = async () => {
		try {
			// Check if IndexedDB exists
			DB = await openDB('Chats', 1);

			if (!DB) {
				return;
			}

			const chats = await DB.getAllFromIndex('chats', 'timestamp');
			localDBChats = chats.map((item, idx) => chats[chats.length - 1 - idx]);

			if (localDBChats.length === 0) {
				await deleteDB('Chats');
			}
		} catch (error) {
			// IndexedDB Not Found
		}
	};

	const setUserSettings = async (cb: () => Promise<void>) => {
		let userSettings = await getUserSettings(localStorage.token).catch((error) => {
			console.error(error);
			return null;
		});

		if (!userSettings) {
			try {
				userSettings = JSON.parse(localStorage.getItem('settings') ?? '{}');
			} catch (e: unknown) {
				console.error('Failed to parse settings from localStorage', e);
				userSettings = {};
			}
		}

		if (userSettings?.ui) {
			settings.set(userSettings.ui);
		}

		if (cb) {
			await cb();
		}
	};

	const setModels = async () => {
		models.set(
			await getModels(
				localStorage.token,
				$config?.features?.enable_direct_connections ? ($settings?.directConnections ?? null) : null
			)
		);
	};

	const setToolServers = async () => {
		let toolServersData = await getToolServersData($settings?.toolServers ?? []);
		toolServersData = toolServersData.filter((data) => {
			if (!data || data.error) {
				toast.error(
					$i18n.t(`Failed to connect to {{URL}} OpenAPI tool server`, {
						URL: data?.url
					})
				);
				return false;
			}
			return true;
		});
		toolServers.set(toolServersData);

		// Inject enabled terminal servers as always-on tool servers
		const enabledTerminals = ($settings?.terminalServers ?? []).filter((s) => s.enabled);
		if (enabledTerminals.length > 0) {
			let terminalServersData = await getToolServersData(
				enabledTerminals.map((t) => ({
					url: t.url,
					auth_type: t.auth_type ?? 'bearer',
					key: t.key ?? '',
					path: t.path ?? '/openapi.json',
					config: { enable: true }
				}))
			);
			terminalServersData = terminalServersData
				.filter((data) => {
					if (!data || data.error) {
						toast.error(
							$i18n.t(`Failed to connect to {{URL}} terminal server`, {
								URL: data?.url
							})
						);
						return false;
					}
					return true;
				})
				.map((data, i) => ({
					...data,
					key: enabledTerminals[i]?.key ?? ''
				}));

			terminalServers.set(terminalServersData);
		} else {
			terminalServers.set([]);
		}

		// Fetch terminal servers the user has access to (for FileNav + terminal_id)
		const systemTerminals = await getTerminalServers(localStorage.token);
		if (systemTerminals.length > 0) {
			// Store with proxy URL and session key for FileNav file browsing
			const terminalEntries = systemTerminals.map((t) => ({
				id: t.id,
				url: `${WEBUI_API_BASE_URL}/terminals/${t.id}`,
				name: t.name,
				key: localStorage.token
			}));
			terminalServers.update((existing) => [...existing, ...terminalEntries]);
		}
	};

	const setBanners = async () => {
		const bannersData = await getBanners(localStorage.token);
		banners.set(bannersData);
	};

	const setTools = async () => {
		const toolsData = await getTools(localStorage.token);
		tools.set(toolsData);
	};

	onMount(async () => {
		if ($user === undefined || $user === null) {
			await goto('/auth');
			return;
		}
		if (!['user', 'admin'].includes($user?.role)) {
			return;
		}

		// P19-05: Resolve Case Engine authorization state from backend.
		// ceAuthChecked stays false until an active state is confirmed, keeping the app
		// shell hidden until we know the user is allowed in.
		if (!$caseEngineAuthState && $user?.id) {
			let resolvedState: string;
			try {
				const authResult = await resolveBrowserAuthOnce({
					owui_user_id: $user.id,
					username_or_email: ($user as { email?: string }).email ?? $user.name ?? $user.id,
					display_name: $user.name
				});
				caseEngineAuthState.set(authResult as import('$lib/stores').CaseEngineAuthState);
				resolvedState = authResult.state;
				if (authResult.state === 'active') {
					if (typeof authResult.token === 'string' && authResult.token.trim() !== '') {
						caseEngineToken.set(authResult.token);
						caseEngineUser.set(
							authResult.user
								? {
										id: authResult.user.id,
										name: $user.name ?? authResult.user.role,
										role: authResult.user.role === 'admin' ? 'ADMIN' : 'detective'
									}
								: null
						);
					} else {
						// P19.75-01: Server may omit token in body; keep persisted JWT if present.
						const existing = get(caseEngineToken);
						if (!existing || String(existing).trim() === '') {
							caseEngineToken.set(null);
							caseEngineUser.set(null);
						}
					}
				} else {
					caseEngineToken.set(null);
					caseEngineUser.set(null);
				}
			} catch (err) {
				if (err instanceof BrowserResolveFailure) {
					const mapped = mapBrowserResolveFailureToAuthState(err);
					caseEngineAuthState.set(mapped);
					resolvedState = mapped.state;
					toastForBrowserResolveFailure(err);
					if (import.meta.env.DEV) {
						console.debug('[P19.75-02] browser-resolve (initial)', {
							httpStatus: err.httpStatus,
							classification: err.classification,
							gateDecision: gateLabelForClassification(err.classification),
							caseEngineState: mapped.state
						});
					}
					if (err.classification !== 'network_unreachable') {
						console.warn(
							'[P19-05] Case Engine browser-resolve returned HTTP error — not treating as unreachable:',
							err.classification,
							err.httpStatus
						);
					} else {
						console.error('[P19-05] Case Engine auth state resolution failed — blocking workspace:', err);
					}
				} else {
					// Unknown error — conservative: treat like unreachable (legacy behavior).
					console.error('[P19-05] Case Engine auth state resolution failed — blocking workspace:', err);
					if (import.meta.env.DEV) {
						console.debug('[P19.75-01] browser-resolve failed', {
							endpoint: 'POST /auth/owui/browser-resolve',
							reason: 'exception_after_retries',
							hadPersistedToken: !!(get(caseEngineToken) && String(get(caseEngineToken)).trim())
						});
					}
					caseEngineAuthState.set({ state: 'unavailable', user: null, reason: 'backend_unreachable' });
					resolvedState = 'unavailable';
				}
			}

			const decision = resolveAuthStateDecision(resolvedState);
			const redirectTo = blockedRedirectPath(decision);
			if (redirectTo) {
				await goto(redirectTo);
				return;
			}
		} else if ($caseEngineAuthState) {
			// Re-check on remount using cached state.
			const decision = resolveAuthStateDecision($caseEngineAuthState.state);
			const redirectTo = blockedRedirectPath(decision);
			if (redirectTo) {
				await goto(redirectTo);
				return;
			}
			// Cached active state: refresh token so bind never uses a stale token (remount / multi-tab).
			if ($caseEngineAuthState.state === 'active' && $user?.id) {
				const tokenBeforeRefresh = get(caseEngineToken);
				try {
					const authResult = await resolveBrowserAuthOnce({
						owui_user_id: $user.id,
						username_or_email: ($user as { email?: string }).email ?? $user.name ?? $user.id,
						display_name: $user.name
					});
					caseEngineAuthState.set(authResult as import('$lib/stores').CaseEngineAuthState);
					if (authResult.state === 'active' && typeof authResult.token === 'string' && authResult.token.trim() !== '') {
						caseEngineToken.set(authResult.token);
						caseEngineUser.set(
							authResult.user
								? {
										id: authResult.user.id,
										name: $user.name ?? authResult.user.role,
										role: authResult.user.role === 'admin' ? 'ADMIN' : 'detective'
									}
								: null
						);
					} else if (authResult.state === 'active') {
						// P19.75-01: Do not clear JWT on refresh when the server returns active without a new token (transient or rotation skipped).
						if (!tokenBeforeRefresh || String(tokenBeforeRefresh).trim() === '') {
							caseEngineToken.set(null);
							caseEngineUser.set(null);
						}
					} else {
						caseEngineToken.set(null);
						caseEngineUser.set(null);
					}
				} catch (err) {
					if (err instanceof BrowserResolveFailure) {
						if (err.classification === 'network_unreachable') {
							// P19.75-01: True network failure — keep prior token + active state.
							console.error('[P19-05] Case Engine token re-resolve failed (network):', err);
							if (import.meta.env.DEV) {
								console.debug('[P19.75-02] browser-resolve (refresh)', {
									httpStatus: err.httpStatus,
									classification: err.classification,
									gateDecision: 'keep_prior_state_and_token',
									keptPriorToken: !!(tokenBeforeRefresh && String(tokenBeforeRefresh).trim())
								});
							}
					} else if (err.classification === 'unauthorized') {
						const mappedRefresh = mapBrowserResolveFailureToAuthState(err);
						caseEngineAuthState.set(mappedRefresh);
						caseEngineToken.set(null);
						caseEngineUser.set(null);
						toastForBrowserResolveFailure(err);
						if (import.meta.env.DEV) {
							console.debug('[P19.75-02] browser-resolve (refresh)', {
								httpStatus: err.httpStatus,
								classification: err.classification,
								gateDecision: 'set_auth_http_error_state',
								caseEngineState: mappedRefresh.state
							});
						}
					} else {
						// Keep previously active session during transient refresh failures
						// (rate_limited, ce_server_error, ce_client_error). This avoids
						// false ejection from workspace while auth service is recovering.
						toastForBrowserResolveFailure(err);
						if (import.meta.env.DEV) {
							console.debug('[P19.75-02] browser-resolve (refresh)', {
								httpStatus: err.httpStatus,
								classification: err.classification,
								gateDecision: 'keep_prior_state_and_token',
								keptPriorToken: !!(tokenBeforeRefresh && String(tokenBeforeRefresh).trim())
							});
						}
					}
					} else {
						// P19.75-01: Unknown error — do not wipe token.
						console.error('[P19-05] Case Engine token re-resolve failed:', err);
						if (import.meta.env.DEV) {
							console.debug('[P19.75-01] token refresh failed; keeping prior token if any', {
								endpoint: 'POST /auth/owui/browser-resolve',
								keptPriorToken: !!(tokenBeforeRefresh && String(tokenBeforeRefresh).trim())
							});
						}
					}
				}
			}
			// After refresh, state may have changed from active → unavailable/pending; re-run gate.
			const postRefreshDecision = resolveAuthStateDecision($caseEngineAuthState.state);
			const postRefreshRedirect = blockedRedirectPath(postRefreshDecision);
			if (postRefreshRedirect) {
				await goto(postRefreshRedirect);
				return;
			}
		}

		// Fail closed only when active but there is truly no JWT anywhere (never had one and refresh did not supply one).
		const hasValidToken = $caseEngineToken && typeof $caseEngineToken === 'string' && $caseEngineToken.trim() !== '';
		if ($caseEngineAuthState?.state === 'active' && !hasValidToken) {
			if (import.meta.env.DEV) {
				console.debug('[P19.75-01] redirect access-unavailable: active but no case engine token', {
					endpoint: 'POST /auth/owui/browser-resolve'
				});
			}
			await goto('/access-unavailable');
			return;
		}

		// Only reached when the user is confirmed active. Mark auth as checked so the
		// app shell renders. ceAuthChecked=false keeps the shell hidden during the check.
		ceAuthChecked = true;

		clearChatInputStorage();
		await Promise.all([
			checkLocalDBChats(),
			setBanners().catch((e) => console.error('Failed to load banners:', e)),
			setTools().catch((e) => console.error('Failed to load tools:', e)),
			setUserSettings(async () => {
				await Promise.all([
					setModels().catch((e) => console.error('Failed to load models:', e)),
					setToolServers().catch((e) => console.error('Failed to load tool servers:', e))
				]);
			}).catch((e) => console.error('Failed to load user settings:', e))
		]);

		const setupKeyboardShortcuts = () => {
			document.addEventListener('keydown', async (event) => {
				if (isShortcutMatch(event, shortcuts[Shortcut.SEARCH])) {
					console.log('Shortcut triggered: SEARCH');
					event.preventDefault();
					showSearch.set(!$showSearch);
				} else if (isShortcutMatch(event, shortcuts[Shortcut.NEW_CHAT])) {
					console.log('Shortcut triggered: NEW_CHAT');
					event.preventDefault();
					document.getElementById('sidebar-new-chat-button')?.click();
				} else if (isShortcutMatch(event, shortcuts[Shortcut.FOCUS_INPUT])) {
					console.log('Shortcut triggered: FOCUS_INPUT');
					event.preventDefault();
					document.getElementById('chat-input')?.focus();
				} else if (isShortcutMatch(event, shortcuts[Shortcut.COPY_LAST_CODE_BLOCK])) {
					console.log('Shortcut triggered: COPY_LAST_CODE_BLOCK');
					event.preventDefault();
					[...document.getElementsByClassName('copy-code-button')]?.at(-1)?.click();
				} else if (isShortcutMatch(event, shortcuts[Shortcut.COPY_LAST_RESPONSE])) {
					console.log('Shortcut triggered: COPY_LAST_RESPONSE');
					event.preventDefault();
					[...document.getElementsByClassName('copy-response-button')]?.at(-1)?.click();
				} else if (isShortcutMatch(event, shortcuts[Shortcut.TOGGLE_SIDEBAR])) {
					console.log('Shortcut triggered: TOGGLE_SIDEBAR');
					event.preventDefault();
					showSidebar.set(!$showSidebar);
				} else if (isShortcutMatch(event, shortcuts[Shortcut.DELETE_CHAT])) {
					console.log('Shortcut triggered: DELETE_CHAT');
					event.preventDefault();
					document.getElementById('delete-chat-button')?.click();
				} else if (isShortcutMatch(event, shortcuts[Shortcut.OPEN_SETTINGS])) {
					console.log('Shortcut triggered: OPEN_SETTINGS');
					event.preventDefault();
					showSettings.set(!$showSettings);
				} else if (isShortcutMatch(event, shortcuts[Shortcut.SHOW_SHORTCUTS])) {
					console.log('Shortcut triggered: SHOW_SHORTCUTS');
					event.preventDefault();
					showShortcuts.set(!$showShortcuts);
				} else if (isShortcutMatch(event, shortcuts[Shortcut.CLOSE_MODAL])) {
					console.log('Shortcut triggered: CLOSE_MODAL');
					event.preventDefault();
					showSettings.set(false);
					showShortcuts.set(false);
				} else if (isShortcutMatch(event, shortcuts[Shortcut.OPEN_MODEL_SELECTOR])) {
					console.log('Shortcut triggered: OPEN_MODEL_SELECTOR');
					event.preventDefault();
					document.getElementById('model-selector-0-button')?.click();
				} else if (isShortcutMatch(event, shortcuts[Shortcut.NEW_TEMPORARY_CHAT])) {
					console.log('Shortcut triggered: NEW_TEMPORARY_CHAT');
					event.preventDefault();
					if ($user?.role !== 'admin' && $user?.permissions?.chat?.temporary_enforced) {
						temporaryChatEnabled.set(true);
					} else {
						temporaryChatEnabled.set(!$temporaryChatEnabled);
					}
					await goto('/');
					setTimeout(() => {
						document.getElementById('new-chat-button')?.click();
					}, 0);
				} else if (isShortcutMatch(event, shortcuts[Shortcut.GENERATE_MESSAGE_PAIR])) {
					console.log('Shortcut triggered: GENERATE_MESSAGE_PAIR');
					event.preventDefault();
					document.getElementById('generate-message-pair-button')?.click();
				} else if (
					isShortcutMatch(event, shortcuts[Shortcut.REGENERATE_RESPONSE]) &&
					document.activeElement?.id === 'chat-input'
				) {
					console.log('Shortcut triggered: REGENERATE_RESPONSE');
					event.preventDefault();
					[...document.getElementsByClassName('regenerate-response-button')]?.at(-1)?.click();
				}
			});
		};
		setupKeyboardShortcuts();

		// Detective: upstream changelog/update prompts disabled — controlled deployment only.

		if ($user?.role === 'admin' || ($user?.permissions?.chat?.temporary ?? true)) {
			if ($page.url.searchParams.get('temporary-chat') === 'true') {
				temporaryChatEnabled.set(true);
			}

			if ($user?.role !== 'admin' && $user?.permissions?.chat?.temporary_enforced) {
				temporaryChatEnabled.set(true);
			}
		}

		// Detective: upstream version update check disabled — controlled deployment only.
		// Persist showControls: track open/close state separately from saved size
		// chatControlsSize always retains the last width for openPane()
		await showControls.set(!$mobile ? localStorage.showControls === 'true' : false);
		showControls.subscribe((value) => {
			localStorage.showControls = value ? 'true' : 'false';
		});

		await tick();

		loaded = true;
	});

	/**
	 * Keep app-shell gating deterministic across in-app navigation:
	 * if auth state becomes blocked (including rate_limited cooldown), immediately
	 * hide shell and route to the correct gate page without transient flashes.
	 */
	$: if ($user && $caseEngineAuthState && !authRedirectInProgress) {
		const decision = resolveAuthStateDecision($caseEngineAuthState.state);
		const redirectTo = blockedRedirectPath(decision);
		if (redirectTo) {
			ceAuthChecked = false;
			authRedirectInProgress = true;
			void goto(redirectTo).finally(() => {
				authRedirectInProgress = false;
			});
		}
	}

</script>

<SettingsModal bind:show={$showSettings} />

{#if $user}
	<div class="app relative">
		<div
			class=" text-gray-700 dark:text-gray-100 bg-white dark:bg-gray-900 h-screen max-h-[100dvh] overflow-hidden flex flex-row"
		>
		{#if !['user', 'admin'].includes($user?.role)}
			<AccountPending />
		{:else if !ceAuthChecked}
			<!-- P19-05: Case Engine auth state check in progress.
			     App shell is hidden until active state is confirmed, preventing pre-redirect flash. -->
			<div class="w-full h-full flex items-center justify-center">
				<Spinner className="size-5" />
			</div>
		{:else}
			{#if localDBChats.length > 0}
					<div class="fixed w-full h-full flex z-50">
						<div
							class="absolute w-full h-full backdrop-blur-md bg-white/20 dark:bg-gray-900/50 flex justify-center"
						>
							<div class="m-auto pb-44 flex flex-col justify-center">
								<div class="max-w-md">
									<div class="text-center dark:text-white text-2xl font-medium z-50">
										{$i18n.t('Important Update')}<br />
										{$i18n.t('Action Required for Chat Log Storage')}
									</div>

									<div class=" mt-4 text-center text-sm dark:text-gray-200 w-full">
										{$i18n.t(
											"Saving chat logs directly to your browser's storage is no longer supported. Please take a moment to download and delete your chat logs by clicking the button below. Don't worry, you can easily re-import your chat logs to the backend through"
										)}
										<span class="font-medium dark:text-white"
											>{$i18n.t('Settings')} > {$i18n.t('Chats')} > {$i18n.t('Import Chats')}</span
										>. {$i18n.t(
											'This ensures that your valuable conversations are securely saved to your backend database. Thank you!'
										)}
									</div>

									<div class=" mt-6 mx-auto relative group w-fit">
										<button
											class="relative z-20 flex px-5 py-2 rounded-full bg-white border border-gray-100 dark:border-none hover:bg-gray-100 transition font-medium text-sm"
											on:click={async () => {
												let blob = new Blob([JSON.stringify(localDBChats)], {
													type: 'application/json'
												});
												saveAs(blob, `chat-export-${Date.now()}.json`);

												const tx = DB.transaction('chats', 'readwrite');
												await Promise.all([tx.store.clear(), tx.done]);
												await deleteDB('Chats');

												localDBChats = [];
											}}
										>
											{$i18n.t('Download & Delete')}
										</button>

										<button
											class="text-xs text-center w-full mt-2 text-gray-400 underline"
											on:click={async () => {
												localDBChats = [];
											}}>{$i18n.t('Close')}</button
										>
									</div>
								</div>
							</div>
						</div>
					</div>
				{/if}

				<!-- Unified shell (detective + admin): custom sidebar; other routes use OWUI Sidebar -->
				{#if isUnifiedSidebar}
					<DetectiveWorkspaceSidebar />
				{:else}
					<Sidebar />
				{/if}

				{#if loaded}
					<!-- Main content: when unified shell, offset by full sidebar or rail (4.5rem) when collapsed; else OWUI behavior. -->
					<div
						class="flex-1 min-w-0 min-h-0 flex flex-col overflow-hidden {isUnifiedSidebar
							? ($showSidebar ? 'md:ml-[var(--sidebar-width)]' : 'md:ml-[4.5rem]')
							: ($showSidebar ? 'md:ml-[var(--sidebar-width)]' : '')}"
					>
						<slot />
					</div>
				{:else}
					<div
						class="w-full flex-1 h-full flex items-center justify-center {isUnifiedSidebar
							? ($showSidebar ? 'md:max-w-[calc(100%-var(--sidebar-width))]' : 'md:max-w-[calc(100%-4.5rem)]')
							: ($showSidebar ? 'md:max-w-[calc(100%-var(--sidebar-width))]' : '')}"
					>
						<Spinner className="size-5" />
					</div>
				{/if}
			{/if}
		</div>
	</div>
{/if}

<style>
	.loading {
		display: inline-block;
		clip-path: inset(0 1ch 0 0);
		animation: l 1s steps(3) infinite;
		letter-spacing: -0.5px;
	}

	@keyframes l {
		to {
			clip-path: inset(0 -1ch 0 0);
		}
	}

	pre[class*='language-'] {
		position: relative;
		overflow: auto;

		/* make space  */
		margin: 5px 0;
		padding: 1.75rem 0 1.75rem 1rem;
		border-radius: 10px;
	}

	pre[class*='language-'] button {
		position: absolute;
		top: 5px;
		right: 5px;

		font-size: 0.9rem;
		padding: 0.15rem;
		background-color: #828282;

		border: ridge 1px #7b7b7c;
		border-radius: 5px;
		text-shadow: #c4c4c4 0 0 2px;
	}

	pre[class*='language-'] button:hover {
		cursor: pointer;
		background-color: #bcbabb;
	}
</style>
