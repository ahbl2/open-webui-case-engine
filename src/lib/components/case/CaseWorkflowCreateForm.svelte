<!--
	P127-02 — Manual workflow item creation (Phase 117 `case-workflow-items`). No page stores; no case-data prefill.
-->
<script lang="ts">
	import {
		createCaseWorkflowItem,
		type CaseEngineCaseWorkflowItem,
		type CaseWorkflowItemStatus,
		type CaseWorkflowItemType
	} from '$lib/apis/caseEngine/caseWorkflowItemsApi';
	import { DS_BTN_CLASSES, DS_TIMELINE_CLASSES } from '$lib/case/detectivePrimitiveFoundation';
	import {
		P127_WORKFLOW_CREATE_CANCEL,
		P127_WORKFLOW_CREATE_SECTION_LABEL,
		P127_WORKFLOW_CREATE_SUBMIT,
		P127_WORKFLOW_CREATE_SUBMITTING,
		P127_WORKFLOW_FIELD_DESCRIPTION_LABEL,
		P127_WORKFLOW_FIELD_STATUS_LABEL,
		P127_WORKFLOW_FIELD_TITLE_LABEL,
		P127_WORKFLOW_FIELD_TYPE_LABEL,
		P127_WORKFLOW_STATUS_CLOSED,
		P127_WORKFLOW_STATUS_IN_PROGRESS,
		P127_WORKFLOW_STATUS_OPEN,
		P127_WORKFLOW_TYPE_LEAD,
		P127_WORKFLOW_TYPE_SCOPE_NOTE,
		P127_WORKFLOW_TYPE_TASK,
		P127_WORKFLOW_VALIDATION_TITLE_REQUIRED
	} from '$lib/caseContext/p127WorkflowCreateCopy';

	/** Prefix for `data-testid` (e.g. `case-workflow-panel` for P117 panel, `case-workflow-p127-create` for Workflow tab modal). */
	export let testIdPrefix = 'case-workflow-p127-create';

	export let caseId: string;
	export let token: string;
	export let onSuccess: (created: CaseEngineCaseWorkflowItem) => void | Promise<void>;
	export let onCancel: () => void;

	let workflowType: CaseWorkflowItemType = 'TASK';
	let title = '';
	let description = '';
	let status: CaseWorkflowItemStatus = 'OPEN';
	let clientError = '';
	let busy = false;

	function tid(suffix: string): string {
		return `${testIdPrefix}--${suffix}`;
	}

	async function submit(): Promise<void> {
		const cid = String(caseId ?? '').trim();
		const t = title.trim();
		if (!t) {
			clientError = P127_WORKFLOW_VALIDATION_TITLE_REQUIRED;
			return;
		}
		if (!cid || !token) return;
		clientError = '';
		busy = true;
		try {
			const desc = description.trim();
			const created = await createCaseWorkflowItem(cid, token, {
				workflow_type: workflowType,
				title: t,
				description: desc.length > 0 ? desc : null,
				status
			});
			await onSuccess(created);
		} catch (e: unknown) {
			clientError = e instanceof Error ? e.message : 'Request failed.';
		} finally {
			busy = false;
		}
	}
</script>

<div class="flex flex-col gap-3" data-testid={tid('form')}>
	<div class="text-sm font-medium text-[color:var(--ce-l-text-primary)]">{P127_WORKFLOW_CREATE_SECTION_LABEL}</div>
	<p class="text-xs text-[color:var(--ce-l-text-muted)] m-0">{P127_WORKFLOW_TYPE_SCOPE_NOTE}</p>
	<label class="flex flex-col gap-1 text-sm">
		<span class="text-[color:var(--ce-l-text-secondary)]">{P127_WORKFLOW_FIELD_TYPE_LABEL}</span>
		<select
			class="w-full {DS_TIMELINE_CLASSES.formControl}"
			bind:value={workflowType}
			data-testid={tid('type')}
			autocomplete="off"
		>
			<option value="TASK">{P127_WORKFLOW_TYPE_TASK}</option>
			<option value="LEAD">{P127_WORKFLOW_TYPE_LEAD}</option>
		</select>
	</label>
	<label class="flex flex-col gap-1 text-sm">
		<span class="text-[color:var(--ce-l-text-secondary)]">{P127_WORKFLOW_FIELD_TITLE_LABEL}</span>
		<input
			type="text"
			class="w-full {DS_TIMELINE_CLASSES.formControl}"
			bind:value={title}
			data-testid={tid('title')}
			autocomplete="off"
		/>
	</label>
	<label class="flex flex-col gap-1 text-sm">
		<span class="text-[color:var(--ce-l-text-secondary)]">{P127_WORKFLOW_FIELD_DESCRIPTION_LABEL}</span>
		<textarea
			class="w-full {DS_TIMELINE_CLASSES.formControl} min-h-[72px]"
			bind:value={description}
			data-testid={tid('description')}
			autocomplete="off"
		></textarea>
	</label>
	<label class="flex flex-col gap-1 text-sm">
		<span class="text-[color:var(--ce-l-text-secondary)]">{P127_WORKFLOW_FIELD_STATUS_LABEL}</span>
		<select
			class="w-full {DS_TIMELINE_CLASSES.formControl}"
			bind:value={status}
			data-testid={tid('status')}
			autocomplete="off"
		>
			<option value="OPEN">{P127_WORKFLOW_STATUS_OPEN}</option>
			<option value="IN_PROGRESS">{P127_WORKFLOW_STATUS_IN_PROGRESS}</option>
			<option value="CLOSED">{P127_WORKFLOW_STATUS_CLOSED}</option>
		</select>
	</label>
	{#if clientError}
		<p class="text-sm text-red-600 dark:text-red-400 m-0" data-testid={tid('error')} role="alert">{clientError}</p>
	{/if}
	<div class="flex gap-2 justify-end pt-1">
		<button type="button" class="{DS_BTN_CLASSES.ghost} text-sm" data-testid={tid('cancel')} disabled={busy} on:click={onCancel}>
			{P127_WORKFLOW_CREATE_CANCEL}
		</button>
		<button
			type="button"
			class="{DS_BTN_CLASSES.primary} text-sm disabled:opacity-50"
			data-testid={tid('submit')}
			disabled={busy}
			on:click={() => void submit()}
		>
			{busy ? P127_WORKFLOW_CREATE_SUBMITTING : P127_WORKFLOW_CREATE_SUBMIT}
		</button>
	</div>
</div>
