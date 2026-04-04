<script lang="ts">
	import { onDestroy, tick } from 'svelte';
	import { goto } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import Spinner from '$lib/components/common/Spinner.svelte';
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
	import { buildCaseFileExtractedTextModalBody } from '$lib/components/case/caseFileExtractedTextModal';

	type ProposeWorkflowState =
		| { step: 'idle' }
		| { step: 'processing'; file: CaseFile; abort: AbortController }
		| {
				step: 'bulk_confirm';
				file: CaseFile;
				count: number;
				threshold: number;
				token: string | null;
		  };

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
	/** P41-14 — processing modal + bulk confirm in one shell; cancel via AbortController */
	let proposeWorkflow: ProposeWorkflowState = { step: 'idle' };
	/** Invalidates stale async completion after cancel / case switch / unmount (P41-14). */
	let proposeRequestGeneration = 0;

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
		if (proposeWorkflow.step === 'processing') {
			proposeRequestGeneration += 1;
			proposeWorkflow.abort.abort();
		}
		proposeWorkflow = { step: 'idle' };
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

	/** P40-05B: same GET /files/:id/text path as “View extracted text” so the modal is never blank after extract. */
	async function loadExtractedTextIntoModal(fileId: string): Promise<void> {
		viewTextFileId = fileId;
		viewTextContent = null;
		viewTextLoading = true;
		try {
			const data = await getCaseFileText(fileId, token);
			viewTextContent = buildCaseFileExtractedTextModalBody({
				status: data.status,
				message: data.message,
				extracted_text: data.extracted_text
			});
		} catch (e: any) {
			viewTextContent = `Error: ${e?.message ?? 'Failed to load'}`;
		} finally {
			viewTextLoading = false;
		}
	}

	async function handleExtract(f: CaseFile) {
		extractingId = f.id;
		try {
			const result = await extractCaseFileText(f.id, token);
			const ext = caseFileExtLabel(f.original_filename, f.mime_type);

			if (result.status === 'EXTRACTED') {
				toast.success('Text extracted');
				await loadExtractedTextIntoModal(f.id);
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
		await loadExtractedTextIntoModal(f.id);
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

	/** Close modal; abort in-flight propose and toast only when canceling active processing (P41-14). */
	function dismissProposeModal() {
		const wasProcessing = proposeWorkflow.step === 'processing';
		if (wasProcessing) {
			proposeRequestGeneration += 1;
			proposeWorkflow.abort.abort();
		}
		proposeWorkflow = { step: 'idle' };
		proposingFileId = null;
		if (wasProcessing) {
			toast.info('Proposal generation canceled.', { duration: 5000 });
		}
	}

	function isFileProposeLocked(f: CaseFile): boolean {
		if (proposingFileId === f.id) return true;
		if (proposeWorkflow.step === 'idle') return false;
		return proposeWorkflow.file.id === f.id;
	}

	async function runProposeTimeline(f: CaseFile, confirmBulk: boolean) {
		const priorBulkTok =
			confirmBulk && proposeWorkflow.step === 'bulk_confirm' && proposeWorkflow.file.id === f.id
				? proposeWorkflow.token
				: null;

		const gen = proposeRequestGeneration + 1;
		proposeRequestGeneration = gen;
		const abort = new AbortController();
		proposeWorkflow = { step: 'processing', file: f, abort };
		proposingFileId = f.id;

		let navigateToProposalsAfter = false;

		try {
			const result = await proposeTimelineEntriesFromCaseFile(caseId, f.id, token, {
				confirm_bulk: confirmBulk,
				signal: abort.signal,
				...(confirmBulk && priorBulkTok
					? { bulk_confirmation_token: priorBulkTok }
					: {})
			});

			if (gen !== proposeRequestGeneration) return;

			if (result.status === 'confirmation_required') {
				if (confirmBulk) {
					toast.warning(
						'The server still requires bulk confirmation (counts may have changed). Review the dialog and click Create proposals again, or cancel and run Propose timeline entries from scratch.',
						{ duration: 12000 }
					);
				}
				proposeWorkflow = {
					step: 'bulk_confirm',
					file: f,
					count: result.proposal_count,
					threshold: result.threshold,
					token:
						typeof result.bulk_confirmation_token === 'string' &&
						result.bulk_confirmation_token.length > 0
							? result.bulk_confirmation_token
							: null
				};
				/** P41-16 — flush DOM to bulk-confirm branch before finally clears proposingFileId (avoids empty modal flash / stuck processing shell). */
				await tick();
				return;
			}

			const n = result.proposal_count;
			proposeWorkflow = { step: 'idle' };
			navigateToProposalsAfter = true;
			if (n <= 0) {
				toast.warning(
					'Proposal generation finished but no proposals were returned. Open the Proposals tab to verify, or run Propose timeline entries again.',
					{ duration: 12000 }
				);
			} else {
				toast.success(
					`${n} timeline proposal${n === 1 ? '' : 's'} created. Open the Proposals tab to review and approve.`,
					{ duration: 9000 }
				);
			}
			if (result.source_text_truncated_for_model === true) {
				toast.warning(
					'Only the start of this file was sent to the model — proposals may miss events from later in the file. Check the Proposals tab for the full warning.',
					{ duration: 14000 }
				);
			}
		} catch (e: unknown) {
			if (gen !== proposeRequestGeneration) return;
			const err = e as Error & { name?: string };
			if (err?.name === 'AbortError') {
				proposeWorkflow = { step: 'idle' };
				return;
			}
			const msg = err?.message ?? 'Propose timeline entries failed';
			const isToken =
				typeof msg === 'string' &&
				(msg.includes('invalid') || msg.includes('expired') || msg.includes('regenerate'));
			proposeWorkflow = { step: 'idle' };
			toast.error(
				isToken
					? `${msg} Use Propose timeline entries again to generate a fresh batch.`
					: msg,
				{ duration: isToken ? 12000 : 6000 }
			);
		} finally {
			if (gen === proposeRequestGeneration) proposingFileId = null;
		}

		if (navigateToProposalsAfter && gen === proposeRequestGeneration) {
			await goto(`/case/${caseId}/proposals`);
		}
	}

	onDestroy(() => {
		if (proposeWorkflow.step === 'processing') {
			proposeRequestGeneration += 1;
			proposeWorkflow.abort.abort();
		}
		proposeWorkflow = { step: 'idle' };
		proposingFileId = null;
	});

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
						disabled={isFileProposeLocked(f) || f.extraction_status !== 'extracted'}
						title={f.extraction_status !== 'extracted'
							? 'Extract text first, then propose timeline entries'
							: 'Create pending timeline proposals (review in Proposals tab)'}
						data-testid="propose-timeline-from-file-btn"
						on:click={() => runProposeTimeline(f, false)}
					>
						{isFileProposeLocked(f)
							? proposeWorkflow.step === 'processing' && proposingFileId === f.id
								? 'Proposing…'
								: 'Pending…'
							: 'Propose timeline entries'}
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

<!-- P40-01 bulk confirm + P41-14 processing (same modal shell). P41-16: explicit steps so idle never renders an empty overlay. -->
{#if proposeWorkflow.step === 'processing' || proposeWorkflow.step === 'bulk_confirm'}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
		role="dialog"
		aria-modal="true"
		aria-labelledby="propose-timeline-modal-title"
		on:click={(e) => e.target === e.currentTarget && dismissProposeModal()}
		on:keydown={(e) => e.key === 'Escape' && dismissProposeModal()}
		tabindex="-1"
		data-testid="propose-timeline-modal"
	>
		<div
			class="max-w-md w-full rounded-lg bg-white dark:bg-gray-850 shadow-xl mx-4 p-4"
			on:click|stopPropagation
		>
			{#key proposeWorkflow.step}
			{#if proposeWorkflow.step === 'processing'}
				<div data-testid="propose-timeline-processing">
					<h3 id="propose-timeline-modal-title" class="font-medium text-sm mb-2">
						Processing document for timeline proposals
					</h3>
					<p class="text-sm text-gray-600 dark:text-gray-400 mb-3">
						Analyzing extracted text and generating pending proposals. This may take a moment. Nothing is
						committed to the official timeline until you review and approve in the Proposals tab.
					</p>
					<div class="flex items-center gap-3 mb-4" aria-live="polite">
						<Spinner className="size-6 text-violet-600 dark:text-violet-400" />
						<span class="text-sm text-gray-700 dark:text-gray-300" data-testid="propose-timeline-processing-label"
							>Working…</span
						>
					</div>
					<div class="flex justify-end">
						<button
							type="button"
							class="px-3 py-1.5 text-sm rounded border border-gray-300 dark:border-gray-600"
							data-testid="propose-timeline-cancel-btn"
							on:click={dismissProposeModal}
						>
							Cancel
						</button>
					</div>
				</div>
			{:else if proposeWorkflow.step === 'bulk_confirm'}
				<div data-testid="bulk-proposal-confirm-modal">
					<h3 id="propose-timeline-modal-title" class="font-medium text-sm mb-2">Many timeline proposals</h3>
					<p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
						Extraction would create <strong>{proposeWorkflow.count}</strong> pending proposals (threshold
						{proposeWorkflow.threshold}). This stays review-first — nothing is written to the official Timeline until
						you approve and commit each entry. Continue?
					</p>
					<div class="flex justify-end gap-2">
						<button
							type="button"
							class="px-3 py-1.5 text-sm rounded border border-gray-300 dark:border-gray-600"
							on:click={dismissProposeModal}
						>
							Cancel
						</button>
						<button
							type="button"
							class="px-3 py-1.5 text-sm rounded bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-50"
							disabled={proposingFileId !== null}
							data-testid="bulk-proposal-confirm-submit"
							on:click={() => runProposeTimeline(proposeWorkflow.file, true)}
						>
							{proposingFileId ? 'Working…' : 'Create proposals'}
						</button>
					</div>
				</div>
			{/if}
			{/key}
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
					<pre
						class="whitespace-pre-wrap text-sm font-sans"
						data-testid="case-file-extracted-text-body">{viewTextContent}</pre>
				{/if}
			</div>
		</div>
	</div>
{/if}
