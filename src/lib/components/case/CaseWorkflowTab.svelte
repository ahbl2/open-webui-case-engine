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
	import { CASE_DESTINATION_LABELS, CASE_DESTINATION_TITLES } from '$lib/utils/caseDestinationLabels';
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
	import {
		DS_BADGE_CLASSES,
		DS_BTN_CLASSES,
		DS_MODAL_CLASSES,
		DS_OVERLAY_CLASSES,
		DS_STATUS_TEXT_CLASSES,
		DS_TIMELINE_CLASSES,
		DS_TYPE_CLASSES,
		DS_WORKFLOW_CLASSES,
		DS_WORKFLOW_TEXT_CLASSES
	} from '$lib/case/detectivePrimitiveFoundation';
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
	let proposals: WorkflowProposal[] = [];
	/** P78-06: pending-only triage list; history is derived from the same `loadProposals` payload (count matches attention chip). */
	$: pendingProposals = proposals.filter((p) => String(p.status).toUpperCase() === 'PENDING');
	$: historyProposals = proposals.filter((p) => String(p.status).toUpperCase() !== 'PENDING');
	$: proposalCount = pendingProposals.length;
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

	/** P59-10: guidance toggle (local only). P78-07: default-open so next-step journey + links are visible without expansion. */
	let guidanceExpanded = true;
	/** Full-page intro: P78-07 default-open for operator orientation; user may collapse (local only). */
	let narrativeExpanded = true;

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
		guidanceExpanded = true;
		narrativeExpanded = true;
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
		} catch (e) {
			toast.error((e as Error)?.message ?? 'Accept failed');
			// Defensive refresh in case proposal was already resolved elsewhere.
			await loadProposals();
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
			await loadProposals();
		} catch (e) {
			toast.error((e as Error)?.message ?? 'Reject failed');
			// Defensive refresh in case proposal was already resolved elsewhere.
			await loadProposals();
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
	<header data-testid="workflow-page-header" class={embedded ? 'space-y-0.5 shrink-0' : 'space-y-1 shrink-0'}>
		{#if embedded}
		<h2
			class="{embedded
				? 'text-sm'
				: 'text-base'} font-semibold tracking-tight {DS_TYPE_CLASSES.section}"
		>
			Workflow
		</h2>
		{/if}
		<div
			data-testid="workflow-narrative-intro"
			class="{embedded ? 'space-y-0.5' : 'space-y-2'} max-w-prose"
		>
			{#if !embedded}
				<div class="flex flex-wrap items-start justify-between gap-2">
					<div class="min-w-0 flex-1 space-y-1">
						{#if !narrativeExpanded}
							<p class="leading-snug {DS_WORKFLOW_TEXT_CLASSES.doctrineProse}">
								<span class="{DS_WORKFLOW_TEXT_CLASSES.doctrineEmphasis}">This Workflow tab</span> is the planning
								layer (hypotheses &amp; gaps)—not the official record. The
								<span class="{DS_WORKFLOW_TEXT_CLASSES.doctrineEmphasis}">case Proposals</span> tab holds governed
								timeline and note drafts. The
								<span class="{DS_WORKFLOW_TEXT_CLASSES.doctrineEmphasis}">workflow proposal queue</span> below is
								only for workflow-item suggestions on this tab—not case proposals.
							</p>
						{:else}
							<p class="font-medium {DS_TYPE_CLASSES.meta}">Full operator intro</p>
						{/if}
					</div>
					<button
						type="button"
						data-testid="workflow-narrative-toggle"
						aria-expanded={narrativeExpanded}
						class="{DS_WORKFLOW_CLASSES.narrativeToggle} shrink-0"
						on:click={() => (narrativeExpanded = !narrativeExpanded)}
					>
						{narrativeExpanded ? 'Hide full intro' : 'Show full intro'}
					</button>
				</div>
				{#if narrativeExpanded}
					<div class="space-y-1.5 {DS_WORKFLOW_CLASSES.doctrineBlock}">
						<p class="leading-relaxed {DS_WORKFLOW_TEXT_CLASSES.doctrineProse}">
							Workflow is your <span class="{DS_WORKFLOW_TEXT_CLASSES.doctrineEmphasis}">planning layer</span> for
							this case: hypotheses you are testing and gaps you still need to close. It supports the investigation;
							it is <span class="{DS_WORKFLOW_TEXT_CLASSES.doctrineEmphasis}">not</span> the official case record.
						</p>
						<p class="leading-relaxed {DS_WORKFLOW_TEXT_CLASSES.doctrineProse}">
							The case <span class="{DS_WORKFLOW_TEXT_CLASSES.doctrineStrong}">Proposals</span> tab holds governed
							drafts—timeline entries and notes—that can become official only after review and commit
							<span class="whitespace-nowrap">there</span>. Suggestions that add or change
							<span class="{DS_WORKFLOW_TEXT_CLASSES.doctrineStrong}">workflow items</span> land in the
							<span class="{DS_WORKFLOW_TEXT_CLASSES.doctrineStrong}">workflow proposal queue</span> below; accept
							or reject them here.
						</p>
					</div>
				{/if}
			{:else}
				<p class="leading-snug {DS_WORKFLOW_TEXT_CLASSES.embedCompactProse}">
					<span class="{DS_WORKFLOW_TEXT_CLASSES.doctrineEmphasis}">Planning (this tab):</span> hypotheses &amp; gaps (not
					the official Timeline). <span class="{DS_WORKFLOW_TEXT_CLASSES.doctrineEmphasis}">Case Proposals tab:</span>
					governed timeline/note drafts. <span class="{DS_WORKFLOW_TEXT_CLASSES.doctrineEmphasis}">Below:</span>
					workflow proposal queue (not case Proposals).
				</p>
			{/if}
		</div>
	</header>

	<!-- P59-02: attention shell — P59-03: client-derived signals (no new fetches) -->
	<section
		data-testid="workflow-attention-region"
		class="{DS_WORKFLOW_CLASSES.attentionRegion} shrink-0 {embedded
			? 'px-2 py-2'
			: 'px-3 py-2.5'}"
		aria-label="Attention and priorities"
	>
		<h3
			class="{embedded ? 'text-[11px]' : 'text-xs'} {DS_WORKFLOW_CLASSES.sectionEyebrow}"
		>
			Attention
		</h3>
		<div
			data-testid="workflow-attention-signals"
			class="flex flex-wrap items-stretch {embedded ? 'mt-1.5 gap-1.5' : 'mt-2 gap-2'}"
		>
			<div
				class="{DS_WORKFLOW_CLASSES.attentionChip} {embedded
					? 'px-1.5 py-1 sm:flex-row sm:items-baseline sm:gap-1.5'
					: 'px-2 py-1.5 sm:flex-row sm:items-baseline sm:gap-2'}"
				data-testid="workflow-attention-pending-chip"
				title="Pending in the workflow proposal queue on this Workflow tab—not pending case proposals on the case Proposals tab"
			>
				<span class="text-[11px] leading-tight {DS_TYPE_CLASSES.meta}"
					>Pending in workflow queue</span
				>
				<span
					data-testid="workflow-attention-pending-count"
					class="text-sm font-semibold tabular-nums {DS_TYPE_CLASSES.section}"
					>{proposalCount}</span
				>
			</div>

			{#if loadError}
				<div
					data-testid="workflow-attention-list-error"
					class="{DS_WORKFLOW_CLASSES.attentionChip} {DS_WORKFLOW_CLASSES.attentionChipError} {embedded
						? 'px-1.5 py-1'
						: 'px-2 py-1.5'}"
				>
					<p class="max-w-prose text-[11px] leading-snug {DS_STATUS_TEXT_CLASSES.danger}">
						<span class="font-medium">List unavailable</span> — workflow items did not load. Use
						<span class="font-medium">Try again</span> in the list block below.
					</p>
				</div>
			{:else if loading}
				<div
					data-testid="workflow-attention-list-loading"
					class="{DS_WORKFLOW_CLASSES.attentionChip} {DS_WORKFLOW_CLASSES.attentionChipLoading} {embedded
						? 'px-1.5 py-1'
						: 'px-2 py-1.5'}"
				>
					<p class="text-[11px] leading-snug {DS_TYPE_CLASSES.meta}">Loading workflow items…</p>
				</div>
			{:else}
				<div
					class="{DS_WORKFLOW_CLASSES.attentionChip} {embedded
						? 'px-1.5 py-1 sm:flex-row sm:items-baseline sm:gap-1.5'
						: 'px-2 py-1.5 sm:flex-row sm:items-baseline sm:gap-2'}"
					data-testid="workflow-attention-listed-chip"
					title="Count for the current type filter and list settings—planning workspace only"
				>
					<span class="text-[11px] leading-tight {DS_TYPE_CLASSES.meta}">Items in this list</span>
					<span class="flex flex-wrap items-baseline gap-x-1.5 gap-y-0">
						<span
							data-testid="workflow-attention-listed-count"
							class="text-sm font-semibold tabular-nums {DS_TYPE_CLASSES.section}">{items.length}</span
						>
						<span
							data-testid="workflow-attention-filter-scope"
							class="text-[10px] font-medium {DS_TYPE_CLASSES.meta}">({attentionFilterScopeLabel})</span
						>
					</span>
					{#if isAdmin && includeDeleted}
						<span
							data-testid="workflow-attention-includes-deleted"
							class="text-[10px] {DS_TYPE_CLASSES.meta}">Includes deleted rows</span
						>
					{/if}
				</div>
				<div
					class="{DS_WORKFLOW_CLASSES.attentionChip} {embedded
						? 'px-1.5 py-1 sm:flex-row sm:items-baseline sm:gap-1.5'
						: 'px-2 py-1.5 sm:flex-row sm:items-baseline sm:gap-2'}"
					data-testid="workflow-attention-open-chip"
					title="Workflow items in OPEN status in this list (planning state, not Timeline)"
				>
					<span class="text-[11px] leading-tight {DS_TYPE_CLASSES.meta}">Open items in this list</span>
					<span
						data-testid="workflow-attention-open-count"
						class="text-sm font-semibold tabular-nums {DS_TYPE_CLASSES.section}">{attentionOpenInView ??
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
			<p class="text-xs font-semibold uppercase tracking-wide {DS_TYPE_CLASSES.meta}">Workflow items</p>
			<p class="mt-0.5 max-w-prose text-[11px] leading-snug {DS_TYPE_CLASSES.meta}">
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
				class="{DS_WORKFLOW_CLASSES.filterCluster} min-w-0 {embedded
					? 'px-2 py-2'
					: 'px-3 py-2.5'}"
			>
				<span class="shrink-0 text-xs font-medium {DS_TYPE_CLASSES.meta}">Show:</span>
				<button
					type="button"
					class="{DS_WORKFLOW_CLASSES.filterTab} {filter === 'all' ? DS_WORKFLOW_CLASSES.filterTabActive : ''}"
					on:click={() => {
						filter = 'all';
						loadItems();
					}}
				>
					All
				</button>
				<button
					type="button"
					class="{DS_WORKFLOW_CLASSES.filterTab} {filter === 'HYPOTHESIS' ? DS_WORKFLOW_CLASSES.filterTabActive : ''}"
					on:click={() => {
						filter = 'HYPOTHESIS';
						loadItems();
					}}
				>
					Hypotheses
				</button>
				<button
					type="button"
					class="{DS_WORKFLOW_CLASSES.filterTab} {filter === 'GAP' ? DS_WORKFLOW_CLASSES.filterTabActive : ''}"
					on:click={() => {
						filter = 'GAP';
						loadItems();
					}}
				>
					Gaps
				</button>
				{#if isAdmin}
					<label
						class="flex w-full items-center gap-1.5 text-sm sm:ml-1 sm:w-auto sm:border-l sm:pl-3 {DS_TYPE_CLASSES.body}"
					>
						<input type="checkbox" bind:checked={includeDeleted} on:change={loadItems} />
						Include deleted
					</label>
				{/if}
			</div>
			<button
				type="button"
				class="{DS_WORKFLOW_CLASSES.createToolbarBtn} shrink-0"
				on:click={openCreate}
			>
				Create workflow item
			</button>
		</div>
	</section>

	{#if createResultMessage}
		<div
			class="{DS_WORKFLOW_CLASSES.resultBanner} {createResultTone === 'ok'
				? DS_WORKFLOW_CLASSES.resultBannerOk
				: createResultTone === 'error'
					? DS_WORKFLOW_CLASSES.resultBannerErr
					: DS_WORKFLOW_CLASSES.resultBannerWarn}"
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
			<CaseErrorState message={loadError} onRetry={loadItems} />
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
				title={filter === 'HYPOTHESIS' ? 'No hypotheses yet.' : filter === 'GAP' ? 'No gaps yet.' : 'No workflow items yet.'}
				description={filter === 'HYPOTHESIS'
					? 'Capture what you are testing—Workflow plans the line of inquiry; official facts still go through Timeline after governed intake.'
					: filter === 'GAP'
						? 'Capture what evidence or facts you still need. Closing a gap may later tie to Timeline entries via the case Proposals tab—not directly from here.'
						: 'Add hypotheses and gaps to steer the case. Use the case Proposals tab when you have governed timeline or note drafts to review and commit.'}
			>
				<div
					slot="action"
					class="mt-3 flex flex-col gap-2"
					data-testid="workflow-items-empty-next-steps"
				>
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
			data-testid="workflow-items-table-scroll"
			class="{DS_WORKFLOW_CLASSES.tableScroll} {embedded
				? 'max-h-[min(46vh,14.5rem)]'
				: 'min-h-[14rem] max-h-[min(50vh,36rem)]'}"
		>
			<table class="{DS_WORKFLOW_CLASSES.table}">
				<thead class="{DS_WORKFLOW_CLASSES.thead}">
					<tr>
						<th class="{DS_WORKFLOW_CLASSES.th}">Type</th>
						<th class="{DS_WORKFLOW_CLASSES.th}">Title</th>
						<th class="{DS_WORKFLOW_CLASSES.th}">Status</th>
						<th class="{DS_WORKFLOW_CLASSES.th}" title="Urgency 0–3; higher numbers mean higher priority.">
							Priority
						</th>
						<th
							class="{DS_WORKFLOW_CLASSES.th}"
							title="Investigator: you added this row on the Workflow tab. System: created when you accepted a workflow suggestion from the workflow proposal queue below (not the case Proposals tab)."
						>
							Origin
						</th>
						<th class="{DS_WORKFLOW_CLASSES.th}" title="Count of evidence links recorded on this workflow item.">
							Citations
						</th>
						<th
							class="{DS_WORKFLOW_CLASSES.th} min-w-[11rem] max-w-[16rem]"
							title="Planning support references to Timeline, Notes, or Files (P60). Distinct from Citations."
						>
							Support refs
						</th>
						<th class="{DS_WORKFLOW_CLASSES.th} w-24">Actions</th>
					</tr>
				</thead>
				<tbody>
					{#each items as item (item.id)}
						<tr
							data-workflow-item-row={item.id}
							data-testid={`workflow-item-row-${item.id}`}
							data-post-accept-highlight={item.id === highlightWorkflowItemId ? 'true' : 'false'}
							class="{DS_WORKFLOW_CLASSES.tbodyRow} transition-colors duration-300 {item.deleted_at
								? DS_WORKFLOW_CLASSES.tbodyRowDeleted
								: ''} {item.id === highlightWorkflowItemId
								? DS_WORKFLOW_CLASSES.tbodyRowHighlight
								: ''}"
						>
							<td class="px-2 py-1.5">
								<span class="font-medium {DS_TYPE_CLASSES.body}">{formatWorkflowItemTypeForDisplay(item.type)}</span>
								{#if item.deleted_at}
									<span class="ml-1 text-xs {DS_STATUS_TEXT_CLASSES.warning}">(deleted)</span>
								{/if}
							</td>
							<td class="px-2 py-1.5 min-w-0 align-top">
								<div class="break-words font-medium {DS_TYPE_CLASSES.body}">{item.title}</div>
								{#if item.description}
									<div class="break-words text-xs {DS_TYPE_CLASSES.meta}">{item.description}</div>
								{/if}
								{#if item.entity_type && item.entity_normalized_id}
									<button
										type="button"
										class="mt-0.5 text-xs {DS_WORKFLOW_CLASSES.inlineAction}"
										on:click={() => openEntityWorkspace(item.entity_type, item.entity_normalized_id)}
									>
										Entity: {item.entity_type} / {item.entity_normalized_id}
									</button>
								{/if}
							</td>
							<td class="px-2 py-1.5">
								<span class={getStatusBadgeClasses(item.status)}>
									{formatWorkflowStatusForDisplay(item.status)}
								</span>
							</td>
							<td class="px-2 py-1.5">
								{#if item.priority != null}
									<span class="inline-flex items-center gap-1 text-xs {DS_TYPE_CLASSES.meta}">
										{#if getPriorityEmoji(item.priority)}
											<span aria-hidden="true">{getPriorityEmoji(item.priority)}</span>
										{/if}
										<span>Priority {item.priority}</span>
									</span>
								{:else}
									<span class="text-xs {DS_TYPE_CLASSES.meta}">—</span>
								{/if}
							</td>
							<td class="px-2 py-1.5 text-xs">
								<span class={getOriginBadgeClasses(item.origin)}>
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
									<span class="{DS_TYPE_CLASSES.meta}">—</span>
								{:else if supportRowIndex && (supportLinksByItemId[item.id]?.length ?? 0) > 0}
									<div class="flex flex-col gap-1" data-testid={`workflow-item-support-link-chips-${item.id}`}>
										<div class="flex flex-wrap gap-1">
											{#each supportLinksByItemId[item.id] as sl (sl.id)}
												<a
													data-testid={`workflow-support-link-row-chip-${sl.id}`}
													href={hrefForSupportLinkTarget(caseId, sl.target_kind, sl.target_id)}
													class="{DS_WORKFLOW_CLASSES.supportRowChip}"
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
													{#if isWorkflowSupportLinkStale(sl)}
														<span
															class="shrink-0 font-bold {DS_STATUS_TEXT_CLASSES.warning}"
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
									<span class="{DS_TYPE_CLASSES.meta}" data-testid="workflow-item-support-links-none">—</span>
								{:else}
									<span class="{DS_TYPE_CLASSES.meta}" title="Loading support summary…">…</span>
								{/if}
							</td>
							<td class="px-2 py-1.5 align-top">
								<div class="flex min-w-0 flex-wrap gap-x-2 gap-y-1">
								{#if !item.deleted_at}
									<button
										type="button"
										data-testid="workflow-item-support-refs"
										data-item-id={item.id}
										class="text-xs {DS_WORKFLOW_CLASSES.inlineAction}"
										on:click={() => (supportPanelItem = item)}
									>
										Support refs
									</button>
									<button
										type="button"
										class="text-xs {DS_WORKFLOW_CLASSES.inlineAction}"
										on:click={() => openEdit(item)}
									>
										Edit
									</button>
									<button
										type="button"
										class="text-xs {DS_WORKFLOW_CLASSES.inlineAction} {DS_WORKFLOW_CLASSES.inlineActionDanger}"
										on:click={() => confirmDelete(item)}
									>
										Delete
									</button>
								{:else if isAdmin}
									<button
										type="button"
										class="text-xs {DS_WORKFLOW_CLASSES.inlineAction} {DS_WORKFLOW_CLASSES.inlineActionSuccess}"
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
		class="{DS_WORKFLOW_CLASSES.proposalsPanel} min-w-0 shrink-0 {embedded
			? 'mt-3 p-2.5 pb-2.5'
			: 'mt-5 p-4 pb-4'}"
		aria-label="Workflow proposal queue — suggestions for workflow items, separate from case Proposals drafts"
	>
			<div
				class="space-y-0.5 border-b border-[var(--ds-border-default)] pb-3 {embedded ? 'mb-1.5' : 'mb-2.5'}"
			>
				<h3 class="text-sm font-semibold {DS_TYPE_CLASSES.section}">Workflow proposal queue</h3>
				<p class="max-w-prose text-xs leading-relaxed {DS_TYPE_CLASSES.meta}">
					Primary list shows pending triage only (same count as Attention). This is the
					<span class="font-medium">workflow proposal queue</span> on the Workflow tab; this queue is not the case Proposals tab.
					Timeline and note drafts awaiting review and commit live on the case Proposals tab. Accepted or rejected
					workflow-queue items stay under Resolved history.
				</p>
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
					<CaseErrorState message={proposalError} onRetry={loadProposals} />
				</div>
			{:else if proposals.length === 0}
				<div
					data-testid="workflow-proposals-state-shell"
					class="{DS_WORKFLOW_CLASSES.listStateShell} {DS_WORKFLOW_CLASSES.listStateShellDashed} min-w-0 {embedded
						? 'px-2 py-1.5'
						: 'px-2.5 py-2'}"
				>
					<CaseEmptyState
						framed={false}
						title="Nothing in the workflow proposal queue yet."
						description="When intake suggests a new or changed workflow item, it appears in this queue on the Workflow tab. Governed timeline or note drafts for review and commit belong on the case Proposals tab—not here."
						testId="workflow-proposals-empty"
					>
						<div
							slot="action"
							class="mt-3 flex flex-col gap-2"
							data-testid="workflow-queue-empty-next-steps"
						>
							<p class="{DS_TYPE_CLASSES.meta} text-[color:var(--ce-l-text-secondary)]">
								This queue is empty for now. The case <span class="font-medium">Proposals</span> tab is the governed
								surface for P19 review—separate from this workflow proposal queue. Next steps on this case:
							</p>
							<div
								class="flex flex-wrap items-center gap-x-2 gap-y-1 {embedded ? 'text-[11px]' : 'text-xs'}"
								role="group"
								aria-label="Case tab shortcuts from workflow queue empty state"
							>
								<a
									data-testid="workflow-queue-empty-link-proposals"
									href="/case/{caseId}/proposals"
									class={workflowEmbedNavLinkClass}
									title={`${CASE_DESTINATION_TITLES.caseProposals} — separate from the Workflow proposal queue on this tab`}
									>{CASE_DESTINATION_LABELS.caseProposals}</a
								>
								<span class="{DS_TYPE_CLASSES.meta} text-[color:var(--ce-l-text-muted)] select-none" aria-hidden="true"
									>·</span
								>
								<a
									data-testid="workflow-queue-empty-link-timeline"
									href="/case/{caseId}/timeline"
									class={workflowEmbedNavLinkClass}
									title={CASE_DESTINATION_TITLES.timeline}
									>{CASE_DESTINATION_LABELS.timeline}</a
								>
								<span class="{DS_TYPE_CLASSES.meta} text-[color:var(--ce-l-text-muted)] select-none" aria-hidden="true"
									>·</span
								>
								<a
									data-testid="workflow-queue-empty-link-notes"
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
					Guidance
				</h3>
				{#if !guidanceExpanded}
					<p class="leading-snug mt-1 max-w-prose {DS_WORKFLOW_TEXT_CLASSES.guidanceIntroMuted}">
						Jump to other case tabs or expand for full advisory path and journey hints.
					</p>
				{/if}
			</div>
			<button
				type="button"
				data-testid="workflow-guidance-toggle"
				aria-expanded={guidanceExpanded}
				aria-label={guidanceExpanded ? 'Collapse guidance and case shortcuts' : 'Expand guidance and case shortcuts'}
				class="{DS_WORKFLOW_CLASSES.guidanceToggle} shrink-0"
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

<!-- Create modal -->
{#if createOpen}
	<div
		class="{DS_OVERLAY_CLASSES.backdrop} z-50 flex min-h-full items-center justify-center p-4"
		role="dialog"
		aria-modal="true"
		aria-labelledby="create-workflow-title"
	>
		<div class="{DS_MODAL_CLASSES.panel} max-w-md w-full p-4 max-h-[90vh] overflow-auto">
			<h3 id="create-workflow-title" class="{DS_WORKFLOW_TEXT_CLASSES.modalTitle}">Create workflow item</h3>
			<form on:submit|preventDefault={submitCreate} class="flex flex-col gap-3">
				<div>
					<label class="{DS_WORKFLOW_TEXT_CLASSES.modalLabel}">Type</label>
					<select
						bind:value={createType}
						class="w-full {DS_TIMELINE_CLASSES.formControl}"
					>
						<option value="HYPOTHESIS">{formatWorkflowItemTypeForDisplay('HYPOTHESIS')}</option>
						<option value="GAP">{formatWorkflowItemTypeForDisplay('GAP')}</option>
					</select>
				</div>
				<div>
					<label class="{DS_WORKFLOW_TEXT_CLASSES.modalLabel}">Title *</label>
					<input
						type="text"
						bind:value={createTitle}
						class="w-full {DS_TIMELINE_CLASSES.formControl}"
						placeholder="Short title"
					/>
				</div>
				<div>
					<label class="{DS_WORKFLOW_TEXT_CLASSES.modalLabel}">Description</label>
					<textarea
						bind:value={createDescription}
						rows="2"
						class="w-full {DS_TIMELINE_CLASSES.formControl}"
						placeholder="Optional"
					></textarea>
				</div>
				<div>
					<label class="{DS_WORKFLOW_TEXT_CLASSES.modalLabel}">Status</label>
					<select
						bind:value={createStatus}
						class="w-full {DS_TIMELINE_CLASSES.formControl}"
					>
						{#each statusOptionsCreate as s}
							<option value={s}>{formatWorkflowStatusForDisplay(s)}</option>
						{/each}
					</select>
				</div>
				<div>
					<label class="{DS_WORKFLOW_TEXT_CLASSES.modalLabel}">Priority (number)</label>
					<input
						type="number"
						bind:value={createPriority}
						class="w-full {DS_TIMELINE_CLASSES.formControl}"
						placeholder="Optional"
					/>
				</div>
				<div class="flex gap-2 justify-end pt-2">
					<button type="button" class="{DS_BTN_CLASSES.ghost} text-sm" on:click={closeCreate}>
						Cancel
					</button>
					<button
						type="submit"
						class="{DS_BTN_CLASSES.primary} text-sm disabled:opacity-50"
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
					<label class="{DS_WORKFLOW_TEXT_CLASSES.modalLabel}">Priority (number)</label>
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
