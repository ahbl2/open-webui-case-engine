<script lang="ts">
	import { toast } from 'svelte-sonner';
	import type { OperationalTask, OperationalTaskBoardResponse } from '$lib/apis/operationsApi';
	import {
		assignOperationalTask,
		reassignOperationalTask,
		completeOperationalTask
	} from '$lib/apis/operationsApi';

	export let caseId: string;
	export let token: string;
	export let board: OperationalTaskBoardResponse | null = null;
	export let loading = false;
	export let currentUserId: string = '';
	export let onRefresh: () => void = () => {};

	let assignTask: OperationalTask | null = null;
	let assignUserId = '';
	let reassignTask: OperationalTask | null = null;
	let reassignUserId = '';
	let completingTaskId: string | null = null;

	async function handleAssign() {
		if (!assignTask || !assignUserId.trim()) {
			toast.error('Enter user id to assign to');
			return;
		}
		try {
			await assignOperationalTask(caseId, assignTask.id, assignUserId.trim(), token);
			toast.success('Task assigned');
			assignTask = null;
			assignUserId = '';
			onRefresh();
		} catch (e) {
			toast.error((e as Error)?.message ?? 'Assign failed');
		}
	}

	async function handleReassign() {
		if (!reassignTask || !reassignUserId.trim()) {
			toast.error('Enter user id to reassign to');
			return;
		}
		try {
			await reassignOperationalTask(caseId, reassignTask.id, reassignUserId.trim(), token);
			toast.success('Task reassigned');
			reassignTask = null;
			reassignUserId = '';
			onRefresh();
		} catch (e) {
			toast.error((e as Error)?.message ?? 'Reassign failed');
		}
	}

	async function handleComplete(task: OperationalTask) {
		if (task.status === 'DONE') return;
		completingTaskId = task.id;
		try {
			await completeOperationalTask(caseId, task.id, token);
			toast.success('Task completed');
			onRefresh();
		} catch (e) {
			toast.error((e as Error)?.message ?? 'Complete failed');
		} finally {
			completingTaskId = null;
		}
	}

	function openAssign(t: OperationalTask) {
		assignTask = t;
		assignUserId = currentUserId;
		reassignTask = null;
	}

	function openReassign(t: OperationalTask) {
		reassignTask = t;
		reassignUserId = t.assigned_to_user_id ?? currentUserId;
		assignTask = null;
	}
</script>

<div class="space-y-2">
	{#if loading}
		<p class="text-sm text-gray-500">Loading task board…</p>
	{:else if !board}
		<p class="text-sm text-gray-500 dark:text-gray-400">No task board loaded.</p>
	{:else}
		<div class="grid grid-cols-1 sm:grid-cols-4 gap-2">
			<div>
				<div class="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Open</div>
				<ul class="space-y-1 min-h-[60px]">
					{#each board.open as t (t.id)}
						<li class="text-sm p-2 rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800">
							<div class="font-medium">{t.title}</div>
							{#if t.assigned_to_user_id}
								<div class="text-xs text-gray-500 mt-0.5">Assigned</div>
							{/if}
							<div class="flex flex-wrap gap-1 mt-1">
								<button
									type="button"
									class="text-xs px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600"
									on:click={() => openAssign(t)}
								>Assign</button>
								{#if t.assigned_to_user_id}
									<button
										type="button"
										class="text-xs px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600"
										on:click={() => openReassign(t)}
									>Reassign</button>
								{/if}
								<button
									type="button"
									class="text-xs px-1.5 py-0.5 rounded bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-200 disabled:opacity-50"
									disabled={completingTaskId === t.id}
									on:click={() => handleComplete(t)}
								>Complete</button>
							</div>
						</li>
					{/each}
				</ul>
			</div>
			<div>
				<div class="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">In progress</div>
				<ul class="space-y-1 min-h-[60px]">
					{#each board.in_progress as t (t.id)}
						<li class="text-sm p-2 rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800">
							<div class="font-medium">{t.title}</div>
							<div class="flex flex-wrap gap-1 mt-1">
								<button type="button" class="text-xs px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700" on:click={() => openReassign(t)}>Reassign</button>
								<button type="button" class="text-xs px-1.5 py-0.5 rounded bg-green-100 dark:bg-green-900/40 disabled:opacity-50" disabled={completingTaskId === t.id} on:click={() => handleComplete(t)}>Complete</button>
							</div>
						</li>
					{/each}
				</ul>
			</div>
			<div>
				<div class="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Done</div>
				<ul class="space-y-1 min-h-[60px]">
					{#each board.done as t (t.id)}
						<li class="text-sm p-2 rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 opacity-90">
							<div class="font-medium">{t.title}</div>
						</li>
					{/each}
				</ul>
			</div>
			<div>
				<div class="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Cancelled</div>
				<ul class="space-y-1 min-h-[60px]">
					{#each board.cancelled as t (t.id)}
						<li class="text-sm p-2 rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 opacity-75">
							<div class="font-medium">{t.title}</div>
						</li>
					{/each}
				</ul>
			</div>
		</div>

		{#if assignTask}
			<div class="mt-2 p-2 rounded border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800">
				<p class="text-sm font-medium">Assign task: {assignTask.title}</p>
				<div class="flex gap-2 mt-1">
					<input
						type="text"
						bind:value={assignUserId}
						placeholder="User ID to assign to"
						class="flex-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1 text-sm"
					/>
					<button type="button" class="px-2 py-1 rounded bg-gray-200 dark:bg-gray-600 text-sm" on:click={() => { assignTask = null; assignUserId = ''; }}>Cancel</button>
					<button type="button" class="px-2 py-1 rounded bg-blue-600 text-white text-sm" on:click={handleAssign}>Assign</button>
				</div>
			</div>
		{/if}
		{#if reassignTask}
			<div class="mt-2 p-2 rounded border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800">
				<p class="text-sm font-medium">Reassign task: {reassignTask.title}</p>
				<div class="flex gap-2 mt-1">
					<input
						type="text"
						bind:value={reassignUserId}
						placeholder="User ID to reassign to"
						class="flex-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1 text-sm"
					/>
					<button type="button" class="px-2 py-1 rounded bg-gray-200 dark:bg-gray-600 text-sm" on:click={() => { reassignTask = null; reassignUserId = ''; }}>Cancel</button>
					<button type="button" class="px-2 py-1 rounded bg-blue-600 text-white text-sm" on:click={handleReassign}>Reassign</button>
				</div>
			</div>
		{/if}
	{/if}
</div>
