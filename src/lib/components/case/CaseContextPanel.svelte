<script lang="ts">
	/** Ticket 7: Minimal display of recent entries when a case is active */
	/** Ticket 25: Tag chips and add/remove */
	import { toast } from 'svelte-sonner';
	import { caseContext, caseEngineToken } from '$lib/stores';
	import { getCaseContext, addEntryTag, removeEntryTag } from '$lib/apis/caseEngine';

	let addingTagEntryId: string | null = null;
	let newTagInput = '';

	async function refreshContext() {
		const ctx = $caseContext;
		const token = $caseEngineToken;
		if (!ctx?.case?.id || !token) return;
		try {
			const fresh = await getCaseContext(ctx.case.id, token);
			caseContext.set(fresh);
		} catch {}
	}

	function startAddTag(entryId: string) {
		addingTagEntryId = entryId;
		newTagInput = '';
	}

	function cancelAddTag() {
		addingTagEntryId = null;
		newTagInput = '';
	}

	async function submitAddTag(entryId: string) {
		const t = newTagInput.trim().toLowerCase().replace(/\s+/g, ' ');
		if (!t) return;
		const ctx = $caseContext;
		const token = $caseEngineToken;
		if (!ctx?.case?.id || !token) return;
		try {
			await addEntryTag(ctx.case.id, entryId, t, token);
			toast.success('Tag added');
			await refreshContext();
			cancelAddTag();
		} catch (e: any) {
			toast.error(e?.message ?? 'Add tag failed');
		}
	}

	async function handleRemoveTag(entryId: string, tag: string) {
		const ctx = $caseContext;
		const token = $caseEngineToken;
		if (!ctx?.case?.id || !token) return;
		try {
			await removeEntryTag(ctx.case.id, entryId, tag, token);
			await refreshContext();
		} catch (e: any) {
			toast.error(e?.message ?? 'Remove tag failed');
		}
	}
</script>

{#if $caseContext && $caseContext.recent_entries.length > 0}
	<div class="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-850/50 px-4 py-2">
		<div class="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
			{$caseContext.case.case_number} – Recent entries
		</div>
		<div class="max-h-48 overflow-y-auto space-y-1">
			{#each $caseContext.recent_entries as e (e.id)}
				<div class="text-xs">
					<span class="text-gray-500 dark:text-gray-500">{e.occurred_at} · {e.type}</span>
					<span class="block truncate text-gray-700 dark:text-gray-300">{e.text_original}</span>
					{#if (e.tags?.length ?? 0) > 0 || addingTagEntryId === e.id}
						<div class="flex flex-wrap items-center gap-1 mt-0.5">
							{#each e.tags ?? [] as tag (tag)}
								<span
									class="inline-flex items-center gap-0.5 rounded-full bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 text-xs"
								>
									{tag}
									<button
										type="button"
										class="hover:bg-gray-300 dark:hover:bg-gray-600 rounded p-0.5"
										on:click={() => handleRemoveTag(e.id, tag)}
										aria-label="Remove tag"
									>×</button>
								</span>
							{/each}
							{#if addingTagEntryId === e.id}
								<form
									class="inline-flex items-center gap-1"
									on:submit|preventDefault={() => submitAddTag(e.id)}
								>
									<input
										type="text"
										bind:value={newTagInput}
										placeholder="Add tag"
										class="rounded border border-gray-300 dark:border-gray-600 bg-transparent px-1.5 py-0.5 text-xs w-20"
										on:blur={() => newTagInput || cancelAddTag()}
										on:keydown={(e) => e.key === 'Escape' && cancelAddTag()}
									/>
									<button type="submit" class="text-blue-600 dark:text-blue-400 text-xs">Add</button>
									<button type="button" class="text-gray-500 text-xs" on:click={cancelAddTag}>Cancel</button>
								</form>
							{:else}
								<button
									type="button"
									class="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 text-xs"
									on:click={() => startAddTag(e.id)}
								>
									+ tag
								</button>
							{/if}
						</div>
					{:else}
						<button
							type="button"
							class="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 text-xs mt-0.5"
							on:click={() => startAddTag(e.id)}
						>
							+ tag
						</button>
					{/if}
				</div>
			{/each}
		</div>
	</div>
{/if}
