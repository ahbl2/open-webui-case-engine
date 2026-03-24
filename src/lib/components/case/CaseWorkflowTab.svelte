<script lang="ts">
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
	type WorkflowItem,
	type WorkflowItemCreateInput,
	type WorkflowItemType,
	type WorkflowProposal
} from '$lib/apis/caseEngine';
import {
	getStatusesForType,
	getStatusBadgeClasses,
	getOriginBadgeClasses,
	getPriorityEmoji,
	type WorkflowItemType as LocalType
} from '$lib/components/case/workflowStatus';
import EntityWorkspace from '$lib/components/case/EntityWorkspace.svelte';

	export let caseId: string;
	export let token: string;
	export let isAdmin: boolean = false;

	type FilterType = 'all' | 'HYPOTHESIS' | 'GAP';

	let items: WorkflowItem[] = [];
	let loading = true;
	let loadError = '';
	let filter: FilterType = 'all';
	let includeDeleted = false;
	let createOpen = false;
	let editItem: WorkflowItem | null = null;
	let deleteTarget: WorkflowItem | null = null;
	let restoreTarget: WorkflowItem | null = null;
	let proposalCount = 0;
	let showProposals = false;
	let proposals: WorkflowProposal[] = [];
	let proposalsLoading = false;
	let proposalError: string | null = null;
	let expandedProposalId: string | null = null;
	let acceptTarget: WorkflowProposal | null = null;
	let rejectTarget: WorkflowProposal | null = null;
	let rejectReason = '';
	let showEntityWorkspace = false;
	let entityWorkspaceType: string | null = null;
	let entityWorkspaceId: string | null = null;

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
		if (showProposals) {
			loadProposals();
		}
	}

	async function loadItems() {
		loading = true;
		loadError = '';
		try {
			const typeParam =
				filter === 'all' ? undefined : (filter as WorkflowItemType);
			items = await listWorkflowItems(caseId, token, {
				type: typeParam,
				includeDeleted: isAdmin && includeDeleted
			});
		} catch (e) {
			const msg = (e as Error)?.message ?? 'Failed to load workflow items';
			loadError = msg;
			toast.error(msg);
			items = [];
		} finally {
			loading = false;
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
	}

	function cancelDelete() {
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
	}

	function cancelRestore() {
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

	function toggleProposals() {
		showProposals = !showProposals;
		if (showProposals) {
			loadProposals();
		}
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
		if (p.proposal_type === 'CREATE_HYPOTHESIS') return 'Hypothesis';
		if (p.proposal_type === 'CREATE_GAP') return 'Gap';
		return p.proposal_type;
	}

	function proposedItemType(p: WorkflowProposal): string {
		return (p.suggested_payload?.type as string) || proposalTypeLabel(p);
	}

	function hasWorkflowLink(p: WorkflowProposal): boolean {
		return !!p.workflow_item_id;
	}

	function openAccept(p: WorkflowProposal) {
		acceptTarget = p;
	}

	function cancelAccept() {
		acceptTarget = null;
	}

	async function confirmAccept() {
		if (!acceptTarget) return;
		const target = acceptTarget;
		acceptTarget = null;
		try {
			const result = await acceptWorkflowProposal(caseId, target.id, token);
			toast.success('Proposal accepted and workflow item created');
			await loadProposals();
			await loadItems();
		} catch (e) {
			toast.error((e as Error)?.message ?? 'Accept failed');
			// Defensive refresh in case proposal was already resolved elsewhere.
			await loadProposals();
			await loadProposalCount();
			return;
		}
		// Keep banner/count in sync after accept.
		await loadProposalCount();
	}

	function openReject(p: WorkflowProposal) {
		rejectTarget = p;
		rejectReason = '';
	}

	function cancelReject() {
		rejectTarget = null;
		rejectReason = '';
	}

	async function confirmReject() {
		if (!rejectTarget) return;
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
		}
	}
</script>

<div class="flex flex-col gap-4 p-4 max-h-full overflow-auto">
	<h2 class="text-sm font-medium">Workflow</h2>

	<!-- Navigation hook: proposals (no accept/reject UI here) -->
	<div class="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
		{#if proposalCount > 0}
			<span>You have {proposalCount} pending workflow proposal(s).</span>
		{:else}
			<span>No pending workflow proposals.</span>
		{/if}
		<button
			type="button"
			class="ml-auto px-2 py-1 rounded border border-gray-300 dark:border-gray-600 text-xs hover:bg-gray-100 dark:hover:bg-gray-800"
			on:click={toggleProposals}
		>
			{showProposals ? 'Hide proposals' : 'Review proposals'}
		</button>
	</div>

	<!-- Filters -->
	<div class="flex flex-wrap gap-2 items-center">
		<span class="text-xs font-medium text-gray-600 dark:text-gray-400">Show:</span>
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
			<label class="flex items-center gap-1.5 text-sm ml-2">
				<input type="checkbox" bind:checked={includeDeleted} on:change={loadItems} />
				Include deleted
			</label>
		{/if}
		<button
			type="button"
			class="ml-auto px-2 py-1.5 text-sm rounded bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600"
			on:click={openCreate}
		>
			Create workflow item
		</button>
	</div>

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

	<!-- List -->
	{#if loading && items.length === 0}
		<div class="text-sm text-gray-500">Loading...</div>
	{:else if loadError && items.length === 0}
		<div class="rounded border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-900/20 px-3 py-2 text-sm text-red-700 dark:text-red-300" role="alert">
			{loadError}
		</div>
	{:else if items.length === 0}
		<div class="flex flex-col items-center justify-center text-center gap-2 py-10 text-sm text-gray-500 dark:text-gray-400">
			<div class="font-medium">
				No workflow items {filter !== 'all' ? `(${filter === 'HYPOTHESIS' ? 'hypotheses' : 'gaps'})` : ''} yet.
			</div>
			<div class="max-w-md">
				Start by adding:
				<ul class="mt-1 list-disc list-inside text-left">
					<li>a hypothesis you want to test</li>
					<li>a gap in the investigation</li>
				</ul>
			</div>
		</div>
	{:else}
		<div class="border border-gray-200 dark:border-gray-700 rounded overflow-auto max-h-[50vh]">
			<table class="w-full text-sm">
				<thead class="bg-gray-50 dark:bg-gray-800 sticky top-0">
					<tr>
						<th class="text-left px-2 py-1.5">Type</th>
						<th class="text-left px-2 py-1.5">Title</th>
						<th class="text-left px-2 py-1.5">Status</th>
						<th class="text-left px-2 py-1.5">Priority</th>
						<th class="text-left px-2 py-1.5">Origin</th>
						<th class="text-left px-2 py-1.5">Citations</th>
						<th class="text-left px-2 py-1.5 w-24">Actions</th>
					</tr>
				</thead>
				<tbody>
					{#each items as item (item.id)}
						<tr
							class="border-t border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 {item.deleted_at
								? 'opacity-70'
								: ''}"
						>
							<td class="px-2 py-1.5">
								<span class="font-medium">{item.type}</span>
								{#if item.deleted_at}
									<span class="ml-1 text-xs text-amber-600 dark:text-amber-400">(deleted)</span>
								{/if}
							</td>
							<td class="px-2 py-1.5">
								<div class="font-medium">{item.title}</div>
								{#if item.description}
									<div class="text-xs text-gray-500 break-words max-w-xs">{item.description}</div>
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
									{item.status}
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
									{item.origin}
								</span>
							</td>
							<td class="px-2 py-1.5 text-xs">
								{#if item.citations?.length}
									{item.citations.length} citation(s)
								{:else}
									—
								{/if}
							</td>
							<td class="px-2 py-1.5 flex gap-1 flex-wrap">
								{#if !item.deleted_at}
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
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}

	<!-- Proposals -->
	{#if showProposals}
		<div class="flex flex-col gap-2 mt-4">
			<h3 class="text-xs font-medium text-gray-600 dark:text-gray-400">Workflow Proposals</h3>
			{#if proposalsLoading}
				<div class="text-sm text-gray-500">Loading proposals...</div>
			{:else if proposals.length === 0}
				<div class="text-sm text-gray-500 dark:text-gray-400">
					No workflow proposals yet. AI suggestions will appear here when available.
				</div>
			{:else}
				<div class="border border-gray-200 dark:border-gray-700 rounded divide-y divide-gray-200 dark:divide-gray-800 max-h-[40vh] overflow-auto">
					{#each proposals as p (p.id)}
						<div class="p-2 text-sm">
							<div class="flex items-center gap-2">
								<span class="text-xs px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800">
									{proposalTypeLabel(p)}
								</span>
								<span class="text-xs px-1.5 py-0.5 rounded {proposalStatusBadgeClasses(p.status)}">
									{p.status}
								</span>
								<span class="text-xs text-gray-500 ml-auto">
									{p.created_at?.slice?.(0, 19) ?? p.created_at}
								</span>
							</div>
							<div class="mt-1 font-medium">
								{p.suggested_payload?.title ?? '(no title)'}
							</div>
							{#if p.suggested_payload?.description}
								<div class="mt-0.5 text-xs text-gray-500 line-clamp-2">
									{p.suggested_payload.description}
								</div>
							{/if}
							<div class="mt-1 flex items-center gap-2 text-xs text-gray-500">
								<span>Type: {proposedItemType(p)}</span>
								{#if p.suggested_payload?.priority != null}
									<span>Priority: {p.suggested_payload.priority}</span>
								{/if}
								{#if p.citations?.length}
									<span>{p.citations.length} citation(s)</span>
								{/if}
								{#if p.suggested_payload?.entity_type && p.suggested_payload?.entity_normalized_id}
									<span>
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
											<div>Type: {p.suggested_payload.type ?? proposedItemType(p)}</div>
											{#if p.suggested_payload.status}
												<div>Status: {p.suggested_payload.status}</div>
											{/if}
											{#if p.suggested_payload.priority != null}
												<div>Priority: {p.suggested_payload.priority}</div>
											{/if}
											{#if p.suggested_payload.description}
												<div class="mt-1">
													<div class="font-medium">Description</div>
													<div class="whitespace-pre-wrap mt-0.5">
														{p.suggested_payload.description}
													</div>
												</div>
											{/if}
										</div>
									{/if}
									{#if p.citations?.length}
										<div>
											<div class="font-medium mb-1">Citations</div>
											<ul class="list-disc list-inside space-y-0.5">
												{#each p.citations as c, idx}
													<li>
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
										class="text-xs text-green-700 dark:text-green-300 hover:underline"
										on:click={() => openAccept(p)}
									>
										Accept
									</button>
									<button
										type="button"
										class="text-xs text-red-700 dark:text-red-300 hover:underline"
										on:click={() => openReject(p)}
									>
										Reject
									</button>
								{:else if hasWorkflowLink(p)}
									<button
										type="button"
										class="text-xs text-blue-600 dark:text-blue-400 hover:underline"
										on:click={() => {
											// Intentionally minimal in P13-06: hide proposals and return to list.
											// Item-level focus/highlight can be added in a later ticket if needed.
											showProposals = false;
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
		</div>
	{/if}
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
						<option value="HYPOTHESIS">HYPOTHESIS</option>
						<option value="GAP">GAP</option>
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
							<option value={s}>{s}</option>
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
			<h3 id="edit-workflow-title" class="font-medium mb-3">Edit workflow item ({editItem.type})</h3>
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
							<option value={s}>{s}</option>
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

<!-- Delete confirm -->
{#if deleteTarget}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
		role="dialog"
		aria-modal="true"
		aria-labelledby="delete-workflow-title"
	>
		<div class="bg-white dark:bg-gray-900 rounded-lg shadow-lg max-w-sm w-full mx-4 p-4">
			<h3 id="delete-workflow-title" class="font-medium mb-2">Remove workflow item?</h3>
			<p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
				This will soft-delete &quot;{deleteTarget.title}&quot;. You can restore it later (admin only).
			</p>
			<div class="flex gap-2 justify-end">
				<button type="button" class="px-3 py-1.5 text-sm rounded hover:bg-gray-100 dark:hover:bg-gray-800" on:click={cancelDelete}>
					Cancel
				</button>
				<button
					type="button"
					class="px-3 py-1.5 text-sm rounded bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/50"
					on:click={doDelete}
				>
					Delete
				</button>
			</div>
		</div>
	</div>
{/if}

<!-- Restore confirm -->
{#if restoreTarget}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
		role="dialog"
		aria-modal="true"
		aria-labelledby="restore-workflow-title"
	>
		<div class="bg-white dark:bg-gray-900 rounded-lg shadow-lg max-w-sm w-full mx-4 p-4">
			<h3 id="restore-workflow-title" class="font-medium mb-2">Restore workflow item?</h3>
			<p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
				Restore &quot;{restoreTarget.title}&quot; so it appears in the active list again.
			</p>
			<div class="flex gap-2 justify-end">
				<button type="button" class="px-3 py-1.5 text-sm rounded hover:bg-gray-100 dark:hover:bg-gray-800" on:click={cancelRestore}>
					Cancel
				</button>
				<button
					type="button"
					class="px-3 py-1.5 text-sm rounded bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/50"
					on:click={doRestore}
				>
					Restore
				</button>
			</div>
		</div>
	</div>
{/if}

<!-- Accept proposal confirm -->
{#if acceptTarget}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
		role="dialog"
		aria-modal="true"
		aria-labelledby="accept-proposal-title"
	>
		<div class="bg-white dark:bg-gray-900 rounded-lg shadow-lg max-w-sm w-full mx-4 p-4">
			<h3 id="accept-proposal-title" class="font-medium mb-2">Accept workflow proposal?</h3>
			<p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
				This will create a workflow item from the suggested payload. You can edit the workflow item later from the Workflow tab.
			</p>
			<div class="flex gap-2 justify-end">
				<button type="button" class="px-3 py-1.5 text-sm rounded hover:bg-gray-100 dark:hover:bg-gray-800" on:click={cancelAccept}>
					Cancel
				</button>
				<button
					type="button"
					class="px-3 py-1.5 text-sm rounded bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/50"
					on:click={confirmAccept}
				>
					Accept
				</button>
			</div>
		</div>
	</div>
{/if}

<!-- Reject proposal confirm -->
{#if rejectTarget}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
		role="dialog"
		aria-modal="true"
		aria-labelledby="reject-proposal-title"
	>
		<div class="bg-white dark:bg-gray-900 rounded-lg shadow-lg max-w-sm w-full mx-4 p-4">
			<h3 id="reject-proposal-title" class="font-medium mb-2">Reject workflow proposal?</h3>
			<p class="text-sm text-gray-600 dark:text-gray-400 mb-3">
				This will mark the proposal as rejected. No workflow item will be created.
			</p>
			<label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
				Optional reason
			</label>
			<textarea
				class="w-full text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 bg-white dark:bg-gray-800 mb-3"
				rows="2"
				bind:value={rejectReason}
				placeholder="Reason for rejection (optional)"
			></textarea>
			<div class="flex gap-2 justify-end">
				<button type="button" class="px-3 py-1.5 text-sm rounded hover:bg-gray-100 dark:hover:bg-gray-800" on:click={cancelReject}>
					Cancel
				</button>
				<button
					type="button"
					class="px-3 py-1.5 text-sm rounded bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/50"
					on:click={confirmReject}
				>
					Reject
				</button>
			</div>
		</div>
	</div>
{/if}
