<script lang="ts">
	/**
	 * P19-14 — Case Notes Route
	 *
	 * Route-native notes page for the case workspace.
	 * Renders inside the P19-06 case shell layout.
	 *
	 * CRITICAL DOCTRINE:
	 *   - Notebook notes are investigator WORKING DRAFTS. They are NOT official
	 *     case records and must never be confused with the timeline.
	 *   - Notes are owner-scoped: each investigator sees their own notes only.
	 *   - Promoting a note to an official record must go through the proposal
	 *     pipeline (P19-09). There is no direct-write path from notes to the
	 *     official case record. This page does not offer one.
	 *   - Soft deletes only; no hard delete behavior introduced.
	 *
	 * Backend endpoints used:
	 *   GET    /cases/:id/notebook            — list notes (owner-scoped)
	 *   POST   /cases/:id/notebook            — create note
	 *   POST   /cases/:id/notebook/:noteId/versions — update note (versioned)
	 *   DELETE /cases/:id/notebook/:noteId    — soft delete
	 */
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { toast } from 'svelte-sonner';
	import { caseEngineToken } from '$lib/stores';
	import {
		listCaseNotebookNotes,
		createCaseNotebookNote,
		updateCaseNotebookNote,
		deleteCaseNotebookNote,
		type NotebookNote
	} from '$lib/apis/caseEngine';

	const caseId = $page.params.id;

	let notes: NotebookNote[] = [];
	let loading = true;
	let loadError = '';

	// Create form state
	let showCreateForm = false;
	let createTitle = '';
	let createText = '';
	let creating = false;

	// Edit state — one note can be in edit mode at a time
	let editingId: number | null = null;
	let editTitle = '';
	let editText = '';
	let saving = false;

	// Delete confirmation
	let deletingId: number | null = null;

	async function loadNotes(): Promise<void> {
		if (!$caseEngineToken) {
			loading = false;
			loadError = 'Case Engine session not active.';
			return;
		}
		loading = true;
		loadError = '';
		try {
			notes = await listCaseNotebookNotes(caseId, $caseEngineToken);
		} catch (e: unknown) {
			loadError = e instanceof Error ? e.message : 'Failed to load notes';
		} finally {
			loading = false;
		}
	}

	onMount(() => { loadNotes(); });

	async function handleCreate(): Promise<void> {
		if (!$caseEngineToken) return;
		const text = createText.trim();
		if (!text) { toast.error('Note text is required'); return; }
		creating = true;
		try {
			const note = await createCaseNotebookNote(
				caseId,
				{ title: createTitle.trim() || null, text },
				$caseEngineToken
			);
			notes = [note, ...notes];
			createTitle = '';
			createText = '';
			showCreateForm = false;
			toast.success('Note created');
		} catch (e: unknown) {
			toast.error(e instanceof Error ? e.message : 'Failed to create note');
		} finally {
			creating = false;
		}
	}

	function startEdit(note: NotebookNote): void {
		editingId = note.id;
		editTitle = note.title ?? '';
		editText = note.current_text;
	}

	function cancelEdit(): void {
		editingId = null;
		editTitle = '';
		editText = '';
	}

	async function handleSave(note: NotebookNote): Promise<void> {
		if (!$caseEngineToken) return;
		const text = editText.trim();
		if (!text) { toast.error('Note text is required'); return; }
		saving = true;
		try {
			const updated = await updateCaseNotebookNote(
				caseId,
				note.id,
				{ title: editTitle.trim() || null, text },
				$caseEngineToken
			);
			notes = notes.map((n) => (n.id === updated.id ? updated : n));
			cancelEdit();
			toast.success('Note saved');
		} catch (e: unknown) {
			toast.error(e instanceof Error ? e.message : 'Failed to save note');
		} finally {
			saving = false;
		}
	}

	async function handleDelete(note: NotebookNote): Promise<void> {
		if (!$caseEngineToken) return;
		deletingId = note.id;
		try {
			await deleteCaseNotebookNote(caseId, note.id, $caseEngineToken);
			notes = notes.filter((n) => n.id !== note.id);
			toast.success('Note deleted');
		} catch (e: unknown) {
			toast.error(e instanceof Error ? e.message : 'Failed to delete note');
		} finally {
			deletingId = null;
		}
	}

	function formatDate(iso: string): string {
		try {
			return new Date(iso).toLocaleString(undefined, {
				month: 'short', day: 'numeric', year: 'numeric',
				hour: '2-digit', minute: '2-digit'
			});
		} catch {
			return iso;
		}
	}
</script>

<!--
	Case Notes — Working Drafts
	These are investigator-private working notes, not official case records.
	This page renders inside the P19-06 case shell (+layout.svelte).
-->
<div
	class="flex flex-col h-full overflow-y-auto"
	data-testid="case-notes-page"
