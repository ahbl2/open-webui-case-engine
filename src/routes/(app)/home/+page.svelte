<script lang="ts">
	/**
	 * P19-08 — My Desktop (Personal Thread Integration)
	 *
	 * Provides the personal thread entry path for the detective's private workspace.
	 *
	 * Personal threads:
	 *   - Are visible only to the owning user (owner-only scope).
	 *   - Are backed by Case Engine (GET/PUT /desktop/threads).
	 *   - Are bound to 'personal' scope via backend confirmation before chat opens.
	 *   - Cannot be accessed from any case view (no cross-scope leakage).
	 *
	 * Binding behavior:
	 *   - "New Chat" → generates a UUID → calls PUT /desktop/threads/:id → navigates to /c/[id]
	 *     if and only if binding succeeds.
	 *   - Thread item click → idempotent PUT (restore or confirm) → navigate on success.
	 *   - On binding failure: show explicit error, do NOT navigate into unbound chat.
	 *
	 * DOCTRINE:
	 *   - Backend association is required before navigation. Fail-closed.
	 *   - No personal thread IDs or metadata are exposed to case views.
	 *   - activeThreadScope is set to 'personal' on successful binding.
	 */
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { v4 as uuidv4 } from 'uuid';

	import {
		caseEngineToken,
		activeThreadScope,
		threadScopeError,
		user,
		scope,
		activeCaseId,
		activeCaseNumber,
		caseContext,
		aiCaseContext
	} from '$lib/stores';
	import {
		listPersonalThreadAssociations,
		upsertPersonalThreadAssociation,
		browserResolveOwuiAuth,
		type PersonalThreadAssociation
	} from '$lib/apis/caseEngine';
	import { classifyBindError, bindErrorMessage } from '$lib/utils/threadScopeBinding';

	// ── Personal thread list ─────────────────────────────────────────────────
	let threads: PersonalThreadAssociation[] = [];
	let threadsLoading = false;
	let threadsLoadError = '';

	async function loadThreads(): Promise<void> {
		if (!$caseEngineToken) {
			threadsLoading = false;
			return;
		}
		threadsLoading = true;
		threadsLoadError = '';
		try {
			threads = await listPersonalThreadAssociations($caseEngineToken);
		} catch (err) {
			threadsLoadError = err instanceof Error ? err.message : 'Failed to load personal threads.';
			threads = [];
		} finally {
			threadsLoading = false;
		}
	}

	onMount(loadThreads);

	// ── Thread binding ───────────────────────────────────────────────────────
	let bindingInProgress = false;
	let localBindError: string | null = null;

	/**
	 * Bind a thread ID to personal scope (idempotent PUT). On success, set
	 * activeThreadScope and navigate to OWUI chat. On failure, show error
	 * and block navigation.
	 */
	async function openPersonalThread(threadId: string): Promise<void> {
		const token = $caseEngineToken;
		const hasValidToken = token && typeof token === 'string' && token.trim() !== '';
		if (!hasValidToken) {
			const message =
				'Case Engine session is not ready. Please refresh the page or sign in again.';
			localBindError = message;
			threadScopeError.set({ kind: 'access_denied', message, threadId });
			return;
		}

		bindingInProgress = true;
		localBindError = null;
		activeThreadScope.set(null);
		threadScopeError.set(null);

		const getFreshToken = async (): Promise<string | null> => {
			const u = $user;
			if (!u?.id) return null;
			try {
				const authResult = await browserResolveOwuiAuth({
					owui_user_id: u.id,
					username_or_email: (u as { email?: string }).email ?? u.name ?? u.id,
					display_name: u.name
				});
				if (authResult.state === 'active' && typeof authResult.token === 'string' && authResult.token.trim() !== '') {
					caseEngineToken.set(authResult.token);
					return authResult.token;
				}
			} catch {
				// ignore
			}
			return null;
		};

		try {
			await upsertPersonalThreadAssociation(threadId, token, { getFreshToken });

			// Backend confirmed the binding — safe to navigate.
			// OWUI chat record is NOT created here; it is created on first message send.
			activeThreadScope.set({ threadId, scope: 'personal' });
			// Clear single-case chat routing: Chat.svelte uses persisted `scope`===THIS_CASE + activeCaseId
			// for Case Engine ask; desktop threads must use normal LLM path (user-wide / ALL).
			scope.set('ALL');
			activeCaseId.set(null);
			activeCaseNumber.set(null);
			caseContext.set(null);
			aiCaseContext.set(null);
			await goto(`/c/${threadId}`);
		} catch (err) {
			const kind = classifyBindError(err);
			const originalMsg = err instanceof Error ? err.message : typeof err === 'string' ? err : null;
			const message = bindErrorMessage(kind, 'personal', originalMsg);
			localBindError = message;
			threadScopeError.set({ kind, message, threadId });
			activeThreadScope.set(null);
		} finally {
			bindingInProgress = false;
		}
	}

	async function newChat(): Promise<void> {
		const threadId = uuidv4();
		sessionStorage.setItem(`rt:${threadId}`, '1');
		await openPersonalThread(threadId);
	}

	function goToCases() {
		goto('/cases');
	}

	function formatDate(iso: string): string {
		try {
			return new Date(iso).toLocaleDateString(undefined, {
				month: 'short',
				day: 'numeric',
				year: 'numeric'
			});
		} catch {
			return iso;
		}
	}
