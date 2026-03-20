<script lang="ts">
	/**
	 * P19-08 — OWUI Chat Page with Scope Badge.
	 *
	 * Renders the native OWUI Chat component. When the active thread was opened
	 * from a known scope context (case workspace or personal desktop) in the same
	 * browser session, a scope badge is shown above the chat.
	 *
	 * The scope badge is truthful:
	 *   - It is only shown when activeThreadScope.threadId matches the current chatIdProp.
	 *   - If the user navigated directly to this URL (no prior binding in this session),
	 *     no badge is shown — the scope is genuinely unknown without a backend lookup.
	 *   - This is intentionally honest: no phantom case context is displayed.
	 *
	 * The case badge links back to the case workspace chat page so the user can
	 * return to the thread management hub.
	 */
	import { page } from '$app/stores';
	import {
		activeThreadScope,
		scope,
		activeCaseId,
		activeCaseNumber,
		caseContext,
		aiCaseContext
	} from '$lib/stores';

	import Chat from '$lib/components/chat/Chat.svelte';

	$: chatId = $page.params.id;

	// Only show the scope badge if the stored binding matches the current chat.
	// If there is a mismatch (stale store or direct navigation), show nothing.
	$: boundScope =
		$activeThreadScope?.threadId === chatId ? $activeThreadScope : null;

	// Keep persisted case-chat routing aligned with the known thread binding for this /c/[id] route.
	$: if (boundScope?.scope === 'personal') {
		scope.set('ALL');
		activeCaseId.set(null);
		activeCaseNumber.set(null);
		caseContext.set(null);
		aiCaseContext.set(null);
	} else if (boundScope?.scope === 'case' && boundScope.caseId) {
		scope.set('THIS_CASE');
		activeCaseId.set(boundScope.caseId);
		if (boundScope.caseMeta?.case_number) {
			activeCaseNumber.set(boundScope.caseMeta.case_number);
		}
	}
</script>

<div class="flex flex-col flex-1 min-h-0 h-full w-full">
{#if boundScope}
	<!-- Scope indicator bar — visible above the OWUI chat area -->
	<div
		class="flex items-center gap-2 px-4 py-1.5 border-b border-gray-200 dark:border-gray-800
		       bg-gray-50 dark:bg-gray-900 text-xs shrink-0"
		data-testid="chat-scope-badge"
		data-scope={boundScope.scope}
	>
		{#if boundScope.scope === 'case' && boundScope.caseId}
			<span class="flex items-center gap-1.5 text-blue-700 dark:text-blue-400 font-medium">
				<span class="size-1.5 rounded-full bg-blue-500 shrink-0" aria-hidden="true"></span>
				Case: {boundScope.caseMeta?.case_number ?? boundScope.caseId}
				{#if boundScope.caseMeta?.title}
					<span class="text-gray-400 dark:text-gray-500 font-normal truncate max-w-[200px]">
						— {boundScope.caseMeta.title}
					</span>
				{/if}
			</span>
			<span class="text-gray-300 dark:text-gray-600" aria-hidden="true">·</span>
			<a
				href="/case/{boundScope.caseId}/chat"
				class="text-blue-600 dark:text-blue-400 hover:underline"
				data-testid="return-to-case-link"
			>
				Return to case workspace ↗
			</a>
		{:else if boundScope.scope === 'personal'}
			<span class="flex items-center gap-1.5 text-gray-600 dark:text-gray-400 font-medium">
				<span class="size-1.5 rounded-full bg-gray-400 shrink-0" aria-hidden="true"></span>
				Personal Desktop
			</span>
			<span class="text-gray-300 dark:text-gray-600" aria-hidden="true">·</span>
			<a
				href="/home"
				class="text-gray-500 dark:text-gray-400 hover:underline"
				data-testid="return-to-desktop-link"
			>
				Return to My Desktop ↗
			</a>
		{/if}
	</div>
{/if}

<div class="flex-1 min-h-0 flex flex-col overflow-hidden">
	<Chat chatIdProp={chatId} />
</div>
</div>
