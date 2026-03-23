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
		listCases,
		type PersonalThreadAssociation,
		type CaseEngineCase
	} from '$lib/apis/caseEngine';
	import { classifyBindError, bindErrorMessage } from '$lib/utils/threadScopeBinding';
	import CaseThreadList, { type ThreadListItem } from '$lib/components/case/CaseThreadList.svelte';
	import { activeUiThread } from '$lib/stores/activeUiThread';

	// ── Personal thread list ─────────────────────────────────────────────────
	let threads: PersonalThreadAssociation[] = [];
	let threadsLoading = false;
	let threadsLoadError = '';

	/** Derive active thread ID from the canonical store — desktop scope only. */
	$: activePersonalThreadId =
		$activeUiThread?.scope === 'desktop' ? $activeUiThread.threadId : null;

	$: normalizedThreads = threads.map<ThreadListItem>((t) => ({
		id: t.id,
		threadId: t.thread_id,
		createdAt: t.created_at
	}));

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

	onMount(() => { loadThreads(); loadCases(); });

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
		activeUiThread.set({ scope: 'desktop', threadId });
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

	// ── Your Cases widget ────────────────────────────────────────────────────
	const MAX_CASES = 5;
	let recentCases: CaseEngineCase[] = [];
	let casesLoading = false;
	let casesError = '';

	/** Normalize scope store value to a unit accepted by listCases. */
	$: resolvedUnit = ($scope === 'CID' || $scope === 'SIU') ? $scope : 'ALL';

	const STATUS_COLORS: Record<string, string> = {
		active: 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400',
		open:   'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400',
		closed: 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
	};

	function statusColor(status: string): string {
		return STATUS_COLORS[status?.toLowerCase()] ?? 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400';
	}

	async function loadCases(): Promise<void> {
		if (!$caseEngineToken) return;
		casesLoading = true;
		casesError = '';
		try {
			const all = await listCases(resolvedUnit, $caseEngineToken);
			recentCases = all.slice(0, MAX_CASES);
		} catch (err) {
			casesError = err instanceof Error ? err.message : 'Failed to load cases.';
			recentCases = [];
		} finally {
			casesLoading = false;
		}
	}

	function goToCases() {
		goto('/cases');
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
			<div data-testid="personal-thread-list">
				<CaseThreadList
					threads={normalizedThreads}
					activeThreadId={activePersonalThreadId}
					{bindingInProgress}
					scrollKey="personal"
					containerClass="flex flex-col"
					on:open={(e) => openPersonalThread(e.detail)}
				/>
			</div>
		{/if}
		</div>

		<!-- ── Your Cases ────────────────────────────────────────────────── -->
		<div class="mb-6">
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
							d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z"
						/>
					</svg>
					<h2 class="text-sm font-semibold text-gray-700 dark:text-gray-300">Your Cases</h2>
				</div>
				<button
					type="button"
					class="text-xs text-blue-600 dark:text-blue-400 hover:underline"
					on:click={goToCases}
				>
					View all →
				</button>
			</div>

			{#if !$caseEngineToken}
				<p class="text-sm text-gray-400 dark:text-gray-500 italic py-2">
					Case Engine session not active.
				</p>
			{:else if casesLoading}
				<p class="text-sm text-gray-400 dark:text-gray-500 italic py-2">Loading cases…</p>
			{:else if casesError}
				<div class="rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/30 p-3">
					<p class="text-xs text-red-700 dark:text-red-400">{casesError}</p>
					<button class="mt-1 text-xs text-red-600 dark:text-red-400 underline" on:click={loadCases}>
						Try again
					</button>
				</div>
			{:else if recentCases.length === 0}
				<div
					class="rounded-xl border border-dashed border-gray-200 dark:border-gray-700
					       bg-gray-50 dark:bg-gray-900 p-5 text-center"
				>
					<p class="text-sm text-gray-400 dark:text-gray-500">
						No cases available under your current scope.
					</p>
					<button
						type="button"
						class="mt-2 text-xs text-blue-600 dark:text-blue-400 hover:underline"
						on:click={goToCases}
					>
						Go to Cases →
					</button>
				</div>
			{:else}
				<div class="flex flex-col gap-1.5" data-testid="recent-cases-list">
					{#each recentCases as c (c.id)}
						<button
							type="button"
							class="w-full text-left flex items-center gap-3 rounded-lg border border-gray-200
							       dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50
							       dark:hover:bg-gray-750 px-3 py-2.5 transition"
							on:click={() => goto(`/case/${c.id}`)}
							data-testid="recent-case-item"
							data-case-id={c.id}
						>
							<div class="flex-1 min-w-0">
								<div class="flex items-center gap-2 mb-0.5">
									<span class="text-xs font-mono text-gray-500 dark:text-gray-400 shrink-0">
										#{c.case_number}
									</span>
									<span class="text-[10px] px-1 py-0.5 rounded font-medium shrink-0 {statusColor(c.status)}">
										{c.status}
									</span>
									<span class="text-[10px] text-gray-400 dark:text-gray-600 shrink-0">{c.unit}</span>
								</div>
								<p class="text-sm text-gray-800 dark:text-gray-100 truncate">{c.title}</p>
							</div>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								fill="none"
								viewBox="0 0 24 24"
								stroke-width="1.5"
								stroke="currentColor"
								class="size-4 text-gray-400 shrink-0"
							>
								<path stroke-linecap="round" stroke-linejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
							</svg>
						</button>
					{/each}
				</div>
			{/if}
		</div>
	</div>
</div>