>
	<!-- Section header -->
	<div
		class="shrink-0 flex items-center justify-between gap-2 px-4 pt-4 pb-2 border-b border-gray-100 dark:border-gray-800"
	>
		<div class="flex items-center gap-2 min-w-0">
			<h2 class="text-sm font-semibold text-gray-700 dark:text-gray-200">Case Notes</h2>
			<!-- Explicit working-draft disclaimer — always visible -->
			<span
				class="shrink-0 text-xs font-medium px-1.5 py-0.5 rounded
				       bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400"
				title="These are private working drafts, not official case records"
			>Working drafts</span>
		</div>
		<button
			type="button"
			class="shrink-0 text-xs font-medium px-2.5 py-1 rounded
			       bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-900
			       hover:bg-gray-700 dark:hover:bg-gray-300 transition"
			on:click={() => { showCreateForm = !showCreateForm; }}
			data-testid="case-notes-new-btn"
		>
			{showCreateForm ? 'Cancel' : '+ New note'}
		</button>
	</div>

	<!-- Doctrine banner — clearly visible, not dismissible -->
	<div
		class="shrink-0 mx-4 mt-3 px-3 py-2 rounded-md text-xs
		       bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400
		       border border-amber-200 dark:border-amber-800"
		data-testid="case-notes-disclaimer"
		role="note"
	>
		<strong>Working drafts only.</strong> These notes are not official case records.
		To add information to the official case record, use the proposal pipeline from the Chat tab.
	</div>

	<!-- Create form (shown on demand) -->
	{#if showCreateForm}
		<form
			class="shrink-0 mx-4 mt-3 flex flex-col gap-2 p-3 rounded-md border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50"
			on:submit|preventDefault={handleCreate}
			data-testid="case-notes-create-form"
		>
			<input
				type="text"
				bind:value={createTitle}
				placeholder="Title (optional)"
				class="rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800
				       px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
			/>
			<textarea
				bind:value={createText}
				placeholder="Note text (required)"
				rows="4"
				class="rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800
				       px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 resize-y"
				required
			></textarea>
			<div class="flex items-center gap-2">
				<button
					type="submit"
					disabled={creating}
					class="px-3 py-1.5 rounded text-xs font-medium
					       bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-900
					       hover:bg-gray-700 dark:hover:bg-gray-300 disabled:opacity-50"
				>
					{creating ? 'Saving…' : 'Save note'}
				</button>
				<button
					type="button"
					class="px-3 py-1.5 rounded text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
					on:click={() => { showCreateForm = false; createTitle = ''; createText = ''; }}
				>
					Cancel
				</button>
			</div>
		</form>
	{/if}

	<!-- Notes list -->
	<div class="flex-1 px-4 pt-3 pb-4 min-h-0">
		{#if loading}
			<div class="flex items-center justify-center h-24">
				<p class="text-sm text-gray-400 dark:text-gray-500" data-testid="case-notes-loading">
					Loading notes…
				</p>
			</div>
		{:else if loadError}
			<div class="flex items-center justify-center h-24">
				<p class="text-sm text-red-500 dark:text-red-400">{loadError}</p>
			</div>
		{:else if notes.length === 0}
			<div
				class="flex flex-col items-center justify-center h-32 gap-1"
				data-testid="case-notes-empty"
			>
				<p class="text-sm text-gray-400 dark:text-gray-500">No working notes yet.</p>
				<p class="text-xs text-gray-300 dark:text-gray-600">
					Use "+ New note" to start a private working draft.
				</p>
			</div>
		{:else}
			<div class="flex flex-col gap-3" data-testid="case-notes-list">
				{#each notes as note (note.id)}
					<div
						class="flex flex-col gap-1.5 rounded-md border border-gray-200 dark:border-gray-700
						       p-3 bg-white dark:bg-gray-900"
						data-testid="case-note-item"
						data-note-id={note.id}
					>
						{#if editingId === note.id}
							<!-- Edit form -->
							<form
								class="flex flex-col gap-2"
								on:submit|preventDefault={() => handleSave(note)}
							>
								<input
									type="text"
									bind:value={editTitle}
									placeholder="Title (optional)"
									class="rounded border border-gray-200 dark:border-gray-700 bg-transparent
									       px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
								/>
								<textarea
									bind:value={editText}
									rows="4"
									class="rounded border border-gray-200 dark:border-gray-700 bg-transparent
									       px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 resize-y"
									required
								></textarea>
								<div class="flex items-center gap-2">
									<button
										type="submit"
										disabled={saving}
										class="px-2.5 py-1 rounded text-xs font-medium
										       bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-900
										       hover:bg-gray-700 dark:hover:bg-gray-300 disabled:opacity-50"
									>
										{saving ? 'Saving…' : 'Save'}
									</button>
									<button
										type="button"
										class="px-2.5 py-1 rounded text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
										on:click={cancelEdit}
									>
										Cancel
									</button>
								</div>
							</form>
						{:else}
							<!-- View mode -->
							{#if note.title}
								<p class="text-sm font-medium text-gray-800 dark:text-gray-200">{note.title}</p>
							{/if}
							<p class="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{note.current_text}</p>
							<div class="flex items-center justify-between gap-2 mt-1">
								<span class="text-xs text-gray-400 dark:text-gray-500">
									{note.updated_at !== note.created_at ? 'Updated' : 'Created'}
									{formatDate(note.updated_at)}
								</span>
								<div class="flex items-center gap-2">
									<button
										type="button"
										class="text-xs text-blue-600 dark:text-blue-400 hover:underline"
										on:click={() => startEdit(note)}
									>
										Edit
									</button>
									<button
										type="button"
										class="text-xs text-red-500 dark:text-red-400 hover:underline disabled:opacity-50"
										disabled={deletingId === note.id}
										on:click={() => handleDelete(note)}
									>
										{deletingId === note.id ? 'Deleting…' : 'Delete'}
									</button>
								</div>
							</div>
						{/if}
					</div>
				{/each}
			</div>
		{/if}
	</div>
</div>