</script>

<div class="flex-1 flex flex-col w-full min-w-0 h-full overflow-y-auto px-4 py-6 md:px-8 md:py-8">
	<div class="max-w-4xl w-full mx-auto">

		<!-- Header -->
		<div class="flex items-center gap-3 mb-6">
			<svg
				xmlns="http://www.w3.org/2000/svg"
				fill="none"
				viewBox="0 0 24 24"
				stroke-width="1.5"
				stroke="currentColor"
				class="size-6 text-gray-600 dark:text-gray-300"
			>
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"
				/>
			</svg>
			<h1 class="text-xl font-semibold text-gray-800 dark:text-gray-100">My Desktop</h1>
		</div>

		<!-- ── Personal Threads ────────────────────────────────────────────── -->
		<div class="mb-8">
			<div class="flex items-center justify-between mb-3">
				<div class="flex items-center gap-2">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						fill="none"
						viewBox="0 0 24 24"
						stroke-width="1.5"
						stroke="currentColor"
						class="size-4 text-gray-500 dark:text-gray-400"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							d="M8.625 9.75a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375m-13.5 3.01c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.184-4.183a1.14 1.14 0 0 1 .778-.332 48.294 48.294 0 0 0 5.83-.498c1.585-.233 2.708-1.626 2.708-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z"
						/>
					</svg>
					<h2 class="text-sm font-semibold text-gray-700 dark:text-gray-300">
						Personal Threads
					</h2>
					<span
						class="text-xs px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800
						       text-gray-500 dark:text-gray-400"
					>
						Personal Desktop
					</span>
				</div>

				<button
					type="button"
					class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700
					       text-white text-sm transition disabled:opacity-50 disabled:cursor-not-allowed"
					on:click={newChat}
					disabled={bindingInProgress || !$caseEngineToken}
					data-testid="new-personal-chat-btn"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						fill="none"
						viewBox="0 0 24 24"
						stroke-width="1.5"
						stroke="currentColor"
						class="size-4"
					>
						<path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
					</svg>
					{bindingInProgress ? 'Binding…' : 'New Chat'}
				</button>
			</div>

			<!-- Binding error banner -->
			{#if localBindError}
				<div
					class="mb-3 rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/30 p-3"
					data-testid="personal-bind-error"
				>
					<div class="flex items-start justify-between gap-2">
						<p class="text-xs text-red-700 dark:text-red-400">{localBindError}</p>
						<button
							type="button"
							class="text-xs text-red-400 hover:text-red-600 shrink-0 underline"
							on:click={() => (localBindError = null)}
						>
							Dismiss
						</button>
					</div>
				</div>
			{/if}

			{#if !$caseEngineToken}
				<div
					class="rounded-xl border border-dashed border-gray-300 dark:border-gray-700
					       bg-gray-50 dark:bg-gray-900 p-6 text-center"
				>
					<p class="text-sm text-gray-500 dark:text-gray-400">
						Case Engine session not active. Personal threads require an active connection.
					</p>
				</div>
			{:else if threadsLoading}
				<p class="text-sm text-gray-400 dark:text-gray-500 italic py-2">Loading threads…</p>
			{:else if threadsLoadError}
				<div class="rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/30 p-3 mb-2">
					<p class="text-xs text-red-700 dark:text-red-400">{threadsLoadError}</p>
					<button class="mt-1 text-xs text-red-600 underline" on:click={loadThreads}>
						Try again
					</button>
				</div>
			{:else if threads.length === 0}
				<div
					class="rounded-xl border border-dashed border-gray-200 dark:border-gray-700
					       bg-gray-50 dark:bg-gray-900 p-6 text-center"
				>
					<p class="text-sm text-gray-400 dark:text-gray-500 italic">
						No personal threads yet. Click "New Chat" to start one.
					</p>
				</div>
			{:else}
				<div class="flex flex-col gap-1.5" data-testid="personal-thread-list">
					{#each threads as t (t.id)}
						<button
							type="button"
							class="w-full text-left rounded-xl border border-gray-200 dark:border-gray-700
							       bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750
							       px-4 py-3 transition group disabled:opacity-50 disabled:cursor-not-allowed"
							on:click={() => openPersonalThread(t.thread_id)}
							disabled={bindingInProgress}
							data-testid="personal-thread-item"
						>
							<div class="flex items-center justify-between gap-3">
								<div class="flex flex-col min-w-0">
									<span
										class="text-xs font-mono text-gray-400 dark:text-gray-500 truncate mb-0.5"
									>
										{t.thread_id}
									</span>
									<span class="text-xs text-gray-500 dark:text-gray-400">
										{formatDate(t.created_at)}
									</span>
								</div>
								<div class="flex items-center gap-2 shrink-0">
									<span
										class="text-xs px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700
										       text-gray-500 dark:text-gray-400"
									>
										Personal
									</span>
									<svg
										xmlns="http://www.w3.org/2000/svg"
										fill="none"
										viewBox="0 0 24 24"
										stroke-width="1.5"
										stroke="currentColor"
										class="size-4 text-gray-300 dark:text-gray-600
										       group-hover:text-gray-500 dark:group-hover:text-gray-400 transition"
									>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											d="m8.25 4.5 7.5 7.5-7.5 7.5"
										/>
									</svg>
								</div>
							</div>
						</button>
					{/each}
				</div>
			{/if}
		</div>

		<!-- ── Personal Notes (placeholder — UI forthcoming) ─────────────── -->
		<div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
			<div
				class="rounded-xl border border-dashed border-gray-200 dark:border-gray-700
				       bg-gray-50 dark:bg-gray-900 p-5"
			>
				<div class="flex items-center gap-2 mb-2">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						fill="none"
						viewBox="0 0 24 24"
						stroke-width="1.5"
						stroke="currentColor"
						class="size-5 text-gray-400"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10"
						/>
					</svg>
					<span class="text-sm font-medium text-gray-600 dark:text-gray-400">Personal Notes</span>
				</div>
				<p class="text-xs text-gray-400 dark:text-gray-500">
					Private notes visible only to you. Full interface coming in a later release.
				</p>
			</div>

			<div
				class="rounded-xl border border-dashed border-gray-200 dark:border-gray-700
				       bg-gray-50 dark:bg-gray-900 p-5"
			>
				<div class="flex items-center gap-2 mb-2">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						fill="none"
						viewBox="0 0 24 24"
						stroke-width="1.5"
						stroke="currentColor"
						class="size-5 text-gray-400"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
						/>
					</svg>
					<span class="text-sm font-medium text-gray-600 dark:text-gray-400">Personal Files</span>
				</div>
				<p class="text-xs text-gray-400 dark:text-gray-500">
					Private files visible only to you. Full interface coming in a later release.
				</p>
			</div>
		</div>

		<!-- ── Quick Access ───────────────────────────────────────────────── -->
		<div class="flex items-center gap-3 mb-3">
			<h2 class="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
				Quick Access
			</h2>
		</div>
		<div class="flex flex-col gap-2">
			<button
				class="w-full text-left flex items-center gap-3 rounded-xl border border-gray-200
				       dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750
				       px-4 py-3 transition"
				on:click={goToCases}
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					fill="none"
					viewBox="0 0 24 24"
					stroke-width="1.5"
					stroke="currentColor"
					class="size-5 text-gray-400"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z"
					/>
				</svg>
				<span class="text-sm text-gray-700 dark:text-gray-300">Go to Cases</span>
			</button>
		</div>
	</div>
</div>
