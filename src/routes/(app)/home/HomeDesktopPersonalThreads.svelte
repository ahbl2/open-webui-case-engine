<script lang="ts">
	/**
	 * Personal desktop threads block (shared by HomeDesktopPanels and OCC main column).
	 */
	import { caseEngineToken } from '$lib/stores';
	import CaseThreadList, { type ThreadListItem } from '$lib/components/case/CaseThreadList.svelte';
	import type { PersonalThreadAssociation } from '$lib/apis/caseEngine';

	export let newChat: () => void;
	export let bindingInProgress: boolean;
	export let localBindError: string | null;
	export let onDismissBindError: () => void;

	export let threadsLoading: boolean;
	export let threadsLoadError: string;
	export let loadThreads: () => void;
	export let threads: PersonalThreadAssociation[];
	export let normalizedThreads: ThreadListItem[];
	export let activePersonalThreadId: string | null;
	export let openPersonalThread: (threadId: string) => void;
</script>

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
		<h2 class="text-sm font-semibold text-gray-700 dark:text-gray-300">Personal Threads</h2>
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
				on:click={onDismissBindError}
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
		<button class="mt-1 text-xs text-red-600 underline" on:click={loadThreads}>Try again</button>
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
