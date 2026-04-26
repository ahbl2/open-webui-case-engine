<script lang="ts">
	import { tick, onDestroy } from 'svelte';
	import { toast } from 'svelte-sonner';
import {
	getWorkflowListAggregates,
	listWorkflowItemsPaginated,
	updateWorkflowItem,
	deleteWorkflowItem,
	restoreWorkflowItem,
	listWorkflowProposalsPage,
	acceptWorkflowProposal,
	rejectWorkflowProposal,
	listWorkflowSupportLinks,
	type WorkflowItem,
	type WorkflowItemType,
	type WorkflowListAggregates,
	type WorkflowListViewParam,
	type WorkflowProposal,
	type WorkflowSupportLink
} from '$lib/apis/caseEngine';
import {
	listCaseWorkflowItems,
	type CaseEngineCaseWorkflowItem
} from '$lib/apis/caseEngine/caseWorkflowItemsApi';
import CaseWorkflowCreateForm from '$lib/components/case/CaseWorkflowCreateForm.svelte';
import {
	P127_WORKFLOW_CREATE_ENTRY_BUTTON,
	P127_WORKFLOW_CREATE_MODAL_TITLE,
	P127_WORKFLOW_CREATE_SUCCESS_TOAST
} from '$lib/caseContext/p127WorkflowCreateCopy';
import {
	P127_WORKFLOW_DETAIL_META_UPDATED,
	P127_WORKFLOW_LIST_EMPTY,
	P127_WORKFLOW_LIST_EMPTY_HINT,
	P127_WORKFLOW_LIST_LOADING,
	P127_WORKFLOW_LIST_SECTION_TITLE
} from '$lib/caseContext/p127WorkflowListDetailCopy';
import { p127LabelWorkflowStatus, p127LabelWorkflowType } from '$lib/case/p127WorkflowDisplay';
import {
	P127_WORKFLOW_LEGACY_RANK_CELL_PREFIX,
	P127_WORKFLOW_LEGACY_RANK_EDIT_LABEL,
	P127_WORKFLOW_PROPOSAL_PREVIEW_HEADING,
	P127_WORKFLOW_PROPOSAL_QUEUE_ARIA,
	P127_WORKFLOW_PROPOSAL_RANK_LABEL
} from '$lib/caseContext/p127WorkflowBoundaryCopy';
import {
	hrefForSupportLinkTarget,
	loadSupportLinkTargetIndex,
	primaryLabelForSupportLink,
	supportLinkKindBadgeClass,
	supportLinkKindShortLabel,
	type SupportLinkTargetIndex
} from '$lib/utils/workflowSupportLinkDisplay';
	import { CASE_DESTINATION_LABELS, CASE_DESTINATION_TITLES } from '$lib/utils/caseDestinationLabels';
	import {
		getStatusesForType,
		isValidStatusForType,
		getStatusBadgeClasses,
		getOriginBadgeClasses,
		formatWorkflowItemTypeForDisplay,
		formatWorkflowStatusForDisplay,
		formatWorkflowOriginForDisplay,
		formatWorkflowProposalTypeForDisplay,
		type WorkflowItemType as LocalType
	} from '$lib/components/case/workflowStatus';
	import {
		P127_WORKFLOW_EMPTY_MANUAL_CREATION_LINE,
		P127_WORKFLOW_FRAMING_BODY_PRIMARY,
		P127_WORKFLOW_FRAMING_BODY_SECONDARY,
		P127_WORKFLOW_FRAMING_BODY_TERTIARY,
		P127_WORKFLOW_SURFACE_TITLE
	} from '$lib/caseContext/p127WorkflowFramingCopy';
	import {
		DS_BADGE_CLASSES,
		DS_BTN_CLASSES,
		DS_MODAL_CLASSES,
		DS_OVERLAY_CLASSES,
		DS_PROPOSALS_CLASSES,
		DS_STATUS_TEXT_CLASSES,
		DS_TIMELINE_CLASSES,
		DS_TYPE_CLASSES,
		DS_WORKFLOW_CLASSES,
		DS_WORKFLOW_TEXT_CLASSES
	} from '$lib/case/detectivePrimitiveFoundation';
