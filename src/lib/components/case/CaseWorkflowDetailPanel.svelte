<!--
	P127-03 — Phase 117 workflow item detail (list lookup; no GET-by-id API).
	P127-04 — Manual status update: explicit apply only; no auto-save.
-->
<script lang="ts">
	import { onDestroy } from 'svelte';
	import { toast } from 'svelte-sonner';
	import {
		listCaseWorkflowItems,
		updateCaseWorkflowItem,
		type CaseEngineCaseWorkflowItem,
		type CaseWorkflowItemStatus
	} from '$lib/apis/caseEngine/caseWorkflowItemsApi';
	import { p127LabelWorkflowStatus, p127LabelWorkflowType } from '$lib/case/p127WorkflowDisplay';
	import {
		P127_WORKFLOW_DETAIL_BACK,
		P127_WORKFLOW_DETAIL_ERROR_GENERIC,
		P127_WORKFLOW_DETAIL_FIELD_TITLE,
		P127_WORKFLOW_DETAIL_FIELD_TYPE,
		P127_WORKFLOW_DETAIL_LOADING,
		P127_WORKFLOW_DETAIL_META_CREATED,
		P127_WORKFLOW_DETAIL_META_UPDATED,
		P127_WORKFLOW_DETAIL_NOT_FOUND,
		P127_WORKFLOW_DETAIL_NOTES_EMPTY,
		P127_WORKFLOW_DETAIL_SECTION_IDENTITY,
		P127_WORKFLOW_DETAIL_SECTION_NOTES,
		P127_WORKFLOW_DETAIL_SECTION_STATUS,
		P127_WORKFLOW_DETAIL_STATUS_APPLY,
		P127_WORKFLOW_DETAIL_STATUS_APPLYING,
		P127_WORKFLOW_DETAIL_STATUS_CONTROL_NOTE,
		P127_WORKFLOW_DETAIL_STATUS_CURRENT_LABEL,
		P127_WORKFLOW_DETAIL_STATUS_SELECT_LABEL,
		P127_WORKFLOW_DETAIL_STATUS_SUCCESS_TOAST
	} from '$lib/caseContext/p127WorkflowListDetailCopy';
	import { DS_BTN_CLASSES, DS_TIMELINE_CLASSES, DS_TYPE_CLASSES } from '$lib/case/detectivePrimitiveFoundation';
	import Spinner from '$lib/components/common/Spinner.svelte';

	export let caseId: string;
	export let workflowItemId: string;
	export let token: string;
	export let backHref: string;

	let loading = false;
	let clientError = '';
	let detail: CaseEngineCaseWorkflowItem | null = null;

	let draftStatus: CaseWorkflowItemStatus = 'OPEN';
	let statusSaving = false;
	let statusUpdateError = '';

	let requestGeneration = 0;
	let activeKey = '';

	function resetForRoute(): void {
		loading = false;
		clientError = '';
		detail = null;
		statusUpdateError = '';
		statusSaving = false;
		draftStatus = 'OPEN';
		requestGeneration += 1;
		activeKey = `${caseId}|${workflowItemId}`;
	}

	$: if (caseId && workflowItemId && `${caseId}|${workflowItemId}` !== activeKey) {
		resetForRoute();
	}

	onDestroy(() => {
		requestGeneration += 1;
	});

	async function loadDetail(): Promise<void> {
		const myCase = caseId;
		const wid = workflowItemId;
		if (!myCase || !wid) return;
		if (!token) {
			clientError = P127_WORKFLOW_DETAIL_ERROR_GENERIC;
			detail = null;
			return;
		}
		const gen = ++requestGeneration;
		loading = true;
		clientError = '';
		detail = null;
		try {
			const list = await listCaseWorkflowItems(myCase, token);
			if (gen !== requestGeneration || myCase !== caseId || wid !== workflowItemId) return;
			const found = list.find((x) => x.workflow_item_id === wid) ?? null;
			detail = found;
			if (found) {
				draftStatus = found.status;
				statusUpdateError = '';
			}
			if (!found) {
				clientError = P127_WORKFLOW_DETAIL_NOT_FOUND;
			}
		} catch (e: unknown) {
			if (gen !== requestGeneration || myCase !== caseId || wid !== workflowItemId) return;
			detail = null;
			clientError = e instanceof Error ? e.message : P127_WORKFLOW_DETAIL_ERROR_GENERIC;
		} finally {
			if (gen === requestGeneration && myCase === caseId && wid === workflowItemId) loading = false;
		}
	}

	$: if (caseId && workflowItemId && token && activeKey === `${caseId}|${workflowItemId}`) {
		void loadDetail();
	}

	$: if (caseId && workflowItemId && !token && activeKey === `${caseId}|${workflowItemId}`) {
		clientError = P127_WORKFLOW_DETAIL_ERROR_GENERIC;
		detail = null;
		loading = false;
	}

	async function applyStatusChange(): Promise<void> {
		const myCase = caseId;
		const wid = workflowItemId;
		const cur = detail;
		if (!myCase || !wid || !token || !cur) return;
		if (draftStatus === cur.status) return;
		const gen = requestGeneration;
		statusSaving = true;
		statusUpdateError = '';
		try {
			const updated = await updateCaseWorkflowItem(myCase, wid, token, { status: draftStatus });
			if (gen !== requestGeneration || myCase !== caseId || wid !== workflowItemId) return;
			detail = updated;
			draftStatus = updated.status;
			toast.success(P127_WORKFLOW_DETAIL_STATUS_SUCCESS_TOAST);
		} catch (e: unknown) {
			if (gen !== requestGeneration || myCase !== caseId || wid !== workflowItemId) return;
			statusUpdateError = e instanceof Error ? e.message : P127_WORKFLOW_DETAIL_ERROR_GENERIC;
		} finally {
			if (gen === requestGeneration && myCase === caseId && wid === workflowItemId) statusSaving = false;
		}
	}
