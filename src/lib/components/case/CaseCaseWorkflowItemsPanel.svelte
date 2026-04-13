<script lang="ts">
	/**
	 * P117-04 — Phase 117 case workflow items: list, explicit create/update, local display filters only.
	 * Server list order only (`updated_at DESC`, `workflow_item_id ASC` from Case Engine); do not client-side re-sort.
	 * Updates are versioned in the engine; this UI does not expose version history (by design for this ticket).
	 */
	import { onDestroy } from 'svelte';
	import {
		createCaseWorkflowItem,
		listCaseWorkflowItems,
		updateCaseWorkflowItem,
		type CaseEngineCaseWorkflowItem,
		type CaseWorkflowItemStatus,
		type CaseWorkflowItemType
	} from '$lib/apis/caseEngine/caseWorkflowItemsApi';
	import Spinner from '$lib/components/common/Spinner.svelte';
	import * as P117 from '$lib/case/p117CaseWorkflowItemsCopy';

	export let caseId: string;
	export let caseEngineToken: string;

	let loading = false;
	let clientError = '';
	let items: CaseEngineCaseWorkflowItem[] = [];
	let showCreateForm = false;

	let createWorkflowType: CaseWorkflowItemType = 'TASK';
	let createTitle = '';
	let createDescription = '';
	let createStatusChoice: '' | CaseWorkflowItemStatus = '';
	let createError = '';
	let createBusy = false;

	let editingId: string | null = null;
	let editTitle = '';
	let editDescription = '';
	let editStatus: CaseWorkflowItemStatus = 'OPEN';
	let editError = '';
	let editBusy = false;

	/** Local display filters only — not Case Engine query parameters. */
	let filterStatus: 'all' | CaseWorkflowItemStatus = 'all';
	let filterType: 'all' | CaseWorkflowItemType = 'all';
	let filterText = '';

	let requestGeneration = 0;
	let activeCaseKey = '';

	function resetForCase(nextId: string): void {
		loading = false;
		clientError = '';
		items = [];
		showCreateForm = false;
		createWorkflowType = 'TASK';
		createTitle = '';
		createDescription = '';
		createStatusChoice = '';
		createError = '';
		createBusy = false;
		editingId = null;
		editTitle = '';
		editDescription = '';
		editStatus = 'OPEN';
		editError = '';
		editBusy = false;
		filterStatus = 'all';
		filterType = 'all';
		filterText = '';
		requestGeneration += 1;
		activeCaseKey = nextId;
	}

	$: if (caseId && caseId !== activeCaseKey) {
		resetForCase(caseId);
	}

	onDestroy(() => {
		requestGeneration += 1;
	});

	async function loadList(): Promise<void> {
		const myCase = caseId;
		if (!myCase) return;
		if (!caseEngineToken) {
			clientError = P117.P117_CASE_WORKFLOW_NO_SESSION;
			items = [];
			return;
		}
		const gen = ++requestGeneration;
		loading = true;
		clientError = '';
		items = [];
		try {
			const list = await listCaseWorkflowItems(myCase, caseEngineToken);
			if (gen !== requestGeneration || myCase !== caseId) return;
			items = list;
		} catch (e: unknown) {
			if (gen !== requestGeneration || myCase !== caseId) return;
			items = [];
			clientError = e instanceof Error ? e.message : P117.P117_CASE_WORKFLOW_ERROR_GENERIC;
		} finally {
			if (gen === requestGeneration && myCase === caseId) loading = false;
		}
	}

	function openEdit(it: CaseEngineCaseWorkflowItem): void {
		editingId = it.workflow_item_id;
		editTitle = it.title;
		editDescription = it.description ?? '';
		editStatus = it.status;
		editError = '';
	}

	function cancelEdit(): void {
		editingId = null;
		editError = '';
		editBusy = false;
	}

	async function submitCreate(): Promise<void> {
		const myCase = caseId;
		if (!myCase || !caseEngineToken) return;
		const title = createTitle.trim();
		if (!title) {
			createError = 'Title is required.';
			return;
		}
		createBusy = true;
		createError = '';
		const gen = requestGeneration;
		try {
			const payload: Parameters<typeof createCaseWorkflowItem>[2] = {
				workflow_type: createWorkflowType,
				title
			};
			const desc = createDescription.trim();
			payload.description = desc.length > 0 ? desc : null;
			if (createStatusChoice !== '') {
				payload.status = createStatusChoice;
			}
			await createCaseWorkflowItem(myCase, caseEngineToken, payload);
			if (gen !== requestGeneration || myCase !== caseId) return;
			showCreateForm = false;
			createTitle = '';
			createDescription = '';
			createStatusChoice = '';
			await loadList();
		} catch (e: unknown) {
			if (gen !== requestGeneration || myCase !== caseId) return;
			createError = e instanceof Error ? e.message : P117.P117_CASE_WORKFLOW_ERROR_GENERIC;
		} finally {
			if (gen === requestGeneration && myCase === caseId) createBusy = false;
		}
	}

	async function submitEdit(): Promise<void> {
		const myCase = caseId;
		const wid = editingId;
		if (!myCase || !caseEngineToken || !wid) return;
		const title = editTitle.trim();
		if (!title) {
			editError = 'Title is required.';
			return;
		}
		editBusy = true;
		editError = '';
		const gen = requestGeneration;
		try {
			const desc = editDescription.trim();
			await updateCaseWorkflowItem(myCase, wid, caseEngineToken, {
				title,
				description: desc.length > 0 ? desc : null,
				status: editStatus
			});
			if (gen !== requestGeneration || myCase !== caseId) return;
			cancelEdit();
			await loadList();
		} catch (e: unknown) {
			if (gen !== requestGeneration || myCase !== caseId) return;
			editError = e instanceof Error ? e.message : P117.P117_CASE_WORKFLOW_ERROR_GENERIC;
		} finally {
			if (gen === requestGeneration && myCase === caseId) editBusy = false;
		}
	}

	function typeLabel(t: CaseWorkflowItemType): string {
		return t === 'LEAD' ? P117.P117_CASE_WORKFLOW_TYPE_LEAD : P117.P117_CASE_WORKFLOW_TYPE_TASK;
	}

	function statusLabel(s: CaseWorkflowItemStatus): string {
		switch (s) {
			case 'OPEN':
				return P117.P117_CASE_WORKFLOW_STATUS_OPEN;
			case 'IN_PROGRESS':
				return P117.P117_CASE_WORKFLOW_STATUS_IN_PROGRESS;
			case 'CLOSED':
				return P117.P117_CASE_WORKFLOW_STATUS_CLOSED;
			default:
				return s;
		}
	}

	$: filterNeedle = filterText.trim().toLowerCase();
	$: filteredItems = items.filter((it) => {
		if (filterStatus !== 'all' && it.status !== filterStatus) return false;
		if (filterType !== 'all' && it.workflow_type !== filterType) return false;
		if (filterNeedle) {
			const inTitle = it.title.toLowerCase().includes(filterNeedle);
			const inDesc = (it.description ?? '').toLowerCase().includes(filterNeedle);
			if (!inTitle && !inDesc) return false;
		}
		return true;
	});

	$: if (caseId && caseEngineToken && activeCaseKey === caseId) {
		void loadList();
	}

	$: if (caseId && !caseEngineToken && activeCaseKey === caseId) {
		clientError = P117.P117_CASE_WORKFLOW_NO_SESSION;
		items = [];
		loading = false;
	}
