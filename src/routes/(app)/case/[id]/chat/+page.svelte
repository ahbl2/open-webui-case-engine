<script lang="ts">
	/**
	 * P19-08 — Case Chat Page (Thread Hub + Scope Binding)
	 *
	 * Primary working surface for the case workspace. This page:
	 *   1. Loads the list of case-associated OWUI threads from Case Engine.
	 *   2. Allows the user to open an existing thread or create a new one.
	 *   3. Binds every opened/created thread to the case via PUT /cases/:caseId/threads/:threadId
	 *      BEFORE rendering the chat. Binding failure blocks the chat — fail-closed.
	 *   4. Renders OWUI's native Chat component inline once binding succeeds.
	 *   5. Shows a truthful scope badge: "Case: {case_number}" or a specific error.
	 *   6. Keeps legacy case tools (Files, AI Intake, Ask, etc.) accessible in a
	 *      collapsible "Case Tools" panel. These will migrate to dedicated routes
	 *      in P19-14; do not remove them here.
	 *
	 * DOCTRINE:
	 *   - Backend association result is required before Chat renders.
	 *   - Scope conflict, access denied, and backend unavailability are all
	 *     surfaced explicitly — never silently opened as unbound chat.
	 *   - activeThreadScope store is set ONLY on successful backend binding.
	 *   - threadScopeError store is set on failure and cleared on each new attempt.
	 */
	import { onMount, onDestroy } from 'svelte';
	import { page } from '$app/stores';
	import { v4 as uuidv4 } from 'uuid';

	import {
		caseEngineToken,
		caseEngineUser,
		caseEngineAuthState,
		activeCaseMeta,
		activeThreadScope,
		threadScopeError,
		user,
		scope
	} from '$lib/stores';
	import {
		listCaseThreadAssociations,
		upsertCaseThreadAssociation,
		browserResolveOwuiAuth,
		type CaseThreadAssociation,
		createProposal,
		type ProposalType
	} from '$lib/apis/caseEngine';
	import { ensureChatForThread } from '$lib/apis/chats';
	import { classifyBindError, bindErrorMessage } from '$lib/utils/threadScopeBinding';

	// Legacy case tool components — preserved for P19-14 migration.
	import CaseFilesTab from '$lib/components/case/CaseFilesTab.svelte';
	import CaseAiIntakeTab from '$lib/components/case/CaseAiIntakeTab.svelte';
	import CaseAiAskTab from '$lib/components/case/CaseAiAskTab.svelte';
	import CaseExportTab from '$lib/components/case/CaseExportTab.svelte';
	import CaseCrossCaseSearch from '$lib/components/case/CaseCrossCaseSearch.svelte';
	import CaseIntegrityTab from '$lib/components/case/CaseIntegrityTab.svelte';
	import CaseWorkflowTab from '$lib/components/case/CaseWorkflowTab.svelte';
	import WarrantWorkflow from '$lib/components/case/WarrantWorkflow.svelte';
	import CaseGraph from '$lib/components/case/CaseGraph.svelte';
	import OperationalWorkspace from '$lib/components/operations/OperationalWorkspace.svelte';
	import NarrativeWorkspacePanel from '$lib/components/case/NarrativeWorkspacePanel.svelte';

	// OWUI native Chat component — same component used by /c/[id]/+page.svelte.
	import Chat from '$lib/components/chat/Chat.svelte';

	// P19-10: Shared proposal review panel (replaces the inline P19-09 panel).
	import ProposalReviewPanel from '$lib/components/proposals/ProposalReviewPanel.svelte';

	$: caseId = $page.params.id;

	// ── Thread list ──────────────────────────────────────────────────────────
	let threads: CaseThreadAssociation[] = [];
	let threadsLoading = false;
	let threadsError = '';

	async function loadThreads(id: string): Promise<void> {
		if (!$caseEngineToken) return;
		threadsLoading = true;
		threadsError = '';
		try {
			threads = await listCaseThreadAssociations(id, $caseEngineToken);
		} catch (err) {
			threadsError = err instanceof Error ? err.message : 'Failed to load threads.';
			threads = [];
		} finally {
			threadsLoading = false;
		}
	}

	// Reload thread list when the case ID changes.
	let prevCaseId: string = $page.params.id ?? '';
	$: if (caseId && caseId !== prevCaseId) {
		prevCaseId = caseId;
		activeChat = null;
		activeThreadScope.set(null);
		threadScopeError.set(null);
		loadThreads(caseId);
	}

	onMount(() => {
		loadThreads(caseId);
	});

	onDestroy(() => {
		// Clear scope binding when leaving the case chat page.
		activeThreadScope.set(null);
		threadScopeError.set(null);
	});

	// ── Active chat (bound thread) ───────────────────────────────────────────
	/** The OWUI chatId currently loaded in Chat.svelte. null = no chat selected. */
	let activeChat: string | null = null;
	let bindingInProgress = false;

	/**
	 * Attempt to bind a thread ID to the current case and, on success,
	 * set activeChat so Chat.svelte renders. On failure, show the error
	 * and do NOT render the chat (fail-closed).
	 */
	async function openThread(threadId: string): Promise<void> {
		const token = $caseEngineToken;
		const hasValidToken = token && typeof token === 'string' && token.trim() !== '';
		if (!hasValidToken || !caseId) {
			if (!caseId) return;
			const message =
				'Case Engine session is not ready. Please refresh the page or sign in again.';
			threadScopeError.set({ kind: 'access_denied', message, threadId });
			return;
		}

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

		bindingInProgress = true;
		activeChat = null;
		activeThreadScope.set(null);
		threadScopeError.set(null);

		try {
			await upsertCaseThreadAssociation(caseId, threadId, token, { getFreshToken });

			// Ensure OWUI has a chat for this thread_id (get-or-create) before render.
			const owuiToken = typeof window !== 'undefined' ? localStorage?.token : null;
			if (owuiToken) {
				await ensureChatForThread(owuiToken, threadId);
			}

			// Binding confirmed by backend — safe to render chat.
			activeThreadScope.set({
				threadId,
				scope: 'case',
				caseId,
				caseMeta: $activeCaseMeta
					? {
							id: $activeCaseMeta.id,
							case_number: $activeCaseMeta.case_number,
							title: $activeCaseMeta.title
						}
					: undefined
			});
			// Case workspace chat must use Case Engine ask path in Chat.svelte (THIS_CASE + activeCaseId).
			scope.set('THIS_CASE');
			activeChat = threadId;

			// Refresh thread list to include any newly created association.
			await loadThreads(caseId);
		} catch (err) {
			const kind = classifyBindError(err);
			const originalMsg = err instanceof Error ? err.message : typeof err === 'string' ? err : null;
			const message = bindErrorMessage(kind, 'case', originalMsg);
			threadScopeError.set({ kind, message, threadId });
			activeChat = null;
		} finally {
			bindingInProgress = false;
		}
	}

	/** Create a new OWUI thread UUID, bind to case, then open chat. */
	async function newThread(): Promise<void> {
		const threadId = uuidv4();
		await openThread(threadId);
	}

	// ── Case Tools panel (legacy tabs, preserved for P19-14) ────────────────
	let showTools = false;
	let activeTool:
		| 'files'
		| 'ai-intake'
		| 'ask'
		| 'export'
		| 'unit-search'
		| 'integrity'
		| 'workflow'
		| 'warrants'
		| 'graph'
		| 'operations'
		| 'narrative'
		| 'proposals' = 'files';

	$: isAdmin =
		$caseEngineUser?.role === 'ADMIN' || $caseEngineAuthState?.user?.role === 'admin';

	// ── Scope error display ──────────────────────────────────────────────────
	$: bindError = $threadScopeError;

	// Format thread creation date for display.
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

	// ── P19-09/P19-10: Proposal creation form ─────────────────────────────────
	// The review panel (list/approve/reject/commit) lives in ProposalReviewPanel.
	// This section owns only the proposal *creation* form that appears above the chat.

	let showProposalForm = false;
	let proposalType: ProposalType = 'note';
	let proposalContent = '';
	let proposalOccurredAt = '';
	let proposalEntryType = 'OBSERVATION';
	let proposalSubmitting = false;
	let proposalError = '';
	let proposalSuccess = '';

	async function submitProposal(): Promise<void> {
		if (!$caseEngineToken || !activeChat || !$activeThreadScope) return;
		proposalSubmitting = true;
		proposalError = '';
		proposalSuccess = '';
		try {
			const scope = $activeThreadScope.scope;
			const payload: Record<string, unknown> =
				proposalType === 'note'
					? { content: proposalContent }
					: {
							occurred_at: proposalOccurredAt,
							type: proposalEntryType,
							text_original: proposalContent
						};

			await createProposal(
				caseId,
				{
					source_scope: scope,
					source_thread_id: activeChat,
					proposal_type: proposalType,
					proposed_payload: payload
				},
				$caseEngineToken
			);
		proposalSuccess = 'Proposal created and saved for review.';
		proposalContent = '';
		proposalOccurredAt = '';
	} catch (err) {
		proposalError = err instanceof Error ? err.message : 'Failed to create proposal.';
	} finally {
		proposalSubmitting = false;
	}
}
</script>

