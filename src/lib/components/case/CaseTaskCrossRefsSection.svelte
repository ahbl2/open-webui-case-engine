<script lang="ts">
	/**
	 * P92-05 / P92-06: Same-case note / file pointers — navigation only; not Timeline; entity types fixed (note | file).
	 */
	import { get } from 'svelte/store';
	import { goto } from '$app/navigation';
	import { caseEngineToken } from '$lib/stores';
	import * as caseTasksApi from '$lib/apis/caseEngine/caseTasksApi';
	import type { CaseTask } from '$lib/case/caseTaskModel';
	import { DS_BTN_CLASSES, DS_TYPE_CLASSES } from '$lib/case/detectivePrimitiveFoundation';

	export let caseId: string;
	export let task: CaseTask;
	/** When true, hide add/remove (e.g. soft-deleted task). */
	export let linksReadOnly: boolean = false;
	export let onRefresh: () => void;

	let addType: 'note' | 'file' = 'note';
	let addIdRaw = '';
	let localBusy = false;
	let localError: string | null = null;

	function openNote(id: string): void {
		void goto(`/case/${caseId}/notes?note=${encodeURIComponent(id)}`);
	}

	function openFile(id: string): void {
		void goto(`/case/${caseId}/files?file=${encodeURIComponent(id)}`);
	}

	async function addLink(): Promise<void> {
		const tok = get(caseEngineToken);
		if (!tok || !caseId) return;
		const linked_entity_id = addIdRaw.trim();
		if (!linked_entity_id) return;
		localBusy = true;
		localError = null;
		try {
			await caseTasksApi.postCaseTaskCrossRef(caseId, task.id, tok, {
				linked_entity_type: addType,
				linked_entity_id
			});
			addIdRaw = '';
			onRefresh();
		} catch (e) {
			localError = e instanceof Error ? e.message : 'Failed to add link';
		} finally {
			localBusy = false;
		}
	}

	async function removeLink(refId: string): Promise<void> {
		const tok = get(caseEngineToken);
		if (!tok || !caseId) return;
		localBusy = true;
		localError = null;
		try {
			await caseTasksApi.postCaseTaskCrossRefRemove(caseId, task.id, refId, tok);
			onRefresh();
		} catch (e) {
			localError = e instanceof Error ? e.message : 'Failed to remove link';
		} finally {
			localBusy = false;
		}
	}
</script>

<div
	class="pt-2 border-t border-dashed border-[color:var(--ce-l-chrome-border)]"
	data-testid="case-tasks-cross-refs"
>
	<p
		class="{DS_TYPE_CLASSES.meta} m-0 text-[10px] uppercase tracking-wide text-[color:var(--ce-l-text-muted)]"
	>
		Linked records (navigation)
	</p>
	<p class="{DS_TYPE_CLASSES.meta} m-0 mt-0.5 text-[10px] text-[color:var(--ce-l-text-muted)]">
		Same-case notes and files — open only; not Timeline.
	</p>
	{#if localError}
		<p class="{DS_TYPE_CLASSES.meta} m-0 mt-1 text-xs text-red-700" role="alert">{localError}</p>
	{/if}
	{#if task.crossRefs.length === 0 && linksReadOnly}
		<p class="{DS_TYPE_CLASSES.meta} m-0 mt-1 text-xs text-[color:var(--ce-l-text-muted)]">None</p>
	{:else}
		<ul class="mt-0.5 list-none m-0 p-0 flex flex-col gap-1">
			{#each task.crossRefs as ref (ref.id)}
				<li class="flex flex-wrap items-center gap-2 text-xs">
					<span class="text-[color:var(--ce-l-text-secondary)]">
						{ref.linkedEntityType === 'note' ? 'Linked note' : 'Linked file'}:
						<span class="font-medium text-[color:var(--ce-l-text-primary)]"
							>{ref.displayLabel ?? ref.linkedEntityId}</span
						>
						{#if ref.targetStatus === 'unavailable'}
							<span class="text-[color:var(--ce-l-text-muted)]">(unavailable)</span>
						{/if}
					</span>
					<button
						type="button"
						class="{DS_BTN_CLASSES.secondary} text-xs shrink-0"
						disabled={localBusy || ref.targetStatus === 'unavailable'}
						data-testid="case-tasks-cross-ref-open"
						data-cross-ref-type={ref.linkedEntityType}
						data-cross-ref-id={ref.linkedEntityId}
						on:click={() =>
							ref.linkedEntityType === 'note'
								? openNote(ref.linkedEntityId)
								: openFile(ref.linkedEntityId)}
					>
						Open
					</button>
					{#if !linksReadOnly}
						<button
							type="button"
							class="{DS_BTN_CLASSES.ghost} text-xs text-red-700 shrink-0"
							disabled={localBusy}
							data-testid="case-tasks-cross-ref-remove"
							data-cross-ref-ref-id={ref.id}
							on:click={() => void removeLink(ref.id)}
						>
							Remove link
						</button>
					{/if}
				</li>
			{/each}
		</ul>
	{/if}
	{#if !linksReadOnly}
		<div class="mt-2 flex flex-wrap items-end gap-2">
			<label class="flex flex-col gap-0.5">
				<span class="{DS_TYPE_CLASSES.label} text-[10px] text-[color:var(--ce-l-text-muted)]">Type</span>
				<select
					class="rounded border px-1.5 py-1 text-xs"
					bind:value={addType}
					aria-label="Link type"
					data-testid="case-tasks-cross-ref-add-type"
				>
					<option value="note">Note</option>
					<option value="file">File</option>
				</select>
			</label>
			<label class="flex flex-col gap-0.5 flex-1 min-w-[8rem]">
				<span class="{DS_TYPE_CLASSES.label} text-[10px] text-[color:var(--ce-l-text-muted)]">Id</span>
				<input
					bind:value={addIdRaw}
					class="rounded border px-1.5 py-1 text-xs w-full font-mono"
					placeholder={addType === 'note' ? 'Note id (number)' : 'File id'}
					autocomplete="off"
					data-testid="case-tasks-cross-ref-add-id"
				/>
			</label>
			<button
				type="button"
				class="{DS_BTN_CLASSES.secondary} text-xs"
				disabled={localBusy}
				data-testid="case-tasks-cross-ref-add-submit"
				on:click={() => void addLink()}
			>
				Add link
			</button>
		</div>
	{/if}
</div>