</script>

<div
	class="flex flex-col gap-3 min-h-0"
	data-testid="case-case-workflow-items-panel"
	data-case-workflow-panel-case-id={caseId}
>
	<header class="flex flex-col gap-1 shrink-0">
		<h1 class="text-lg font-semibold text-[color:var(--ce-l-text-primary)]">{P117.P117_CASE_WORKFLOW_PAGE_TITLE}</h1>
		<p class="text-sm text-[color:var(--ce-l-text-secondary)]">{P117.P117_CASE_WORKFLOW_INTRO}</p>
		{#if caseEngineToken}
			<div class="pt-1">
				<button
					type="button"
					class="rounded px-3 py-1.5 text-sm font-medium border border-[color:var(--ce-l-border-subtle)] text-[color:var(--ce-l-text-primary)] hover:opacity-90"
					data-testid="case-workflow-panel--create-open"
					disabled={loading}
					on:click={() => {
						showCreateForm = !showCreateForm;
						createError = '';
					}}
				>
					{P117.P117_CASE_WORKFLOW_CREATE_OPEN}
				</button>
			</div>
		{/if}
	</header>

	{#if showCreateForm && caseEngineToken}
		<section
			class="rounded border border-[color:var(--ce-l-border-subtle)] p-3 flex flex-col gap-2"
			data-testid="case-workflow-panel--create-form"
		>
			<div class="text-sm font-medium text-[color:var(--ce-l-text-primary)]">{P117.P117_CASE_WORKFLOW_CREATE_SECTION}</div>
			<label class="flex flex-col gap-1 text-sm">
				<span class="text-[color:var(--ce-l-text-secondary)]">{P117.P117_CASE_WORKFLOW_FIELD_TYPE}</span>
				<select
					class="rounded border border-[color:var(--ce-l-border-subtle)] bg-transparent px-2 py-1"
					bind:value={createWorkflowType}
					data-testid="case-workflow-panel--create-type"
				>
					<option value="TASK">{P117.P117_CASE_WORKFLOW_TYPE_TASK}</option>
					<option value="LEAD">{P117.P117_CASE_WORKFLOW_TYPE_LEAD}</option>
				</select>
			</label>
			<label class="flex flex-col gap-1 text-sm">
				<span class="text-[color:var(--ce-l-text-secondary)]">{P117.P117_CASE_WORKFLOW_FIELD_TITLE}</span>
				<input
					class="rounded border border-[color:var(--ce-l-border-subtle)] bg-transparent px-2 py-1"
					bind:value={createTitle}
					data-testid="case-workflow-panel--create-title"
				/>
			</label>
			<label class="flex flex-col gap-1 text-sm">
				<span class="text-[color:var(--ce-l-text-secondary)]">{P117.P117_CASE_WORKFLOW_FIELD_DESCRIPTION}</span>
				<textarea
					class="rounded border border-[color:var(--ce-l-border-subtle)] bg-transparent px-2 py-1 min-h-[72px]"
					bind:value={createDescription}
					data-testid="case-workflow-panel--create-description"
				/>
			</label>
			<label class="flex flex-col gap-1 text-sm">
				<span class="text-[color:var(--ce-l-text-secondary)]"
					>{P117.P117_CASE_WORKFLOW_FIELD_STATUS} ({P117.P117_CASE_WORKFLOW_STATUS_OPTIONAL_HINT})</span
				>
				<select
					class="rounded border border-[color:var(--ce-l-border-subtle)] bg-transparent px-2 py-1"
					bind:value={createStatusChoice}
					data-testid="case-workflow-panel--create-status"
				>
					<option value="">{P117.P117_CASE_WORKFLOW_FILTER_STATUS_ALL}</option>
					<option value="OPEN">{P117.P117_CASE_WORKFLOW_STATUS_OPEN}</option>
					<option value="IN_PROGRESS">{P117.P117_CASE_WORKFLOW_STATUS_IN_PROGRESS}</option>
					<option value="CLOSED">{P117.P117_CASE_WORKFLOW_STATUS_CLOSED}</option>
				</select>
			</label>
			{#if createError}
				<p class="text-sm text-red-600 dark:text-red-400" data-testid="case-workflow-panel--create-error">{createError}</p>
			{/if}
			<div class="flex gap-2">
				<button
					type="button"
					class="rounded px-3 py-1.5 text-sm font-medium border border-[color:var(--ce-l-border-subtle)]"
					data-testid="case-workflow-panel--create-submit"
					disabled={createBusy}
					on:click={() => void submitCreate()}
				>
					{P117.P117_CASE_WORKFLOW_CREATE_SUBMIT}
				</button>
				<button
					type="button"
					class="rounded px-3 py-1.5 text-sm text-[color:var(--ce-l-text-secondary)]"
					disabled={createBusy}
					on:click={() => {
						showCreateForm = false;
						createError = '';
					}}
				>
					{P117.P117_CASE_WORKFLOW_CREATE_CANCEL}
				</button>
			</div>
		</section>
	{/if}

	{#if caseEngineToken}
		<section class="flex flex-col gap-2 text-sm" data-testid="case-workflow-panel--local-filters" aria-label={P117.P117_CASE_WORKFLOW_FILTERS_LABEL}>
			<div class="font-medium text-[color:var(--ce-l-text-primary)]">{P117.P117_CASE_WORKFLOW_FILTERS_LABEL}</div>
			<div class="flex flex-wrap gap-2 items-center">
				<label class="flex items-center gap-1">
					<span class="text-[color:var(--ce-l-text-secondary)]">{P117.P117_CASE_WORKFLOW_FIELD_STATUS}</span>
					<select
						class="rounded border border-[color:var(--ce-l-border-subtle)] bg-transparent px-2 py-1"
						bind:value={filterStatus}
						data-testid="case-workflow-panel--filter-status"
					>
						<option value="all">{P117.P117_CASE_WORKFLOW_FILTER_STATUS_ALL}</option>
						<option value="OPEN">{P117.P117_CASE_WORKFLOW_STATUS_OPEN}</option>
						<option value="IN_PROGRESS">{P117.P117_CASE_WORKFLOW_STATUS_IN_PROGRESS}</option>
						<option value="CLOSED">{P117.P117_CASE_WORKFLOW_STATUS_CLOSED}</option>
					</select>
				</label>
				<label class="flex items-center gap-1">
					<span class="text-[color:var(--ce-l-text-secondary)]">{P117.P117_CASE_WORKFLOW_FIELD_TYPE}</span>
					<select
						class="rounded border border-[color:var(--ce-l-border-subtle)] bg-transparent px-2 py-1"
						bind:value={filterType}
						data-testid="case-workflow-panel--filter-type"
					>
						<option value="all">{P117.P117_CASE_WORKFLOW_FILTER_TYPE_ALL}</option>
						<option value="TASK">{P117.P117_CASE_WORKFLOW_TYPE_TASK}</option>
						<option value="LEAD">{P117.P117_CASE_WORKFLOW_TYPE_LEAD}</option>
					</select>
				</label>
				<label class="flex flex-1 min-w-[200px] items-center gap-1">
					<span class="text-[color:var(--ce-l-text-secondary)] shrink-0">{P117.P117_CASE_WORKFLOW_FILTER_TEXT}</span>
					<input
						class="flex-1 rounded border border-[color:var(--ce-l-border-subtle)] bg-transparent px-2 py-1"
						bind:value={filterText}
						placeholder={P117.P117_CASE_WORKFLOW_FILTER_TEXT_PLACEHOLDER}
						data-testid="case-workflow-panel--filter-text"
					/>
				</label>
			</div>
		</section>
	{/if}

	{#if loading}
		<div class="flex items-center gap-2 text-sm text-[color:var(--ce-l-text-secondary)]" data-testid="case-workflow-panel--loading">
			<Spinner className="h-4 w-4" />
			{P117.P117_CASE_WORKFLOW_LOADING}
		</div>
	{:else if clientError}
		<p class="text-sm text-red-600 dark:text-red-400" data-testid="case-workflow-panel--error">{clientError}</p>
	{:else if filteredItems.length === 0}
		<p class="text-sm text-[color:var(--ce-l-text-secondary)]" data-testid="case-workflow-panel--empty">{P117.P117_CASE_WORKFLOW_EMPTY}</p>
	{:else}
		<ul class="flex flex-col gap-2" data-testid="case-workflow-panel--list">
			{#each filteredItems as it (it.workflow_item_id)}
				<li
					class="rounded border border-[color:var(--ce-l-border-subtle)] p-3 flex flex-col gap-2"
					data-testid="case-workflow-panel--row"
					data-workflow-item-id={it.workflow_item_id}
				>
					<div class="flex flex-wrap justify-between gap-2">
						<div class="font-medium text-[color:var(--ce-l-text-primary)]">{it.title}</div>
						<div class="text-xs font-mono text-[color:var(--ce-l-text-secondary)]">
							{P117.P117_CASE_WORKFLOW_LABEL_ITEM} · {typeLabel(it.workflow_type)} · {statusLabel(it.status)}
						</div>
					</div>
					{#if it.description}
						<p class="text-sm text-[color:var(--ce-l-text-secondary)] whitespace-pre-wrap">{it.description}</p>
					{/if}
					<p class="text-xs text-[color:var(--ce-l-text-secondary)]">
						{P117.P117_CASE_WORKFLOW_UPDATED_LINE} — {P117.P117_CASE_WORKFLOW_META_UPDATED}{' '}{it.updated_at} ({it.updated_by})
						· {P117.P117_CASE_WORKFLOW_META_CREATED}{' '}{it.created_at} ({it.created_by})
					</p>
					{#if caseEngineToken && editingId !== it.workflow_item_id}
						<button
							type="button"
							class="self-start rounded px-2 py-1 text-xs border border-[color:var(--ce-l-border-subtle)]"
							data-testid="case-workflow-panel--edit-open"
							on:click={() => openEdit(it)}
						>
							{P117.P117_CASE_WORKFLOW_ROW_EDIT}
						</button>
					{/if}
					{#if editingId === it.workflow_item_id}
						<div class="flex flex-col gap-2 border-t border-[color:var(--ce-l-border-subtle)] pt-2" data-testid="case-workflow-panel--edit-form">
							<label class="flex flex-col gap-1 text-sm">
								<span>{P117.P117_CASE_WORKFLOW_FIELD_TITLE}</span>
								<input class="rounded border border-[color:var(--ce-l-border-subtle)] bg-transparent px-2 py-1" bind:value={editTitle} data-testid="case-workflow-panel--edit-title" />
							</label>
							<label class="flex flex-col gap-1 text-sm">
								<span>{P117.P117_CASE_WORKFLOW_FIELD_DESCRIPTION}</span>
								<textarea class="rounded border border-[color:var(--ce-l-border-subtle)] bg-transparent px-2 py-1 min-h-[64px]" bind:value={editDescription} data-testid="case-workflow-panel--edit-description" />
							</label>
							<label class="flex flex-col gap-1 text-sm">
								<span>{P117.P117_CASE_WORKFLOW_FIELD_STATUS}</span>
								<select class="rounded border border-[color:var(--ce-l-border-subtle)] bg-transparent px-2 py-1" bind:value={editStatus} data-testid="case-workflow-panel--edit-status">
									<option value="OPEN">{P117.P117_CASE_WORKFLOW_STATUS_OPEN}</option>
									<option value="IN_PROGRESS">{P117.P117_CASE_WORKFLOW_STATUS_IN_PROGRESS}</option>
									<option value="CLOSED">{P117.P117_CASE_WORKFLOW_STATUS_CLOSED}</option>
								</select>
							</label>
							{#if editError}
								<p class="text-sm text-red-600 dark:text-red-400" data-testid="case-workflow-panel--edit-error">{editError}</p>
							{/if}
							<div class="flex gap-2">
								<button
									type="button"
									class="rounded px-3 py-1.5 text-sm font-medium border border-[color:var(--ce-l-border-subtle)]"
									data-testid="case-workflow-panel--edit-save"
									disabled={editBusy}
									on:click={() => void submitEdit()}
								>
									{P117.P117_CASE_WORKFLOW_ROW_SAVE}
								</button>
								<button type="button" class="text-sm text-[color:var(--ce-l-text-secondary)]" disabled={editBusy} on:click={cancelEdit}>
									{P117.P117_CASE_WORKFLOW_ROW_CANCEL}
								</button>
							</div>
						</div>
					{/if}
				</li>
			{/each}
		</ul>
	{/if}
</div>