<div class="flex flex-col h-full overflow-hidden" data-testid="case-chat-page">

	<!-- ── MAIN CHAT AREA ──────────────────────────────────────────────────── -->
	<div class="flex flex-1 min-h-0 overflow-hidden">

		<!-- ── LEFT: thread list ──────────────────────────────────────────── -->
		<div
			class="w-52 shrink-0 flex flex-col border-r border-gray-200 dark:border-gray-800
			       bg-gray-50 dark:bg-gray-900 overflow-hidden"
			data-testid="case-thread-list"
		>
			<!-- Header + New Thread button -->
			<div class="shrink-0 px-3 pt-3 pb-2">
				<div class="flex items-center justify-between mb-2">
					<span class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
						Threads
					</span>
					<button
						type="button"
						class="text-xs px-2 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white transition
						       disabled:opacity-50 disabled:cursor-not-allowed"
						on:click={newThread}
						disabled={bindingInProgress || !$caseEngineToken}
						aria-label="New case thread"
						data-testid="new-thread-btn"
					>
						{bindingInProgress ? '…' : '+ New'}
					</button>
				</div>
			</div>

			<!-- Thread list -->
			<div class="flex-1 overflow-y-auto px-2 pb-2">
				{#if threadsLoading}
					<p class="text-xs text-gray-400 px-1 py-2">Loading…</p>
				{:else if threadsError}
					<p class="text-xs text-red-500 px-1 py-2">{threadsError}</p>
				{:else if threads.length === 0}
					<p class="text-xs text-gray-400 dark:text-gray-500 px-1 py-2 italic">
						No threads yet. Start a new one above.
					</p>
				{:else}
					{#each threads as t (t.id)}
						<button
							type="button"
							class="w-full text-left px-2 py-2 rounded-md text-xs mb-0.5 transition
							       {activeChat === t.external_thread_id
								? 'bg-white dark:bg-gray-800 shadow-sm text-gray-900 dark:text-gray-100 font-medium'
								: 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-800 dark:hover:text-gray-200'}"
							on:click={() => openThread(t.external_thread_id)}
							disabled={bindingInProgress}
							aria-label="Open thread from {formatDate(t.created_at)}"
						>
							<span class="block truncate font-mono text-[10px] text-gray-400 dark:text-gray-500 mb-0.5">
								{t.external_thread_id.slice(0, 8)}…
							</span>
							<span class="block text-gray-500 dark:text-gray-500">
								{formatDate(t.created_at)}
							</span>
						</button>
					{/each}
				{/if}
			</div>
		</div>

		<!-- ── RIGHT: chat area ───────────────────────────────────────────── -->
		<div class="flex flex-col flex-1 min-w-0 min-h-0 overflow-hidden">

			<!-- Scope badge: always visible above the chat area -->
			<div
				class="shrink-0 flex items-center gap-2 px-3 py-1.5 border-b border-gray-200 dark:border-gray-800
				       bg-gray-50 dark:bg-gray-900"
				data-testid="scope-badge"
			>
				{#if bindingInProgress}
					<span class="text-xs text-gray-400 dark:text-gray-500 italic">Binding thread to case…</span>
				{:else if bindError}
					<!-- Binding failed — show error, do not render chat -->
					<span
						class="text-xs font-medium text-red-600 dark:text-red-400"
						data-testid="scope-error"
						data-error-kind={bindError.kind}
					>
						{#if bindError.kind === 'scope_conflict'}
							Scope conflict —
						{:else if bindError.kind === 'access_denied'}
							Access denied —
						{:else if bindError.kind === 'backend_unavailable'}
							Service unavailable —
						{:else}
							Binding error —
						{/if}
						<span class="font-normal">{bindError.message}</span>
					</span>
				{:else if activeChat && $activeThreadScope?.scope === 'case'}
					<!-- Thread successfully bound to this case -->
					<span
						class="flex items-center gap-1.5 text-xs text-blue-700 dark:text-blue-400 font-medium"
						data-testid="scope-badge-case"
					>
						<span class="size-1.5 rounded-full bg-blue-500 shrink-0"></span>
						Case: {$activeCaseMeta?.case_number ?? caseId}
					</span>
					<span class="text-gray-300 dark:text-gray-600 text-xs">·</span>
					<span class="text-xs text-gray-400 dark:text-gray-500 truncate flex-1 min-w-0">
						{$activeCaseMeta?.title ?? ''}
					</span>
					<!-- P19-09: Propose to Case button -->
					<button
						type="button"
						class="ml-auto shrink-0 text-xs px-2 py-0.5 rounded border border-blue-400 text-blue-600
						       dark:border-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950
						       transition"
						on:click={() => {
							showProposalForm = !showProposalForm;
							proposalSuccess = '';
							proposalError = '';
						}}
						data-testid="propose-to-case-btn"
					>
						{showProposalForm ? 'Close' : '+ Propose to Case'}
					</button>
				{:else}
					<span class="text-xs text-gray-400 dark:text-gray-500 italic">
						Select or create a thread to begin.
					</span>
				{/if}
			</div>

			<!-- P19-09: Inline proposal creation form (shown when thread is bound) -->
			{#if showProposalForm && activeChat && $activeThreadScope?.scope === 'case'}
				<div
					class="shrink-0 border-b border-blue-100 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/40
					       px-3 py-3"
					data-testid="proposal-form"
				>
					<p class="text-xs font-semibold text-blue-700 dark:text-blue-300 mb-2">
						Propose content for Case {$activeCaseMeta?.case_number ?? caseId}
					</p>

					<!-- Type selector -->
					<div class="flex gap-2 mb-2">
						<label class="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400 cursor-pointer">
							<input type="radio" bind:group={proposalType} value="note" class="accent-blue-600" />
							Note
						</label>
						<label class="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400 cursor-pointer">
							<input type="radio" bind:group={proposalType} value="timeline" class="accent-blue-600" />
							Timeline Entry
						</label>
					</div>

					<!-- Timeline-specific fields -->
					{#if proposalType === 'timeline'}
						<div class="flex gap-2 mb-2">
							<div class="flex-1">
								<label class="block text-xs text-gray-500 dark:text-gray-400 mb-0.5">
									Date/Time (ISO 8601)
								</label>
								<input
									type="text"
									bind:value={proposalOccurredAt}
									placeholder="e.g. 2024-03-15T09:30:00Z"
									class="w-full text-xs px-2 py-1 rounded border border-gray-300 dark:border-gray-600
									       bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
									data-testid="proposal-occurred-at"
								/>
							</div>
							<div class="w-32">
								<label class="block text-xs text-gray-500 dark:text-gray-400 mb-0.5">Type</label>
								<input
									type="text"
									bind:value={proposalEntryType}
									placeholder="OBSERVATION"
									class="w-full text-xs px-2 py-1 rounded border border-gray-300 dark:border-gray-600
									       bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
								/>
							</div>
						</div>
					{/if}

					<!-- Content/text -->
					<textarea
						bind:value={proposalContent}
						placeholder={proposalType === 'note'
							? 'Enter note content…'
							: 'Describe what was observed or recorded…'}
						rows="3"
						class="w-full text-xs px-2 py-1.5 rounded border border-gray-300 dark:border-gray-600
						       bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 resize-none mb-2"
						data-testid="proposal-content"
					></textarea>

					<!-- Submit -->
					<div class="flex items-center gap-2">
						<button
							type="button"
							class="text-xs px-3 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white transition
							       disabled:opacity-50 disabled:cursor-not-allowed"
							on:click={submitProposal}
							disabled={proposalSubmitting || !proposalContent.trim() ||
								(proposalType === 'timeline' && !proposalOccurredAt.trim())}
							data-testid="submit-proposal-btn"
						>
							{proposalSubmitting ? 'Submitting…' : 'Submit Proposal'}
						</button>
						{#if proposalError}
							<span class="text-xs text-red-600 dark:text-red-400">{proposalError}</span>
						{:else if proposalSuccess}
							<span class="text-xs text-green-600 dark:text-green-400">{proposalSuccess}</span>
						{/if}
					</div>
				</div>
			{/if}

			<!-- Chat component — rendered only when a thread is bound -->
			<div class="flex-1 min-h-0 overflow-hidden" data-testid="case-chat-area">
				{#if !bindError && activeChat}
					<!-- Backend binding confirmed — render OWUI chat. -->
					<Chat chatIdProp={activeChat} />
				{:else if !bindError && !activeChat}
					<!-- No thread selected yet — placeholder -->
					<div class="flex flex-col items-center justify-center h-full gap-3 text-center px-6">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							fill="none"
							viewBox="0 0 24 24"
							stroke-width="1.5"
							stroke="currentColor"
							class="size-8 text-gray-300 dark:text-gray-600"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								d="M8.625 9.75a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375m-13.5 3.01c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.184-4.183a1.14 1.14 0 0 1 .778-.332 48.294 48.294 0 0 0 5.83-.498c1.585-.233 2.708-1.626 2.708-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z"
							/>
						</svg>
						<p class="text-sm text-gray-500 dark:text-gray-400">
							Select a thread from the list or start a new one.
						</p>
						<button
							type="button"
							class="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm transition
							       disabled:opacity-50 disabled:cursor-not-allowed"
							on:click={newThread}
							disabled={bindingInProgress || !$caseEngineToken}
						>
							New Thread
						</button>
					</div>
				{:else if bindError}
					<!-- Explicit binding error state — do NOT fall back to generic chat -->
					<div
						class="flex flex-col items-center justify-center h-full gap-3 text-center px-6"
						data-testid="binding-error-state"
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							fill="none"
							viewBox="0 0 24 24"
							stroke-width="1.5"
							stroke="currentColor"
							class="size-8 text-red-400 dark:text-red-500"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
							/>
						</svg>
						<p class="text-sm font-medium text-red-700 dark:text-red-400">Thread binding failed</p>
						<p class="text-xs text-gray-500 dark:text-gray-400 max-w-xs">{bindError.message}</p>
						<button
							type="button"
							class="text-xs text-blue-600 dark:text-blue-400 underline"
							on:click={() => { threadScopeError.set(null); }}
						>
							Dismiss and select a different thread
						</button>
					</div>
				{/if}
			</div>
		</div>
	</div>

	<!-- ── CASE TOOLS (legacy — P19-14 migration target) ──────────────────── -->
	<div
		class="shrink-0 border-t border-gray-200 dark:border-gray-800"
		data-testid="case-tools-panel"
	>
		<button
			type="button"
			class="w-full flex items-center justify-between px-3 py-2 text-xs font-medium
			       text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-900 transition"
			on:click={() => (showTools = !showTools)}
			aria-expanded={showTools}
		>
			<span class="flex items-center gap-1.5">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					fill="none"
					viewBox="0 0 24 24"
					stroke-width="1.5"
					stroke="currentColor"
					class="size-3.5"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						d="M11.42 15.17 17.25 21A2.652 2.652 0 0 0 21 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 1 1-3.586-3.586l5.654-4.654m5.96-4.336a3.326 3.326 0 1 0-5.96 4.336"
					/>
				</svg>
				Case Tools
			</span>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				fill="none"
				viewBox="0 0 24 24"
				stroke-width="1.5"
				stroke="currentColor"
				class="size-3 transition-transform {showTools ? 'rotate-180' : ''}"
			>
				<path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
			</svg>
		</button>

		{#if showTools}
			<!-- Tool tab bar -->
			<div
				class="flex gap-1 px-2 pt-1 pb-0 border-t border-gray-200 dark:border-gray-700 overflow-x-auto bg-gray-50 dark:bg-gray-900"
			>
				{#each ([
					['proposals',   'Proposals'],
					['files',       'Files'],
					['ai-intake',   'AI Intake'],
					['ask',         'Ask'],
					['export',      'Export'],
					['unit-search', 'Unit Search'],
					['integrity',   'Integrity'],
					['workflow',    'Workflow'],
					['warrants',    'Warrants'],
					['graph',       'Graph'],
					['operations',  'Operations'],
					['narrative',   'Narrative']
				] as Array<[typeof activeTool, string]>) as [tabId, tabLabel] (tabId)}
					<button
						type="button"
						class="px-2 py-1.5 text-xs rounded whitespace-nowrap
						       {activeTool === tabId
							? 'bg-gray-200 dark:bg-gray-700 font-medium text-gray-800 dark:text-gray-200'
							: 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}"
						on:click={() => (activeTool = tabId)}
					>
						{tabLabel}
					</button>
				{/each}
			</div>

			<!-- Tool content — max height to keep chat primary -->
			<div class="max-h-96 overflow-auto flex flex-col bg-white dark:bg-gray-950">
			{#if activeTool === 'proposals'}
				<!-- P19-10: Full proposal review panel (replaces inline P19-09 panel) -->
				<ProposalReviewPanel
					{caseId}
					token={$caseEngineToken ?? ''}
					data-testid="proposals-panel"
				/>
				{:else if activeTool === 'files'}
					<CaseFilesTab {caseId} token={$caseEngineToken!} />
				{:else if activeTool === 'ask'}
					<CaseAiAskTab {caseId} token={$caseEngineToken!} />
				{:else if activeTool === 'export'}
					<CaseExportTab
						{caseId}
						token={$caseEngineToken!}
						caseNumber={$activeCaseMeta?.case_number ?? ''}
					/>
				{:else if activeTool === 'unit-search'}
					<CaseCrossCaseSearch token={$caseEngineToken!} />
				{:else if activeTool === 'integrity'}
					<CaseIntegrityTab {caseId} token={$caseEngineToken!} {isAdmin} />
				{:else if activeTool === 'workflow'}
					<CaseWorkflowTab {caseId} token={$caseEngineToken!} {isAdmin} />
				{:else if activeTool === 'warrants'}
					<WarrantWorkflow
						{caseId}
						token={$caseEngineToken!}
						caseNumber={$activeCaseMeta?.case_number ?? ''}
						{isAdmin}
					/>
				{:else if activeTool === 'graph'}
					<CaseGraph {caseId} token={$caseEngineToken!} {isAdmin} />
				{:else if activeTool === 'operations'}
					<OperationalWorkspace
						{caseId}
						token={$caseEngineToken!}
						currentUserId={$caseEngineUser?.id ?? ''}
					/>
				{:else if activeTool === 'narrative'}
					<NarrativeWorkspacePanel {caseId} token={$caseEngineToken!} />
				{:else}
					<CaseAiIntakeTab {caseId} token={$caseEngineToken!} />
				{/if}
			</div>
		{/if}
	</div>
</div>
