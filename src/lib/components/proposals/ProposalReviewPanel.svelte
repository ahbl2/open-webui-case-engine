<script lang="ts">
	/**
	 * P19-10 — Proposal Review Panel
	 *
	 * Detective-grade proposal review UI. Handles the full review lifecycle:
	 *   pending → approve/reject → commit
	 *
	 * DOCTRINE:
	 *   - Never updates status until the API returns success.
	 *   - No optimistic state. No fake success.
	 *   - Backend errors are classified and surfaced explicitly.
	 *   - Illegal transitions are blocked in UI; backend enforces the real rules.
	 *   - Bulk operations process proposals serially; partial failures are surfaced.
	 *   - Self-review and capability errors are distinct from generic 403s.
	 * P40-05 — Multi-proposal confirm dialogs (≥2), queue mix summary, bulk commit disabled reasons.
	 */
	import { onMount, onDestroy, tick } from 'svelte';
	import { afterNavigate, beforeNavigate, goto } from '$app/navigation';
	import {
		listProposalsPaginated,
		PROPOSALS_LOAD_MORE_CHUNK,
		PROPOSALS_TAB_PAGE_SIZE,
		approveProposal,
		rejectProposal,
		commitProposal,
		reviseChatIntakeProposal,
		updateProposal,
		type ProposalRecord,
		type ProposalStatus
	} from '$lib/apis/caseEngine';
	import {
		canApprove,
		canReject,
		canCommit,
		isBulkCommitEnabled,
		isBulkApproveEnabled,
		isBulkRejectEnabled,
		classifyApiError,
		timelineProposalCommitBlockedByLowChronology,
		normalizeProposalPayloadChronologyConfidence,
		statusLabel,
		payloadPreview,
		documentTimelineIngestOperatorNarrative,
		statusBadgeClasses,
		tabClasses,
		summarizeProposalQueueMix,
		formatProposalQueueMixSummary,
		getBulkApprovePendingTargets,
		bulkCommitSelectionBlockedReason
	} from '$lib/utils/proposalUiState';
	import {
		formatCaseDateTime,
		formatOperationalCaseDateTimeWithSeconds
	} from '$lib/utils/formatDateTime';
	import { datetimeLocalToIso } from '$lib/caseTimeline/timelineOccurredAtLocal';
	import {
		TIMELINE_ENTRY_TYPE_VALUES,
		timelineEntryTypeOptionLabel,
		isCanonicalTimelineEntryType
	} from '$lib/caseTimeline/timelineEntryTypeOptions';
	import {
		TIMELINE_TIME_ZONE_LABEL,
		TIMELINE_TIME_ZONE_TOOLTIP
	} from '../../../routes/(app)/case/[id]/timeline/timelineOperatorMicrocopy';
	import ConfirmDialog from '$lib/components/common/ConfirmDialog.svelte';
	import DeterministicTimestampCandidatesReview from './DeterministicTimestampCandidatesReview.svelte';
	import OccurredAtTimestampReconciliationReview from './OccurredAtTimestampReconciliationReview.svelte';
	import OccurredAtGuidanceReview from './OccurredAtGuidanceReview.svelte';
	import { parseDeterministicTimestampCandidatesFromPayload } from '$lib/caseTimeline/deterministicTimestampCandidates';
	import {
		documentIngestEditFieldsFromPayload,
		isDocumentIngestEditDirtyForProposal
	} from '$lib/utils/proposalDocumentIngestEditGuard';
	import { isStaleProposalsLoadMoreAppend } from '$lib/utils/proposalListLoadMoreStaleGuard';
	import CaseProposalCreateForm from '$lib/components/case/CaseProposalCreateForm.svelte';
	import CaseProposalDetailPanel from '$lib/components/case/CaseProposalDetailPanel.svelte';
	import { P128_CREATE_ENTRY_BUTTON, P128_CREATE_TOGGLE_CLOSE } from '$lib/caseContext/p128ProposalCreateCopy';
	import {
		P128_LIST_TOOLBAR_LABEL,
		P128_PROPOSALS_AUTHORITY_BANNER,
		P128_SUMMARY_LABEL_PENDING,
		P128_SUMMARY_LABEL_ACCEPTED,
		P128_SUMMARY_LABEL_REJECTED,
		P128_SUMMARY_LABEL_COMMITTED,
		P128_TAB_PENDING_TITLE,
		P128_TAB_ACCEPTED_TITLE,
		P128_TAB_REJECTED_TITLE,
		P128_TAB_COMMITTED_TITLE,
		P128_LIST_LOADING,
		P128_LIST_EMPTY_PENDING_SEARCH,
		P128_LIST_EMPTY_ACCEPTED,
		P128_LIST_EMPTY_REJECTED,
		P128_LIST_EMPTY_COMMITTED,
		P128_EMPTY_PANEL_TITLE_PENDING,
		P128_EMPTY_PANEL_LEAD,
		P128_EMPTY_PANEL_REMINDER,
		P128_EMPTY_PANEL_TITLE_SEARCH,
		P128_LIST_ROW_COUNT,
		P128_LIST_DETAIL_TOGGLE,
		P128_LIST_DETAIL_TOGGLE_COLLAPSE
	} from '$lib/caseContext/p128ProposalListCopy';
	import {
		p128ProposalListPreviewBody,
		p128TruncatedPreview,
		p128StatusDisplayLabel
	} from '$lib/caseContext/p128ProposalDisplay';
	import {
		P128_ACCEPT_BUTTON,
		P128_ACCEPT_BUTTON_TITLE,
		P128_REJECT_BUTTON,
		P128_FINALIZE_RECORD_BUTTON,
		P128_ACCEPT_SUCCESS_TOAST,
		P128_REJECT_SUCCESS_TOAST,
		P128_COMMIT_SUCCESS_TOAST,
		P128_CHRONO_CONFIRM_BUTTON
	} from '$lib/caseContext/p128ProposalReviewCopy';
	import { toast } from 'svelte-sonner';
	import {
		DS_BANNER_CLASSES,
		DS_BTN_CLASSES,
		DS_EMPTY_CLASSES,
		DS_PROPOSALS_CLASSES,
		DS_STATUS_SURFACE_CLASSES,
		DS_STATUS_TEXT_CLASSES,
		DS_TYPE_CLASSES
	} from '$lib/case/detectivePrimitiveFoundation';
	import ProposalCard from '$lib/components/proposals/ProposalCard.svelte';
	import {
		proposalCardCreatedSubline,
		proposalCardIconKey,
		proposalCardOptionalUpdateLine,
		proposalCardSourceLabel,
		proposalCardStatusChipLabel,
		proposalCardTitle,
		proposalCardTypeChip
	} from '$lib/case/proposalCardViewModel';
	import {
		CalendarDaysIcon,
		CheckCircleIcon,
		ClockIcon,
		XCircleIcon
	} from 'heroicons-svelte/24/outline';
	import {
		CASE_PROPOSALS_INVALIDATE_EVENT,
		type CaseProposalsInvalidateDetail
	} from '$lib/utils/caseProposalsInvalidate';

	// ── Props ──────────────────────────────────────────────────────────────────

	export let caseId: string;
	export let token: string;
	/** `page` = full-height dashboard; `compact` = e.g. Case Tools sidebar. */
	export let layout: 'compact' | 'page' = 'compact';
	/** P128-03 — false on embedded surfaces: list + read-only detail only (no approve/reject/commit). */
	export let reviewActionsEnabled = true;
	/** P128-04 — full proposals page: one proposal per action (Accept = approve+commit); no bulk or multi-select. */
	export let p128SingleReviewMode = false;
	/** P128 list/detail presentation (read-only or single-action page). */
	$: p128Presentation = !reviewActionsEnabled || p128SingleReviewMode;
	/** When true, refetch on client in-app navigation (not initial load; P38-03). */
	export let refreshOnNav = false;

	let typeFilter: 'all' | 'timeline' | 'note' = 'all';

	let chatIntakeRevisingId = '';
	let chatIntakeReviseFeedback = '';

	/** P40-01 — pending edits for document → timeline proposals (keyed by proposal id). */
	let docEditById: Record<
		string,
		{
			occurred_at: string;
			type: string;
			text_original: string;
			text_cleaned: string;
			occurred_at_confidence: string;
			operator_occurred_at_confirmed: boolean;
		}
	> = {};
	let documentIngestSavingId = '';

	// ── Data state ─────────────────────────────────────────────────────────────

	let proposals: ProposalRecord[] = [];
	/** P43-08 — server totals for tab badges (same proposal_type filter as the list request when Type ≠ All). */
	let totalsByStatus: Record<ProposalStatus, number> = {
		pending: 0,
		approved: 0,
		rejected: 0,
		committed: 0
	};
	/** Authoritative row count for the active status tab (with type filter). */
	let totalForActiveTab = 0;
	/** P43-10-FU2 — more rows exist on the server for the active list context. */
	let hasMore = false;
	let isLoadingMore = false;
	let loadMoreError = '';
	/** P43-10-FU2 — load-more op generation (Timeline `timelineLoadMoreEpoch` parity). */
	let proposalsLoadMoreEpoch = 0;
	let scrollSentinelEl: HTMLElement | undefined;
	let scrollObserver: IntersectionObserver | undefined;
	/** P43-10 — draft search text; applied search is what the server last used (guarded in load completion). */
	let listSearchDraft = '';
	let listSearchApplied = '';
	let loading = false;
	let loadError = '';
	/** P43-07 (I-03) — superseded in-flight list fetches must not overwrite newer results (c.f. CaseFilesTab `activeLoadId`). */
	let activeProposalsLoadId = 0;

	/** P43-10-FU1 — list region used to find scroll ports (`overflow-y` on this node or ancestors; chat tool uses outer `overflow-auto`). */
	let proposalListViewportEl: HTMLDivElement | null = null;

	/** P128-02 — manual create form (full proposals page only; chat has its own inline form). */
	let showCreateProposalForm = false;

	// ── Navigation ─────────────────────────────────────────────────────────────

	let activeTab: ProposalStatus = 'pending';

	// ── Expand/collapse ────────────────────────────────────────────────────────

	let expanded: Set<string> = new Set();

	// ── Selection ──────────────────────────────────────────────────────────────

	let selected: Set<string> = new Set();

	// ── Per-proposal action state ──────────────────────────────────────────────

	/** IDs of proposals with an in-flight API call. */
	let actionInProgress: Set<string> = new Set();

	/** Per-proposal error messages. Cleared on next successful action. */
	let proposalErrors: Map<string, string> = new Map();

	// ── Per-proposal reject state ──────────────────────────────────────────────

	/** ID of the proposal currently showing an inline rejection form. '' = none. */
	let rejectingId = '';
	let rejectReason = '';

	// ── Bulk state ─────────────────────────────────────────────────────────────

	let bulkRejectMode = false;
	let bulkRejectReason = '';
	let bulkError = '';
	let bulkProcessing = false;
	let bulkProgressMsg = '';

	/** P40-05 — explicit confirm before multi-item approve/commit */
	let bulkApproveConfirmShow = false;
	let bulkCommitConfirmShow = false;
	let bulkApproveConfirmCount = 0;
	let bulkCommitConfirmCount = 0;
	let bulkConfirmChronologyShow = false;
	let bulkConfirmChronologyCount = 0;

	/** P43-05 (I-01) — block destructive transitions while document-ingest fields are dirty. */
	let docEditLossDialogShow = false;
	let pendingDestructive: (() => Promise<void>) | null = null;
	let hideGuardResolve: ((allowed: boolean) => void) | null = null;
	let pendingGotoUrl: URL | null = null;

	// ── Computed ───────────────────────────────────────────────────────────────

	$: pendingCount = totalsByStatus.pending;
	$: approvedCount = totalsByStatus.approved;
	$: rejectedCount = totalsByStatus.rejected;
	$: committedCount = totalsByStatus.committed;

	$: activeProposals = proposals;
	$: allSelectedOnTab =
		activeProposals.length > 0 && activeProposals.every((p) => selected.has(p.id));
	$: anySelectedOnTab = activeProposals.some((p) => selected.has(p.id));

	$: bulkCommitEnabled = isBulkCommitEnabled(selected, proposals);
	$: bulkApproveEnabled = isBulkApproveEnabled(selected, proposals);
	$: bulkRejectEnabled = isBulkRejectEnabled(selected, proposals);
	/** Approved proposals in the selection that are blocked from commit due to low chronology. */
	$: bulkChronologyBlockedIds = (() => {
		const map = new Map(proposals.map((p) => [p.id, p]));
		return [...selected].filter((id) => {
			const p = map.get(id);
			return p?.status === 'approved' && timelineProposalCommitBlockedByLowChronology(p);
		});
	})();
	$: bulkConfirmChronologyEnabled = bulkChronologyBlockedIds.length > 0 && !bulkProcessing;

	$: selectedOnTabCount = activeProposals.filter((p) => selected.has(p.id)).length;
	$: queueMixSummary = formatProposalQueueMixSummary(summarizeProposalQueueMix(activeProposals));
	$: bulkCommitBlockedReason = bulkCommitSelectionBlockedReason(selected, proposals);
	$: bulkPendingRejectCount = getBulkApprovePendingTargets(selected, proposals).length;
	$: bulkApproveConfirmMessage = `You are about to approve **${bulkApproveConfirmCount}** pending proposals. They move to the **Approved** workflow tab only (human-reviewed staging) — nothing is written to the official Timeline or governed Notes until you **commit**. Other proposals stay on their current tabs.`;
	$: bulkCommitConfirmMessage = `This commits **${bulkCommitConfirmCount}** approved proposal(s) into official case records (Timeline entries and/or governed Notes). Pending or unselected proposals are unchanged. The server still enforces chronology rules on every commit.`;

	// ── Data loading ───────────────────────────────────────────────────────────

	function hasDirtyDocumentIngestEdits(): boolean {
		for (const id of Object.keys(docEditById)) {
			const edit = docEditById[id];
			const prop = proposals.find((p) => p.id === id);
			if (!prop) return true;
			if (isDocumentIngestEditDirtyForProposal(edit, prop)) return true;
		}
		return false;
	}

	async function runWithDocEditGuard(destructive: () => Promise<void>): Promise<void> {
		if (!hasDirtyDocumentIngestEdits()) {
			await destructive();
			return;
		}
		if (docEditLossDialogShow) {
			if (hideGuardResolve != null) return;
			pendingDestructive = destructive;
			return;
		}
		pendingDestructive = destructive;
		hideGuardResolve = null;
		docEditLossDialogShow = true;
	}

	/** P43-10-FU1 — reset scroll for the proposals list viewport (internal + nearest `overflow-y` ancestors; stops before `document.body`). */
	function scrollProposalListPortToTop(): void {
		let el: HTMLElement | null = proposalListViewportEl;
		if (!el) return;
		for (let i = 0; el && i < 16; i++, el = el.parentElement) {
			if (el === document.body || el === document.documentElement) break;
			const oy = getComputedStyle(el).overflowY;
			if (oy === 'auto' || oy === 'scroll') {
				el.scrollTop = 0;
			}
		}
	}

	/** P43-10-FU1 + P44-05 — Defer `activeTab` (and search clears) until after the document-ingest guard: if the operator Cancels, tab chrome must still match the loaded list (no mismatch from setting `activeTab` before `loadProposals`). */
	async function selectProposalStatusTab(next: ProposalStatus): Promise<void> {
		await runWithDocEditGuard(async () => {
			isLoadingMore = false;
			loadMoreError = '';
			activeTab = next;
			selected = new Set();
			if (next === 'rejected' || next === 'committed') {
				listSearchDraft = '';
				listSearchApplied = '';
			}
			await tick();
			scrollProposalListPortToTop();
			await loadProposals();
		});
	}

	/** List scrollport for infinite load (root must be the overflow container, not the viewport, when the list is in a nested scroller). */
	function getProposalListIntersectionRoot(): Element | null {
		let el: HTMLElement | null = proposalListViewportEl;
		if (!el) return null;
		for (let i = 0; el && i < 24; i++) {
			const oy = getComputedStyle(el).overflowY;
			if (oy === 'auto' || oy === 'scroll') return el;
			el = el.parentElement;
		}
		return null;
	}

	function setupScrollObserver(): void {
		scrollObserver?.disconnect();
		if (!scrollSentinelEl) {
			scrollObserver = undefined;
			return;
		}
		scrollObserver = new IntersectionObserver(
			(observed) => {
				if (
					observed[0]?.isIntersecting &&
					hasMore &&
					!isLoadingMore &&
					!loading &&
					!loadError
				) {
					void executeLoadMoreProposals();
				}
			},
			{ root: getProposalListIntersectionRoot(), rootMargin: '200px', threshold: 0 }
		);
		scrollObserver.observe(scrollSentinelEl);
	}

	$: if (scrollSentinelEl) {
		const el = scrollSentinelEl;
		requestAnimationFrame(() => {
			if (scrollSentinelEl === el) setupScrollObserver();
		});
	} else {
		scrollObserver?.disconnect();
		scrollObserver = undefined;
	}

	/** P43-10-FU2 — append next chunk; not behind P43-05 guard (does not replace list or clear doc edits). */
	async function executeLoadMoreProposals(): Promise<void> {
		if (!token || !hasMore || isLoadingMore || loading || loadError) return;
		const fetchGen = activeProposalsLoadId;
		const requestedCaseId = caseId;
		const myLoadMoreOp = ++proposalsLoadMoreEpoch;
		const loadTab = activeTab;
		const loadType = typeFilter;
		const loadSearch = listSearchApplied;
		const appendBaseLen = proposals.length;

		isLoadingMore = true;
		loadMoreError = '';
		try {
			const proposalTypeArg =
				loadType === 'all' ? undefined : (loadType as 'timeline' | 'note');
			const searchTab = loadTab === 'pending' || loadTab === 'approved';
			const page = await listProposalsPaginated(caseId, token, loadTab, {
				limit: PROPOSALS_LOAD_MORE_CHUNK,
				offset: appendBaseLen,
				proposalType: proposalTypeArg,
				...(searchTab && loadSearch.trim() ? { query: loadSearch.trim() } : {})
			});
			if (
				isStaleProposalsLoadMoreAppend(fetchGen, activeProposalsLoadId, requestedCaseId, caseId)
			) {
				return;
			}
			if (activeTab !== loadTab || typeFilter !== loadType || listSearchApplied !== loadSearch) {
				return;
			}
			if (proposals.length !== appendBaseLen) return;
			if (page.offset !== appendBaseLen) return;
			const existingIds = new Set(proposals.map((p) => p.id));
			const fresh = page.proposals.filter((p) => !existingIds.has(p.id));
			proposals = [...proposals, ...fresh];
			hasMore = proposals.length < totalForActiveTab;
		} catch (e: unknown) {
			if (
				!isStaleProposalsLoadMoreAppend(fetchGen, activeProposalsLoadId, requestedCaseId, caseId)
			) {
				loadMoreError =
					e instanceof Error ? e.message : 'Failed to load more proposals.';
			}
		} finally {
			if (myLoadMoreOp === proposalsLoadMoreEpoch) {
				isLoadingMore = false;
			}
		}
	}

	async function executeLoadProposals(): Promise<void> {
		if (!token) return;
		activeProposalsLoadId += 1;
		proposalsLoadMoreEpoch += 1;
		const loadId = activeProposalsLoadId;
		const loadCaseId = caseId;
		const loadToken = token;
		const loadTab = activeTab;
		const loadType = typeFilter;
		const loadSearchApplied = listSearchApplied;
		loading = true;
		loadError = '';
		loadMoreError = '';
		isLoadingMore = false;
		hasMore = false;
		try {
			const proposalTypeArg =
				loadType === 'all' ? undefined : (loadType as 'timeline' | 'note');
			const searchTab = loadTab === 'pending' || loadTab === 'approved';
			const page = await listProposalsPaginated(loadCaseId, loadToken, loadTab, {
				limit: PROPOSALS_TAB_PAGE_SIZE,
				offset: 0,
				proposalType: proposalTypeArg,
				...(searchTab && loadSearchApplied.trim()
					? { query: loadSearchApplied.trim() }
					: {})
			});
			if (loadId !== activeProposalsLoadId) return;
			if (caseId !== loadCaseId || token !== loadToken) return;
			if (activeTab !== loadTab || typeFilter !== loadType) return;
			if (listSearchApplied !== loadSearchApplied) return;
			proposals = page.proposals;
			totalsByStatus = page.totalsByStatus;
			totalForActiveTab = page.total;
			hasMore = proposals.length < totalForActiveTab;
			docEditById = {};
			await tick();
			scrollProposalListPortToTop();
		} catch (err) {
			if (loadId !== activeProposalsLoadId) return;
			if (caseId !== loadCaseId || token !== loadToken) return;
			if (activeTab !== loadTab || typeFilter !== loadType) return;
			if (listSearchApplied !== loadSearchApplied) return;
			loadError = classifyApiError(err);
		} finally {
			if (loadId === activeProposalsLoadId) loading = false;
		}
	}

	/** Refetch list — prompts when document-ingest edits are unsaved (P43-05). */
	export async function loadProposals(): Promise<void> {
		await runWithDocEditGuard(() => executeLoadProposals());
	}

	async function onTypeFilterChange(): Promise<void> {
		isLoadingMore = false;
		loadMoreError = '';
		await tick();
		scrollProposalListPortToTop();
		void loadProposals();
	}

	async function applyProposalSearch(): Promise<void> {
		isLoadingMore = false;
		loadMoreError = '';
		listSearchApplied = listSearchDraft.trim();
		await tick();
		scrollProposalListPortToTop();
		void loadProposals();
	}

	async function clearProposalSearch(): Promise<void> {
		isLoadingMore = false;
		loadMoreError = '';
		listSearchDraft = '';
		listSearchApplied = '';
		await tick();
		scrollProposalListPortToTop();
		void loadProposals();
	}

	function onProposalSearchKeydown(e: KeyboardEvent): void {
		if (e.key !== 'Enter') return;
		e.preventDefault();
		void applyProposalSearch();
	}

	async function completeDocEditGuardedAction(): Promise<void> {
		const pd = pendingDestructive;
		const hgr = hideGuardResolve;
		pendingDestructive = null;
		hideGuardResolve = null;
		docEditLossDialogShow = false;
		if (pd) await pd();
		if (hgr) hgr(true);
	}

	function onDocEditLossDialogCancel(): void {
		pendingGotoUrl = null;
		pendingDestructive = null;
		docEditLossDialogShow = false;
		const hgr = hideGuardResolve;
		hideGuardResolve = null;
		hgr?.(false);
	}

	async function onDocEditLossDialogSave(): Promise<void> {
		const dirtyIds = Object.keys(docEditById).filter((id) => {
			const e = docEditById[id];
			const p = proposals.find((x) => x.id === id);
			return !!(p && isDocumentIngestEditDirtyForProposal(e, p));
		});
		for (const id of dirtyIds) {
			const ok = await persistDocumentIngestEdit(id);
			if (!ok) return;
		}
		pendingGotoUrl = null;
		await completeDocEditGuardedAction();
	}

	async function onDocEditLossDialogDiscard(): Promise<void> {
		const dirtyIds = Object.keys(docEditById).filter((id) => {
			const e = docEditById[id];
			const p = proposals.find((x) => x.id === id);
			return !p || isDocumentIngestEditDirtyForProposal(e, p);
		});
		for (const id of dirtyIds) {
			const { [id]: _removed, ...rest } = docEditById;
			docEditById = rest;
		}
		for (const id of dirtyIds) {
			const prop = proposals.find((p) => p.id === id);
			if (prop?.proposal_type === 'timeline' && expanded.has(id)) {
				const pl = parsePayload(prop.proposed_payload);
				if (isDocumentTimelineIntakePayload(pl)) seedDocEditIfNeeded(id, pl);
			}
		}
		pendingGotoUrl = null;
		await completeDocEditGuardedAction();
	}

	/** Case Chat tool switch / panel collapse — caller awaits before unmounting this panel. */
	export function guardBeforeHide(): Promise<boolean> {
		if (!hasDirtyDocumentIngestEdits()) return Promise.resolve(true);
		if (docEditLossDialogShow) return Promise.resolve(false);
		return new Promise((resolve) => {
			hideGuardResolve = resolve;
			pendingDestructive = null;
			docEditLossDialogShow = true;
		});
	}

	beforeNavigate((nav) => {
		if (!hasDirtyDocumentIngestEdits()) return;
		nav.cancel();
		if (docEditLossDialogShow) return;
		pendingGotoUrl = nav.to?.url ?? null;
		pendingDestructive = async () => {
			const u = pendingGotoUrl;
			pendingGotoUrl = null;
			if (u) await goto(u);
		};
		hideGuardResolve = null;
		docEditLossDialogShow = true;
	});

	// ── Expansion ──────────────────────────────────────────────────────────────

	function isDocumentTimelineIntakePayload(payload: Record<string, unknown>): boolean {
		return payload._ce_document_timeline_intake === true;
	}

	/** P40-05G — same local display as timeline cards; not raw ISO in the edit field. */
	function formatTimelineOccurredAtForDisplay(raw: unknown): string {
		if (raw == null) return '—';
		const s = String(raw).trim();
		if (!s) return '—';
		const d = new Date(s);
		if (!isNaN(d.getTime())) return formatOperationalCaseDateTimeWithSeconds(s);
		return s;
	}

	function seedDocEditIfNeeded(proposalId: string, payload: Record<string, unknown>): void {
		if (docEditById[proposalId]) return;
		const fields = documentIngestEditFieldsFromPayload(payload);
		if (!fields) return;
		docEditById = { ...docEditById, [proposalId]: fields };
	}

	function toggleExpand(id: string): void {
		const next = new Set(expanded);
		if (next.has(id)) next.delete(id);
		else {
			next.add(id);
			const prop = proposals.find((p) => p.id === id);
			if (prop?.proposal_type === 'timeline') {
				const pl = parsePayload(prop.proposed_payload);
				if (isDocumentTimelineIntakePayload(pl)) {
					seedDocEditIfNeeded(id, pl);
				}
			}
		}
		expanded = next;
	}

	async function confirmLowChronologyForProposal(proposalId: string): Promise<void> {
		const prop = proposals.find((p) => p.id === proposalId);
		if (!prop || prop.proposal_type !== 'timeline') return;
		clearProposalError(proposalId);
		setInProgress(proposalId, true);
		try {
			const base = parsePayload(prop.proposed_payload);
			const merged: Record<string, unknown> = {
				...base,
				operator_occurred_at_confirmed: true
			};
			const updated = await updateProposal(caseId, proposalId, merged, token);
			proposals = proposals.map((p) => (p.id === proposalId ? updated : p));
		} catch (err) {
			setProposalError(proposalId, classifyApiError(err));
		} finally {
			setInProgress(proposalId, false);
		}
	}

	/** Persist document-ingest fields — `true` on success. Used by Save edits and P43-05 dialog. */
	async function persistDocumentIngestEdit(proposalId: string): Promise<boolean> {
		const edit = docEditById[proposalId];
		if (!edit) return true;
		const prop = proposals.find((p) => p.id === proposalId);
		if (!prop) return false;
		clearProposalError(proposalId);
		setInProgress(proposalId, true);
		documentIngestSavingId = proposalId;
		try {
			const base = parsePayload(prop.proposed_payload);
			const merged: Record<string, unknown> = {
				...base,
				occurred_at: edit.occurred_at.trim() ? datetimeLocalToIso(edit.occurred_at.trim()) : null,
				type: edit.type.trim(),
				text_original: edit.text_original,
				text_cleaned: edit.text_cleaned,
				occurred_at_confidence: edit.occurred_at_confidence,
				operator_occurred_at_confirmed: edit.operator_occurred_at_confirmed
			};
			const updated = await updateProposal(caseId, proposalId, merged, token);
			proposals = proposals.map((p) => (p.id === proposalId ? updated : p));
			const { [proposalId]: _removed, ...rest } = docEditById;
			docEditById = rest;
			seedDocEditIfNeeded(proposalId, parsePayload(updated.proposed_payload));
			return true;
		} catch (err) {
			setProposalError(proposalId, classifyApiError(err));
			return false;
		} finally {
			documentIngestSavingId = '';
			setInProgress(proposalId, false);
		}
	}

	async function saveDocumentIngestEdit(proposalId: string): Promise<void> {
		await persistDocumentIngestEdit(proposalId);
	}

	// ── Selection ──────────────────────────────────────────────────────────────

	function toggleSelect(id: string): void {
		const next = new Set(selected);
		if (next.has(id)) next.delete(id);
		else next.add(id);
		selected = next;
	}

	function toggleSelectAll(): void {
		if (allSelectedOnTab) {
			const next = new Set(selected);
			for (const p of activeProposals) next.delete(p.id);
			selected = next;
		} else {
			const next = new Set(selected);
			for (const p of activeProposals) next.add(p.id);
			selected = next;
		}
	}

	// ── Error helpers ──────────────────────────────────────────────────────────

	function setProposalError(id: string, msg: string): void {
		const next = new Map(proposalErrors);
		next.set(id, msg);
		proposalErrors = next;
	}

	function clearProposalError(id: string): void {
		if (!proposalErrors.has(id)) return;
		const next = new Map(proposalErrors);
		next.delete(id);
		proposalErrors = next;
	}

	function setInProgress(id: string, inFlight: boolean): void {
		const next = new Set(actionInProgress);
		if (inFlight) next.add(id);
		else next.delete(id);
		actionInProgress = next;
	}

	// ── Per-proposal actions ───────────────────────────────────────────────────

	async function handleApprove(id: string): Promise<void> {
		clearProposalError(id);
		setInProgress(id, true);
		try {
			await approveProposal(caseId, id, token);
			proposals = proposals.filter((p) => p.id !== id);
			if (activeTab === 'pending') {
				totalForActiveTab = Math.max(0, totalForActiveTab - 1);
				totalsByStatus = {
					...totalsByStatus,
					pending: Math.max(0, totalsByStatus.pending - 1),
					approved: totalsByStatus.approved + 1
				};
			}
			if (proposals.length === 0 && totalForActiveTab > 0 && !hasDirtyDocumentIngestEdits()) {
				await executeLoadProposals();
			}
		} catch (err) {
			setProposalError(id, classifyApiError(err));
		} finally {
			setInProgress(id, false);
		}
	}

	function startReject(id: string): void {
		rejectingId = id;
		rejectReason = '';
		clearProposalError(id);
	}

	function cancelReject(): void {
		rejectingId = '';
		rejectReason = '';
	}

	async function handleReject(id: string): Promise<void> {
		if (!rejectReason.trim()) return;
		clearProposalError(id);
		setInProgress(id, true);
		try {
			await rejectProposal(caseId, id, rejectReason, token);
			proposals = proposals.filter((p) => p.id !== id);
			if (activeTab === 'pending') {
				totalForActiveTab = Math.max(0, totalForActiveTab - 1);
				totalsByStatus = {
					...totalsByStatus,
					pending: Math.max(0, totalsByStatus.pending - 1),
					rejected: totalsByStatus.rejected + 1
				};
			}
			rejectingId = '';
			rejectReason = '';
			if (p128SingleReviewMode) {
				toast.success(P128_REJECT_SUCCESS_TOAST);
			}
			if (proposals.length === 0 && totalForActiveTab > 0 && !hasDirtyDocumentIngestEdits()) {
				await executeLoadProposals();
			}
		} catch (err) {
			setProposalError(id, classifyApiError(err));
		} finally {
			setInProgress(id, false);
		}
	}

	async function handleP128Accept(id: string): Promise<void> {
		clearProposalError(id);
		setInProgress(id, true);
		try {
			await approveProposal(caseId, id, token);
			await commitProposal(caseId, id, token);
			toast.success(P128_ACCEPT_SUCCESS_TOAST);
			await loadProposals();
		} catch (err) {
			setProposalError(id, classifyApiError(err));
			await loadProposals();
		} finally {
			setInProgress(id, false);
		}
	}

	async function handleCommit(id: string): Promise<void> {
		clearProposalError(id);
		setInProgress(id, true);
		try {
			await commitProposal(caseId, id, token);
			if (p128SingleReviewMode) {
				toast.success(P128_COMMIT_SUCCESS_TOAST);
			}
			proposals = proposals.filter((p) => p.id !== id);
			if (activeTab === 'approved') {
				totalForActiveTab = Math.max(0, totalForActiveTab - 1);
				totalsByStatus = {
					...totalsByStatus,
					approved: Math.max(0, totalsByStatus.approved - 1),
					committed: totalsByStatus.committed + 1
				};
			}
			if (proposals.length === 0 && totalForActiveTab > 0 && !hasDirtyDocumentIngestEdits()) {
				await executeLoadProposals();
			}
		} catch (err) {
			setProposalError(id, classifyApiError(err));
		} finally {
			setInProgress(id, false);
		}
	}

	// ── Bulk actions ───────────────────────────────────────────────────────────

	function requestBulkApprove(): void {
		const targets = getBulkApprovePendingTargets(selected, proposals);
		if (targets.length >= 2) {
			bulkApproveConfirmCount = targets.length;
			bulkApproveConfirmShow = true;
		} else {
			void handleBulkApprove();
		}
	}

	function requestBulkCommit(): void {
		if (!bulkCommitEnabled || bulkProcessing) return;
		const targets = [...selected].filter((id) => proposals.find((q) => q.id === id)?.status === 'approved');
		if (targets.length >= 2) {
			bulkCommitConfirmCount = targets.length;
			bulkCommitConfirmShow = true;
		} else {
			void handleBulkCommit();
		}
	}

	function requestBulkConfirmChronology(): void {
		if (!bulkConfirmChronologyEnabled) return;
		bulkConfirmChronologyCount = bulkChronologyBlockedIds.length;
		bulkConfirmChronologyShow = true;
	}

	async function handleBulkConfirmChronology(): Promise<void> {
		bulkError = '';
		bulkProcessing = true;
		const targets = bulkChronologyBlockedIds;
		const errors: string[] = [];
		for (let i = 0; i < targets.length; i++) {
			bulkProgressMsg = `Confirming chronology ${i + 1} of ${targets.length}…`;
			const id = targets[i];
			const proposal = proposals.find((p) => p.id === id);
			if (!proposal) continue;
			let existingPayload: Record<string, unknown>;
			try {
				existingPayload = JSON.parse(proposal.proposed_payload) as Record<string, unknown>;
			} catch {
				errors.push(`#${id.slice(0, 8)}: invalid payload`);
				continue;
			}
			try {
				const updated = await updateProposal(caseId, id, {
					...existingPayload,
					operator_occurred_at_confirmed: true
				}, token);
				proposals = proposals.map((p) => (p.id === id ? updated : p));
			} catch (err) {
				errors.push(`#${id.slice(0, 8)}: ${classifyApiError(err)}`);
			}
		}
		bulkProcessing = false;
		bulkProgressMsg = '';
		if (errors.length > 0) {
			bulkError = `${errors.length} chronology confirmation(s) failed — ${errors.join('; ')}`;
		}
	}

	async function handleBulkApprove(): Promise<void> {
		bulkError = '';
		bulkProcessing = true;
		const targets = getBulkApprovePendingTargets(selected, proposals);
		const errors: string[] = [];
		for (let i = 0; i < targets.length; i++) {
			bulkProgressMsg = `Approving ${i + 1} of ${targets.length}…`;
			const id = targets[i];
			try {
				await approveProposal(caseId, id, token);
			} catch (err) {
				errors.push(`#${id.slice(0, 8)}: ${classifyApiError(err)}`);
			}
		}
		bulkProcessing = false;
		bulkProgressMsg = '';
		if (errors.length > 0) {
			bulkError = `${errors.length} approval(s) failed — ${errors.join('; ')}`;
		} else {
			selected = new Set();
			void loadProposals();
		}
	}

	function startBulkReject(): void {
		bulkRejectMode = true;
		bulkRejectReason = '';
		bulkError = '';
	}

	function cancelBulkReject(): void {
		bulkRejectMode = false;
		bulkRejectReason = '';
	}

	async function handleBulkReject(): Promise<void> {
		if (!bulkRejectReason.trim()) return;
		bulkError = '';
		bulkProcessing = true;
		const targets = [...selected].filter((id) => {
			return proposals.find((q) => q.id === id)?.status === 'pending';
		});
		const errors: string[] = [];
		for (let i = 0; i < targets.length; i++) {
			bulkProgressMsg = `Rejecting ${i + 1} of ${targets.length}…`;
			const id = targets[i];
			try {
				await rejectProposal(caseId, id, bulkRejectReason, token);
			} catch (err) {
				errors.push(`#${id.slice(0, 8)}: ${classifyApiError(err)}`);
			}
		}
		bulkProcessing = false;
		bulkProgressMsg = '';
		bulkRejectMode = false;
		bulkRejectReason = '';
		if (errors.length > 0) {
			bulkError = `${errors.length} rejection(s) failed — ${errors.join('; ')}`;
		} else {
			selected = new Set();
			void loadProposals();
		}
	}

	function isChatIntakePayload(payload: Record<string, unknown>): boolean {
		return payload._ce_chat_intake === true;
	}

	function startChatIntakeRevise(id: string): void {
		chatIntakeRevisingId = id;
		chatIntakeReviseFeedback = '';
		clearProposalError(id);
		const next = new Set(expanded);
		next.add(id);
		expanded = next;
	}

	function cancelChatIntakeRevise(): void {
		chatIntakeRevisingId = '';
		chatIntakeReviseFeedback = '';
	}

	async function handleChatIntakeRevise(id: string): Promise<void> {
		if (!chatIntakeReviseFeedback.trim()) return;
		clearProposalError(id);
		setInProgress(id, true);
		try {
			const updated = await reviseChatIntakeProposal(
				caseId,
				id,
				token,
				chatIntakeReviseFeedback.trim()
			);
			proposals = proposals.map((p) => (p.id === id ? updated : p));
			cancelChatIntakeRevise();
		} catch (err) {
			setProposalError(id, classifyApiError(err));
		} finally {
			setInProgress(id, false);
		}
	}

	async function handleBulkCommit(): Promise<void> {
		bulkError = '';
		bulkProcessing = true;
		const targets = [...selected].filter((id) => proposals.find((q) => q.id === id)?.status === 'approved');
		const errors: string[] = [];
		for (let i = 0; i < targets.length; i++) {
			bulkProgressMsg = `Committing ${i + 1} of ${targets.length}…`;
			const id = targets[i];
			try {
				await commitProposal(caseId, id, token);
			} catch (err) {
				errors.push(`#${id.slice(0, 8)}: ${classifyApiError(err)}`);
			}
		}
		bulkProcessing = false;
		bulkProgressMsg = '';
		if (errors.length > 0) {
			bulkError = `${errors.length} commit(s) failed — ${errors.join('; ')}`;
		} else {
			selected = new Set();
			void loadProposals();
		}
	}

	// ── Formatting helpers ─────────────────────────────────────────────────────

	function parsePayload(raw: string): Record<string, unknown> {
		try {
			return JSON.parse(raw) as Record<string, unknown>;
		} catch {
			return {};
		}
	}

	/** Truncated single-line / short block for card preview (full payload stays in expanded). */
	function proposalListPreviewPlain(
		p: ProposalRecord,
		payload: Record<string, unknown>,
		p128: boolean
	): string {
		if (p128) {
			return p128TruncatedPreview(p128ProposalListPreviewBody(p), 300);
		}
		if (isDocumentTimelineIntakePayload(payload)) {
			const n = documentTimelineIngestOperatorNarrative(payload);
			return n.length > 500 ? n.slice(0, 500) + '…' : n;
		}
		return String(payloadPreview(p.proposed_payload, p.proposal_type) ?? '').trim() || '—';
	}

	function shortId(id: string): string {
		return id.slice(0, 8) + '…';
	}

	$: truncatedDocIngestOnActiveTab = activeProposals.some((p) => {
		const pl = parsePayload(p.proposed_payload);
		return isDocumentTimelineIntakePayload(pl) && pl.source_text_truncated_for_model === true;
	});

	// ── Auto-refresh: tab visibility, cross-surface invalidation, in-app nav (P38-03) ─

	let visRefetchTimer: ReturnType<typeof setTimeout> | undefined;

	function onProposalsListVisibilityRefetch(): void {
		if (document.visibilityState !== 'visible' || !token || !caseId) return;
		if (visRefetchTimer != null) clearTimeout(visRefetchTimer);
		visRefetchTimer = setTimeout(() => {
			visRefetchTimer = undefined;
			void loadProposals();
		}, 200);
	}

	function onCaseProposalsInvalidateFromEvent(e: Event): void {
		const d = (e as CustomEvent<CaseProposalsInvalidateDetail>).detail;
		if (!d || d.caseId !== caseId || !token) return;
		void loadProposals();
	}

	// ── Mount ──────────────────────────────────────────────────────────────────

	onMount(() => {
		void executeLoadProposals();
		document.addEventListener('visibilitychange', onProposalsListVisibilityRefetch);
		window.addEventListener(CASE_PROPOSALS_INVALIDATE_EVENT, onCaseProposalsInvalidateFromEvent);
	});

	onDestroy(() => {
		scrollObserver?.disconnect();
		scrollObserver = undefined;
		if (visRefetchTimer != null) clearTimeout(visRefetchTimer);
		document.removeEventListener('visibilitychange', onProposalsListVisibilityRefetch);
		window.removeEventListener(CASE_PROPOSALS_INVALIDATE_EVENT, onCaseProposalsInvalidateFromEvent);
	});

	afterNavigate(({ from }) => {
		if (!refreshOnNav) return;
		if (!from) return;
		if (!token || !caseId) return;
		void loadProposals();
	});
