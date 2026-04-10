<script lang="ts">
	import { toast } from 'svelte-sonner';
	import { listWorkflowItems, type WorkflowItem } from '$lib/apis/caseEngine';
	import {
		getStatusBadgeClasses,
		getOriginBadgeClasses,
		getPriorityEmoji,
		formatWorkflowItemTypeForDisplay,
		formatWorkflowStatusForDisplay,
		formatWorkflowOriginForDisplay
	} from '$lib/components/case/workflowStatus';

	export let caseId: string;
	export let token: string;
	export let entityType: string;
	export let normalizedId: string;
	export let isAdmin: boolean = false;
	export let onClose: () => void;

	let items: WorkflowItem[] = [];
	let loading = false;
	let error: string | null = null;
	let includeDeleted = false;
	let lastEntityKey: string | null = null;

	function displayLabel(type: string, id: string): string {
		return `${type ?? ''} – ${id ?? ''}`;
	}

	async function loadItems() {
		if (!caseId || !token || !entityType || !normalizedId) return;
		loading = true;
		error = null;
		try {
			items = await listWorkflowItems(caseId, token, {
				entityType,
				entityNormalizedId: normalizedId,
				includeDeleted: isAdmin && includeDeleted
			});
		} catch (e) {
			error = (e as Error)?.message ?? 'Failed to load workflow items for entity';
			toast.error(error);
			items = [];
		} finally {
			loading = false;
		}
	}

	// Reload when the entity context changes.
	$: {
		const key = entityType && normalizedId ? `${entityType}::${normalizedId}` : null;
		if (key && key !== lastEntityKey) {
			lastEntityKey = key;
			items = [];
			error = null;
			loading = false;
			loadItems();
		}
	}

	// Reload when includeDeleted toggles (admin only).
	$: if (isAdmin && includeDeleted !== undefined) {
		loadItems();
	}

	function handleClose() {
		// Reset state between entity sessions.
		includeDeleted = false;
		items = [];
		error = null;
		lastEntityKey = null;
		onClose();
	}
</script>

<div class="bg-white dark:bg-gray-900 rounded-lg shadow-lg max-w-3xl w-full mx-4 p-4 max-h-[90vh] overflow-auto">
	<div class="flex items-start gap-2 mb-3">
		<div class="flex-1">
			<h3 class="text-sm font-medium">Entity workspace</h3>
			<div class="text-xs text-gray-600 dark:text-gray-400 mt-0.5 break-words">
				{displayLabel(entityType, normalizedId)}
			</div>
			<div class="mt-1 text-xs text-gray-500 dark:text-gray-400">
				Case-scoped view of workflow items related to this entity. Workflow items remain part of the case workflow system.
			</div>
		</div>
		<button
			type="button"
			class="px-2 py-1 text-xs rounded hover:bg-gray-100 dark:hover:bg-gray-800"
			on:click={handleClose}
		>
			Close
		</button>
	</div>

	{#if isAdmin}
		<label class="flex items-center gap-1.5 text-xs mb-2">
			<input type="checkbox" bind:checked={includeDeleted} />
			Include deleted workflow items
		</label>
	{/if}

	{#if loading}
		<div class="text-sm text-gray-500 dark:text-gray-400 py-6">Loading related workflow items…</div>
	{:else if error}
		<div class="text-sm text-red-600 dark:text-red-400 py-6">{error}</div>
	{:else if items.length === 0}
		<div class="text-sm text-gray-500 dark:text-gray-400 py-6">
			<div>No workflow items are currently linked to this entity in this case.</div>
			<div class="mt-1 text-xs">
				You can investigate this entity further by creating hypotheses or gaps in the Workflow tab.
			</div>
		</div>
	{:else}
		<div class="border border-gray-200 dark:border-gray-700 rounded overflow-auto max-h-[60vh]">
			<table class="w-full text-sm">
				<thead class="bg-gray-50 dark:bg-gray-800 sticky top-0">
					<tr>
						<th class="text-left px-2 py-1.5">Type</th>
						<th class="text-left px-2 py-1.5">Title</th>
						<th class="text-left px-2 py-1.5">Status</th>
						<th class="text-left px-2 py-1.5">Priority</th>
						<th class="text-left px-2 py-1.5">Origin</th>
						<th class="text-left px-2 py-1.5">Citations</th>
					</tr>
				</thead>
				<tbody>
					{#each items as item (item.id)}
						<tr
							class="border-t border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 {item.deleted_at
								? 'opacity-70'
								: ''}"
						>
							<td class="px-2 py-1.5">
								<span class="font-medium">{formatWorkflowItemTypeForDisplay(item.type)}</span>
								{#if item.deleted_at}
									<span class="ml-1 text-xs text-amber-600 dark:text-amber-400">(deleted)</span>
								{/if}
							</td>
							<td class="px-2 py-1.5">
								<div class="font-medium">{item.title}</div>
								{#if item.description}
									<div class="text-xs text-gray-500 truncate max-w-xs">{item.description}</div>
								{/if}
							</td>
							<td class="px-2 py-1.5">
								<span
									class={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${getStatusBadgeClasses(
										item.status
									)}`}
								>
									{formatWorkflowStatusForDisplay(item.status)}
								</span>
							</td>
							<td class="px-2 py-1.5">
								{#if item.priority != null}
									<span class="inline-flex items-center gap-1 text-xs">
										{#if getPriorityEmoji(item.priority)}
											<span aria-hidden="true">{getPriorityEmoji(item.priority)}</span>
										{/if}
										<span>Priority {item.priority}</span>
									</span>
								{:else}
									<span class="text-xs text-gray-400">—</span>
								{/if}
							</td>
							<td class="px-2 py-1.5 text-xs">
								<span
									class={`inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium ${getOriginBadgeClasses(
										item.origin
									)}`}
								>
									{formatWorkflowOriginForDisplay(item.origin)}
								</span>
							</td>
							<td class="px-2 py-1.5 text-xs">
								{#if item.citations?.length}
									{item.citations.length} citation(s)
								{:else}
									—
								{/if}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</div>

