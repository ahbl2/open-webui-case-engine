<script lang="ts">
	/**
	 * Personal desktop threads block (shared by HomeDesktopPanels and OCC main column).
	 * P77-02 — OCC section header + DS buttons/badges/status surfaces.
	 */
	import { caseEngineToken } from '$lib/stores';
	import CaseThreadList, { type ThreadListItem } from '$lib/components/case/CaseThreadList.svelte';
	import type { PersonalThreadAssociation } from '$lib/apis/caseEngine';
	import {
		DS_BADGE_CLASSES,
		DS_BTN_CLASSES,
		DS_OCC_CLASSES,
		DS_STATUS_SURFACE_CLASSES,
		DS_TYPE_CLASSES
	} from '$lib/case/detectivePrimitiveFoundation';

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

<div class={DS_OCC_CLASSES.sectionHeaderRow}>
	<div class={DS_OCC_CLASSES.sectionHeaderTitle}>
		<svg
			xmlns="http://www.w3.org/2000/svg"
			fill="none"
			viewBox="0 0 24 24"
			stroke-width="1.5"
			stroke="currentColor"
			class="size-4 shrink-0 text-[color:var(--ds-text-muted)]"
			aria-hidden="true"
		>
			<path
				stroke-linecap="round"
				stroke-linejoin="round"
				d="M8.625 9.75a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375m-13.5 3.01c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.184-4.183a1.14 1.14 0 0 1 .778-.332 48.294 48.294 0 0 0 5.83-.498c1.585-.233 2.708-1.626 2.708-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z"
			/>
		</svg>
		<h2 class={DS_OCC_CLASSES.sectionHeaderHeading}>Personal Threads</h2>
		<span class="{DS_BADGE_CLASSES.neutral} shrink-0">Personal Desktop</span>
	</div>

	<button
		type="button"
		class="{DS_BTN_CLASSES.primary} flex items-center gap-1.5 text-sm shrink-0"
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
			class="size-4 shrink-0"
			aria-hidden="true"
		>
			<path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
		</svg>
		{bindingInProgress ? 'Binding…' : 'New Chat'}
	</button>
</div>

{#if localBindError}
	<div class="{DS_STATUS_SURFACE_CLASSES.danger} rounded-[var(--ds-radius-md)] p-3 mb-3" data-testid="personal-bind-error">
		<div class="flex items-start justify-between gap-2">
			<p class="{DS_TYPE_CLASSES.body}">{localBindError}</p>
			<button
				type="button"
				class="{DS_BTN_CLASSES.ghost} text-sm shrink-0 underline"
				on:click={onDismissBindError}
			>
				Dismiss
			</button>
		</div>
	</div>
{/if}

{#if !$caseEngineToken}
	<div class="{DS_STATUS_SURFACE_CLASSES.neutral} rounded-[var(--ds-radius-md)] p-6 text-center">
		<p class="{DS_TYPE_CLASSES.body}">
			Case Engine session not active. Personal threads require an active connection.
		</p>
	</div>
{:else if threadsLoading}
	<p class="{DS_TYPE_CLASSES.meta} italic py-2">Loading threads…</p>
{:else if threadsLoadError}
	<div class="{DS_STATUS_SURFACE_CLASSES.danger} rounded-[var(--ds-radius-md)] p-3 mb-2">
		<p class="{DS_TYPE_CLASSES.body}">{threadsLoadError}</p>
		<button type="button" class="{DS_BTN_CLASSES.secondary} mt-2 text-sm" on:click={loadThreads}>
			Try again
		</button>
	</div>
{:else if threads.length === 0}
	<div class="{DS_STATUS_SURFACE_CLASSES.neutral} rounded-[var(--ds-radius-md)] p-6 text-center">
		<p class="{DS_TYPE_CLASSES.meta} italic">
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
