<script lang="ts">
	/**
	 * P117-04 — Phase 117 case workflow items: list, explicit create/update, local display filters only.
	 * Server list order only (`updated_at DESC`, `workflow_item_id ASC` from Case Engine); do not client-side re-sort.
	 * Updates are versioned in the engine; this UI does not expose version history (by design for this ticket).
	 */
	import { onDestroy } from 'svelte';
	import { toast } from 'svelte-sonner';
	import {
		listCaseWorkflowItems,
		updateCaseWorkflowItem,
		type CaseEngineCaseWorkflowItem,
		type CaseWorkflowItemStatus,
		type CaseWorkflowItemType
	} from '$lib/apis/caseEngine/caseWorkflowItemsApi';
	import CaseWorkflowCreateForm from '$lib/components/case/CaseWorkflowCreateForm.svelte';
	import Spinner from '$lib/components/common/Spinner.svelte';
	import * as P117 from '$lib/case/p117CaseWorkflowItemsCopy';
	import { P127_WORKFLOW_CREATE_SUCCESS_TOAST } from '$lib/caseContext/p127WorkflowCreateCopy';
	import {
		P127_WORKFLOW_LIST_EMPTY,
		P127_WORKFLOW_LIST_EMPTY_HINT,
		P127_WORKFLOW_LIST_FILTER_NO_MATCH
	} from '$lib/caseContext/p127WorkflowListDetailCopy';
	import { p127LabelWorkflowStatus, p127LabelWorkflowType } from '$lib/case/p127WorkflowDisplay';

	export let caseId: string;
	export let caseEngineToken: string;
	/** P132.5-04 — Left rail: read-only list + detail links (no create/filters/edit). */
	export let railCompact = false;

	let loading = false;
	let clientError = '';
	let items: CaseEngineCaseWorkflowItem[] = [];
	let showCreateForm = false;
	let createFormKey = 0;

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
		createFormKey = 0;
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

	async function handleCreateSuccess(): Promise<void> {
		const myCase = caseId;
		if (!myCase) return;
		const gen = requestGeneration;
		showCreateForm = false;
		toast.success(P127_WORKFLOW_CREATE_SUCCESS_TOAST);
		await loadList();
		if (gen !== requestGeneration || myCase !== caseId) return;
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
	data-case-workflow-rail-compact={railCompact ? 'true' : undefined}
>
	{#if railCompact}
		<div
			class="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-[color:var(--ce-l-text-muted)]"
			data-testid="case-workflow-panel--rail-heading"
		>
			{P117.P117_CASE_WORKFLOW_PAGE_TITLE}
		</div>
	{:else}
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
							if (showCreateForm) createFormKey += 1;
						}}
					>
						{P117.P117_CASE_WORKFLOW_CREATE_OPEN}
					</button>
				</div>
			{/if}
		</header>
	{/if}

	{#if !railCompact && showCreateForm && caseEngineToken}
		<section
			class="rounded border border-[color:var(--ce-l-border-subtle)] p-3 flex flex-col gap-2"
			data-testid="case-workflow-panel--create-form"
		>
			{#key createFormKey}
				<CaseWorkflowCreateForm
					testIdPrefix="case-workflow-panel"
					caseId={caseId}
					token={caseEngineToken}
					onCancel={() => {
						showCreateForm = false;
					}}
					onSuccess={() => void handleCreateSuccess()}
				/>
			{/key}
		</section>
	{/if}

	{#if caseEngineToken && !railCompact}
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
		<p class="text-sm text-[color:var(--ce-l-text-secondary)] m-0" data-testid="case-workflow-panel--empty">
			{#if items.length === 0}
				{P127_WORKFLOW_LIST_EMPTY}
			{:else}
				{P127_WORKFLOW_LIST_FILTER_NO_MATCH}
			{/if}
		</p>
		{#if items.length === 0}
			<p class="text-xs text-[color:var(--ce-l-text-muted)] m-0 mt-1" data-testid="case-workflow-panel--empty-hint">
				{P127_WORKFLOW_LIST_EMPTY_HINT}
			</p>
		{/if}
	{:else}
		<ul
			class="flex flex-col gap-2 {railCompact ? 'max-h-52 overflow-y-auto' : ''}"
			data-testid="case-workflow-panel--list"
		>
			{#each filteredItems as it (it.workflow_item_id)}
				<li
					class="rounded border border-[color:var(--ce-l-border-subtle)] {railCompact ? 'p-2' : 'p-3'} flex flex-col gap-2"
					data-testid="case-workflow-panel--row"
					data-workflow-item-id={it.workflow_item_id}
				>
					<div class="flex flex-wrap justify-between gap-2 items-baseline">
						<a
							class="font-medium text-[color:var(--ce-l-text-primary)] hover:underline {railCompact
								? 'text-xs leading-snug'
								: ''}"
							href={`/case/${encodeURIComponent(caseId)}/workflow/witem/${encodeURIComponent(it.workflow_item_id)}`}
							data-testid="case-workflow-panel--detail-link"
							>{it.title}</a>
						<div class="text-xs text-[color:var(--ce-l-text-secondary)] flex flex-wrap gap-x-1 items-baseline">
							<span data-testid="case-workflow-panel--type">{p127LabelWorkflowType(it.workflow_type)}</span>
							<span class="text-[color:var(--ce-l-text-muted)]" aria-hidden="true">·</span>
							<span data-testid="case-workflow-panel--status">{p127LabelWorkflowStatus(it.status)}</span>
						</div>
					</div>
					{#if !railCompact}
						<p class="text-xs text-[color:var(--ce-l-text-secondary)]">
							{P117.P117_CASE_WORKFLOW_UPDATED_LINE} — {P117.P117_CASE_WORKFLOW_META_UPDATED}{' '}{it.updated_at} ({it.updated_by})
							· {P117.P117_CASE_WORKFLOW_META_CREATED}{' '}{it.created_at} ({it.created_by})
						</p>
					{/if}
					{#if caseEngineToken && editingId !== it.workflow_item_id && !railCompact}
						<button
							type="button"
							class="self-start rounded px-2 py-1 text-xs border border-[color:var(--ce-l-border-subtle)]"
							data-testid="case-workflow-panel--edit-open"
							on:click={() => openEdit(it)}
						>
							{P117.P117_CASE_WORKFLOW_ROW_EDIT}
						</button>
					{/if}
					{#if !railCompact && editingId === it.workflow_item_id}
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
