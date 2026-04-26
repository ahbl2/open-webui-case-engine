<!--
	Left rail: folder navigation for the Files workspace.
-->
<script lang="ts">
	import { toast } from 'svelte-sonner';
	import { listCaseFileFolders, createCaseFileFolder, type CaseFileFolder } from '$lib/apis/caseEngine';
	import { DS_BTN_CLASSES, DS_TYPE_CLASSES } from '$lib/case/detectivePrimitiveFoundation';
	import { FolderIcon, PlusIcon } from 'heroicons-svelte/24/outline';

	export let caseId: string;
	export let token: string;
	/** `null` = all files; `__unfiled__` = no folder; else folder id */
	export let selectedFolderKey: string | null = null;
	/** Parent bumps after uploads / deletes to refresh counts. */
	export let reloadEpoch = 0;
	/** After create/rename flows so sibling surfaces (e.g. file → folder dropdown) refresh without a full page reload. */
	export let onFoldersMutated: (() => void) | undefined = undefined;

	let folders: CaseFileFolder[] = [];
	let unfiledCount = 0;
	let loading = true;
	$: totalFiles = unfiledCount + folders.reduce((s, f) => s + (f.file_count ?? 0), 0);
	let creating = false;
	let newFolderOpen = false;
	let newFolderName = '';
	/** `api` = Case Engine order; `alpha` = A–Z by folder name */
	let folderListSort: 'api' | 'alpha' = 'api';

	$: displayedFolders =
		folderListSort === 'alpha'
			? [...folders].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))
			: folders;

	async function load() {
		if (!caseId || !token) return;
		loading = true;
		try {
			const res = await listCaseFileFolders(caseId, token);
			folders = res.folders;
			unfiledCount = res.unfiled_count;
		} catch (e: unknown) {
			toast.error(e instanceof Error ? e.message : 'Failed to load folders');
			folders = [];
		} finally {
			loading = false;
		}
	}

	$: if (caseId && token) {
		void reloadEpoch;
		void load();
	}

	async function submitNewFolder() {
		const name = newFolderName.trim();
		if (!name || creating) return;
		creating = true;
		try {
			await createCaseFileFolder(caseId, token, { name });
			toast.success('Folder created');
			newFolderName = '';
			newFolderOpen = false;
			await load();
			onFoldersMutated?.();
		} catch (e: unknown) {
			toast.error(e instanceof Error ? e.message : 'Could not create folder');
		} finally {
			creating = false;
		}
	}

	function select(key: string | null) {
		selectedFolderKey = key;
	}
</script>

<aside
	class="flex min-h-0 min-w-0 flex-1 flex-col"
	data-testid="case-files-folder-rail"
