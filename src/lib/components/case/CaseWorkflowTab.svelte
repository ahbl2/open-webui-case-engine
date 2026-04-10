<script lang="ts">
	import { tick, onDestroy } from 'svelte';
	import { toast } from 'svelte-sonner';
import {
	listWorkflowItems,
	createWorkflowItem,
	updateWorkflowItem,
	deleteWorkflowItem,
	restoreWorkflowItem,
	listWorkflowProposals,
	acceptWorkflowProposal,
	rejectWorkflowProposal,
	listWorkflowSupportLinks,
	type WorkflowItem,
	type WorkflowItemCreateInput,
	type WorkflowItemType,
	type WorkflowProposal,
	type WorkflowSupportLink
} from '$lib/apis/caseEngine';
import {
	hrefForSupportLinkTarget,
	isWorkflowSupportLinkStale,
	loadSupportLinkTargetIndex,
	primaryLabelForSupportLink,
	supportLinkKindBadgeClass,
	supportLinkKindShortLabel,
	type SupportLinkTargetIndex
} from '$lib/utils/workflowSupportLinkDisplay';
import {
	getStatusesForType,
	getStatusBadgeClasses,
	getOriginBadgeClasses,
	getPriorityEmoji,
	formatWorkflowItemTypeForDisplay,
	formatWorkflowStatusForDisplay,
	formatWorkflowOriginForDisplay,
	formatWorkflowProposalTypeForDisplay,
	type WorkflowItemType as LocalType
} from '$lib/components/case/workflowStatus';
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

	type FilterType = 'all' | 'HYPOTHESIS' | 'GAP';

	let items: WorkflowItem[] = [];
	let loading = true;
	let loadError = '';
	type WorkflowListViewState = 'loading' | 'error' | 'empty' | 'success';
	let workflowListViewState: WorkflowListViewState = 'loading';
	let filter: FilterType = 'all';
	let includeDeleted = false;
	let createOpen = false;
	let editItem: WorkflowItem | null = null;
	let deleteTarget: WorkflowItem | null = null;
	let restoreTarget: WorkflowItem | null = null;
	let proposalCount = 0;
	let proposals: WorkflowProposal[] = [];
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

	/** P59-10: guidance region default-collapsed to keep focus on the work area (local only). */
	let guidanceExpanded = false;
	/** Full-page intro: default-collapsed to reduce above-the-fold clutter (local only). */
	let narrativeExpanded = false;

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

	onDestroy(() => {
		clearPostAcceptHighlight();
	});

	// ── Route-reuse case-switch guard (P28-45) ─────────────────────────────────
	// The naked $: if (caseId && token) block below handles all data loading
	// (including initial load). This sentinel fires ONLY when caseId changes,
	// closing any open forms/panels so stale-case UI state is cleared immediately.
	// The activeItemsLoadId guards stale in-flight responses from loadItems().
	let prevWorkflowCaseId: string = caseId;
	/** Guards stale loadItems() responses from writing to the new case. */
	let activeItemsLoadId = 0;
	$: workflowListViewState = loading ? 'loading' : loadError ? 'error' : items.length === 0 ? 'empty' : 'success';

	// P59-03: attention signals — existing client state only (items + proposalCount + filters).
	$: attentionListReady = !loading && !loadError;
	$: attentionOpenInView = attentionListReady
		? items.filter((i) => !i.deleted_at && String(i.status).toUpperCase() === 'OPEN').length
		: null;
	$: attentionFilterScopeLabel =
		filter === 'all'
			? 'All types'
			: filter === 'HYPOTHESIS'
				? 'Hypotheses only'
				: 'Gaps only';

	$: if (caseId && token && caseId !== prevWorkflowCaseId) {
		prevWorkflowCaseId = caseId;
		items = [];
		loading = true;
		loadError = '';
		createOpen = false;
		editItem = null;
		deleteTarget = null;
		restoreTarget = null;
		createResultMessage = null;
		createResultTone = null;
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
		proposalCount = 0;
		guidanceExpanded = false;
		narrativeExpanded = false;
		clearPostAcceptHighlight();
	}

	// Create form
	let createType: WorkflowItemType = 'HYPOTHESIS';
	let createTitle = '';
	let createDescription = '';
	let createStatus = 'OPEN';
	let createPriority: number | null = null;
	let createSubmitting = false;
	let createResultMessage: string | null = null;
	let createResultTone: 'ok' | 'warn' | 'error' | null = null;

	// Edit form (immutable: type, case_id, origin, created_*)
	let editTitle = '';
	let editDescription = '';
	let editStatus = '';
	let editPriority: number | null = null;
	let editSubmitting = false;

	$: statusOptionsCreate = getStatusesForType(createType as LocalType);
	$: if (createType && statusOptionsCreate.length && !statusOptionsCreate.includes(createStatus)) {
		createStatus = statusOptionsCreate[0];
	}

	$: if (caseId && token) {
		loadItems();
		loadProposalCount();
		loadProposals();
	}

	async function loadItems() {
		activeItemsLoadId += 1;
		const loadId = activeItemsLoadId;
		loading = true;
		loadError = '';
		try {
			const typeParam =
				filter === 'all' ? undefined : (filter as WorkflowItemType);
			const result = await listWorkflowItems(caseId, token, {
				type: typeParam,
				includeDeleted: isAdmin && includeDeleted
			});
			if (loadId !== activeItemsLoadId) return;
			items = result;
			void refreshSupportLinkSummaries();
		} catch (e) {
			if (loadId !== activeItemsLoadId) return;
			const msg = (e as Error)?.message ?? 'Failed to load workflow items';
			loadError = msg;
			items = [];
			supportLinksByItemId = {};
			supportRowIndex = null;
		} finally {
			if (loadId === activeItemsLoadId) loading = false;
		}
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

	async function loadProposalCount() {
		try {
			const list = await listWorkflowProposals(caseId, token, {
				status: 'PENDING'
			});
			proposalCount = list.length;
		} catch {
			proposalCount = 0;
		}
	}

	async function loadProposals() {
		if (!caseId || !token) return;
		proposalsLoading = true;
		proposalError = null;
		try {
			proposals = await listWorkflowProposals(caseId, token);
		} catch (e) {
			proposalError = (e as Error)?.message ?? 'Failed to load proposals';
			toast.error(proposalError);
			proposals = [];
		} finally {
			proposalsLoading = false;
		}
	}

	function openCreate() {
		createType = 'HYPOTHESIS';
		createTitle = '';
		createDescription = '';
		createStatus = 'OPEN';
		createPriority = null;
		createResultMessage = null;
		createResultTone = null;
		createOpen = true;
	}

	function closeCreate() {
		createOpen = false;
	}

	async function submitCreate() {
		const title = createTitle.trim();
		if (!title) {
			toast.error('Title is required');
			return;
		}
		createSubmitting = true;
		try {
			const payload: WorkflowItemCreateInput = {
				type: createType,
				title,
				description: createDescription.trim() || undefined,
				status: createStatus,
				priority: createPriority ?? undefined
			};
			const created = await createWorkflowItem(caseId, token, payload);
			closeCreate();
			await loadItems();
			const visibleInCurrentList = items.some((item) => item.id === created.id);
			if (visibleInCurrentList) {
				createResultTone = 'ok';
				createResultMessage = 'Workflow item created and visible in this list.';
				toast.success('Workflow item created and visible in this list.');
			} else if (filter !== 'all' && created.type !== filter) {
				filter = 'all';
				await loadItems();
				createResultTone = 'warn';
				createResultMessage =
					'Workflow item created. The view switched to "All" so you can confirm it in the list.';
				toast.info('Workflow item created. Switched to "All" to show it.');
			} else {
				createResultTone = 'warn';
				createResultMessage =
					'Workflow item creation returned success, but visibility could not be confirmed in the current list.';
				toast.warning('Workflow item created, but visibility could not be confirmed.');
			}
		} catch (e) {
			createResultTone = 'error';
			createResultMessage = 'Workflow item was not created.';
			toast.error((e as Error)?.message ?? 'Create failed');
		} finally {
			createSubmitting = false;
		}
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
			loadItems();
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
			loadItems();
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
			loadItems();
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
			return 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200';
		}
		if (s === 'ACCEPTED') {
			return 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200';
		}
		// REJECTED or anything else
		return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200';
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
			toast.success('Proposal accepted and workflow item created');
			await loadProposals();
			await loadItems();
			if (acceptedItemId) {
				if (
					!items.some((i) => i.id === acceptedItemId) &&
					filter !== 'all' &&
					acceptedType &&
					acceptedType !== filter
				) {
					filter = 'all';
					await loadItems();
				}
				if (items.some((i) => i.id === acceptedItemId)) {
					await orientToWorkflowItemRow(acceptedItemId);
				}
			}
			// Keep attention count + list in sync after accept.
			await loadProposalCount();
		} catch (e) {
			toast.error((e as Error)?.message ?? 'Accept failed');
			// Defensive refresh in case proposal was already resolved elsewhere.
			await loadProposals();
			await loadProposalCount();
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
			toast.success('Proposal rejected');
			await loadProposals();
			await loadProposalCount();
		} catch (e) {
			toast.error((e as Error)?.message ?? 'Reject failed');
			// Defensive refresh in case proposal was already resolved elsewhere.
			await loadProposals();
			await loadProposalCount();
		} finally {
			proposalMutationInFlight = false;
		}
	}

	// P59-08: Case Tools embedded density for deep-link chips (presentation only).
	$: workflowEmbedNavLinkClass =
		'inline-flex items-center rounded-md border border-gray-300 dark:border-gray-600 bg-white/90 dark:bg-gray-950/50 font-medium text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800/80 ' +
		(embedded ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-1 text-[11px]');
</script>

<!-- P59-15: vertical stack + root scroll — avoid flex-1 on lower siblings’ predecessor (main) stealing height and overflowing onto proposals -->
<div
	data-workflow-layout={embedded ? 'embedded' : 'full'}
	class="flex flex-col max-h-full min-w-0 overflow-auto {embedded
		? 'gap-2.5 px-2 py-1.5 sm:px-2.5 sm:py-2 min-h-0'
		: 'gap-5 p-4'}"
