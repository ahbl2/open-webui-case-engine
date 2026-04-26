<!--
	Left rail: tag shortcuts (counts from files in the current folder scope).
-->
<script lang="ts">
	import { listCaseFiles, type CaseFile } from '$lib/apis/caseEngine';
	import { DS_BTN_CLASSES, DS_TYPE_CLASSES } from '$lib/case/detectivePrimitiveFoundation';
	import { TagIcon, PlusIcon } from 'heroicons-svelte/24/outline';
	import { aggregateTagCountsFromFiles } from './caseFilesTagAggregates';

	export let caseId: string;
	export let token: string;
	/** Align with folder rail: null = all, __unfiled__, or folder id */
	export let folderFilter: string | null = null;
	export let reloadEpoch = 0;
	/** `null` = all tags; else filter list to files containing this tag */
	export let selectedTagKey: string | null = null;

	let loading = true;
	let tagRows: { tag: string; count: number }[] = [];

	function listOpts(): { query?: string; mimeCategory?: never; hasTags?: boolean; folderId?: string } {
		const o: { folderId?: string } = {};
		if (folderFilter === '__unfiled__') {
			o.folderId = '__unfiled__';
		} else if (folderFilter && folderFilter.length > 0) {
			o.folderId = folderFilter;
		}
		return o;
	}

	async function load() {
		if (!caseId || !token) return;
		loading = true;
		try {
			const files: CaseFile[] = await listCaseFiles(caseId, token, listOpts());
			tagRows = aggregateTagCountsFromFiles(files);
		} catch {
			tagRows = [];
		} finally {
			loading = false;
		}
	}

	$: if (caseId && token) {
		void reloadEpoch;
		void folderFilter;
		void load();
	}

	function selectAll() {
		selectedTagKey = null;
	}

	function selectTag(tag: string) {
		selectedTagKey = tag;
	}

	let addTagOpen = false;
	let addTagDraft = '';

	function applyCustomTagFilter(): void {
		const t = addTagDraft.trim();
		selectedTagKey = t.length > 0 ? t : null;
		addTagOpen = false;
		addTagDraft = '';
	}
</script>

<aside
	class="flex min-h-0 min-w-0 flex-1 flex-col border-t border-[color:var(--ce-l-border-subtle)]"
	data-testid="case-files-tags-rail"
>
	<div class="border-b border-[color:var(--ce-l-border-subtle)] px-2 py-2">
		<p
			class="m-0 px-1 text-[10px] font-semibold uppercase tracking-wide text-[color:var(--ce-l-text-muted)]"
		>
			Tags
		</p>
	</div>
	<div class="min-h-0 flex-1 overflow-y-auto px-1 py-1">
		{#if loading}
			<p class="m-0 px-2 py-2 text-xs text-[color:var(--ce-l-text-muted)]">Loading…</p>
		{:else}
			<button
				type="button"
				class="flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-xs transition
					{selectedTagKey === null
					? 'bg-[color:var(--ce-l-surface-elevated)] font-medium text-[color:var(--ce-l-text-primary)]'
					: 'text-[color:var(--ce-l-text-muted)] hover:bg-black/[0.04] dark:hover:bg-white/[0.06]'}"
				data-testid="case-files-tags-all"
				on:click={selectAll}
			>
				<span class="flex min-w-0 items-center gap-1.5 truncate">
					<TagIcon class="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden="true" />
					All tags
				</span>
			</button>
			{#if selectedTagKey && !tagRows.some((r) => r.tag === selectedTagKey)}
				<button
					type="button"
					class="flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-xs transition bg-[color:var(--ce-l-surface-elevated)] font-medium text-[color:var(--ce-l-text-primary)]"
					data-testid="case-files-tags-custom"
					on:click={() => selectTag(selectedTagKey)}
				>
					<span class="min-w-0 truncate">{selectedTagKey}</span>
					<span class="shrink-0 text-[10px] text-[color:var(--ce-l-text-muted)]">Custom</span>
				</button>
			{/if}
			{#each tagRows as row (row.tag)}
				<button
					type="button"
					class="flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-xs transition
						{selectedTagKey === row.tag
						? 'bg-[color:var(--ce-l-surface-elevated)] font-medium text-[color:var(--ce-l-text-primary)]'
						: 'text-[color:var(--ce-l-text-muted)] hover:bg-black/[0.04] dark:hover:bg-white/[0.06]'}"
					data-testid="case-files-tags-item"
					on:click={() => selectTag(row.tag)}
				>
					<span class="min-w-0 truncate">{row.tag}</span>
					<span class="shrink-0 tabular-nums text-[10px] text-[color:var(--ce-l-text-muted)]"
						>{row.count}</span
					>
				</button>
			{/each}
			{#if tagRows.length === 0}
				<p class="m-0 px-2 py-2 text-[11px] leading-snug text-[color:var(--ce-l-text-muted)] {DS_TYPE_CLASSES.meta}">
					No tags in this scope yet.
				</p>
			{/if}
		{/if}
	</div>
	<div class="border-t border-[color:var(--ce-l-border-subtle)] p-2">
		{#if addTagOpen}
			<form
				class="flex flex-col gap-1.5"
				on:submit|preventDefault={applyCustomTagFilter}
				data-testid="case-files-tags-add-form"
			>
				<input
					bind:value={addTagDraft}
					placeholder="Filter by tag name"
					class="w-full rounded border border-[color:var(--ce-l-border-strong)] bg-[color:var(--ce-l-surface-elevated)] px-2 py-1 text-xs text-[color:var(--ce-l-text-primary)]"
					aria-label="Tag name to filter"
				/>
				<div class="flex gap-1">
					<button type="submit" class="{DS_BTN_CLASSES.primary} min-h-0 flex-1 py-1 text-xs">Apply</button>
					<button
						type="button"
						class="{DS_BTN_CLASSES.ghost} min-h-0 py-1 text-xs"
						on:click={() => {
							addTagOpen = false;
							addTagDraft = '';
						}}>Cancel</button
					>
				</div>
			</form>
		{:else}
			<button
				type="button"
				class="{DS_BTN_CLASSES.ghost} flex w-full items-center justify-center gap-1 py-1.5 text-xs"
				data-testid="case-files-tags-add-toggle"
				on:click={() => (addTagOpen = true)}
			>
				<PlusIcon class="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
				Add tag
			</button>
		{/if}
	</div>
</aside>
