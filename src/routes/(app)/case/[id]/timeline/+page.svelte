<script lang="ts">
	/**
	 * Official Case Timeline
	 * P28-31 — Truth Visibility Pass
	 * P28-32 — Client-Side Type Filter
	 * P28-33 — Version History Indicator
	 * P28-34 — Timeline Entry Edit Surface (Governed)
	 * P28-35 — Soft-Delete + Restore UI
	 * P28-36 — Replace window.confirm with ConfirmDialog
	 * P28-37 — Timeline Entry Create UI (Governed)
	 * P28-38 — Timeline Usability Polish Pass
	 * P38-06 — beforeNavigate guard for unsaved create/edit (parity with Notes P28-29)
	 * P38-07 — operator microcopy: direct + Log entry vs Proposals review/commit (copy only)
	 * P38-08 — timeline type “note” vs Notes tab (labels/tooltips only; value stays `note`)
	 * P39-02 — deterministic search + occurred date range + type (P39-01 §6)
	 * P41-44-FU4 — after soft-delete (normal view), adjust `totalEntries` / `hasMore` (+ `lastKnownUnfilteredTotal` when unfiltered); restore + active filters → `loadEntries`
	 * P41-44-FU3 — with server-side filters active, create success runs `loadEntries` instead of optimistic insert
	 * P41-44-FU2 — after edit, re-sort loaded entries by `occurred_at ASC, id ASC` (matches CE list order)
	 * P41-44-FU1 — load-more responses discarded after case switch or superseding `loadEntries` (stale-append guard)
	 * P41-46 — same filter semantics enforced server-side for paginated list fetches
	 * P39-02A — invalid date hint, search match highlight, large-list hint
	 * P39-03 — bottom composer shell for create entry (separate date + time; P39-01 §3–§5)
	 * P39-04 — speech dictation into the bottom composer (raw transcript → editable text; P39-01 §5)
	 * P39-05 — OCR/import text from file into the bottom composer (extracted text → editable; P39-01 §5)
	 * P39-06 — deterministic cleanup of composer text (rule-based; visible result; no auto-save; P39-01 §5)
	 * P39-07 — audio file transcription into the bottom composer (OWUI STT backend; raw transcript → editable; P39-01 §5)
	 * P40-04 — direct edit mutation guardrails (reason length + operator copy; server remains authoritative)
	 * P109-01 — manual evidence selection (session-only; shared store with Files tab)
	 *
	 * Displays the official case record from `timeline_entries` via
	 * GET /cases/:id/entries. This is distinct from notebook notes
	 * (working drafts). Entries can be created directly via the "Log entry"
	 * form (POST /cases/:id/entries) or through the proposal pipeline in Chat.
	 *
	 * Backend endpoint: GET /cases/:id/entries
	 * Table: timeline_entries
	 *
	 * P28-37 changes:
	 *   - "+ Log entry" button in header opens a governed inline create form
	 *   - Fields: occurred_at (datetime-local, operational America/New_York civil time), type, text_original (required),
	 *     location_text (optional)
	 *   - On save: POST /cases/:id/entries; created entry inserted into list in
	 *     occurred_at order; form dismissed
	 *   - Dirty-switch guard: opening edit while create form has content (or vice versa)
	 *     triggers the shared ConfirmDialog before discarding
	 *   - No change_reason required for create (contrast with P28-34 edit)
	 *
	 * P87-03 — Contextual navigation-only link to operational Tasks (not Timeline authority; <a href> only).
	 * P87-05 — Label/title aligned with header + nav + Tasks panel (same non-authoritative framing).
	 * P108-01 — Entity → timeline read-only lens (`?entityLens=`); explicit evidence links only; no inference.
	 * P108-03 — Return to entity detail from lens banner (`<a href>`; no history override).
	 * P108-04 — Shared `CaseEntityLensBanner` for consistent `entityLens` filter-state UI.
	 * P108-05 — Doctrine-safe lens copy/status via `p108EntityTimelineLensCopy`.
	 * P124-01 — Authority framing banner (`CaseTimelineAuthorityFraming`; static copy only).
	 * P124-03 — Tier L + DS spacing for scanability (layout/CSS only; no ordering or grouping).
	 */
	import { onMount, onDestroy, tick } from 'svelte';
	import { get } from 'svelte/store';
	import { browser } from '$app/environment';
	import { beforeNavigate, goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { clearSynthesisNavigationPageState } from '$lib/case/synthesisNavigationClear';
	import { pickTimelineAuthoritativeTargetId } from '$lib/case/timelineSynthesisNavigation';
	import { buildAuthoritativeTimelineContextPreview } from '$lib/case/synthesisNavigationContextPreview';
	import {
		isP103TimelineNavigationIntent,
		isStaleP103NavigationIntentShape
	} from '$lib/case/p103CitationNavigationIntent';
	import { P103_REVEAL_NOT_FOUND_TIMELINE_COPY } from '$lib/case/p103NavigationOperatorCopy';
	import {
		P97_SYNTHESIS_REVEAL_HIGHLIGHT_MS,
		scheduleStaleSynthesisIntentClear
	} from '$lib/case/synthesisNavigationP97Shared';
	import { DS_WORKFLOW_CLASSES } from '$lib/case/detectivePrimitiveFoundation';
	import { caseEngineToken, caseEngineUser } from '$lib/stores';
	import { getCaseEntityDetail } from '$lib/apis/caseEngine/caseEntitiesApi';
	import {
		listCaseTimelineEntries,
		listCaseTimelineEntriesPage,
		createCaseTimelineEntry,
		updateCaseTimelineEntry,
		softDeleteTimelineEntry,
		restoreTimelineEntry,
		uploadCaseFile,
		type TimelineEntry
	} from '$lib/apis/caseEngine';
	import CaseLoadingState from '$lib/components/case/CaseLoadingState.svelte';
	import CaseEmptyState from '$lib/components/case/CaseEmptyState.svelte';
	import CaseErrorState from '$lib/components/case/CaseErrorState.svelte';
	import CaseAiProposalDraftPanel from '$lib/components/case/CaseAiProposalDraftPanel.svelte';
	import CaseEntityLensBanner from '$lib/components/case/CaseEntityLensBanner.svelte';
	import CaseWorkspaceContentRegion from '$lib/components/case/CaseWorkspaceContentRegion.svelte';
	import CaseArrivalOrientationBlock from '$lib/components/case/CaseArrivalOrientationBlock.svelte';
	import { nextP99ArrivalSnapshot } from '$lib/case/p99ArrivalContextPresentation';
	import type { ArrivalContext } from '$lib/case/p99ArrivalContextReadModel';
	import TimelineEntryCard from '$lib/components/case/TimelineEntryCard.svelte';
	import TimelineEntryLeftRail from '$lib/components/case/TimelineEntryLeftRail.svelte';
	import ConfirmDialog from '$lib/components/common/ConfirmDialog.svelte';
import TimelineDocumentProposeButton from '$lib/components/case/TimelineDocumentProposeButton.svelte';
	import {
		isDirtyTimelineEdit,
		isoToDatetimeLocal,
		isDirtyBottomComposer,
		isBottomComposerSaveValid,
		type BottomComposerDraft
	} from './timelineUnsavedDirty';
	import { datetimeLocalToIso } from '$lib/caseTimeline/timelineOccurredAtLocal';
	import {
		TIMELINE_ENTRY_TYPE_VALUES,
		timelineEntryTypeOptionLabel,
		timelineEntryTypeSelectOptions
	} from '$lib/caseTimeline/timelineEntryTypeOptions';
	import { timelineDayRailConnector } from '$lib/caseTimeline/timelineDayRailConnector';
	import {
		TIMELINE_SENSITIVE_CHANGE_REASON_MIN_LEN,
		TIMELINE_SENSITIVE_REASON_HINT,
		timelineEditRequiresDetailedReason
	} from '$lib/case/timelineEntryMutationUi';
	import {
		TIMELINE_EMPTY_STATE_DESCRIPTION,
		TIMELINE_HEADER_RULES_LINE,
		TIMELINE_LOG_ENTRY_BUTTON_TITLE,
		TIMELINE_TIME_ZONE_LABEL,
		TIMELINE_TIME_ZONE_TOOLTIP
	} from './timelineOperatorMicrocopy';
	import { TIMELINE_TYPE_FIELD_TOOLTIP } from '$lib/caseTimeline/timelineTypeNoteClarity';
	import { normalizeTimelineSearchNeedle } from '$lib/caseTimeline/timelineListFilter';
	import {
		isTimelinePageShortcutTargetEditable,
		resolveTimelinePageKeydownIntent
	} from '$lib/caseTimeline/timelinePageKeyboard';
	import {
		isTimelineFilterDateRangeInverted,
		shouldShowLargeTimelineFilterHint
	} from '$lib/caseTimeline/timelineSearchUx';
	import {
		appendTranscriptToComposerText,
		getTimelineDictationSpeechRecognitionCtor,
		isSecureContextForTimelineDictation,
		timelineInsecureContextDictationMessage,
		timelineSpeechErrorToMessage,
		type TimelineDictationState
	} from '$lib/caseTimeline/timelineDictation';
	import MicSolid from '$lib/components/icons/MicSolid.svelte';
	import DocumentArrowUp from '$lib/components/icons/DocumentArrowUp.svelte';
	import {
		isTimelineImportFileSupported,
		unsupportedTimelineImportMessage,
		TIMELINE_IMPORT_ACCEPT,
		type TimelineImportState
	} from '$lib/caseTimeline/timelineTextImport';
	import { extractContentFromFile } from '$lib/utils';
	import {
		isTimelineImproveTextNoop,
		renderTimelineParagraphText,
		type TimelineImproveState
	} from '$lib/caseTimeline/timelineImproveText';
	import { normalizeTimelineEntryTextForSave } from '$lib/caseTimeline/timelineCleanup';
	import { isStaleTimelineLoadMoreAppend } from '$lib/caseTimeline/timelineLoadMoreStaleGuard';
	import { sortTimelineEntriesOfficialOrder } from '$lib/caseTimeline/timelineEntriesOfficialSort';
	import { timelineListUsesServerSideFilters } from '$lib/caseTimeline/timelineServerFiltersActive';
	import {
		timelineLastKnownUnfilteredAfterActiveDelete,
		timelineTotalsAfterRemoveOneFromMatchingSet
	} from '$lib/caseTimeline/timelineTotalsAfterActiveDelete';
	import { previewStructuredNotesExtraction } from '$lib/apis/caseEngine';
	import {
		isTimelineAudioFileSupported,
		unsupportedTimelineAudioMessage,
		TIMELINE_AUDIO_ACCEPT,
		type TimelineTranscriptionState
	} from '$lib/caseTimeline/timelineAudioTranscription';
	import { transcribeAudio } from '$lib/apis/audio';
	import { CASE_CANCEL_BTN_CLASS, CASE_ASSIST_BTN_CLASS } from '$lib/caseButtonClasses';
	import { nextRelateState, isEntryInRelationPair } from '$lib/caseTimeline/timelineEntryRelateUi';
	import { removeFollowUpEntryId, toggleFollowUpEntryId } from '$lib/caseTimeline/timelineEntryFollowUpUi';
	import {
		filterTimelineEntriesToEntityLinkedOnly,
		parseEntityLensEntityIdFromSearchParams,
		timelineEntryIdsLinkedFromEntityEvidence
	} from '$lib/case/p108EntityTimelineLens';
	import { P108_ENTITY_TIMELINE_LENS_EMPTY } from '$lib/case/p108EntityTimelineLensCopy';
	import {
		ensureEvidenceSelectionCaseScope,
		toggleEvidenceSelection,
		isEvidenceSelected,
		evidenceSelection,
		pruneEvidenceSelectionAfterTimelineSync,
		removeEvidenceSelectionKey
	} from '$lib/case/p109EvidenceSelection';
	import { isTimelineEntrySelectableForEvidence } from '$lib/case/p109EvidenceSelectionGates';
	import CaseWorkspaceRouteSurfacePlaceholder from '$lib/components/case/CaseWorkspaceRouteSurfacePlaceholder.svelte';
	import OperatorCommandCenterFrame from '$lib/components/operator/OperatorCommandCenterFrame.svelte';
	import CaseTimelineOccSidebar from '$lib/components/case/CaseTimelineOccSidebar.svelte';
	import { DropdownMenu } from 'bits-ui';
	import { CalendarDaysIcon } from 'heroicons-svelte/24/outline';
	import { flyAndScale } from '$lib/utils/transitions';
	import { DEFAULT_OPERATIONAL_TIMEZONE } from '$lib/caseTimeline/operationalOccurredAt';
	import type { TimelineEntryTypeValue } from '$lib/caseTimeline/timelineEntryTypeOptions';
	import { DS_BADGE_CLASSES, DS_BTN_CLASSES } from '$lib/case/detectivePrimitiveFoundation';
	import { getRouteCaseId } from '$lib/caseContext/routeCaseContext';
	import { P101_PANEL_EYEBROW } from '$lib/case/p101ProposalUiCopy';

	// ── Route-reuse case-switch guard (P28-46) ─────────────────────────────────
	// $: caseId (reactive) instead of const so it updates when SvelteKit reuses
	// this component for a different case. prevLoadedCaseId is seeded to the
	// initial param so the reactive reset block is a no-op on first render
	// (onMount handles initial load); it fires only on case switch.
	// P123-03 / P123-04 — case id from route params only (`getRouteCaseId`).
	$: routeCaseId = getRouteCaseId($page.params);
	$: caseId = routeCaseId ?? '';
	/** P109-01 — UI-only selection store is case-scoped (clears when `caseId` changes). */
	$: if (caseId) ensureEvidenceSelectionCaseScope(caseId);
	/** P108-01 — URL-driven; user navigates from entity detail with `?entityLens=` only (no auto-apply). */
	$: entityLensEntityId = parseEntityLensEntityIdFromSearchParams($page.url.searchParams);
	let entityLensLabel = '';
	let prevLoadedCaseId: string = getRouteCaseId($page.params) ?? '';
	/** Incremented on each loadEntries() call; guards stale responses from writing to the new case. */
	let activeEntriesLoadId = 0;
	/**
	 * P41-44-FU1: incremented on each load-more start and on timeline invalidation (case switch, loadEntries).
	 * `myLoadMoreOp === timelineLoadMoreEpoch` in `finally` avoids clearing `isLoadingMore` for a superseded request.
	 */
	let timelineLoadMoreEpoch = 0;

	// ── P97-02 — Synthesis → Timeline row reveal (read-only; ephemeral; no URL/storage persistence) ──
	let navTargetId: string | null = null;
	let revealInFlight = false;
	let synthesisHighlightId: string | null = null;
	let synthesisRevealBanner: 'idle' | 'not_found' = 'idle';
	/** P97-04 — cleared with synthesis highlight timer (read-only; not persisted). */
	let synthesisContextPreview: { headline: string; lines: string[] } | null = null;
	let synthesisHighlightTimer: ReturnType<typeof setTimeout> | undefined;
	let invalidSynthesisIntentClearInFlight = false;
	/** P99-02 — snapshot from synthesis intent; in-memory only (not storage). */
	let p99ArrivalSnapshot: ArrivalContext | null = null;

	// ── Micro-interaction: auto-focus first field when a form opens (P28-38) ──
	function focusOnMount(node: HTMLElement): { destroy(): void } {
		node.focus();
		return { destroy() {} };
	}

	let entries: TimelineEntry[] = [];
	let loading = true;
	let loadError = '';

	// ── P41-43: Incremental loading ────────────────────────────────────────────
	/** Number of entries to fetch on initial page load. */
	const TIMELINE_INITIAL_CHUNK = 50;
	/** Number of entries to fetch per subsequent load-more request. */
	const TIMELINE_CHUNK_SIZE = 25;

	/** True when additional entries exist beyond what is currently loaded. */
	let hasMore = false;
	/** Matching row count for the current server query (unfiltered = full timeline in scope). */
	let totalEntries = 0;
	/** Last total from an unfiltered fetch — used to show the filter bar when filters yield zero rows. */
	let lastKnownUnfilteredTotal = 0;
	/** True after onMount — drives initial + filter reload without duplicate case-switch fetch. */
	let timelineListMounted = false;
	/**
	 * P41-46: debounced search text sent to Case Engine (`query` param).
	 * Type and date filters reload immediately; search waits for typing pause.
	 */
	let filterQueryForApi = '';
	let searchDebounceHandle: ReturnType<typeof setTimeout> | undefined;
	/** True while a load-more request is in flight (prevents double-fetch). */
	let isLoadingMore = false;
	/** Non-fatal error from a load-more attempt; shown below the list. */
	let loadMoreError = '';

	/**
	 * P41-45: snapshot boundary captured from the first page response.
	 * Passed in all subsequent load-more requests so the dataset is stable
	 * even if new entries are committed between page fetches.
	 * null until the first page is loaded; reset to null on full reload.
	 */
	let scrollBoundary: { maxOccurredAt: string; maxId: string } | null = null;

	/** DOM ref for the list scrollport (`.ce-l-timeline-primary-scroll` only — hero/toolbar stay fixed). */
	let scrollContainerEl: HTMLElement | undefined;
	/** DOM ref for the invisible sentinel at list bottom (triggers auto-load). */
	let scrollSentinelEl: HTMLElement | undefined;
	/** IntersectionObserver watching the scroll sentinel. */
	let scrollObserver: IntersectionObserver | undefined;

	function setupScrollObserver(): void {
		scrollObserver?.disconnect();
		if (!scrollSentinelEl) {
			scrollObserver = undefined;
			return;
		}
		/** Observe against the list scrollport so load-more tracks inner timeline scroll. */
		const root = scrollContainerEl ?? null;
		scrollObserver = new IntersectionObserver(
			(observed) => {
				if (observed[0]?.isIntersecting && hasMore && !isLoadingMore && !loading) {
					void loadMoreEntries();
				}
			},
			{ root, rootMargin: '0px 0px 100px 0px', threshold: 0 }
		);
		scrollObserver.observe(scrollSentinelEl);
	}

	/** P41-46: optional filters for paginated GET /cases/:id/entries (mirrors UI filter state). */
	function timelinePageQueryOpts(): {
		includeDeleted?: boolean;
		query?: string;
		types?: string;
		occurredFrom?: string;
		occurredTo?: string;
	} {
		const o: {
			includeDeleted?: boolean;
			query?: string;
			types?: string;
			occurredFrom?: string;
			occurredTo?: string;
		} = {};
		if (isAdmin && showDeleted) o.includeDeleted = true;
		const qq = filterQueryForApi.trim();
		if (qq) o.query = qq;
		if (activeFilter !== 'all') o.types = activeFilter;
		const dFrom = filterDateFrom.trim();
		const dTo = filterDateTo.trim();
		if (dFrom) o.occurredFrom = dFrom;
		if (dTo) o.occurredTo = dTo;
		return o;
	}

	function onFilterSearchInput(): void {
		clearTimeout(searchDebounceHandle);
		searchDebounceHandle = setTimeout(() => {
			searchDebounceHandle = undefined;
			filterQueryForApi = filterSearchText.trim();
		}, 300);
	}

	$: {
		const el = scrollSentinelEl;
		void scrollContainerEl;
		if (el) {
			// Defer until after the browser has painted the new entries so the sentinel
			// has a real layout position. Without this, the observer fires immediately
			// (sentinel at 0,0 before first paint) and eagerly loads all pages.
			requestAnimationFrame(() => {
				if (scrollSentinelEl === el) setupScrollObserver();
			});
		} else {
			scrollObserver?.disconnect();
			scrollObserver = undefined;
		}
	}

	async function loadMoreEntries(): Promise<void> {
		if (entityLensEntityId) return;
		if (!$caseEngineToken || !hasMore || isLoadingMore || loading) return;
		const fetchGeneration = activeEntriesLoadId;
		const requestedCaseId = caseId;
		const myLoadMoreOp = ++timelineLoadMoreEpoch;
		isLoadingMore = true;
		loadMoreError = '';
		const currentOffset = entries.length;
		try {
			const result = await listCaseTimelineEntriesPage(
				caseId,
				$caseEngineToken,
				{
					limit: TIMELINE_CHUNK_SIZE,
					offset: currentOffset,
					// P41-45: pass snapshot boundary to stabilise pagination under mid-scroll inserts.
					...(scrollBoundary ?? {}),
					...timelinePageQueryOpts()
				}
			);
			if (
				isStaleTimelineLoadMoreAppend(
					fetchGeneration,
					activeEntriesLoadId,
					requestedCaseId,
					caseId
				)
			) {
				return;
			}
			// Dedup by id — guards against overlap if the list changed while paginating.
			const existingIds = new Set(entries.map((e) => e.id));
			const fresh = result.entries.filter((e) => !existingIds.has(e.id));
			entries = [...entries, ...fresh];
			hasMore = result.hasMore;
			pruneEvidenceSelectionAfterTimelineSync(caseId, entries, hasMore);
			// Do NOT update totalEntries here. The boundary-filtered total from loadMore can
			// diverge from the authoritative count (e.g. proposals with historical occurred_at
			// committed mid-scroll enter the boundary window and inflate the count). The total
			// captured by loadEntries() on a full Refresh is the only reliable reference.
		} catch (e: unknown) {
			if (
				!isStaleTimelineLoadMoreAppend(
					fetchGeneration,
					activeEntriesLoadId,
					requestedCaseId,
					caseId
				)
			) {
				loadMoreError = e instanceof Error ? e.message : 'Failed to load more entries.';
			}
		} finally {
			if (myLoadMoreOp === timelineLoadMoreEpoch) {
				isLoadingMore = false;
			}
		}
		// No observer reconnect needed here. When new entries are appended above the
		// sentinel, the browser reflows and pushes the sentinel below the current viewport.
		// The IntersectionObserver detects the position change and re-fires naturally
		// when the user scrolls far enough to reveal the sentinel again.
	}

	async function clearSynthesisNavState(): Promise<void> {
		if (!browser) return;
		await clearSynthesisNavigationPageState(get(page));
	}

	async function runRevealSequence(): Promise<void> {
		if (!browser || !navTargetId || revealInFlight) return;
		if (loading || loadError) return;
		revealInFlight = true;
		try {
			const targetId = navTargetId;
			let safety = 0;
			while (safety < 120) {
				safety += 1;
				await tick();
				if (entries.some((e) => e.id === targetId)) {
					await tick();
					const hit = entries.find((e) => e.id === targetId);
					synthesisContextPreview = hit ? buildAuthoritativeTimelineContextPreview(hit) : null;
					const el = document.getElementById(`ce-timeline-entry-${targetId}`);
					el?.scrollIntoView({ block: 'center', behavior: 'auto' });
					synthesisHighlightId = targetId;
					if (synthesisHighlightTimer) clearTimeout(synthesisHighlightTimer);
					synthesisHighlightTimer = setTimeout(() => {
						synthesisHighlightId = null;
						synthesisContextPreview = null;
						synthesisHighlightTimer = undefined;
					}, P97_SYNTHESIS_REVEAL_HIGHLIGHT_MS);
					navTargetId = null;
					synthesisRevealBanner = 'idle';
					stripFocusEntryQueryFromUrl();
					await clearSynthesisNavState();
					return;
				}
				if (!hasMore) {
					break;
				}
				if (isLoadingMore) {
					await tick();
					await new Promise((r) => setTimeout(r, 40));
					continue;
				}
				await loadMoreEntries();
				await tick();
			}
			synthesisRevealBanner = 'not_found';
			synthesisContextPreview = null;
			navTargetId = null;
			stripFocusEntryQueryFromUrl();
			await clearSynthesisNavState();
		} finally {
			revealInFlight = false;
		}
	}

	// ── Role + deleted-entry visibility (P28-35) ───────────────────────────────
	// isAdmin: true when the current Case Engine session is ADMIN.
	// showDeleted: ADMIN-only toggle — when true, fetches include soft-deleted entries.
	$: isAdmin = $caseEngineUser?.role === 'ADMIN';
	let showDeleted = false;

	// ── Case-switch reactive reset (P28-46) ────────────────────────────────────
	// Fires when caseId changes while the component remains mounted (route reuse).
	// Clears all case-bound state immediately, then loads the new case's entries.
	// All confirm dialogs are closed so old-case pending actions can't fire.
	$: if (caseId && $caseEngineToken && caseId !== prevLoadedCaseId) {
		timelineLoadMoreEpoch += 1;
		prevLoadedCaseId = caseId;
		entries = [];
		loadError = '';
		hasMore = false;
		totalEntries = 0;
		isLoadingMore = false;
		loadMoreError = '';
		scrollBoundary = null;
		activeFilter = 'all';
		filterSearchText = '';
		filterQueryForApi = '';
		clearTimeout(searchDebounceHandle);
		searchDebounceHandle = undefined;
		filterDateFrom = '';
		filterDateTo = '';
		lastKnownUnfilteredTotal = 0;
		showDeleted = false;
		timelineCreateOutsideFiltersHint = false;
		showDeleteConfirm = false;
		pendingDeleteEntry = null;
		deleteLifecycleError = '';
		deleteInFlight = false;
		showRestoreConfirm = false;
		pendingRestoreEntry = null;
		restoreLifecycleError = '';
		restoreInFlight = false;
		composerOpen = false;
		composerDraft = null;
		composerSaving = false;
		composerError = '';
		composerLinkedUploadError = '';
		composerLinkedUploading = false;
		editLinkedUploadError = '';
		editLinkedUploading = false;
		resetTimelineDictation();
		resetTimelineImport();
		resetTimelineTranscription();
		improveState = 'idle';
		improveError = '';
		editingEntryId = null;
		editDraft = null;
		editSaving = false;
		editError = '';
		showDiscardConfirm = false;
		pendingDiscardAction = null;
		relationshipPendingId = null;
		relationshipPair = null;
		followUpEntryIds = new Set();
		consumedFocusEntryKey = '';
		navTargetId = null;
		revealInFlight = false;
		synthesisHighlightId = null;
		synthesisContextPreview = null;
		synthesisRevealBanner = 'idle';
		if (synthesisHighlightTimer) clearTimeout(synthesisHighlightTimer);
		synthesisHighlightTimer = undefined;
		invalidSynthesisIntentClearInFlight = false;
		p99ArrivalSnapshot = null;
	}

	async function loadEntries(): Promise<void> {
		if (!$caseEngineToken) {
			loading = false;
			loadError = 'Case Engine session not active.';
			return;
		}
		activeEntriesLoadId += 1;
		timelineLoadMoreEpoch += 1;
		const loadId = activeEntriesLoadId;
		loading = true;
		loadError = '';
		hasMore = false;
		isLoadingMore = false;
		loadMoreError = '';
		scrollBoundary = null;
		entityLensLabel = '';
		const dateInverted =
			!entityLensEntityId &&
			isTimelineFilterDateRangeInverted(filterDateFrom, filterDateTo) &&
			filterDateFrom.trim() !== '' &&
			filterDateTo.trim() !== '';
		if (dateInverted) {
			if (loadId !== activeEntriesLoadId) return;
			entries = [];
			totalEntries = 0;
			pruneEvidenceSelectionAfterTimelineSync(caseId, [], false);
			loading = false;
			return;
		}
		if (entityLensEntityId) {
			try {
				const detail = await getCaseEntityDetail(caseId, entityLensEntityId, $caseEngineToken, {
					includeRetired: true
				});
				if (loadId !== activeEntriesLoadId) return;
				const linkedIds = new Set(timelineEntryIdsLinkedFromEntityEvidence(detail.evidence_links));
				const all = await listCaseTimelineEntries(caseId, $caseEngineToken, {
					includeDeleted: isAdmin && showDeleted
				});
				if (loadId !== activeEntriesLoadId) return;
				const filtered = filterTimelineEntriesToEntityLinkedOnly(all, linkedIds);
				entries = filtered;
				totalEntries = filtered.length;
				hasMore = false;
				scrollBoundary = null;
				lastKnownUnfilteredTotal = filtered.length;
				entityLensLabel = detail.case_entity.display_label;
				pruneEvidenceSelectionAfterTimelineSync(caseId, entries, false);
			} catch (e: unknown) {
				if (loadId !== activeEntriesLoadId) return;
				entries = [];
				totalEntries = 0;
				hasMore = false;
				pruneEvidenceSelectionAfterTimelineSync(caseId, [], false);
				loadError = e instanceof Error ? e.message : 'Failed to load entity timeline lens.';
			} finally {
				if (loadId === activeEntriesLoadId) loading = false;
			}
			return;
		}
		try {
			// P41-43 + P41-46: initial chunk; filters sent as query params (server-side).
			const result = await listCaseTimelineEntriesPage(
				caseId,
				$caseEngineToken,
				{
					limit: TIMELINE_INITIAL_CHUNK,
					offset: 0,
					...timelinePageQueryOpts()
				}
			);
			if (loadId !== activeEntriesLoadId) return;
			entries = result.entries;
			hasMore = result.hasMore;
			totalEntries = result.total;
			const noServerFilters =
				!filterQueryForApi.trim() &&
				activeFilter === 'all' &&
				!filterDateFrom.trim() &&
				!filterDateTo.trim();
			if (noServerFilters) {
				lastKnownUnfilteredTotal = result.total;
			}
			// P41-45: capture snapshot boundary to stabilise subsequent load-more requests.
			if (result.snapshotMaxOccurredAt && result.snapshotMaxId) {
				scrollBoundary = {
					maxOccurredAt: result.snapshotMaxOccurredAt,
					maxId: result.snapshotMaxId
				};
			}
			pruneEvidenceSelectionAfterTimelineSync(caseId, entries, hasMore);
		} catch (e: unknown) {
			if (loadId !== activeEntriesLoadId) return;
			loadError = e instanceof Error ? e.message : 'Failed to load timeline entries.';
		} finally {
			if (loadId === activeEntriesLoadId) loading = false;
		}
	}

	// ── Client-side type filter (P28-32) ───────────────────────────────────────
	// Canonical entry types from timeline_entries.type (see TimelineEntryCard.svelte).
	// 'all' is a sentinel — never stored in the database.
	const FILTER_TYPES = [
		{ value: 'all' as const, label: 'All' },
		...TIMELINE_ENTRY_TYPE_VALUES.map((value) => ({
			value,
			label: timelineEntryTypeOptionLabel(value)
		}))
	] as const;
	type FilterValue = (typeof FILTER_TYPES)[number]['value'];

	let activeFilter: FilterValue = 'all';

	// P39-02 / P41-46 — search + occurred date range (server-side when paginated)
	let filterSearchText = '';
	let filterDateFrom = '';
	let filterDateTo = '';
	/** P39 keyboard shortcut: `/` focuses this element when the filter bar is mounted */
	let timelineFilterSearchEl: HTMLInputElement | undefined;

	// ── Soft-delete / restore lifecycle (P28-35) ────────────────────────────────
	// All lifecycle actions use ConfirmDialog (non-blocking).
	// showDeleted re-fetches on toggle; deleteConfirm/restoreConfirm are independent dialogs.

	let showDeleteConfirm = false;
	let pendingDeleteEntry: TimelineEntry | null = null;
	let deleteLifecycleError = '';
	let deleteInFlight = false;

	let showRestoreConfirm = false;
	let pendingRestoreEntry: TimelineEntry | null = null;
	let restoreLifecycleError = '';
	let restoreInFlight = false;

	/** P84-03 — local-only 1:1 entry pairing (timeline page scope; not persisted). */
	let relationshipPendingId: string | null = null;
	let relationshipPair: { a: string; b: string } | null = null;

	function handleTimelineRelateClick(entryId: string): void {
		const next = nextRelateState(
			{ pendingId: relationshipPendingId, pair: relationshipPair },
			entryId
		);
		relationshipPendingId = next.pendingId;
		relationshipPair = next.pair;
	}

	/** P84-04 — session-only follow-up markers (page-scoped Set; not persisted). */
	let followUpEntryIds = new Set<string>();

	function handleFollowUpToggle(entryId: string): void {
		followUpEntryIds = toggleFollowUpEntryId(followUpEntryIds, entryId);
	}

	function handleDeleteEntry(entry: TimelineEntry): void {
		pendingDeleteEntry = entry;
		showDeleteConfirm = true;
		deleteLifecycleError = '';
	}

	async function executeDelete(): Promise<void> {
		if (!pendingDeleteEntry || !$caseEngineToken) return;
		deleteInFlight = true;
		deleteLifecycleError = '';
		const entryId = pendingDeleteEntry.id;
		pendingDeleteEntry = null;
		try {
			await softDeleteTimelineEntry(caseId, entryId, $caseEngineToken);
			removeEvidenceSelectionKey('timeline_entry', entryId, caseId);
			if (showDeleted && isAdmin) {
				// ADMIN with showDeleted=true: mark entry as deleted in the local list
				// so it renders as the removed-state card without a full re-fetch.
				entries = entries.map((e) =>
					e.id === entryId
						? { ...e, deleted_at: new Date().toISOString() }
						: e
				);
			} else {
				// Normal view: remove the entry from the visible list.
				entries = entries.filter((e) => e.id !== entryId);
				const meta = timelineTotalsAfterRemoveOneFromMatchingSet(totalEntries, entries.length);
				totalEntries = meta.totalEntries;
				hasMore = meta.hasMore;
				lastKnownUnfilteredTotal = timelineLastKnownUnfilteredAfterActiveDelete(
					lastKnownUnfilteredTotal,
					timelineListUsesServerSideFilters({
						filterQueryForApi,
						activeFilter,
						filterDateFrom,
						filterDateTo
					})
				);
			}
			// If entry was being edited, cancel the draft.
			if (editingEntryId === entryId) cancelEdit();
			// P84-03: drop local pairing if a participant row is removed.
			if (relationshipPair && isEntryInRelationPair(entryId, relationshipPair)) {
				relationshipPair = null;
				relationshipPendingId = null;
			} else if (relationshipPendingId === entryId) {
				relationshipPendingId = null;
			}
			if (followUpEntryIds.has(entryId)) {
				followUpEntryIds = removeFollowUpEntryId(followUpEntryIds, entryId);
			}
		} catch (e: unknown) {
			deleteLifecycleError = e instanceof Error ? e.message : 'Remove failed. Please try again.';
		} finally {
			deleteInFlight = false;
		}
	}

	function handleRestoreEntry(entry: TimelineEntry): void {
		pendingRestoreEntry = entry;
		showRestoreConfirm = true;
		restoreLifecycleError = '';
	}

	async function executeRestore(): Promise<void> {
		if (!pendingRestoreEntry || !$caseEngineToken) return;
		restoreInFlight = true;
		restoreLifecycleError = '';
		const entry = pendingRestoreEntry;
		pendingRestoreEntry = null;
		try {
			await restoreTimelineEntry(caseId, entry.id, $caseEngineToken);
			if (
				timelineListUsesServerSideFilters({
					filterQueryForApi,
					activeFilter,
					filterDateFrom,
					filterDateTo
				})
			) {
				await loadEntries();
			} else {
				// Mark entry as active in the local list (clear deleted_at).
				entries = entries.map((e) =>
					e.id === entry.id ? { ...e, deleted_at: null } : e
				);
			}
		} catch (e: unknown) {
			restoreLifecycleError = e instanceof Error ? e.message : 'Restore failed. Please try again.';
		} finally {
			restoreInFlight = false;
		}
	}

	// ── P39-03 Bottom composer state ─────────────────────────────────────────────
	// Replaces the old inline create form (P28-37) with a bottom-sheet composer.
	// One composer at a time; mutually exclusive with the inline edit form.
	// Fields use separate date + time inputs per P39-01 §3 (no auto-fill; both required).

	let composerOpen = false;
	let composerDraft: BottomComposerDraft | null = null;
	let composerSaving = false;
	let composerError = '';
	let composerLinkedUploading = false;
	let composerLinkedUploadError = '';
	/** P41-44-FU3: after create + filtered reload, new row absent from server-filtered list. */
	let timelineCreateOutsideFiltersHint = false;

	$: composerSaveValid = isBottomComposerSaveValid(composerDraft);

	function doOpenComposer(presetType?: TimelineEntryTypeValue): void {
		editingEntryId = null;
		editDraft = null;
		editError = '';
		composerDraft = {
			occurred_date: '',
			occurred_time: '',
			type: presetType ?? 'incident',
			title: '',
			text_original: '',
			location_text: '',
			linked_images: []
		};
		composerError = '';
		composerLinkedUploadError = '';
		timelineCreateOutsideFiltersHint = false;
		composerOpen = true;
	}

	/** Called by the "Log entry" button. Guards against open edit draft. */
	function openCreateForm(): void {
		if (editingEntryId) {
			pendingDiscardAction = () => doOpenComposer();
			showDiscardConfirm = true;
			return;
		}
		doOpenComposer();
	}

	function openCreateFormWithPreset(preset: TimelineEntryTypeValue): void {
		if (editingEntryId) {
			pendingDiscardAction = () => doOpenComposer(preset);
			showDiscardConfirm = true;
			return;
		}
		doOpenComposer(preset);
	}

	/** Headless document propose control (More actions menu). */
	let documentProposeCtl: { triggerPick: () => void } | undefined;

	function cancelComposer(): void {
		resetTimelineDictation();
		resetTimelineImport();
		resetTimelineTranscription();
		improveState = 'idle';
		improveError = '';
		composerOpen = false;
		composerDraft = null;
		composerError = '';
		composerLinkedUploadError = '';
	}

	async function handleComposerLinkedImagesPick(files: FileList | null): Promise<void> {
		if (!files?.length || !composerDraft) return;
		const token = get(caseEngineToken);
		if (!token) return;
		composerLinkedUploadError = '';
		composerLinkedUploading = true;
		try {
			for (const file of Array.from(files)) {
				if (!file.type.startsWith('image/')) {
					composerLinkedUploadError =
						'Only image files can be attached. Each file is stored as a case file and linked when you save.';
					continue;
				}
				const cf = await uploadCaseFile(caseId, file, token);
				composerDraft = {
					...composerDraft,
					linked_images: [
						...composerDraft.linked_images,
						{ id: cf.id, original_filename: cf.original_filename }
					]
				};
			}
		} catch (e: unknown) {
			composerLinkedUploadError =
				e instanceof Error ? e.message : 'Image upload failed. You can remove the file and try again.';
		} finally {
			composerLinkedUploading = false;
		}
	}

	function removeComposerLinkedImage(fileId: string): void {
		if (!composerDraft) return;
		composerDraft = {
			...composerDraft,
			linked_images: composerDraft.linked_images.filter((x) => x.id !== fileId)
		};
	}

	/** Requests cancel: shows confirm dialog if dirty, closes immediately if clean. */
	function requestCancelComposer(): void {
		if (!isDirtyBottomComposer(composerDraft)) {
			cancelComposer();
			return;
		}
		pendingDiscardAction = () => cancelComposer();
		showDiscardConfirm = true;
	}

	/** Timeline-only shortcuts: `/` search, `n` new entry, `Escape` composer cancel (guarded). */
	function handleTimelinePageKeydown(event: KeyboardEvent): void {
		if (showP101ProposalModal && event.key === 'Escape') {
			event.preventDefault();
			showP101ProposalModal = false;
			return;
		}
		const intent = resolveTimelinePageKeydownIntent({
			key: event.key,
			ctrlKey: event.ctrlKey,
			metaKey: event.metaKey,
			altKey: event.altKey,
			targetEditable: isTimelinePageShortcutTargetEditable(event.target),
			overlayOpen:
				showDiscardConfirm || showDeleteConfirm || showRestoreConfirm || showP101ProposalModal,
			composerOpen
		});
		switch (intent.kind) {
			case 'focus-search':
				event.preventDefault();
				timelineFilterSearchEl?.focus();
				return;
			case 'open-composer':
				event.preventDefault();
				openCreateForm();
				return;
			case 'cancel-composer':
				event.preventDefault();
				requestCancelComposer();
				return;
			default:
				return;
		}
	}

	async function saveComposer(): Promise<void> {
		if (!composerDraft || !$caseEngineToken) return;
		if (!composerSaveValid) return;

		const text = normalizeTimelineEntryTextForSave(composerDraft.text_original.trim());
		const localDatetime = `${composerDraft.occurred_date}T${composerDraft.occurred_time}`;

		composerSaving = true;
		composerError = '';
		try {
			const created = await createCaseTimelineEntry(caseId, $caseEngineToken, {
				occurred_at: datetimeLocalToIso(localDatetime),
				type: composerDraft.type,
				title: composerDraft.title.trim(),
				text_original: text,
				location_text: composerDraft.location_text.trim() || null,
				linked_file_ids: composerDraft.linked_images.map((x) => x.id)
			});
			if (
				timelineListUsesServerSideFilters({
					filterQueryForApi,
					activeFilter,
					filterDateFrom,
					filterDateTo
				})
			) {
				const newId = created.id;
				await loadEntries();
				timelineCreateOutsideFiltersHint = !entries.some((e) => e.id === newId);
			} else {
				entries = sortTimelineEntriesOfficialOrder([...entries, created]);
				timelineCreateOutsideFiltersHint = false;
			}
			cancelComposer();
		} catch (e: unknown) {
			composerError = e instanceof Error ? e.message : 'Create failed. Please try again.';
		} finally {
			composerSaving = false;
		}
	}

	// ── P39-04 Bottom composer dictation (speech → editable text) ────────────────
	// Lifecycle: idle → listening → idle (transcript appended) or error.
	// No processing or review state — raw transcript goes directly into
	// composerDraft.text_original as visible, editable text before save.
	// Reuses notesDictationSpeech helpers for browser API / error mapping.

	let dictationState: TimelineDictationState = 'idle';
	let dictationError = '';
	let dictationRecognition: { stop: () => void } | null = null;
	let dictationStopRequested = false;
	let dictationTranscriptBuffer = '';
	let dictationSessionCancelled = false;

	function resetTimelineDictation(): void {
		dictationSessionCancelled = true;
		if (dictationRecognition) {
			try {
				dictationRecognition.stop();
			} catch {
				// Ignore stop errors during teardown.
			}
		}
		dictationState = 'idle';
		dictationError = '';
		dictationRecognition = null;
		dictationStopRequested = false;
		dictationTranscriptBuffer = '';
	}

	async function startTimelineDictation(): Promise<void> {
		resetTimelineDictation();
		dictationSessionCancelled = false;

		if (!isSecureContextForTimelineDictation()) {
			dictationState = 'error';
			dictationError = timelineInsecureContextDictationMessage();
			return;
		}

		try {
			if (navigator.permissions?.query) {
				const perm = await navigator.permissions.query({ name: 'microphone' as PermissionName });
				if (perm.state === 'denied') {
					dictationState = 'error';
					dictationError = 'Microphone access is blocked. Allow microphone permission and try again.';
					return;
				}
			}
		} catch {
			// Non-fatal: some browsers do not support microphone permission query.
		}

		const SpeechRecognitionCtor = getTimelineDictationSpeechRecognitionCtor();
		if (!SpeechRecognitionCtor) {
			dictationState = 'error';
			dictationError = 'Speech recognition is not available in this browser. Use Chrome or Edge.';
			return;
		}

		const recognition = new SpeechRecognitionCtor();
		dictationRecognition = recognition as { stop: () => void };
		dictationStopRequested = false;
		dictationTranscriptBuffer = '';

		recognition.lang = (typeof navigator !== 'undefined' ? navigator.language : null) || 'en-US';
		recognition.interimResults = true;
		recognition.continuous = true;

		recognition.onresult = (event: { results: { length: number; [i: number]: { 0: { transcript: string } } }; resultIndex: number }) => {
			const parts: string[] = [];
			for (let i = 0; i < event.results.length; i++) {
				parts.push(event.results[i][0]?.transcript ?? '');
			}
			dictationTranscriptBuffer = parts.join(' ').trim();
		};

		recognition.onerror = (event: { error?: string }) => {
			if (dictationSessionCancelled) return;
			if (event?.error === 'aborted' && dictationStopRequested) return;
			dictationState = 'error';
			dictationError = timelineSpeechErrorToMessage(event?.error);
			dictationRecognition = null;
		};

		recognition.onend = () => {
			if (dictationSessionCancelled) return;
			if (dictationState === 'error') return;
			dictationRecognition = null;

			const captured = dictationTranscriptBuffer;
			dictationTranscriptBuffer = '';

			if (!captured) {
				if (!dictationStopRequested) {
					dictationState = 'error';
					dictationError = 'Recording stopped unexpectedly. Please try again.';
				} else {
					// User stopped before speaking — return to idle without error.
					dictationState = 'idle';
				}
				return;
			}

			// Append transcript to the composer text field as visible, editable text.
			if (composerDraft) {
				composerDraft = {
					...composerDraft,
					text_original: appendTranscriptToComposerText(composerDraft.text_original, captured)
				};
			}
			dictationState = 'idle';
		};

		dictationState = 'listening';
		try {
			recognition.start();
		} catch (e: unknown) {
			dictationState = 'error';
			dictationError =
				e instanceof Error && e.message
					? `Dictation could not start: ${e.message}`
					: 'Dictation could not start in this browser context.';
			dictationRecognition = null;
		}
	}

	function stopTimelineDictation(): void {
		if (dictationRecognition && dictationState === 'listening') {
			dictationStopRequested = true;
			dictationRecognition.stop();
		}
	}

	onDestroy(() => {
		clearTimeout(searchDebounceHandle);
		if (synthesisHighlightTimer) clearTimeout(synthesisHighlightTimer);
		synthesisContextPreview = null;
		resetTimelineDictation();
		resetTimelineImport();
		resetTimelineTranscription();
		improveState = 'idle';
		improveError = '';
		scrollObserver?.disconnect();
	});

	// ── P39-05 Bottom composer text import (file → editable text) ─────────────────
	// Lifecycle: idle → processing → idle (extracted text appended) or error.
	// Uses extractContentFromFile (client-side; no backend upload/attachment record).
	// Supported: PDF, DOCX, plain-text (.txt, .md, .csv, .json, etc.).
	// Images are not supported in V1 (client-side extraction only).

	let importState: TimelineImportState = 'idle';
	let importError = '';
	let importFilename = '';

	function resetTimelineImport(): void {
		importState = 'idle';
		importError = '';
		importFilename = '';
	}

	async function handleImportFile(files: FileList | null): Promise<void> {
		if (!files || files.length === 0) return;
		const file = files[0];

		importFilename = file.name;
		importError = '';
		importState = 'processing';

		if (!isTimelineImportFileSupported(file)) {
			importState = 'error';
			importError = unsupportedTimelineImportMessage(file);
			return;
		}

		try {
			const extracted = await extractContentFromFile(file);
			const text = typeof extracted === 'string' ? extracted.trim() : '';
			if (!text) {
				importState = 'error';
				importError = `No readable text was found in "${file.name}".`;
				return;
			}
			if (composerDraft) {
				composerDraft = {
					...composerDraft,
					text_original: appendTranscriptToComposerText(composerDraft.text_original, text)
				};
			}
			importState = 'idle';
			importFilename = '';
		} catch (e: unknown) {
			importState = 'error';
			importError =
				e instanceof Error && e.message
					? `Could not extract text from "${file.name}": ${e.message}`
					: `Could not extract text from "${file.name}". Please try a different file.`;
		}
	}

	// ── P39-06 Bottom composer deterministic cleanup ──────────────────────────────
	// Synchronous; no network call; no LLM. Rules: line endings, Unicode typography,
	// trailing whitespace per line, internal spaces, standalone i→I, common typos,
	// Upgraded from P39-06 deterministic cleanup to AI-powered text improvement
	// (uses previewStructuredNotesExtraction — same backend pipeline as Notes
	// "Structure Note"). Result lands directly in the composer as visible,
	// editable text. No auto-save. No hidden write. Explicit save still required.

	let improveState: TimelineImproveState = 'idle';
	let improveError = '';

	async function handleTimelineImproveText(): Promise<void> {
		if (!composerDraft?.text_original?.trim()) return;
		if (!$caseEngineToken) {
			improveError = 'Case Engine session required.';
			improveState = 'error';
			return;
		}
		improveState = 'processing';
		improveError = '';
		try {
			const result = await previewStructuredNotesExtraction(
				caseId,
				$caseEngineToken,
				composerDraft.text_original.trim()
			);
			if (!result.success) {
				improveError = result.errorMessage || 'Text improvement unavailable.';
				improveState = 'error';
				return;
			}
		const { render } = result.data;
		const paragraphText = renderTimelineParagraphText(render.blocks);
		if (render.status === 'blocked' || isTimelineImproveTextNoop(paragraphText, composerDraft.text_original)) {
			improveState = 'noop';
			return;
		}
		composerDraft = { ...composerDraft, text_original: paragraphText };
			improveState = 'applied';
		} catch {
			improveError = 'Text improvement unavailable. Try again.';
			improveState = 'error';
		}
	}

	// ── P39-07 Bottom composer audio transcription ────────────────────────────────
	// Async: sends audio file to OWUI STT backend (POST /audio/api/v1/transcriptions).
	// Uses localStorage.token (OWUI session), not $caseEngineToken.
	// Raw transcript text is appended to composerDraft.text_original via
	// appendTranscriptToComposerText — same helper as P39-04 dictation.
	// No audio file is stored; no Case Engine API call; no backend contract change.

	let transcriptionState: TimelineTranscriptionState = 'idle';
	let transcriptionError = '';
	let transcriptionFilename = '';

	function resetTimelineTranscription(): void {
		transcriptionState = 'idle';
		transcriptionError = '';
		transcriptionFilename = '';
	}

	async function handleTranscribeAudioFile(files: FileList | null): Promise<void> {
		if (!files || files.length === 0) return;
		const audioFile = files[0];

		if (!isTimelineAudioFileSupported(audioFile)) {
			transcriptionState = 'error';
			transcriptionError = unsupportedTimelineAudioMessage(audioFile);
			return;
		}

		transcriptionState = 'processing';
		transcriptionFilename = audioFile.name;
		transcriptionError = '';

		try {
			const token: string = (typeof localStorage !== 'undefined' ? localStorage.token : '') ?? '';
			if (!token) {
				transcriptionState = 'error';
				transcriptionError =
					'Transcription requires an active session. Please sign in and try again.';
				transcriptionFilename = '';
				return;
			}

			const res = await transcribeAudio(token, audioFile);
			const transcript: string = typeof res?.text === 'string' ? res.text.trim() : '';

			if (!transcript) {
				transcriptionState = 'error';
				transcriptionError =
					'Transcription returned no text. The audio may be silent, too short, or in an unsupported language/codec.';
				transcriptionFilename = '';
				return;
			}

			if (composerDraft) {
				composerDraft = {
					...composerDraft,
					text_original: appendTranscriptToComposerText(composerDraft.text_original, transcript)
				};
			}

			transcriptionState = 'idle';
			transcriptionFilename = '';
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : String(err);
			transcriptionState = 'error';
			transcriptionError = `Transcription failed: ${msg}`;
			transcriptionFilename = '';
		}
	}

	// ── Inline edit state (P28-34) ──────────────────────────────────────────────
	// Only one entry can be in edit mode at a time.
	// editDraft.occurred_at is datetime-local (America/New_York civil time); save uses
	// `$lib/caseTimeline/timelineOccurredAtLocal` `datetimeLocalToIso` → UTC Z for the API.
	interface EditDraft {
		title: string;
		text_original: string;
		type: string;
		occurred_at: string;   // datetime-local format for <input type="datetime-local">
		location_text: string; // empty string means null on save
		change_reason: string;
		linked_images: Array<{ id: string; original_filename: string }>;
	}

	function clearTimelineFilters(): void {
		filterSearchText = '';
		filterQueryForApi = '';
		clearTimeout(searchDebounceHandle);
		searchDebounceHandle = undefined;
		filterDateFrom = '';
		filterDateTo = '';
		activeFilter = 'all';
		timelineCreateOutsideFiltersHint = false;
	}

	/** P108-01 — clears `?entityLens=` only; full timeline reload via reactive `loadEntries`. */
	function clearEntityLens(): void {
		void goto(`/case/${encodeURIComponent(caseId)}/timeline`, { replaceState: true });
	}

	$: filtersActive =
		normalizeTimelineSearchNeedle(filterSearchText) !== '' ||
		filterDateFrom !== '' ||
		filterDateTo !== '' ||
		activeFilter !== 'all';

	$: filtersOrEntityLens = filtersActive || !!entityLensEntityId;

	$: filterDateRangeInvalid = isTimelineFilterDateRangeInverted(filterDateFrom, filterDateTo);
	$: showLargeTimelineFilterHint = shouldShowLargeTimelineFilterHint(
		Math.max(lastKnownUnfilteredTotal, entries.length)
	);
	$: searchHighlightNeedle = normalizeTimelineSearchNeedle(filterSearchText);

	function operationalDayKeyFromIso(iso: string): string {
		const d = new Date(iso);
		if (isNaN(d.getTime())) return '';
		return new Intl.DateTimeFormat('en-CA', {
			timeZone: DEFAULT_OPERATIONAL_TIMEZONE,
			year: 'numeric',
			month: '2-digit',
			day: '2-digit'
		}).format(d);
	}

	function formatOperationalDayBannerLabel(dayKey: string): string {
		if (dayKey === 'unknown') return 'DATE UNKNOWN';
		const m = dayKey.match(/^(\d{4})-(\d{2})-(\d{2})$/);
		if (!m) return dayKey;
		const y = parseInt(m[1], 10);
		const mo = parseInt(m[2], 10) - 1;
		const d = parseInt(m[3], 10);
		const date = new Date(y, mo, d);
		return new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
			.format(date)
			.toUpperCase();
	}

	$: dayGroups = (() => {
		const groups: { dayKey: string; label: string; items: TimelineEntry[] }[] = [];
		let currentKey = '';
		let bucket: TimelineEntry[] = [];
		for (const e of entries) {
			const k = operationalDayKeyFromIso(e.occurred_at);
			const key = k || 'unknown';
			if (currentKey === '') {
				currentKey = key;
				bucket = [e];
				continue;
			}
			if (key !== currentKey) {
				groups.push({
					dayKey: currentKey,
					label: formatOperationalDayBannerLabel(currentKey),
					items: bucket
				});
				currentKey = key;
				bucket = [e];
			} else {
				bucket.push(e);
			}
		}
		if (bucket.length && currentKey) {
			groups.push({
				dayKey: currentKey,
				label: formatOperationalDayBannerLabel(currentKey),
				items: bucket
			});
		}
		return groups;
	})();

	$: entriesThisWeekCount = entries.filter((e) => {
		const t = new Date(e.occurred_at).getTime();
		const now = Date.now();
		return !isNaN(t) && now - t <= 7 * 86400000 && t <= now;
	}).length;

	$: lateLogAlertsCount = entries.filter((e) => {
		const o = new Date(e.occurred_at).getTime();
		const c = new Date(e.created_at).getTime();
		return !isNaN(o) && !isNaN(c) && c - o > 24 * 3600000;
	}).length;

	$: chronologyGapsCount = (() => {
		let gaps = 0;
		for (let i = 1; i < entries.length; i++) {
			const a = new Date(entries[i - 1].occurred_at).getTime();
			const b = new Date(entries[i].occurred_at).getTime();
			if (!isNaN(a) && !isNaN(b) && b - a > 7 * 86400000) gaps += 1;
		}
		return gaps;
	})();

	const TIMELINE_TYPE_BAR_PALETTE = [
		'bg-sky-500/80',
		'bg-emerald-500/80',
		'bg-amber-500/80',
		'bg-violet-500/80',
		'bg-slate-500/75',
		'bg-gray-500/70'
	] as const;

	$: timelineTypeDistributionRows = (() => {
		const counts = new Map<string, number>();
		for (const e of entries) {
			const t = String(e.type ?? '').trim() || 'unspecified';
			counts.set(t, (counts.get(t) ?? 0) + 1);
		}
		const rows = Array.from(counts.entries())
			.map(([type, count]) => ({
				label: timelineEntryTypeOptionLabel(type),
				count,
				type
			}))
			.sort((a, b) => b.count - a.count)
			.slice(0, 6);
		const max = rows.length ? Math.max(...rows.map((r) => r.count), 1) : 1;
		return rows.map((r, i) => ({
			label: r.label,
			count: r.count,
			barClass: TIMELINE_TYPE_BAR_PALETTE[i % TIMELINE_TYPE_BAR_PALETTE.length],
			pct: Math.round((r.count / max) * 100)
		}));
	})();

	function focusTimelineScrollTop(): void {
		scrollContainerEl?.scrollTo({ top: 0, behavior: 'smooth' });
	}

	/** Deep link from Files preview / external refs: strip after reveal so refresh does not re-scroll. */
	function stripFocusEntryQueryFromUrl(): void {
		if (!browser) return;
		const url = new URL(window.location.href);
		if (!url.searchParams.has('focusEntry')) return;
		url.searchParams.delete('focusEntry');
		const next = url.pathname + (url.search ? url.search : '') + url.hash;
		void goto(next, { replaceState: true, noScroll: true, keepFocus: true });
	}

	/** Last consumed `?focusEntry=` (avoid re-applying while the param is still in the URL during reveal). */
	let consumedFocusEntryKey = '';

	// P99-02 — arrival orientation strip (read-only; P99-01 contract only)
	$: if (browser && caseId) {
		p99ArrivalSnapshot = nextP99ArrivalSnapshot($page.state, caseId, 'timeline', p99ArrivalSnapshot);
	}

	// P103-02 — citation navigation intent (timeline_entry; same reveal sequence as P97; read-only)
	$: if (browser && caseId) {
		const raw = $page.state?.p103CitationNavigationIntent;
		if (raw !== undefined && raw !== null) {
			if (isP103TimelineNavigationIntent(raw, caseId)) {
				if (!navTargetId && !revealInFlight) {
					navTargetId = raw.target_id;
					synthesisRevealBanner = 'idle';
				}
			} else if (isStaleP103NavigationIntentShape(raw)) {
				void clearSynthesisNavState();
			}
		}
	}

	// P97-02 — consume synthesis navigation intent (authoritative Timeline only; invalid intents cleared)
	$: if (browser && caseId) {
		const p103Raw = $page.state?.p103CitationNavigationIntent;
		if (p103Raw && isP103TimelineNavigationIntent(p103Raw, caseId)) {
			// P103-02 consumes timeline citation navigation first; do not merge with synthesis intent.
		} else {
			const intent = $page.state?.synthesisSourceNavigationIntent;
			if (intent) {
				const id = pickTimelineAuthoritativeTargetId(intent, caseId);
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

	// Deep link: `?focusEntry=<timeline_entries.id>` (e.g. Files → Preview → Links → Open entry)
	$: if (browser && caseId) {
		const fe = $page.url.searchParams.get('focusEntry')?.trim();
		if (!fe) {
			consumedFocusEntryKey = '';
		} else {
			const key = `${$page.url.pathname}?focusEntry=${encodeURIComponent(fe)}`;
			if (key !== consumedFocusEntryKey && !navTargetId && !revealInFlight) {
				consumedFocusEntryKey = key;
				navTargetId = fe;
				synthesisRevealBanner = 'idle';
			}
		}
	}

	$: if (browser && navTargetId && !loading && !loadError) {
		void runRevealSequence();
	}

	$: if (loadError && navTargetId) {
		navTargetId = null;
		synthesisContextPreview = null;
		synthesisRevealBanner = 'idle';
		stripFocusEntryQueryFromUrl();
		void clearSynthesisNavState();
	}

	onMount(() => {
		timelineListMounted = true;
	});

	// P41-46: refetch page 1 when filter state or show-deleted changes (search is debounced into filterQueryForApi).
	// P108-01: entity lens is URL-driven (`entityLensEntityId` from `$page.url`).
	$: if (caseId && $caseEngineToken && prevLoadedCaseId === caseId && timelineListMounted) {
		void activeFilter;
		void filterDateFrom;
		void filterDateTo;
		void filterQueryForApi;
		void showDeleted;
		void isAdmin;
		void entityLensEntityId;
		void loadEntries();
	}

	let editingEntryId: string | null = null;
	let editDraft: EditDraft | null = null;
	let editSaving = false;
	let editError = '';
	let editLinkedUploading = false;
	let editLinkedUploadError = '';

	/** Include legacy `note` in the edit <select> only when the row is still `note`. */
	$: editTypeSelectOptions = timelineEntryTypeSelectOptions(
		editingEntryId ? entries.find((e) => e.id === editingEntryId)?.type : null
	);

	// ── Dirty-switch confirm dialog (P28-36) ────────────────────────────────────
	// Replaces window.confirm from P28-34. Same deferred-action pattern as Notes.
	let showDiscardConfirm = false;
	/** P101 — Phase 101 AI proposal draft panel (opens next to + Log entry). */
	let showP101ProposalModal = false;
	let pendingDiscardAction: (() => void) | null = null;

	function doStartEdit(entry: TimelineEntry): void {
		// Close composer silently (guard already fired before calling this).
		composerOpen = false;
		composerDraft = null;
		composerError = '';
		editingEntryId = entry.id;
		editDraft = {
			title: (entry.title ?? '').trim(),
			text_original: entry.text_original,
			type: entry.type,
			occurred_at: isoToDatetimeLocal(entry.occurred_at),
			location_text: entry.location_text ?? '',
			change_reason: '',
			linked_images: (entry.linked_image_files ?? []).map((f) => ({
				id: f.id,
				original_filename: f.original_filename
			}))
		};
		editError = '';
		editLinkedUploadError = '';
	}

	function startEdit(entry: TimelineEntry): void {
		// Guard: another entry in edit mode, or composer has unsaved content.
		if ((editingEntryId && editingEntryId !== entry.id) || isDirtyBottomComposer(composerDraft)) {
			pendingDiscardAction = () => doStartEdit(entry);
			showDiscardConfirm = true;
			return;
		}
		doStartEdit(entry);
	}

	function cancelEdit(): void {
		editingEntryId = null;
		editDraft = null;
		editError = '';
		editLinkedUploadError = '';
	}

	async function handleEditLinkedImagesPick(files: FileList | null): Promise<void> {
		if (!files?.length || !editDraft) return;
		const token = get(caseEngineToken);
		if (!token) return;
		editLinkedUploadError = '';
		editLinkedUploading = true;
		try {
			for (const file of Array.from(files)) {
				if (!file.type.startsWith('image/')) {
					editLinkedUploadError =
						'Only image files can be attached. Each file is stored as a case file and linked when you save.';
					continue;
				}
				const cf = await uploadCaseFile(caseId, file, token);
				editDraft = {
					...editDraft,
					linked_images: [...editDraft.linked_images, { id: cf.id, original_filename: cf.original_filename }]
				};
			}
		} catch (e: unknown) {
			editLinkedUploadError =
				e instanceof Error ? e.message : 'Image upload failed. You can remove the file and try again.';
		} finally {
			editLinkedUploading = false;
		}
	}

	function removeEditLinkedImage(fileId: string): void {
		if (!editDraft) return;
		editDraft = {
			...editDraft,
			linked_images: editDraft.linked_images.filter((x) => x.id !== fileId)
		};
	}

	async function saveEdit(): Promise<void> {
		if (!editingEntryId || !editDraft || !$caseEngineToken) return;

		const reason = editDraft.change_reason.trim();
		if (!reason) {
			editError = 'Reason for change is required.';
			return;
		}
		const titleTrim = editDraft.title.trim();
		if (!titleTrim) {
			editError = 'Title is required.';
			return;
		}

		const text = normalizeTimelineEntryTextForSave(editDraft.text_original.trim());
		if (!text) {
			editError = 'Entry text must not be empty.';
			return;
		}

		const baseline = entries.find((e) => e.id === editingEntryId);
		if (!baseline) {
			editError = 'Entry not found.';
			return;
		}
		const draftOccurredAtIso = datetimeLocalToIso(editDraft.occurred_at);
		if (
			timelineEditRequiresDetailedReason(
				baseline,
				{ type: editDraft.type, text_original: text },
				draftOccurredAtIso
			) &&
			reason.length < TIMELINE_SENSITIVE_CHANGE_REASON_MIN_LEN
		) {
			editError = TIMELINE_SENSITIVE_REASON_HINT;
			return;
		}

		editSaving = true;
		editError = '';

		try {
			const updated = await updateCaseTimelineEntry(
				caseId,
				editingEntryId,
				$caseEngineToken,
				{
					title: titleTrim,
					text_original: text,
					type: editDraft.type,
					occurred_at: draftOccurredAtIso,
					location_text: editDraft.location_text.trim() || null,
					change_reason: reason,
					linked_file_ids: editDraft.linked_images.map((x) => x.id)
				}
			);

			// Apply the returned values to the local entries array.
			// version_count is a computed column not in the PUT response,
			// so we increment it locally (+1 for the version just captured).
			const savedId = editingEntryId;
			entries = sortTimelineEntriesOfficialOrder(
				entries.map((e) => {
					if (e.id !== savedId) return e;
					return {
						...e,
						title: (updated.title as string) ?? e.title,
						text_original: (updated.text_original as string) ?? e.text_original,
						type: (updated.type as string) ?? e.type,
						occurred_at: (updated.occurred_at as string) ?? e.occurred_at,
						location_text: (updated.location_text as string | null) ?? null,
						text_cleaned: (updated.text_cleaned as string | null) ?? null,
						version_count: (e.version_count ?? 0) + 1,
						linked_image_files: Array.isArray(updated.linked_image_files)
							? (updated.linked_image_files as TimelineEntry['linked_image_files'])
							: e.linked_image_files
					};
				})
			);

			cancelEdit();
		} catch (e: unknown) {
			editError = e instanceof Error ? e.message : 'Save failed. Please try again.';
		} finally {
			editSaving = false;
		}
	}

	function isTimelineRouteDirty(): boolean {
		return (
			isDirtyBottomComposer(composerDraft) ||
			isDirtyTimelineEdit(editingEntryId, editDraft, entries)
		);
	}

	// ── Route-navigation guard (P38-06; pattern from Notes P28-29 / P28-46) ─────
	// Cross-case navigations pass through — the case-switch reactive block clears
	// timeline draft state. Loop prevention: discard clears dirty state before goto().
	beforeNavigate(({ cancel, willUnload, to }) => {
		if (!isTimelineRouteDirty() || willUnload || !to) return;
		if (to.params?.id && to.params.id !== caseId) return;
		if (showDiscardConfirm) {
			cancel();
			return;
		}
		cancel();
		const targetHref = to.url.href;
		pendingDiscardAction = () => {
			cancelComposer();
			cancelEdit();
			goto(targetHref);
		};
		showDiscardConfirm = true;
	});
</script>

<svelte:window on:keydown={handleTimelinePageKeydown} />

<!--
	Official Case Timeline — P28-31 through P28-38
	Backed by timeline_entries (official case records).
	Not to be confused with notebook notes (working drafts).
	Renders inside the P19-06 case shell (+layout.svelte).
-->

<!-- Dirty-switch confirm dialog (P28-36) -->
<ConfirmDialog
	bind:show={showDiscardConfirm}
	title="Discard unsaved changes?"
	message="You have unsaved timeline changes. If you continue, they will be lost."
	cancelLabel="Keep editing"
	confirmLabel="Discard"
	onConfirm={() => {
		if (pendingDiscardAction) {
			pendingDiscardAction();
			pendingDiscardAction = null;
		}
	}}
/>

<!-- Soft-delete confirm dialog (P28-35) -->
<ConfirmDialog
	bind:show={showDeleteConfirm}
	title="Remove entry from timeline?"
	message="This entry will be soft-deleted and removed from the active timeline. It is not permanently deleted — an ADMIN can restore it. This action is audited."
	cancelLabel="Keep entry"
	confirmLabel="Remove"
	onConfirm={executeDelete}
/>

<!-- Restore confirm dialog (P28-35, ADMIN only) -->
<ConfirmDialog
	bind:show={showRestoreConfirm}
	title="Restore entry to timeline?"
	message="This entry will be restored to the active timeline and become visible to all users with access to this case."
	cancelLabel="Cancel"
	confirmLabel="Restore"
	onConfirm={executeRestore}
/>

{#if !routeCaseId}
	<CaseWorkspaceRouteSurfacePlaceholder surface="Timeline" testId="case-timeline-placeholder" />
{:else}
<CaseWorkspaceContentRegion testId="case-timeline-page">
<div class="ce-l-timeline-shell relative">
	<!-- P124-01 — Authority framing (OCC hero row; static copy). -->
	<section
		class="ce-l-timeline-hero shrink-0 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"
		data-testid="case-timeline-p124-authority-framing"
		aria-labelledby="case-timeline-mock-hero-title"
	>
		<div class="flex flex-col gap-1 min-w-0">
			<div class="sr-only ce-l-timeline-hero-title">Timeline surface</div>
			<h2
				id="case-timeline-mock-hero-title"
				class="m-0 flex items-center gap-2 text-lg font-semibold tracking-tight text-[color:var(--ce-l-text-primary)]"
			>
				<span class="ds-occ-kpi-card--blue ds-case-overview-kpi-tile__icon" aria-hidden="true">
					<CalendarDaysIcon />
				</span>
				Timeline
			</h2>
			<p class="m-0 max-w-2xl text-xs leading-snug text-[color:var(--ce-l-text-muted)]">
				Official chronological investigative record. Ordered by occurred time.
			</p>
			<p class="sr-only">{TIMELINE_HEADER_RULES_LINE}</p>
		</div>
		<div class="flex flex-col items-stretch gap-3 sm:items-end">
			<div class="flex flex-wrap items-center justify-end gap-3 sm:gap-4">
				<div class="text-right">
					<div
						class="text-2xl font-semibold tabular-nums text-[color:var(--ce-l-text-primary)] leading-none"
						data-testid="case-timeline-count"
					>
						{totalEntries}
					</div>
					<div class="text-[10px] uppercase tracking-wide text-[color:var(--ce-l-text-muted)]">Entries</div>
				</div>
				{#if filtersActive && !entityLensEntityId}
					<span
						class="{DS_BADGE_CLASSES.base} {DS_BADGE_CLASSES.neutral} inline-flex items-center gap-1"
						data-testid="case-timeline-filtered-badge"
					>
						<span aria-hidden="true">⏷</span> Filtered
					</span>
				{/if}
				<button
					type="button"
					on:click={openCreateForm}
					disabled={loading}
					class="{DS_BTN_CLASSES.primary} disabled:opacity-40"
					data-testid="case-timeline-log-entry"
					title={TIMELINE_LOG_ENTRY_BUTTON_TITLE}
				>
					+ Add Timeline Entry
				</button>
				<DropdownMenu.Root>
					<DropdownMenu.Trigger asChild let:builder>
						<button
							type="button"
							{...builder}
							use:builder.action
							class="{DS_BTN_CLASSES.secondary} inline-flex items-center gap-1"
							data-testid="case-timeline-more-actions-trigger"
							aria-label="More timeline actions"
						>
							More actions
							<span class="text-[10px] opacity-70" aria-hidden="true">▾</span>
						</button>
					</DropdownMenu.Trigger>
					<DropdownMenu.Content
						class="w-full max-w-[16rem] text-sm rounded-xl px-1 py-1 border border-gray-100 dark:border-gray-800 z-50 bg-white dark:bg-gray-850 dark:text-white shadow-lg"
						sideOffset={4}
						side="bottom"
						align="end"
						transition={flyAndScale}
					>
						<DropdownMenu.Item
							class="select-none flex gap-2 items-center px-3 py-1.5 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg"
							on:click={() => (showP101ProposalModal = true)}
							data-testid="case-timeline-p101-proposal-open"
						>
							{P101_PANEL_EYEBROW}
						</DropdownMenu.Item>
						<DropdownMenu.Item
							class="select-none flex gap-2 items-center px-3 py-1.5 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg"
							on:click={() => documentProposeCtl?.triggerPick()}
							disabled={loading}
							data-testid="case-timeline-more-propose-document"
						>
							Create from document
						</DropdownMenu.Item>
						<DropdownMenu.Item
							class="select-none px-0 py-0"
							on:click={(e) => e.preventDefault()}
						>
							<a
								href={`/case/${caseId}/tasks`}
								class="flex gap-2 items-center px-3 py-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 text-inherit no-underline"
								data-testid="case-timeline-open-tasks-operational"
							>
								Open Tasks (Operational)
							</a>
						</DropdownMenu.Item>
						<DropdownMenu.Item
							class="select-none flex gap-2 items-center px-3 py-1.5 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg"
							on:click={loadEntries}
							disabled={loading}
							data-testid="case-timeline-refresh"
						>
							{loading ? 'Refreshing…' : 'Refresh timeline'}
						</DropdownMenu.Item>
					</DropdownMenu.Content>
				</DropdownMenu.Root>
			</div>
		</div>
	</section>

	<TimelineDocumentProposeButton
		bind:this={documentProposeCtl}
		hideTrigger={true}
		caseId={caseId}
		token={$caseEngineToken ?? ''}
		disabled={loading}
	/>

	<CaseArrivalOrientationBlock context={p99ArrivalSnapshot} testId="case-timeline-p99-arrival" />

	<!-- Lifecycle error banners (P28-35) — shown beneath header if a delete/restore fails -->
	{#if deleteLifecycleError}
		<div
			class="shrink-0 px-4 py-2 bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800
			       text-xs text-red-600 dark:text-red-400 flex items-center gap-2"
			data-testid="timeline-delete-error"
		>
			<span>Remove failed: {deleteLifecycleError}</span>
			<button
				type="button"
				class="ml-auto text-xs text-red-400 hover:text-red-600"
				on:click={() => (deleteLifecycleError = '')}
				aria-label="Dismiss error"
			>✕</button>
		</div>
	{/if}
	{#if restoreLifecycleError}
		<div
			class="shrink-0 px-4 py-2 bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800
			       text-xs text-red-600 dark:text-red-400 flex items-center gap-2"
			data-testid="timeline-restore-error"
		>
			<span>Restore failed: {restoreLifecycleError}</span>
			<button
				type="button"
				class="ml-auto text-xs text-red-400 hover:text-red-600"
				on:click={() => (restoreLifecycleError = '')}
				aria-label="Dismiss error"
			>✕</button>
		</div>
	{/if}
	{#if timelineCreateOutsideFiltersHint}
		<div
			class="shrink-0 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-800
			       text-xs text-blue-800 dark:text-blue-200 flex items-center gap-2"
			data-testid="timeline-create-outside-filters-hint"
			role="status"
		>
			<span>Entry saved. It is not shown under the current filters — widen or clear filters to see it.</span>
			<button
				type="button"
				class="ml-auto text-xs text-blue-600 dark:text-blue-300 hover:underline shrink-0"
				on:click={() => (timelineCreateOutsideFiltersHint = false)}
				aria-label="Dismiss notice"
			>Dismiss</button>
		</div>
	{/if}

	{#if !loadError && entityLensEntityId}
		<CaseEntityLensBanner
			surface="timeline"
			caseId={caseId}
			entityId={entityLensEntityId}
			entityLabel={entityLensLabel || entityLensEntityId}
			onClear={clearEntityLens}
		/>
	{/if}

	<!-- ── Search + date range + type (P39-02); mockup-aligned toolbar ── -->
	<!-- Do not gate on `loading`: filter refetch sets loading=true and would unmount this bar,
	     destroying the search input and dropping focus (debounced search). -->
	{#if !loadError && (lastKnownUnfilteredTotal > 0 || filtersOrEntityLens)}
		<div
			class="ce-l-timeline-toolbar shrink-0 flex flex-col gap-2 px-4 py-2.5"
			data-testid="case-timeline-search-filter-bar"
		>
			{#if showLargeTimelineFilterHint}
				<p
					class="text-[10px] text-gray-400 dark:text-gray-500 m-0"
					data-testid="case-timeline-filter-large-list-hint"
					role="status"
				>
					Filtering large timelines may be slower
				</p>
			{/if}
			<div
				class="flex flex-col gap-2 xl:flex-row xl:items-end xl:justify-between xl:gap-3"
			>
				<div class="flex min-w-0 flex-1 flex-wrap items-end gap-2">
					<div class="relative min-w-[12rem] flex-1 max-w-lg">
						<span class="pointer-events-none absolute inset-y-0 left-2 flex items-center text-[color:var(--ce-l-text-muted)]" aria-hidden="true">⌕</span>
						<input
							type="search"
							bind:this={timelineFilterSearchEl}
							bind:value={filterSearchText}
							on:input={onFilterSearchInput}
							disabled={!!entityLensEntityId}
							placeholder="Search timeline entries…"
							class="w-full rounded-md border border-[color:var(--ce-l-border-strong)] bg-[color:var(--ce-l-canvas)] py-1.5 pl-7 pr-2 text-xs text-[color:var(--ce-l-text-primary)] focus:outline-none focus:ring-2 focus:ring-[color:var(--ds-accent)] disabled:opacity-50 disabled:cursor-not-allowed"
							data-testid="case-timeline-filter-search"
							aria-label="Search timeline entries"
						/>
					</div>
					<div class="flex flex-col gap-0.5">
						<label class="text-[10px] font-medium text-[color:var(--ce-l-text-muted)]" for="timeline-filter-entry-type">Entry type</label>
						<select
							id="timeline-filter-entry-type"
							bind:value={activeFilter}
							disabled={!!entityLensEntityId}
							class="min-w-[9rem] rounded-md border border-[color:var(--ce-l-border-strong)] bg-[color:var(--ce-l-canvas)] px-2 py-1.5 text-xs text-[color:var(--ce-l-text-primary)] focus:outline-none focus:ring-2 focus:ring-[color:var(--ds-accent)] disabled:opacity-50"
							data-testid="case-timeline-filter-entry-type"
							aria-label="Filter by entry type"
						>
							{#each FILTER_TYPES as ft}
								<option value={ft.value}>{ft.value === 'all' ? 'All types' : ft.label}</option>
							{/each}
						</select>
					</div>
					<div class="flex flex-col gap-0.5 min-w-0">
						<span class="text-[10px] font-medium text-[color:var(--ce-l-text-muted)]">Date range</span>
						<div class="flex flex-wrap items-center gap-1">
							<label class="sr-only" for="timeline-filter-date-from">Occurred from</label>
							<input
								id="timeline-filter-date-from"
								type="date"
								bind:value={filterDateFrom}
								disabled={!!entityLensEntityId}
								class="rounded-md border border-[color:var(--ce-l-border-strong)] bg-[color:var(--ce-l-canvas)] px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[color:var(--ds-accent)] disabled:opacity-50"
								data-testid="case-timeline-filter-date-from"
							/>
							<label class="sr-only" for="timeline-filter-date-to">Occurred to</label>
							<input
								id="timeline-filter-date-to"
								type="date"
								bind:value={filterDateTo}
								disabled={!!entityLensEntityId}
								class="rounded-md border border-[color:var(--ce-l-border-strong)] bg-[color:var(--ce-l-canvas)] px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[color:var(--ds-accent)] disabled:opacity-50"
								data-testid="case-timeline-filter-date-to"
							/>
						</div>
						{#if filterDateRangeInvalid}
							<span
								class="text-[10px] text-amber-600 dark:text-amber-400"
								data-testid="case-timeline-filter-date-range-hint"
								role="status"
							>
								Start date is after end date
							</span>
						{/if}
					</div>
					<div class="flex flex-col gap-0.5">
						<label class="text-[10px] font-medium text-[color:var(--ce-l-text-muted)]" for="timeline-filter-tags-placeholder">Tags</label>
						<select
							id="timeline-filter-tags-placeholder"
							disabled={true}
							class="min-w-[7rem] rounded-md border border-dashed border-[color:var(--ce-l-border-strong)] bg-transparent px-2 py-1.5 text-xs text-[color:var(--ce-l-text-muted)]"
							title="Tag filter is not available yet"
						>
							<option>All tags</option>
						</select>
					</div>
					<button
						type="button"
						class="{DS_BTN_CLASSES.ghost} !px-2 !py-1.5 text-xs"
						disabled={true}
						title="Additional filters are not available yet"
					>
						More filters
					</button>
					<button
						type="button"
						disabled={!filtersActive || !!entityLensEntityId}
						class="{DS_BTN_CLASSES.secondary} !px-2 !py-1.5 text-xs disabled:opacity-40"
						data-testid="case-timeline-filter-clear"
						on:click={clearTimelineFilters}
					>
						Clear
					</button>
					{#if filtersActive && !entityLensEntityId}
						<span
							class="self-center text-xs text-[color:var(--ce-l-text-muted)] tabular-nums"
							data-testid="case-timeline-filter-shown-count"
						>
							{entries.length} of {totalEntries} match
						</span>
					{/if}
				</div>
				<div class="flex flex-wrap items-center justify-end gap-3 border-t border-[color:var(--ce-l-border-strong)] pt-2 xl:border-0 xl:pt-0" data-testid="case-timeline-filter-strip">
					{#if isAdmin}
						<label
							class="flex cursor-pointer select-none items-center gap-2 text-xs text-[color:var(--ce-l-text-secondary)]"
							title="Show entries that have been soft-deleted (ADMIN only)"
						>
							<input
								type="checkbox"
								bind:checked={showDeleted}
								class="size-3 rounded border-gray-300 text-amber-600 focus:ring-amber-500 dark:border-gray-600"
								data-testid="case-timeline-show-deleted-toggle"
							/>
							Show removed
						</label>
					{/if}
				</div>
			</div>
		</div>
	{/if}

	<div class="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
	<OperatorCommandCenterFrame
		showHeroBand={false}
		dashboardGridVariant="cases"
		occDesktopBoard={false}
		occRootExtraClass="timeline-occ-root flex min-h-0 min-w-0 flex-1 flex-col"
		mainId="case-timeline-occ-main"
		mainAriaLabel="Timeline workspace"
		dashboardSurfaceExtraClass="!m-0 !max-w-none flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden !border-0 !bg-transparent !p-0 !shadow-none"
	>
		<div class="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden" slot="colCenter">
	<!-- ── Timeline list (sole vertical scroll in this column) ─────────────── -->
	<div
		class="ce-l-timeline-primary-scroll flex min-h-0 flex-1 flex-col gap-5 px-2 pt-4 sm:px-4 {composerOpen ? 'pb-80' : 'pb-8'}"
		data-testid="case-timeline-primary-scroll"
		bind:this={scrollContainerEl}
	>

		<!-- Loading / error / list states -->
		<div class="flex min-h-0 flex-1 flex-col">
		{#if synthesisRevealBanner === 'not_found'}
			<div
				class="rounded-md border border-amber-200 dark:border-amber-800/80 bg-amber-50/90 dark:bg-amber-950/40 px-3 py-2 text-sm text-amber-950 dark:text-amber-100 mb-3"
				role="status"
				data-testid="synthesis-timeline-reveal-not-found"
			>
				{P103_REVEAL_NOT_FOUND_TIMELINE_COPY}
			</div>
		{/if}
		{#if loadError}
			<CaseErrorState
				title="Failed to load timeline"
				message={loadError}
				onRetry={loadEntries}
			/>

		{:else if loading && entries.length === 0}
			<CaseLoadingState label="Loading timeline…" testId="case-timeline-loading" />

		{:else if entries.length === 0}
			{#if entityLensEntityId}
				<p
					class="text-sm text-gray-400 dark:text-gray-500 text-center py-12 max-w-md mx-auto"
					data-testid="case-timeline-entity-lens-empty"
				>
					{P108_ENTITY_TIMELINE_LENS_EMPTY}
				</p>
			{:else if filtersActive}
				<!-- P39-02 / P41-46: server-side filters returned no rows -->
				<p
					class="text-sm text-gray-400 dark:text-gray-500 text-center py-12"
					data-testid="case-timeline-filter-empty"
				>
					No timeline entries match the current filters.
				</p>
			{:else}
				<!-- Case has no entries yet -->
				<CaseEmptyState
					title="No official timeline entries recorded for this case."
					description={TIMELINE_EMPTY_STATE_DESCRIPTION}
					testId="case-timeline-empty"
				>
					<svelte:fragment slot="icon">
						<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
							stroke-width="1.5" stroke="currentColor"
							class="size-7 text-gray-300 dark:text-gray-600">
							<path stroke-linecap="round" stroke-linejoin="round"
								d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
						</svg>
					</svelte:fragment>
				</CaseEmptyState>
			{/if}
		{:else}
			<!-- Chronological list — occurred_at ASC (earliest at top), grouped by operational calendar day -->
			<ol class="flex flex-col gap-6" aria-label="Official case timeline">
			{#each dayGroups as group (group.dayKey)}
				<li class="flex list-none flex-col gap-0 min-w-0">
					<ol
						class="ce-timeline-day-entries relative flex flex-col gap-3"
						aria-label={`Timeline entries for ${group.label}`}
						use:timelineDayRailConnector
					>
			{#each group.items as entry (entry.id)}
				{#if editingEntryId === entry.id && editDraft}
						<!-- ── Inline governed edit form (P28-34) ──────────────────── -->
						<li
							class="flex flex-col gap-3 rounded-lg border-2 border-amber-300 dark:border-amber-700
							       bg-white dark:bg-gray-900 px-4 py-3 shadow-sm min-w-0 w-full"
							data-testid="timeline-entry-edit-form"
							data-entry-id={entry.id}
						>
							<!-- Form header -->
							<div class="flex items-center justify-between gap-2 flex-wrap">
								<div class="flex items-center gap-2">
									<span class="text-xs font-semibold text-amber-700 dark:text-amber-400">
										Editing official timeline entry
									</span>
									<span class="text-[10px] text-gray-400 dark:text-gray-500 font-mono">
										{entry.id.slice(0, 8)}…
									</span>
								</div>
								<span class="text-[10px] text-gray-400 dark:text-gray-500">
									Prior state will be captured automatically
								</span>
							</div>
							<p
								class="text-[10px] text-gray-600 dark:text-gray-400 leading-snug"
								data-testid="timeline-edit-official-record-notice"
							>
								This is the committed case timeline — changes are attributed and versioned.
							</p>
							{#if timelineEditRequiresDetailedReason(entry, editDraft, datetimeLocalToIso(editDraft.occurred_at))}
								<p
									class="text-[10px] text-amber-800/95 dark:text-amber-300/95 leading-snug"
									data-testid="timeline-edit-sensitive-hint"
								>
									{TIMELINE_SENSITIVE_REASON_HINT}
								</p>
							{/if}

						<div class="flex flex-col gap-1.5">
							<label
								class="text-xs font-medium text-gray-600 dark:text-gray-300"
								for="edit-title-{entry.id}"
							>
								Title
								<span class="text-blue-600 dark:text-blue-400 ml-0.5" title="Required">*</span>
							</label>
							<input
								id="edit-title-{entry.id}"
								type="text"
								bind:value={editDraft.title}
								autocomplete="off"
								placeholder="Short label for this entry"
								class="text-sm rounded border border-gray-300 dark:border-gray-600
								       bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-100
								       px-2.5 py-2 w-full max-w-xl
								       focus:outline-none focus:ring-1 focus:ring-amber-400 dark:focus:ring-amber-600"
								data-testid="edit-title-input"
							/>
						</div>

						<!-- Entry text (full-width textarea) -->
						<div class="flex flex-col gap-1.5">
							<label
								class="text-xs font-medium text-gray-600 dark:text-gray-300"
								for="edit-text-{entry.id}"
							>
								Entry text
							</label>
							<textarea
								id="edit-text-{entry.id}"
								use:focusOnMount
								bind:value={editDraft.text_original}
								rows="5"
								class="text-sm rounded border border-gray-300 dark:border-gray-600
								       bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-100
								       px-2.5 py-2 resize-y w-full
								       focus:outline-none focus:ring-1 focus:ring-amber-400 dark:focus:ring-amber-600"
								data-testid="edit-text-input"
							></textarea>
						</div>

						<!-- Type + occurred_at side by side -->
						<div class="flex gap-3 flex-wrap">
							<!-- Type selector -->
							<div class="flex flex-col gap-1.5 flex-1 min-w-[140px]">
								<label
									class="text-xs font-medium text-gray-600 dark:text-gray-300"
									for="edit-type-{entry.id}"
								>
									Type
								</label>
								<select
									id="edit-type-{entry.id}"
									bind:value={editDraft.type}
									class="text-sm rounded border border-gray-300 dark:border-gray-600
									       bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-100
									       px-2 py-1.5
									       focus:outline-none focus:ring-1 focus:ring-amber-400 dark:focus:ring-amber-600"
									data-testid="edit-type-select"
									title={TIMELINE_TYPE_FIELD_TOOLTIP}
								>
									{#each editTypeSelectOptions as t}
										<option value={t}>{timelineEntryTypeOptionLabel(t)}</option>
									{/each}
								</select>
							</div>

							<!-- occurred_at (datetime-local — operational America/New_York, P41-10) -->
							<div class="flex flex-col gap-1.5 flex-1 min-w-[200px]">
								<label
									class="text-xs font-medium text-gray-600 dark:text-gray-300"
									for="edit-occurred-{entry.id}"
								>
									Occurred at
									<span class="text-[10px] font-normal text-gray-400 dark:text-gray-500 ml-1">
										{TIMELINE_TIME_ZONE_LABEL}
									</span>
								</label>
								<input
									type="datetime-local"
									id="edit-occurred-{entry.id}"
									step="1"
									bind:value={editDraft.occurred_at}
									class="text-sm rounded border border-gray-300 dark:border-gray-600
									       bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-100
									       px-2 py-1.5
									       focus:outline-none focus:ring-1 focus:ring-amber-400 dark:focus:ring-amber-600"
									data-testid="edit-occurred-input"
								/>
							</div>
						</div>

						<!-- Location (optional) -->
						<div class="flex flex-col gap-1.5">
							<label
								class="text-xs font-medium text-gray-600 dark:text-gray-300"
								for="edit-location-{entry.id}"
							>
								Location
								<span class="text-[10px] font-normal text-gray-400 dark:text-gray-500 ml-1">
									(optional)
								</span>
							</label>
							<input
								type="text"
								id="edit-location-{entry.id}"
								bind:value={editDraft.location_text}
								placeholder="Leave blank to clear"
								class="text-sm rounded border border-gray-300 dark:border-gray-600
								       bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-100
								       px-2.5 py-1.5 w-full
								       focus:outline-none focus:ring-1 focus:ring-amber-400 dark:focus:ring-amber-600"
								data-testid="edit-location-input"
							/>
						</div>

						<!-- Linked images (case files; links saved with Save changes) -->
						<div class="flex flex-col gap-1.5">
							<span class="text-xs font-medium text-gray-600 dark:text-gray-300">
								Images
								<span class="text-[10px] font-normal text-gray-400 dark:text-gray-500 ml-1"
									>(optional)</span
								>
							</span>
							<div class="flex flex-wrap items-center gap-2">
								<label
									class="text-xs px-2 py-1 rounded border border-gray-300 dark:border-gray-600
									       text-gray-600 dark:text-gray-300 cursor-pointer
									       hover:bg-gray-50 dark:hover:bg-gray-800 transition
									       {editLinkedUploading ? 'opacity-50 pointer-events-none' : ''}"
									data-testid="timeline-edit-attach-images-label"
								>
									<span>{editLinkedUploading ? 'Uploading…' : 'Attach images'}</span>
									<input
										type="file"
										accept="image/*"
										multiple
										class="hidden"
										data-testid="timeline-edit-attach-images-input"
										disabled={editLinkedUploading}
										on:change={(e) => {
											void handleEditLinkedImagesPick((e.target as HTMLInputElement).files);
											(e.target as HTMLInputElement).value = '';
										}}
									/>
								</label>
								{#if editDraft.linked_images.length > 0}
									<span class="text-[10px] text-gray-500"
										>{editDraft.linked_images.length} attached</span
									>
								{/if}
							</div>
							{#if editDraft.linked_images.length > 0}
								<ul class="flex flex-wrap gap-1.5" data-testid="timeline-edit-linked-chips">
									{#each editDraft.linked_images as img (img.id)}
										<li
											class="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded
											       bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 max-w-full"
										>
											<span class="truncate max-w-[10rem]" title={img.original_filename}
												>{img.original_filename}</span
											>
											<button
												type="button"
												class="text-gray-400 hover:text-red-600 shrink-0"
												data-testid="timeline-edit-remove-linked-{img.id}"
												title="Remove from this entry (file stays in case files)"
												on:click={() => removeEditLinkedImage(img.id)}
											>
												×
											</button>
										</li>
									{/each}
								</ul>
							{/if}
							{#if editLinkedUploadError}
								<p class="text-xs text-red-500 dark:text-red-400" data-testid="timeline-edit-attach-error">
									{editLinkedUploadError}
								</p>
							{/if}
						</div>

						<!-- Reason for change (required) -->
						<div class="flex flex-col gap-1.5">
							<label
								class="text-xs font-medium text-gray-700 dark:text-gray-200"
								for="edit-reason-{entry.id}"
							>
								Reason for change
								<span
									class="text-amber-600 dark:text-amber-400 ml-0.5"
									title="Required"
								>*</span>
							</label>
							<input
								type="text"
								id="edit-reason-{entry.id}"
								bind:value={editDraft.change_reason}
								placeholder="Why is this entry being corrected?"
								class="text-sm rounded border border-gray-300 dark:border-gray-600
								       bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-100
								       px-2.5 py-1.5 w-full
								       focus:outline-none focus:ring-1 focus:ring-amber-400 dark:focus:ring-amber-600"
								data-testid="edit-reason-input"
							/>
						</div>

						<!-- Error -->
						{#if editError}
							<p
								class="text-xs text-red-500 dark:text-red-400"
								data-testid="timeline-edit-error"
							>
								{editError}
							</p>
						{/if}

						<!-- Actions -->
						<div class="flex items-center gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
								<button
									type="button"
									on:click={saveEdit}
									disabled={editSaving}
									class="text-xs font-medium px-3 py-1.5 rounded
									       bg-amber-600 hover:bg-amber-700 text-white
									       disabled:opacity-40 transition"
									data-testid="timeline-edit-save"
								>
									{editSaving ? 'Saving…' : 'Save changes'}
								</button>
								<button
									type="button"
									on:click={cancelEdit}
									disabled={editSaving}
								class={CASE_CANCEL_BTN_CLASS}
								data-testid="timeline-edit-cancel"
								>
									Cancel
								</button>
								<span class="ml-auto text-[10px] text-gray-400 dark:text-gray-500">
									Version history preserved automatically
								</span>
							</div>
						</li>
					{:else}
					<li
						class="ce-timeline-feed-item flex list-none flex-col gap-2 sm:flex-row sm:items-stretch sm:gap-3 min-w-0"
					>
						<TimelineEntryLeftRail
							dayLabel={group.label}
							showDatePill={entry.id === group.items[0]?.id}
							occurredAt={entry.occurred_at}
							entryType={entry.type}
						/>
						<TimelineEntryCard
							embeddedInTimelineRow={true}
							{entry}
							{caseId}
							token={$caseEngineToken ?? ''}
							searchHighlightNeedle={searchHighlightNeedle}
							relationshipPendingId={relationshipPendingId}
							relationshipPair={relationshipPair}
							onRelateClick={() => handleTimelineRelateClick(entry.id)}
							entryNeedsFollowUp={followUpEntryIds.has(entry.id)}
							onFollowUpClick={() => handleFollowUpToggle(entry.id)}
							onEditRequest={() => startEdit(entry)}
							onDeleteRequest={() => handleDeleteEntry(entry)}
							onRestoreRequest={isAdmin ? () => handleRestoreEntry(entry) : null}
							synthesisNavigationReveal={synthesisHighlightId === entry.id}
							synthesisNavigationContextPreview={synthesisHighlightId === entry.id
								? synthesisContextPreview
								: null}
							manualEvidenceSelectionEnabled={isTimelineEntrySelectableForEvidence(entry)}
							manualEvidenceSelected={isEvidenceSelected($evidenceSelection, 'timeline_entry', entry.id)}
							onManualEvidenceSelectionToggle={() =>
								toggleEvidenceSelection('timeline_entry', entry.id, caseId)}
						/>
					</li>
					{/if}
			{/each}
					</ol>
				</li>
			{/each}
		</ol>

		<!-- P41-43: sentinel placed INSIDE the entries content flow so it sits below
		     all loaded entry cards. When placed as a flex sibling of this inner div
		     it was always visible at the container bottom, causing eager loading. -->
		{#if hasMore}
			<div
				bind:this={scrollSentinelEl}
				class="h-4 w-full"
				aria-hidden="true"
				data-testid="timeline-scroll-sentinel"
			></div>
		{/if}
	{/if}
	</div><!-- end flex-1 loading/error/list wrapper -->

	<!-- P41-43: additional pages load via scroll sentinel only (IntersectionObserver); no manual control -->
	{#if !loading && !loadError}
		{#if loadMoreError}
			<p
				class="text-xs text-center text-red-500 dark:text-red-400 py-2 px-2"
				data-testid="timeline-load-more-error"
			>{loadMoreError}</p>
		{:else if !hasMore && entries.length > 0 && totalEntries > TIMELINE_INITIAL_CHUNK}
			<p
				class="text-xs text-center text-gray-400 dark:text-gray-500 py-3"
				data-testid="timeline-end-of-list"
			>All {totalEntries} entries loaded</p>
		{/if}
	{/if}
</div>
		</div><!-- end colCenter -->

		<div
			class="flex min-h-0 w-full min-w-0 flex-col overflow-hidden border-t border-[color:var(--ce-l-border-strong)] pt-3 min-[1200px]:h-full min-[1200px]:max-w-[26rem] min-[1200px]:min-h-0 min-[1200px]:border-l min-[1200px]:border-t-0 min-[1200px]:pt-0 min-[1200px]:pl-4"
			slot="colRight"
		>
			<CaseTimelineOccSidebar
				caseId={caseId}
				loading={loading}
				totalEntries={totalEntries}
				entriesThisWeek={entriesThisWeekCount}
				lateLogCount={lateLogAlertsCount}
				chronologyGaps={chronologyGapsCount}
				typeBars={timelineTypeDistributionRows}
				onQuickAdd={openCreateFormWithPreset}
				onReviewGaps={focusTimelineScrollTop}
			/>
		</div>
	</OperatorCommandCenterFrame>
	</div>

	<!-- ── P39-03: Bottom composer sheet ──────────────────────────────────── -->
	<!--    Fixed to bottom of the page container; Timeline list stays visible.  -->
	<!--    One composer at a time; create only; no assist features in this PR.  -->
	{#if composerOpen && composerDraft}
		<!-- Gradient bleed above sheet — subtle visual separation (no blocking backdrop) -->
		<div
			class="absolute inset-x-0 pointer-events-none"
			style="bottom: 0; height: min(60vh, 20rem); background: linear-gradient(to top, rgba(0,0,0,0.06) 0%, transparent 100%);"
			aria-hidden="true"
		></div>

		<section
			class="absolute inset-x-0 bottom-0 z-20 flex flex-col
			       bg-white dark:bg-gray-900
			       border-t-2 border-blue-300 dark:border-blue-700
			       shadow-[0_-6px_24px_rgba(0,0,0,0.10)]
			       max-h-[60vh] overflow-y-auto"
			aria-label="Log new timeline entry"
			data-testid="timeline-bottom-composer"
		>
			<!-- Sheet header -->
			<div
				class="shrink-0 flex items-center gap-3 px-4 py-2.5
				       border-b border-gray-200 dark:border-gray-800 sticky top-0
				       bg-white dark:bg-gray-900 z-10"
			>
				<span class="text-xs font-semibold text-blue-700 dark:text-blue-400">
					New timeline entry
				</span>
				<span class="text-[10px] text-gray-400 dark:text-gray-500">
					Logged directly to the official case record
				</span>
				<button
					type="button"
					class="ml-auto rounded p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200
					       hover:bg-gray-100 dark:hover:bg-gray-800 transition"
					on:click={requestCancelComposer}
					aria-label="Close composer"
					data-testid="timeline-composer-close"
					title="Close without saving"
				>
					<svg xmlns="http://www.w3.org/2000/svg" class="size-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
						<path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
					</svg>
				</button>
			</div>

			<!-- Sheet body -->
			<div class="flex flex-col gap-3 px-4 py-3">
				<!-- Required: occurred date + time (split per P39-01 §3) -->
				<div class="flex gap-3 flex-wrap">
					<div class="flex flex-col gap-1">
						<label
							class="text-xs font-medium text-gray-600 dark:text-gray-300"
							for="composer-occurred-date"
						>
							Date
							<span class="text-blue-600 dark:text-blue-400 ml-0.5" title="Required — date when this occurred">*</span>
						</label>
						<input
							type="date"
							id="composer-occurred-date"
							bind:value={composerDraft.occurred_date}
							class="text-sm rounded border border-gray-300 dark:border-gray-600
							       bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-100
							       px-2 py-1.5
							       focus:outline-none focus:ring-1 focus:ring-blue-400 dark:focus:ring-blue-600"
							data-testid="composer-occurred-date"
						/>
					</div>
					<div class="flex flex-col gap-1">
						<label
							class="text-xs font-medium text-gray-600 dark:text-gray-300"
							for="composer-occurred-time"
						>
							Time
							<span class="text-blue-600 dark:text-blue-400 ml-0.5" title={TIMELINE_TIME_ZONE_TOOLTIP}>*</span>
							<span class="text-[10px] font-normal text-gray-400 dark:text-gray-500 ml-1">{TIMELINE_TIME_ZONE_LABEL}</span>
						</label>
						<input
							type="time"
							id="composer-occurred-time"
							step="60"
							bind:value={composerDraft.occurred_time}
							class="text-sm rounded border border-gray-300 dark:border-gray-600
							       bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-100
							       px-2 py-1.5
							       focus:outline-none focus:ring-1 focus:ring-blue-400 dark:focus:ring-blue-600"
							data-testid="composer-occurred-time"
						/>
					</div>
					<div class="flex flex-col gap-1 flex-1 min-w-[140px]">
						<label
							class="text-xs font-medium text-gray-600 dark:text-gray-300"
							for="composer-type"
						>
							Type
						</label>
						<select
							id="composer-type"
							bind:value={composerDraft.type}
							class="text-sm rounded border border-gray-300 dark:border-gray-600
							       bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-100
							       px-2 py-1.5
							       focus:outline-none focus:ring-1 focus:ring-blue-400 dark:focus:ring-blue-600"
							data-testid="composer-type-select"
							title={TIMELINE_TYPE_FIELD_TOOLTIP}
						>
							{#each TIMELINE_ENTRY_TYPE_VALUES as t}
								<option value={t}>{timelineEntryTypeOptionLabel(t)}</option>
							{/each}
						</select>
					</div>
				</div>

				<div class="flex flex-col gap-1">
					<label
						class="text-xs font-medium text-gray-600 dark:text-gray-300"
						for="composer-title"
					>
						Title
						<span class="text-blue-600 dark:text-blue-400 ml-0.5" title="Required">*</span>
					</label>
					<input
						id="composer-title"
						type="text"
						bind:value={composerDraft.title}
						autocomplete="off"
						placeholder="Short label for this entry"
						class="text-sm rounded border border-gray-300 dark:border-gray-600
						       bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-100
						       px-2.5 py-2 w-full max-w-xl
						       focus:outline-none focus:ring-1 focus:ring-blue-400 dark:focus:ring-blue-600"
						data-testid="composer-title-input"
					/>
				</div>

				<!-- Required: entry text -->
				<div class="flex flex-col gap-1">
					<label
						class="text-xs font-medium text-gray-600 dark:text-gray-300"
						for="composer-text"
					>
						Entry text
						<span class="text-blue-600 dark:text-blue-400 ml-0.5" title="Required">*</span>
					</label>
					<textarea
						id="composer-text"
						use:focusOnMount
						bind:value={composerDraft.text_original}
						rows="4"
						placeholder="Describe what was observed, recorded, or actioned…"
						class="text-sm rounded border border-gray-300 dark:border-gray-600
						       bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-100
						       px-2.5 py-2 resize-y w-full
						       focus:outline-none focus:ring-1 focus:ring-blue-400 dark:focus:ring-blue-600"
						data-testid="composer-text-input"
					></textarea>
				</div>

				<!-- P39-04 + P39-05 + P39-06 + P39-07: Assisted-input controls (dictation + import + cleanup + transcription) -->
				<div class="flex flex-col gap-1.5">
					<!-- Dictation error -->
					{#if dictationState === 'error'}
						<div class="flex items-start gap-2">
							<p
								class="text-xs text-red-500 dark:text-red-400 flex-1"
								aria-live="assertive"
								data-testid="timeline-dictation-error"
							>
								{dictationError}
							</p>
							<button
								type="button"
								on:click={() => { dictationState = 'idle'; dictationError = ''; }}
								class="shrink-0 text-xs text-gray-500 dark:text-gray-400
								       hover:text-gray-700 dark:hover:text-gray-200
								       px-1.5 py-0.5 rounded transition"
								aria-label="Dismiss dictation error"
								data-testid="timeline-dictation-error-dismiss"
							>
								Dismiss
							</button>
						</div>
					{/if}
					<!-- Import error -->
					{#if importState === 'error'}
						<div class="flex items-start gap-2">
							<p
								class="text-xs text-red-500 dark:text-red-400 flex-1"
								aria-live="assertive"
								data-testid="timeline-import-error"
							>
								{importError}
							</p>
							<button
								type="button"
								on:click={resetTimelineImport}
								class="shrink-0 text-xs text-gray-500 dark:text-gray-400
								       hover:text-gray-700 dark:hover:text-gray-200
								       px-1.5 py-0.5 rounded transition"
								aria-label="Dismiss import error"
								data-testid="timeline-import-error-dismiss"
							>
								Dismiss
							</button>
						</div>
					{/if}
					<!-- Transcription error (P39-07) -->
					{#if transcriptionState === 'error'}
						<div class="flex items-start gap-2">
							<p
								class="text-xs text-red-500 dark:text-red-400 flex-1"
								aria-live="assertive"
								data-testid="timeline-transcription-error"
							>
								{transcriptionError}
							</p>
							<button
								type="button"
								on:click={resetTimelineTranscription}
								class="shrink-0 text-xs text-gray-500 dark:text-gray-400
								       hover:text-gray-700 dark:hover:text-gray-200
								       px-1.5 py-0.5 rounded transition"
								aria-label="Dismiss transcription error"
								data-testid="timeline-transcription-error-dismiss"
							>
								Dismiss
							</button>
						</div>
					{/if}
					<!-- Improve text result (applied / noop / error) -->
					{#if improveState === 'applied' || improveState === 'noop' || improveState === 'error'}
						<div class="flex items-center gap-2">
							<span
								class="text-xs {improveState === 'applied'
									? 'text-green-700 dark:text-green-400'
									: improveState === 'error'
									? 'text-red-600 dark:text-red-400'
									: 'text-gray-500 dark:text-gray-400'}"
								aria-live="polite"
								data-testid="timeline-improve-result"
							>
								{#if improveState === 'applied'}
									Text improved — review and save when ready.
								{:else if improveState === 'noop'}
									Already looks good — no changes made.
								{:else}
									{improveError || 'Text improvement unavailable.'}
								{/if}
							</span>
							<button
								type="button"
								on:click={() => { improveState = 'idle'; improveError = ''; }}
								class="text-xs text-gray-400 dark:text-gray-500
								       hover:text-gray-600 dark:hover:text-gray-300 transition"
								aria-label="Dismiss improve text result"
								data-testid="timeline-improve-dismiss"
							>
								×
							</button>
						</div>
					{/if}
					<!-- Controls row: state-dependent -->
					<div class="flex items-center gap-2 flex-wrap min-h-[1.75rem]">
						{#if dictationState === 'listening'}
							<!-- Dictation active — listening indicator + Stop -->
							<span
								class="inline-flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400 font-medium"
								aria-live="polite"
								data-testid="timeline-dictation-listening"
							>
								<span
									class="size-2 rounded-full bg-red-500 animate-pulse inline-block"
									aria-hidden="true"
								></span>
								Listening…
							</span>
							<button
								type="button"
								on:click={stopTimelineDictation}
								class="text-xs px-2 py-1 rounded border border-gray-300 dark:border-gray-600
								       text-gray-600 dark:text-gray-300
								       hover:bg-gray-100 dark:hover:bg-gray-800 transition"
								aria-label="Stop dictation and insert text"
								title="Stop dictation and insert recognized text"
								data-testid="timeline-dictate-stop"
							>
								Stop
							</button>
						{:else if importState === 'processing'}
							<!-- Import active — processing indicator -->
							<span
								class="inline-flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400"
								aria-live="polite"
								data-testid="timeline-import-processing"
							>
								<span
									class="size-2 rounded-full bg-blue-400 animate-pulse inline-block"
									aria-hidden="true"
								></span>
								Extracting text{importFilename ? ` from "${importFilename}"` : ''}…
							</span>
						{:else if transcriptionState === 'processing'}
							<!-- Transcription active — processing indicator (P39-07) -->
							<span
								class="inline-flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400"
								aria-live="polite"
								data-testid="timeline-transcription-processing"
							>
								<span
									class="size-2 rounded-full bg-purple-400 animate-pulse inline-block"
									aria-hidden="true"
								></span>
								Transcribing{transcriptionFilename ? ` "${transcriptionFilename}"` : ''}…
							</span>
						{:else if improveState === 'processing'}
							<!-- Improve text active — teal processing indicator -->
							<span
								class="inline-flex items-center gap-1.5 text-xs text-teal-600 dark:text-teal-400"
								aria-live="polite"
								data-testid="timeline-improve-processing"
							>
								<span
									class="size-2 rounded-full bg-teal-400 animate-pulse inline-block"
									aria-hidden="true"
								></span>
								Improving text…
							</span>
						{:else}
							<!-- Idle — both controls available -->
							<button
								type="button"
								on:click={() => void startTimelineDictation()}
								class="inline-flex items-center gap-1.5 text-xs
								       text-blue-600 dark:text-blue-400
								       hover:text-blue-700 dark:hover:text-blue-300
								       px-2 py-1 rounded border border-blue-200 dark:border-blue-800
								       hover:bg-blue-50 dark:hover:bg-blue-900/20 transition"
								title="Dictate into the entry text field (speech to text)"
								aria-label="Dictate into entry text"
								data-testid="timeline-dictate-start"
							>
								<MicSolid className="size-3.5" />
								<span>Dictate</span>
							</button>
							<!-- Import text from file (P39-05) -->
							<label
								class="inline-flex items-center gap-1.5 cursor-pointer text-xs
								       text-blue-600 dark:text-blue-400
								       hover:text-blue-700 dark:hover:text-blue-300
								       px-2 py-1 rounded border border-blue-200 dark:border-blue-800
								       hover:bg-blue-50 dark:hover:bg-blue-900/20 transition"
								title="Import text from a file (PDF, Word, .txt, .md, .csv, …)"
								aria-label="Import text from a file"
								data-testid="timeline-import-label"
							>
								<DocumentArrowUp className="size-3.5" />
								<span>Import text</span>
								<input
									type="file"
									accept={TIMELINE_IMPORT_ACCEPT}
									class="hidden"
									data-testid="timeline-import-file-input"
									on:change={(e) => void handleImportFile((e.target as HTMLInputElement).files)}
								/>
							</label>
							<!-- Improve text — AI-powered teal assist action -->
							<button
								type="button"
								on:click={() => void handleTimelineImproveText()}
								disabled={!composerDraft?.text_original?.trim()}
								class={CASE_ASSIST_BTN_CLASS}
								title="Improve entry text using AI — result stays in composer for review before save"
								aria-label="Improve entry text"
								data-testid="timeline-improve-start"
							>
								<span class="timeline-assist-shimmer" aria-hidden="true"></span>
								<span>Improve text</span>
							</button>
							<!-- Transcribe audio file (P39-07) -->
							<label
								class="inline-flex items-center gap-1.5 cursor-pointer text-xs
								       text-purple-600 dark:text-purple-400
								       hover:text-purple-700 dark:hover:text-purple-300
								       px-2 py-1 rounded border border-purple-200 dark:border-purple-800
								       hover:bg-purple-50 dark:hover:bg-purple-900/20 transition"
								title="Transcribe an audio file (MP3, WAV, M4A, WebM, …)"
								aria-label="Transcribe audio file"
								data-testid="timeline-transcription-label"
							>
								<span>Transcribe audio</span>
								<input
									type="file"
									accept={TIMELINE_AUDIO_ACCEPT}
									class="hidden"
									data-testid="timeline-transcription-file-input"
									on:change={(e) => {
										void handleTranscribeAudioFile(
											(e.target as HTMLInputElement).files
										);
										(e.target as HTMLInputElement).value = '';
									}}
								/>
							</label>
						{/if}
					</div>
				</div>

				<!-- Optional: location -->
				<div class="flex flex-col gap-1">
					<label
						class="text-xs font-medium text-gray-600 dark:text-gray-300"
						for="composer-location"
					>
						Location
						<span class="text-[10px] font-normal text-gray-400 dark:text-gray-500 ml-1">(optional)</span>
					</label>
					<input
						type="text"
						id="composer-location"
						bind:value={composerDraft.location_text}
						placeholder="e.g. 14 Elm Street, Victoria"
						class="text-sm rounded border border-gray-300 dark:border-gray-600
						       bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-100
						       px-2.5 py-1.5 w-full
						       focus:outline-none focus:ring-1 focus:ring-blue-400 dark:focus:ring-blue-600"
						data-testid="composer-location-input"
					/>
				</div>

				<!-- Optional: link images (stored as case files; saved with entry) -->
				<div class="flex flex-col gap-1.5">
					<span class="text-xs font-medium text-gray-600 dark:text-gray-300">
						Images
						<span class="text-[10px] font-normal text-gray-400 dark:text-gray-500 ml-1"
							>(optional — upload now; links apply when you log the entry)</span
						>
					</span>
					<div class="flex flex-wrap items-center gap-2">
						<label
							class="text-xs px-2 py-1 rounded border border-gray-300 dark:border-gray-600
							       text-gray-600 dark:text-gray-300 cursor-pointer
							       hover:bg-gray-50 dark:hover:bg-gray-800 transition
							       {composerLinkedUploading ? 'opacity-50 pointer-events-none' : ''}"
							data-testid="timeline-composer-attach-images-label"
						>
							<span>{composerLinkedUploading ? 'Uploading…' : 'Attach images'}</span>
							<input
								type="file"
								accept="image/*"
								multiple
								class="hidden"
								data-testid="timeline-composer-attach-images-input"
								disabled={composerLinkedUploading}
								on:change={(e) => {
									void handleComposerLinkedImagesPick(
										(e.target as HTMLInputElement).files
									);
									(e.target as HTMLInputElement).value = '';
								}}
							/>
						</label>
						{#if composerDraft.linked_images.length > 0}
							<span class="text-[10px] text-gray-500"
								>{composerDraft.linked_images.length} attached</span
							>
						{/if}
					</div>
					{#if composerDraft.linked_images.length > 0}
						<ul class="flex flex-wrap gap-1.5" data-testid="timeline-composer-linked-chips">
							{#each composerDraft.linked_images as img (img.id)}
								<li
									class="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded
									       bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 max-w-full"
								>
									<span class="truncate max-w-[10rem]" title={img.original_filename}
										>{img.original_filename}</span
									>
									<button
										type="button"
										class="text-gray-400 hover:text-red-600 shrink-0"
										data-testid="timeline-composer-remove-linked-{img.id}"
										title="Remove from this entry (file stays in case files)"
										on:click={() => removeComposerLinkedImage(img.id)}
									>
										×
									</button>
								</li>
							{/each}
						</ul>
					{/if}
					{#if composerLinkedUploadError}
						<p class="text-xs text-red-500 dark:text-red-400" data-testid="timeline-composer-attach-error">
							{composerLinkedUploadError}
						</p>
					{/if}
				</div>

				<!-- Error -->
				{#if composerError}
					<p
						class="text-xs text-red-500 dark:text-red-400"
						data-testid="timeline-composer-error"
					>
						{composerError}
					</p>
				{/if}

				<!-- Actions -->
				<div
					class="flex items-center gap-2 pt-2.5 border-t border-gray-100 dark:border-gray-800"
				>
					<button
						type="button"
						on:click={saveComposer}
						disabled={composerSaving || !composerSaveValid}
						class="text-xs font-medium px-3 py-1.5 rounded
						       bg-blue-600 hover:bg-blue-700 text-white
						       disabled:opacity-40 disabled:cursor-not-allowed transition"
						title={!composerSaveValid ? 'Date, time, and entry text are required before saving' : 'Log this entry to the official case record'}
						data-testid="timeline-composer-save"
					>
						{composerSaving ? 'Saving…' : 'Log entry'}
					</button>
				<button
					type="button"
					on:click={requestCancelComposer}
					disabled={composerSaving}
					class={CASE_CANCEL_BTN_CLASS}
					data-testid="timeline-composer-cancel"
				>
						Cancel
					</button>
					{#if !composerSaveValid}
						<span class="ml-auto text-[10px] text-gray-400 dark:text-gray-500">
							Date, time, and text required
						</span>
					{:else}
						<span class="ml-auto text-[10px] text-gray-400 dark:text-gray-500">
							Entry is logged directly to the case record
						</span>
					{/if}
				</div>
			</div>
		</section>
	{/if}

	{#if showP101ProposalModal}
		<div
			class="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-3 sm:p-6"
			role="dialog"
			aria-modal="true"
			aria-labelledby="case-timeline-p101-modal-title"
			data-testid="case-timeline-p101-proposal-modal"
			on:click={() => (showP101ProposalModal = false)}
		>
			<div
				class="max-h-[min(90vh,52rem)] w-full max-w-3xl overflow-y-auto overflow-x-hidden rounded-xl border border-[color:var(--ce-l-border-strong)] bg-[color:var(--ce-l-chrome)] shadow-xl"
				on:click|stopPropagation
			>
				<div
					class="sticky top-0 z-[1] flex items-center justify-between gap-3 border-b border-[color:var(--ce-l-border-subtle)] bg-[color:var(--ce-l-chrome)] px-4 py-3"
				>
					<h2
						id="case-timeline-p101-modal-title"
						class="m-0 text-sm font-semibold text-[color:var(--ce-l-text-primary)]"
					>
						{P101_PANEL_EYEBROW} · Timeline
					</h2>
					<button
						type="button"
						class="shrink-0 rounded-md px-2 py-1 text-xs font-medium text-[color:var(--ce-l-text-secondary)] hover:bg-[color:var(--ce-l-surface-muted)]"
						on:click={() => (showP101ProposalModal = false)}
						data-testid="case-timeline-p101-proposal-modal-close"
						aria-label="Close proposal draft"
					>
						Close
					</button>
				</div>
				<div class="px-3 pb-4 pt-2 sm:px-4">
					<CaseAiProposalDraftPanel
						caseId={caseId}
						caseEngineToken={$caseEngineToken ?? ''}
						defaultProposalType="timeline_entry"
						surfaceLabel="Timeline"
					/>
				</div>
			</div>
		</div>
	{/if}
</div>
</CaseWorkspaceContentRegion>
{/if}

<style>
	/* Teal sheen for "Improve text" assist button — mirrors Notes workflow-shimmer.
	   Idle-only affordance that this is an AI-assisted action; respects reduced-motion. */
	.timeline-assist-shimmer {
		position: absolute;
		inset: 0;
		background: linear-gradient(
			75deg,
			transparent 35%,
			rgba(45, 212, 191, 0.16) 50%,
			transparent 65%
		);
		background-size: 300% 100%;
		background-position: 200% center;
		animation: timeline-assist-sheen 6s ease-in-out 1s infinite;
		pointer-events: none;
	}

	@keyframes timeline-assist-sheen {
		0% {
			background-position: 200% center;
			opacity: 0;
		}
		8% {
			opacity: 1;
		}
		42% {
			background-position: -100% center;
			opacity: 1;
		}
		50% {
			opacity: 0;
		}
		100% {
			background-position: -100% center;
			opacity: 0;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.timeline-assist-shimmer {
			animation: none;
			background: transparent;
		}
	}
</style>
