<script lang="ts">
	import { toast } from 'svelte-sonner';
	import {
		listCaseFiles,
		uploadCaseFile,
		downloadCaseFile,
		extractCaseFileText,
		getCaseFileText,
		addFileTag,
		removeFileTag,
		type CaseFile
	} from '$lib/apis/caseEngine';

	export let caseId: string;
	export let token: string;

	let files: CaseFile[] = [];
	let loading = true;
	let uploading = false;
	let extractingId: string | null = null;
	let viewTextFileId: string | null = null;
	let viewTextContent: string | null = null;
	let viewTextLoading = false;
	let fileInput: HTMLInputElement;
	let addingTagFileId: string | null = null;
	let newTagInput = '';

	async function loadFiles() {
		loading = true;
		try {
			files = await listCaseFiles(caseId, token);
		} catch (e: any) {
			toast.error(e?.message ?? 'Failed to load files');
			files = [];
		} finally {
			loading = false;
		}
	}

	loadFiles();

	async function handleUpload() {
		const input = fileInput;
		if (!input?.files?.length) {
			toast.error('Select a file first');
			return;
		}
		uploading = true;
		try {
			await uploadCaseFile(caseId, input.files[0], token);
			toast.success('File uploaded');
			input.value = '';
			await loadFiles();
		} catch (e: any) {
			toast.error(e?.message ?? 'Upload failed');
		} finally {
			uploading = false;
		}
	}

	async function handleExtract(f: CaseFile) {
		extractingId = f.id;
		try {
			await extractCaseFileText(f.id, token);
			toast.success('Text extracted');
			viewTextFileId = f.id;
			viewTextContent = null;
		} catch (e: any) {
			toast.error(e?.message ?? 'Extract failed');
		} finally {
			extractingId = null;
		}
	}

	async function handleViewText(f: CaseFile) {
		viewTextFileId = f.id;
		viewTextContent = null;
		viewTextLoading = true;
		try {
			const data = await getCaseFileText(f.id, token);
			viewTextContent = data.extracted_text ?? '(No text)';
			if (data.status !== 'EXTRACTED' && data.message) {
				viewTextContent = `[${data.status}] ${data.message}\n\n${viewTextContent}`;
			}
		} catch (e: any) {
			viewTextContent = `Error: ${e?.message ?? 'Failed to load'}`;
		} finally {
			viewTextLoading = false;
		}
	}

	function closeViewText() {
		viewTextFileId = null;
		viewTextContent = null;
	}

	async function handleDownload(f: CaseFile) {
		try {
			await downloadCaseFile(f.id, f.original_filename || 'download', token);
		} catch (e: any) {
			toast.error(e?.message ?? 'Download failed');
		}
	}

	// Ticket 25: Evidence tags
	function startAddTag(f: CaseFile) {
		addingTagFileId = f.id;
		newTagInput = '';
	}

	function cancelAddTag() {
		addingTagFileId = null;
		newTagInput = '';
	}

	async function submitAddTag(f: CaseFile) {
		const t = newTagInput.trim().toLowerCase().replace(/\s+/g, ' ');
		if (!t) return;
		try {
			await addFileTag(caseId, f.id, t, token);
			toast.success('Tag added');
			f.tags = [...(f.tags ?? []), t];
			cancelAddTag();
		} catch (e: any) {
			toast.error(e?.message ?? 'Add tag failed');
		}
	}

	async function handleRemoveTag(f: CaseFile, tag: string) {
		try {
			await removeFileTag(caseId, f.id, tag, token);
			f.tags = (f.tags ?? []).filter((x) => x !== tag);
		} catch (e: any) {
			toast.error(e?.message ?? 'Remove tag failed');
		}
	}
</script>

