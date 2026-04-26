<script lang="ts">
	/** P98-03 / P98-05 — FilesDeclaredRelationshipsBlock (no-op until file-origin read contract exists in P98-01). */
	/** P108-02 — `?entityLens=` read-only file list lens (explicit case_file links; same param as P108-01). */
	/** P108-03 — Return to entity detail from lens banner (`<a href>`). */
	/** P108-04 — Shared `CaseEntityLensBanner` for consistent `entityLens` filter-state UI. */
	/** P108-05 — Doctrine-safe lens copy/status via `p108EntityTimelineLensCopy`. */
	/** P109-01 — Manual evidence selection checkbox + shared session-only store with Timeline. */
	/** P125-02 — Explicit per-row metadata labels + uniform type display (same API fields; no new list semantics). */
	/** P125-03 — Read-only view modal: identity + optional image/PDF preview + extracted text (raw) framing. */
	/** P125-04 — Case-scoped search uses GET /cases/:id/files?query= only; Case Engine order (no client rescoring). */
	/** P125-05 — Shared nav copy alignment (Files ≠ Timeline ≠ Notes) lives in P124/P125 copy modules; no duplicate doctrine under upload. */
	import { onDestroy, tick } from 'svelte';
	import { get } from 'svelte/store';
	import { browser, dev } from '$app/environment';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import CaseArrivalOrientationBlock from '$lib/components/case/CaseArrivalOrientationBlock.svelte';
	import CaseEntityLensBanner from '$lib/components/case/CaseEntityLensBanner.svelte';
	import { nextP99ArrivalSnapshot } from '$lib/case/p99ArrivalContextPresentation';
	import type { ArrivalContext } from '$lib/case/p99ArrivalContextReadModel';
	import {
		isP103FileNavigationIntent,
		isStaleP103NavigationIntentShape,
		validateP103TextSpanAgainstExtractedText
	} from '$lib/case/p103CitationNavigationIntent';
	import { isCaseFileExtractedTextUsable } from '$lib/case/p104FileTextAccess';
	import {
		P103_FILES_SPAN_INVALID_COPY,
		P103_FILES_SPAN_UNAVAILABLE_COPY,
		P103_REVEAL_NOT_FOUND_FILES_CITATION_COPY,
		P103_REVEAL_NOT_FOUND_FILES_SYNTHESIS_COPY
	} from '$lib/case/p103NavigationOperatorCopy';
	import { clearSynthesisNavigationPageState } from '$lib/case/synthesisNavigationClear';
	import { buildSupportingFileContextPreview } from '$lib/case/synthesisNavigationContextPreview';
	import {
		P97_SYNTHESIS_REVEAL_HIGHLIGHT_MS,
		parseFilesSourceKindFromIntent,
		scheduleStaleSynthesisIntentClear
	} from '$lib/case/synthesisNavigationP97Shared';
	import { pickSupportingFilesTargetId } from '$lib/case/supportingSynthesisNavigation';
	import { toast } from 'svelte-sonner';
	import Spinner from '$lib/components/common/Spinner.svelte';
	import { getCaseEntityDetail } from '$lib/apis/caseEngine/caseEntitiesApi';
	import {
		fetchCaseFileBlob,
		fetchCaseFileObjectUrl,
		getCaseFilesStats,
		listCaseFiles,
		listCaseFilesPage,
		listCaseFileFolders,
		moveCaseFileToFolder,
		uploadCaseFile,
		downloadCaseFile,
		deleteCaseFile,
		extractCaseFileText,
		getCaseFileText,
		addFileTag,
		removeFileTag,
		proposeTimelineEntriesFromCaseFile,
		type CaseFile,
		type CaseFileFolder,
		type CaseFilesAggregateStats,
		type CaseFilesInsights,
		type CaseFilesListMimeCategory,
		type CaseFilesStatsQuery
	} from '$lib/apis/caseEngine';
	import ConfirmDialog from '$lib/components/common/ConfirmDialog.svelte';
	import CaseLoadingState from '$lib/components/case/CaseLoadingState.svelte';
	import CaseEmptyState from '$lib/components/case/CaseEmptyState.svelte';
	import CaseErrorState from '$lib/components/case/CaseErrorState.svelte';
	import FilesDeclaredRelationshipsBlock from '$lib/components/case/FilesDeclaredRelationshipsBlock.svelte';
	import CaseFilesInsightsStrip from '$lib/components/case/CaseFilesInsightsStrip.svelte';
	import CaseFilesPreviewPane from '$lib/components/case/CaseFilesPreviewPane.svelte';
	import CaseFileGridThumb from '$lib/components/case/CaseFileGridThumb.svelte';
	import SynthesisNavigationContextPreview from '$lib/components/case/SynthesisNavigationContextPreview.svelte';
	import { dataTransferHasFiles } from '$lib/components/case/caseFilesDrop';
	import {
		CASE_FILES_SUPPORTED_EXTRACT_TYPES_LABEL,
		caseFileExtLabel,
		isCaseFileLikelyExtractable
	} from '$lib/components/case/caseFilesExtractSupport';
	import { buildCaseFileExtractedTextModalBody } from '$lib/components/case/caseFileExtractedTextModal';
	import {
		caseFileIdsLinkedFromEntityEvidence,
		filterCaseFilesToEntityLinkedOnly,
		parseEntityLensEntityIdFromSearchParams
	} from '$lib/case/p108EntityTimelineLens';
	import { P108_ENTITY_FILES_LENS_EMPTY, P108_ENTITY_FILES_LENS_EMPTY_TITLE } from '$lib/case/p108EntityTimelineLensCopy';
	import {
		clearEvidenceSelection,
		ensureEvidenceSelectionCaseScope,
		toggleEvidenceSelection,
		isEvidenceSelected,
		evidenceSelection,
		evidenceSelectionCounts,
		pruneEvidenceSelectionAfterFilesSync,
		removeEvidenceSelectionKey
	} from '$lib/case/p109EvidenceSelection';
	import { isCaseFileSelectableForEvidence } from '$lib/case/p109EvidenceSelectionGates';
	import {
		P109_EVIDENCE_SELECTION_CLEAR,
		P109_EVIDENCE_SELECTION_FILE_TOGGLE_TITLE
	} from '$lib/case/p109EvidenceSelectionCopy';
	import { P109_EVIDENCE_SETS_FILES_TAB_OPEN_LINK } from '$lib/case/p109EvidenceSetsCopy';
	import { isStaleTimelineLoadMoreAppend } from '$lib/caseTimeline/timelineLoadMoreStaleGuard';
	import { formatCaseDateTime, formatCaseDateOnly } from '$lib/utils/formatDateTime';
	import {
		P125_FILES_EMPTY_DESCRIPTION,
		P125_FILES_EMPTY_FILTERED_DESCRIPTION,
		P125_FILES_EMPTY_FILTERED_TITLE,
		P125_FILES_EMPTY_TITLE,
		P125_FILES_LABEL_SIZE,
		P125_FILES_LABEL_TYPE,
		P125_FILES_LABEL_UPLOADED
	} from '$lib/caseContext/p125FilesBrowserCopy';
	import {
		P125_FILE_VIEW_DOWNLOAD_ORIGINAL,
		P125_FILE_VIEW_EXTRACTED_HEADING,
		P125_FILE_VIEW_EXTRACTED_SUPPORT,
		P125_FILE_VIEW_IDENTITY_HEADING,
		P125_FILE_VIEW_MODAL_TITLE,
		P125_FILE_VIEW_NO_EXTRACTED_LINE,
		P125_FILE_VIEW_PREVIEW_ERROR,
		P125_FILE_VIEW_PREVIEW_HEADING,
		P125_FILE_VIEW_PREVIEW_IMG_ALT,
		P125_FILE_VIEW_PREVIEW_LOADING,
		P125_FILE_VIEW_PREVIEW_UNSUPPORTED
	} from '$lib/caseContext/p125FileViewingCopy';
	import {
		P125_FILE_SEARCH_ACTIVE_FRAMING,
		P125_FILE_SEARCH_EMPTY_DESCRIPTION
	} from '$lib/caseContext/p125FileSearchCopy';
	import {
		DS_BTN_CLASSES,
		DS_FILES_CLASSES,
		DS_MODAL_CLASSES,
		DS_STATUS_TEXT_CLASSES,
		DS_TYPE_CLASSES
	} from '$lib/case/detectivePrimitiveFoundation';
	import {
		PhotoIcon,
		FilmIcon,
		MusicalNoteIcon,
		DocumentTextIcon,
		TableCellsIcon,
		DocumentIcon,
		EllipsisVerticalIcon,
		LinkIcon,
		MagnifyingGlassIcon
	} from 'heroicons-svelte/24/outline';

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

	/** P97-03 — when true, consume `synthesisSourceNavigationIntent` on the Files surface (case route). */
	export let synthesisNavigationEnabled = false;

	/** P108-02 — URL `?entityLens=` (same query key as P108-01 timeline lens). */
	$: entityLensEntityId = parseEntityLensEntityIdFromSearchParams($page.url.searchParams);
	let entityLensLabel = '';

	/**
	 * Files workspace folder filter: `null` = all files; `__unfiled__` = no folder; else folder id.
	 * Set by parent (`Files` route left rail).
	 */
	export let folderFilter: string | null = null;

	/** `list` | `grid` — browser layout (grid is compact cards). Internal UI state. */
	let filesLayout: 'list' | 'grid' = 'grid';

	/** Upload date filters (YYYY-MM-DD); combined with tag rail → full-list client filter path. */
	let dateFrom = '';
	let dateTo = '';

	let fileSort: 'newest' | 'oldest' | 'name' = 'newest';

	/** Filters popover (details/summary). */
	let filtersPanelOpen = false;

	/** Desktop preview column (image/PDF blob preview). */
	let paneFileId: string | null = null;
	let panePreviewObjectUrl: string | null = null;
	let panePreviewHtml: string | null = null;
	let panePreviewPhase: 'off' | 'loading' | 'ready' | 'unsupported' | 'error' = 'off';
	let panePreviewKind: 'none' | 'image' | 'pdf' | 'docx' = 'none';

	/** Parent increments to refresh lists (e.g. after hero upload). */
	export let reloadTick = 0;
	/** Parent increments when folders change (e.g. new folder in rail) so move-folder dropdowns refetch. */
	export let folderListEpoch = 0;
	export let caseInsights: CaseFilesInsights | null = null;
	export let caseInsightsLoading = false;

	/** Optional notify after upload/delete so parent can refresh folder rail / KPIs. */
	export let onFilesMutated: (() => void) | undefined = undefined;

	/** Files route: drive `CaseFilesKpiStrip` counts from current list filters (server + rail). */
	export let onKpiStatsChange: ((stats: CaseFilesAggregateStats | null, loading: boolean) => void) | undefined =
		undefined;

	/** When true, hide the in-tab upload dropzone (route uses hero upload only). */
	export let hideUploadSection = false;

	/** Tags rail: exact tag filter; applied on the server with the same pagination as search/filters. */
	export let tagFilter: string | null = null;

	/** Clear tag rail selection when user hits “Clear filters” in the tab toolbar. */
	export let onClearExternalFilters: (() => void) | undefined = undefined;

	/** P109-01 — shared manual selection is case-scoped (same store as Timeline). */
	$: if (caseId) ensureEvidenceSelectionCaseScope(caseId);

	/** P109 — files in this case marked for evidence packaging (toolbar hint). */
	$: p109FileSelectionCount =
		caseId && $evidenceSelection.caseId === caseId ? evidenceSelectionCounts($evidenceSelection).files : 0;

	function filesListHasMorePages(): boolean {
		return totalFiles > 0 && files.length < totalFiles;
	}

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
	/** GET /files/:id/text `status` for modal framing (P125-03). */
	let viewTextExtractStatus: string | null = null;
	let viewPreviewObjectUrl: string | null = null;
	let viewPreviewHtml: string | null = null;
	let viewPreviewPhase: 'off' | 'loading' | 'ready' | 'unsupported' | 'error' = 'off';
	let viewPreviewKind: 'none' | 'image' | 'pdf' | 'docx' = 'none';

	$: viewTextFileMeta = viewTextFileId ? (files.find((x) => x.id === viewTextFileId) ?? null) : null;
	$: paneFileMeta = paneFileId ? (files.find((x) => x.id === paneFileId) ?? null) : null;

	function revokeViewPreviewObjectUrl(): void {
		if (viewPreviewObjectUrl) {
			URL.revokeObjectURL(viewPreviewObjectUrl);
			viewPreviewObjectUrl = null;
		}
		viewPreviewHtml = null;
		viewPreviewPhase = 'off';
		viewPreviewKind = 'none';
	}

	/** P125-03 — image/PDF/DOCX preview when available; otherwise explicit unsupported (read-only; Case Engine GET). */
	async function prepareViewFilePreview(fileId: string, meta: CaseFile | undefined): Promise<void> {
		revokeViewPreviewObjectUrl();
		if (!meta) {
			viewPreviewPhase = 'unsupported';
			return;
		}
		const mime = meta.mime_type ?? '';
		const name = meta.original_filename ?? '';
		const isImg = mime.startsWith('image/');
		const isPdf = mime === 'application/pdf' || /\.pdf$/i.test(name);
		const isDocx =
			mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
			/\.docx$/i.test(name);
		if (!isImg && !isPdf && !isDocx) {
			viewPreviewPhase = 'unsupported';
			return;
		}
		if (isDocx) {
			viewPreviewKind = 'docx';
			viewPreviewPhase = 'loading';
			try {
				const blob = await fetchCaseFileBlob(fileId, token);
				const ab = await blob.arrayBuffer();
				const { docxArrayBufferToSanitizedHtml } = await import('./caseFileOfficeSnapshot');
				viewPreviewHtml = await docxArrayBufferToSanitizedHtml(ab);
				viewPreviewPhase = 'ready';
			} catch {
				viewPreviewPhase = 'error';
			}
			return;
		}
		viewPreviewKind = isImg ? 'image' : 'pdf';
		viewPreviewPhase = 'loading';
		try {
			viewPreviewObjectUrl = await fetchCaseFileObjectUrl(fileId, token);
			viewPreviewPhase = 'ready';
		} catch {
			viewPreviewPhase = 'error';
		}
	}

	function revokePanePreview(): void {
		if (panePreviewObjectUrl) {
			URL.revokeObjectURL(panePreviewObjectUrl);
			panePreviewObjectUrl = null;
		}
		panePreviewHtml = null;
		panePreviewPhase = 'off';
		panePreviewKind = 'none';
	}

	async function primePanePreview(meta: CaseFile): Promise<void> {
		revokePanePreview();
		const mime = meta.mime_type ?? '';
		const name = meta.original_filename ?? '';
		const isImg = mime.startsWith('image/');
		const isPdf = mime === 'application/pdf' || /\.pdf$/i.test(name);
		const isDocx =
			mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
			/\.docx$/i.test(name);
		if (!isImg && !isPdf && !isDocx) {
			panePreviewPhase = 'unsupported';
			return;
		}
		if (isDocx) {
			panePreviewKind = 'docx';
			panePreviewPhase = 'loading';
			try {
				const blob = await fetchCaseFileBlob(meta.id, token);
				const ab = await blob.arrayBuffer();
				const { docxArrayBufferToSanitizedHtml } = await import('./caseFileOfficeSnapshot');
				panePreviewHtml = await docxArrayBufferToSanitizedHtml(ab);
				panePreviewPhase = 'ready';
			} catch {
				panePreviewPhase = 'error';
			}
			return;
		}
		panePreviewKind = isImg ? 'image' : 'pdf';
		panePreviewPhase = 'loading';
		try {
			panePreviewObjectUrl = await fetchCaseFileObjectUrl(meta.id, token);
			panePreviewPhase = 'ready';
		} catch {
			panePreviewPhase = 'error';
		}
	}

	function selectPreviewPane(f: CaseFile): void {
		paneFileId = f.id;
		void primePanePreview(f);
	}

	function closePreviewPane(): void {
		paneFileId = null;
		revokePanePreview();
	}

	function openPreviewInNewTab(): void {
		if (panePreviewKind === 'docx' && panePreviewHtml) {
			const doc = `<!DOCTYPE html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><style>
				body{font:15px/1.5 system-ui,Segoe UI,sans-serif;padding:20px;max-width:52rem;margin:0 auto;color:#111;background:#fff;}
				img{max-width:100%;height:auto;}
			</style></head><body>${panePreviewHtml}</body></html>`;
			const u = URL.createObjectURL(new Blob([doc], { type: 'text/html;charset=utf-8' }));
			window.open(u, '_blank', 'noopener,noreferrer');
			setTimeout(() => URL.revokeObjectURL(u), 120_000);
			return;
		}
		if (!panePreviewObjectUrl) return;
		window.open(panePreviewObjectUrl, '_blank', 'noopener,noreferrer');
	}

	function gridFolderLabel(f: CaseFile): string {
		const fid = (f.folder_id as string | null | undefined) ?? null;
		if (!fid) return 'Unfiled';
		return moveFolders.find((mf) => mf.id === fid)?.name ?? 'Folder';
	}

	/** Category chip on grid thumb (mockup: REPORT, BODY CAM, …). */
	function gridCategoryLabel(f: CaseFile): string {
		const raw = (f.tags ?? [])[0];
		if (raw && raw.trim()) return raw.trim().replace(/\s+/g, ' ').toUpperCase();
		return gridFolderLabel(f).toUpperCase();
	}

	function gridExtBadgeClass(k: FileThumbKind): string {
		switch (k) {
			case 'pdf':
				return 'bg-rose-600/95 text-white shadow-sm';
			case 'video':
				return 'bg-sky-600/95 text-white shadow-sm';
			case 'image':
				return 'bg-emerald-600/95 text-white shadow-sm';
			case 'audio':
				return 'bg-violet-600/95 text-white shadow-sm';
			case 'sheet':
				return 'bg-amber-600/95 text-white shadow-sm';
			case 'doc':
				return 'bg-blue-600/95 text-white shadow-sm';
			default:
				return 'bg-slate-600/95 text-white shadow-sm';
		}
	}

	$: if (
		paneFileId &&
		!loading &&
		!entityLensEntityId &&
		files.length > 0 &&
		!files.some((x) => x.id === paneFileId)
	) {
		closePreviewPane();
	}

	function sortFilesClient(rows: CaseFile[]): CaseFile[] {
		const copy = [...rows];
		if (fileSort === 'name') {
			copy.sort((a, b) => a.original_filename.localeCompare(b.original_filename));
		} else if (fileSort === 'oldest') {
			copy.sort(
				(a, b) => Date.parse(String(a.uploaded_at ?? '')) - Date.parse(String(b.uploaded_at ?? ''))
			);
		} else {
			copy.sort(
				(a, b) => Date.parse(String(b.uploaded_at ?? '')) - Date.parse(String(a.uploaded_at ?? ''))
			);
		}
		return copy;
	}

	function folderListParam(): string | undefined {
		if (!entityLensEntityId && folderFilter === '__unfiled__') return '__unfiled__';
		if (!entityLensEntityId && folderFilter && folderFilter.length > 0) return folderFilter;
		return undefined;
	}

	function clearWorkspaceFilters(): void {
		fileSearchDraft = '';
		fileSearchApplied = '';
		mimeCategoryFilter = '';
		hasTagsFilter = 'all';
		dateFrom = '';
		dateTo = '';
		fileSort = 'newest';
		filtersPanelOpen = false;
		onClearExternalFilters?.();
		void loadFiles();
	}

	function onFileSortChange(): void {
		files = sortFilesClient(files);
	}

	async function handleDownloadFromViewModal(): Promise<void> {
		if (!viewTextFileId) return;
		try {
			await downloadCaseFile(viewTextFileId, viewTextFileMeta?.original_filename ?? 'download', token);
		} catch (e: any) {
			toast.error(e?.message ?? 'Download failed');
		}
	}
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
		'flagged'        // review queue / KPI
	] as const;

	type FileThumbKind = 'image' | 'video' | 'audio' | 'pdf' | 'sheet' | 'doc' | 'other';

	function fileThumbKind(f: CaseFile): FileThumbKind {
		const m = (f.mime_type ?? '').toLowerCase();
		if (m.startsWith('image/')) return 'image';
		if (m.startsWith('video/')) return 'video';
		if (m.startsWith('audio/')) return 'audio';
		if (m === 'application/pdf' || m.endsWith('/pdf')) return 'pdf';
		if (
			m.includes('spreadsheet') ||
			m.includes('excel') ||
			m === 'text/csv' ||
			m.includes('ms-excel')
		) {
			return 'sheet';
		}
		if (
			m.includes('word') ||
			m.includes('opendocument.text') ||
			m === 'application/rtf' ||
			m.includes('msword')
		) {
			return 'doc';
		}
		return 'other';
	}

	/** Sentinel value in the <select> that switches to a free-text fallback. */
	const CUSTOM_SENTINEL = '__custom__';

	let addingTagFileId: string | null = null;
	/** Grid folder `<details>`: which file’s folder picker is open (single-flight). */
	let gridFolderPickerOpenFor: string | null = null;
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

	/** Folder picker for per-row move (non–entity-lens list only). */
	let moveFolders: CaseFileFolder[] = [];
	let moveFolderListLoading = false;
	let movingFileId: string | null = null;

	async function loadMoveFolderOptions(): Promise<void> {
		if (!caseId || !token || entityLensEntityId) return;
		moveFolderListLoading = true;
		try {
			const r = await listCaseFileFolders(caseId, token);
			moveFolders = r.folders;
		} catch {
			moveFolders = [];
		} finally {
			moveFolderListLoading = false;
		}
	}

	$: if (caseId && token && prevLoadedCaseId === caseId && !entityLensEntityId) {
		void reloadTick;
		void folderListEpoch;
		void loadMoveFolderOptions();
	}

	async function onMoveFileFolderSelect(f: CaseFile, ev: Event): Promise<void> {
		const sel = ev.currentTarget as HTMLSelectElement;
		const v = sel.value;
		const nextFolder = v === '' ? null : v;
		const cur = (f.folder_id as string | null | undefined) ?? null;
		if (nextFolder === cur) {
			if (gridFolderPickerOpenFor === f.id) gridFolderPickerOpenFor = null;
			return;
		}
		movingFileId = f.id;
		try {
			await moveCaseFileToFolder(caseId, f.id, token, nextFolder);
			toast.success(nextFolder ? 'File moved to folder' : 'File moved to Unfiled');
			await loadFiles();
			onFilesMutated?.();
			await loadMoveFolderOptions();
			if (gridFolderPickerOpenFor === f.id) gridFolderPickerOpenFor = null;
		} catch (e: unknown) {
			toast.error(e instanceof Error ? e.message : 'Could not move file');
			sel.value = cur ?? '';
		} finally {
			movingFileId = null;
		}
	}

	function closeGridFileKebab(ev: Event): void {
		const d = (ev.currentTarget as HTMLElement | null)?.closest('details');
		if (d) d.open = false;
	}

	// P97-03 — synthesis → Files supporting surface (read-only; ephemeral)
	// P97-04 — orientation preview (cleared with highlight; not persisted)
	let navTargetId: string | null = null;
	let revealInFlight = false;
	let synthesisHighlightId: string | null = null;
	let synthesisContextPreview: { headline: string; lines: string[] } | null = null;
	/** From intent `source_kind` at reveal start (before clear). */
	let synthesisFilesSourceKind: 'case_file' | 'extracted_text' | null = null;
	let synthesisRevealBanner: 'idle' | 'not_found' = 'idle';
	let synthesisHighlightTimer: ReturnType<typeof setTimeout> | undefined;
	let invalidSynthesisIntentClearInFlight = false;
	// P103-03 — citation → file (optional explicit text_span); read-only
	let p103NavTextSpan: { start: number; end: number } | null = null;
	let p103RevealActive = false;
	let p103FileCitationBanner: 'idle' | 'not_found' | 'span_invalid' | 'span_unavailable' = 'idle';
	let viewTextRawForSpan: string | null = null;
	let viewTextSpanRange: { start: number; end: number } | null = null;
	let p99ArrivalSnapshot: ArrivalContext | null = null;
	let p99ArrivalFilesCaseKey = '';

	$: if (browser && synthesisNavigationEnabled && caseId) {
		if (caseId !== p99ArrivalFilesCaseKey) {
			p99ArrivalFilesCaseKey = caseId;
			p99ArrivalSnapshot = null;
		}
		p99ArrivalSnapshot = nextP99ArrivalSnapshot($page.state, caseId, 'files', p99ArrivalSnapshot);
	}

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
		viewTextRawForSpan = null;
		viewTextSpanRange = null;
		viewTextExtractStatus = null;
		revokeViewPreviewObjectUrl();
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
		moveFolders = [];
		moveFolderListLoading = false;
		movingFileId = null;
		filesFilterUploadHintShown = false;
		lastScrolledFocusFileId = null;
		navTargetId = null;
		revealInFlight = false;
		synthesisHighlightId = null;
		synthesisContextPreview = null;
		synthesisFilesSourceKind = null;
		synthesisRevealBanner = 'idle';
		if (synthesisHighlightTimer) clearTimeout(synthesisHighlightTimer);
		synthesisHighlightTimer = undefined;
		invalidSynthesisIntentClearInFlight = false;
		p103NavTextSpan = null;
		p103RevealActive = false;
		p103FileCitationBanner = 'idle';
		viewTextRawForSpan = null;
		viewTextSpanRange = null;
		p99ArrivalSnapshot = null;
		p99ArrivalFilesCaseKey = '';
		dateFrom = '';
		dateTo = '';
		fileSort = 'newest';
		closePreviewPane();
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

	$: if (browser && synthesisNavigationEnabled && caseId) {
		const p103Raw = $page.state?.p103CitationNavigationIntent;
		if (p103Raw !== undefined && p103Raw !== null) {
			if (isP103FileNavigationIntent(p103Raw, caseId)) {
				if (!navTargetId && !revealInFlight) {
					navTargetId = p103Raw.target_id;
					p103NavTextSpan = p103Raw.text_span ?? null;
					p103RevealActive = true;
					p103FileCitationBanner = 'idle';
					synthesisRevealBanner = 'idle';
				}
			} else if (isStaleP103NavigationIntentShape(p103Raw)) {
				void clearSynthesisNavigationPageState(get(page));
			}
		}
		if (!(p103Raw && isP103FileNavigationIntent(p103Raw, caseId))) {
			const intent = $page.state?.synthesisSourceNavigationIntent;
			if (intent) {
				const id = pickSupportingFilesTargetId(intent, caseId);
				if (!id) {
					scheduleStaleSynthesisIntentClear(
						() => get(page),
						() => invalidSynthesisIntentClearInFlight,
						(v) => {
							invalidSynthesisIntentClearInFlight = v;
						}
					);
				} else if (!navTargetId && !revealInFlight) {
					navTargetId = id;
					synthesisRevealBanner = 'idle';
				}
			}
		}
	}

	$: if (browser && synthesisNavigationEnabled && navTargetId && !loading && !loadError) {
		if (p103RevealActive) {
			void runRevealSequenceForP103Files();
		} else {
			void runRevealSequenceForSynthesisFiles();
		}
	}

	$: if (loadError && navTargetId) {
		navTargetId = null;
		synthesisContextPreview = null;
		synthesisFilesSourceKind = null;
		synthesisRevealBanner = 'idle';
		p103NavTextSpan = null;
		p103RevealActive = false;
		p103FileCitationBanner = 'idle';
		void clearSynthesisNavigationPageState(get(page));
	}

	/** P42-05 — shared list params for initial + load-more (search + filters + pagination; server-scoped total set). */
	function listPageFetchParams(offset: number): {
		limit: number;
		offset: number;
		query?: string;
		mimeCategory?: CaseFilesListMimeCategory;
		hasTags?: boolean;
		folderId?: string;
		tag?: string;
		dateFrom?: string;
		dateTo?: string;
	} {
		const q = fileSearchApplied.trim();
		const p: {
			limit: number;
			offset: number;
			query?: string;
			mimeCategory?: CaseFilesListMimeCategory;
			hasTags?: boolean;
			folderId?: string;
			tag?: string;
			dateFrom?: string;
			dateTo?: string;
		} = {
			limit: CASE_FILES_PAGE_SIZE,
			offset
		};
		if (q) p.query = q;
		if (mimeCategoryFilter) p.mimeCategory = mimeCategoryFilter;
		if (hasTagsFilter === 'with') p.hasTags = true;
		if (hasTagsFilter === 'without') p.hasTags = false;
		if (!entityLensEntityId && folderFilter === '__unfiled__') {
			p.folderId = '__unfiled__';
		} else if (!entityLensEntityId && folderFilter && folderFilter.length > 0) {
			p.folderId = folderFilter;
		}
		if (!entityLensEntityId && tagFilter && tagFilter.length > 0) p.tag = tagFilter;
		const df = dateFrom.trim();
		const dt = dateTo.trim();
		if (df) p.dateFrom = df;
		if (dt) p.dateTo = dt;
		return p;
	}

	function computeKpiFromFileRows(rows: CaseFile[]): CaseFilesAggregateStats {
		let total_bytes = 0;
		let extracted = 0;
		let pending = 0;
		let flagged = 0;
		for (const f of rows) {
			const sz =
				typeof f.file_size_bytes === 'number' && Number.isFinite(f.file_size_bytes) ? f.file_size_bytes : 0;
			total_bytes += sz;
			const es = String((f as { extraction_status?: string }).extraction_status ?? '').toLowerCase();
			if (es === 'extracted') extracted++;
			else pending++;
			const tags = f.tags ?? [];
			if (tags.some((t) => String(t).trim().toLowerCase() === 'flagged')) flagged++;
		}
		return {
			total_files: rows.length,
			total_bytes,
			extracted_file_count: extracted,
			pending_processing_count: pending,
			linked_to_timeline_count: -1,
			flagged_file_count: flagged
		};
	}

	function buildStatsQueryFromToolbar(): CaseFilesStatsQuery {
		const p = listPageFetchParams(0);
		const q: CaseFilesStatsQuery = {};
		if (p.query) q.query = p.query;
		if (p.mimeCategory) q.mimeCategory = p.mimeCategory;
		if (p.hasTags === true) q.hasTags = 'true';
		if (p.hasTags === false) q.hasTags = 'false';
		if (p.folderId) q.folderId = p.folderId;
		if (p.tag) q.tag = p.tag;
		if (p.dateFrom) q.dateFrom = p.dateFrom;
		if (p.dateTo) q.dateTo = p.dateTo;
		return q;
	}

	let kpiStatsGeneration = 0;
	/**
	 * Refresh KPI strip for the **current** toolbar filters (server `/files/stats` or entity-lens rollup).
	 * Do not gate on `loadId === activeLoadId`: a newer `loadFiles()` can bump `activeLoadId` before this
	 * runs from the prior load’s `finally`, which would skip KPI entirely while the list already reflects
	 * the new filters. Stale async completions are dropped via `kpiStatsGeneration` only.
	 *
	 * When the **full** filtered file set is in memory (first page holds the entire result), Indexed /
	 * Pending / Flagged / Total / bytes are rolled up from those rows so the
	 * strip matches the list. Timeline link counts still come from the filtered `/files/stats` aggregate.
	 */
	async function pushKpiStatsAfterLoad(_loadId: number): Promise<void> {
		if (!onKpiStatsChange) return;
		const gen = ++kpiStatsGeneration;
		onKpiStatsChange(null, true);
		if (!caseId || !token) {
			if (gen === kpiStatsGeneration) onKpiStatsChange(null, false);
			return;
		}
		if (entityLensEntityId) {
			const s = computeKpiFromFileRows(files);
			if (gen === kpiStatsGeneration) onKpiStatsChange(s, false);
			return;
		}

		const q = buildStatsQueryFromToolbar();
		const snapFiles = files;
		const snapTotal = totalFiles;
		/** Full filtered result is loaded into `files` (not a partial first page). */
		const haveAllRowsInMemory = snapFiles.length === snapTotal;

		try {
			const server = await getCaseFilesStats(caseId, token, q);
			if (gen !== kpiStatsGeneration) return;

			if (haveAllRowsInMemory) {
				const local = computeKpiFromFileRows(snapFiles);
				const merged: CaseFilesAggregateStats = {
					...local,
					linked_to_timeline_count: server.linked_to_timeline_count
				};
				onKpiStatsChange(merged, false);
				return;
			}

			const aligned: CaseFilesAggregateStats = {
				...server,
				total_files: snapTotal
			};
			onKpiStatsChange(aligned, false);
		} catch {
			if (gen === kpiStatsGeneration) onKpiStatsChange(null, false);
		}
	}

	$: hasActiveListConstraints =
		!entityLensEntityId &&
		(fileSearchApplied.trim().length > 0 ||
			mimeCategoryFilter !== '' ||
			hasTagsFilter !== 'all' ||
			(tagFilter !== null && tagFilter.length > 0) ||
			dateFrom.trim().length > 0 ||
			dateTo.trim().length > 0);

	$: hasOnlySearchAsListConstraint =
		!entityLensEntityId &&
		fileSearchApplied.trim().length > 0 &&
		mimeCategoryFilter === '' &&
		hasTagsFilter === 'all';

	$: if (!hasActiveListConstraints) filesFilterUploadHintShown = false;

	/** P125-02 — deterministic size label only (display; no significance cues). */
	function formatCaseFileSizeDisplay(bytes: unknown): string {
		if (typeof bytes !== 'number' || !Number.isFinite(bytes) || bytes < 0) return '—';
		if (bytes < 1024) return `${bytes} B`;
		return `${Math.round(bytes / 1024)} KB`;
	}

	function clearEntityFilesLens(): void {
		void goto(`/case/${encodeURIComponent(caseId)}/files`, { replaceState: true });
	}

	async function loadFiles() {
		activeLoadId += 1;
		filesLoadMoreEpoch += 1;
		const loadId = activeLoadId;
		loading = true;
		loadError = '';
		isLoadingMore = false;
		loadMoreError = '';
		entityLensLabel = '';
		if (entityLensEntityId) {
			try {
				const detail = await getCaseEntityDetail(caseId, entityLensEntityId, token, { includeRetired: true });
				if (loadId !== activeLoadId) return;
				const linkedIds = new Set(caseFileIdsLinkedFromEntityEvidence(detail.evidence_links));
				const all = await listCaseFiles(caseId, token);
				if (loadId !== activeLoadId) return;
				const filtered = filterCaseFilesToEntityLinkedOnly(all, linkedIds);
				files = filtered;
				totalFiles = filtered.length;
				entityLensLabel = detail.case_entity.display_label;
				pruneEvidenceSelectionAfterFilesSync(caseId, files, false);
			} catch (e: unknown) {
				if (loadId !== activeLoadId) return;
				loadError = e instanceof Error ? e.message : 'Failed to load entity files lens.';
				files = [];
				totalFiles = 0;
				pruneEvidenceSelectionAfterFilesSync(caseId, [], false);
			} finally {
				if (loadId === activeLoadId) loading = false;
				void pushKpiStatsAfterLoad(loadId);
			}
			return;
		}
		try {
			const { files: page, totalFiles: total } = await listCaseFilesPage(
				caseId,
				token,
				listPageFetchParams(0)
			);
			if (loadId !== activeLoadId) return;
			files = sortFilesClient(page);
			totalFiles = total;
			pruneEvidenceSelectionAfterFilesSync(caseId, files, filesListHasMorePages());
		} catch (e: any) {
			if (loadId !== activeLoadId) return;
			loadError = e?.message ?? 'Failed to load files.';
			files = [];
			totalFiles = 0;
			pruneEvidenceSelectionAfterFilesSync(caseId, [], false);
		} finally {
			if (loadId === activeLoadId) loading = false;
			void pushKpiStatsAfterLoad(loadId);
		}
	}

	/** P42-03 — append next page; stale-safe (case switch / superseding loadFiles). */
	async function loadMoreFiles() {
		if (entityLensEntityId) return;
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
			files = sortFilesClient([...files, ...fresh]);
			totalFiles = total;
			pruneEvidenceSelectionAfterFilesSync(caseId, files, filesListHasMorePages());
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

	/** Infinite scroll: load next page when the sentinel nears the viewport (shared by grid + list layouts). */
	function observeLoadMoreForFiles(node: HTMLDivElement) {
		if (!browser) return {};
		const io = new IntersectionObserver(
			(entries) => {
				if (!entries.some((e) => e.isIntersecting)) return;
				void loadMoreFiles();
			},
			{ root: null, rootMargin: '280px', threshold: 0 }
		);
		io.observe(node);
		return {
			destroy() {
				io.disconnect();
			}
		};
	}

	/** P103-03 — citation → case file (+ optional explicit text span in extracted text modal). Read-only. */
	async function runRevealSequenceForP103Files(): Promise<void> {
		if (!browser || !navTargetId || revealInFlight) return;
		if (!p103RevealActive) return;
		if (loading || loadError) return;
		revealInFlight = true;
		try {
			const targetId = navTargetId;
			const span = p103NavTextSpan;
			let safety = 0;
			while (safety < 120) {
				safety += 1;
				await tick();
				if (files.some((f) => f.id === targetId)) {
					await tick();
					const hit = files.find((f) => f.id === targetId);
					synthesisContextPreview = hit ? buildSupportingFileContextPreview(hit, 'case_file') : null;
					const el = document.getElementById(`ce-case-file-${targetId}`);
					el?.scrollIntoView({ block: 'center', behavior: 'auto' });
					synthesisHighlightId = targetId;
					if (!span) {
						if (synthesisHighlightTimer) clearTimeout(synthesisHighlightTimer);
						synthesisHighlightTimer = setTimeout(() => {
							synthesisHighlightId = null;
							synthesisContextPreview = null;
							synthesisHighlightTimer = undefined;
						}, P97_SYNTHESIS_REVEAL_HIGHLIGHT_MS);
						navTargetId = null;
						p103NavTextSpan = null;
						p103RevealActive = false;
						synthesisRevealBanner = 'idle';
						await clearSynthesisNavigationPageState(get(page));
						return;
					}
					let data: Awaited<ReturnType<typeof getCaseFileText>>;
					try {
						data = await getCaseFileText(targetId, token);
					} catch {
						p103FileCitationBanner = 'span_unavailable';
						synthesisHighlightId = null;
						synthesisContextPreview = null;
						navTargetId = null;
						p103NavTextSpan = null;
						p103RevealActive = false;
						await clearSynthesisNavigationPageState(get(page));
						return;
					}
					const raw = data.extracted_text ?? '';
					if (!isCaseFileExtractedTextUsable(data.status, raw)) {
						p103FileCitationBanner = 'span_unavailable';
						synthesisHighlightId = null;
						synthesisContextPreview = null;
						navTargetId = null;
						p103NavTextSpan = null;
						p103RevealActive = false;
						await clearSynthesisNavigationPageState(get(page));
						return;
					}
					const vr = validateP103TextSpanAgainstExtractedText(span, raw);
					if (!vr.ok) {
						p103FileCitationBanner = 'span_invalid';
						synthesisHighlightId = null;
						synthesisContextPreview = null;
						navTargetId = null;
						p103NavTextSpan = null;
						p103RevealActive = false;
						await clearSynthesisNavigationPageState(get(page));
						return;
					}
					viewTextFileId = targetId;
					viewTextRawForSpan = raw;
					viewTextSpanRange = { start: span.start, end: span.end };
					viewTextContent = null;
					viewTextLoading = false;
					viewTextExtractStatus = data.status;
					void prepareViewFilePreview(targetId, hit);
					synthesisHighlightId = null;
					synthesisContextPreview = null;
					if (synthesisHighlightTimer) clearTimeout(synthesisHighlightTimer);
					synthesisHighlightTimer = undefined;
					navTargetId = null;
					p103NavTextSpan = null;
					p103RevealActive = false;
					synthesisRevealBanner = 'idle';
					await clearSynthesisNavigationPageState(get(page));
					return;
				}
				if (files.length >= totalFiles) {
					break;
				}
				if (isLoadingMore) {
					await tick();
					await new Promise((r) => setTimeout(r, 40));
					continue;
				}
				await loadMoreFiles();
				await tick();
			}
			p103FileCitationBanner = 'not_found';
			synthesisContextPreview = null;
			navTargetId = null;
			p103NavTextSpan = null;
			p103RevealActive = false;
			await clearSynthesisNavigationPageState(get(page));
		} finally {
			revealInFlight = false;
		}
	}

	async function runRevealSequenceForSynthesisFiles(): Promise<void> {
		if (!browser || !navTargetId || revealInFlight) return;
		if (p103RevealActive) return;
		if (loading || loadError) return;
		revealInFlight = true;
		try {
			const targetId = navTargetId;
			const rawIntent = get(page).state?.synthesisSourceNavigationIntent;
			synthesisFilesSourceKind = parseFilesSourceKindFromIntent(rawIntent);
			let safety = 0;
			while (safety < 120) {
				safety += 1;
				await tick();
				if (files.some((f) => f.id === targetId)) {
					await tick();
					const hit = files.find((f) => f.id === targetId);
					synthesisContextPreview = hit
						? buildSupportingFileContextPreview(hit, synthesisFilesSourceKind)
						: null;
					const el = document.getElementById(`ce-case-file-${targetId}`);
					el?.scrollIntoView({ block: 'center', behavior: 'auto' });
					synthesisHighlightId = targetId;
					if (synthesisHighlightTimer) clearTimeout(synthesisHighlightTimer);
					synthesisHighlightTimer = setTimeout(() => {
						synthesisHighlightId = null;
						synthesisContextPreview = null;
						synthesisFilesSourceKind = null;
						synthesisHighlightTimer = undefined;
					}, P97_SYNTHESIS_REVEAL_HIGHLIGHT_MS);
					navTargetId = null;
					synthesisRevealBanner = 'idle';
					await clearSynthesisNavigationPageState(get(page));
					return;
				}
				if (files.length >= totalFiles) {
					break;
				}
				if (isLoadingMore) {
					await tick();
					await new Promise((r) => setTimeout(r, 40));
					continue;
				}
				await loadMoreFiles();
				await tick();
			}
			synthesisRevealBanner = 'not_found';
			synthesisContextPreview = null;
			synthesisFilesSourceKind = null;
			navTargetId = null;
			await clearSynthesisNavigationPageState(get(page));
		} finally {
			revealInFlight = false;
		}
	}

	/** P108-02 — reload when `entityLens` query changes (same case). */
	$: if (caseId && token && prevLoadedCaseId === caseId) {
		void entityLensEntityId;
		void folderFilter;
		void reloadTick;
		void tagFilter;
		void dateFrom;
		void dateTo;
		void loadFiles();
	}

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
		const uploadOpts =
			folderFilter && folderFilter !== '__unfiled__' && folderFilter.length > 0
				? { folderId: folderFilter }
				: undefined;
		try {
			const uploaded = await uploadCaseFile(caseId, input.files[0], token, uploadOpts);
			toastUploadSuccessWithOptionalFilterHint(
				'File uploaded — select a tag',
				'It may be hidden by current search or filters.'
			);
			input.value = '';
			await loadFiles();
			onFilesMutated?.();
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
			const uploadOpts =
				folderFilter && folderFilter !== '__unfiled__' && folderFilter.length > 0
					? { folderId: folderFilter }
					: undefined;
			for (const file of dropped) {
				try {
					await uploadCaseFile(caseId, file, token, uploadOpts);
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
				onFilesMutated?.();
			}
		} finally {
			uploading = false;
		}
	}

	function onFilesZoneDragEnter(e: DragEvent) {
		if (hideUploadSection) return;
		if (!dataTransferHasFiles(e.dataTransfer)) return;
		e.preventDefault();
		e.stopPropagation();
		fileDragDepth += 1;
	}

	function onFilesZoneDragOver(e: DragEvent) {
		if (hideUploadSection) return;
		if (!dataTransferHasFiles(e.dataTransfer)) return;
		e.preventDefault();
		e.stopPropagation();
		e.dataTransfer!.dropEffect = 'copy';
	}

	function onFilesZoneDragLeave(e: DragEvent) {
		if (hideUploadSection) return;
		if (!dataTransferHasFiles(e.dataTransfer)) return;
		e.preventDefault();
		e.stopPropagation();
		fileDragDepth -= 1;
		if (fileDragDepth < 0) fileDragDepth = 0;
	}

	async function onFilesZoneDrop(e: DragEvent) {
		if (hideUploadSection) return;
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
		viewTextRawForSpan = null;
		viewTextSpanRange = null;
		viewTextContent = null;
		viewTextLoading = true;
		viewTextExtractStatus = null;
		const meta = files.find((x) => x.id === fileId);
		void prepareViewFilePreview(fileId, meta);
		try {
			const data = await getCaseFileText(fileId, token);
			viewTextExtractStatus = data.status;
			viewTextContent = buildCaseFileExtractedTextModalBody({
				status: data.status,
				message: data.message,
				extracted_text: data.extracted_text
			});
		} catch (e: any) {
			viewTextContent = `Error: ${e?.message ?? 'Failed to load'}`;
			viewTextExtractStatus = null;
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
		viewTextRawForSpan = null;
		viewTextSpanRange = null;
		viewTextExtractStatus = null;
		revokeViewPreviewObjectUrl();
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
		if (synthesisHighlightTimer) clearTimeout(synthesisHighlightTimer);
		revokeViewPreviewObjectUrl();
		revokePanePreview();
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
			removeEvidenceSelectionKey('file', f.id, caseId);
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
			onFilesMutated?.();
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

<div class="{DS_FILES_CLASSES.workspace} flex min-h-0 flex-1 flex-col overflow-hidden">
	<CaseArrivalOrientationBlock context={p99ArrivalSnapshot} testId="case-files-p99-arrival" />
	{#if entityLensEntityId}
		<CaseEntityLensBanner
			surface="files"
			caseId={caseId}
			entityId={entityLensEntityId}
			entityLabel={entityLensLabel || entityLensEntityId}
			onClear={clearEntityFilesLens}
		/>
	{/if}
	{#if !hideUploadSection}
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
	{/if}

	<div
		class="{DS_FILES_CLASSES.listControls} border-b border-[color:var(--ce-l-border-subtle)] pb-2.5"
		data-testid="case-files-list-controls"
	>
		<div class="flex w-full min-w-0 flex-nowrap items-end gap-2 sm:gap-3">
			<div
				role="group"
				aria-label="Search"
				class="flex min-h-[2.75rem] min-w-0 flex-1 flex-nowrap items-end gap-2 overflow-x-auto overflow-y-hidden overscroll-x-contain pb-px [-webkit-overflow-scrolling:touch] sm:gap-3"
			>
				<div class="w-[min(100%,20rem)] min-w-[11rem] shrink-0 sm:min-w-[12rem]">
					<label
						class="mb-0.5 block text-[10px] font-semibold uppercase tracking-[0.14em] text-[color:var(--ce-l-text-muted)]"
						for="case-files-search-input">Search</label
					>
					<div class="relative">
						<MagnifyingGlassIcon
							class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--ce-l-text-muted)]"
							aria-hidden="true"
						/>
						<input
							id="case-files-search-input"
							type="search"
							bind:value={fileSearchDraft}
							on:input={onFileSearchInput}
							disabled={!!entityLensEntityId}
							placeholder="Search files, content, or tags..."
							aria-label="Search files in this case — name, type, tag, or stored extracted text"
							autocomplete="off"
							data-testid="case-files-search-input"
							class="w-full pl-9 {DS_FILES_CLASSES.formControl} disabled:opacity-50 disabled:cursor-not-allowed"
						/>
					</div>
				</div>
			</div>
			<div
				class="flex shrink-0 flex-nowrap items-center gap-2 self-end border-l border-[color:var(--ce-l-border-subtle)] pl-2 sm:pl-3"
				role="toolbar"
				aria-label="Files list tools"
			>
				<div class="relative">
					<details bind:open={filtersPanelOpen} class="group relative">
						<summary
							class="flex cursor-pointer list-none items-center rounded-md px-3 py-2 text-sm font-medium [&::-webkit-details-marker]:hidden {filtersPanelOpen
								? DS_BTN_CLASSES.primary
								: DS_BTN_CLASSES.secondary}"
							data-testid="case-files-filters-toggle"
							aria-expanded={filtersPanelOpen}
							aria-controls="case-files-filter-fields"
						>
							Filters
						</summary>
						<div
							id="case-files-filter-fields"
							class="absolute right-0 top-full z-[50] mt-1 w-[min(calc(100vw-2rem),22rem)] max-h-[min(70vh,32rem)] overflow-y-auto rounded-lg border border-[color:var(--ce-l-border-strong)] bg-[color:var(--ce-l-surface-elevated)] p-3 shadow-xl"
							data-testid="case-files-filter-fields"
							on:click|stopPropagation
						>
							<p class="m-0 mb-2 text-[10px] font-semibold uppercase tracking-wide text-[color:var(--ce-l-text-muted)]">
								Refine list
							</p>
							<div class="flex flex-col gap-3">
								<fieldset class="m-0 border-0 p-0">
									<legend
										class="mb-1 block w-max text-[10px] font-semibold uppercase tracking-[0.14em] text-[color:var(--ce-l-text-muted)]"
									>
										Date range
									</legend>
									<div class="flex flex-wrap items-center gap-2">
										<input
											type="date"
											bind:value={dateFrom}
											on:change={onListFiltersChange}
											disabled={!!entityLensEntityId}
											class="min-h-[2.25rem] w-full min-w-[10rem] flex-1 {DS_FILES_CLASSES.formControl} py-1.5 text-sm disabled:opacity-50"
											data-testid="case-files-filter-date-from"
											aria-label="Date from"
										/>
										<span class="shrink-0 text-xs text-[color:var(--ce-l-text-muted)]" aria-hidden="true">→</span>
										<input
											type="date"
											bind:value={dateTo}
											on:change={onListFiltersChange}
											disabled={!!entityLensEntityId}
											class="min-h-[2.25rem] w-full min-w-[10rem] flex-1 {DS_FILES_CLASSES.formControl} py-1.5 text-sm disabled:opacity-50"
											data-testid="case-files-filter-date-to"
											aria-label="Date to"
										/>
									</div>
								</fieldset>
								<div class="min-w-0">
									<span
										class="mb-1 block text-[10px] font-semibold uppercase tracking-[0.14em] text-[color:var(--ce-l-text-muted)]"
										>Type</span
									>
									<select
										bind:value={mimeCategoryFilter}
										on:change={onListFiltersChange}
										disabled={!!entityLensEntityId}
										aria-label="Filter by file type category"
										data-testid="case-files-filter-mime-category"
										class="min-h-[2.25rem] w-full {DS_FILES_CLASSES.formControl} py-1.5 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
									>
										<option value="">All types</option>
										<option value="image">Image</option>
										<option value="video">Video</option>
										<option value="audio">Audio</option>
										<option value="document">Document</option>
										<option value="other">Other</option>
									</select>
								</div>
								<div class="min-w-0">
									<span
										class="mb-1 block text-[10px] font-semibold uppercase tracking-[0.14em] text-[color:var(--ce-l-text-muted)]"
										>Tags</span
									>
									<select
										bind:value={hasTagsFilter}
										on:change={onListFiltersChange}
										disabled={!!entityLensEntityId}
										aria-label="Filter by tags"
										data-testid="case-files-filter-has-tags"
										class="min-h-[2.25rem] w-full {DS_FILES_CLASSES.formControl} py-1.5 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
									>
										<option value="all">All tags</option>
										<option value="with">With tags</option>
										<option value="without">Without tags</option>
									</select>
								</div>
							</div>
						</div>
					</details>
				</div>
				<button
					type="button"
					class="{DS_BTN_CLASSES.ghost} py-2 text-sm font-medium text-[color:var(--ce-l-text-muted)] hover:text-[color:var(--ce-l-text-primary)]"
					disabled={!!entityLensEntityId}
					data-testid="case-files-clear-filters"
					on:click={clearWorkspaceFilters}
				>
					Clear
				</button>
				{#if !entityLensEntityId && p109FileSelectionCount > 0}
					<div
						class="flex max-w-full flex-wrap items-center gap-1.5"
						role="group"
						aria-label="Manual file selection for evidence grouping"
						data-testid="case-files-p109-selection-actions"
					>
						<span
							class="inline-flex max-w-[min(100%,14rem)] items-center truncate rounded-full border border-sky-500/35 bg-sky-500/[0.09] px-2.5 py-1 text-[11px] font-medium text-sky-900 dark:border-sky-400/35 dark:bg-sky-400/10 dark:text-sky-100"
							role="status"
							data-testid="case-files-p109-selection-hint"
							title="Marked for manual evidence packaging (this session). Save a grouping on the Evidence sets page."
						>
							{p109FileSelectionCount}
							{p109FileSelectionCount === 1 ? ' file' : ' files'} for evidence
						</span>
						<a
							href={`/case/${caseId}/evidence-sets`}
							class="{DS_BTN_CLASSES.secondary} shrink-0 whitespace-nowrap px-2.5 py-1 text-xs font-semibold"
							data-testid="case-files-p109-open-evidence-sets"
							data-sveltekit-preload-data="hover"
							title="Name your grouping and create a saved set from the current selection (session picks plus any timeline rows you selected)."
						>
							{P109_EVIDENCE_SETS_FILES_TAB_OPEN_LINK}
						</a>
						<button
							type="button"
							class="{DS_BTN_CLASSES.ghost} shrink-0 whitespace-nowrap px-2 py-1 text-xs font-medium text-[color:var(--ce-l-text-muted)] hover:text-[color:var(--ce-l-text-primary)]"
							data-testid="case-files-p109-clear-selection"
							on:click={() => clearEvidenceSelection()}
						>
							{P109_EVIDENCE_SELECTION_CLEAR}
						</button>
					</div>
				{/if}
				<label class="m-0 flex items-center gap-1.5 text-xs text-[color:var(--ce-l-text-muted)]">
					<span class="whitespace-nowrap">Sort</span>
					<select
						bind:value={fileSort}
						on:change={onFileSortChange}
						disabled={!!entityLensEntityId}
						aria-label="Sort files"
						data-testid="case-files-sort"
						class="rounded border border-[color:var(--ce-l-border-strong)] bg-[color:var(--ce-l-surface-elevated)] py-1 pl-1.5 pr-6 text-xs font-medium text-[color:var(--ce-l-text-primary)] disabled:opacity-50"
					>
						<option value="newest">Newest</option>
						<option value="oldest">Oldest</option>
						<option value="name">Name</option>
					</select>
				</label>
				<div
					class="inline-flex rounded-full border border-[color:var(--ce-l-border-strong)] bg-[color:var(--ce-l-surface-elevated)]/60 p-1"
					role="group"
					aria-label="File browser layout"
					data-testid="case-files-layout-toggle"
				>
					<button
						type="button"
						class="rounded-full px-3 py-1.5 text-xs font-semibold transition {filesLayout === 'list'
							? 'bg-[color:var(--ce-l-surface-elevated)] text-[color:var(--ce-l-text-primary)] shadow-sm'
							: 'text-[color:var(--ce-l-text-muted)] hover:text-[color:var(--ce-l-text-primary)]'}"
						aria-pressed={filesLayout === 'list'}
						on:click={() => (filesLayout = 'list')}
					>List</button
					>
					<button
						type="button"
						class="rounded-full px-3 py-1.5 text-xs font-semibold transition {filesLayout === 'grid'
							? 'bg-[color:var(--ce-l-surface-elevated)] text-[color:var(--ce-l-text-primary)] shadow-sm'
							: 'text-[color:var(--ce-l-text-muted)] hover:text-[color:var(--ce-l-text-primary)]'}"
						aria-pressed={filesLayout === 'grid'}
						on:click={() => (filesLayout = 'grid')}
					>Grid</button
					>
				</div>
			</div>
		</div>
	</div>

	{#if !entityLensEntityId && fileSearchApplied.trim().length > 0}
		<div
			class="mb-3 rounded-md border border-[color:var(--ce-l-border-strong)] px-3 py-2 text-xs leading-snug text-[color:var(--ce-l-text-muted)]"
			data-testid="case-files-search-source-framing"
			role="status"
		>
			{P125_FILE_SEARCH_ACTIVE_FRAMING}
		</div>
	{/if}

	{#if synthesisNavigationEnabled && synthesisRevealBanner === 'not_found'}
		<div
			class="rounded-md border border-amber-200 dark:border-amber-800/80 bg-amber-50/90 dark:bg-amber-950/40 px-3 py-2 text-sm text-amber-950 dark:text-amber-100 mb-3"
			role="status"
			data-testid="synthesis-files-reveal-not-found"
		>
			{P103_REVEAL_NOT_FOUND_FILES_SYNTHESIS_COPY}
		</div>
	{/if}

	{#if synthesisNavigationEnabled && p103FileCitationBanner === 'not_found'}
		<div
			class="rounded-md border border-amber-200 dark:border-amber-800/80 bg-amber-50/90 dark:bg-amber-950/40 px-3 py-2 text-sm text-amber-950 dark:text-amber-100 mb-3"
			role="status"
			data-testid="p103-files-reveal-not-found"
		>
			{P103_REVEAL_NOT_FOUND_FILES_CITATION_COPY}
		</div>
	{/if}

	{#if synthesisNavigationEnabled && p103FileCitationBanner === 'span_invalid'}
		<div
			class="rounded-md border border-amber-200 dark:border-amber-800/80 bg-amber-50/90 dark:bg-amber-950/40 px-3 py-2 text-sm text-amber-950 dark:text-amber-100 mb-3"
			role="status"
			data-testid="p103-files-span-invalid"
		>
			{P103_FILES_SPAN_INVALID_COPY}
		</div>
	{/if}

	{#if synthesisNavigationEnabled && p103FileCitationBanner === 'span_unavailable'}
		<div
			class="rounded-md border border-amber-200 dark:border-amber-800/80 bg-amber-50/90 dark:bg-amber-950/40 px-3 py-2 text-sm text-amber-950 dark:text-amber-100 mb-3"
			role="status"
			data-testid="p103-files-span-unavailable"
		>
			{P103_FILES_SPAN_UNAVAILABLE_COPY}
		</div>
	{/if}

	<div
		class="flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row"
		data-testid="case-files-main-split"
	>
		<div class="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto">
	{#if loading}
		<CaseLoadingState label="Loading files…" />
	{:else if loadError}
		<CaseErrorState title="Failed to load files" message={loadError} onRetry={loadFiles} />
	{:else}
		{#if files.length === 0}
			{#if entityLensEntityId}
				<CaseEmptyState
					title={P108_ENTITY_FILES_LENS_EMPTY_TITLE}
					description={P108_ENTITY_FILES_LENS_EMPTY}
					testId="case-files-entity-lens-empty"
				/>
			{:else}
				<CaseEmptyState
					title={hasActiveListConstraints ? P125_FILES_EMPTY_FILTERED_TITLE : P125_FILES_EMPTY_TITLE}
					description={hasActiveListConstraints
						? hasOnlySearchAsListConstraint
							? P125_FILE_SEARCH_EMPTY_DESCRIPTION
							: P125_FILES_EMPTY_FILTERED_DESCRIPTION
						: P125_FILES_EMPTY_DESCRIPTION}
				/>
			{/if}
		{:else}
		<div
			class={filesLayout === 'grid'
				? 'grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4'
				: 'flex flex-col gap-4'}
			data-files-layout={filesLayout}
		>
			{#each files as f (f.id)}
				{@const thumbK = fileThumbKind(f)}
				{@const extBadge = caseFileExtLabel(f.original_filename, f.mime_type).toUpperCase()}
				{@const fileEvidenceOn = isEvidenceSelected($evidenceSelection, 'file', f.id)}
				<div
					id={`ce-case-file-${f.id}`}
					class="{filesLayout === 'grid'
						? 'group/card relative flex min-h-0 flex-col overflow-hidden rounded-xl border border-[color:var(--ce-l-border-subtle)] bg-[color:var(--ce-l-surface-elevated)] shadow-md'
						: DS_FILES_CLASSES.fileCard}{synthesisHighlightId === f.id ? ' ds-p97-synthesis-nav-reveal' : ''}{paneFileId === f.id
						? ' ring-2 ring-[color:var(--ce-l-border-strong)] ring-offset-2 ring-offset-[color:var(--ce-l-surface-raised)]'
						: ''}{fileEvidenceOn
						? ' transition-shadow [box-shadow:0_0_0_2px_rgba(56,189,248,0.5),0_0_22px_-4px_rgba(59,130,246,0.35)]'
						: ''}"
				>
				{#if synthesisNavigationEnabled && synthesisHighlightId === f.id && synthesisContextPreview}
					<SynthesisNavigationContextPreview
						role="supporting"
						surface="files"
						headline={synthesisContextPreview.headline}
						lines={synthesisContextPreview.lines}
					/>
				{/if}
				{#if filesLayout === 'grid'}
				<div class="relative px-2.5 pt-2">
					<button
						type="button"
						class="relative z-0 block w-full overflow-hidden rounded-xl text-left transition hover:opacity-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--ce-l-border-strong)]"
						data-testid="case-file-row-open-view"
						on:click={() => selectPreviewPane(f)}
					>
						<CaseFileGridThumb
							fileId={f.id}
							{token}
							thumbKind={thumbK}
							fetchEnabled={!entityLensEntityId && !!token}
							durationMsHint={thumbK === 'video' ? (f.duration_ms ?? null) : null}
						/>
						<span
							class="pointer-events-none absolute left-[3.25rem] top-2 z-10 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide {gridExtBadgeClass(thumbK)}"
							aria-hidden="true"
						>{extBadge}</span>
						<div
							class="pointer-events-none absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent px-2 pb-2 pt-12"
							aria-hidden="true"
						></div>
						{#if !entityLensEntityId}
							<span
								class="pointer-events-none absolute bottom-2 left-2 z-10 max-w-[calc(100%-2.75rem)] truncate rounded border border-white/25 bg-black/50 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white backdrop-blur-[2px]"
								title={gridCategoryLabel(f)}
							>
								{gridCategoryLabel(f)}
							</span>
							<span class="pointer-events-none absolute bottom-2 right-2 z-10 text-white/95" aria-hidden="true">
								<LinkIcon class="h-4 w-4 drop-shadow-md" />
							</span>
						{/if}
					</button>
					<!-- On-picture controls: sibling layer above thumb so z-index + pointer-events stay predictable -->
					<div
						class="pointer-events-none absolute inset-0 z-[32] flex items-start justify-between gap-2 p-1.5 sm:p-2"
					>
						{#if isCaseFileSelectableForEvidence(f)}
							<label
								class="pointer-events-auto flex min-h-[2.75rem] min-w-[2.75rem] cursor-pointer touch-manipulation select-none items-center justify-center rounded-xl border p-1.5 shadow-[0_2px_12px_rgba(0,0,0,0.45)] backdrop-blur-[3px] transition {fileEvidenceOn
									? 'opacity-100 border-sky-400/60 bg-black/50 ring-2 ring-sky-400/35'
									: 'border-white/25 bg-black/55 ring-1 ring-black/40 opacity-0 transition-opacity duration-150 group-hover/card:opacity-100 has-[:focus-visible]:opacity-100 [@media(hover:none)]:opacity-100'}"
								title={P109_EVIDENCE_SELECTION_FILE_TOGGLE_TITLE}
								data-testid="case-file-manual-evidence-select"
							>
								<input
									type="checkbox"
									class="ce-case-file-evidence-marker ce-case-file-evidence-marker--grid"
									checked={fileEvidenceOn}
									data-p109-selected={fileEvidenceOn ? 'true' : 'false'}
									aria-label="Select this file for manual evidence packaging (this session only)"
									on:click|stopPropagation={(e) => {
										e.preventDefault();
										toggleEvidenceSelection('file', f.id, caseId);
									}}
								/>
							</label>
						{:else}
							<span class="pointer-events-none min-h-0 min-w-0 shrink-0" aria-hidden="true"></span>
						{/if}
						<details
							class="group pointer-events-auto relative z-[33] opacity-0 transition-opacity duration-150 group-hover/card:opacity-100 open:opacity-100 [@media(hover:none)]:opacity-100"
						>
							<summary
								class="flex h-10 w-10 cursor-pointer list-none items-center justify-center rounded-lg border border-white/25 bg-black/35 text-white shadow-md backdrop-blur-sm transition hover:bg-black/50 [&::-webkit-details-marker]:hidden"
								aria-label="File actions"
								on:click|stopPropagation
							>
								<EllipsisVerticalIcon class="h-6 w-6 shrink-0 drop-shadow-md" aria-hidden="true" />
							</summary>
							<div
								class="absolute right-0 top-full z-[40] mt-1 min-w-[12rem] rounded-lg border border-[color:var(--ce-l-border-strong)] bg-[color:var(--ce-l-surface-elevated)] py-1 shadow-lg"
								role="menu"
								on:click|stopPropagation
							>
								<button
									type="button"
									role="menuitem"
									class="block w-full px-3 py-1.5 text-left text-xs hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
									on:click={(e) => {
										handleDownload(f);
										closeGridFileKebab(e);
									}}
								>
									Download
								</button>
								<button
									type="button"
									role="menuitem"
									class="block w-full px-3 py-1.5 text-left text-xs hover:bg-black/[0.04] text-red-600 dark:text-red-400 dark:hover:bg-white/[0.06]"
									disabled={deletingFileId === f.id}
									data-testid="case-file-delete-btn"
									on:click={(e) => {
										closeGridFileKebab(e);
										requestDeleteFile(f);
									}}
								>
									{deletingFileId === f.id ? 'Deleting…' : 'Delete'}
								</button>
								<button
									type="button"
									role="menuitem"
									class="block w-full px-3 py-1.5 text-left text-xs hover:bg-black/[0.04] disabled:opacity-50 dark:hover:bg-white/[0.06]"
									disabled={!isCaseFileLikelyExtractable(f.original_filename, f.mime_type) || extractingId === f.id}
									on:click={(e) => {
										closeGridFileKebab(e);
										handleExtract(f);
									}}
								>
									{extractingId === f.id ? 'Extracting…' : 'Extract text'}
								</button>
								<button
									type="button"
									role="menuitem"
									class="block w-full px-3 py-1.5 text-left text-xs hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
									on:click={(e) => {
										closeGridFileKebab(e);
										handleViewText(f);
									}}
								>
									View extracted text
								</button>
								<button
									type="button"
									role="menuitem"
									class="block w-full px-3 py-1.5 text-left text-xs hover:bg-black/[0.04] disabled:opacity-50 dark:hover:bg-white/[0.06]"
									disabled={isFileProposeLocked(f) || f.extraction_status !== 'extracted'}
									data-testid="propose-timeline-from-file-btn"
									on:click={(e) => {
										closeGridFileKebab(e);
										runProposeTimeline(f, false);
									}}
								>
									{isFileProposeLocked(f)
										? proposeWorkflow.step === 'processing' && proposingFileId === f.id
											? 'Proposing…'
											: 'Pending…'
										: 'Propose timeline entries'}
								</button>
							</div>
						</details>
					</div>
				</div>
				<div class="min-w-0 px-2.5 pb-1 pt-2.5">
					<p
						class="m-0 truncate text-sm font-semibold leading-tight text-[color:var(--ce-l-text-primary)]"
						data-testid="case-file-row-name"
					>
						{f.original_filename}
					</p>
					<div
						class="m-0 mt-1 flex min-w-0 flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5"
					>
						<p class="m-0 min-w-0 flex-1 text-[11px] tabular-nums text-[color:var(--ce-l-text-muted)]">
							{formatCaseDateOnly(String(f.uploaded_at ?? ''))} · {formatCaseFileSizeDisplay(f.file_size_bytes)}
						</p>
						{#if !entityLensEntityId}
							<details
								class="relative shrink-0"
								open={gridFolderPickerOpenFor === f.id}
								on:toggle={(e) => {
									const el = e.currentTarget as HTMLDetailsElement;
									gridFolderPickerOpenFor = el.open ? f.id : null;
								}}
							>
								<summary
									class="{DS_BTN_CLASSES.ghost} inline-flex max-w-[11rem] min-h-0 list-none items-center truncate px-1 py-0 text-[11px] font-medium leading-none text-[color:var(--ce-l-text-muted)] hover:text-[color:var(--ce-l-text-primary)] [&::-webkit-details-marker]:hidden"
									data-testid="case-file-grid-folder-trigger"
									on:click|stopPropagation
								>
									{#if !(f.folder_id as string | undefined)}
										+ folder
									{:else}
										{gridFolderLabel(f)}
									{/if}
								</summary>
								<div
									class="absolute right-0 top-full z-40 mt-0.5 min-w-[12rem] rounded-lg border border-[color:var(--ce-l-border-strong)] bg-[color:var(--ce-l-surface-elevated)] p-2 shadow-lg"
									on:click|stopPropagation
								>
									<select
										class="w-full min-w-0 {DS_FILES_CLASSES.formControl} py-1 text-xs disabled:opacity-50"
										disabled={movingFileId === f.id || moveFolderListLoading}
										value={(f.folder_id as string | undefined) ?? ''}
										aria-label="Move file to folder"
										data-testid="case-file-move-folder-select"
										data-file-id={f.id}
										on:click|stopPropagation
										on:change|stopPropagation={(e) => void onMoveFileFolderSelect(f, e)}
									>
										<option value="">Unfiled</option>
										{#each moveFolders as mf (mf.id)}
											<option value={mf.id}>{mf.name}</option>
										{/each}
									</select>
								</div>
							</details>
						{/if}
					</div>
				</div>
				<FilesDeclaredRelationshipsBlock {caseId} fileId={f.id} />
				{:else}
				<!-- P125-02 — list row: kebab under checkbox, type pill top-right, size only; folder + row actions in menu -->
				<div class="flex gap-2 sm:gap-3">
					<div class="relative flex w-9 shrink-0 flex-col items-center gap-1 pt-0.5">
						{#if isCaseFileSelectableForEvidence(f)}
							<label
								class="inline-flex cursor-pointer items-center"
								title={P109_EVIDENCE_SELECTION_FILE_TOGGLE_TITLE}
								data-testid="case-file-manual-evidence-select"
							>
								<input
									type="checkbox"
									class="ce-case-file-evidence-marker ce-case-file-evidence-marker--list"
									checked={fileEvidenceOn}
									data-p109-selected={fileEvidenceOn ? 'true' : 'false'}
									aria-label="Select this file for manual evidence packaging (this session only)"
									on:click|stopPropagation={(e) => {
										e.preventDefault();
										toggleEvidenceSelection('file', f.id, caseId);
									}}
								/>
							</label>
						{/if}
						<details class="group z-20">
							<summary
								class="flex h-8 w-8 cursor-pointer list-none items-center justify-center rounded-md border border-[color:var(--ce-l-border-subtle)] bg-[color:var(--ce-l-surface-raised)] text-[color:var(--ce-l-text-muted)] shadow-sm hover:bg-black/[0.05] dark:hover:bg-white/[0.06] [&::-webkit-details-marker]:hidden"
								aria-label="File actions"
								data-testid="case-file-list-actions-menu"
								on:click|stopPropagation
							>
								<EllipsisVerticalIcon class="h-5 w-5 shrink-0" aria-hidden="true" />
							</summary>
							<div
								class="absolute left-0 top-full z-30 mt-1 min-w-[14rem] rounded-lg border border-[color:var(--ce-l-border-strong)] bg-[color:var(--ce-l-surface-elevated)] py-1 shadow-lg"
								role="menu"
								on:click|stopPropagation
							>
								{#if !entityLensEntityId}
									<div
										class="border-b border-[color:var(--ce-l-border-subtle)] px-3 py-2"
										role="none"
										on:click|stopPropagation
									>
										<span
											class="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-[color:var(--ce-l-text-muted)]"
											>Folder</span
										>
										<select
											class="w-full min-w-0 {DS_FILES_CLASSES.formControl} py-1 text-xs disabled:opacity-50"
											disabled={movingFileId === f.id || moveFolderListLoading}
											value={(f.folder_id as string | undefined) ?? ''}
											aria-label="Move file to folder"
											data-testid="case-file-move-folder-select"
											data-file-id={f.id}
											on:click|stopPropagation
											on:change|stopPropagation={(e) => void onMoveFileFolderSelect(f, e)}
										>
											<option value="">Unfiled</option>
											{#each moveFolders as mf (mf.id)}
												<option value={mf.id}>{mf.name}</option>
											{/each}
										</select>
									</div>
								{/if}
								<button
									type="button"
									role="menuitem"
									class="block w-full px-3 py-1.5 text-left text-xs hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
									on:click={(e) => {
										handleDownload(f);
										closeGridFileKebab(e);
									}}
								>
									Download
								</button>
								<button
									type="button"
									role="menuitem"
									class="block w-full px-3 py-1.5 text-left text-xs hover:bg-black/[0.04] text-red-600 dark:text-red-400 dark:hover:bg-white/[0.06]"
									disabled={deletingFileId === f.id}
									data-testid="case-file-delete-btn"
									on:click={(e) => {
										closeGridFileKebab(e);
										requestDeleteFile(f);
									}}
								>
									{deletingFileId === f.id ? 'Deleting…' : 'Delete'}
								</button>
								<button
									type="button"
									role="menuitem"
									class="block w-full px-3 py-1.5 text-left text-xs hover:bg-black/[0.04] disabled:opacity-50 dark:hover:bg-white/[0.06]"
									disabled={!isCaseFileLikelyExtractable(f.original_filename, f.mime_type) || extractingId === f.id}
									title={!isCaseFileLikelyExtractable(f.original_filename, f.mime_type)
										? 'Text extraction is not supported for this file type'
										: undefined}
									on:click={(e) => {
										closeGridFileKebab(e);
										handleExtract(f);
									}}
								>
									{extractingId === f.id ? 'Extracting…' : 'Extract text'}
								</button>
								<button
									type="button"
									role="menuitem"
									class="block w-full px-3 py-1.5 text-left text-xs hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
									on:click={(e) => {
										closeGridFileKebab(e);
										handleViewText(f);
									}}
								>
									View extracted text
								</button>
								<button
									type="button"
									role="menuitem"
									class="block w-full px-3 py-1.5 text-left text-xs hover:bg-black/[0.04] disabled:opacity-50 dark:hover:bg-white/[0.06]"
									disabled={isFileProposeLocked(f) || f.extraction_status !== 'extracted'}
									title={f.extraction_status !== 'extracted'
										? 'Extract text first, then propose timeline entries'
										: 'Create pending timeline proposals (review in Proposals tab)'}
									data-testid="propose-timeline-from-file-btn"
									on:click={(e) => {
										closeGridFileKebab(e);
										runProposeTimeline(f, false);
									}}
								>
									{isFileProposeLocked(f)
										? proposeWorkflow.step === 'processing' && proposingFileId === f.id
											? 'Proposing…'
											: 'Pending…'
										: 'Propose timeline entries'}
								</button>
							</div>
						</details>
					</div>
					<div class="flex min-w-0 flex-1 flex-col gap-1">
						<div class="flex items-start justify-between gap-2">
							<button
								type="button"
								class="min-w-0 flex-1 rounded-md border border-transparent p-1.5 text-left transition hover:bg-black/[0.04] focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--ce-l-border-strong)] dark:hover:bg-white/[0.06]"
								data-testid="case-file-row-open-view"
								aria-label="Open preview for {f.original_filename}"
								on:click={() => selectPreviewPane(f)}
							>
								<p
									class="m-0 min-w-0 truncate text-sm font-medium {DS_TYPE_CLASSES.section}"
									data-testid="case-file-row-name"
								>
									{f.original_filename}
								</p>
								<p
									class="m-0 mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-0.5 text-xs tabular-nums {DS_TYPE_CLASSES.meta}"
									data-testid="case-file-row-metadata"
								>
									<span>
										<span class="text-[color:var(--ce-l-text-muted)]">{P125_FILES_LABEL_SIZE}</span>
										<span class="ml-1 {DS_TYPE_CLASSES.mono}">{formatCaseFileSizeDisplay(f.file_size_bytes)}</span>
									</span>
									<time
										class="text-[color:var(--ce-l-text-muted)]"
										datetime={String(f.uploaded_at ?? '')}
										title={P125_FILES_LABEL_UPLOADED}
									>
										{formatCaseDateTime(String(f.uploaded_at ?? ''))}
									</time>
								</p>
							</button>
							<div class="flex min-w-0 max-w-[min(100%,20rem)] shrink-0 flex-col items-end gap-1">
								<span
									class="shrink-0 rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide {gridExtBadgeClass(
										thumbK
									)}"
									title={f.mime_type ?? caseFileExtLabel(f.original_filename, f.mime_type)}
								>
									{extBadge}
								</span>
								<div
									class="{DS_FILES_CLASSES.tagRow} flex w-full flex-row flex-wrap items-center justify-end gap-x-2 gap-y-1"
								>
									<div class="flex min-w-0 flex-wrap items-center justify-end gap-x-2 gap-y-1">
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
							</div>
						</div>
					</div>
				<div class="min-w-0 pl-11 sm:pl-12">
					<FilesDeclaredRelationshipsBlock {caseId} fileId={f.id} compact />
				</div>
				</div>
				{/if}
				<!-- Tags — grid only; list shows tags under the type pill -->
				{#if filesLayout === 'grid'}
				<div
					class="{DS_FILES_CLASSES.tagRow} border-t border-[color:var(--ce-l-border-subtle)] px-2.5 pb-2.5 pt-2"
				>
					<div class="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1">
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
				{/if}
				</div>
			{/each}
			{#if loadMoreError}
				<p class="px-1 text-xs {DS_STATUS_TEXT_CLASSES.danger}" data-testid="case-files-load-more-error">
					{loadMoreError}
				</p>
			{/if}
			{#if !entityLensEntityId && files.length > 0 && files.length < totalFiles}
				<div
					class="h-2 w-full shrink-0"
					aria-hidden="true"
					data-testid="case-files-scroll-load-sentinel"
					use:observeLoadMoreForFiles
				></div>
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
			<CaseFilesInsightsStrip {files} {caseInsights} {caseInsightsLoading} />
	{/if}
		</div>
		<CaseFilesPreviewPane
			{caseId}
			{token}
			file={paneFileMeta}
			previewPhase={panePreviewPhase}
			previewObjectUrl={panePreviewObjectUrl}
			previewHtml={panePreviewHtml}
			previewKind={panePreviewKind}
			formatSize={formatCaseFileSizeDisplay}
			onClose={closePreviewPane}
			onOpenInNewTab={openPreviewInNewTab}
			onDownload={() => {
				if (paneFileMeta) void handleDownload(paneFileMeta);
			}}
			onOpenFullView={() => {
				if (paneFileId) void loadExtractedTextIntoModal(paneFileId);
			}}
		/>
	</div>
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

<!-- P125-03 — Read-only view: identity + optional source preview + extracted text (raw). -->
{#if viewTextFileId}
	<div
		class="{DS_FILES_CLASSES.modalOverlay}"
		role="dialog"
		aria-modal="true"
		aria-labelledby="case-file-view-dialog-title"
		on:click={(e) => e.target === e.currentTarget && closeViewText()}
		on:keydown={(e) => e.key === 'Escape' && closeViewText()}
		tabindex="-1"
	>
		<div class="{DS_FILES_CLASSES.extractedPanel} max-w-4xl" on:click|stopPropagation>
			<div class="{DS_FILES_CLASSES.extractedHeader}">
				<h2 id="case-file-view-dialog-title" class="font-semibold {DS_TYPE_CLASSES.section}">
					{P125_FILE_VIEW_MODAL_TITLE}
				</h2>
				<div class="flex items-center gap-2">
					<button
						type="button"
						class="{DS_BTN_CLASSES.secondary} px-2.5 py-1 text-xs"
						data-testid="case-file-view-download-btn"
						on:click={() => void handleDownloadFromViewModal()}
					>
						{P125_FILE_VIEW_DOWNLOAD_ORIGINAL}
					</button>
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
			</div>
			<div class="{DS_FILES_CLASSES.extractedBody} space-y-4">
				<section class="space-y-2" data-testid="case-file-view-identity">
					<h3
						class="m-0 text-[10px] font-semibold uppercase tracking-wide text-[color:var(--ce-l-text-muted)]"
					>
						{P125_FILE_VIEW_IDENTITY_HEADING}
					</h3>
					<p
						class="m-0 truncate text-sm font-medium text-[color:var(--ce-l-text-primary)]"
						data-testid="case-file-view-name"
					>
						{viewTextFileMeta?.original_filename ?? viewTextFileId}
					</p>
					{#if viewTextFileMeta}
						<dl
							class="m-0 grid max-w-lg grid-cols-[5.5rem_1fr] gap-x-2 gap-y-1 text-xs {DS_TYPE_CLASSES.meta}"
						>
							<dt class="text-[color:var(--ce-l-text-muted)]">{P125_FILES_LABEL_TYPE}</dt>
							<dd class="m-0 {DS_TYPE_CLASSES.mono}" title={viewTextFileMeta.mime_type ?? undefined}>
								{caseFileExtLabel(viewTextFileMeta.original_filename, viewTextFileMeta.mime_type)}
							</dd>
							<dt class="text-[color:var(--ce-l-text-muted)]">{P125_FILES_LABEL_UPLOADED}</dt>
							<dd class="m-0">
								{formatCaseDateTime(String(viewTextFileMeta.uploaded_at ?? ''))}
							</dd>
							<dt class="text-[color:var(--ce-l-text-muted)]">{P125_FILES_LABEL_SIZE}</dt>
							<dd class="m-0 {DS_TYPE_CLASSES.mono}">
								{formatCaseFileSizeDisplay(viewTextFileMeta.file_size_bytes)}
							</dd>
						</dl>
					{/if}
				</section>

				<section
					class="space-y-2 rounded-md border border-[color:var(--ce-l-border-strong)] p-3"
					data-testid="case-file-view-preview"
				>
					<h3
						class="m-0 text-[10px] font-semibold uppercase tracking-wide text-[color:var(--ce-l-text-muted)]"
					>
						{P125_FILE_VIEW_PREVIEW_HEADING}
					</h3>
					{#if viewPreviewPhase === 'loading'}
						<p class="m-0 text-xs {DS_TYPE_CLASSES.meta}">{P125_FILE_VIEW_PREVIEW_LOADING}</p>
					{:else if viewPreviewPhase === 'ready' && (viewPreviewObjectUrl || (viewPreviewKind === 'docx' && viewPreviewHtml))}
						{#if viewPreviewKind === 'docx' && viewPreviewHtml}
							<div
								class="max-h-80 overflow-y-auto rounded border border-[color:var(--ce-l-border-strong)] bg-[color:var(--ce-l-surface-elevated)] px-3 py-3 text-left text-[13px] leading-relaxed text-[color:var(--ce-l-text-primary)] [overflow-wrap:anywhere] [&_img]:max-h-48 [&_img]:max-w-full [&_p]:my-2 [&_p:first-child]:mt-0 [&_h1]:mb-2 [&_h1]:text-base [&_h1]:font-semibold [&_h2]:mb-2 [&_h2]:text-sm [&_h2]:font-semibold [&_ul]:my-2 [&_ol]:my-2 [&_li]:my-0.5 [&_table]:w-full [&_table]:text-xs [&_table]:border-collapse [&_td]:border [&_td]:border-[color:var(--ce-l-border-subtle)] [&_td]:p-1.5"
								data-testid="case-file-view-docx-html"
							>
								{@html viewPreviewHtml}
							</div>
						{:else if viewPreviewKind === 'image' && viewPreviewObjectUrl}
							<img
								src={viewPreviewObjectUrl}
								alt={P125_FILE_VIEW_PREVIEW_IMG_ALT}
								class="max-h-72 max-w-full rounded border border-[color:var(--ce-l-border-strong)] object-contain"
							/>
						{:else if viewPreviewKind === 'pdf' && viewPreviewObjectUrl}
							<iframe
								title={P125_FILE_VIEW_PREVIEW_HEADING}
								class="h-80 w-full rounded border border-[color:var(--ce-l-border-strong)]"
								src={viewPreviewObjectUrl}
							></iframe>
						{/if}
					{:else if viewPreviewPhase === 'error'}
						<p class="m-0 text-xs {DS_TYPE_CLASSES.meta}">{P125_FILE_VIEW_PREVIEW_ERROR}</p>
					{:else}
						<p class="m-0 text-xs {DS_TYPE_CLASSES.meta}">{P125_FILE_VIEW_PREVIEW_UNSUPPORTED}</p>
					{/if}
				</section>

				<section
					class="space-y-2 rounded-md border border-[color:var(--ce-l-border-strong)] p-3"
					data-testid="case-file-view-extracted"
					aria-label={P125_FILE_VIEW_EXTRACTED_HEADING}
				>
					<h3
						class="m-0 text-[10px] font-semibold uppercase tracking-wide text-[color:var(--ce-l-text-muted)]"
					>
						{P125_FILE_VIEW_EXTRACTED_HEADING}
					</h3>
					<p class="m-0 text-xs leading-snug text-[color:var(--ce-l-text-muted)]">
						{P125_FILE_VIEW_EXTRACTED_SUPPORT}
					</p>
					{#if viewTextLoading}
						<div class="{DS_TYPE_CLASSES.meta}">Loading...</div>
					{:else if viewTextSpanRange !== null && viewTextRawForSpan !== null}
						<pre
							class="{DS_FILES_CLASSES.extractedPre} border-t border-[color:var(--ce-l-border-strong)] pt-3"
							data-testid="case-file-extracted-text-body"
							><span>{viewTextRawForSpan.slice(0, viewTextSpanRange.start)}</span><mark
								class="rounded border border-[color:var(--ce-l-border-strong)] bg-[color:var(--ds-bg-muted)] px-0.5"
								data-testid="case-file-extracted-text-span-mark">{viewTextRawForSpan.slice(
									viewTextSpanRange.start,
									viewTextSpanRange.end
								)}</mark><span>{viewTextRawForSpan.slice(viewTextSpanRange.end)}</span></pre
						>
					{:else if viewTextContent !== null}
						{#if viewTextExtractStatus === 'EXTRACTED' && viewTextContent.trim() === '(No text)'}
							<p
								class="m-0 text-sm {DS_TYPE_CLASSES.meta}"
								data-testid="case-file-view-no-extracted"
							>
								{P125_FILE_VIEW_NO_EXTRACTED_LINE}
							</p>
						{:else}
							<pre class="{DS_FILES_CLASSES.extractedPre}" data-testid="case-file-extracted-text-body"
								>{viewTextContent}</pre
							>
						{/if}
					{/if}
				</section>
			</div>
		</div>
	</div>
{/if}

<style>
	/* P109 — custom file selection markers: solid fill when on (no ✓ glyph); grid = on frosted chip over thumb, list = raised row */
	:global(input.ce-case-file-evidence-marker[type='checkbox']) {
		flex-shrink: 0;
		margin: 0;
		cursor: pointer;
		appearance: none;
		-webkit-appearance: none;
		width: 1.25rem;
		height: 1.25rem;
		border-radius: 0.375rem;
		border-width: 2px;
		border-style: solid;
		background-clip: padding-box;
		transition:
			background-color 0.12s ease,
			border-color 0.12s ease,
			box-shadow 0.12s ease;
	}
	/*
	 * Global `tailwind.css` adds `input[type=checkbox]::after` with a checkmark SVG that fills
	 * the box when checked — it sits above our fill and hides the blue “inner square” look.
	 */
	:global(input.ce-case-file-evidence-marker[type='checkbox']::after) {
		content: none !important;
		display: none !important;
	}
	:global(input.ce-case-file-evidence-marker[type='checkbox']:focus-visible) {
		outline: 2px solid rgb(56 189 248 / 0.95);
		outline-offset: 2px;
	}
	/* Grid: white frame + dark interior (off); same frame + solid blue fill (on) — matches Files mockups. */
	:global(input.ce-case-file-evidence-marker--grid[type='checkbox']) {
		width: 1.375rem;
		height: 1.375rem;
		border-radius: 0.3125rem;
		border-width: 2px;
		border-color: rgb(255 255 255 / 0.98);
		background-color: rgb(38 38 42);
		box-shadow: 0 1px 2px rgb(0 0 0 / 0.35);
	}
	/* Selected visuals follow `data-p109-selected` (store), not only native :checked — avoids preventDefault / paint mismatch. */
	:global(input.ce-case-file-evidence-marker--grid[type='checkbox']:hover[data-p109-selected='false']) {
		border-color: rgb(255 255 255 / 1);
		background-color: rgb(48 48 52);
	}
	:global(input.ce-case-file-evidence-marker--grid[type='checkbox'][data-p109-selected='true']) {
		background-color: rgb(14 165 233);
		border-color: rgb(255 255 255 / 0.98);
		background-image: none !important;
		box-shadow:
			inset 0 1px 0 rgb(255 255 255 / 0.28),
			0 1px 3px rgb(0 0 0 / 0.4);
	}
	:global(input.ce-case-file-evidence-marker--grid[type='checkbox'][data-p109-selected='true']:hover) {
		background-color: rgb(2 132 199);
		border-color: rgb(255 255 255 / 1);
	}
	:global(input.ce-case-file-evidence-marker--list[type='checkbox']) {
		border-color: var(--ce-l-border-strong);
		background-color: var(--ce-l-surface-elevated);
	}
	:global(input.ce-case-file-evidence-marker--list[type='checkbox'][data-p109-selected='true']) {
		background-color: rgb(2 132 199);
		border-color: rgb(14 165 233);
		background-image: none !important;
	}
</style>