>
	<header data-testid="workflow-page-header" class={embedded ? 'space-y-0.5 shrink-0' : 'space-y-1 shrink-0'}>
		<h2
			class="{embedded
				? 'text-sm'
				: 'text-base'} font-semibold text-gray-900 dark:text-gray-100 tracking-tight"
		>
			Workflow
		</h2>
		<div
			data-testid="workflow-narrative-intro"
			class="{embedded ? 'space-y-0.5' : 'space-y-2'} max-w-prose"
		>
			{#if !embedded}
				<div class="flex flex-wrap items-start justify-between gap-2">
					<div class="min-w-0 flex-1 space-y-1">
						{#if !narrativeExpanded}
							<p class="text-xs text-gray-600 dark:text-gray-400 leading-snug">
								<span class="font-medium text-gray-700 dark:text-gray-300">Workflow</span> is the planning layer
								(hypotheses &amp; gaps)—not the official record.
								<span class="font-medium text-gray-700 dark:text-gray-300">Proposals</span> tab = governed drafts;
								the <span class="font-medium text-gray-700 dark:text-gray-300">workflow proposal queue</span> below
								= item suggestions only.
							</p>
						{:else}
							<p class="text-xs font-medium text-gray-600 dark:text-gray-400">Full operator intro</p>
						{/if}
					</div>
					<button
						type="button"
						data-testid="workflow-narrative-toggle"
						aria-expanded={narrativeExpanded}
						class="shrink-0 rounded-md border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 px-2 py-1 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-400"
						on:click={() => (narrativeExpanded = !narrativeExpanded)}
					>
						{narrativeExpanded ? 'Hide full intro' : 'Show full intro'}
					</button>
				</div>
				{#if narrativeExpanded}
					<div class="space-y-1.5 border-l-2 border-gray-200 dark:border-gray-600 pl-3">
						<p class="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
							Workflow is your <span class="font-medium text-gray-700 dark:text-gray-300">planning layer</span> for
							this case: hypotheses you are testing and gaps you still need to close. It supports the investigation;
							it is <span class="font-medium text-gray-700 dark:text-gray-300">not</span> the official case record.
						</p>
						<p class="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
							The case <span class="font-medium text-gray-800 dark:text-gray-200">Proposals</span> tab holds governed
							drafts—timeline entries and notes—that can become official only after review and commit
							<span class="whitespace-nowrap">there</span>. Suggestions that add or change
							<span class="font-medium text-gray-800 dark:text-gray-200">workflow items</span> land in the
							<span class="font-medium text-gray-800 dark:text-gray-200">workflow proposal queue</span> below; accept
							or reject them here.
						</p>
					</div>
				{/if}
			{:else}
				<p class="text-[11px] text-gray-600 dark:text-gray-400 leading-snug">
					<span class="font-medium text-gray-700 dark:text-gray-300">Planning:</span> hypotheses &amp; gaps (not the
					official Timeline). <span class="font-medium text-gray-700 dark:text-gray-300">Proposals tab:</span>
					governed timeline/note drafts. <span class="font-medium text-gray-700 dark:text-gray-300">Below:</span>
					workflow-item suggestions for review.
				</p>
			{/if}
		</div>
	</header>

	<!-- P59-02: attention shell — P59-03: client-derived signals (no new fetches) -->
	<section
		data-testid="workflow-attention-region"
		class="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50/60 dark:bg-gray-900/35 shrink-0 {embedded
			? 'px-2 py-2'
			: 'px-3 py-2.5'}"
		aria-label="Attention and priorities"
	>
		<h3
			class="{embedded
				? 'text-[11px]'
				: 'text-xs'} font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide"
		>
			Attention
		</h3>
		<div
			data-testid="workflow-attention-signals"
			class="flex flex-wrap items-stretch {embedded ? 'mt-1.5 gap-1.5' : 'mt-2 gap-2'}"
		>
			<div
				class="inline-flex min-w-0 max-w-full flex-col rounded-md border border-gray-200/90 bg-white/80 dark:border-gray-600/80 dark:bg-gray-950/40 {embedded
					? 'px-1.5 py-1 sm:flex-row sm:items-baseline sm:gap-1.5'
					: 'px-2 py-1.5 sm:flex-row sm:items-baseline sm:gap-2'}"
				data-testid="workflow-attention-pending-chip"
				title="Pending suggestions for workflow items (this queue—not the case Proposals tab)"
			>
				<span class="text-[11px] text-gray-600 dark:text-gray-400 leading-tight"
					>Pending workflow suggestions</span
				>
				<span
					data-testid="workflow-attention-pending-count"
					class="text-sm font-semibold tabular-nums text-gray-900 dark:text-gray-100"
					>{proposalCount}</span
				>
			</div>

			{#if loadError}
				<div
					data-testid="workflow-attention-list-error"
					class="inline-flex max-w-full flex-col self-start rounded-md border border-red-200/90 bg-red-50/80 dark:border-red-900/55 dark:bg-red-950/30 {embedded
						? 'px-1.5 py-1'
						: 'px-2 py-1.5'}"
				>
					<p class="text-[11px] text-red-800 dark:text-red-300 leading-snug max-w-prose">
						<span class="font-medium">List unavailable</span> — workflow items did not load. Use
						<span class="font-medium">Try again</span> in the list block below.
					</p>
				</div>
			{:else if loading}
				<div
					data-testid="workflow-attention-list-loading"
					class="inline-flex items-center self-start rounded-md border border-gray-200/90 bg-white/80 dark:border-gray-600/80 dark:bg-gray-950/40 {embedded
						? 'px-1.5 py-1'
						: 'px-2 py-1.5'}"
				>
					<p class="text-[11px] text-gray-600 dark:text-gray-400 leading-snug">Loading workflow items…</p>
				</div>
			{:else}
				<div
					class="inline-flex min-w-0 max-w-full flex-col rounded-md border border-gray-200/90 bg-white/80 dark:border-gray-600/80 dark:bg-gray-950/40 {embedded
						? 'px-1.5 py-1 sm:flex-row sm:items-baseline sm:gap-1.5'
						: 'px-2 py-1.5 sm:flex-row sm:items-baseline sm:gap-2'}"
					data-testid="workflow-attention-listed-chip"
					title="Count for the current type filter and list settings—planning workspace only"
				>
					<span class="text-[11px] text-gray-600 dark:text-gray-400 leading-tight">Items in this list</span>
					<span class="flex flex-wrap items-baseline gap-x-1.5 gap-y-0">
						<span
							data-testid="workflow-attention-listed-count"
							class="text-sm font-semibold tabular-nums text-gray-900 dark:text-gray-100">{items.length}</span
						>
						<span
							data-testid="workflow-attention-filter-scope"
							class="text-[10px] font-medium text-gray-500 dark:text-gray-400">({attentionFilterScopeLabel})</span
						>
					</span>
					{#if isAdmin && includeDeleted}
						<span
							data-testid="workflow-attention-includes-deleted"
							class="text-[10px] text-gray-500 dark:text-gray-500">Includes deleted rows</span
						>
					{/if}
				</div>
				<div
					class="inline-flex min-w-0 max-w-full flex-col rounded-md border border-gray-200/90 bg-white/80 dark:border-gray-600/80 dark:bg-gray-950/40 {embedded
						? 'px-1.5 py-1 sm:flex-row sm:items-baseline sm:gap-1.5'
						: 'px-2 py-1.5 sm:flex-row sm:items-baseline sm:gap-2'}"
					data-testid="workflow-attention-open-chip"
					title="Workflow items in OPEN status in this list (planning state, not Timeline)"
				>
					<span class="text-[11px] text-gray-600 dark:text-gray-400 leading-tight">Open items in this list</span>
					<span
						data-testid="workflow-attention-open-count"
						class="text-sm font-semibold tabular-nums text-gray-900 dark:text-gray-100">{attentionOpenInView ??
							0}</span
					>
				</div>
			{/if}
		</div>
	</section>

	<!-- P59-02 main work area (toolbar + items list only); P59-13 — proposal queue is a following sibling section, not nested here -->
	<section
		data-testid="workflow-main-work-area"
		class="flex flex-col min-w-0 shrink-0 {embedded ? 'gap-2.5' : 'gap-5'}"
		aria-label="Workflow main workspace"
	>
	<!-- Filters + primary create action (grouped toolbar) -->
	<section
		data-testid="workflow-items-toolbar"
		class={embedded ? 'space-y-1.5' : 'space-y-2'}
		aria-label="Workflow item list filters"
	>
		<div>
			<p class="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Workflow items</p>
			<p class="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 max-w-prose leading-snug">
				Persisted hypotheses and gaps on this tab—planning only, not committed Timeline rows.
			</p>
		</div>
		<div
			class="flex flex-col sm:flex-row sm:items-center sm:justify-between {embedded
				? 'gap-2'
				: 'gap-3'}"
		>
			<div
				data-testid="workflow-filter-cluster"
				class="flex flex-wrap items-center gap-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50/90 dark:bg-gray-900/50 min-w-0 {embedded
					? 'px-2 py-2'
					: 'px-3 py-2.5'}"
			>
				<span class="text-xs font-medium text-gray-600 dark:text-gray-400 shrink-0">Show:</span>
				<button
					type="button"
					class="px-2 py-1 text-sm rounded {filter === 'all'
						? 'bg-gray-200 dark:bg-gray-700 font-medium'
						: 'hover:bg-gray-100 dark:hover:bg-gray-800'}"
					on:click={() => {
						filter = 'all';
						loadItems();
					}}
				>
					All
				</button>
				<button
					type="button"
					class="px-2 py-1 text-sm rounded {filter === 'HYPOTHESIS'
						? 'bg-gray-200 dark:bg-gray-700 font-medium'
						: 'hover:bg-gray-100 dark:hover:bg-gray-800'}"
					on:click={() => {
						filter = 'HYPOTHESIS';
						loadItems();
					}}
				>
					Hypotheses
				</button>
				<button
					type="button"
					class="px-2 py-1 text-sm rounded {filter === 'GAP'
						? 'bg-gray-200 dark:bg-gray-700 font-medium'
						: 'hover:bg-gray-100 dark:hover:bg-gray-800'}"
					on:click={() => {
						filter = 'GAP';
						loadItems();
					}}
				>
					Gaps
				</button>
				{#if isAdmin}
					<label
						class="flex items-center gap-1.5 text-sm w-full sm:w-auto sm:ml-1 sm:pl-3 sm:border-l border-gray-200 dark:border-gray-600"
					>
						<input type="checkbox" bind:checked={includeDeleted} on:change={loadItems} />
						Include deleted
					</label>
				{/if}
			</div>
			<button
				type="button"
				class="shrink-0 px-2 py-1.5 text-sm rounded bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 font-medium"
				on:click={openCreate}
			>
				Create workflow item
			</button>
		</div>
	</section>

	{#if createResultMessage}
		<div
			class="text-xs rounded border px-2 py-1 {createResultTone === 'ok'
				? 'border-green-200 dark:border-green-900/60 text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-900/20'
				: createResultTone === 'error'
					? 'border-red-200 dark:border-red-900/60 text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/20'
					: 'border-amber-200 dark:border-amber-900/60 text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/20'}"
			role="status"
			aria-live="polite"
			data-testid="workflow-create-result"
		>
			{createResultMessage}
		</div>
	{/if}

	<!-- List (hypotheses / gaps) -->
	<!-- shrink-0: do not use min-h-0 here — in a column flex (main) it lets this region shrink below the table, overflow: visible paints rows under the proposals panel -->
	<section data-testid="workflow-items-list-section" class="min-w-0 flex flex-col shrink-0" aria-label="Workflow items list">
	<!-- ── List state (P28-50: aligned to shared state components); P59-07 shell cohesion ── -->
	{#if workflowListViewState === 'loading'}
		<div
			data-testid="workflow-items-list-state-shell"
			class="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50/40 dark:bg-gray-900/30 min-w-0 overflow-hidden {embedded
				? 'p-2'
				: 'p-3'}"
		>
			<CaseLoadingState label="Loading workflow items…" testId="workflow-items-list-loading" />
		</div>
	{:else if workflowListViewState === 'error'}
		<div
			data-testid="workflow-items-list-state-shell"
			class="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50/40 dark:bg-gray-900/30 min-w-0 overflow-hidden {embedded
				? 'p-2'
				: 'p-3'}"
		>
			<CaseErrorState message={loadError} onRetry={loadItems} />
		</div>
	{:else if workflowListViewState === 'empty'}
		<div
			data-testid="workflow-items-list-state-shell"
			class="rounded-lg border border-dashed border-gray-300 dark:border-gray-600 bg-gray-50/30 dark:bg-gray-900/25 min-w-0 {embedded
				? 'p-2'
				: 'p-3'}"
		>
			<CaseEmptyState
				framed={false}
				title={filter === 'HYPOTHESIS' ? 'No hypotheses yet.' : filter === 'GAP' ? 'No gaps yet.' : 'No workflow items yet.'}
				description={filter === 'HYPOTHESIS'
					? 'Capture what you are testing—Workflow plans the line of inquiry; official facts still go through Timeline after governed intake.'
					: filter === 'GAP'
						? 'Capture what evidence or facts you still need. Closing a gap may later tie to Timeline entries via the case Proposals tab—not directly from here.'
						: 'Add hypotheses and gaps to steer the case. Use the case Proposals tab when you have governed timeline or note drafts to review and commit.'}
			/>
		</div>
	{:else}
		<div
			data-testid="workflow-items-table-scroll"
			class="border border-gray-200 dark:border-gray-700 rounded min-w-0 overflow-x-auto overflow-y-auto overscroll-x-contain {embedded
				? 'max-h-[min(46vh,14.5rem)]'
				: 'min-h-[14rem] max-h-[min(50vh,36rem)]'}"
		>
			<table class="w-full min-w-[60rem] text-sm">
				<thead class="bg-gray-50 dark:bg-gray-800 sticky top-0">
					<tr>
						<th class="text-left px-2 py-1.5">Type</th>
						<th class="text-left px-2 py-1.5">Title</th>
						<th class="text-left px-2 py-1.5">Status</th>
						<th class="text-left px-2 py-1.5" title="Urgency 0–3; higher numbers mean higher priority.">
							Priority
						</th>
						<th
							class="text-left px-2 py-1.5"
							title="Investigator: you added this row on Workflow. Proposal: created when you accepted a workflow suggestion from the Workflow proposal queue below."
						>
							Origin
						</th>
						<th class="text-left px-2 py-1.5" title="Count of evidence links recorded on this workflow item.">
							Citations
						</th>
						<th
							class="text-left px-2 py-1.5 min-w-[11rem] max-w-[16rem]"
							title="Planning support references to Timeline, Notes, or Files (P60). Distinct from Citations."
						>
							Support refs
						</th>
						<th class="text-left px-2 py-1.5 w-24">Actions</th>
					</tr>
				</thead>
				<tbody>
					{#each items as item (item.id)}
						<tr
							data-workflow-item-row={item.id}
							data-testid={`workflow-item-row-${item.id}`}
							data-post-accept-highlight={item.id === highlightWorkflowItemId ? 'true' : 'false'}
							class="border-t border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors duration-300 {item.deleted_at
								? 'opacity-70'
								: ''} {item.id === highlightWorkflowItemId
								? 'ring-2 ring-inset ring-amber-400/85 dark:ring-amber-500/45 bg-amber-50/70 dark:bg-amber-950/35'
								: ''}"
						>
							<td class="px-2 py-1.5">
								<span class="font-medium">{formatWorkflowItemTypeForDisplay(item.type)}</span>
								{#if item.deleted_at}
									<span class="ml-1 text-xs text-amber-600 dark:text-amber-400">(deleted)</span>
								{/if}
							</td>
							<td class="px-2 py-1.5 min-w-0 align-top">
								<div class="font-medium break-words">{item.title}</div>
								{#if item.description}
									<div class="text-xs text-gray-500 break-words">{item.description}</div>
								{/if}
								{#if item.entity_type && item.entity_normalized_id}
									<button
										type="button"
										class="mt-0.5 text-xs text-blue-600 dark:text-blue-400 hover:underline"
										on:click={() => openEntityWorkspace(item.entity_type, item.entity_normalized_id)}
									>
										Entity: {item.entity_type} / {item.entity_normalized_id}
									</button>
								{/if}
							</td>
							<td class="px-2 py-1.5">
								<span
									class={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${getStatusBadgeClasses(
										item.status
									)}`}
								>
									{formatWorkflowStatusForDisplay(item.status)}
								</span>
							</td>
							<td class="px-2 py-1.5">
								{#if item.priority != null}
									<span class="inline-flex items-center gap-1 text-xs">
										{#if getPriorityEmoji(item.priority)}
											<span aria-hidden="true">{getPriorityEmoji(item.priority)}</span>
										{/if}
										<span>Priority {item.priority}</span>
									</span>
								{:else}
									<span class="text-xs text-gray-400">—</span>
								{/if}
							</td>
							<td class="px-2 py-1.5 text-xs">
								<span
									class={`inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium ${getOriginBadgeClasses(
										item.origin
									)}`}
								>
									{formatWorkflowOriginForDisplay(item.origin)}
								</span>
							</td>
							<td class="px-2 py-1.5 text-xs">
								{#if item.citations?.length}
									{item.citations.length} citation(s)
								{:else}
									—
								{/if}
							</td>
							<td class="px-2 py-1.5 text-[10px] sm:text-[11px] align-top min-w-0 max-w-[16rem]">
								{#if item.deleted_at}
									<span class="text-gray-400">—</span>
								{:else if supportRowIndex && (supportLinksByItemId[item.id]?.length ?? 0) > 0}
									<div class="flex flex-col gap-1" data-testid={`workflow-item-support-link-chips-${item.id}`}>
										<div class="flex flex-wrap gap-1">
											{#each supportLinksByItemId[item.id] as sl (sl.id)}
												<a
													data-testid={`workflow-support-link-row-chip-${sl.id}`}
													href={hrefForSupportLinkTarget(caseId, sl.target_kind, sl.target_id)}
													class="inline-flex max-w-full min-w-0 items-center gap-0.5 rounded border border-gray-200/90 dark:border-gray-600/80 bg-white/85 dark:bg-gray-950/35 px-1 py-0.5 leading-tight text-gray-800 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-800/55 focus:outline-none focus:ring-2 focus:ring-blue-400/60"
													title={primaryLabelForSupportLink(sl, supportRowIndex)}
												>
													<span
														class="shrink-0 rounded-sm border px-0.5 text-[9px] font-semibold uppercase tracking-wide {supportLinkKindBadgeClass[
															sl.target_kind
														]}"
														data-testid={`workflow-support-link-chip-kind-${sl.target_kind}`}
													>
														{supportLinkKindShortLabel[sl.target_kind]}
													</span>
													<span class="truncate min-w-0 text-[10px] font-medium">
														{primaryLabelForSupportLink(sl, supportRowIndex)}
													</span>
													{#if isWorkflowSupportLinkStale(sl)}
														<span
															class="shrink-0 font-bold text-amber-700 dark:text-amber-300"
															data-testid="workflow-support-link-row-stale"
															title="Stale: target removed or unavailable"
														>
															↯
														</span>
													{/if}
												</a>
											{/each}
										</div>
									</div>
								{:else if supportRowIndex}
									<span class="text-gray-400" data-testid="workflow-item-support-links-none">—</span>
								{:else}
									<span class="text-gray-400" title="Loading support summary…">…</span>
								{/if}
							</td>
							<td class="px-2 py-1.5 align-top">
								<div class="flex flex-wrap gap-x-2 gap-y-1 min-w-0">
								{#if !item.deleted_at}
									<button
										type="button"
										data-testid="workflow-item-support-refs"
										data-item-id={item.id}
										class="text-xs text-blue-600 dark:text-blue-400 hover:underline"
										on:click={() => (supportPanelItem = item)}
									>
										Support refs
									</button>
									<button
										type="button"
										class="text-xs text-blue-600 dark:text-blue-400 hover:underline"
										on:click={() => openEdit(item)}
									>
										Edit
									</button>
									<button
										type="button"
										class="text-xs text-red-600 dark:text-red-400 hover:underline"
										on:click={() => confirmDelete(item)}
									>
										Delete
									</button>
								{:else if isAdmin}
									<button
										type="button"
										class="text-xs text-green-600 dark:text-green-400 hover:underline"
										on:click={() => confirmRestore(item)}
									>
										Restore
									</button>
								{/if}
								</div>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
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
		class="flex flex-col gap-2 min-w-0 shrink-0 rounded-lg border border-gray-200/90 dark:border-gray-700/85 bg-gray-50/70 dark:bg-gray-900/40 shadow-sm {embedded
			? 'mt-3 p-2.5 pb-2.5'
			: 'mt-5 p-4 pb-4'}"
		aria-label="Workflow proposal queue — suggestions for workflow items, separate from case Proposals drafts"
	>
			<div
				class="space-y-0.5 pb-3 border-b border-gray-200/55 dark:border-gray-700/55 {embedded ? 'mb-1.5' : 'mb-2.5'}"
			>
				<h3 class="text-sm font-semibold text-gray-800 dark:text-gray-200">Workflow proposal queue</h3>
				<p class="text-xs text-gray-600 dark:text-gray-400 max-w-prose leading-relaxed">
					Pending suggestions that would add or update workflow items only; this queue is not the case Proposals tab—timeline
					and note drafts awaiting commit live on the case Proposals tab instead.
				</p>
			</div>
			{#if proposalMutationInFlight}
				<p
					data-testid="workflow-proposal-action-in-flight"
					class="text-xs text-amber-800/95 dark:text-amber-200/90 font-medium"
					aria-live="polite"
				>
					Updating proposal…
				</p>
			{/if}
			{#if proposalsLoading}
				<div
					data-testid="workflow-proposals-state-shell"
					class="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50/40 dark:bg-gray-900/30 min-w-0 {embedded
						? 'p-2'
						: 'p-2.5'}"
				>
					<CaseLoadingState label="Loading workflow proposals…" testId="workflow-proposals-loading" />
				</div>
			{:else if proposalError}
				<!-- ── Proposal load error (P28-51); P59-07 shell cohesion ───────────────── -->
				<div
					data-testid="workflow-proposals-state-shell"
					class="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50/40 dark:bg-gray-900/30 min-w-0 {embedded
						? 'p-2'
						: 'p-2.5'}"
				>
					<CaseErrorState message={proposalError} onRetry={loadProposals} />
				</div>
			{:else if proposals.length === 0}
				<div
					data-testid="workflow-proposals-state-shell"
					class="rounded-lg border border-dashed border-gray-300/90 dark:border-gray-600/80 bg-white/50 dark:bg-gray-950/30 min-w-0 {embedded
						? 'px-2 py-1.5'
						: 'px-2.5 py-2'}"
				>
					<CaseEmptyState
						framed={false}
						title="No workflow proposals yet."
						description="When intake suggests a new or changed workflow item, it will appear here. Official timeline or note drafts are listed separately under Proposals."
						testId="workflow-proposals-empty"
					/>
				</div>
			{:else}
				<div
					data-testid="workflow-proposals-list-scroll"
					class="border border-gray-200 dark:border-gray-700 rounded divide-y divide-gray-200 dark:divide-gray-800 min-w-0 overflow-x-auto overflow-y-auto overscroll-x-contain {embedded
						? 'max-h-[min(36vh,12rem)]'
						: 'max-h-[40vh]'}"
				>
					{#each proposals as p (p.id)}
						<div class="p-2 text-sm min-w-0">
							<div class="flex flex-wrap items-center gap-x-2 gap-y-1 justify-between min-w-0">
								<div class="flex flex-wrap items-center gap-2 min-w-0">
									<span class="text-xs px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 shrink-0">
										{proposalTypeLabel(p)}
									</span>
									<span
										class="text-xs px-1.5 py-0.5 rounded shrink-0 {proposalStatusBadgeClasses(p.status)}"
									>
										{formatWorkflowStatusForDisplay(p.status)}
									</span>
								</div>
								<span class="text-xs text-gray-500 shrink-0 tabular-nums sm:ml-auto">
									{p.created_at?.slice?.(0, 19) ?? p.created_at}
								</span>
							</div>
							<div class="mt-1 font-medium break-words min-w-0">
								{p.suggested_payload?.title ?? '(no title)'}
							</div>
							{#if p.suggested_payload?.description}
								<div class="mt-0.5 text-xs text-gray-500 line-clamp-2 break-words">
									{p.suggested_payload.description}
								</div>
							{/if}
							<div class="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-500 min-w-0">
								<span class="break-words">Type: {proposedItemTypeDisplay(p)}</span>
								{#if p.suggested_payload?.priority != null}
									<span class="shrink-0">Priority: {p.suggested_payload.priority}</span>
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
									class="mt-1 text-xs text-blue-600 dark:text-blue-400 hover:underline"
									on:click={() => (expandedProposalId = expandedProposalId === p.id ? null : p.id)}
								>
									{expandedProposalId === p.id ? 'Hide details' : 'View details'}
								</button>
							{/if}
							{#if expandedProposalId === p.id}
								<div class="mt-2 border-t border-gray-200 dark:border-gray-700 pt-2 text-xs space-y-2">
									{#if p.suggested_payload}
										<div>
											<div class="font-medium mb-1">Suggested workflow item</div>
											<div>
												Type: {p.suggested_payload.type != null && String(p.suggested_payload.type).trim() !== ''
													? formatWorkflowItemTypeForDisplay(String(p.suggested_payload.type))
													: proposedItemTypeDisplay(p)}
											</div>
											{#if p.suggested_payload.status}
												<div>Status: {formatWorkflowStatusForDisplay(p.suggested_payload.status)}</div>
											{/if}
											{#if p.suggested_payload.priority != null}
												<div>Priority: {p.suggested_payload.priority}</div>
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
										class="text-xs text-green-700 dark:text-green-300 hover:underline disabled:opacity-40 disabled:pointer-events-none disabled:cursor-not-allowed disabled:no-underline"
										on:click={() => openAccept(p)}
									>
										Accept
									</button>
									<button
										type="button"
										disabled={proposalMutationInFlight}
										class="text-xs text-red-700 dark:text-red-300 hover:underline disabled:opacity-40 disabled:pointer-events-none disabled:cursor-not-allowed disabled:no-underline"
										on:click={() => openReject(p)}
									>
										Reject
									</button>
								{:else if hasWorkflowLink(p)}
									<button
										type="button"
										class="text-xs text-blue-600 dark:text-blue-400 hover:underline"
										on:click={() => {
											if (p.workflow_item_id) void orientToWorkflowItemRow(p.workflow_item_id);
										}}
									>
										View workflow item
									</button>
								{/if}
							</div>
						</div>
					{/each}
				</div>
			{/if}
	</section>

	<!-- P59-02 guidance; P59-10 collapse; P59-12/P59-14 collapsed = lighter footer strip (dashed top, transparent gutter) below proposal panel -->
	<section
		data-testid="workflow-guidance-placeholder"
		data-workflow-guidance-footer={guidanceExpanded ? undefined : 'true'}
		class="scroll-mt-3 transition-colors shrink-0 {guidanceExpanded
			? embedded
				? 'mt-2 rounded-md border border-gray-200/90 dark:border-gray-700 bg-gray-50/40 dark:bg-gray-900/30 px-2 py-2'
				: 'mt-3 rounded-md border border-gray-200/90 dark:border-gray-700 bg-gray-50/40 dark:bg-gray-900/30 px-3 py-2.5'
			: embedded
				? 'mt-7 pt-4 border-0 border-t border-dashed border-gray-300/55 dark:border-gray-600/35 bg-transparent px-0.5'
				: 'mt-9 pt-5 border-0 border-t border-dashed border-gray-300/65 dark:border-gray-700/40 bg-transparent px-0.5'}"
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
							: 'text-[11px]'} {guidanceExpanded
						? 'font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400'
						: 'font-medium uppercase tracking-wider text-gray-400/75 dark:text-gray-500/70'}"
				>
					Guidance
				</h3>
				{#if !guidanceExpanded}
					<p
						class="text-[10px] leading-snug mt-1 max-w-prose text-gray-400/70 dark:text-gray-500/65"
					>
						Jump to other case tabs or expand for full advisory path and journey hints.
					</p>
				{/if}
			</div>
			<button
				type="button"
				data-testid="workflow-guidance-toggle"
				aria-expanded={guidanceExpanded}
				aria-label={guidanceExpanded ? 'Collapse guidance and case shortcuts' : 'Expand guidance and case shortcuts'}
				class="shrink-0 rounded-md border border-gray-200/90 dark:border-gray-600/80 text-xs font-medium px-2 py-1 text-gray-700 dark:text-gray-200 bg-white/80 dark:bg-gray-900/50 hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-400"
				on:click={() => void toggleGuidanceExpanded()}
			>
				{guidanceExpanded ? 'Collapse guidance' : 'Expand guidance'}
			</button>
		</div>
		<div
			data-testid="workflow-guidance-expanded-body"
			class="mt-2 space-y-2 {guidanceExpanded ? '' : 'hidden'}"
			aria-hidden={!guidanceExpanded}
		>
			<p
				data-testid="workflow-guidance-placeholder-copy"
				class="text-gray-500 dark:text-gray-400 leading-snug {embedded ? 'text-[10px]' : 'text-[11px]'}"
			>
				Advisory path only—use what fits the case. Workflow stays planning; shortcuts below open other surfaces on the
				same case without committing the official Timeline from here.
			</p>
			<ol
				data-testid="workflow-journey-landmarks"
				class="list-decimal max-w-prose text-gray-600 dark:text-gray-400 {embedded
					? 'pl-3 space-y-0.5 text-[10px] leading-snug'
					: 'pl-4 space-y-1.5 text-[11px] leading-snug'}"
			>
				<li data-testid="workflow-journey-step-1">
					<span class="font-medium text-gray-700 dark:text-gray-300">See what needs focus.</span>
					Start with Attention and the list; pending <span class="font-medium text-gray-700 dark:text-gray-300"
						>workflow suggestions</span
					>
					live in the Workflow proposal queue section below—not the case <span
						class="font-medium text-gray-700 dark:text-gray-300">Proposals</span
					>
					tab.
				</li>
				<li data-testid="workflow-journey-step-2">
					<span class="font-medium text-gray-700 dark:text-gray-300">Shape planning on Workflow.</span>
					Refine hypotheses and gaps; accept or reject workflow-item suggestions here. This tab does not publish official
					Timeline rows.
				</li>
				<li data-testid="workflow-journey-step-3">
					<span class="font-medium text-gray-700 dark:text-gray-300">Switch surfaces when the work fits.</span>
					Use the links below for Files, Notes, Summary, Timeline, or governed timeline/note proposals.
				</li>
				<li data-testid="workflow-journey-step-4">
					<span class="font-medium text-gray-700 dark:text-gray-300">Keep official work governed.</span>
					Committed Timeline entries and governed drafts move through review on <span
						class="font-medium text-gray-700 dark:text-gray-300">Timeline</span
					>
					and <span class="font-medium text-gray-700 dark:text-gray-300">Proposals</span>—not through Workflow alone.
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
					title="Case summary"
					>Summary</a
				>
				<a
					data-testid="workflow-deep-link-proposals"
					href="/case/{caseId}/proposals"
					class={workflowEmbedNavLinkClass}
					title="Governed timeline and note proposals — review and commit there (separate from the Workflow proposal queue on this tab)"
					>Proposals</a
				>
			</nav>
		</div>
	</section>
</div>

<!-- Create modal -->
{#if createOpen}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
		role="dialog"
		aria-modal="true"
		aria-labelledby="create-workflow-title"
	>
		<div class="bg-white dark:bg-gray-900 rounded-lg shadow-lg max-w-md w-full mx-4 p-4 max-h-[90vh] overflow-auto">
			<h3 id="create-workflow-title" class="font-medium mb-3">Create workflow item</h3>
			<form on:submit|preventDefault={submitCreate} class="flex flex-col gap-3">
				<div>
					<label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Type</label>
					<select
						bind:value={createType}
						class="w-full text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 bg-white dark:bg-gray-800"
					>
						<option value="HYPOTHESIS">{formatWorkflowItemTypeForDisplay('HYPOTHESIS')}</option>
						<option value="GAP">{formatWorkflowItemTypeForDisplay('GAP')}</option>
					</select>
				</div>
				<div>
					<label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Title *</label>
					<input
						type="text"
						bind:value={createTitle}
						class="w-full text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 bg-white dark:bg-gray-800"
						placeholder="Short title"
					/>
				</div>
				<div>
					<label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Description</label>
					<textarea
						bind:value={createDescription}
						rows="2"
						class="w-full text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 bg-white dark:bg-gray-800"
						placeholder="Optional"
					></textarea>
				</div>
				<div>
					<label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Status</label>
					<select
						bind:value={createStatus}
						class="w-full text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 bg-white dark:bg-gray-800"
					>
						{#each statusOptionsCreate as s}
							<option value={s}>{formatWorkflowStatusForDisplay(s)}</option>
						{/each}
					</select>
				</div>
				<div>
					<label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Priority (number)</label>
					<input
						type="number"
						bind:value={createPriority}
						class="w-full text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 bg-white dark:bg-gray-800"
						placeholder="Optional"
					/>
				</div>
				<div class="flex gap-2 justify-end pt-2">
					<button type="button" class="px-3 py-1.5 text-sm rounded hover:bg-gray-100 dark:hover:bg-gray-800" on:click={closeCreate}>
						Cancel
					</button>
					<button
						type="submit"
						class="px-3 py-1.5 text-sm rounded bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50"
						disabled={createSubmitting}
					>
						{createSubmitting ? 'Creating…' : 'Create'}
					</button>
				</div>
			</form>
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
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
		role="dialog"
		aria-modal="true"
		aria-labelledby="edit-workflow-title"
	>
		<div class="bg-white dark:bg-gray-900 rounded-lg shadow-lg max-w-md w-full mx-4 p-4 max-h-[90vh] overflow-auto">
			<h3 id="edit-workflow-title" class="font-medium mb-3">
				Edit workflow item ({formatWorkflowItemTypeForDisplay(editItem.type)})
			</h3>
			<form on:submit|preventDefault={submitEdit} class="flex flex-col gap-3">
				<div>
					<label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Title *</label>
					<input
						type="text"
						bind:value={editTitle}
						class="w-full text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 bg-white dark:bg-gray-800"
					/>
				</div>
				<div>
					<label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Description</label>
					<textarea
						bind:value={editDescription}
						rows="2"
						class="w-full text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 bg-white dark:bg-gray-800"
					></textarea>
				</div>
				<div>
					<label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Status</label>
					<select
						bind:value={editStatus}
						class="w-full text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 bg-white dark:bg-gray-800"
					>
						{#each editStatusOptions as s}
							<option value={s}>{formatWorkflowStatusForDisplay(s)}</option>
						{/each}
					</select>
				</div>
				<div>
					<label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Priority (number)</label>
					<input
						type="number"
						bind:value={editPriority}
						class="w-full text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 bg-white dark:bg-gray-800"
					/>
				</div>
				<div class="flex gap-2 justify-end pt-2">
					<button type="button" class="px-3 py-1.5 text-sm rounded hover:bg-gray-100 dark:hover:bg-gray-800" on:click={closeEdit}>
						Cancel
					</button>
					<button
						type="submit"
						class="px-3 py-1.5 text-sm rounded bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50"
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
	title="Accept proposal?"
	message="Creates a workflow planning item from this suggestion. It does not publish to the official Timeline—use the case Proposals tab for governed timeline and note drafts."
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
	title="Reject proposal?"
	message="This proposal will be marked as rejected. No workflow item will be created."
	input={true}
	inputPlaceholder="Reason for rejection (optional)"
	bind:inputValue={rejectReason}
	cancelLabel="Cancel"
	confirmLabel="Reject"
	onConfirm={confirmReject}
	on:cancel={cancelReject}
/>