import {
	ClipboardDocumentListIcon,
	DocumentTextIcon,
	LightBulbIcon,
	PuzzlePieceIcon
} from 'heroicons-svelte/24/outline';
import EntityWorkspace from '$lib/components/case/EntityWorkspace.svelte';
import ConfirmDialog from '$lib/components/common/ConfirmDialog.svelte';
import CaseLoadingState from '$lib/components/case/CaseLoadingState.svelte';
import CaseEmptyState from '$lib/components/case/CaseEmptyState.svelte';
import CaseErrorState from '$lib/components/case/CaseErrorState.svelte';
import WorkflowItemSupportLinksPanel from '$lib/components/case/WorkflowItemSupportLinksPanel.svelte';

	export let caseId: string;
	export let token: string;
	export let isAdmin: boolean = false;
	/** P57-07: tighter rhythm + scroll bounds when rendered in Case Tools (max-h-96 panel). */
	export let embedded: boolean = false;

	/** P13 list tabs — maps to `listWorkflowItems` `type` (except `completed` is client-filtered on full list). */
	type WorkflowListTab = 'all' | 'hypothesis' | 'gap' | 'completed';

	const WORKFLOW_LIST_PAGE = 40;
	const WORKFLOW_QUEUE_PROPOSALS_PAGE = 32;

	let items: WorkflowItem[] = [];
	/** Server KPIs for the attention strip (same scope as aggregates endpoint). */
	let workflowAggregates: WorkflowListAggregates | null = null;
	/** Current filter total for the list (not necessarily the number of rows in memory). */
	let workflowListTotal = 0;
	let workflowListHasMore = false;
	let workflowListLoadingMore = false;
	let loading = true;
	let loadError = '';
	type WorkflowListViewState = 'loading' | 'error' | 'empty' | 'success';
	let workflowListViewState: WorkflowListViewState = 'loading';
	let listTab: WorkflowListTab = 'all';
	let itemSearchDraft = '';
	let itemSearchApplied = '';
	let includeDeleted = false;
	let createOpen = false;
	let createFormKey = 0;
	/** P127-02 — Phase 117 `case_workflow_items` (explicit create + list); distinct from legacy P13 rows below. */
	let p117WorkflowItems: CaseEngineCaseWorkflowItem[] = [];
	let p117WorkflowLoading = false;
	let editItem: WorkflowItem | null = null;
	let deleteTarget: WorkflowItem | null = null;
	let restoreTarget: WorkflowItem | null = null;
	let proposals: WorkflowProposal[] = [];
	/** P78-06: pending-only triage list; history is derived from the same paged `loadProposals` payload. */
	$: pendingProposals = proposals.filter((p) => String(p.status).toUpperCase() === 'PENDING');
	$: historyProposals = proposals.filter((p) => String(p.status).toUpperCase() !== 'PENDING');
	/** Server counts (full case), so the chip is accurate when the queue is paged. */
	let proposalStatusCounts: Record<string, number> = {};
	$: proposalCount = proposalStatusCounts['PENDING'] ?? pendingProposals.length;
	let proposalPageGen = 0;
	let proposalListHasMore = false;
	let proposalListLoadingMore = false;
	let proposalsLoading = false;
	let proposalError: string | null = null;
	let expandedProposalId: string | null = null;
	let acceptTarget: WorkflowProposal | null = null;
	let rejectTarget: WorkflowProposal | null = null;
	let rejectReason = '';
	/** P57-09: guards double-submit / parallel accept+reject on workflow proposals (client-only). */
	let proposalMutationInFlight = false;
	// ── Confirm dialog visibility (P28-49) ─────────────────────────────────────
	// These replace the four hand-rolled fixed-inset modals. Target variables
	// above still hold the item/proposal being acted on; these booleans are the
	// single source of truth for dialog visibility passed to ConfirmDialog.
	let showDeleteConfirm = false;
	let showRestoreConfirm = false;
	let showAcceptConfirm = false;
	let showRejectConfirm = false;
	let showEntityWorkspace = false;
	let entityWorkspaceType: string | null = null;
	let entityWorkspaceId: string | null = null;
	/** P60-04: support links dock for one non-deleted workflow item */
	let supportPanelItem: WorkflowItem | null = null;
	/** P60-05: row-level summaries (parallel to panel). */
	let supportLinksByItemId: Record<string, WorkflowSupportLink[]> = {};
	let supportRowIndex: SupportLinkTargetIndex | null = null;
	let activeSupportSummaryLoadId = 0;
	let activeWorkflowListLoadId = 0;
	let workflowTableScrollEl: HTMLDivElement | null = null;
	let workflowTableSentinel: HTMLElement | undefined;
	let workflowTableScrollObserver: IntersectionObserver | undefined;
	let workflowProposalsSentinel: HTMLElement | undefined;
	let workflowProposalsScrollObserver: IntersectionObserver | undefined;

	/** P59-10: guidance — default collapsed so the dashboard surface dominates. */
	let guidanceExpanded = false;
	/** "About this surface" — local disclosure only. */
	let aboutSurfaceOpen = false;

	/** Redesign: operational tracking dashboard (presentation-only). */
	const WORKFLOW_DASH_TITLE = 'Workflow — Operational Tracking';
	const WORKFLOW_DASH_SUBTITLE =
		'Tracks operational actions here—leads, tasks, and follow-ups you add. This is not the case record or the official Timeline.';
	const WORKFLOW_AUTHORITY_BANNER =
		'Workflow is your planning layer. Nothing here changes the Timeline unless you separately create a timeline entry. Use the Proposals tab to review and commit items to Timeline or Notes.';

	// P57-08: transient row highlight + scroll after proposal accept (client-only).
	let highlightWorkflowItemId: string | null = null;
	let highlightWorkflowItemClearTimer: ReturnType<typeof setTimeout> | null = null;

	function clearPostAcceptHighlight() {
		if (highlightWorkflowItemClearTimer != null) {
			clearTimeout(highlightWorkflowItemClearTimer);
			highlightWorkflowItemClearTimer = null;
		}
		highlightWorkflowItemId = null;
	}

	async function orientToWorkflowItemRow(itemId: string) {
		clearPostAcceptHighlight();
		highlightWorkflowItemId = itemId;
		await tick();
		await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
		const row = document.querySelector(`[data-workflow-item-row="${itemId}"]`);
		if (row instanceof HTMLElement) {
			row.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
		}
		highlightWorkflowItemClearTimer = setTimeout(() => {
			highlightWorkflowItemId = null;
			highlightWorkflowItemClearTimer = null;
		}, 2600);
	}

	/** P59-16: after expand, nudge Guidance into view on the tab/root scroller (nearest = minimal jump). */
	async function toggleGuidanceExpanded() {
		guidanceExpanded = !guidanceExpanded;
		if (!guidanceExpanded) return;
		await tick();
		await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
		const guidTestId = 'workflow-guidance-placeholder';
		const anchor = document.querySelector(`[data-testid="${guidTestId}"]`);
		if (anchor instanceof HTMLElement) {
			anchor.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
		}
	}

	function getNearestScrollParent(el: HTMLElement | null): Element | null {
		let e: HTMLElement | null = el;
		for (let i = 0; e && i < 24; i++, e = e.parentElement) {
			if (e === document.body || e === document.documentElement) break;
			const oy = getComputedStyle(e).overflowY;
			if (oy === 'auto' || oy === 'scroll') return e;
		}
		return null;
	}

	function setupWorkflowTableScrollObserver(): void {
		workflowTableScrollObserver?.disconnect();
		if (!workflowTableSentinel) {
			workflowTableScrollObserver = undefined;
			return;
		}
		const root = workflowTableScrollEl ?? getNearestScrollParent(workflowTableSentinel);
		workflowTableScrollObserver = new IntersectionObserver(
			(obs) => {
				if (
					obs[0]?.isIntersecting &&
					workflowListHasMore &&
					!workflowListLoadingMore &&
					!loading &&
					!loadError
				) {
					void loadWorkflowListMore();
				}
			},
			{ root, rootMargin: '200px', threshold: 0 }
		);
		workflowTableScrollObserver.observe(workflowTableSentinel);
	}

	function setupWorkflowProposalsScrollObserver(): void {
		workflowProposalsScrollObserver?.disconnect();
		if (!workflowProposalsSentinel) {
			workflowProposalsScrollObserver = undefined;
			return;
		}
		const root = getNearestScrollParent(workflowProposalsSentinel);
		workflowProposalsScrollObserver = new IntersectionObserver(
			(obs) => {
				if (
					obs[0]?.isIntersecting &&
					proposalListHasMore &&
					!proposalListLoadingMore &&
					!proposalsLoading &&
					!proposalError
				) {
					void loadProposalsMore();
				}
			},
			{ root, rootMargin: '200px', threshold: 0 }
		);
		workflowProposalsScrollObserver.observe(workflowProposalsSentinel);
	}

	$: if (workflowTableSentinel) {
		const el = workflowTableSentinel;
		requestAnimationFrame(() => {
			if (workflowTableSentinel === el) setupWorkflowTableScrollObserver();
		});
	} else {
		workflowTableScrollObserver?.disconnect();
		workflowTableScrollObserver = undefined;
	}

	$: if (workflowProposalsSentinel) {
		const el = workflowProposalsSentinel;
		requestAnimationFrame(() => {
			if (workflowProposalsSentinel === el) setupWorkflowProposalsScrollObserver();
		});
	} else {
		workflowProposalsScrollObserver?.disconnect();
		workflowProposalsScrollObserver = undefined;
	}

	onDestroy(() => {
		clearPostAcceptHighlight();
		workflowTableScrollObserver?.disconnect();
		workflowProposalsScrollObserver?.disconnect();
	});

	// ── Route-reuse case-switch guard (P28-45) ─────────────────────────────────
	// Fires only when `caseId` changes; clears in-tab state before the reactive loaders run.
	let prevWorkflowCaseId: string = caseId;
	function isWorkflowItemDoneStatus(status: string): boolean {
		const s = String(status).toUpperCase();
		return s === 'CLOSED' || s === 'RESOLVED' || s === 'SUPPORTED' || s === 'REJECTED';
	}
	function isWorkflowItemOpenActiveStatus(status: string): boolean {
		const s = String(status).toUpperCase();
		return s === 'OPEN' || s === 'IN_PROGRESS' || s === 'ASSIGNED';
	}
	function defaultResolveStatusForItem(item: WorkflowItem): string {
		const t = String(item.type).toUpperCase();
		if (t === 'GAP') return 'RESOLVED';
		if (t === 'HYPOTHESIS') return 'SUPPORTED';
		return 'CLOSED';
	}
	$: workflowListViewState = loading
		? 'loading'
		: loadError
			? 'error'
			: items.length === 0
				? 'empty'
				: 'success';
	// P59-03: attention signals (server P13 aggregates + P117 operational rows so the strip matches visible work).
	$: attentionListReady = !loading && !loadError;
	/** P127/P117: TASK/LEAD in `case_workflow_items` — not in P13 `workflow_items`; merge into open/completed KPIs. */
	$: p117OpenActiveCount = p117WorkflowItems.filter(
		(w) => !w.deleted_at && (w.status === 'OPEN' || w.status === 'IN_PROGRESS')
	).length;
	$: p117ClosedCount = p117WorkflowItems.filter((w) => !w.deleted_at && w.status === 'CLOSED').length;
	$: countOpen = (workflowAggregates?.count_open ?? 0) + p117OpenActiveCount;
	$: countDone = (workflowAggregates?.count_done ?? 0) + p117ClosedCount;
	$: countGapsHyp = (workflowAggregates?.count_hypothesis ?? 0) + (workflowAggregates?.count_gap ?? 0);
	function listTabBadgeCount(t: WorkflowListTab): number {
		if (!workflowAggregates) return 0;
		if (t === 'completed') return workflowAggregates.count_done;
		if (t === 'hypothesis') return workflowAggregates.count_hypothesis_incomplete;
		if (t === 'gap') return workflowAggregates.count_gap_incomplete;
		return workflowAggregates.count_incomplete;
	}
	function listTabToView(tab: WorkflowListTab): WorkflowListViewParam {
		if (tab === 'hypothesis') return 'hypothesis';
		if (tab === 'gap') return 'gap';
		if (tab === 'completed') return 'completed';
		return 'all';
	}
	$: attentionFilterScopeLabel =
		listTab === 'all'
			? 'All items'
			: listTab === 'hypothesis'
				? 'Hypotheses'
				: listTab === 'gap'
					? 'Gaps'
					: 'Completed';

	$: if (caseId && token && caseId !== prevWorkflowCaseId) {
		prevWorkflowCaseId = caseId;
		items = [];
		p117WorkflowItems = [];
		loading = true;
		loadError = '';
		createOpen = false;
		editItem = null;
		deleteTarget = null;
		restoreTarget = null;
		showDeleteConfirm = false;
		showRestoreConfirm = false;
		proposals = [];
		proposalError = null;
		expandedProposalId = null;
		acceptTarget = null;
		rejectTarget = null;
		rejectReason = '';
		showAcceptConfirm = false;
		showRejectConfirm = false;
		showEntityWorkspace = false;
		entityWorkspaceType = null;
		entityWorkspaceId = null;
		supportPanelItem = null;
		supportLinksByItemId = {};
		supportRowIndex = null;
		activeSupportSummaryLoadId += 1;
		proposalMutationInFlight = false;
		guidanceExpanded = false;
		aboutSurfaceOpen = false;
		listTab = 'all';
		itemSearchDraft = '';
		itemSearchApplied = '';
		workflowAggregates = null;
		workflowListTotal = 0;
		activeWorkflowListLoadId += 1;
		clearPostAcceptHighlight();
	}

	// Edit form (immutable: type, case_id, origin, created_*)
	let editTitle = '';
	let editDescription = '';
	let editStatus = '';
	let editPriority: number | null = null;
	let editSubmitting = false;

	$: if (caseId && token) {
		void loadP117WorkflowItems();
	}
	$: if (caseId && token) {
		itemSearchApplied;
		includeDeleted;
		isAdmin;
		void loadWorkflowListFirstPage();
		void loadProposalsFirstPage();
	}

	async function loadP117WorkflowItems(): Promise<void> {
		const myCase = caseId;
		const tok = token;
		if (!myCase || !tok) {
			p117WorkflowItems = [];
			return;
		}
		p117WorkflowLoading = true;
		try {
			p117WorkflowItems = await listCaseWorkflowItems(myCase, tok);
		} catch {
			p117WorkflowItems = [];
		} finally {
			p117WorkflowLoading = false;
		}
	}

	async function handleP117CreateSuccess(): Promise<void> {
		closeCreate();
		toast.success(P127_WORKFLOW_CREATE_SUCCESS_TOAST);
		await loadP117WorkflowItems();
	}

	async function loadWorkflowListFirstPage(): Promise<void> {
		if (!caseId || !token) {
			items = [];
			workflowAggregates = null;
			workflowListTotal = 0;
			workflowListHasMore = false;
			return;
		}
		activeWorkflowListLoadId += 1;
		const loadId = activeWorkflowListLoadId;
		loading = true;
		loadError = '';
		items = [];
		workflowListHasMore = false;
		const view = listTabToView(listTab);
		const q = itemSearchApplied.trim() || undefined;
		try {
			const [agg, page] = await Promise.all([
				getWorkflowListAggregates(caseId, token, { includeDeleted: isAdmin && includeDeleted }),
				listWorkflowItemsPaginated(caseId, token, {
					view,
					limit: WORKFLOW_LIST_PAGE,
					offset: 0,
					...(q ? { q } : {}),
					includeDeleted: isAdmin && includeDeleted
				})
			]);
			if (loadId !== activeWorkflowListLoadId) return;
			workflowAggregates = agg;
			items = page.workflow_items;
			workflowListTotal = page.total;
			workflowListHasMore = page.has_more;
			void refreshSupportLinkSummaries();
		} catch (e) {
			if (loadId !== activeWorkflowListLoadId) return;
			const msg = (e as Error)?.message ?? 'Failed to load workflow items';
			loadError = msg;
			items = [];
			workflowAggregates = null;
			workflowListTotal = 0;
			supportLinksByItemId = {};
			supportRowIndex = null;
		} finally {
			if (loadId === activeWorkflowListLoadId) loading = false;
		}
	}

	async function loadWorkflowListMore(): Promise<void> {
		if (!caseId || !token || !workflowListHasMore || workflowListLoadingMore || loading) return;
		const loadId = activeWorkflowListLoadId;
		workflowListLoadingMore = true;
		const view = listTabToView(listTab);
		const q = itemSearchApplied.trim() || undefined;
		const offset = items.length;
		try {
			const page = await listWorkflowItemsPaginated(caseId, token, {
				view,
				limit: WORKFLOW_LIST_PAGE,
				offset,
				...(q ? { q } : {}),
				includeDeleted: isAdmin && includeDeleted
			});
			if (loadId !== activeWorkflowListLoadId) return;
			const existing = new Set(items.map((i) => i.id));
			const fresh = page.workflow_items.filter((i) => !existing.has(i.id));
			items = [...items, ...fresh];
			workflowListTotal = page.total;
			workflowListHasMore = page.has_more;
			void refreshSupportLinkSummaries();
		} catch {
			/* keep current rows; user can refresh */
		} finally {
			if (loadId === activeWorkflowListLoadId) workflowListLoadingMore = false;
		}
	}

	function applyWorkflowItemSearch(): void {
		itemSearchApplied = itemSearchDraft.trim();
	}

	function refreshWorkflowSurface(): void {
		void loadWorkflowListFirstPage();
		void loadProposalsFirstPage();
		void loadP117WorkflowItems();
	}

	async function refreshSupportLinkSummaries() {
		if (!caseId || !token) {
			supportLinksByItemId = {};
			supportRowIndex = null;
			return;
		}
		activeSupportSummaryLoadId += 1;
		const sid = activeSupportSummaryLoadId;
		try {
			const index = await loadSupportLinkTargetIndex(caseId, token);
			if (sid !== activeSupportSummaryLoadId) return;
			supportRowIndex = index;
			const activeItems = items.filter((i) => !i.deleted_at);
			if (activeItems.length === 0) {
				supportLinksByItemId = {};
				return;
			}
			const lists = await Promise.all(
				activeItems.map((it) => listWorkflowSupportLinks(caseId, it.id, token))
			);
			if (sid !== activeSupportSummaryLoadId) return;
			const next: Record<string, WorkflowSupportLink[]> = {};
			activeItems.forEach((it, i) => {
				next[it.id] = lists[i] ?? [];
			});
			supportLinksByItemId = next;
		} catch {
			if (sid !== activeSupportSummaryLoadId) return;
			supportLinksByItemId = {};
			supportRowIndex = null;
		}
	}

	async function loadProposalsFirstPage() {
		if (!caseId || !token) {
			proposals = [];
			proposalStatusCounts = {};
			proposalListHasMore = false;
			return;
		}
		proposalPageGen += 1;
		const pg = proposalPageGen;
		proposalsLoading = true;
		proposalError = null;
		proposalListHasMore = false;
		try {
			const page = await listWorkflowProposalsPage(caseId, token, {
				limit: WORKFLOW_QUEUE_PROPOSALS_PAGE,
				offset: 0
			});
			if (pg !== proposalPageGen) return;
			proposals = page.workflow_proposals;
			proposalStatusCounts = page.status_counts ?? {};
			proposalListHasMore = page.has_more;
		} catch (e) {
			if (pg === proposalPageGen) {
				proposalError = (e as Error)?.message ?? 'Failed to load proposals';
				toast.error(proposalError);
				proposals = [];
				proposalStatusCounts = {};
			}
		} finally {
			if (pg === proposalPageGen) proposalsLoading = false;
		}
	}

	async function loadProposalsMore() {
		if (!caseId || !token || !proposalListHasMore || proposalListLoadingMore || proposalsLoading) return;
		proposalListLoadingMore = true;
		const pg = proposalPageGen;
		const baseLen = proposals.length;
		try {
			const page = await listWorkflowProposalsPage(caseId, token, {
				limit: WORKFLOW_QUEUE_PROPOSALS_PAGE,
				offset: baseLen
			});
			if (pg !== proposalPageGen) return;
			if (proposals.length !== baseLen) return;
			const existing = new Set(proposals.map((p) => p.id));
			const fresh = page.workflow_proposals.filter((p) => !existing.has(p.id));
			proposals = [...proposals, ...fresh];
			proposalStatusCounts = page.status_counts ?? proposalStatusCounts;
			proposalListHasMore = page.has_more;
		} catch {
			/* ignore */
		} finally {
			proposalListLoadingMore = false;
		}
	}

	function openCreate() {
		createFormKey += 1;
		createOpen = true;
	}

	function closeCreate() {
		createOpen = false;
	}

	function openEdit(item: WorkflowItem) {
		editItem = item;
		editTitle = item.title;
		editDescription = item.description ?? '';
		editStatus = item.status;
		editPriority = item.priority;
	}

	function closeEdit() {
		editItem = null;
	}

	let resolveInFlight = false;

	async function quickResolveItem(item: WorkflowItem): Promise<void> {
		if (resolveInFlight) return;
		if (item.deleted_at) return;
		const next = defaultResolveStatusForItem(item);
		if (!isValidStatusForType(String(item.type) as LocalType, next)) {
			toast.error('This item type cannot be resolved in one step from here. Use Edit to pick a status.');
			return;
		}
		resolveInFlight = true;
		try {
			await updateWorkflowItem(caseId, item.id, token, { status: next });
			toast.success('Workflow item updated');
			void loadWorkflowListFirstPage();
		} catch (e) {
			toast.error((e as Error)?.message ?? 'Update failed');
		} finally {
			resolveInFlight = false;
		}
	}

	async function submitEdit() {
		if (!editItem) return;
		const title = editTitle.trim();
		if (!title) {
			toast.error('Title is required');
			return;
		}
		editSubmitting = true;
		try {
			await updateWorkflowItem(caseId, editItem.id, token, {
				title,
				description: editDescription.trim() || undefined,
				status: editStatus,
				priority: editPriority ?? undefined
			});
			toast.success('Workflow item updated');
			closeEdit();
			void loadWorkflowListFirstPage();
		} catch (e) {
			toast.error((e as Error)?.message ?? 'Update failed');
		} finally {
			editSubmitting = false;
		}
	}

	function confirmDelete(item: WorkflowItem) {
		deleteTarget = item;
		showDeleteConfirm = true;
	}

	function cancelDelete() {
		showDeleteConfirm = false;
		deleteTarget = null;
	}

	async function doDelete() {
		if (!deleteTarget) return;
		const id = deleteTarget.id;
		deleteTarget = null;
		try {
			await deleteWorkflowItem(caseId, id, token);
			toast.success('Workflow item removed (soft delete). Restore available for admins.');
			void loadWorkflowListFirstPage();
		} catch (e) {
			toast.error((e as Error)?.message ?? 'Delete failed');
		}
	}

	function confirmRestore(item: WorkflowItem) {
		restoreTarget = item;
		showRestoreConfirm = true;
	}

	function cancelRestore() {
		showRestoreConfirm = false;
		restoreTarget = null;
	}

	async function doRestore() {
		if (!restoreTarget) return;
		const id = restoreTarget.id;
		restoreTarget = null;
		try {
			await restoreWorkflowItem(caseId, id, token);
			toast.success('Workflow item restored');
			void loadWorkflowListFirstPage();
		} catch (e) {
			toast.error((e as Error)?.message ?? 'Restore failed');
		}
	}

	$: editStatusOptions = editItem
		? getStatusesForType(editItem.type as LocalType)
		: [];

	function openEntityWorkspace(entity_type: string | null, entity_normalized_id: string | null) {
		if (!entity_type || !entity_normalized_id) return;
		entityWorkspaceType = entity_type;
		entityWorkspaceId = entity_normalized_id;
		showEntityWorkspace = true;
	}

	function closeEntityWorkspace() {
		showEntityWorkspace = false;
		entityWorkspaceType = null;
		entityWorkspaceId = null;
	}

	function proposalStatusBadgeClasses(status: string): string {
		const s = status.toUpperCase();
		if (s === 'PENDING') {
			return DS_BADGE_CLASSES.warning;
		}
		if (s === 'ACCEPTED') {
			return DS_BADGE_CLASSES.success;
		}
		// REJECTED or anything else
		return DS_BADGE_CLASSES.neutral;
	}

	function proposalTypeLabel(p: WorkflowProposal): string {
		return formatWorkflowProposalTypeForDisplay(p.proposal_type);
	}

	function proposedItemTypeDisplay(p: WorkflowProposal): string {
		const raw = p.suggested_payload?.type as string | undefined;
		if (raw !== undefined && raw !== null && String(raw).trim().length > 0) {
			return formatWorkflowItemTypeForDisplay(String(raw));
		}
		return proposalTypeLabel(p);
	}

	function hasWorkflowLink(p: WorkflowProposal): boolean {
		return !!p.workflow_item_id;
	}

	function openAccept(p: WorkflowProposal) {
		if (proposalMutationInFlight) return;
		acceptTarget = p;
		showAcceptConfirm = true;
	}

	function cancelAccept() {
		showAcceptConfirm = false;
		acceptTarget = null;
	}

	async function confirmAccept() {
		if (proposalMutationInFlight) return;
		if (!acceptTarget) return;
		proposalMutationInFlight = true;
		const target = acceptTarget;
		acceptTarget = null;
		try {
			const result = await acceptWorkflowProposal(caseId, target.id, token);
			const acceptedItemId = result.workflow_item?.id;
			const acceptedType = result.workflow_item?.type as LocalType | undefined;
			toast.success('Workflow suggestion accepted — planning item created.');
			await loadProposalsFirstPage();
			await loadWorkflowListFirstPage();
			if (acceptedItemId) {
				const notVisible =
					!items.some((i) => i.id === acceptedItemId) &&
					listTab !== 'all' &&
					listTab !== 'completed' &&
					acceptedType &&
					(acceptedType === 'HYPOTHESIS' ? listTab !== 'hypothesis' : acceptedType === 'GAP' ? listTab !== 'gap' : true);
				if (notVisible) {
					listTab = 'all';
					await loadWorkflowListFirstPage();
				}
				if (items.some((i) => i.id === acceptedItemId)) {
					await orientToWorkflowItemRow(acceptedItemId);
				}
			}
		} catch (e) {
			toast.error((e as Error)?.message ?? 'Accept failed');
			// Defensive refresh in case proposal was already resolved elsewhere.
			await loadProposalsFirstPage();
		} finally {
			proposalMutationInFlight = false;
		}
	}

	function openReject(p: WorkflowProposal) {
		if (proposalMutationInFlight) return;
		rejectTarget = p;
		rejectReason = '';
		showRejectConfirm = true;
	}

	function cancelReject() {
		showRejectConfirm = false;
		rejectTarget = null;
		rejectReason = '';
	}

	async function confirmReject() {
		if (proposalMutationInFlight) return;
		if (!rejectTarget) return;
		proposalMutationInFlight = true;
		const target = rejectTarget;
		rejectTarget = null;
		try {
			await rejectWorkflowProposal(caseId, target.id, token, rejectReason);
			toast.success('Workflow suggestion rejected.');
			await loadProposalsFirstPage();
		} catch (e) {
			toast.error((e as Error)?.message ?? 'Reject failed');
			// Defensive refresh in case proposal was already resolved elsewhere.
			await loadProposalsFirstPage();
		} finally {
			proposalMutationInFlight = false;
		}
	}

	// P59-08: Case Tools embedded density for deep-link chips (presentation only).
	$: workflowEmbedNavLinkClass =
		`${DS_WORKFLOW_CLASSES.embedNavLink} ${embedded ? DS_WORKFLOW_CLASSES.embedNavLinkCompact : ''}`.trim();