<div class="flex flex-col gap-4 p-4">
	<!-- Upload form -->
	<form
		class="flex flex-col gap-2 sm:flex-row sm:items-center"
		on:submit|preventDefault={() => handleUpload()}
	>
		<input
			type="file"
			bind:this={fileInput}
			class="flex-1 rounded border border-gray-200 dark:border-gray-700 bg-transparent px-2 py-1.5 text-sm file:mr-2 file:rounded file:border-0 file:bg-gray-100 dark:file:bg-gray-700 file:px-3 file:py-1 file:text-sm"
		/>
		<button
			type="submit"
			disabled={uploading}
			class="rounded bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-900 px-3 py-1.5 text-sm font-medium hover:bg-gray-700 dark:hover:bg-gray-300 disabled:opacity-50"
		>
			{uploading ? 'Uploading...' : 'Upload'}
		</button>
	</form>

	<!-- Files list -->
	{#if loading}
		<div class="text-sm text-gray-500">Loading files...</div>
	{:else if files.length === 0}
		<div class="text-sm text-gray-500">No files yet. Upload a file above.</div>
	{:else}
		<div class="flex flex-col gap-2">
			{#each files as f (f.id)}
				<div
					class="flex flex-col gap-1 rounded border border-gray-200 dark:border-gray-700 p-2 text-sm"
				>
					<div class="flex flex-wrap items-center gap-2">
						<span class="font-medium truncate flex-1 min-w-0">{f.original_filename}</span>
						<span class="text-gray-500 text-xs shrink-0"
							>{f.file_size_bytes != null ? `${Math.round(f.file_size_bytes / 1024)} KB` : ''}</span
						>
						<button
						type="button"
						class="text-blue-600 dark:text-blue-400 hover:underline text-xs"
						on:click={() => handleDownload(f)}
					>
						Download
					</button>
					<button
						type="button"
						class="text-blue-600 dark:text-blue-400 hover:underline text-xs disabled:opacity-50"
						disabled={extractingId === f.id}
						on:click={() => handleExtract(f)}
					>
						{extractingId === f.id ? 'Extracting...' : 'Extract text'}
					</button>
					<button
						type="button"
						class="text-blue-600 dark:text-blue-400 hover:underline text-xs"
						on:click={() => handleViewText(f)}
					>
						View extracted text
					</button>
					</div>
					<!-- Ticket 25: Tags -->
					{#if (f.tags?.length ?? 0) > 0 || addingTagFileId === f.id}
						<div class="flex flex-wrap items-center gap-1">
							{#each f.tags ?? [] as tag (tag)}
								<span
									class="inline-flex items-center gap-0.5 rounded-full bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 text-xs"
								>
									{tag}
									<button
										type="button"
										class="hover:bg-gray-300 dark:hover:bg-gray-600 rounded p-0.5"
										on:click={() => handleRemoveTag(f, tag)}
										aria-label="Remove tag"
									>×</button>
								</span>
							{/each}
							{#if addingTagFileId === f.id}
								<form
									class="inline-flex items-center gap-1"
									on:submit|preventDefault={() => submitAddTag(f)}
								>
									<input
										type="text"
										bind:value={newTagInput}
										placeholder="Add tag"
										class="rounded border border-gray-300 dark:border-gray-600 bg-transparent px-1.5 py-0.5 text-xs w-24"
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
									on:click={() => startAddTag(f)}
								>
									+ Add tag
								</button>
							{/if}
						</div>
					{:else}
						<button
							type="button"
							class="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 text-xs self-start"
							on:click={() => startAddTag(f)}
						>
							+ Add tag
						</button>
					{/if}
				</div>
			{/each}
		</div>
	{/if}
</div>

<!-- View extracted text modal -->
{#if viewTextFileId}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
		role="dialog"
		aria-modal="true"
		on:click={(e) => e.target === e.currentTarget && closeViewText()}
		on:keydown={(e) => e.key === 'Escape' && closeViewText()}
		tabindex="-1"
	>
		<div
			class="max-w-2xl w-full max-h-[80vh] flex flex-col rounded-lg bg-white dark:bg-gray-850 shadow-xl mx-4"
			on:click|stopPropagation
		>
			<div class="flex items-center justify-between px-4 py-2 border-b border-gray-200 dark:border-gray-700">
				<h3 class="font-medium">Extracted text</h3>
				<button
					type="button"
					class="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
					on:click={closeViewText}
					aria-label="Close"
				>
					<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="size-5">
						<path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
					</svg>
				</button>
			</div>
			<div class="flex-1 overflow-auto p-4">
				{#if viewTextLoading}
					<div class="text-gray-500">Loading...</div>
				{:else if viewTextContent !== null}
					<pre class="whitespace-pre-wrap text-sm font-sans">{viewTextContent}</pre>
				{/if}
			</div>
		</div>
	</div>
{/if}