</script>

<svelte:window
	on:keydown={(e) => {
		if (e.key === 'Escape' && docEditLossDialogShow) onDocEditLossDialogCancel();
	}}
/>

<div
	class="flex flex-col text-xs {layout === 'page' ? 'h-full min-h-0 overflow-hidden' : ''}"
	data-testid="proposal-review-panel"
	data-layout={layout}
>

	<!-- ── CHAT/EMBED ONLY: single chrome row (no duplicate of route hero "Proposals") -->
	{#if layout === 'compact'}
		<div class="{DS_PROPOSALS_CLASSES.toolbar}">
			<span class="{DS_TYPE_CLASSES.label}"
				>{p128Presentation ? P128_LIST_TOOLBAR_LABEL : 'Review queue'}</span
			>
		</div>
	{/if}

	{#if layout === 'page' && showCreateProposalForm}
		<div class="shrink-0 px-2 sm:px-3 pb-2 border-b border-[color:var(--ce-l-border-subtle)]" data-testid="proposals-p128-create-shell">
			<CaseProposalCreateForm
				testIdPrefix="proposal-review-p128-create"
				caseId={caseId}
				token={token}
				onCancel={() => {
					showCreateProposalForm = false;
				}}
				onSuccess={async () => {
					await loadProposals();
					showCreateProposalForm = false;
				}}
			/>
		</div>
	{/if}

	{#if layout === 'page'}
		<div class="{DS_PROPOSALS_CLASSES.statusSummary}" data-testid="proposals-status-summary">
			<div class="{DS_PROPOSALS_CLASSES.statusSummaryGrid}" role="group" aria-label="Proposal counts for this case">
				<div
					class="{DS_PROPOSALS_CLASSES.statusSummaryCard} ds-proposals-status-summary__card--pending"
					data-testid="proposals-status-card-pending"
				>
					<div class="{DS_PROPOSALS_CLASSES.statusSummaryIcon}" aria-hidden="true">
						<ClockIcon class="h-6 w-6" />
					</div>
					<div class="{DS_PROPOSALS_CLASSES.statusSummaryBody}">
						<div class="{DS_PROPOSALS_CLASSES.statusSummaryLabel}">{P128_SUMMARY_LABEL_PENDING}</div>
						<div class="{DS_PROPOSALS_CLASSES.statusSummaryCount}">{pendingCount}</div>
						<p class="{DS_PROPOSALS_CLASSES.statusSummaryHint}">In the review queue for this case.</p>
					</div>
				</div>
				<div
					class="{DS_PROPOSALS_CLASSES.statusSummaryCard} ds-proposals-status-summary__card--accepted"
					data-testid="proposals-status-card-accepted"
				>
					<div class="{DS_PROPOSALS_CLASSES.statusSummaryIcon}" aria-hidden="true">
						<CheckCircleIcon class="h-6 w-6" />
					</div>
					<div class="{DS_PROPOSALS_CLASSES.statusSummaryBody}">
						<div class="{DS_PROPOSALS_CLASSES.statusSummaryLabel}">{P128_SUMMARY_LABEL_ACCEPTED}</div>
						<div class="{DS_PROPOSALS_CLASSES.statusSummaryCount}">{approvedCount}</div>
						<p class="{DS_PROPOSALS_CLASSES.statusSummaryHint}">Staging only — commit to put on the record.</p>
					</div>
				</div>
				<div
					class="{DS_PROPOSALS_CLASSES.statusSummaryCard} ds-proposals-status-summary__card--rejected"
					data-testid="proposals-status-card-rejected"
				>
					<div class="{DS_PROPOSALS_CLASSES.statusSummaryIcon}" aria-hidden="true">
						<XCircleIcon class="h-6 w-6" />
					</div>
					<div class="{DS_PROPOSALS_CLASSES.statusSummaryBody}">
						<div class="{DS_PROPOSALS_CLASSES.statusSummaryLabel}">{P128_SUMMARY_LABEL_REJECTED}</div>
						<div class="{DS_PROPOSALS_CLASSES.statusSummaryCount}">{rejectedCount}</div>
						<p class="{DS_PROPOSALS_CLASSES.statusSummaryHint}">Not written to the case record.</p>
					</div>
				</div>
				<div
					class="{DS_PROPOSALS_CLASSES.statusSummaryCard} ds-proposals-status-summary__card--committed"
					data-testid="proposals-status-card-committed"
				>
					<div class="{DS_PROPOSALS_CLASSES.statusSummaryIcon}" aria-hidden="true">
						<CalendarDaysIcon class="h-6 w-6" />
					</div>
					<div class="{DS_PROPOSALS_CLASSES.statusSummaryBody}">
						<div class="{DS_PROPOSALS_CLASSES.statusSummaryLabel}">{P128_SUMMARY_LABEL_COMMITTED}</div>
						<div class="{DS_PROPOSALS_CLASSES.statusSummaryCount}">{committedCount}</div>
						<p class="{DS_PROPOSALS_CLASSES.statusSummaryHint}">On the official Timeline or governed Note.</p>
					</div>
				</div>
			</div>
		</div>
	{/if}

	<p
		class="{DS_PROPOSALS_CLASSES.authorityBanner}"
		data-testid="proposals-authority-banner"
	>
		{P128_PROPOSALS_AUTHORITY_BANNER}
	</p>

	<!-- ── STATUS TAB BAR (P45-02); P128 page: Create sits right (tabs scroll left) -->
	<div
		class={layout === 'page'
			? DS_PROPOSALS_CLASSES.tabStripWithEndAction
			: DS_PROPOSALS_CLASSES.tabStrip}
		data-testid="proposals-p128-tab-bar"
		aria-label={layout === 'page' && p128Presentation
			? P128_LIST_TOOLBAR_LABEL
			: 'Proposal list tabs'}
	>
		<div class={DS_PROPOSALS_CLASSES.tabStripScroll} data-testid="proposal-tabs-scroll">
			<div class="flex min-w-0 items-stretch" data-testid="proposal-tabs-workflow-group">
				<button
					type="button"
					class={tabClasses('pending', activeTab)}
					on:click={() => void selectProposalStatusTab('pending')}
					data-testid="tab-pending"
					title={!p128Presentation
						? 'Pending — proposals awaiting review (workflow queue; approve, reject, or edit before commit)'
						: P128_TAB_PENDING_TITLE}
				>
					Pending Review{pendingCount > 0 ? ` (${pendingCount})` : ''}
				</button>
				<button
					type="button"
					class={tabClasses('approved', activeTab)}
					on:click={() => void selectProposalStatusTab('approved')}
					data-testid="tab-approved"
					title={!p128Presentation
						? 'Approved — human-reviewed staging only; not on the official case record until you commit'
						: P128_TAB_ACCEPTED_TITLE}
				>
					{!p128Presentation ? 'Approved' : 'Accepted'}{approvedCount > 0 ? ` (${approvedCount})` : ''}
				</button>
				<button
					type="button"
					class={tabClasses('rejected', activeTab)}
					on:click={() => void selectProposalStatusTab('rejected')}
					data-testid="tab-rejected"
					title={!p128Presentation
						? 'Rejected — removed from the review workflow (not written to the official case record via commit)'
						: P128_TAB_REJECTED_TITLE}
				>
					Rejected{rejectedCount > 0 ? ` (${rejectedCount})` : ''}
				</button>
			</div>
			<div
				class="{DS_PROPOSALS_CLASSES.tabDivider}"
				aria-hidden="true"
				data-testid="proposal-tabs-workflow-outcome-divider"
			/>
			<div class="flex shrink-0 items-stretch" data-testid="proposal-tabs-outcome-group">
				<button
					type="button"
					class={tabClasses('committed', activeTab)}
					on:click={() => void selectProposalStatusTab('committed')}
					data-testid="tab-committed"
					title={!p128Presentation
						? 'Committed — outcome already saved to the case record (official Timeline or governed Note)'
						: P128_TAB_COMMITTED_TITLE}
				>
					Committed to Timeline{committedCount > 0 ? ` (${committedCount})` : ''}
				</button>
			</div>
		</div>
		{#if layout === 'page'}
			<div class="{DS_PROPOSALS_CLASSES.tabStripEndAction}" data-testid="proposals-p128-tab-end-actions">
				<button
					type="button"
					class="{DS_BTN_CLASSES.secondary} text-xs shrink-0"
					on:click={() => {
						showCreateProposalForm = !showCreateProposalForm;
					}}
					disabled={loading || docEditLossDialogShow}
					data-testid="proposals-p128-create-open"
				>
					{showCreateProposalForm ? P128_CREATE_TOGGLE_CLOSE : P128_CREATE_ENTRY_BUTTON}
				</button>
			</div>
		{/if}
	</div>

	<!-- Type + search: single compact toolbar; helper under row -->
	<div
		class="{DS_PROPOSALS_CLASSES.filterToolbar} {activeTab === 'rejected' || activeTab === 'committed'
			? 'min-h-[2.5rem]'
			: ''}"
		data-testid="proposals-search-region"
	>
		<div
			class="{DS_PROPOSALS_CLASSES.filterSearchRow}"
			data-testid="proposals-search-row"
			aria-label="Filter and search proposal text on this tab"
		>
			<div class="ds-proposals-filter-search-row__type">
				<label for="proposal-type-filter-{caseId}" class="{DS_TYPE_CLASSES.label} shrink-0"
					>Type</label
				>
				<select
					id="proposal-type-filter-{caseId}"
					bind:value={typeFilter}
					on:change={() => void onTypeFilterChange()}
					class="{DS_PROPOSALS_CLASSES.formControl} w-full max-w-[10rem] text-[11px] !h-9 !min-h-9 !px-2.5 !py-0 sm:max-w-[12rem]"
					data-testid="proposal-type-filter"
					title="Limit the list to all proposal types, timeline only, or note only (current status tab)"
				>
					<option value="all">All types</option>
					<option value="timeline">Timeline</option>
					<option value="note">Note</option>
				</select>
			</div>
			{#if activeTab === 'pending' || activeTab === 'approved'}
				<div class="ds-proposals-filter-search-row__search">
					<label for="proposals-search-{caseId}" class="{DS_TYPE_CLASSES.label} shrink-0"
						>Search</label
					>
					<input
						id="proposals-search-{caseId}"
						type="search"
						bind:value={listSearchDraft}
						on:keydown={onProposalSearchKeydown}
						placeholder="Search proposal text (this tab, Type applies)…"
						class="min-w-0 flex-1 {DS_PROPOSALS_CLASSES.formControl} box-border w-full !h-9 !min-h-9 !px-3 !py-0 text-[11px] leading-9 [min-width:8rem]"
						data-testid="proposals-search-input"
						autocomplete="off"
					/>
				</div>
				<div class="ds-proposals-filter-search-row__actions">
					<button
						type="button"
						class="shrink-0 {DS_BTN_CLASSES.primary} !min-h-9 text-[11px] !px-3 !py-0"
						on:click={() => void applyProposalSearch()}
						disabled={loading || docEditLossDialogShow}
						data-testid="proposals-search-submit"
						title="Apply search: server-side case-insensitive substring on saved proposal text for this tab (see scope below)"
					>
						Search
					</button>
					{#if listSearchApplied}
						<button
							type="button"
							class="shrink-0 {DS_BTN_CLASSES.ghost} !min-h-9 text-[11px] !px-2.5 !py-0"
							on:click={() => void clearProposalSearch()}
							disabled={loading || docEditLossDialogShow}
							data-testid="proposals-search-clear"
							title="Clear applied search and reload the full list for this tab"
						>
							Clear
						</button>
						<span class="{DS_TYPE_CLASSES.meta} min-w-0 self-center" data-testid="proposals-search-active">
							Filter: “{listSearchApplied}”
						</span>
					{/if}
				</div>
			{:else}
				<div
					class="min-h-0 min-w-0 flex-1 [min-width:0]"
					aria-hidden="true"
					data-testid="proposals-search-placeholder"
				></div>
			{/if}
		</div>
		{#if activeTab === 'pending' || activeTab === 'approved'}
			<p
				class="{DS_TYPE_CLASSES.meta} m-0 px-3 pb-1 leading-snug text-[color:var(--ds-text-muted)]"
				data-testid="proposals-search-scope-hint"
			>
				{#if activeTab === 'pending'}
					Scoped to <strong class="font-medium text-[color:var(--ds-text-primary)]">Pending Review</strong> on this
					case. Matches saved proposal text; honors Type. No search on other tabs.
				{:else}
					Scoped to <strong class="font-medium text-[color:var(--ds-text-primary)]">Accepted</strong> (staging) on
					this case. Matches saved proposal text; honors Type. No search on other tabs.
				{/if}
			</p>
		{/if}
	</div>

	{#if activeProposals.length > 0}
		<div
			class="shrink-0 px-3 py-1.5 {DS_TYPE_CLASSES.meta} border-b border-[color:var(--ds-border-subtle)] bg-[color:var(--ds-bg-muted)]"
			data-testid="proposal-queue-mix-summary"
		>
			{#if !p128Presentation}
				<span class="font-medium text-[color:var(--ds-text-primary)]">This page:</span>
				{queueMixSummary}
			{:else}
				{P128_LIST_ROW_COUNT.replace('{shown}', String(activeProposals.length)).replace(
					'{total}',
					String(totalForActiveTab)
				)}
			{/if}
		</div>
	{/if}

	{#if !loadError && totalForActiveTab > 0}
		<div
			class="shrink-0 px-3 py-1.5 border-b border-[color:var(--ds-border-subtle)] bg-[color:var(--ds-bg-surface)]"
			data-testid="proposals-list-progress"
		>
			<span class="{DS_TYPE_CLASSES.meta}">
				Showing {activeProposals.length} of {totalForActiveTab}
				{#if hasMore}
					<span class="text-[color:var(--ds-text-muted)]"> · scroll to load more</span>
				{/if}
			</span>
		</div>
	{/if}

	<!-- P40-01A: unmistakable when model saw only a prefix of extracted text -->
	{#if !p128Presentation && truncatedDocIngestOnActiveTab}
		<div
			class="{DS_BANNER_CLASSES.base} {DS_BANNER_CLASSES.denseModifier} {DS_STATUS_SURFACE_CLASSES.warning} shrink-0 mx-2 mt-1 mb-1 px-3 py-2.5"
			role="alert"
			data-testid="document-ingest-truncation-banner"
		>
			<strong class="font-semibold block mb-1 {DS_STATUS_TEXT_CLASSES.warning}">Partial file used for these proposals</strong>
			<span class="{DS_BANNER_CLASSES.body} {DS_STATUS_TEXT_CLASSES.warning} text-[11px] leading-snug">
			Only the beginning of the extracted text was sent to the model. This list does <strong>not</strong> reflect the
			whole file — important events that appear later in the document may be missing. Open the full extracted text on
			<strong>Case Files</strong> before you approve (workflow) or commit (official record).
			</span>
		</div>
	{/if}

	<!-- ── BULK ACTIONS BAR ────────────────────────────────────────────────── -->
	{#if !p128Presentation && anySelectedOnTab}
		<div
			class="{DS_BANNER_CLASSES.base} {DS_BANNER_CLASSES.denseModifier} {DS_STATUS_SURFACE_CLASSES.info} shrink-0 border-b border-[color:var(--ds-border-default)] px-3 py-2"
			data-testid="bulk-actions-bar"
		>
			{#if bulkRejectMode}
				<!-- Inline bulk reject reason input -->
				<div class="flex flex-col gap-1.5">
					<span class="{DS_STATUS_TEXT_CLASSES.info} font-medium text-[11px]">
						Reject {bulkPendingRejectCount} pending proposal{bulkPendingRejectCount !== 1 ? 's' : ''} (stays out
						of the official record). Reason:
					</span>
					<div class="flex gap-1.5 items-center">
						<input
							type="text"
							bind:value={bulkRejectReason}
							placeholder="Required reason…"
							class="flex-1 {DS_PROPOSALS_CLASSES.formControl} text-[11px] px-2 py-1"
							data-testid="bulk-reject-reason-input"
						/>
						<button
							type="button"
							class="shrink-0 {DS_BTN_CLASSES.danger} text-[11px] px-2 py-1"
							on:click={handleBulkReject}
							disabled={!bulkRejectReason.trim() || bulkProcessing}
							data-testid="bulk-reject-confirm-btn"
							title="Submit bulk rejection with the reason above (workflow only; not on the official case record)"
						>
							{bulkProcessing ? bulkProgressMsg || 'Rejecting…' : 'Confirm Rejection'}
						</button>
						<button
							type="button"
							class="shrink-0 {DS_BTN_CLASSES.ghost} text-[11px] px-1.5 py-1"
							on:click={cancelBulkReject}
							disabled={bulkProcessing}
						>
							Cancel
						</button>
					</div>
				</div>
			{:else}
				<!-- Standard bulk action row -->
				<div class="flex items-center gap-2 flex-wrap">
					<span class="{DS_STATUS_TEXT_CLASSES.info} font-medium text-[11px] shrink-0">
						{selectedOnTabCount} selected
					</span>
					<div class="flex items-center gap-1.5 flex-wrap ml-auto">
						{#if bulkApproveEnabled}
							<button
								type="button"
								class="{DS_BTN_CLASSES.primary} text-[11px] px-2 py-0.5"
								on:click={requestBulkApprove}
								disabled={bulkProcessing}
								data-testid="bulk-approve-btn"
								title="Review workflow: approve pending items in this selection (staging only — not on the official case record until commit)"
							>
								{bulkProcessing ? bulkProgressMsg : '✓ Approve Selected'}
							</button>
						{/if}
						{#if bulkRejectEnabled}
							<button
								type="button"
								class="{DS_BTN_CLASSES.danger} text-[11px] px-2 py-0.5"
								on:click={startBulkReject}
								disabled={bulkProcessing}
								data-testid="bulk-reject-btn"
								title="Reject selected pending proposals (requires reason; not written to the official case record)"
							>
								✕ Reject Selected
							</button>
						{/if}
					{#if bulkConfirmChronologyEnabled}
						<button
							type="button"
							class="{DS_BTN_CLASSES.secondary} text-[11px] px-2 py-0.5"
							on:click={requestBulkConfirmChronology}
							disabled={bulkProcessing}
							title="Mark occurred_at as operator-confirmed for {bulkChronologyBlockedIds.length} selected entry/entries blocked by low chronology confidence — unlocks Bulk Commit"
							data-testid="bulk-confirm-chronology-btn"
						>
							{bulkProcessing ? bulkProgressMsg : `⏱ Confirm date/time (${bulkChronologyBlockedIds.length})`}
						</button>
					{/if}
					<button
						type="button"
						class="{DS_BTN_CLASSES.primary} text-[11px] px-2 py-0.5"
						on:click={requestBulkCommit}
						disabled={!bulkCommitEnabled || bulkProcessing}
						title={bulkCommitEnabled
							? 'Commits each selected approved proposal into the official case record (Timeline / governed Note)'
							: bulkCommitBlockedReason ?? 'Cannot commit this selection'}
						data-testid="bulk-commit-btn"
					>
						{bulkProcessing ? bulkProgressMsg : '→ Commit Selected'}
					</button>
					</div>
				</div>
			{/if}
		</div>
	{/if}

	<!-- ── BULK ERROR ───────────────────────────────────────────────────────── -->
	{#if bulkError}
		<div
			class="{DS_BANNER_CLASSES.base} {DS_BANNER_CLASSES.denseModifier} {DS_STATUS_SURFACE_CLASSES.danger} shrink-0 flex items-start gap-2 px-3 py-2 border-b border-[color:var(--ds-border-default)]"
			data-testid="bulk-error-banner"
		>
			<span class="{DS_STATUS_TEXT_CLASSES.danger} text-[11px] flex-1">{bulkError}</span>
			<button
				type="button"
				class="{DS_BTN_CLASSES.ghost} text-[11px] shrink-0 {DS_STATUS_TEXT_CLASSES.danger}"
				on:click={() => { bulkError = ''; }}
				aria-label="Dismiss bulk error"
			>✕</button>
		</div>
	{/if}

	<!-- ── LOAD ERROR ───────────────────────────────────────────────────────── -->
	{#if loadError}
		<div class="px-3 py-2 shrink-0" data-testid="load-error">
			<p class="{DS_STATUS_TEXT_CLASSES.danger} text-[11px] m-0">{loadError}</p>
		</div>
	{/if}

	<div
		bind:this={proposalListViewportEl}
		class="{layout === 'page'
			? 'flex-1 min-h-0 overflow-y-auto flex flex-col'
			: 'flex flex-col'}"
		data-testid="proposal-panel-scroll"
	>
	<!-- ── EMPTY / LOADING ─────────────────────────────────────────────────── -->
	{#if loading && proposals.length === 0}
		<div class="px-3 pt-6 pb-5 {DS_EMPTY_CLASSES.description} text-[11px] leading-relaxed not-italic m-0">
			{!p128Presentation ? 'Loading proposals for this case…' : P128_LIST_LOADING}
		</div>
	{:else if !loading && !loadError && activeProposals.length === 0}
		<div
			class="flex flex-1 flex-col items-center justify-center px-3 py-10 sm:py-12"
			data-testid="empty-state"
		>
			<div
				class="w-full max-w-md rounded-lg border border-dashed border-[color:var(--ds-border-default)] bg-[color:var(--ds-bg-elevated)] px-5 py-6 text-left shadow-sm sm:text-center"
				data-testid="empty-state-panel"
			>
			{#if p128Presentation}
				{#if (activeTab === 'pending' || activeTab === 'approved') && listSearchApplied}
					<h3 class="{DS_EMPTY_CLASSES.title} m-0 text-sm font-semibold text-[color:var(--ds-text-primary)]">
						{P128_EMPTY_PANEL_TITLE_SEARCH}
					</h3>
					<p class="{DS_EMPTY_CLASSES.description} mt-2 mb-0 text-xs leading-relaxed" data-testid="empty-search-no-results">
						{P128_LIST_EMPTY_PENDING_SEARCH}
					</p>
				{:else if activeTab === 'pending'}
					<h3 class="{DS_EMPTY_CLASSES.title} m-0 text-sm font-semibold text-[color:var(--ds-text-primary)]">
						{P128_EMPTY_PANEL_TITLE_PENDING}
					</h3>
					<p class="{DS_EMPTY_CLASSES.description} mt-2 mb-0 text-xs leading-relaxed">
						{P128_EMPTY_PANEL_LEAD}
					</p>
					<p class="{DS_TYPE_CLASSES.meta} mt-3 mb-0 text-xs leading-relaxed text-[color:var(--ds-text-muted)]">
						{P128_EMPTY_PANEL_REMINDER}
					</p>
					{#if layout === 'page'}
						<div class="mt-4 flex justify-start sm:justify-center">
							<button
								type="button"
								class="{DS_BTN_CLASSES.primary} text-xs"
								data-testid="empty-state-create-proposal"
								on:click={() => (showCreateProposalForm = !showCreateProposalForm)}
							>
								{P128_CREATE_ENTRY_BUTTON}
							</button>
						</div>
					{/if}
				{:else if activeTab === 'approved'}
					<h3 class="{DS_EMPTY_CLASSES.title} m-0 text-sm font-semibold text-[color:var(--ds-text-primary)]">No accepted proposals</h3>
					<p class="{DS_EMPTY_CLASSES.description} mt-2 mb-0 text-xs leading-relaxed">{P128_LIST_EMPTY_ACCEPTED}</p>
				{:else if activeTab === 'rejected'}
					<h3 class="{DS_EMPTY_CLASSES.title} m-0 text-sm font-semibold text-[color:var(--ds-text-primary)]">No rejected proposals</h3>
					<p class="{DS_EMPTY_CLASSES.description} mt-2 mb-0 text-xs leading-relaxed">{P128_LIST_EMPTY_REJECTED}</p>
				{:else}
					<h3 class="{DS_EMPTY_CLASSES.title} m-0 text-sm font-semibold text-[color:var(--ds-text-primary)]">Nothing committed to Timeline yet</h3>
					<p class="{DS_EMPTY_CLASSES.description} mt-2 mb-0 text-xs leading-relaxed">{P128_LIST_EMPTY_COMMITTED}</p>
				{/if}
			{:else if (activeTab === 'pending' || activeTab === 'approved') && listSearchApplied}
				<h3 class="{DS_EMPTY_CLASSES.title} m-0 text-sm font-semibold text-[color:var(--ds-text-primary)]">No results for this search</h3>
				<p class="{DS_EMPTY_CLASSES.description} mt-2 mb-0 text-xs leading-relaxed" data-testid="empty-search-no-results">
					No matching <strong>{activeTab === 'pending' ? 'Pending Review' : 'Approved'}</strong> proposals for
					this case on this tab. This list uses your search text and the <strong>Type</strong> control. Try
					other text or clear the search.
				</p>
			{:else if activeTab === 'pending'}
				<h3 class="{DS_EMPTY_CLASSES.title} m-0 text-sm font-semibold text-[color:var(--ds-text-primary)]">No pending proposals in this view</h3>
				<p class="{DS_EMPTY_CLASSES.description} mt-2 mb-0 text-xs leading-relaxed">
					When <strong>Type</strong> is not All, only that kind of proposal is shown. Create drafts from
					<strong>Case Chat</strong>, <strong>Case Files</strong> (propose timeline after extraction), or
					other case tools. After you <strong>approve</strong> and <strong>commit</strong>, the official
					<strong>Timeline</strong> shows the outcome.
				</p>
			{:else if activeTab === 'approved'}
				<h3 class="{DS_EMPTY_CLASSES.title} m-0 text-sm font-semibold text-[color:var(--ds-text-primary)]">No approved proposals in staging</h3>
				<p class="{DS_EMPTY_CLASSES.description} mt-2 mb-0 text-xs leading-relaxed">
					Nothing is waiting to <strong>commit</strong> to the official case record. When <strong>Type</strong> is
					not All, only that proposal type is listed.
				</p>
			{:else if activeTab === 'rejected'}
				<h3 class="{DS_EMPTY_CLASSES.title} m-0 text-sm font-semibold text-[color:var(--ds-text-primary)]">No rejected proposals</h3>
				<p class="{DS_EMPTY_CLASSES.description} mt-2 mb-0 text-xs leading-relaxed">
					Nothing in this list for the current <strong>Type</strong> filter.
				</p>
			{:else}
				<h3 class="{DS_EMPTY_CLASSES.title} m-0 text-sm font-semibold text-[color:var(--ds-text-primary)]">Nothing committed in this list yet</h3>
				<p class="{DS_EMPTY_CLASSES.description} mt-2 mb-0 text-xs leading-relaxed">
					When <strong>Type</strong> is not All, only that proposal type is shown. Committed items are on the
					official case record.
				</p>
			{/if}
			</div>
		</div>
	{:else if activeProposals.length > 0}

		<!-- ── SELECT-ALL HEADER ─────────────────────────────────────────────── -->
		{#if !p128Presentation}
			<div
				class="flex items-center gap-2 px-3 py-1.5 border-b border-[color:var(--ds-border-subtle)] bg-[color:var(--ds-bg-muted)] shrink-0"
			>
				<input
					type="checkbox"
					checked={allSelectedOnTab}
					indeterminate={anySelectedOnTab && !allSelectedOnTab}
					on:change={toggleSelectAll}
					class="accent-blue-600 shrink-0"
					aria-label="Select all proposals on this tab"
					data-testid="select-all-checkbox"
				/>
				<span class="{DS_TYPE_CLASSES.meta} text-[10px]">
					{activeProposals.length} proposal{activeProposals.length !== 1 ? 's' : ''}
					{selectedOnTabCount > 0 ? ` · ${selectedOnTabCount} selected` : ''}
				</span>
			</div>
		{:else}
			<div
				class="flex items-center gap-2 px-3 py-1.5 border-b border-[color:var(--ds-border-subtle)] bg-[color:var(--ds-bg-muted)] shrink-0"
				data-testid="proposal-p128-list-header-row"
			>
				<span class="{DS_TYPE_CLASSES.meta} text-[10px]">
					{activeProposals.length} proposal{activeProposals.length !== 1 ? 's' : ''}
				</span>
			</div>
		{/if}

		<!-- ── PROPOSAL LIST ─────────────────────────────────────────────────── -->
		<div data-testid="proposal-card-list" class="flex flex-col gap-3 px-2 pb-2 pt-1">
			{#each activeProposals as proposal (proposal.id)}
				{@const payload = parsePayload(proposal.proposed_payload)}
				{@const isInProgress = actionInProgress.has(proposal.id)}
				{@const isExpanded = expanded.has(proposal.id)}
				{@const thisError = proposalErrors.get(proposal.id)}
				{@const isRejectingThis = rejectingId === proposal.id}

				{@const needsDateTimeAttention = proposal.proposal_type === 'timeline' && (proposal.status === 'pending' || proposal.status === 'approved') && timelineProposalCommitBlockedByLowChronology(proposal)}
				<div
					class="{DS_PROPOSALS_CLASSES.card} {needsDateTimeAttention && !p128Presentation
						? DS_PROPOSALS_CLASSES.cardAttention
						: ''}"
					data-testid="proposal-card"
					data-proposal-id={proposal.id}
					data-proposal-status={proposal.status}
				>
					<!-- ── MAIN CARD ROW (proposal cards) ────────────────────────── -->
					<div class="flex items-start gap-2.5 px-3 pt-3 pb-1">
						<!-- Checkbox -->
						{#if !p128Presentation}
							<input
								type="checkbox"
								checked={selected.has(proposal.id)}
								on:change={() => toggleSelect(proposal.id)}
								class="mt-0.5 accent-blue-600 shrink-0"
								aria-label="Select proposal {shortId(proposal.id)}"
							/>
						{/if}

						<div class="flex-1 min-w-0 space-y-1.5">
							<!-- Context chips (status lives on the card) -->
							<div class="flex items-center gap-1.5 flex-wrap">
								{#if !p128Presentation && proposal.status === 'approved' && proposal.proposal_type === 'timeline' && timelineProposalCommitBlockedByLowChronology(proposal)}
									<span
										class="px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wide shrink-0 bg-amber-200 text-amber-950 dark:bg-amber-900/55 dark:text-amber-100 border border-amber-500/50"
										data-testid="approved-chronology-blocked-chip"
										title="Low confidence occurred_at — confirm before commit (same rule as single-item commit)"
									>
										Time confirm
									</span>
								{/if}
								{#if !p128Presentation && proposal.status === 'pending' && proposal.proposal_type === 'timeline' && timelineProposalCommitBlockedByLowChronology(proposal)}
									<span
										class="px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wide shrink-0 bg-amber-100 text-amber-900 dark:bg-amber-950/70 dark:text-amber-200 border border-amber-400/60"
										data-testid="pending-needs-datetime-chip"
										title="No date/time or low confidence — expand details to set before approving"
									>
										⚠ Needs date
									</span>
								{/if}
								<!-- Scope / origin — document ingest is case-file–sourced, not chat (P40-01A) -->
								{#if isDocumentTimelineIntakePayload(payload)}
									<span
										class="px-1.5 py-0.5 rounded text-[9px] font-medium shrink-0
										       bg-stone-200 text-stone-900 dark:bg-stone-800 dark:text-stone-200"
										data-testid="proposal-origin-case-file"
										title="Ingested from a case file — not chat thread lineage"
									>
										Case file
									</span>
								{:else}
									<span
										class="px-1.5 py-0.5 rounded text-[9px] font-medium shrink-0
										       {proposal.source_scope === 'personal'
											? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400'
											: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-400'}"
										title={proposal.source_scope === 'personal'
											? 'Sourced from a personal/desktop thread linked to this case'
											: 'Sourced from this case’s scoped chat thread'}
									>
										{proposal.source_scope === 'personal' ? 'Personal Thread' : 'Case Thread'}
									</span>
								{/if}
								{#if isChatIntakePayload(payload)}
									<span
										class="px-1.5 py-0.5 rounded text-[9px] font-semibold shrink-0
										       bg-amber-100 text-amber-900 dark:bg-amber-900/50 dark:text-amber-200"
									>
										Chat intake
									</span>
								{/if}
								{#if isDocumentTimelineIntakePayload(payload)}
									<span
										class="px-1.5 py-0.5 rounded text-[9px] font-semibold shrink-0
										       bg-violet-100 text-violet-900 dark:bg-violet-900/50 dark:text-violet-200"
										data-testid="document-timeline-ingest-badge"
									>
										Document ingest
									</span>
								{/if}
							</div>

							<ProposalCard
								title={proposalCardTitle(proposal)}
								typeChip={proposalCardTypeChip(proposal)}
								typeIcon={proposalCardIconKey(proposal, payload)}
								subline={proposalCardCreatedSubline(
									proposal,
									proposalCardSourceLabel(proposal, isDocumentTimelineIntakePayload(payload))
								)}
								updateLine={proposalCardOptionalUpdateLine(proposal)}
								previewText={proposalListPreviewPlain(proposal, payload, p128Presentation)}
								{isExpanded}
								statusChipLabel={proposalCardStatusChipLabel(proposal.status, p128Presentation)}
								p128DataStatusLabel={p128Presentation ? p128StatusDisplayLabel(proposal.status) : null}
								reviewDisabled={isInProgress}
								rejectDisabled={!canReject(proposal.status) || isInProgress}
								reviewBusy={isInProgress}
								showReview={true}
								showReject={reviewActionsEnabled && canReject(proposal.status) && !isRejectingThis}
								{p128Presentation}
								on:opendetail={() => toggleExpand(proposal.id)}
								on:reject={() => startReject(proposal.id)}
							/>

							{#if p128Presentation}
								<div
									class="text-[10px] text-[color:var(--ds-text-muted)]"
									data-testid="proposal-card-meta"
								>
									<span
										data-testid="proposal-created-by"
										title={proposal.created_by}
										class="min-w-0 max-w-full truncate"
									>
										{proposal.created_by}
									</span>
								</div>
							{/if}

							<!-- Rejection reason (only for rejected proposals) -->
							{#if proposal.rejection_reason}
								<div
									class="text-[10px] text-red-600 dark:text-red-400 px-0.5"
									data-testid="rejection-reason"
								>
									<span class="font-semibold">Rejected:</span> {proposal.rejection_reason}
								</div>
							{/if}

							<!-- Committed record ID (only for committed proposals) -->
							{#if proposal.committed_record_id}
								<div
									class="text-[10px] text-green-700 dark:text-green-400 px-0.5"
									data-testid="committed-record"
								>
									<span class="font-semibold">Case record:</span>
									<span class="font-mono">{proposal.committed_record_id}</span>
								</div>
							{/if}

							<!-- Per-proposal error -->
							{#if thisError}
								<div
									class="text-[10px] text-red-600 dark:text-red-400 px-0.5"
									data-testid="proposal-error"
								>
									{thisError}
								</div>
							{/if}

							{#if !p128Presentation && timelineProposalCommitBlockedByLowChronology(proposal)}
								<p
									class="text-[10px] text-amber-800 dark:text-amber-200 mb-0 px-0.5 rounded bg-amber-50/90 dark:bg-amber-950/40 py-1 border border-amber-200 dark:border-amber-800"
									data-testid="timeline-commit-blocked-chronology"
								>
									<strong>Chronology:</strong> date/time confidence is low — confirm below (or in details)
									before commit.
								</p>
							{/if}

						<!-- ── WORKFLOW FOOTER (approve / accept / commit — not the card) ─ -->
						<div class="flex flex-wrap items-center gap-1.5 mt-1.5 pt-2 border-t border-[color:var(--ds-border-subtle)] pb-1">

							{#if reviewActionsEnabled && p128SingleReviewMode}
								<!-- P128-04 — one proposal per action; reject is on the card -->
								{#if canApprove(proposal.status)}
									<button
										type="button"
										class="{DS_BTN_CLASSES.secondary} text-[10px] px-2 py-0.5
										       disabled:opacity-50 disabled:cursor-not-allowed"
										on:click={() => handleP128Accept(proposal.id)}
										disabled={isInProgress || timelineProposalCommitBlockedByLowChronology(proposal)}
										data-testid="p128-accept-btn"
										title={timelineProposalCommitBlockedByLowChronology(proposal)
											? 'Confirm date and time in details before accepting'
											: P128_ACCEPT_BUTTON_TITLE}
									>
										{isInProgress ? '…' : P128_ACCEPT_BUTTON}
									</button>
								{/if}
								{#if canCommit(proposal.status)}
									<button
										type="button"
										class="px-2 py-0.5 rounded text-[10px] font-medium bg-green-600 hover:bg-green-700
										       text-white transition disabled:opacity-50 disabled:cursor-not-allowed"
										on:click={() => handleCommit(proposal.id)}
										disabled={isInProgress || timelineProposalCommitBlockedByLowChronology(proposal)}
										title={timelineProposalCommitBlockedByLowChronology(proposal)
											? 'Confirm date and time in details first'
											: 'Record this approved proposal on the case'}
										data-testid="p128-finalize-commit-btn"
									>
										{isInProgress ? '…' : P128_FINALIZE_RECORD_BUTTON}
									</button>
								{/if}
							{:else if reviewActionsEnabled}
								<!-- Approve — only for pending -->
								{#if canApprove(proposal.status)}
									<button
										type="button"
										class="{DS_BTN_CLASSES.secondary} text-[10px] px-2 py-0.5
										       disabled:opacity-50 disabled:cursor-not-allowed"
										on:click={() => handleApprove(proposal.id)}
										disabled={isInProgress}
										data-testid="approve-btn"
										title="Review workflow — moves to Approved (staging); does not write the official case record"
									>
										{isInProgress ? '…' : '✓ Approve'}
									</button>
								{/if}

								<!-- Chat intake AI revision — pending only -->
								{#if canApprove(proposal.status) && isChatIntakePayload(payload)}
									<button
										type="button"
										class="px-2 py-0.5 rounded text-[10px] font-medium bg-amber-100 hover:bg-amber-200
										       text-amber-900 dark:bg-amber-900/40 dark:text-amber-200 transition
										       disabled:opacity-50"
										on:click={() =>
											chatIntakeRevisingId === proposal.id
												? cancelChatIntakeRevise()
												: startChatIntakeRevise(proposal.id)}
										disabled={isInProgress}
										data-testid="chat-intake-revise-toggle"
										title="Model-assisted revision for this chat-intake proposal (stays pending until you approve)"
									>
										{chatIntakeRevisingId === proposal.id ? 'Cancel revise' : 'AI revise'}
									</button>
								{/if}

								<!-- Commit — only for approved (reject flow is on the card) -->
								{#if canCommit(proposal.status)}
									<button
										type="button"
										class="px-2 py-0.5 rounded text-[10px] font-medium bg-green-600 hover:bg-green-700
										       text-white transition disabled:opacity-50 disabled:cursor-not-allowed"
										on:click={() => handleCommit(proposal.id)}
										disabled={isInProgress || timelineProposalCommitBlockedByLowChronology(proposal)}
										title={timelineProposalCommitBlockedByLowChronology(proposal)
											? 'Confirm chronology (low confidence) before commit'
											: 'Commits this approved proposal into the official case record (Timeline or governed Note)'}
										data-testid="commit-btn"
									>
										{isInProgress ? 'Committing…' : '→ Commit to Case'}
									</button>
								{/if}
							{/if}
						</div>

						<!-- Inline reject reason (P128) -->
						{#if reviewActionsEnabled && p128SingleReviewMode && canReject(proposal.status) && isRejectingThis}
							<div class="mt-1.5 flex w-full max-w-full flex-wrap items-center gap-1.5 px-0.5">
								<input
									type="text"
									bind:value={rejectReason}
									placeholder="Reason for rejection…"
									class="text-[10px] px-2 py-0.5 rounded border border-gray-300 dark:border-gray-600
									       bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 flex-1 min-w-24"
									data-testid="p128-reject-reason-input"
								/>
								<button
									type="button"
									class="px-2 py-0.5 rounded text-[10px] font-medium bg-red-600 hover:bg-red-700
									       text-white transition disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
									on:click={() => handleReject(proposal.id)}
									disabled={!rejectReason.trim() || isInProgress}
									data-testid="p128-reject-confirm-btn"
								>
									{isInProgress ? '…' : 'Confirm'}
								</button>
								<button
									type="button"
									class="text-[10px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 shrink-0"
									on:click={cancelReject}
									disabled={isInProgress}
								>
									Cancel
								</button>
							</div>
						{/if}

						<!-- Inline reject reason (workflow) -->
						{#if reviewActionsEnabled && !p128SingleReviewMode && canReject(proposal.status) && isRejectingThis}
							<div class="mt-1.5 flex w-full max-w-full flex-wrap items-center gap-1.5 px-0.5">
								<input
									type="text"
									bind:value={rejectReason}
									placeholder="Reason for rejection…"
									class="text-[10px] px-2 py-0.5 rounded border border-gray-300 dark:border-gray-600
									       bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 flex-1 min-w-24"
									data-testid="reject-reason-input"
								/>
								<button
									type="button"
									class="px-2 py-0.5 rounded text-[10px] font-medium bg-red-600 hover:bg-red-700
									       text-white transition disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
									on:click={() => handleReject(proposal.id)}
									disabled={!rejectReason.trim() || isInProgress}
									data-testid="reject-confirm-btn"
									title="Submit rejection with the reason above (workflow only; not committed to the official record)"
								>
									{isInProgress ? '…' : 'Confirm'}
								</button>
								<button
									type="button"
									class="text-[10px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 shrink-0"
									on:click={cancelReject}
									disabled={isInProgress}
								>
									Cancel
								</button>
							</div>
						{/if}
					</div>
				</div>

					<!-- ── EXPANDED PAYLOAD DETAIL ───────────────────────────────── -->
					{#if isExpanded}
						<div
						class="mx-3 mt-1.5 mb-2.5 rounded-md border border-[color:var(--ds-border-default)]
						       bg-gray-50 dark:bg-gray-900 px-3 py-2"
							data-testid="proposal-expanded"
						>
							{#if reviewActionsEnabled && !p128SingleReviewMode}
							<p class="text-[9px] font-semibold uppercase tracking-wider text-gray-400
							         dark:text-gray-500 mb-2">
								Full Payload
							</p>

							<!-- P41-38 — full operator narrative (list card preview is truncated) -->
							{#if isDocumentTimelineIntakePayload(payload)}
								<div
									class="text-[11px] text-gray-700 dark:text-gray-300 font-mono leading-relaxed
									       bg-gray-50 dark:bg-gray-900/70 rounded px-2 py-1.5 mb-3 whitespace-pre-wrap
									       break-words max-h-[min(50vh,28rem)] overflow-y-auto"
									data-testid="document-ingest-full-narrative"
									data-document-ingest-full-narrative="1"
								>
									{documentTimelineIngestOperatorNarrative(payload)}
								</div>
							{/if}

							{#if chatIntakeRevisingId === proposal.id && canApprove(proposal.status)}
								<div
									class="mb-3 rounded border border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/30 px-2 py-2 space-y-1.5"
								>
									<label class="text-[10px] font-medium text-amber-900 dark:text-amber-200 block" for="cir-{proposal.id}"
										>Revision instructions</label
									>
									<textarea
										id="cir-{proposal.id}"
										bind:value={chatIntakeReviseFeedback}
										rows="3"
										class="w-full text-[11px] rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 p-1.5"
										placeholder="e.g. Use Preston Hwy; keep full subject name…"
									/>
									<button
										type="button"
										class="px-2 py-1 rounded text-[10px] font-medium bg-amber-600 hover:bg-amber-700 text-white disabled:opacity-50"
										disabled={!chatIntakeReviseFeedback.trim() || isInProgress}
										on:click={() => handleChatIntakeRevise(proposal.id)}
									>
										{isInProgress ? '…' : 'Apply revision'}
									</button>
								</div>
							{/if}

							{#if proposal.proposal_type === 'note'}
								<!-- Note payload -->
								<div class="space-y-1">
									{#if payload.title}
										<div class="flex gap-2">
											<span class="text-[10px] font-semibold text-gray-500 dark:text-gray-400 w-20 shrink-0">
												Title
											</span>
											<span class="text-[11px] text-gray-700 dark:text-gray-300 flex-1">
												{payload.title}
											</span>
										</div>
									{/if}
									{#if payload.text_original != null && String(payload.text_original).trim() !== ''}
										<div class="flex gap-2 items-start">
											<span class="text-[10px] font-semibold text-gray-500 dark:text-gray-400 w-20 shrink-0">
												Original
											</span>
											<span class="text-[11px] text-gray-700 dark:text-gray-300 flex-1 whitespace-pre-wrap break-words font-mono leading-relaxed">
												{String(payload.text_original)}
											</span>
										</div>
									{/if}
									<div class="flex gap-2 items-start">
										<span class="text-[10px] font-semibold text-gray-500 dark:text-gray-400 w-20 shrink-0">
											{payload.text_original ? 'Cleaned' : 'Content'}
										</span>
										<span class="text-[11px] text-gray-700 dark:text-gray-300 flex-1 whitespace-pre-wrap break-words font-mono leading-relaxed">
											{payload.content ?? '(empty)'}
										</span>
									</div>
								</div>

							{:else if proposal.proposal_type === 'timeline'}
								<!-- Timeline payload -->
								{#if true}
									{@const chronologyConf = normalizeProposalPayloadChronologyConfidence(payload)}
									<div class="space-y-1">
									<div class="flex gap-2">
										<span class="text-[10px] font-semibold text-gray-500 dark:text-gray-400 w-24 shrink-0">
											Occurred At
										</span>
										<span
											class="text-[11px] text-gray-700 dark:text-gray-300"
											data-testid="proposal-timeline-occurred-display"
										>
											{formatTimelineOccurredAtForDisplay(payload.occurred_at)}
										</span>
									</div>
									<div class="flex gap-2 items-center flex-wrap">
										<span class="text-[10px] font-semibold text-gray-500 dark:text-gray-400 w-24 shrink-0">
											When confidence
										</span>
										<span
											class="font-medium uppercase tracking-wide text-[9px] px-1.5 py-0.5 rounded {chronologyConf ===
											'high'
												? 'bg-emerald-100/90 text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-100'
												: chronologyConf === 'medium'
													? 'bg-violet-200/90 text-violet-950 dark:bg-violet-900/60 dark:text-violet-100'
													: 'bg-amber-100/90 text-amber-950 dark:bg-amber-950/40 dark:text-amber-100'}"
											data-testid="timeline-chronology-confidence-badge"
										>
											{chronologyConf}
										</span>
										<span class="text-[9px] text-gray-500 dark:text-gray-500">
											— expand <em class="not-italic font-medium">Technical details</em> below for full
											diagnostics.
										</span>
									</div>
									<div class="flex gap-2">
										<span class="text-[10px] font-semibold text-gray-500 dark:text-gray-400 w-24 shrink-0">
											Type
										</span>
										<span class="text-[11px] text-gray-700 dark:text-gray-300">
											{payload.type ?? '—'}
										</span>
									</div>
									<div class="flex gap-2 items-start">
										<span class="text-[10px] font-semibold text-gray-500 dark:text-gray-400 w-24 shrink-0">
											Original
										</span>
										<span class="text-[11px] text-gray-700 dark:text-gray-300 flex-1 whitespace-pre-wrap break-words font-mono leading-relaxed">
											{payload.text_original ?? '—'}
										</span>
									</div>
									{#if payload.text_cleaned != null && String(payload.text_cleaned).trim() !== ''}
										<div class="flex gap-2 items-start">
											<span class="text-[10px] font-semibold text-gray-500 dark:text-gray-400 w-24 shrink-0">
												Cleaned
											</span>
											<span class="text-[11px] text-gray-700 dark:text-gray-300 flex-1 whitespace-pre-wrap break-words font-mono leading-relaxed">
												{String(payload.text_cleaned)}
											</span>
										</div>
									{/if}
									{#if Array.isArray(payload.tags) && payload.tags.length > 0}
										<div class="flex gap-2">
											<span class="text-[10px] font-semibold text-gray-500 dark:text-gray-400 w-24 shrink-0">
												Tags
											</span>
											<span class="text-[11px] text-gray-700 dark:text-gray-300">
												{payload.tags.join(', ')}
											</span>
										</div>
									{/if}
									{#if payload.location_text}
										<div class="flex gap-2">
											<span class="text-[10px] font-semibold text-gray-500 dark:text-gray-400 w-24 shrink-0">
												Location
											</span>
											<span class="text-[11px] text-gray-700 dark:text-gray-300">
												{payload.location_text}
											</span>
										</div>
									{/if}
									{#if payload.source_type === 'case_file' && payload.source_reference_id}
										<div class="flex gap-2">
											<span class="text-[10px] font-semibold text-gray-500 dark:text-gray-400 w-24 shrink-0">
												Source file
											</span>
											<span class="text-[11px] text-gray-700 dark:text-gray-300 break-all">
												{String(payload.source_document_filename ?? payload.source_reference_id)}
											</span>
										</div>
									{/if}
									{#if payload.source_text_truncated_for_model === true}
										<p
											class="text-[10px] font-medium text-amber-900 dark:text-amber-100 mt-2 px-1.5 py-1 rounded border border-amber-400 dark:border-amber-600 bg-amber-50/90 dark:bg-amber-950/50"
											data-testid="document-ingest-truncation-card-note"
										>
											These proposals used only the <strong>start</strong> of the file for generation — not the
											full extracted text. Events later in the file may be absent (see banner above).
										</p>
									{/if}
									{#if proposal.status === 'approved' && proposal.proposal_type === 'timeline'}
										<p
											class="text-[9px] text-gray-600 dark:text-gray-400 mt-1 px-1 py-1 rounded border border-gray-200 dark:border-gray-600 bg-gray-50/80 dark:bg-gray-900/40"
											data-testid="approved-timeline-precommit-notice"
										>
											<strong>Already approved.</strong> Further edits here are
											<strong>controlled pre-commit corrections</strong> (chronology and, for document-ingest
											rows, extracted text) — not a full redraft. Reject and re-propose if the narrative needs a
											fresh review.
										</p>
									{/if}
									{#if (canApprove(proposal.status) || canCommit(proposal.status)) && isDocumentTimelineIntakePayload(payload) && docEditById[proposal.id]}
										{@const de = docEditById[proposal.id]}
										{#if de.occurred_at_confidence === 'low' && !de.operator_occurred_at_confirmed}
											<p class="text-[10px] text-amber-700 dark:text-amber-400 mt-2">
												Low date confidence — verify the date and time below and check “I confirm date/time”
												before commit.
											</p>
										{/if}
										<div
											class="mt-3 space-y-2 rounded border border-violet-200 dark:border-violet-800 bg-violet-50/40 dark:bg-violet-950/20 p-2"
											data-testid="document-ingest-edit-form"
										>
											<p class="text-[10px] font-semibold text-violet-900 dark:text-violet-200">
												{#if proposal.status === 'approved'}
													Pre-commit correction (approval stands; limited fields)
												{:else}
													Review &amp; edit (before approve or commit)
												{/if}
											</p>
											{#if proposal.status === 'approved'}
												<p class="text-[9px] text-violet-800/90 dark:text-violet-300/90 leading-snug">
													Use this only to fix timing, confidence, or obvious extract errors before commit — not
													to rework reviewed content.
												</p>
											{/if}
											<label class="block text-[10px] text-gray-600 dark:text-gray-400">
												Occurred at
												<span class="text-[9px] font-normal text-gray-500 dark:text-gray-500 ml-1"
													>{TIMELINE_TIME_ZONE_LABEL}</span
												>
												<input
													type="datetime-local"
													step="1"
													title={TIMELINE_TIME_ZONE_TOOLTIP}
													class="mt-0.5 w-full max-w-md text-[11px] rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-1.5 py-1"
													data-testid="document-ingest-occurred-input"
													bind:value={docEditById[proposal.id].occurred_at}
													on:input={() => (docEditById = docEditById)}
												/>
											</label>
											<label class="block text-[10px] text-gray-600 dark:text-gray-400">
												Type
												<select
													class="mt-0.5 w-full max-w-md text-[11px] rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-1.5 py-1"
													data-testid="document-ingest-type-select"
													bind:value={docEditById[proposal.id].type}
													on:change={() => (docEditById = docEditById)}
												>
													{#if docEditById[proposal.id].type && !isCanonicalTimelineEntryType(docEditById[proposal.id].type)}
														<option value={docEditById[proposal.id].type}
															>{timelineEntryTypeOptionLabel(docEditById[proposal.id].type)} (from ingest)</option
														>
													{/if}
													{#each TIMELINE_ENTRY_TYPE_VALUES as t}
														<option value={t}>{timelineEntryTypeOptionLabel(t)}</option>
													{/each}
												</select>
											</label>
											<label class="block text-[10px] text-gray-600 dark:text-gray-400">
												text_original
												<textarea
													rows="3"
													class="mt-0.5 w-full text-[11px] rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-1.5 py-1 font-mono"
													bind:value={docEditById[proposal.id].text_original}
													on:input={() => (docEditById = docEditById)}
												/>
											</label>
											<label class="block text-[10px] text-gray-600 dark:text-gray-400">
												text_cleaned
												<textarea
													rows="3"
													class="mt-0.5 w-full text-[11px] rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-1.5 py-1 font-mono"
													bind:value={docEditById[proposal.id].text_cleaned}
													on:input={() => (docEditById = docEditById)}
												/>
											</label>
											<label class="block text-[10px] text-gray-600 dark:text-gray-400">
												occurred_at_confidence
												<select
													class="mt-0.5 w-full text-[11px] rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-1.5 py-1"
													bind:value={docEditById[proposal.id].occurred_at_confidence}
													on:change={() => (docEditById = docEditById)}
												>
													<option value="high">High — explicit date/time in source</option>
													<option value="medium">Medium — partly inferred; check against source</option>
													<option value="low">Low — confirm before commit</option>
												</select>
											</label>
											<label class="flex items-center gap-2 text-[10px] text-gray-700 dark:text-gray-300">
												<input
													type="checkbox"
													bind:checked={docEditById[proposal.id].operator_occurred_at_confirmed}
													on:change={() => (docEditById = docEditById)}
												/>
												I confirm date/time is correct for commit (required when confidence is low)
											</label>
											<button
												type="button"
												class="px-2 py-1 rounded text-[10px] font-medium bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-50"
												disabled={documentIngestSavingId === proposal.id || isInProgress}
												data-testid="document-ingest-save-edits"
												on:click={() => saveDocumentIngestEdit(proposal.id)}
											>
												{documentIngestSavingId === proposal.id ? 'Saving…' : 'Save edits'}
											</button>
										</div>
									{/if}
									{#if !isDocumentTimelineIntakePayload(payload) && (canApprove(proposal.status) || canCommit(proposal.status)) && timelineProposalCommitBlockedByLowChronology(proposal)}
										<div
											class="mt-3 space-y-2 rounded border border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/25 p-2"
											data-testid="timeline-low-chronology-operator-panel"
										>
											<p class="text-[10px] text-amber-950 dark:text-amber-100 leading-snug">
												<strong>Chronology responsibility:</strong> confidence is low. By confirming, you take
												responsibility that <span class="font-mono">occurred_at</span> is correct for the official
												timeline — or edit the proposal while it is still pending (or ask a reviewer to update
												it once approved).
											</p>
											<button
												type="button"
												class="px-2 py-1 rounded text-[10px] font-medium bg-amber-700 text-white hover:bg-amber-800 disabled:opacity-50"
												disabled={isInProgress}
												data-testid="timeline-low-chronology-confirm-btn"
												on:click={() => confirmLowChronologyForProposal(proposal.id)}
											>
												I confirm date/time for this entry
											</button>
										</div>
									{/if}
									<details
										class="mt-3 rounded border border-gray-200 dark:border-gray-600 bg-white/60 dark:bg-gray-950/40 px-2 py-1.5"
										data-testid="proposal-review-technical-details"
									>
										<summary
											class="cursor-pointer select-none text-[10px] font-medium text-gray-600 dark:text-gray-400 list-none [&::-webkit-details-marker]:hidden"
										>
											Technical details — diagnostics &amp; source routing (optional)
										</summary>
										<div class="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700 space-y-2">
											<div
												class="text-[10px] text-gray-600 dark:text-gray-400 space-y-0.5 rounded-r py-0.5 pl-2 border-l-2 {chronologyConf ===
												'high'
													? 'border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/20'
													: chronologyConf === 'medium'
														? 'border-violet-500 bg-violet-50/50 dark:bg-violet-950/25'
														: 'border-amber-500 bg-amber-50/40 dark:bg-amber-950/20'}"
											>
												<p class="text-[9px] font-medium text-gray-700 dark:text-gray-300">
													Chronology guidance (same as “When confidence” badge above)
												</p>
												{#if chronologyConf === 'high'}
													<p
														class="text-[9px] text-gray-600 dark:text-gray-400 leading-snug mt-0.5"
														data-testid="timeline-chronology-copy-high"
													>
														<strong>Source-explicit:</strong> the date or time appears in the quoted source text.
														That does not prove it is factually correct — still sanity-check before commit.
													</p>
												{:else if chronologyConf === 'medium'}
													<p
														class="text-[9px] text-gray-600 dark:text-gray-400 leading-snug mt-0.5"
														data-testid="timeline-chronology-copy-medium"
													>
														<strong>Partly inferred:</strong> a timestamp is present but not fully anchored in
														explicit calendar wording. Compare against the source carefully before you commit.
													</p>
												{:else}
													<p
														class="text-[9px] text-gray-600 dark:text-gray-400 leading-snug mt-0.5"
														data-testid="timeline-chronology-copy-low"
													>
														<strong>Unreliable timing:</strong> confirm or correct below (or via document-ingest
														fields) before commit — required for low confidence.
													</p>
												{/if}
											</div>
											{#if proposal.proposal_type === 'timeline' && proposal.occurred_at_timestamp_reconciliation}
												<OccurredAtTimestampReconciliationReview
													rec={proposal.occurred_at_timestamp_reconciliation}
												/>
											{/if}
											{#if proposal.proposal_type === 'timeline' && proposal.occurred_at_guidance}
												<OccurredAtGuidanceReview guidance={proposal.occurred_at_guidance} />
											{/if}
											{#if isDocumentTimelineIntakePayload(payload)}
												{@const detTsItems = parseDeterministicTimestampCandidatesFromPayload(payload)}
												<DeterministicTimestampCandidatesReview items={detTsItems} />
											{/if}
											<div class="pt-2 border-t border-gray-200 dark:border-gray-700 flex flex-wrap gap-x-4 gap-y-0.5">
												{#if isDocumentTimelineIntakePayload(payload)}
													<span
														class="text-[10px] text-gray-500 dark:text-gray-400 max-w-full"
														data-testid="document-ingest-source-footer"
													>
														<span class="font-semibold">Source:</span>
														Case file document ingest — synthetic internal thread for routing only (not chat). Ref
														<span class="font-mono">{shortId(proposal.source_thread_id)}</span>
														· proposal
														<span class="font-mono">{shortId(proposal.id)}</span>
													</span>
												{:else}
													<span class="text-[10px] text-gray-400 dark:text-gray-500">
														<span class="font-semibold">Source:</span>
														{proposal.source_scope} thread · <span class="font-mono">{shortId(proposal.source_thread_id)}</span>
													</span>
													{#if proposal.source_message_id}
														<span class="text-[10px] text-gray-400 dark:text-gray-500">
															<span class="font-semibold">Msg:</span>
															<span class="font-mono">{shortId(proposal.source_message_id)}</span>
														</span>
													{/if}
													<span class="text-[10px] text-gray-400 dark:text-gray-500">
														<span class="font-semibold">ID:</span>
														<span class="font-mono">{shortId(proposal.id)}</span>
													</span>
												{/if}
												{#if proposal.reviewed_by}
													<span class="text-[10px] text-gray-400 dark:text-gray-500">
														<span class="font-semibold">Reviewed by:</span>
														<span class="font-mono">{shortId(proposal.reviewed_by)}</span>
													</span>
												{/if}
											</div>
										</div>
									</details>
								</div>
								{/if}

							{:else}
								<!-- Unknown type — raw JSON -->
								<pre class="text-[10px] text-gray-600 dark:text-gray-400 font-mono whitespace-pre-wrap break-all">
{JSON.stringify(payload, null, 2)}</pre>
							{/if}

							{#if proposal.proposal_type !== 'timeline'}
								<!-- Metadata footer (timeline: folded into technical details disclosure) -->
								<div class="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700 flex flex-wrap gap-x-4 gap-y-0.5">
									{#if isDocumentTimelineIntakePayload(payload)}
										<span
											class="text-[10px] text-gray-500 dark:text-gray-400 max-w-full"
											data-testid="document-ingest-source-footer"
										>
											<span class="font-semibold">Source:</span>
											Case file document ingest — synthetic internal thread for routing only (not chat). Ref
											<span class="font-mono">{shortId(proposal.source_thread_id)}</span>
											· proposal
											<span class="font-mono">{shortId(proposal.id)}</span>
										</span>
									{:else}
										<span class="text-[10px] text-gray-400 dark:text-gray-500">
											<span class="font-semibold">Source:</span>
											{proposal.source_scope} thread · <span class="font-mono">{shortId(proposal.source_thread_id)}</span>
										</span>
										{#if proposal.source_message_id}
											<span class="text-[10px] text-gray-400 dark:text-gray-500">
												<span class="font-semibold">Msg:</span>
												<span class="font-mono">{shortId(proposal.source_message_id)}</span>
											</span>
										{/if}
										<span class="text-[10px] text-gray-400 dark:text-gray-500">
											<span class="font-semibold">ID:</span>
											<span class="font-mono">{shortId(proposal.id)}</span>
										</span>
									{/if}
									{#if proposal.reviewed_by}
										<span class="text-[10px] text-gray-400 dark:text-gray-500">
											<span class="font-semibold">Reviewed by:</span>
											<span class="font-mono">{shortId(proposal.reviewed_by)}</span>
										</span>
									{/if}
								</div>
							{/if}
							{:else}
								<CaseProposalDetailPanel
									proposal={proposal}
									showChronologyConfirm={p128SingleReviewMode &&
										proposal.status === 'pending' &&
										proposal.proposal_type === 'timeline' &&
										timelineProposalCommitBlockedByLowChronology(proposal) &&
										!isDocumentTimelineIntakePayload(payload)}
									chronologyConfirmBusy={actionInProgress.has(proposal.id)}
									onConfirmChronology={() => void confirmLowChronologyForProposal(proposal.id)}
								/>
							{/if}
						</div>
					{/if}
				</div>
			{/each}
			{#if hasMore}
				<div
					bind:this={scrollSentinelEl}
					class="h-4 w-full shrink-0"
					aria-hidden="true"
					data-testid="proposals-scroll-sentinel"
				></div>
			{/if}
		</div>
	{/if}
	</div>

	{#if !loading && !loadError}
		{#if hasMore}
			<div
				class="shrink-0 flex flex-col items-center gap-1.5 py-3 border-b border-gray-100 dark:border-gray-800"
				data-testid="proposals-load-more-footer"
			>
				{#if isLoadingMore}
					<svg
						class="animate-spin size-4 text-gray-400"
						xmlns="http://www.w3.org/2000/svg"
						fill="none"
						viewBox="0 0 24 24"
						aria-hidden="true"
					>
						<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"
						></circle>
						<path
							class="opacity-75"
							fill="currentColor"
							d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
						></path>
					</svg>
					<p class="text-[10px] text-gray-400 dark:text-gray-500">Loading more proposals…</p>
				{:else}
					<button
						type="button"
						class="text-[11px] font-medium text-violet-600 dark:text-violet-400 hover:underline"
						on:click={() => void executeLoadMoreProposals()}
						data-testid="proposals-load-more-btn"
						title="Load the next page of proposals (same tab, type filter, and applied search if any)"
					>
						Load {PROPOSALS_LOAD_MORE_CHUNK} more
					</button>
				{/if}
				{#if loadMoreError}
					<p class="text-[11px] text-red-500 dark:text-red-400" data-testid="proposals-load-more-error">
						{loadMoreError}
					</p>
				{/if}
			</div>
		{:else if activeProposals.length > 0 && totalForActiveTab > PROPOSALS_TAB_PAGE_SIZE}
			<p
				class="shrink-0 text-[10px] text-center text-gray-400 dark:text-gray-500 py-2 border-b border-gray-100 dark:border-gray-800"
				data-testid="proposals-end-of-list"
			>
				All {totalForActiveTab} proposals loaded
			</p>
		{/if}
	{/if}

	<!-- P40-05 — explicit multi-item confirmations (single-item bulk uses same handlers without dialog) -->
	<ConfirmDialog
		bind:show={bulkApproveConfirmShow}
		title="Approve multiple proposals?"
		message={bulkApproveConfirmMessage}
		confirmLabel={`Approve ${bulkApproveConfirmCount}`}
		onConfirm={() => {
			void handleBulkApprove();
		}}
	/>
	<ConfirmDialog
		bind:show={bulkCommitConfirmShow}
		title="Commit to official record?"
		message={bulkCommitConfirmMessage}
		confirmLabel={`Commit ${bulkCommitConfirmCount}`}
		onConfirm={() => {
			void handleBulkCommit();
		}}
	/>
	<ConfirmDialog
		bind:show={bulkConfirmChronologyShow}
		title="Confirm date/time for low-confidence entries?"
		message={`You are confirming the occurred_at for **${bulkConfirmChronologyCount}** entries that do not have a detected timestamp. This records that you have reviewed and accept the date/time as shown. After confirming, Bulk Commit will be enabled for these entries.`}
		confirmLabel={`Confirm date/time (${bulkConfirmChronologyCount})`}
		onConfirm={() => {
			void handleBulkConfirmChronology();
		}}
	/>

	<!-- P43-05 (I-01) — block reload / teardown / SPA nav while document-ingest form is dirty -->
	{#if docEditLossDialogShow}
		<!-- svelte-ignore a11y-click-events-have-key-events -->
		<!-- svelte-ignore a11y-no-static-element-interactions -->
		<div
			class="fixed inset-0 bg-black/60 z-[99999999] flex justify-center items-center p-4"
			role="alertdialog"
			aria-modal="true"
			aria-labelledby="doc-edit-unsaved-title"
			data-testid="doc-edit-unsaved-dialog"
			on:mousedown={onDocEditLossDialogCancel}
		>
			<div
				class="max-w-md w-full rounded-xl border border-[color:var(--ds-border-default)] bg-white dark:bg-gray-950 shadow-xl p-5"
				on:mousedown|stopPropagation
			>
				<h3
					id="doc-edit-unsaved-title"
					class="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2"
				>
					Unsaved document-ingest edits
				</h3>
				<p class="text-xs text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
					You have unsaved changes to document-ingest proposal fields. <strong>Save</strong> uses Case Engine
					(the same path as <strong>Save edits</strong>). <strong>Discard</strong> drops your local changes only
					— no server request. <strong>Cancel</strong> stays on this screen.
				</p>
				<div class="flex flex-col sm:flex-row gap-2 sm:justify-end">
					<button
						type="button"
						class="text-xs font-medium py-2 px-3 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-900"
						data-testid="doc-edit-unsaved-cancel"
						on:click={onDocEditLossDialogCancel}
					>
						Cancel
					</button>
					<button
						type="button"
						class="text-xs font-medium py-2 px-3 rounded-lg border border-red-300 dark:border-red-800 text-red-800 dark:text-red-200 hover:bg-red-50 dark:hover:bg-red-950/40"
						data-testid="doc-edit-unsaved-discard"
						on:click={() => void onDocEditLossDialogDiscard()}
					>
						Discard
					</button>
					<button
						type="button"
						class="text-xs font-medium py-2 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white"
						data-testid="doc-edit-unsaved-save"
						on:click={() => void onDocEditLossDialogSave()}
					>
						Save
					</button>
				</div>
			</div>
		</div>
	{/if}
</div>
