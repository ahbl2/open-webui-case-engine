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
		proposeTimelineEntriesFromCaseFile,
		type CaseFile
	} from '$lib/apis/caseEngine';
	import CaseLoadingState from '$lib/components/case/CaseLoadingState.svelte';
	import CaseEmptyState from '$lib/components/case/CaseEmptyState.svelte';
	import CaseErrorState from '$lib/components/case/CaseErrorState.svelte';
	import { dataTransferHasFiles } from '$lib/components/case/caseFilesDrop';
	import {
		CASE_FILES_SUPPORTED_EXTRACT_TYPES_LABEL,
		caseFileExtLabel,
		isCaseFileLikelyExtractable
	} from '$lib/components/case/caseFilesExtractSupport';

	export let caseId: string;
	export let token: string;

	let files: CaseFile[] = [];
	let loading = true;
	let loadError = '';
	let uploading = false;
	let extractingId: string | null = null;
	let viewTextFileId: string | null = null;
	let viewTextContent: string | null = null;
	let viewTextLoading = false;
	let fileInput: HTMLInputElement;
	let addingTagFileId: string | null = null;
	let newTagInput = '';
	let proposingFileId: string | null = null;
	let bulkConfirmFile: CaseFile | null = null;
	let bulkConfirmCount = 0;
	let bulkConfirmThreshold = 0;

	/** P38-04: nested dragenter/dragleave depth so highlight survives child boundaries */
	let fileDragDepth = 0;

	// ── Route-reuse case-switch guard (P28-45) ─────────────────────────────────
	// Seeded to the initial prop value so the reactive block is a no-op on first
	// render (the top-level loadFiles() handles initial load). Fires when the
	// parent passes a new caseId during SvelteKit route reuse.
	let prevLoadedCaseId: string = caseId;
	/** Incremented on each load; guards stale responses from writing to the wrong case. */
	let activeLoadId = 0;

	$: if (caseId && token && caseId !== prevLoadedCaseId) {
		prevLoadedCaseId = caseId;
		files = [];
		loadError = '';
		viewTextFileId = null;
		viewTextContent = null;
		uploading = false;
		extractingId = null;
		addingTagFileId = null;
		newTagInput = '';
		proposingFileId = null;
		bulkConfirmFile = null;
		fileDragDepth = 0;
		loadFiles();
	}

	async function loadFiles() {
		activeLoadId += 1;
		const loadId = activeLoadId;
		loading = true;
		loadError = '';
		try {
			const result = await listCaseFiles(caseId, token);
			if (loadId !== activeLoadId) return;
			files = result;
		} catch (e: any) {
			if (loadId !== activeLoadId) return;
			loadError = e?.message ?? 'Failed to load files.';
			files = [];
		} finally {
			if (loadId === activeLoadId) loading = false;
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

	/** Same API path as handleUpload — one or more dropped files (P38-04). */
	async function handleDroppedFiles(dropped: File[]): Promise<void> {
		if (!dropped.length) return;
		uploading = true;
		try {
			let ok = 0;
			for (const file of dropped) {
				try {
					await uploadCaseFile(caseId, file, token);
					ok += 1;
				} catch (e: any) {
					toast.error(e?.message ?? `Upload failed: ${file.name}`);
				}
			}
			if (ok > 0) {
				if (dropped.length === 1) {
					toast.success('File uploaded');
				} else if (ok === dropped.length) {
					toast.success(`${ok} files uploaded`);
				} else {
					toast.success(`${ok} of ${dropped.length} files uploaded`);
				}
				await loadFiles();
			}
		} finally {
			uploading = false;
		}
	}

	function onFilesZoneDragEnter(e: DragEvent) {
		if (!dataTransferHasFiles(e.dataTransfer)) return;
		e.preventDefault();
		e.stopPropagation();
		fileDragDepth += 1;
	}

	function onFilesZoneDragOver(e: DragEvent) {
		if (!dataTransferHasFiles(e.dataTransfer)) return;
		e.preventDefault();
		e.stopPropagation();
		e.dataTransfer!.dropEffect = 'copy';
	}

	function onFilesZoneDragLeave(e: DragEvent) {
		if (!dataTransferHasFiles(e.dataTransfer)) return;
		e.preventDefault();
		e.stopPropagation();
		fileDragDepth -= 1;
		if (fileDragDepth < 0) fileDragDepth = 0;
	}

	async function onFilesZoneDrop(e: DragEvent) {
		if (!dataTransferHasFiles(e.dataTransfer)) return;
		e.preventDefault();
		e.stopPropagation();
		fileDragDepth = 0;
		const list = e.dataTransfer?.files;
		if (!list?.length) return;
		await handleDroppedFiles(Array.from(list));
	}

	async function handleExtract(f: CaseFile) {
		extractingId = f.id;
		try {
			const result = await extractCaseFileText(f.id, token);
			const ext = caseFileExtLabel(f.original_filename, f.mime_type);

			if (result.status === 'EXTRACTED') {
				toast.success('Text extracted');
				viewTextFileId = f.id;
				viewTextContent = null;
			} else if (result.status === 'UNSUPPORTED') {
				toast.error(
					`.${ext} files are not supported for extraction. Supported: ${CASE_FILES_SUPPORTED_EXTRACT_TYPES_LABEL}`
				);
			} else {
				toast.error(result.message ?? `Extraction failed for .${ext} file`);
			}

			// Keep local extraction_status in sync without requiring a full reload
			const extractionStatus =
				result.status === 'EXTRACTED' ? 'extracted' :
				result.status === 'UNSUPPORTED' ? 'unsupported' : 'failed';
			files = files.map((x) => x.id === f.id ? { ...x, extraction_status: extractionStatus } : x);
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
			files = files.map((x) => x.id === f.id ? { ...x, tags: [...(x.tags ?? []), t] } : x);
			cancelAddTag();
		} catch (e: any) {
			toast.error(e?.message ?? 'Add tag failed');
		}
	}

	function closeBulkModal() {
		bulkConfirmFile = null;
		bulkConfirmCount = 0;
		bulkConfirmThreshold = 0;
	}

	async function runProposeTimeline(f: CaseFile, confirmBulk: boolean) {
		proposingFileId = f.id;
		try {
			const result = await proposeTimelineEntriesFromCaseFile(caseId, f.id, token, {
				confirm_bulk: confirmBulk
			});
			closeBulkModal();
			toast.success(
				`${result.proposal_count} timeline proposal${result.proposal_count === 1 ? '' : 's'} created — review in Proposals`
			);
			if (result.source_text_truncated_for_model === true) {
				toast.warning(
					'Only the start of this file was sent to the model — proposals may miss events from later in the file. Check the Proposals tab for the full warning.',
					{ duration: 14000 }
				);
			}
		} catch (e: unknown) {
			const err = e as Error & {
				status?: number;
				code?: string;
				proposal_count?: number;
				threshold?: number;
			};
			if (err.status === 409 && err.code === 'BULK_PROPOSAL_CONFIRMATION_REQUIRED') {
				bulkConfirmFile = f;
				bulkConfirmCount = err.proposal_count ?? 0;
				bulkConfirmThreshold = err.threshold ?? 0;
			} else {
				toast.error(err?.message ?? 'Propose timeline entries failed');
			}
		} finally {
			proposingFileId = null;
		}
	}

	async function handleRemoveTag(f: CaseFile, tag: string) {
		try {
			await removeFileTag(caseId, f.id, tag, token);
			files = files.map((x) => x.id === f.id ? { ...x, tags: (x.tags ?? []).filter((t) => t !== tag) } : x);
		} catch (e: any) {
			toast.error(e?.message ?? 'Remove tag failed');
		}
	}
</script>

<div class="flex flex-col gap-4 p-4">
	<!-- P38-04: drop target shares uploadCaseFile path with picker (Notes-style entry parity) -->
	<div
		class="rounded-lg border-2 border-dashed transition-colors p-3 -mx-1
		       {fileDragDepth > 0
			? 'border-blue-500 dark:border-blue-400 bg-blue-50/80 dark:bg-blue-950/40'
			: 'border-gray-200 dark:border-gray-700'}"
		role="region"
		aria-label="Case file upload"
		data-testid="case-files-upload-dropzone"
		on:dragenter={onFilesZoneDragEnter}
		on:dragover={onFilesZoneDragOver}
		on:dragleave={onFilesZoneDragLeave}
		on:drop={onFilesZoneDrop}
	>
		{#if fileDragDepth > 0}
			<p class="text-xs font-medium text-blue-700 dark:text-blue-300 mb-2" aria-live="polite">
				Drop files to upload to this case
			</p>
		{/if}
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
	</div>

	<!-- Files list -->
	<div class="text-xs text-gray-500 dark:text-gray-400">
		Text extraction supported for: <span class="font-mono" data-testid="case-files-supported-extract-types"
			>{CASE_FILES_SUPPORTED_EXTRACT_TYPES_LABEL}</span
		>
	</div>

	{#if loading}
		<CaseLoadingState label="Loading files…" />
	{:else if loadError}
		<CaseErrorState title="Failed to load files" message={loadError} onRetry={loadFiles} />
	{:else if files.length === 0}
		<CaseEmptyState
			title="No files yet."
			description="Choose a file or drag files into the upload area above."
		/>
	{:else}
		<div class="flex flex-col gap-2">
			{#each files as f (f.id)}
				<div
					class="flex flex-col gap-1 rounded border border-gray-200 dark:border-gray-700 p-2 text-sm"
				>
				<div class="flex flex-wrap items-center gap-2">
					<span class="font-medium truncate flex-1 min-w-0">{f.original_filename}</span>
					<span
						class="shrink-0 font-mono text-xs px-1.5 py-0.5 rounded {isCaseFileLikelyExtractable(
							f.original_filename,
							f.mime_type
						)
							? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
							: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'}"
						title={f.mime_type ?? undefined}
					>{caseFileExtLabel(f.original_filename, f.mime_type)}</span>
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
					{#if !isCaseFileLikelyExtractable(f.original_filename, f.mime_type)}
						<span class="text-xs text-amber-600 dark:text-amber-400">(type not supported)</span>
					{/if}
					<button
						type="button"
						class="text-blue-600 dark:text-blue-400 hover:underline text-xs"
						on:click={() => handleViewText(f)}
					>
						View extracted text
					</button>
					<button
						type="button"
						class="text-violet-600 dark:text-violet-400 hover:underline text-xs disabled:opacity-50"
						disabled={proposingFileId === f.id || f.extraction_status !== 'extracted'}
						title={f.extraction_status !== 'extracted'
							? 'Extract text first, then propose timeline entries'
							: 'Create pending timeline proposals (review in Proposals tab)'}
						data-testid="propose-timeline-from-file-btn"
						on:click={() => runProposeTimeline(f, false)}
					>
						{proposingFileId === f.id ? 'Proposing…' : 'Propose timeline entries'}
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

<!-- P40-01: bulk proposal count confirmation -->
{#if bulkConfirmFile}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
		role="dialog"
		aria-modal="true"
		aria-labelledby="bulk-proposal-title"
		on:click={(e) => e.target === e.currentTarget && closeBulkModal()}
		on:keydown={(e) => e.key === 'Escape' && closeBulkModal()}
		tabindex="-1"
		data-testid="bulk-proposal-confirm-modal"
	>
		<div
			class="max-w-md w-full rounded-lg bg-white dark:bg-gray-850 shadow-xl mx-4 p-4"
			on:click|stopPropagation
		>
			<h3 id="bulk-proposal-title" class="font-medium text-sm mb-2">Many timeline proposals</h3>
			<p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
				Extraction would create <strong>{bulkConfirmCount}</strong> pending proposals (threshold
				{bulkConfirmThreshold}). This stays review-first — nothing is written to the official Timeline until
				you approve and commit each entry. Continue?
			</p>
			<div class="flex justify-end gap-2">
				<button
					type="button"
					class="px-3 py-1.5 text-sm rounded border border-gray-300 dark:border-gray-600"
					on:click={closeBulkModal}
				>
					Cancel
				</button>
				<button
					type="button"
					class="px-3 py-1.5 text-sm rounded bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-50"
					disabled={proposingFileId !== null}
					on:click={() => bulkConfirmFile && runProposeTimeline(bulkConfirmFile, true)}
				>
					{proposingFileId ? 'Working…' : 'Create proposals'}
				</button>
			</div>
		</div>
	</div>
{/if}

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