</script>

<div
	class="flex flex-col gap-4 min-h-0"
	data-testid="case-workflow-detail-panel"
	data-case-workflow-detail-case-id={caseId}
	data-case-workflow-detail-item-id={workflowItemId}
>
	<nav class="shrink-0">
		<a
			href={backHref}
			class="text-sm text-[color:var(--ce-l-text-secondary)] hover:underline"
			data-testid="case-workflow-detail-panel--back"
		>
			{P127_WORKFLOW_DETAIL_BACK}
		</a>
	</nav>

	{#if loading}
		<div
			class="flex items-center gap-2 text-sm text-[color:var(--ce-l-text-secondary)]"
			data-testid="case-workflow-detail-panel--loading"
		>
			<Spinner className="h-4 w-4" />
			<span>{P127_WORKFLOW_DETAIL_LOADING}</span>
		</div>
	{:else if clientError && !detail}
		<p class="text-sm text-[color:var(--ce-l-text-secondary)] m-0" data-testid="case-workflow-detail-panel--error" role="alert">
			{clientError}
		</p>
	{:else if detail}
		<section class="flex flex-col gap-2" data-testid="case-workflow-detail-panel--identity">
			<h2 class="{DS_TYPE_CLASSES.section} text-sm font-medium text-[color:var(--ce-l-text-primary)] m-0">
				{P127_WORKFLOW_DETAIL_SECTION_IDENTITY}
			</h2>
			<dl class="grid grid-cols-1 sm:grid-cols-[minmax(0,12rem)_1fr] gap-x-4 gap-y-1 text-sm m-0">
				<dt class="text-[color:var(--ce-l-text-muted)] shrink-0">{P127_WORKFLOW_DETAIL_FIELD_TYPE}</dt>
				<dd class="text-[color:var(--ce-l-text-primary)] break-words">
					{p127LabelWorkflowType(detail.workflow_type)}
				</dd>
				<dt class="text-[color:var(--ce-l-text-muted)] shrink-0">{P127_WORKFLOW_DETAIL_FIELD_TITLE}</dt>
				<dd class="text-[color:var(--ce-l-text-primary)] break-words">{detail.title}</dd>
			</dl>
		</section>

		<section class="flex flex-col gap-3" data-testid="case-workflow-detail-panel--status">
			<h2 class="{DS_TYPE_CLASSES.section} text-sm font-medium text-[color:var(--ce-l-text-primary)] m-0">
				{P127_WORKFLOW_DETAIL_SECTION_STATUS}
			</h2>
			<p class="text-sm text-[color:var(--ce-l-text-primary)] m-0" data-testid="case-workflow-detail-panel--stored-status">
				<span class="text-[color:var(--ce-l-text-muted)]">{P127_WORKFLOW_DETAIL_STATUS_CURRENT_LABEL}:</span>
				{' '}{p127LabelWorkflowStatus(detail.status)}
			</p>
			<p class="text-xs text-[color:var(--ce-l-text-muted)] m-0">{P127_WORKFLOW_DETAIL_STATUS_CONTROL_NOTE}</p>
			<div class="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end sm:gap-3">
				<label class="flex flex-col gap-1 text-sm min-w-[12rem] flex-1">
					<span class="text-[color:var(--ce-l-text-secondary)]">{P127_WORKFLOW_DETAIL_STATUS_SELECT_LABEL}</span>
					<select
						class="w-full max-w-md {DS_TIMELINE_CLASSES.formControl}"
						bind:value={draftStatus}
						disabled={statusSaving}
						data-testid="case-workflow-detail-panel--status-select"
					>
						<option value="OPEN">{p127LabelWorkflowStatus('OPEN')}</option>
						<option value="IN_PROGRESS">{p127LabelWorkflowStatus('IN_PROGRESS')}</option>
						<option value="CLOSED">{p127LabelWorkflowStatus('CLOSED')}</option>
					</select>
				</label>
				<button
					type="button"
					class="{DS_BTN_CLASSES.secondary} shrink-0"
					disabled={statusSaving || draftStatus === detail.status}
					data-testid="case-workflow-detail-panel--status-apply"
					on:click={() => void applyStatusChange()}
				>
					{statusSaving ? P127_WORKFLOW_DETAIL_STATUS_APPLYING : P127_WORKFLOW_DETAIL_STATUS_APPLY}
				</button>
			</div>
			{#if statusUpdateError}
				<p
					class="text-sm text-red-600 dark:text-red-400 m-0"
					data-testid="case-workflow-detail-panel--status-error"
					role="alert"
				>
					{statusUpdateError}
				</p>
			{/if}
		</section>

		<section class="flex flex-col gap-2" data-testid="case-workflow-detail-panel--notes">
			<h2 class="{DS_TYPE_CLASSES.section} text-sm font-medium text-[color:var(--ce-l-text-primary)] m-0">
				{P127_WORKFLOW_DETAIL_SECTION_NOTES}
			</h2>
			{#if detail.description && detail.description.trim().length > 0}
				<p class="text-sm text-[color:var(--ce-l-text-secondary)] m-0 whitespace-pre-wrap break-words">{detail.description}</p>
			{:else}
				<p class="text-sm text-[color:var(--ce-l-text-secondary)] m-0" data-testid="case-workflow-detail-panel--notes-empty">
					{P127_WORKFLOW_DETAIL_NOTES_EMPTY}
				</p>
			{/if}
		</section>

		<p class="text-xs text-[color:var(--ce-l-text-muted)] m-0" data-testid="case-workflow-detail-panel--meta">
			{P127_WORKFLOW_DETAIL_META_UPDATED}{' '}{detail.updated_at} · {P127_WORKFLOW_DETAIL_META_CREATED}{' '}{detail.created_at}
		</p>
	{/if}
</div>