>
	<div
		class="flex items-center justify-between gap-2 border-b border-[color:var(--ce-l-border-subtle)] px-2 py-2"
	>
		<p
			class="m-0 px-1 text-[10px] font-semibold uppercase tracking-wide text-[color:var(--ce-l-text-muted)]"
		>
			Folders
		</p>
		<button
			type="button"
			class="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium text-[color:var(--ce-l-text-muted)] hover:bg-black/[0.06] hover:text-[color:var(--ce-l-text-primary)] dark:hover:bg-white/[0.08]"
			data-testid="case-files-folder-sort-toggle"
			title={folderListSort === 'alpha' ? 'Switch to folder creation order' : 'Sort folders A–Z'}
			on:click={() => (folderListSort = folderListSort === 'alpha' ? 'api' : 'alpha')}
		>
			{folderListSort === 'alpha' ? 'API order' : 'A→Z'}
		</button>
	</div>
	<div class="min-h-0 flex-1 overflow-y-auto px-1 py-1">
		{#if loading}
			<p class="m-0 px-2 py-2 text-xs text-[color:var(--ce-l-text-muted)]">Loading…</p>
		{:else}
			<button
				type="button"
				class="flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-xs transition
					{selectedFolderKey === null
					? 'bg-[color:var(--ce-l-surface-elevated)] font-medium text-[color:var(--ce-l-text-primary)]'
					: 'text-[color:var(--ce-l-text-muted)] hover:bg-black/[0.04] dark:hover:bg-white/[0.06]'}"
				data-testid="case-files-folder-all"
				on:click={() => select(null)}
			>
				<span class="flex min-w-0 items-center gap-1.5 truncate">
					<FolderIcon class="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden="true" />
					All files
				</span>
				<span class="shrink-0 tabular-nums text-[10px] text-[color:var(--ce-l-text-muted)]"
					>{totalFiles}</span
				>
			</button>
			<button
				type="button"
				class="flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-xs transition
					{selectedFolderKey === '__unfiled__'
					? 'bg-[color:var(--ce-l-surface-elevated)] font-medium text-[color:var(--ce-l-text-primary)]'
					: 'text-[color:var(--ce-l-text-muted)] hover:bg-black/[0.04] dark:hover:bg-white/[0.06]'}"
				data-testid="case-files-folder-unfiled"
				on:click={() => select('__unfiled__')}
			>
				<span class="min-w-0 truncate">Unfiled</span>
				<span class="shrink-0 tabular-nums text-[10px] text-[color:var(--ce-l-text-muted)]"
					>{unfiledCount}</span
				>
			</button>
			{#each displayedFolders as f (f.id)}
				<button
					type="button"
					class="flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-xs transition
						{selectedFolderKey === f.id
						? 'bg-[color:var(--ce-l-surface-elevated)] font-medium text-[color:var(--ce-l-text-primary)]'
						: 'text-[color:var(--ce-l-text-muted)] hover:bg-black/[0.04] dark:hover:bg-white/[0.06]'}"
					data-testid="case-files-folder-item"
					data-folder-id={f.id}
					on:click={() => select(f.id)}
				>
					<span class="min-w-0 truncate" title={f.name}>{f.name}</span>
					<span class="shrink-0 tabular-nums text-[10px] text-[color:var(--ce-l-text-muted)]"
						>{f.file_count}</span
					>
				</button>
			{/each}
		{/if}
	</div>
	<div class="border-t border-[color:var(--ce-l-border-subtle)] p-2">
		{#if newFolderOpen}
			<form
				class="flex flex-col gap-1"
				on:submit|preventDefault={() => void submitNewFolder()}
			>
				<input
					bind:value={newFolderName}
					placeholder="Folder name"
					class="w-full rounded border border-[color:var(--ce-l-border-strong)] bg-[color:var(--ce-l-surface-elevated)] px-2 py-1 text-xs text-[color:var(--ce-l-text-primary)]"
					maxlength={200}
				/>
				<div class="flex gap-1">
					<button type="submit" class="{DS_BTN_CLASSES.primary} min-h-0 flex-1 py-1 text-xs" disabled={creating}>
						{creating ? '…' : 'Create'}
					</button>
					<button
						type="button"
						class="{DS_BTN_CLASSES.ghost} py-1 text-xs"
						on:click={() => {
							newFolderOpen = false;
							newFolderName = '';
						}}>Cancel</button
					>
				</div>
			</form>
		{:else}
			<button
				type="button"
				class="{DS_BTN_CLASSES.ghost} flex w-full items-center justify-center gap-1 py-1.5 text-xs"
				data-testid="case-files-folder-new-toggle"
				on:click={() => (newFolderOpen = true)}
			>
				<PlusIcon class="h-3.5 w-3.5" aria-hidden="true" />
				New folder
			</button>
		{/if}
	</div>
	<p class="m-0 px-2 pb-2 text-[10px] leading-snug text-[color:var(--ce-l-text-muted)] {DS_TYPE_CLASSES.meta}">
		Drag files into a folder after upload from the list (move) — or upload while a folder is selected.
	</p>
</aside>