</script>

<!-- P59-15: vertical stack + root scroll — avoid flex-1 on lower siblings’ predecessor (main) stealing height and overflowing onto proposals -->
<div
	data-workflow-layout={embedded ? 'embedded' : 'full'}
	class="{DS_WORKFLOW_CLASSES.workspace} {embedded
		? DS_WORKFLOW_CLASSES.workspaceEmbedded
		: DS_WORKFLOW_CLASSES.workspaceFull}"
>
	<header
		class="shrink-0 border-b border-[color:var(--ce-l-border-default)] bg-[color:var(--ce-l-surface-elevated)] {embedded
			? 'px-2 py-2'
			: 'px-3 py-3 sm:px-4'}"
		data-testid="workflow-page-header"
		aria-labelledby="workflow-dash-title"
	>
		<div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
			<div class="min-w-0 flex-1">
				<div class="flex items-start gap-2">
					<ClipboardDocumentListIcon
						class="h-6 w-6 shrink-0 text-[color:var(--ce-l-text-muted)] sm:h-7"
						aria-hidden="true"
					/>
					<div class="min-w-0">
						<h2
							id="workflow-dash-title"
							class="m-0 text-lg font-semibold leading-snug tracking-tight text-[color:var(--ce-l-text-primary)] sm:text-xl"
						>
							{WORKFLOW_DASH_TITLE}
						</h2>
						<p
							class="m-0 mt-1 max-w-3xl text-xs leading-relaxed text-[color:var(--ce-l-text-muted)] sm:text-sm"
						>
							{WORKFLOW_DASH_SUBTITLE}
						</p>
					</div>
				</div>
			</div>
			<div
				class="flex flex-shrink-0 flex-wrap items-center justify-end gap-2 self-start sm:pt-0.5"
				data-testid="workflow-header-actions"
			>
				<details
					class="relative max-w-md rounded border border-[color:var(--ce-l-border-subtle)] bg-[color:var(--ce-l-surface-raised)] text-left"
					bind:open={aboutSurfaceOpen}
					data-testid="workflow-about-surface"
				>
					<summary
						class="cursor-pointer list-none px-2.5 py-1.5 text-xs font-medium {DS_TYPE_CLASSES.body} text-[color:var(--ce-l-text-primary)] [&::-webkit-details-marker]:hidden"
					>
						About this surface
					</summary>
					<div
						class="border-t border-[color:var(--ce-l-border-subtle)] px-2.5 py-2 text-[11px] leading-relaxed {DS_TYPE_CLASSES.meta} space-y-2 max-w-prose"
					>
						<p class="m-0 text-xs font-semibold {DS_TYPE_CLASSES.body} text-[color:var(--ce-l-text-primary)]">
							{P127_WORKFLOW_SURFACE_TITLE}
						</p>
						<p class="m-0">{P127_WORKFLOW_FRAMING_BODY_PRIMARY}</p>
						<p class="m-0">{P127_WORKFLOW_FRAMING_BODY_SECONDARY}</p>
						<p class="m-0">{P127_WORKFLOW_FRAMING_BODY_TERTIARY}</p>
					</div>
				</details>
				<button
					type="button"
					class="{DS_WORKFLOW_CLASSES.createToolbarBtn} !text-xs"
					on:click={openCreate}
					data-testid="workflow-p127-create-open"
				>
					Create workflow item
				</button>
			</div>
		</div>
	</header>
	{#if !embedded}
		<p
			data-testid="workflow-narrative-intro"
			class="sr-only"
			aria-hidden="true"
		>
			<span class="{DS_WORKFLOW_TEXT_CLASSES.doctrineEmphasis}">Workflow is your</span> planning layer.
			It is <span class="{DS_WORKFLOW_TEXT_CLASSES.doctrineEmphasis}">not</span> the official case record.
			The case <span class="{DS_WORKFLOW_TEXT_CLASSES.doctrineStrong}">Proposals</span> tab holds governed drafts.
			When intake suggests a new or changed workflow item, it appears in this queue on the Workflow tab.
			this queue is not the case Proposals tab.
		</p>
	{/if}

	<section
		data-testid="workflow-attention-region"
		class="shrink-0 {embedded ? 'px-2 py-2' : 'px-3 py-3 sm:px-4'}"
		aria-label="Workflow status summary"
		data-summary-dashboard="true"
	>
		<div
			data-testid="workflow-attention-signals"
			class="grid {embedded
				? 'grid-cols-1 gap-2 sm:grid-cols-2'
				: 'grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4'}"
		>
			<div
				class="rounded-xl border border-amber-500/35 bg-amber-500/[0.07] p-4 min-h-[7.5rem] flex flex-col justify-between shadow-sm {DS_PROPOSALS_CLASSES.statusSummaryBody}"
			>
				<div class="text-[11px] font-semibold uppercase tracking-wide text-amber-200/90">Pending Review</div>
				<div
					class="mt-1 text-3xl font-bold tabular-nums tracking-tight {DS_TYPE_CLASSES.section} sm:text-4xl"
					data-testid="workflow-attention-pending-count"
					>{proposalCount}</div
				>
				<p class="mt-2 m-0 text-[11px] leading-snug {DS_TYPE_CLASSES.meta}">Items waiting in workflow proposal queue</p>
			</div>
			<div
				class="rounded-xl border border-sky-500/30 bg-sky-500/[0.07] p-4 min-h-[7.5rem] flex flex-col justify-between shadow-sm {DS_PROPOSALS_CLASSES.statusSummaryBody}"
			>
				<div class="text-[11px] font-semibold uppercase tracking-wide text-sky-200/90">Open Items</div>
				<div
					class="mt-1 text-3xl font-bold tabular-nums tracking-tight {DS_TYPE_CLASSES.section} sm:text-4xl"
					data-testid="workflow-attention-open-count"
					>{countOpen}</div
				>
				<p class="mt-2 m-0 text-[11px] leading-snug {DS_TYPE_CLASSES.meta}">Active workflow items needing attention</p>
			</div>
			<div
				class="rounded-xl border border-emerald-500/30 bg-emerald-500/[0.07] p-4 min-h-[7.5rem] flex flex-col justify-between shadow-sm {DS_PROPOSALS_CLASSES.statusSummaryBody}"
			>
				<div class="text-[11px] font-semibold uppercase tracking-wide text-emerald-200/90">Completed</div>
				<div class="mt-1 text-3xl font-bold tabular-nums tracking-tight {DS_TYPE_CLASSES.section} sm:text-4xl">
					{countDone}
				</div>
				<p class="mt-2 m-0 text-[11px] leading-snug {DS_TYPE_CLASSES.meta}">Completed and resolved workflow items</p>
			</div>
			<div
				class="rounded-xl border border-violet-500/35 bg-violet-500/[0.08] p-4 min-h-[7.5rem] flex flex-col justify-between shadow-sm {DS_PROPOSALS_CLASSES.statusSummaryBody}"
			>
				<div class="text-[11px] font-semibold uppercase tracking-wide text-violet-200/90">Gaps / Hypotheses</div>
				<div class="mt-1 text-3xl font-bold tabular-nums tracking-tight {DS_TYPE_CLASSES.section} sm:text-4xl">
					{countGapsHyp}
				</div>
				<p class="mt-2 m-0 text-[11px] leading-snug {DS_TYPE_CLASSES.meta}">Planning items identifying gaps or hypotheses</p>
			</div>
		</div>
		<span class="sr-only" data-testid="workflow-attention-listed-count" aria-hidden="true"
			>Showing {items.length} of {workflowListTotal} matches in this list view (scroll to load more)</span
		>
		{#if loadError}
			<div
				class="mt-2 text-[11px] {DS_STATUS_TEXT_CLASSES.danger}"
				data-testid="workflow-attention-list-error"
			>list unavailable</div>
		{:else if loading}
			<p class="mt-2 text-[11px] {DS_TYPE_CLASSES.meta}" data-testid="workflow-attention-list-loading">Loading workflow items…</p>
		{/if}
		{#if isAdmin && includeDeleted}
			<span class="sr-only" data-testid="workflow-attention-includes-deleted" aria-hidden="true">includes deleted</span>
		{/if}
	</section>

	<section
		data-testid="workflow-authority-banner"
		class="shrink-0 border-b border-[color:var(--ce-l-border-subtle)] bg-[color:var(--ce-l-surface-raised)]/90 {embedded
			? 'px-2 py-2'
			: 'px-3 py-2.5 sm:px-4'}"
		aria-label="Workflow planning authority"
	>
		<p
			class="m-0 max-w-4xl text-xs leading-relaxed {DS_TYPE_CLASSES.body} text-[color:var(--ce-l-text-secondary)] sm:text-[13px]"
		>
			{WORKFLOW_AUTHORITY_BANNER}
		</p>
	</section>

	<div
		class="flex w-full min-w-0 flex-nowrap items-stretch gap-0 overflow-x-auto border-b border-[color:var(--ce-l-border-subtle)] bg-[color:var(--ce-l-surface-elevated)] {embedded
			? 'px-2'
			: 'px-3 sm:px-4'}"
		role="tablist"
		aria-label="Workflow list filters"
		data-testid="workflow-list-tabs"
	>
		<button
			type="button"
			role="tab"
			aria-selected={listTab === 'all'}
			class="shrink-0 border-b-2 px-2.5 py-3 text-left text-sm font-semibold sm:px-4 {listTab === 'all'
				? 'border-[color:var(--ce-l-text-primary)] text-[color:var(--ce-l-text-primary)]'
				: 'border-transparent text-[color:var(--ce-l-text-muted)] hover:text-[color:var(--ce-l-text-primary)]'}"
			data-testid="workflow-tab-all"
			on:click={() => {
				listTab = 'all';
				void loadWorkflowListFirstPage();
			}}
		>
			All Items{listTabBadgeCount('all') ? ` (${listTabBadgeCount('all')})` : ''}
		</button>
		<button
			type="button"
			role="tab"
			aria-selected={listTab === 'hypothesis'}
			class="shrink-0 border-b-2 px-2.5 py-3 text-left text-sm font-semibold sm:px-4 {listTab === 'hypothesis'
				? 'border-[color:var(--ce-l-text-primary)] text-[color:var(--ce-l-text-primary)]'
				: 'border-transparent text-[color:var(--ce-l-text-muted)] hover:text-[color:var(--ce-l-text-primary)]'}"
			data-testid="workflow-tab-hypothesis"
			on:click={() => {
				listTab = 'hypothesis';
				void loadWorkflowListFirstPage();
			}}
		>
			Hypotheses{listTabBadgeCount('hypothesis') ? ` (${listTabBadgeCount('hypothesis')})` : ''}
		</button>
		<button
			type="button"
			role="tab"
			aria-selected={listTab === 'gap'}
			class="shrink-0 border-b-2 px-2.5 py-3 text-left text-sm font-semibold sm:px-4 {listTab === 'gap'
				? 'border-[color:var(--ce-l-text-primary)] text-[color:var(--ce-l-text-primary)]'
				: 'border-transparent text-[color:var(--ce-l-text-muted)] hover:text-[color:var(--ce-l-text-primary)]'}"
			data-testid="workflow-tab-gap"
			on:click={() => {
				listTab = 'gap';
				void loadWorkflowListFirstPage();
			}}
		>
			Gaps{listTabBadgeCount('gap') ? ` (${listTabBadgeCount('gap')})` : ''}
		</button>
		<button
			type="button"
			role="tab"
			aria-selected={listTab === 'completed'}
			class="shrink-0 border-b-2 px-2.5 py-3 text-left text-sm font-semibold sm:px-4 {listTab === 'completed'
				? 'border-[color:var(--ce-l-text-primary)] text-[color:var(--ce-l-text-primary)]'
				: 'border-transparent text-[color:var(--ce-l-text-muted)] hover:text-[color:var(--ce-l-text-primary)]'}"
			data-testid="workflow-tab-completed"
			on:click={() => {
				listTab = 'completed';
				void loadWorkflowListFirstPage();
			}}
		>
			Completed{listTabBadgeCount('completed') ? ` (${listTabBadgeCount('completed')})` : ''}
		</button>
	</div>

	<div
		data-testid="workflow-items-toolbar"
		class="flex min-w-0 flex-col gap-2 border-b border-[color:var(--ce-l-border-subtle)] bg-[color:var(--ce-l-surface-base)]/40 {embedded
			? 'px-2 py-2'
			: 'px-3 py-2 sm:px-4'}"
		aria-label="Filter and search workflow items"
	>
		<div
			data-testid="workflow-filter-cluster"
			class="flex w-full min-w-0 flex-col gap-2 sm:flex-row sm:items-end sm:justify-between"
		>
			<div class="flex min-w-0 flex-1 flex-col gap-1.5 sm:flex-row sm:items-end sm:gap-3">
				<div class="min-w-0 sm:w-44">
					<label for="workflow-type-sel" class="mb-0.5 block text-[10px] font-semibold uppercase {DS_TYPE_CLASSES.label}"
						>Type</label
					>
					<select
						id="workflow-type-sel"
						class="w-full {DS_PROPOSALS_CLASSES.formControl} h-9 text-[11px]"
						data-testid="workflow-type-select"
						value={listTab}
						on:change={(e) => {
							const v = (e.currentTarget as HTMLSelectElement).value;
							if (v === 'all' || v === 'hypothesis' || v === 'gap' || v === 'completed') {
								listTab = v;
								void loadWorkflowListFirstPage();
							}
						}}
					>
						<option value="all">All Items</option>
						<option value="hypothesis">Hypotheses</option>
						<option value="gap">Gaps</option>
						<option value="completed">Completed</option>
					</select>
				</div>
				<div class="min-w-0 flex-1">
					<label
						for="workflow-item-search"
						class="mb-0.5 block text-[10px] font-semibold uppercase {DS_TYPE_CLASSES.label}">Search</label
					>
					<div class="flex min-w-0 flex-wrap items-stretch gap-1.5">
						<input
							id="workflow-item-search"
							type="search"
							placeholder="Search workflow items…"
							class="min-w-0 flex-1 {DS_PROPOSALS_CLASSES.formControl} h-9 text-[11px]"
							bind:value={itemSearchDraft}
							data-testid="workflow-item-search-input"
							on:keydown={(e) => e.key === 'Enter' && applyWorkflowItemSearch()}
						/>
						<button
							type="button"
							class="{DS_BTN_CLASSES.primary} h-9 shrink-0 px-3 text-xs"
							data-testid="workflow-item-search-submit"
							on:click={() => applyWorkflowItemSearch()}>Search</button
						>
					</div>
				</div>
			</div>
			<div class="flex items-center justify-end gap-2">
				{#if isAdmin}
					<label
						class="flex items-center gap-1.5 text-xs {DS_TYPE_CLASSES.body} whitespace-nowrap"
						data-testid="workflow-include-deleted"
					>
						<input type="checkbox" bind:checked={includeDeleted}  />
						Include deleted
					</label>
				{/if}
				<button
					type="button"
					class="{DS_BTN_CLASSES.ghost} h-9 shrink-0 px-2.5 text-xs"
					data-testid="workflow-refresh-surface"
					on:click={() => refreshWorkflowSurface()}>Refresh</button
				>
			</div>
		</div>
		{#if itemSearchApplied}
			<p class="m-0 text-[10px] {DS_TYPE_CLASSES.meta}" data-testid="workflow-search-active-hint">Filtering by “{itemSearchApplied}”</p>
		{/if}
	</div>

	<section
		data-testid="workflow-main-work-area"
		class="flex flex-col min-w-0 shrink-0 {embedded ? 'gap-2' : 'gap-3'}"
		aria-label="Workflow main workspace"
	>
	<!-- List (hypotheses / gaps) -->
	<!-- shrink-0: do not use min-h-0 here — in a column flex (main) it lets this region shrink below the table, overflow: visible paints rows under the proposals panel -->
	<section data-testid="workflow-items-list-section" class="min-w-0 flex flex-col shrink-0" aria-label="Workflow items list">

	<!-- ── List state (P28-50: aligned to shared state components); P59-07 shell cohesion ── -->
	{#if workflowListViewState === 'loading'}
		<div
			data-testid="workflow-items-list-state-shell"
			class="{DS_WORKFLOW_CLASSES.listStateShell} overflow-hidden {embedded
				? 'p-2'
				: 'p-3'}"
		>
			<CaseLoadingState label="Loading workflow items…" testId="workflow-items-list-loading" />
		</div>
	{:else if workflowListViewState === 'error'}
		<div
			data-testid="workflow-items-list-state-shell"
			class="{DS_WORKFLOW_CLASSES.listStateShell} overflow-hidden {embedded
				? 'p-2'
				: 'p-3'}"
		>
			<CaseErrorState message={loadError} onRetry={loadWorkflowListFirstPage} />
		</div>
	{:else if workflowListViewState === 'empty'}
		<div
			data-testid="workflow-items-list-state-shell"
			class="{DS_WORKFLOW_CLASSES.listStateShell} {DS_WORKFLOW_CLASSES.listStateShellDashed} {embedded
				? 'p-2'
				: 'p-3'}"
		>
			<CaseEmptyState
				framed={false}
				testId="workflow-items-list-empty"
				title={listTab === 'hypothesis' ? 'No hypotheses yet.' : listTab === 'gap' ? 'No gaps yet.' : listTab === 'completed' ? 'No completed items in this view.' : 'No workflow items yet.'}
				description={listTab === 'hypothesis'
					? 'Capture what you are testing—Workflow plans the line of inquiry; official facts still go through Timeline after governed intake.'
					: listTab === 'gap'
						? 'Capture what evidence or facts you still need. Closing a gap may later tie to Timeline entries via the case Proposals tab—not directly from here.'
					: listTab === 'completed'
						? 'Nothing has reached a closed or resolved state in the planning layer yet, or your search is too narrow.'
						: 'Add hypotheses and gaps to steer the case. Use the case Proposals tab when you have governed timeline or note drafts to review and commit.'}
			>
				<div
					slot="action"
					class="mt-3 flex flex-col gap-2"
					data-testid="workflow-items-empty-next-steps"
				>
					<p
						class="{DS_TYPE_CLASSES.meta} text-[color:var(--ce-l-text-secondary)]"
						data-testid="workflow-items-empty-p127-manual-only"
					>
						{P127_WORKFLOW_EMPTY_MANUAL_CREATION_LINE}
					</p>
					<p class="{DS_TYPE_CLASSES.meta} text-[color:var(--ce-l-text-secondary)]">
						Next steps on this case: open Proposals for governed drafts, Timeline for the official record, or Notes for
						working notes.
					</p>
					<div
						class="flex flex-wrap items-center gap-x-2 gap-y-1 {embedded ? 'text-[11px]' : 'text-xs'}"
						role="group"
						aria-label="Case tab shortcuts"
					>
						<a
							data-testid="workflow-items-empty-link-proposals"
							href="/case/{caseId}/proposals"
							class={workflowEmbedNavLinkClass}
							title={`${CASE_DESTINATION_TITLES.caseProposals} — separate from the Workflow proposal queue on this tab`}
							>{CASE_DESTINATION_LABELS.caseProposals}</a
						>
						<span class="{DS_TYPE_CLASSES.meta} text-[color:var(--ce-l-text-muted)] select-none" aria-hidden="true"
							>·</span
						>
						<a
							data-testid="workflow-items-empty-link-timeline"
							href="/case/{caseId}/timeline"
							class={workflowEmbedNavLinkClass}
							title={CASE_DESTINATION_TITLES.timeline}
							>{CASE_DESTINATION_LABELS.timeline}</a
						>
						<span class="{DS_TYPE_CLASSES.meta} text-[color:var(--ce-l-text-muted)] select-none" aria-hidden="true"
							>·</span
						>
						<a
							data-testid="workflow-items-empty-link-notes"
							href="/case/{caseId}/notes"
							class={workflowEmbedNavLinkClass}
							title={CASE_DESTINATION_TITLES.notes}
							>{CASE_DESTINATION_LABELS.notes}</a
						>
					</div>
				</div>
			</CaseEmptyState>
		</div>
{:else}
		<div
			bind:this={workflowTableScrollEl}
			data-testid="workflow-items-table-scroll"
			class="min-w-0 divide-y divide-[color:var(--ce-l-border-subtle)] overflow-y-auto overflow-x-hidden rounded-xl border border-[color:var(--ce-l-border-subtle)] bg-[color:var(--ce-l-surface-base)]/30 {embedded
				? 'max-h-[min(46vh,14.5rem)]'
				: 'min-h-[14rem] max-h-[min(50vh,36rem)]'}"
		>
			{#each items as item (item.id)}
				<article
					data-workflow-item-row={item.id}
					data-testid={`workflow-item-row-${item.id}`}
					data-post-accept-highlight={item.id === highlightWorkflowItemId ? 'true' : 'false'}
					class="p-3.5 sm:p-4 transition-colors duration-300 first:rounded-t-xl last:rounded-b-xl {item.deleted_at
						? 'opacity-70'
						: ''} {item.id === highlightWorkflowItemId ? 'ring-2 ring-inset ring-amber-500/45 bg-[color:var(--ce-l-surface-raised)]' : 'bg-[color:var(--ce-l-surface-raised)]/90'}"
				>
					<div class="flex min-w-0 gap-3.5">
						<div
							class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[color:var(--ce-l-border-subtle)] bg-[color:var(--ds-bg-muted)] text-[color:var(--ce-l-text-primary)] shadow-inner"
							aria-hidden="true"
						>
							{#if String(item.type).toUpperCase() === 'GAP'}
								<PuzzlePieceIcon class="h-5 w-5" />
							{:else if String(item.type).toUpperCase() === 'HYPOTHESIS'}
								<LightBulbIcon class="h-5 w-5" />
							{:else}
								<DocumentTextIcon class="h-5 w-5" />
							{/if}
						</div>
						<div class="min-w-0 flex-1">
							<div class="flex flex-wrap items-center gap-1.5">
								<span class="shrink-0 text-[10px] font-semibold uppercase {DS_BADGE_CLASSES.neutral}">
									{formatWorkflowItemTypeForDisplay(item.type)}
								</span>
								{#if item.deleted_at}
									<span class="text-[10px] {DS_STATUS_TEXT_CLASSES.warning}">(deleted)</span>
								{/if}
							</div>
							<div class="mt-0.5 flex min-w-0 items-start justify-between gap-2">
								<h4
									class="min-w-0 flex-1 break-words pr-1 text-base font-semibold text-[color:var(--ce-l-text-primary)] m-0 leading-snug"
								>
									{item.title}
								</h4>
								<div class="flex max-w-[min(100%,28rem)] shrink-0 flex-wrap items-center justify-end gap-x-2 gap-y-1">
									{#if !item.deleted_at}
										<a
											href="/case/{caseId}/workflow/witem/{item.id}"
											class="text-xs whitespace-nowrap {DS_WORKFLOW_CLASSES.inlineAction}"
											data-testid={`workflow-item-view-${item.id}`}
										>
											View
										</a>
										<button
											type="button"
											data-testid="workflow-item-support-refs"
											data-item-id={item.id}
											class="text-xs whitespace-nowrap {DS_WORKFLOW_CLASSES.inlineAction}"
											on:click={() => (supportPanelItem = item)}
										>
											Support refs
										</button>
										<button
											type="button"
											class="text-xs whitespace-nowrap {DS_WORKFLOW_CLASSES.inlineAction}"
											data-testid={`workflow-item-edit-${item.id}`}
											on:click={() => openEdit(item)}
										>
											Edit
										</button>
										{#if isWorkflowItemOpenActiveStatus(item.status) || String(item.status).toUpperCase() === 'IN_PROGRESS' || String(item.status).toUpperCase() === 'ASSIGNED'}
											<button
												type="button"
												class="inline-flex items-center justify-center rounded-md border border-emerald-600/60 bg-emerald-600/90 px-2.5 py-1 text-xs font-semibold text-white shadow-sm hover:bg-emerald-500/95 disabled:opacity-50"
												disabled={resolveInFlight}
												data-testid={`workflow-item-resolve-${item.id}`}
												on:click={() => void quickResolveItem(item)}
											>
												Resolve
											</button>
										{/if}
										<button
											type="button"
											class="text-xs whitespace-nowrap {DS_WORKFLOW_CLASSES.inlineAction} {DS_WORKFLOW_CLASSES.inlineActionDanger}"
											data-testid={`workflow-item-delete-${item.id}`}
											on:click={() => confirmDelete(item)}
										>
											Delete
										</button>
									{:else if isAdmin}
										<button
											type="button"
											class="text-xs whitespace-nowrap {DS_WORKFLOW_CLASSES.inlineAction} {DS_WORKFLOW_CLASSES.inlineActionSuccess}"
											on:click={() => confirmRestore(item)}
										>
											Restore
										</button>
									{/if}
									{#if !item.deleted_at}
										<button
											type="button"
											class="h-7 w-7 shrink-0 rounded text-[color:var(--ce-l-text-muted)] opacity-50"
											disabled
											title="More actions (coming soon)"
											aria-label="More actions (coming soon)"
											data-testid={`workflow-item-kebab-${item.id}`}
										>
											⋯
										</button>
									{/if}
								</div>
							</div>
							{#if item.description}
								<p class="mt-1 m-0 break-words text-xs leading-relaxed {DS_TYPE_CLASSES.meta}">{item.description}</p>
							{/if}
							{#if item.entity_type && item.entity_normalized_id}
								<button
									type="button"
									class="mt-1 text-xs {DS_WORKFLOW_CLASSES.inlineAction}"
									on:click={() => openEntityWorkspace(item.entity_type, item.entity_normalized_id)}
								>
									Entity: {item.entity_type} / {item.entity_normalized_id}
								</button>
							{/if}
							<div class="mt-1.5 flex flex-wrap gap-x-2 gap-y-0.5 text-[10px] {DS_TYPE_CLASSES.meta}">
								<span class="tabular-nums">Created {item.created_at?.slice(0, 10) ?? '—'}</span>
							</div>
							<div class="mt-2 flex min-w-0 items-end justify-between gap-x-3 gap-y-1.5">
								<div class="min-w-0 flex-1">
									{#if !item.deleted_at && (supportRowIndex && (supportLinksByItemId[item.id]?.length ?? 0) > 0)}
										<div
											class="flex flex-wrap gap-1"
											data-testid={`workflow-item-support-link-chips-${item.id}`}
										>
											{#each supportLinksByItemId[item.id] as sl (sl.id)}
												<a
													data-testid={`workflow-support-link-row-chip-${sl.id}`}
													href={hrefForSupportLinkTarget(caseId, sl.target_kind, sl.target_id)}
													class="{DS_WORKFLOW_CLASSES.supportRowChip} max-w-full"
													title={primaryLabelForSupportLink(sl, supportRowIndex)}
												>
													<span
														class="shrink-0 {supportLinkKindBadgeClass[sl.target_kind]}"
														data-testid={`workflow-support-link-chip-kind-${sl.target_kind}`}
													>
														{supportLinkKindShortLabel[sl.target_kind]}
													</span>
													<span class="truncate min-w-0 text-[10px] font-medium">
														{primaryLabelForSupportLink(sl, supportRowIndex)}
													</span>
												</a>
											{/each}
										</div>
									{:else if !item.deleted_at && supportRowIndex}
										<div class="text-[10px] {DS_TYPE_CLASSES.meta}" data-testid="workflow-item-support-links-none">—</div>
									{:else if !item.deleted_at}
										<div class="text-[10px] {DS_TYPE_CLASSES.meta}">…</div>
									{/if}
								</div>
								<div
									class="flex shrink-0 flex-wrap items-center justify-end gap-1.5 self-end"
									aria-label="Item status, rank, and origin"
								>
									<span class={getStatusBadgeClasses(item.status)}>{formatWorkflowStatusForDisplay(item.status)}</span>
									{#if item.priority != null}
										<span class="shrink-0 text-[10px] {DS_BADGE_CLASSES.neutral}"
											>{P127_WORKFLOW_LEGACY_RANK_CELL_PREFIX} {item.priority}</span
										>
									{/if}
									<span class="shrink-0 text-[10px] {getOriginBadgeClasses(item.origin)}"
										>{formatWorkflowOriginForDisplay(item.origin)}</span
									>
									{#if item.citations?.length}
										<span class="text-[10px] {DS_TYPE_CLASSES.meta}">{item.citations.length} citation(s)</span>
									{/if}
								</div>
							</div>
						</div>
					</div>
				</article>
			{/each}
			<div
				bind:this={workflowTableSentinel}
				data-testid="workflow-items-scroll-sentinel"
				class="h-px w-full shrink-0"
				aria-hidden="true"
			></div>
			{#if workflowListLoadingMore}
				<p class="m-0 py-1 text-center text-[10px] {DS_TYPE_CLASSES.meta}" data-testid="workflow-items-load-more">
					Loading more…
				</p>
			{/if}
		</div>
	{/if}
	</section>

	<section
		class="min-w-0 shrink-0 border-b border-[color:var(--ce-l-border-subtle)] bg-[color:var(--ce-l-surface-raised)]/40 px-3 py-3 sm:px-4 {embedded ? 'p-2' : ''}"
		data-testid="workflow-p127-operational-items-section"
		aria-label={P127_WORKFLOW_LIST_SECTION_TITLE}
	>
		<h3 class="text-sm font-semibold text-[color:var(--ce-l-text-primary)] m-0 mb-2">
			{P127_WORKFLOW_LIST_SECTION_TITLE}
		</h3>
		{#if p117WorkflowLoading}
			<p class="text-sm text-[color:var(--ce-l-text-secondary)] m-0" data-testid="workflow-p117-items-loading">
				{P127_WORKFLOW_LIST_LOADING}
			</p>
		{:else if p117WorkflowItems.length === 0}
			<p class="text-sm text-[color:var(--ce-l-text-secondary)] m-0" data-testid="workflow-p117-items-empty">
				{P127_WORKFLOW_LIST_EMPTY}
			</p>
			<p class="text-xs text-[color:var(--ce-l-text-muted)] m-0 mt-1" data-testid="workflow-p117-items-empty-hint">
				{P127_WORKFLOW_LIST_EMPTY_HINT}
			</p>
		{:else}
			<ul class="flex flex-col gap-2 list-none p-0 m-0" data-testid="workflow-p117-items-list">
				{#each p117WorkflowItems as w (w.workflow_item_id)}
					<li
						class="rounded-xl border border-[color:var(--ce-l-border-subtle)] bg-[color:var(--ce-l-surface-raised)] px-3 py-2.5 text-sm text-[color:var(--ce-l-text-primary)] shadow-sm"
						data-testid="workflow-p117-items-row"
						data-workflow-p117-id={w.workflow_item_id}
					>
						<div class="flex flex-col gap-1">
							<div class="flex flex-wrap items-baseline gap-x-3 gap-y-1">
								<span
									class="text-xs text-[color:var(--ce-l-text-muted)]"
									data-testid="workflow-p117-items-row-type"
									>{p127LabelWorkflowType(w.workflow_type)}</span>
								<a
									class="font-medium text-[color:var(--ce-l-text-primary)] hover:underline"
									href={`/case/${encodeURIComponent(caseId)}/workflow/witem/${encodeURIComponent(w.workflow_item_id)}`}
									data-testid="workflow-p117-items-row-title-link"
									>{w.title}</a>
								<span
									class="text-xs text-[color:var(--ce-l-text-muted)]"
									data-testid="workflow-p117-items-row-status"
									>{p127LabelWorkflowStatus(w.status)}</span>
							</div>
							{#if w.updated_at}
								<p class="text-xs text-[color:var(--ce-l-text-muted)] m-0" data-testid="workflow-p117-items-row-updated">
									{P127_WORKFLOW_DETAIL_META_UPDATED}{' '}{w.updated_at}
								</p>
							{/if}
						</div>
					</li>
				{/each}
			</ul>
		{/if}
	</section>

	{#if supportPanelItem}
		<div data-testid="workflow-support-links-dock" class="min-w-0 shrink-0">
			<WorkflowItemSupportLinksPanel
				{caseId}
				{token}
				item={supportPanelItem}
				{embedded}
				on:close={() => (supportPanelItem = null)}
				on:updated={refreshSupportLinkSummaries}
			/>
		</div>
	{/if}
	</section>

	<!-- P59-13: proposal queue is a standalone section (sibling of main work area + guidance), not nested inside main—avoids shared flex/stacking with footer strip -->
	<!-- P59-14: shadow + intro separator + fuller bottom padding so the queue reads as a closed block before the guidance footer -->
	<section
		data-testid="workflow-proposals-panel"
		class="{DS_WORKFLOW_CLASSES.proposalsPanel} min-w-0 shrink-0 {embedded
			? 'mt-3 p-2.5 pb-2.5'
			: 'mt-5 p-4 pb-4'}"
		aria-label={P127_WORKFLOW_PROPOSAL_QUEUE_ARIA}
	>
			<div
				class="flex flex-wrap items-start justify-between gap-2 border-b border-[var(--ds-border-default)] pb-3 {embedded ? 'mb-1.5' : 'mb-2.5'}"
			>
				<div class="min-w-0 flex-1 space-y-0.5">
					<h3 class="m-0 text-sm font-semibold {DS_TYPE_CLASSES.section}">Workflow proposal queue</h3>
					<p class="m-0 max-w-prose text-xs leading-relaxed {DS_TYPE_CLASSES.meta}" data-testid="workflow-proposal-queue-intro">
						Pending triage for workflow proposals on this tab only. Items here are not yet part of the Workflow list.
					</p>
				</div>
				<a
					href="/case/{caseId}/proposals"
					class="{workflowEmbedNavLinkClass} text-xs font-medium"
					data-testid="workflow-proposal-queue-link-proposals"
					title="Case Proposals—separate from this workflow queue"
				>Go to Proposals</a>
			</div>
			{#snippet workflowProposalRow(p)}
				<div class="p-2 text-sm min-w-0">
					<div class="flex flex-wrap items-center gap-x-2 gap-y-1 justify-between min-w-0">
						<div class="flex flex-wrap items-center gap-2 min-w-0">
							<span class="shrink-0 {DS_BADGE_CLASSES.neutral}">
								{proposalTypeLabel(p)}
							</span>
							<span class="shrink-0 {proposalStatusBadgeClasses(p.status)}">
								{formatWorkflowStatusForDisplay(p.status)}
							</span>
						</div>
						<span class="shrink-0 tabular-nums text-xs sm:ml-auto {DS_TYPE_CLASSES.meta}">
							{p.created_at?.slice?.(0, 19) ?? p.created_at}
						</span>
					</div>
					<div class="mt-1 min-w-0 break-words font-medium {DS_TYPE_CLASSES.body}">
						{p.suggested_payload?.title ?? '(no title)'}
					</div>
					{#if p.suggested_payload?.description}
						<div class="mt-0.5 line-clamp-2 break-words text-xs {DS_TYPE_CLASSES.meta}">
							{p.suggested_payload.description}
						</div>
					{/if}
					<div class="mt-1 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs {DS_TYPE_CLASSES.meta}">
						<span class="break-words">Type: {proposedItemTypeDisplay(p)}</span>
						{#if p.suggested_payload?.priority != null}
							<span class="shrink-0">{P127_WORKFLOW_PROPOSAL_RANK_LABEL}: {p.suggested_payload.priority}</span>
						{/if}
						{#if p.citations?.length}
							<span class="shrink-0">{p.citations.length} citation(s)</span>
						{/if}
						{#if p.suggested_payload?.entity_type && p.suggested_payload?.entity_normalized_id}
							<span class="break-words min-w-0">
								Entity: {p.suggested_payload.entity_type} / {p.suggested_payload.entity_normalized_id}
							</span>
						{/if}
					</div>
					{#if p.suggested_payload?.description || p.citations?.length}
						<button
							type="button"
							class="mt-1 text-xs {DS_WORKFLOW_CLASSES.inlineAction}"
							on:click={() => (expandedProposalId = expandedProposalId === p.id ? null : p.id)}
						>
							{expandedProposalId === p.id ? 'Hide details' : 'View details'}
						</button>
					{/if}
					{#if expandedProposalId === p.id}
						<div class="mt-2 space-y-2 border-t border-[var(--ds-border-default)] pt-2 text-xs">
							{#if p.suggested_payload}
								<div>
									<div class="font-medium mb-1">{P127_WORKFLOW_PROPOSAL_PREVIEW_HEADING}</div>
									<div>
										Type: {p.suggested_payload.type != null && String(p.suggested_payload.type).trim() !== ''
											? formatWorkflowItemTypeForDisplay(String(p.suggested_payload.type))
											: proposedItemTypeDisplay(p)}
									</div>
									{#if p.suggested_payload.status}
										<div>Status: {formatWorkflowStatusForDisplay(p.suggested_payload.status)}</div>
									{/if}
									{#if p.suggested_payload.priority != null}
										<div>{P127_WORKFLOW_PROPOSAL_RANK_LABEL}: {p.suggested_payload.priority}</div>
									{/if}
									{#if p.suggested_payload.description}
										<div class="mt-1">
											<div class="font-medium">Description</div>
											<div class="whitespace-pre-wrap break-words overflow-x-auto max-w-full mt-0.5">
												{p.suggested_payload.description}
											</div>
										</div>
									{/if}
								</div>
							{/if}
							{#if p.citations?.length}
								<div>
									<div class="font-medium mb-1">Citations</div>
									<ul class="list-disc list-inside space-y-0.5 break-words">
										{#each p.citations as c, idx}
											<li class="break-words">
												[{idx + 1}] {c.source_type} – {c.source_id}
												{#if c.note}
													: {c.note}
												{/if}
											</li>
										{/each}
									</ul>
								</div>
							{/if}
						</div>
					{/if}
					<div class="mt-2 flex flex-wrap gap-2">
						{#if p.status === 'PENDING'}
							<button
								type="button"
								disabled={proposalMutationInFlight}
								class="text-xs {DS_WORKFLOW_CLASSES.inlineAction} {DS_WORKFLOW_CLASSES.inlineActionSuccess} disabled:cursor-not-allowed disabled:opacity-40 disabled:no-underline"
								on:click={() => openAccept(p)}
							>
								Accept
							</button>
							<button
								type="button"
								disabled={proposalMutationInFlight}
								class="text-xs {DS_WORKFLOW_CLASSES.inlineAction} {DS_WORKFLOW_CLASSES.inlineActionDanger} disabled:cursor-not-allowed disabled:opacity-40 disabled:no-underline"
								on:click={() => openReject(p)}
							>
								Reject
							</button>
						{:else if hasWorkflowLink(p)}
							<button
								type="button"
								class="text-xs {DS_WORKFLOW_CLASSES.inlineAction}"
								on:click={() => {
									if (p.workflow_item_id) void orientToWorkflowItemRow(p.workflow_item_id);
								}}
							>
								View workflow item
							</button>
						{/if}
					</div>
				</div>
			{/snippet}
			{#if proposalMutationInFlight}
				<p
					data-testid="workflow-proposal-action-in-flight"
					class="text-xs font-medium {DS_STATUS_TEXT_CLASSES.warning}"
					aria-live="polite"
				>
					Updating workflow suggestion…
				</p>
			{/if}
			{#if proposalsLoading}
				<div
					data-testid="workflow-proposals-state-shell"
					class="{DS_WORKFLOW_CLASSES.listStateShell} min-w-0 {embedded
						? 'p-2'
						: 'p-2.5'}"
				>
					<CaseLoadingState label="Loading workflow proposal queue…" testId="workflow-proposals-loading" />
				</div>
			{:else if proposalError}
				<!-- ── Proposal load error (P28-51); P59-07 shell cohesion ───────────────── -->
				<div
					data-testid="workflow-proposals-state-shell"
					class="{DS_WORKFLOW_CLASSES.listStateShell} min-w-0 {embedded
						? 'p-2'
						: 'p-2.5'}"
				>
					<CaseErrorState message={proposalError} onRetry={loadProposalsFirstPage} />
				</div>
			{:else if proposals.length === 0}
				<div
					data-testid="workflow-proposals-state-shell"
					class="{DS_WORKFLOW_CLASSES.listStateShell} {DS_WORKFLOW_CLASSES.listStateShellDashed} min-w-0 flex flex-col items-center justify-center text-center {embedded
						? 'px-2 py-6'
						: 'px-2.5 py-8'}"
				>
					<CaseEmptyState
						framed={false}
						title="No workflow proposals yet"
						description="When intake suggests a new or changed workflow item, it appears here for your review."
						testId="workflow-proposals-empty"
					>
						<div
							slot="action"
							class="mt-4 flex flex-col items-center gap-2 w-full"
							data-testid="workflow-queue-empty-next-steps"
						>
							<button
								type="button"
								class="{DS_BTN_CLASSES.primary} text-xs"
								data-testid="workflow-queue-empty-create"
								on:click={openCreate}
							>
								Create workflow item
							</button>
						</div>
					</CaseEmptyState>
				</div>
			{:else}
				<div class="min-w-0 space-y-3">
					{#if pendingProposals.length > 0}
						<div
							data-testid="workflow-proposals-list-scroll"
							class="{DS_WORKFLOW_CLASSES.proposalsListScroll} divide-y divide-[var(--ds-border-default)] min-w-0 {embedded
								? 'max-h-[min(36vh,12rem)]'
								: 'max-h-[40vh]'}"
						>
							{#each pendingProposals as p (p.id)}
								{@render workflowProposalRow(p)}
							{/each}
						</div>
					{:else}
						<div
							data-testid="workflow-proposals-state-shell"
							class="{DS_WORKFLOW_CLASSES.listStateShell} {DS_WORKFLOW_CLASSES.listStateShellDashed} min-w-0 {embedded
								? 'px-2 py-1.5'
								: 'px-2.5 py-2'}"
						>
							<CaseEmptyState
								framed={false}
								title="No pending workflow queue items"
								description={historyProposals.length > 0
									? 'Nothing is waiting for triage in the workflow proposal queue. Expand Resolved history below to review past outcomes.'
									: 'Nothing is waiting for triage in the workflow proposal queue.'}
								testId="workflow-proposals-empty-pending"
							>
								<div
									slot="action"
									class="mt-3 flex flex-col gap-2"
									data-testid="workflow-queue-pending-empty-next-steps"
								>
									<p class="{DS_TYPE_CLASSES.meta} text-[color:var(--ce-l-text-secondary)]">
										Governed timeline and note drafts live on the case <span class="font-medium">Proposals</span> tab (not
										this workflow queue). Same-case shortcuts:
									</p>
									<div
										class="flex flex-wrap items-center gap-x-2 gap-y-1 {embedded ? 'text-[11px]' : 'text-xs'}"
										role="group"
										aria-label="Case tab shortcuts from workflow queue empty pending state"
									>
										<a
											data-testid="workflow-queue-pending-empty-link-proposals"
											href="/case/{caseId}/proposals"
											class={workflowEmbedNavLinkClass}
											title={`${CASE_DESTINATION_TITLES.caseProposals} — separate from the Workflow proposal queue on this tab`}
											>{CASE_DESTINATION_LABELS.caseProposals}</a
										>
										<span class="{DS_TYPE_CLASSES.meta} text-[color:var(--ce-l-text-muted)] select-none" aria-hidden="true"
											>·</span
										>
										<a
											data-testid="workflow-queue-pending-empty-link-timeline"
											href="/case/{caseId}/timeline"
											class={workflowEmbedNavLinkClass}
											title={CASE_DESTINATION_TITLES.timeline}
											>{CASE_DESTINATION_LABELS.timeline}</a
										>
										<span class="{DS_TYPE_CLASSES.meta} text-[color:var(--ce-l-text-muted)] select-none" aria-hidden="true"
											>·</span
										>
										<a
											data-testid="workflow-queue-pending-empty-link-notes"
											href="/case/{caseId}/notes"
											class={workflowEmbedNavLinkClass}
											title={CASE_DESTINATION_TITLES.notes}
											>{CASE_DESTINATION_LABELS.notes}</a
										>
									</div>
								</div>
							</CaseEmptyState>
						</div>
					{/if}
					{#if historyProposals.length > 0}
						<details
							class="rounded-md border border-dashed border-[var(--ds-border-default)] bg-gray-50/60 dark:bg-gray-900/40 min-w-0 {embedded ? 'p-2' : 'p-2.5'}"
							data-testid="workflow-proposals-history"
						>
							<summary
								class="cursor-pointer text-xs font-medium {DS_TYPE_CLASSES.meta} text-[color:var(--ds-text-muted)] list-none flex flex-wrap items-center justify-between gap-2 [&::-webkit-details-marker]:hidden"
							>
								<span>Resolved history ({historyProposals.length})</span>
								<span class="shrink-0 tabular-nums text-[10px] opacity-80">Accepted / rejected</span>
							</summary>
							<div
								class="mt-2 {DS_WORKFLOW_CLASSES.proposalsListScroll} divide-y divide-[var(--ds-border-default)] max-h-[min(28vh,10rem)] overflow-y-auto overflow-x-hidden min-w-0"
							>
								{#each historyProposals as p (p.id)}
									{@render workflowProposalRow(p)}
								{/each}
							</div>
						</details>
					{/if}
					<div
						bind:this={workflowProposalsSentinel}
						data-testid="workflow-proposals-scroll-sentinel"
						class="h-px w-full shrink-0"
						aria-hidden="true"
					></div>
					{#if proposalListLoadingMore}
						<p class="m-0 py-1 text-center text-[10px] {DS_TYPE_CLASSES.meta}" data-testid="workflow-proposals-load-more">
							Loading more…
						</p>
					{/if}
				</div>
			{/if}
	</section>

	<!-- P59-02 guidance; P59-10 toggle; P78-07 default-expanded; P59-12/P59-14 collapsed = lighter footer strip when user collapses -->
	<section
		data-testid="workflow-guidance-placeholder"
		data-workflow-guidance-footer={guidanceExpanded ? undefined : 'true'}
		class="scroll-mt-3 transition-colors shrink-0 {guidanceExpanded
			? embedded
				? DS_WORKFLOW_CLASSES.guidanceZoneOpenEmbed
				: DS_WORKFLOW_CLASSES.guidanceZoneOpenFull
			: embedded
				? DS_WORKFLOW_CLASSES.guidanceZoneCollapsedEmbed
				: DS_WORKFLOW_CLASSES.guidanceZoneCollapsedFull}"
		aria-label="Guidance, journey landmarks, and case surface shortcuts"
	>
		<div class="flex flex-wrap items-start justify-between gap-2">
			<div class="min-w-0 flex-1">
				<h3
					class="{guidanceExpanded
						? embedded
							? 'text-[11px]'
							: 'text-xs'
						: embedded
							? 'text-[10px]'
							: 'text-[11px]'} {DS_TYPE_CLASSES.label} {guidanceExpanded ? 'opacity-100' : 'opacity-80'}"
				>
					Guidance (advisory path only)
				</h3>
				{#if !guidanceExpanded}
					<p class="leading-snug mt-1 max-w-prose {DS_WORKFLOW_TEXT_CLASSES.guidanceIntroMuted}">
						Advisory only—expand for full reminders and tab shortcuts. Does not change Timeline authority.
					</p>
				{/if}
			</div>
			<button
				type="button"
				data-testid="workflow-guidance-toggle"
				aria-expanded={guidanceExpanded}
				aria-label={guidanceExpanded ? 'Hide guidance' : 'Show guidance'}
				class="{DS_WORKFLOW_CLASSES.guidanceToggle} shrink-0"
				on:click={() => void toggleGuidanceExpanded()}
			>
				{guidanceExpanded ? 'Hide guidance' : 'Show guidance'}
			</button>
		</div>
		<div
			data-testid="workflow-guidance-expanded-body"
			class="mt-2 space-y-2 {guidanceExpanded ? '' : 'hidden'}"
			aria-hidden={!guidanceExpanded}
		>
			<p
				data-testid="workflow-guidance-placeholder-copy"
				class="leading-snug {DS_TYPE_CLASSES.meta} {embedded ? 'text-[10px]' : 'text-[11px]'}"
			>
				Advisory path only—use what fits the case. This Workflow tab stays planning-only; shortcuts below open other case
				surfaces (including the case Proposals tab for governed drafts) without committing the official Timeline from
				here.
			</p>
			<ol
				data-testid="workflow-journey-landmarks"
				class="list-decimal max-w-prose {DS_TYPE_CLASSES.meta} {embedded
					? 'pl-3 space-y-0.5 text-[10px] leading-snug'
					: 'pl-4 space-y-1.5 text-[11px] leading-snug'}"
			>
				<li data-testid="workflow-journey-step-1">
					<span class="{DS_WORKFLOW_TEXT_CLASSES.doctrineEmphasis}">See what needs focus.</span>
					Start with Attention and the list; pending items in the <span
						class="{DS_WORKFLOW_TEXT_CLASSES.doctrineEmphasis}">workflow proposal queue</span
					>
					below are not governed case proposals—the case <span class="{DS_WORKFLOW_TEXT_CLASSES.doctrineEmphasis}"
						>Proposals</span
					>
					tab is separate.
				</li>
				<li data-testid="workflow-journey-step-2">
					<span class="{DS_WORKFLOW_TEXT_CLASSES.doctrineEmphasis}">Shape planning on Workflow.</span>
					Refine hypotheses and gaps; accept or reject workflow-item suggestions here. This tab does not publish official
					Timeline rows.
				</li>
				<li data-testid="workflow-journey-step-3">
					<span class="{DS_WORKFLOW_TEXT_CLASSES.doctrineEmphasis}">Switch surfaces when the work fits.</span>
					Use the links below for Files, Notes, Overview, Timeline, or the case Proposals tab for governed timeline/note
					drafts.
				</li>
				<li data-testid="workflow-journey-step-4">
					<span class="{DS_WORKFLOW_TEXT_CLASSES.doctrineEmphasis}">Keep official work governed.</span>
					Committed Timeline entries and governed drafts move through review on <span
						class="{DS_WORKFLOW_TEXT_CLASSES.doctrineEmphasis}">Timeline</span
					>
					and the case <span class="{DS_WORKFLOW_TEXT_CLASSES.doctrineEmphasis}">Proposals</span> tab—not through this
					Workflow tab alone.
				</li>
			</ol>
			<nav
				data-testid="workflow-case-surfaces-nav"
				class="flex flex-wrap {embedded ? 'gap-1' : 'gap-2'}"
				aria-label="Case workspace links"
			>
				<a
					data-testid="workflow-deep-link-timeline"
					href="/case/{caseId}/timeline"
					class={workflowEmbedNavLinkClass}
					title="Official committed timeline — not the Workflow planning layer"
					>Timeline</a
				>
				<a
					data-testid="workflow-deep-link-notes"
					href="/case/{caseId}/notes"
					class={workflowEmbedNavLinkClass}
					title="Investigator notes — working drafts, not the official Timeline"
					>Notes</a
				>
				<a
					data-testid="workflow-deep-link-files"
					href="/case/{caseId}/files"
					class={workflowEmbedNavLinkClass}
					title="Case files and attachments"
					>Files</a
				>
				<a
					data-testid="workflow-deep-link-summary"
					href="/case/{caseId}/summary"
					class={workflowEmbedNavLinkClass}
					title={CASE_DESTINATION_TITLES.overview}
					>{CASE_DESTINATION_LABELS.overview}</a
				>
				<a
					data-testid="workflow-deep-link-proposals"
					href="/case/{caseId}/proposals"
					class={workflowEmbedNavLinkClass}
					title={`${CASE_DESTINATION_TITLES.caseProposals} — separate from the Workflow proposal queue on this tab`}
					>{CASE_DESTINATION_LABELS.caseProposals}</a
				>
			</nav>
		</div>
	</section>
</div>

<!-- P127-02 — Create modal (Phase 117 case_workflow_items only). -->
{#if createOpen}
	<div
		class="{DS_OVERLAY_CLASSES.backdrop} z-50 flex min-h-full items-center justify-center p-4"
		role="dialog"
		aria-modal="true"
		aria-labelledby="create-workflow-title"
		data-testid="workflow-p127-create-modal"
	>
		<div class="{DS_MODAL_CLASSES.panel} max-w-md w-full p-4 max-h-[90vh] overflow-auto">
			<h3 id="create-workflow-title" class="{DS_WORKFLOW_TEXT_CLASSES.modalTitle}">{P127_WORKFLOW_CREATE_MODAL_TITLE}</h3>
			{#key createFormKey}
				<CaseWorkflowCreateForm
					testIdPrefix="workflow-p127-create"
					caseId={caseId}
					token={token}
					onCancel={closeCreate}
					onSuccess={() => void handleP117CreateSuccess()}
				/>
			{/key}
		</div>
	</div>
{/if}

{#if showEntityWorkspace && entityWorkspaceType && entityWorkspaceId}
	<div class="fixed inset-0 z-40 flex items-center justify-center bg-black/50">
		<EntityWorkspace
			{caseId}
			{token}
			entityType={entityWorkspaceType}
			normalizedId={entityWorkspaceId}
			isAdmin={isAdmin}
			onClose={closeEntityWorkspace}
		/>
	</div>
{/if}

<!-- Edit modal -->
{#if editItem}
	<div
		class="{DS_OVERLAY_CLASSES.backdrop} z-50 flex min-h-full items-center justify-center p-4"
		role="dialog"
		aria-modal="true"
		aria-labelledby="edit-workflow-title"
	>
		<div class="{DS_MODAL_CLASSES.panel} max-w-md w-full p-4 max-h-[90vh] overflow-auto">
			<h3 id="edit-workflow-title" class="{DS_WORKFLOW_TEXT_CLASSES.modalTitle}">
				Edit workflow item ({formatWorkflowItemTypeForDisplay(editItem.type)})
			</h3>
			<form on:submit|preventDefault={submitEdit} class="flex flex-col gap-3">
				<div>
					<label class="{DS_WORKFLOW_TEXT_CLASSES.modalLabel}">Title *</label>
					<input
						type="text"
						bind:value={editTitle}
						class="w-full {DS_TIMELINE_CLASSES.formControl}"
					/>
				</div>
				<div>
					<label class="{DS_WORKFLOW_TEXT_CLASSES.modalLabel}">Description</label>
					<textarea
						bind:value={editDescription}
						rows="2"
						class="w-full {DS_TIMELINE_CLASSES.formControl}"
					></textarea>
				</div>
				<div>
					<label class="{DS_WORKFLOW_TEXT_CLASSES.modalLabel}">Status</label>
					<select
						bind:value={editStatus}
						class="w-full {DS_TIMELINE_CLASSES.formControl}"
					>
						{#each editStatusOptions as s}
							<option value={s}>{formatWorkflowStatusForDisplay(s)}</option>
						{/each}
					</select>
				</div>
				<div>
					<label class="{DS_WORKFLOW_TEXT_CLASSES.modalLabel}">{P127_WORKFLOW_LEGACY_RANK_EDIT_LABEL}</label>
					<input
						type="number"
						bind:value={editPriority}
						class="w-full {DS_TIMELINE_CLASSES.formControl}"
					/>
				</div>
				<div class="flex gap-2 justify-end pt-2">
					<button type="button" class="{DS_BTN_CLASSES.ghost} text-sm" on:click={closeEdit}>
						Cancel
					</button>
					<button
						type="submit"
						class="{DS_BTN_CLASSES.primary} text-sm disabled:opacity-50"
						disabled={editSubmitting}
					>
						{editSubmitting ? 'Saving…' : 'Save'}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- ── Delete workflow item (P28-49) ──────────────────────────────────────── -->
<ConfirmDialog
	bind:show={showDeleteConfirm}
	title="Delete workflow item?"
	message={deleteTarget ? `"${deleteTarget.title}" will be removed from the active list. Admins can restore it later.` : ''}
	cancelLabel="Cancel"
	confirmLabel="Delete"
	onConfirm={doDelete}
	on:cancel={cancelDelete}
/>

<!-- ── Restore workflow item (P28-49) ─────────────────────────────────────── -->
<ConfirmDialog
	bind:show={showRestoreConfirm}
	title="Restore workflow item?"
	message={restoreTarget ? `"${restoreTarget.title}" will reappear in the active list.` : ''}
	cancelLabel="Cancel"
	confirmLabel="Restore"
	onConfirm={doRestore}
	on:cancel={cancelRestore}
/>

<!-- ── Accept workflow proposal (P28-49) ──────────────────────────────────── -->
<ConfirmDialog
	bind:show={showAcceptConfirm}
	title="Accept workflow suggestion?"
	message="Creates a workflow planning item from this workflow-queue suggestion. It does not publish to the official Timeline—use the case Proposals tab for governed timeline and note drafts."
	cancelLabel="Cancel"
	confirmLabel="Accept"
	onConfirm={confirmAccept}
	on:cancel={cancelAccept}
/>

<!-- ── Reject workflow proposal (P28-49) ──────────────────────────────────── -->
<!-- Uses ConfirmDialog's built-in input mode so the reject reason lives inside -->
<!-- the shared dialog rather than in a bespoke overlay. rejectReason is two-way -->
<!-- bound to inputValue; ConfirmDialog resets it to '' each time show→true.    -->
<ConfirmDialog
	bind:show={showRejectConfirm}
	title="Reject workflow suggestion?"
	message="This workflow-queue suggestion will be marked rejected. No workflow planning item will be created."
	input={true}
	inputPlaceholder="Reason for rejection (optional)"
	bind:inputValue={rejectReason}
	cancelLabel="Cancel"
	confirmLabel="Reject"
	onConfirm={confirmReject}
	on:cancel={cancelReject}
/>
