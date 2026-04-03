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
	 */
	import { onMount } from 'svelte';
	import { afterNavigate } from '$app/navigation';
	import {
		listProposals,
		approveProposal,
		rejectProposal,
		commitProposal,
		reviseChatIntakeProposal,
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
		groupByStatus,
		statusLabel,
		payloadPreview,
		statusBadgeClasses,
		tabClasses
	} from '$lib/utils/proposalUiState';
	import { formatCaseDateTime } from '$lib/utils/formatDateTime';

	// ── Props ──────────────────────────────────────────────────────────────────

	export let caseId: string;
	export let token: string;
	/** `page` = full-height dashboard; `compact` = e.g. Case Tools sidebar. */
	export let layout: 'compact' | 'page' = 'compact';
	/** When true, refetch on client afterNavigate (e.g. /proposals ↔ other case tabs; Case Tools embed — P38-03). */
	export let refreshOnNav = false;

	let typeFilter: 'all' | 'timeline' | 'note' = 'all';

	let chatIntakeRevisingId = '';
	let chatIntakeReviseFeedback = '';

	// ── Data state ─────────────────────────────────────────────────────────────

	let proposals: ProposalRecord[] = [];
	let loading = false;
	let loadError = '';

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

	// ── Computed ───────────────────────────────────────────────────────────────

	$: proposalsFiltered =
		typeFilter === 'all'
			? proposals
			: proposals.filter((p) => p.proposal_type === typeFilter);
	$: grouped = groupByStatus(proposalsFiltered);
	$: pendingCount = grouped.pending.length;
	$: approvedCount = grouped.approved.length;
	$: rejectedCount = grouped.rejected.length;
	$: committedCount = grouped.committed.length;

	$: activeProposals = grouped[activeTab] ?? [];
	$: allSelectedOnTab =
		activeProposals.length > 0 && activeProposals.every((p) => selected.has(p.id));
	$: anySelectedOnTab = activeProposals.some((p) => selected.has(p.id));

	$: bulkCommitEnabled = isBulkCommitEnabled(selected, proposals);
	$: bulkApproveEnabled = isBulkApproveEnabled(selected, proposals);
	$: bulkRejectEnabled = isBulkRejectEnabled(selected, proposals);

	$: selectedOnTabCount = activeProposals.filter((p) => selected.has(p.id)).length;

	// ── Data loading ───────────────────────────────────────────────────────────

	export async function loadProposals(): Promise<void> {
		if (!token) return;
		loading = true;
		loadError = '';
		try {
			proposals = await listProposals(caseId, token);
		} catch (err) {
			loadError = classifyApiError(err);
		} finally {
			loading = false;
		}
	}

	// ── Expansion ──────────────────────────────────────────────────────────────

	function toggleExpand(id: string): void {
		const next = new Set(expanded);
		if (next.has(id)) next.delete(id);
		else next.add(id);
		expanded = next;
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
			const updated = await approveProposal(caseId, id, token);
			proposals = proposals.map((p) => (p.id === id ? updated : p));
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
			const updated = await rejectProposal(caseId, id, rejectReason, token);
			proposals = proposals.map((p) => (p.id === id ? updated : p));
			rejectingId = '';
			rejectReason = '';
		} catch (err) {
			setProposalError(id, classifyApiError(err));
		} finally {
			setInProgress(id, false);
		}
	}

	async function handleCommit(id: string): Promise<void> {
		clearProposalError(id);
		setInProgress(id, true);
		try {
			const updated = await commitProposal(caseId, id, token);
			proposals = proposals.map((p) => (p.id === id ? updated : p));
		} catch (err) {
			setProposalError(id, classifyApiError(err));
		} finally {
			setInProgress(id, false);
		}
	}

	// ── Bulk actions ───────────────────────────────────────────────────────────

	async function handleBulkApprove(): Promise<void> {
		bulkError = '';
		bulkProcessing = true;
		const targets = [...selected].filter((id) => {
			return proposals.find((q) => q.id === id)?.status === 'pending';
		});
		const errors: string[] = [];
		for (let i = 0; i < targets.length; i++) {
			bulkProgressMsg = `Approving ${i + 1} of ${targets.length}…`;
			const id = targets[i];
			try {
				const updated = await approveProposal(caseId, id, token);
				proposals = proposals.map((p) => (p.id === id ? updated : p));
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
				const updated = await rejectProposal(caseId, id, bulkRejectReason, token);
				proposals = proposals.map((p) => (p.id === id ? updated : p));
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
		const targets = [...selected].filter((id) => {
			return proposals.find((q) => q.id === id)?.status === 'approved';
		});
		const errors: string[] = [];
		for (let i = 0; i < targets.length; i++) {
			bulkProgressMsg = `Committing ${i + 1} of ${targets.length}…`;
			const id = targets[i];
			try {
				const updated = await commitProposal(caseId, id, token);
				proposals = proposals.map((p) => (p.id === id ? updated : p));
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

	function shortId(id: string): string {
		return id.slice(0, 8) + '…';
	}

	// ── Mount ──────────────────────────────────────────────────────────────────

	onMount(() => {
		loadProposals();
	});

	afterNavigate(({ from }) => {
		if (!refreshOnNav || !from) return;
		if (!token || !caseId) return;
		void loadProposals();
	});
</script>

<div
	class="flex flex-col text-xs {layout === 'page' ? 'h-full min-h-0 overflow-hidden' : ''}"
	data-testid="proposal-review-panel"
	data-layout={layout}
>

	<!-- ── HEADER ──────────────────────────────────────────────────────────── -->
	<div class="flex items-center justify-between px-3 pt-3 pb-2 shrink-0 gap-2">
		{#if layout === 'compact'}
			<span class="font-semibold text-gray-700 dark:text-gray-300 text-xs uppercase tracking-wide">
				Proposals
			</span>
		{:else}
			<span class="text-[11px] text-gray-500 dark:text-gray-400">Review queue</span>
		{/if}
		<button
			type="button"
			class="text-xs text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-50 shrink-0"
			on:click={loadProposals}
			disabled={loading}
			data-testid="proposals-refresh-btn"
		>
			{loading ? 'Loading…' : '↻ Refresh'}
		</button>
	</div>

	<!-- ── TYPE FILTER ─────────────────────────────────────────────────────── -->
	<div
		class="flex items-center gap-2 px-3 py-1.5 shrink-0 border-b border-gray-200 dark:border-gray-800 bg-gray-50/80 dark:bg-gray-900/50"
	>
		<label for="proposal-type-filter-{caseId}" class="text-[10px] text-gray-500 dark:text-gray-400 shrink-0"
			>Type</label
		>
		<select
			id="proposal-type-filter-{caseId}"
			bind:value={typeFilter}
			class="text-[11px] rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 py-0.5 px-1.5 max-w-[11rem]"
			data-testid="proposal-type-filter"
		>
			<option value="all">All types</option>
			<option value="timeline">Timeline</option>
			<option value="note">Note</option>
		</select>
	</div>

	<!-- ── STATUS TAB BAR ──────────────────────────────────────────────────── -->
	<div
		class="flex shrink-0 border-b border-gray-200 dark:border-gray-700 overflow-x-auto bg-gray-50 dark:bg-gray-900"
	>
		<button
			type="button"
			class={tabClasses('pending', activeTab)}
			on:click={() => { activeTab = 'pending'; selected = new Set(); }}
			data-testid="tab-pending"
		>
			Pending{pendingCount > 0 ? ` (${pendingCount})` : ''}
		</button>
		<button
			type="button"
			class={tabClasses('approved', activeTab)}
			on:click={() => { activeTab = 'approved'; selected = new Set(); }}
			data-testid="tab-approved"
		>
			Approved{approvedCount > 0 ? ` (${approvedCount})` : ''}
		</button>
		<button
			type="button"
			class={tabClasses('rejected', activeTab)}
			on:click={() => { activeTab = 'rejected'; selected = new Set(); }}
			data-testid="tab-rejected"
		>
			Rejected{rejectedCount > 0 ? ` (${rejectedCount})` : ''}
		</button>
		<button
			type="button"
			class={tabClasses('committed', activeTab)}
			on:click={() => { activeTab = 'committed'; selected = new Set(); }}
			data-testid="tab-committed"
		>
			Committed{committedCount > 0 ? ` (${committedCount})` : ''}
		</button>
	</div>

	<!-- ── BULK ACTIONS BAR ────────────────────────────────────────────────── -->
	{#if anySelectedOnTab}
		<div
			class="shrink-0 border-b border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/40 px-3 py-2"
			data-testid="bulk-actions-bar"
		>
			{#if bulkRejectMode}
				<!-- Inline bulk reject reason input -->
				<div class="flex flex-col gap-1.5">
					<span class="text-blue-700 dark:text-blue-300 font-medium text-[11px]">
						Rejection reason for {selectedOnTabCount} proposal{selectedOnTabCount !== 1 ? 's' : ''}:
					</span>
					<div class="flex gap-1.5 items-center">
						<input
							type="text"
							bind:value={bulkRejectReason}
							placeholder="Required reason…"
							class="flex-1 text-[11px] px-2 py-1 rounded border border-gray-300 dark:border-gray-600
							       bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
							data-testid="bulk-reject-reason-input"
						/>
						<button
							type="button"
							class="shrink-0 px-2 py-1 rounded text-[11px] font-medium bg-red-600 hover:bg-red-700
							       text-white transition disabled:opacity-50 disabled:cursor-not-allowed"
							on:click={handleBulkReject}
							disabled={!bulkRejectReason.trim() || bulkProcessing}
							data-testid="bulk-reject-confirm-btn"
						>
							{bulkProcessing ? bulkProgressMsg || 'Rejecting…' : 'Confirm Rejection'}
						</button>
						<button
							type="button"
							class="shrink-0 text-[11px] text-gray-500 dark:text-gray-400 hover:text-gray-700
							       dark:hover:text-gray-300 px-1.5 py-1"
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
					<span class="text-blue-700 dark:text-blue-300 font-medium text-[11px] shrink-0">
						{selectedOnTabCount} selected
					</span>
					<div class="flex items-center gap-1.5 flex-wrap ml-auto">
						{#if bulkApproveEnabled}
							<button
								type="button"
								class="px-2 py-0.5 rounded text-[11px] font-medium bg-blue-600 hover:bg-blue-700
								       text-white transition disabled:opacity-50 disabled:cursor-not-allowed"
								on:click={handleBulkApprove}
								disabled={bulkProcessing}
								data-testid="bulk-approve-btn"
							>
								{bulkProcessing ? bulkProgressMsg : '✓ Approve Selected'}
							</button>
						{/if}
						{#if bulkRejectEnabled}
							<button
								type="button"
								class="px-2 py-0.5 rounded text-[11px] font-medium bg-red-100 hover:bg-red-200
								       text-red-700 dark:bg-red-900/40 dark:text-red-300 transition
								       disabled:opacity-50 disabled:cursor-not-allowed"
								on:click={startBulkReject}
								disabled={bulkProcessing}
								data-testid="bulk-reject-btn"
							>
								✕ Reject Selected
							</button>
						{/if}
						<button
							type="button"
							class="px-2 py-0.5 rounded text-[11px] font-medium bg-green-600 hover:bg-green-700
							       text-white transition disabled:opacity-50 disabled:cursor-not-allowed"
							on:click={handleBulkCommit}
							disabled={!bulkCommitEnabled || bulkProcessing}
							title={!bulkCommitEnabled
								? 'All selected proposals must be approved before committing'
								: 'Commit all selected approved proposals to the case'}
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
			class="shrink-0 flex items-start gap-2 px-3 py-2 bg-red-50 dark:bg-red-950/40
			       border-b border-red-200 dark:border-red-800"
			data-testid="bulk-error-banner"
		>
			<span class="text-red-600 dark:text-red-400 text-[11px] flex-1">{bulkError}</span>
			<button
				type="button"
				class="text-red-400 hover:text-red-600 text-[11px] shrink-0"
				on:click={() => { bulkError = ''; }}
				aria-label="Dismiss bulk error"
			>✕</button>
		</div>
	{/if}

	<!-- ── LOAD ERROR ───────────────────────────────────────────────────────── -->
	{#if loadError}
		<div class="px-3 py-2 text-red-600 dark:text-red-400 text-[11px] shrink-0" data-testid="load-error">
			{loadError}
		</div>
	{/if}

	<div
		class="{layout === 'page'
			? 'flex-1 min-h-0 overflow-y-auto flex flex-col'
			: 'flex flex-col'}"
		data-testid="proposal-panel-scroll"
	>
	<!-- ── EMPTY / LOADING ─────────────────────────────────────────────────── -->
	{#if loading && proposals.length === 0}
		<div class="px-3 py-4 text-gray-400 dark:text-gray-500 italic text-[11px]">
			Loading proposals…
		</div>
	{:else if !loading && activeProposals.length === 0}
		<div class="px-3 py-4 text-gray-400 dark:text-gray-500 italic text-[11px]" data-testid="empty-state">
			{#if activeTab === 'pending'}
				No pending proposals. Create drafts from <strong>Chat</strong> (intake phrases) or use case
				thread tools. Committed items move to Timeline (official).
			{:else if activeTab === 'approved'}
				No approved proposals awaiting commit.
			{:else if activeTab === 'rejected'}
				No rejected proposals.
			{:else}
				No proposals have been committed to this case yet.
			{/if}
		</div>
	{:else if activeProposals.length > 0}

		<!-- ── SELECT-ALL HEADER ─────────────────────────────────────────────── -->
		<div
			class="flex items-center gap-2 px-3 py-1.5 bg-gray-50 dark:bg-gray-900 border-b
			       border-gray-100 dark:border-gray-800 shrink-0"
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
			<span class="text-gray-400 dark:text-gray-500 text-[10px]">
				{activeProposals.length} proposal{activeProposals.length !== 1 ? 's' : ''}
				{selectedOnTabCount > 0 ? ` · ${selectedOnTabCount} selected` : ''}
			</span>
		</div>

		<!-- ── PROPOSAL LIST ─────────────────────────────────────────────────── -->
		<div data-testid="proposal-list" class="flex flex-col gap-2 px-2 pb-2 pt-1">
			{#each activeProposals as proposal (proposal.id)}
				{@const payload = parsePayload(proposal.proposed_payload)}
				{@const isInProgress = actionInProgress.has(proposal.id)}
				{@const isExpanded = expanded.has(proposal.id)}
				{@const thisError = proposalErrors.get(proposal.id)}
				{@const isRejectingThis = rejectingId === proposal.id}

				<div
					class="rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/50"
					data-testid="proposal-card"
					data-proposal-id={proposal.id}
					data-proposal-status={proposal.status}
				>
					<!-- ── MAIN CARD ROW ──────────────────────────────────────────── -->
					<div class="flex items-start gap-2.5 px-3 pt-3 pb-1">

						<!-- Checkbox -->
						<input
							type="checkbox"
							checked={selected.has(proposal.id)}
							on:change={() => toggleSelect(proposal.id)}
							class="mt-0.5 accent-blue-600 shrink-0"
							aria-label="Select proposal {shortId(proposal.id)}"
						/>

						<!-- Content -->
						<div class="flex-1 min-w-0">

							<!-- Badge row -->
							<div class="flex items-center gap-1.5 flex-wrap mb-1">
								<!-- Status badge — explicit label -->
								<span
									class="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider shrink-0
									       {statusBadgeClasses(proposal.status)}"
									data-testid="status-badge"
								>
									{statusLabel(proposal.status)}
								</span>

								<!-- Type badge -->
								<span
									class="px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wide shrink-0
									       bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
								>
									{proposal.proposal_type}
								</span>

								<!-- Scope badge -->
								<span
									class="px-1.5 py-0.5 rounded text-[9px] font-medium shrink-0
									       {proposal.source_scope === 'personal'
										? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400'
										: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-400'}"
								>
									{proposal.source_scope === 'personal' ? 'Personal Thread' : 'Case Thread'}
								</span>

								{#if isChatIntakePayload(payload)}
									<span
										class="px-1.5 py-0.5 rounded text-[9px] font-semibold shrink-0
										       bg-amber-100 text-amber-900 dark:bg-amber-900/50 dark:text-amber-200"
									>
										Chat intake
									</span>
								{/if}

								<!-- Date -->
								<span class="ml-auto text-[10px] text-gray-400 dark:text-gray-500 shrink-0">
									{formatCaseDateTime(proposal.created_at)}
								</span>
							</div>

							<!-- Content preview -->
							<div
							class="text-[11px] text-gray-600 dark:text-gray-400 font-mono leading-relaxed
							       bg-gray-50 dark:bg-gray-900/70 rounded px-2 py-1.5 mb-2 line-clamp-2"
								data-testid="proposal-preview"
							>
								{payloadPreview(proposal.proposed_payload, proposal.proposal_type)}
							</div>

							<!-- Rejection reason (only for rejected proposals) -->
							{#if proposal.rejection_reason}
								<div
									class="text-[10px] text-red-600 dark:text-red-400 mb-1.5 px-1"
									data-testid="rejection-reason"
								>
									<span class="font-semibold">Rejected:</span> {proposal.rejection_reason}
								</div>
							{/if}

							<!-- Committed record ID (only for committed proposals) -->
							{#if proposal.committed_record_id}
								<div
									class="text-[10px] text-green-700 dark:text-green-400 mb-1.5 px-1"
									data-testid="committed-record"
								>
									<span class="font-semibold">Case record:</span>
									<span class="font-mono">{proposal.committed_record_id}</span>
								</div>
							{/if}

							<!-- Per-proposal error -->
							{#if thisError}
								<div
									class="text-[10px] text-red-600 dark:text-red-400 mb-1.5 px-1"
									data-testid="proposal-error"
								>
									{thisError}
								</div>
							{/if}

						<!-- ── ACTION FOOTER ─────────────────────────────────────────── -->
						<div class="flex items-center flex-wrap gap-1.5 mt-1.5 pt-2 border-t border-gray-100 dark:border-gray-800 pb-1">

								<!-- Expand/collapse toggle — always visible -->
								<button
									type="button"
									class="text-[10px] text-gray-400 dark:text-gray-500 hover:text-gray-600
									       dark:hover:text-gray-300 transition underline"
									on:click={() => toggleExpand(proposal.id)}
									data-testid="expand-toggle"
								>
									{isExpanded ? '▲ Collapse' : '▼ Details'}
								</button>

								<!-- Approve — only for pending -->
								{#if canApprove(proposal.status)}
									<button
										type="button"
										class="px-2 py-0.5 rounded text-[10px] font-medium bg-blue-100 hover:bg-blue-200
										       text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 transition
										       disabled:opacity-50 disabled:cursor-not-allowed"
										on:click={() => handleApprove(proposal.id)}
										disabled={isInProgress}
										data-testid="approve-btn"
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
									>
										{chatIntakeRevisingId === proposal.id ? 'Cancel revise' : 'AI revise'}
									</button>
								{/if}

								<!-- Reject — only for pending -->
								{#if canReject(proposal.status)}
									{#if isRejectingThis}
										<!-- Inline rejection reason -->
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
									{:else}
										<button
											type="button"
											class="px-2 py-0.5 rounded text-[10px] font-medium bg-red-100 hover:bg-red-200
											       text-red-700 dark:bg-red-900/40 dark:text-red-300 transition"
											on:click={() => startReject(proposal.id)}
											data-testid="reject-btn"
										>
											✕ Reject
										</button>
									{/if}
								{/if}

								<!-- Commit — only for approved -->
								{#if canCommit(proposal.status)}
									<button
										type="button"
										class="px-2 py-0.5 rounded text-[10px] font-medium bg-green-600 hover:bg-green-700
										       text-white transition disabled:opacity-50 disabled:cursor-not-allowed"
										on:click={() => handleCommit(proposal.id)}
										disabled={isInProgress}
										data-testid="commit-btn"
									>
										{isInProgress ? 'Committing…' : '→ Commit to Case'}
									</button>
								{/if}
							</div>
						</div>
					</div>

					<!-- ── EXPANDED PAYLOAD DETAIL ───────────────────────────────── -->
					{#if isExpanded}
						<div
						class="mx-3 mt-1.5 mb-2.5 rounded-md border border-gray-200 dark:border-gray-700
						       bg-gray-50 dark:bg-gray-900 px-3 py-2"
							data-testid="proposal-expanded"
						>
							<p class="text-[9px] font-semibold uppercase tracking-wider text-gray-400
							         dark:text-gray-500 mb-2">
								Full Payload
							</p>

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
								<div class="space-y-1">
									<div class="flex gap-2">
										<span class="text-[10px] font-semibold text-gray-500 dark:text-gray-400 w-24 shrink-0">
											Occurred At
										</span>
										<span class="text-[11px] text-gray-700 dark:text-gray-300 font-mono">
											{payload.occurred_at ?? '—'}
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
								</div>

							{:else}
								<!-- Unknown type — raw JSON -->
								<pre class="text-[10px] text-gray-600 dark:text-gray-400 font-mono whitespace-pre-wrap break-all">
{JSON.stringify(payload, null, 2)}</pre>
							{/if}

							<!-- Metadata footer -->
							<div class="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700 flex flex-wrap gap-x-4 gap-y-0.5">
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
								{#if proposal.reviewed_by}
									<span class="text-[10px] text-gray-400 dark:text-gray-500">
										<span class="font-semibold">Reviewed by:</span>
										<span class="font-mono">{shortId(proposal.reviewed_by)}</span>
									</span>
								{/if}
							</div>
						</div>
					{/if}
				</div>
			{/each}
		</div>
	{/if}
	</div>
</div>
