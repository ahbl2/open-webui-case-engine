<script lang="ts">
	import { onDestroy, tick } from 'svelte';
	import { dev } from '$app/environment';
	import { goto } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import Spinner from '$lib/components/common/Spinner.svelte';
	import {
		listCaseFilesPage,
		uploadCaseFile,
		downloadCaseFile,
		deleteCaseFile,
		extractCaseFileText,
		getCaseFileText,
		addFileTag,
		removeFileTag,
		proposeTimelineEntriesFromCaseFile,
		type CaseFile,
		type CaseFilesListMimeCategory
	} from '$lib/apis/caseEngine';
	import ConfirmDialog from '$lib/components/common/ConfirmDialog.svelte';
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
	import { isStaleTimelineLoadMoreAppend } from '$lib/caseTimeline/timelineLoadMoreStaleGuard';
	import { formatCaseDateTime } from '$lib/utils/formatDateTime';
	import {
		DS_BTN_CLASSES,
		DS_FILES_CLASSES,
		DS_MODAL_CLASSES,
		DS_STATUS_TEXT_CLASSES,
		DS_TYPE_CLASSES
	} from '$lib/case/detectivePrimitiveFoundation';

	type ProposeWorkflowState =
		| { step: 'idle' }
		| { step: 'processing'; file: CaseFile; abort: AbortController }
		| {
				step: 'bulk_confirm';
				file: CaseFile;
				count: number;
				threshold: number;
				token: string | null;
				/** P41-20 — dev/support correlation with Case Engine trace */
				proposalGenerationRunId?: string | null;
		  };

	export let caseId: string;
	export let token: string;

	/**
	 * P42-06 — when true, deleted rows stay in the list (e.g. ADMIN `includeDeleted`); local row is marked
	 * instead of removed. Files tab default leaves this false.
	 */
	export let listIncludesDeleted = false;

	/** P60-05: optional file id from `?file=` — scrolls into view when that row is on the currently loaded page. */
	export let focusFileId: string | null = null;

	/** P42-03 — matches Case Engine paginated default cap (50). */
	const CASE_FILES_PAGE_SIZE = 50;

	let files: CaseFile[] = [];
	let totalFiles = 0;
	let loading = true;
	let loadError = '';
	let isLoadingMore = false;
	let loadMoreError = '';
	/** P42-04 — bound input; debounced into `fileSearchApplied` for server fetches. */
	let fileSearchDraft = '';
	let fileSearchApplied = '';
	let searchDebounceHandle: ReturnType<typeof setTimeout> | undefined;
	/** P42-05 — '' = all types */
	let mimeCategoryFilter: '' | CaseFilesListMimeCategory = '';
	/** P42-05 — all | with | without active tags */
	let hasTagsFilter: 'all' | 'with' | 'without' = 'all';
	let uploading = false;
	let extractingId: string | null = null;
	/** P42-06 — DELETE in flight per file id */
	let deletingFileId: string | null = null;
	let showDeleteFileConfirm = false;
	let pendingDeleteFile: CaseFile | null = null;
	let viewTextFileId: string | null = null;
	let viewTextContent: string | null = null;
	let viewTextLoading = false;
	let fileInput: HTMLInputElement;
	/** P42-09 — show “hidden by filters” toast description at most once per active constraint session (reduces noise on sequential uploads). */
	let filesFilterUploadHintShown = false;
	// ── File tag constants ─────────────────────────────────────────────────────

	/** Predefined tag options shown in the tag dropdown. Order = most commonly used first. */
	const FILE_TAGS = [
		'timeline',      // source document feeding the case timeline
		'evidence',      // physical or digital evidence item
		'photo',         // photographs — scene, suspect, evidence
		'report',        // official police, lab, or medical examiner report
		'surveillance',  // surveillance footage log or camera report
		'warrant',       // search or arrest warrant
		'interview',     // interview transcript or witness statement
		'financial',     // bank records, transactions, asset docs
		'phone records', // call logs, CDRs, tower / ping data
		'lab results',   // forensics or crime-lab analysis
		'medical',       // medical records or autopsy report
		'court',         // court filings, subpoenas, legal orders
		'other',         // general / uncategorised reference
	] as const;

	/** Sentinel value in the <select> that switches to a free-text fallback. */
	const CUSTOM_SENTINEL = '__custom__';

	let addingTagFileId: string | null = null;
	let newTagInput = '';
	/** True when the user chose "Custom…" in the dropdown and is typing a free-form tag. */
	let newTagIsCustom = false;
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
	/** P42-03 / P41-44-FU1 pattern — invalidates in-flight load-more after full reload or case switch. */
	let filesLoadMoreEpoch = 0;
	/** P60-05: avoid repeated scroll for the same `focusFileId`. */
	let lastScrolledFocusFileId: string | null = null;

	$: if (caseId && token && caseId !== prevLoadedCaseId) {
		prevLoadedCaseId = caseId;
		filesLoadMoreEpoch += 1;
		files = [];
		totalFiles = 0;
		loadError = '';
		isLoadingMore = false;
		loadMoreError = '';
		if (searchDebounceHandle !== undefined) {
			clearTimeout(searchDebounceHandle);
			searchDebounceHandle = undefined;
		}
		fileSearchDraft = '';
		fileSearchApplied = '';
		mimeCategoryFilter = '';
		hasTagsFilter = 'all';
		viewTextFileId = null;
		viewTextContent = null;
		uploading = false;
		extractingId = null;
		deletingFileId = null;
		showDeleteFileConfirm = false;
		pendingDeleteFile = null;
		addingTagFileId = null;
		newTagInput = '';
		newTagIsCustom = false;
		proposingFileId = null;
		if (proposeWorkflow.step === 'processing') {
			proposeRequestGeneration += 1;
			proposeWorkflow.abort.abort();
		}
		proposeWorkflow = { step: 'idle' };
		fileDragDepth = 0;
		filesFilterUploadHintShown = false;
		lastScrolledFocusFileId = null;
		loadFiles();
	}

	$: if (focusFileId && files.length > 0 && focusFileId !== lastScrolledFocusFileId) {
		const hit = files.some((f) => f.id === focusFileId);
		if (hit) {
			lastScrolledFocusFileId = focusFileId;
			const id = focusFileId;
			void tick().then(() => {
				document.getElementById(`ce-case-file-${id}`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
			});
		}
	}

	/** P42-05 — shared list params for initial + load-more (search + filters + pagination). */
	function listPageFetchParams(offset: number): {
		limit: number;
		offset: number;
		query?: string;
		mimeCategory?: CaseFilesListMimeCategory;
		hasTags?: boolean;
	} {
		const q = fileSearchApplied.trim();
		const p: {
			limit: number;
			offset: number;
			query?: string;
			mimeCategory?: CaseFilesListMimeCategory;
			hasTags?: boolean;
		} = {
			limit: CASE_FILES_PAGE_SIZE,
			offset
		};
		if (q) p.query = q;
		if (mimeCategoryFilter) p.mimeCategory = mimeCategoryFilter;
		if (hasTagsFilter === 'with') p.hasTags = true;
		if (hasTagsFilter === 'without') p.hasTags = false;
		return p;
	}

	$: hasActiveListConstraints =
		fileSearchApplied.trim().length > 0 ||
		mimeCategoryFilter !== '' ||
		hasTagsFilter !== 'all';

	$: if (!hasActiveListConstraints) filesFilterUploadHintShown = false;

	async function loadFiles() {
		activeLoadId += 1;
		filesLoadMoreEpoch += 1;
		const loadId = activeLoadId;
		loading = true;
		loadError = '';
		isLoadingMore = false;
		loadMoreError = '';
		try {
			const { files: page, totalFiles: total } = await listCaseFilesPage(
				caseId,
				token,
				listPageFetchParams(0)
			);
			if (loadId !== activeLoadId) return;
			files = page;
			totalFiles = total;
		} catch (e: any) {
			if (loadId !== activeLoadId) return;
			loadError = e?.message ?? 'Failed to load files.';
			files = [];
			totalFiles = 0;
		} finally {
			if (loadId === activeLoadId) loading = false;
		}
	}

	/** P42-03 — append next page; stale-safe (case switch / superseding loadFiles). */
	async function loadMoreFiles() {
		if (loading || isLoadingMore || files.length >= totalFiles) return;
		const fetchGeneration = activeLoadId;
		const requestedCaseId = caseId;
		const myLoadMoreOp = ++filesLoadMoreEpoch;
		isLoadingMore = true;
		loadMoreError = '';
		const offset = files.length;
		try {
			const { files: more, totalFiles: total } = await listCaseFilesPage(
				caseId,
				token,
				listPageFetchParams(offset)
			);
			if (isStaleTimelineLoadMoreAppend(fetchGeneration, activeLoadId, requestedCaseId, caseId)) {
				return;
			}
			const existingIds = new Set(files.map((f) => f.id));
			const fresh = more.filter((f) => !existingIds.has(f.id));
			files = [...files, ...fresh];
			totalFiles = total;
		} catch (e: unknown) {
			if (!isStaleTimelineLoadMoreAppend(fetchGeneration, activeLoadId, requestedCaseId, caseId)) {
				loadMoreError = e instanceof Error ? e.message : 'Failed to load more files.';
			}
		} finally {
			if (myLoadMoreOp === filesLoadMoreEpoch) {
				isLoadingMore = false;
			}
		}
	}

	loadFiles();

	/** P42-04 — debounced server search; avoids stale rapid typing via `activeLoadId` in `loadFiles`. */
	function scheduleFileSearchApply() {
		if (searchDebounceHandle !== undefined) clearTimeout(searchDebounceHandle);
		searchDebounceHandle = setTimeout(() => {
			searchDebounceHandle = undefined;
			const t = fileSearchDraft.trim();
			if (t === fileSearchApplied) return;
			fileSearchApplied = t;
			void loadFiles();
		}, 300);
	}

	function onFileSearchInput() {
		scheduleFileSearchApply();
	}

	function onListFiltersChange() {
		void loadFiles();
	}

	function toastUploadSuccessWithOptionalFilterHint(
		title: string,
		filterDescription: string
	): void {
		if (hasActiveListConstraints && !filesFilterUploadHintShown) {
			filesFilterUploadHintShown = true;
			toast.success(title, { description: filterDescription });
			return;
		}
		toast.success(title);
	}

	async function handleUpload() {
		const input = fileInput;
		if (!input?.files?.length) {
			toast.error('Select a file first');
			return;
		}
		uploading = true;
		try {
			const uploaded = await uploadCaseFile(caseId, input.files[0], token);
			toastUploadSuccessWithOptionalFilterHint(
				'File uploaded — select a tag',
				'It may be hidden by current search or filters.'
			);
			input.value = '';
			await loadFiles();
			// Auto-open the tag picker so the user is prompted to categorise immediately.
			startAddTag(uploaded);
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
				const filterDesc =
					ok === 1
						? 'It may be hidden by current search or filters.'
						: 'Some uploads may be hidden by current search or filters.';
				if (dropped.length === 1) {
					toastUploadSuccessWithOptionalFilterHint('File uploaded', filterDesc);
				} else if (ok === dropped.length) {
					toastUploadSuccessWithOptionalFilterHint(`${ok} files uploaded`, filterDesc);
				} else {
					toastUploadSuccessWithOptionalFilterHint(
						`${ok} of ${dropped.length} files uploaded`,
						filterDesc
					);
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

	// ── File tagging ───────────────────────────────────────────────────────────

	function startAddTag(f: CaseFile) {
		addingTagFileId = f.id;
		newTagInput = '';
		newTagIsCustom = false;
	}

	function cancelAddTag() {
		addingTagFileId = null;
		newTagInput = '';
		newTagIsCustom = false;
	}

	function onTagSelectChange(e: Event) {
		const val = (e.target as HTMLSelectElement).value;
		if (val === CUSTOM_SENTINEL) {
			newTagIsCustom = true;
			newTagInput = '';
		} else {
			newTagIsCustom = false;
			newTagInput = val;
		}
	}

	async function submitAddTag(f: CaseFile) {
		const t = newTagInput.trim().toLowerCase().replace(/\s+/g, ' ');
		if (!t) return;
		// Don't add a tag that the file already has.
		if ((f.tags ?? []).includes(t)) {
			cancelAddTag();
			return;
		}
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

	/** P41-19 — pass `explicitBulkToken` from the bulk-confirm click so the token is not lost if `proposeWorkflow.step` flips to `processing` before the guard reads state (e.g. double-submit). */
	async function runProposeTimeline(
		f: CaseFile,
		confirmBulk: boolean,
		explicitBulkToken?: string | null
	) {
		const fromClick =
			typeof explicitBulkToken === 'string' && explicitBulkToken.trim()
				? explicitBulkToken.trim()
				: null;
		const priorBulkTok =
			fromClick ??
			(confirmBulk && proposeWorkflow.step === 'bulk_confirm' && proposeWorkflow.file.id === f.id
				? proposeWorkflow.token
				: null);

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
				...(priorBulkTok ? { bulk_confirmation_token: priorBulkTok } : {})
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
							: null,
					proposalGenerationRunId:
						typeof result.proposal_generation_run_id === 'string' &&
						result.proposal_generation_run_id.trim().length > 0
							? result.proposal_generation_run_id.trim()
							: null
				};
				/** P41-16 — flush DOM to bulk-confirm branch before finally clears proposingFileId (avoids empty modal flash / stuck processing shell). */
				await tick();
				return;
			}

			const n = result.proposal_count;
			const createdRunId =
				typeof result.proposal_generation_run_id === 'string' && result.proposal_generation_run_id.trim().length > 0
					? result.proposal_generation_run_id.trim()
					: '';
			proposeWorkflow = { step: 'idle' };
			navigateToProposalsAfter = true;
			if (n <= 0) {
				toast.warning(
					'Proposal generation finished but no proposals were returned. Open the Proposals tab to verify, or run Propose timeline entries again.',
					{
						duration: 12000,
						...(dev && createdRunId ? { description: `Run ${createdRunId}` } : {})
					}
				);
			} else {
				toast.success(
					`${n} timeline proposal${n === 1 ? '' : 's'} created. Open the Proposals tab to review and approve.`,
					{
						duration: 9000,
						...(dev && createdRunId ? { description: `Run ${createdRunId}` } : {})
					}
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
		if (searchDebounceHandle !== undefined) {
			clearTimeout(searchDebounceHandle);
			searchDebounceHandle = undefined;
		}
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

	function requestDeleteFile(f: CaseFile) {
		pendingDeleteFile = f;
		showDeleteFileConfirm = true;
	}

	async function executeDeleteFile() {
		const f = pendingDeleteFile;
		pendingDeleteFile = null;
		if (!f) return;
		deletingFileId = f.id;
		try {
			await deleteCaseFile(caseId, f.id, token);
			if (viewTextFileId === f.id) closeViewText();
			if (listIncludesDeleted) {
				files = files.map((x) =>
					x.id === f.id ? { ...x, deleted_at: new Date().toISOString() } : x
				);
			} else {
				files = files.filter((x) => x.id !== f.id);
				totalFiles = Math.max(0, totalFiles - 1);
			}
			toast.success('File removed');
		} catch (e: unknown) {
			toast.error(e instanceof Error ? e.message : 'Delete failed');
		} finally {
			deletingFileId = null;
		}
	}
</script>

<ConfirmDialog
	bind:show={showDeleteFileConfirm}
	title="Delete file"
	message="Delete this file? This can be restored later."
	cancelLabel="Cancel"
	confirmLabel="Delete"
	onConfirm={executeDeleteFile}
/>

<div class="{DS_FILES_CLASSES.workspace}">
	<!-- P42-09 — upload section label -->
	<div class="flex flex-col gap-1.5 -mx-1">
		<h3 class="{DS_FILES_CLASSES.sectionLabel}">Add file to case</h3>
	<!-- P38-04: drop target shares uploadCaseFile path with picker (Notes-style entry parity) -->
	<div
		class="{DS_FILES_CLASSES.dropzone} {fileDragDepth > 0 ? DS_FILES_CLASSES.dropzoneActive : ''}"
		role="region"
		aria-label="Case file upload"
		data-testid="case-files-upload-dropzone"
		on:dragenter={onFilesZoneDragEnter}
		on:dragover={onFilesZoneDragOver}
		on:dragleave={onFilesZoneDragLeave}
		on:drop={onFilesZoneDrop}
	>
		{#if fileDragDepth > 0}
			<p class="{DS_FILES_CLASSES.dropzoneHint}" aria-live="polite">
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
				class="{DS_FILES_CLASSES.nativeFileInput}"
			/>
			<button
				type="submit"
				disabled={uploading}
				class="{DS_BTN_CLASSES.primary}"
			>
				{uploading ? 'Uploading...' : 'Upload'}
			</button>
		</form>
	</div>
	</div>

	<!-- Files list — P42-11: lighter help line + margin so it reads apart from search row and count line -->
	<div class="{DS_FILES_CLASSES.doctrineHelp}" data-testid="case-files-extraction-help">
		Text extraction supported for: <span class="{DS_TYPE_CLASSES.mono}" data-testid="case-files-supported-extract-types"
			>{CASE_FILES_SUPPORTED_EXTRACT_TYPES_LABEL}</span
		>
	</div>

	<div class="{DS_FILES_CLASSES.listControls}" data-testid="case-files-list-controls">
		<div class="min-w-[12rem] flex-1">
			<input
				type="search"
				bind:value={fileSearchDraft}
				on:input={onFileSearchInput}
				placeholder="Search files by name, type, or tag"
				aria-label="Search case files"
				autocomplete="off"
				data-testid="case-files-search-input"
				class="w-full {DS_FILES_CLASSES.formControl}"
			/>
		</div>
		<div class="flex flex-wrap items-center gap-2">
			<select
				bind:value={mimeCategoryFilter}
				on:change={onListFiltersChange}
				aria-label="Filter by file type category"
				data-testid="case-files-filter-mime-category"
				class="min-w-[9rem] {DS_FILES_CLASSES.formControl} py-1.5 text-sm"
			>
				<option value="">All types</option>
				<option value="image">Image</option>
				<option value="video">Video</option>
				<option value="audio">Audio</option>
				<option value="document">Document</option>
				<option value="other">Other</option>
			</select>
			<select
				bind:value={hasTagsFilter}
				on:change={onListFiltersChange}
				aria-label="Filter by tags"
				data-testid="case-files-filter-has-tags"
				class="min-w-[9rem] {DS_FILES_CLASSES.formControl} py-1.5 text-sm"
			>
				<option value="all">All files</option>
				<option value="with">With tags</option>
				<option value="without">Without tags</option>
			</select>
		</div>
	</div>

	{#if !loadError && !loading && (files.length > 0 || totalFiles > 0)}
		<p class="{DS_FILES_CLASSES.loadedCount}" data-testid="case-files-loaded-count">
			{files.length} of {totalFiles} files loaded
		</p>
	{/if}

	{#if loading}
		<CaseLoadingState label="Loading files…" />
	{:else if loadError}
		<CaseErrorState title="Failed to load files" message={loadError} onRetry={loadFiles} />
	{:else if files.length === 0}
		<CaseEmptyState
			title={hasActiveListConstraints ? 'No matching files.' : 'No files yet.'}
			description={hasActiveListConstraints
				? 'Try adjusting search or filters, or reset them to see all files in this case.'
				: 'Choose a file or drag files into the upload area above.'}
		/>
	{:else}
		<div class="flex flex-col gap-4">
			{#each files as f (f.id)}
				<div
					id={`ce-case-file-${f.id}`}
					class="{DS_FILES_CLASSES.fileCard}"
				>
				<div class="flex flex-wrap items-center gap-2">
					<span class="min-w-0 flex-1 truncate font-semibold {DS_TYPE_CLASSES.section}">{f.original_filename}</span>
					<span
						class="{DS_FILES_CLASSES.extBadge} {isCaseFileLikelyExtractable(
							f.original_filename,
							f.mime_type
						)
							? DS_FILES_CLASSES.extBadgeExtractable
							: DS_FILES_CLASSES.extBadgeNeutral}"
						title={f.mime_type ?? undefined}
					>{caseFileExtLabel(f.original_filename, f.mime_type)}</span>
					<span class="shrink-0 text-xs {DS_TYPE_CLASSES.meta}"
						>{f.file_size_bytes != null ? `${Math.round(f.file_size_bytes / 1024)} KB` : ''}</span
					>
				</div>
				<!-- `uploaded_at`: canonical case datetime (formatCaseDateTime — align with other case tabs; see formatDateTime.ts). -->
				<p class="text-xs {DS_TYPE_CLASSES.meta}">
					Uploaded: {formatCaseDateTime(String(f.uploaded_at ?? ''))}
				</p>
				<div class="flex flex-wrap items-center gap-x-2 gap-y-1">
					<button
						type="button"
						class="{DS_FILES_CLASSES.actionLink}"
						on:click={() => handleDownload(f)}
					>
						Download
					</button>
					<span class="{DS_FILES_CLASSES.actionsDivider}" aria-hidden="true"></span>
					<button
						type="button"
						class="{DS_FILES_CLASSES.actionLink} {DS_FILES_CLASSES.actionLinkDanger}"
						disabled={deletingFileId === f.id}
						data-testid="case-file-delete-btn"
						on:click={() => requestDeleteFile(f)}
					>
						{deletingFileId === f.id ? 'Deleting…' : 'Delete'}
					</button>
					<span class="{DS_FILES_CLASSES.actionsDivider} mx-0.5" aria-hidden="true"></span>
					<span class="flex flex-wrap items-center gap-x-2 gap-y-1">
					<button
						type="button"
						class="{DS_FILES_CLASSES.actionLink}"
						disabled={!isCaseFileLikelyExtractable(f.original_filename, f.mime_type) || extractingId === f.id}
						title={!isCaseFileLikelyExtractable(f.original_filename, f.mime_type)
							? 'Text extraction is not supported for this file type'
							: undefined}
						on:click={() => handleExtract(f)}
					>
						{extractingId === f.id ? 'Extracting...' : 'Extract text'}
					</button>
					<button
						type="button"
						class="{DS_FILES_CLASSES.actionLink}"
						on:click={() => handleViewText(f)}
					>
						View extracted text
					</button>
					<button
						type="button"
						class="{DS_FILES_CLASSES.actionLink} {DS_FILES_CLASSES.actionLinkPropose}"
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
					</span>
					</div>
				<!-- Tags — required categorisation for every file -->
				<div class="{DS_FILES_CLASSES.tagRow}">
					<span class="shrink-0 text-xs font-semibold {DS_TYPE_CLASSES.label}">Tags:</span>
					{#each f.tags ?? [] as tag (tag)}
						<span class="{DS_FILES_CLASSES.tagChip}">
							{tag}
							<button
								type="button"
								class="{DS_FILES_CLASSES.tagChipRemove}"
								on:click={() => handleRemoveTag(f, tag)}
								aria-label="Remove tag {tag}"
							>×</button>
						</span>
					{/each}

					{#if addingTagFileId === f.id}
						<!-- Tag picker: dropdown of predefined options, falls back to custom text input -->
						<form
							class="inline-flex flex-wrap items-center gap-1"
							on:submit|preventDefault={() => submitAddTag(f)}
						>
							{#if newTagIsCustom}
								<input
									type="text"
									bind:value={newTagInput}
									placeholder="Type custom tag"
									class="w-28 {DS_FILES_CLASSES.formControl} px-1.5 py-0.5 text-xs"
									on:keydown={(e) => e.key === 'Escape' && cancelAddTag()}
								/>
							{:else}
								<select
									class="{DS_FILES_CLASSES.formControl} px-1.5 py-0.5 text-xs"
									value={newTagInput || ''}
									on:change={onTagSelectChange}
								>
									<option value="" disabled>Select tag…</option>
									{#each FILE_TAGS as t}
										<option value={t} disabled={(f.tags ?? []).includes(t)}>{t}</option>
									{/each}
									<option value={CUSTOM_SENTINEL}>Custom…</option>
								</select>
							{/if}
							<button
								type="submit"
								disabled={!newTagInput.trim()}
								class="{DS_FILES_CLASSES.actionLink} disabled:opacity-40"
							>Add</button>
							<button type="button" class="{DS_BTN_CLASSES.ghost} min-h-0 px-1 py-0 text-xs" on:click={cancelAddTag}>Cancel</button>
						</form>
					{:else if (f.tags?.length ?? 0) === 0}
						<!-- No tag yet — show a prominent amber prompt -->
						<button
							type="button"
							class="{DS_BTN_CLASSES.ghost} inline-flex min-h-0 items-center gap-0.5 px-1 py-0 text-xs font-semibold {DS_STATUS_TEXT_CLASSES.warning}"
							title="Tag required — select a category for this file"
							on:click={() => startAddTag(f)}
						>
							⚠ Tag required
						</button>
					{:else}
						<button
							type="button"
							class="{DS_BTN_CLASSES.ghost} min-h-0 px-1 py-0 text-xs {DS_TYPE_CLASSES.meta}"
							on:click={() => startAddTag(f)}
						>
							+ tag
						</button>
					{/if}
				</div>
				</div>
			{/each}
			{#if loadMoreError}
				<p class="px-1 text-xs {DS_STATUS_TEXT_CLASSES.danger}" data-testid="case-files-load-more-error">
					{loadMoreError}
				</p>
			{/if}
			{#if files.length < totalFiles}
				<div class="flex justify-center pt-2">
					<button
						type="button"
						class="{DS_BTN_CLASSES.secondary}"
						disabled={isLoadingMore}
						data-testid="case-files-load-more"
						on:click={loadMoreFiles}
					>
						{isLoadingMore ? 'Loading…' : 'Load more'}
					</button>
				</div>
			{/if}
		</div>
	{/if}
</div>

<!-- P40-01 bulk confirm + P41-14 processing (same modal shell). P41-16: explicit steps so idle never renders an empty overlay. -->
{#if proposeWorkflow.step === 'processing' || proposeWorkflow.step === 'bulk_confirm'}
	<div
		class="{DS_FILES_CLASSES.modalOverlay}"
		role="dialog"
		aria-modal="true"
		aria-labelledby="propose-timeline-modal-title"
		on:click={(e) => e.target === e.currentTarget && dismissProposeModal()}
		on:keydown={(e) => e.key === 'Escape' && dismissProposeModal()}
		tabindex="-1"
		data-testid="propose-timeline-modal"
	>
		<div
			class="{DS_MODAL_CLASSES.panel} mx-4 w-full max-w-md p-4"
			on:click|stopPropagation
		>
			{#key proposeWorkflow.step}
			{#if proposeWorkflow.step === 'processing'}
				<div data-testid="propose-timeline-processing">
					<h3 id="propose-timeline-modal-title" class="mb-2 text-sm font-semibold {DS_TYPE_CLASSES.section}">
						Processing document for timeline proposals
					</h3>
					<p class="mb-3 text-sm {DS_TYPE_CLASSES.body}">
						Analyzing extracted text and generating pending proposals. This may take a moment. Nothing is
						committed to the official timeline until you review and approve in the Proposals tab.
					</p>
					<div class="mb-4 flex items-center gap-3" aria-live="polite">
						<Spinner className="size-6 text-violet-600 dark:text-violet-400" />
						<span class="text-sm {DS_TYPE_CLASSES.body}" data-testid="propose-timeline-processing-label"
							>Working…</span
						>
					</div>
					<div class="flex justify-end">
						<button
							type="button"
							class="{DS_BTN_CLASSES.secondary}"
							data-testid="propose-timeline-cancel-btn"
							on:click={dismissProposeModal}
						>
							Cancel
						</button>
					</div>
				</div>
			{:else if proposeWorkflow.step === 'bulk_confirm'}
				<div data-testid="bulk-proposal-confirm-modal">
					<h3 id="propose-timeline-modal-title" class="mb-2 text-sm font-semibold {DS_TYPE_CLASSES.section}">Many timeline proposals</h3>
					<p class="mb-4 text-sm {DS_TYPE_CLASSES.body}">
						Extraction would create <strong>{proposeWorkflow.count}</strong> pending proposals (threshold
						{proposeWorkflow.threshold}). This stays review-first — nothing is written to the official Timeline until
						you approve and commit each entry. Continue?
					</p>
					<div class="flex justify-end gap-2">
						<button
							type="button"
							class="{DS_BTN_CLASSES.secondary}"
							on:click={dismissProposeModal}
						>
							Cancel
						</button>
						<button
							type="button"
							class="{DS_BTN_CLASSES.primary}"
							disabled={proposingFileId !== null}
							data-testid="bulk-proposal-confirm-submit"
							on:click={() =>
								runProposeTimeline(proposeWorkflow.file, true, proposeWorkflow.token)}
						>
							{proposingFileId ? 'Working…' : 'Create proposals'}
						</button>
					</div>
					{#if dev && proposeWorkflow.proposalGenerationRunId}
						<p
							class="mt-3 break-all font-mono text-xs {DS_TYPE_CLASSES.meta}"
							data-testid="propose-timeline-run-id-debug"
						>
							Run trace id (dev): {proposeWorkflow.proposalGenerationRunId}
						</p>
					{/if}
				</div>
			{/if}
			{/key}
		</div>
	</div>
{/if}

<!-- View extracted text modal -->
{#if viewTextFileId}
	<div
		class="{DS_FILES_CLASSES.modalOverlay}"
		role="dialog"
		aria-modal="true"
		on:click={(e) => e.target === e.currentTarget && closeViewText()}
		on:keydown={(e) => e.key === 'Escape' && closeViewText()}
		tabindex="-1"
	>
		<div
			class="{DS_FILES_CLASSES.extractedPanel}"
			on:click|stopPropagation
		>
			<div class="{DS_FILES_CLASSES.extractedHeader}">
				<h3 class="font-semibold {DS_TYPE_CLASSES.section}">Extracted text</h3>
				<button
					type="button"
					class="{DS_BTN_CLASSES.ghost} min-h-0 rounded p-1"
					on:click={closeViewText}
					aria-label="Close"
				>
					<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="size-5">
						<path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
					</svg>
				</button>
			</div>
			<div class="{DS_FILES_CLASSES.extractedBody}">
				{#if viewTextLoading}
					<div class="{DS_TYPE_CLASSES.meta}">Loading...</div>
				{:else if viewTextContent !== null}
					<pre
						class="{DS_FILES_CLASSES.extractedPre}"
						data-testid="case-file-extracted-text-body">{viewTextContent}</pre>
				{/if}
			</div>
		</div>
	</div>
{/if}
