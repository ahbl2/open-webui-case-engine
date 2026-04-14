<!--
	P126-02 — Manual create only: fixed entity types, typed value, optional note → POST /case-entities.
	No prefills, no case reads, no derived fields. Edit path remains `CaseEntityMutateForm`.
-->
<script lang="ts">
	import { createCaseEntity } from '$lib/apis/caseEngine/caseEntitiesApi';
	import type { CaseEngineCaseEntity } from '$lib/apis/caseEngine/caseEntitiesApi';
	import {
		DS_BTN_CLASSES,
		DS_PANEL_CLASSES,
		DS_TYPE_CLASSES
	} from '$lib/case/detectivePrimitiveFoundation';
	import {
		validateCaseEntityTypeForSave,
		validateDisplayLabelForSave
	} from '$lib/case/p107CaseEntityFormValidation';
	import {
		P126_ENTITY_CREATE_CANCEL,
		P126_ENTITY_CREATE_FORM_SUPPORT,
		P126_ENTITY_CREATE_FORM_TITLE,
		P126_ENTITY_CREATE_SUBMIT,
		P126_ENTITY_CREATE_SUBMITTING,
		P126_ENTITY_FIELD_NOTE_LABEL,
		P126_ENTITY_FIELD_TYPE_LABEL,
		P126_ENTITY_FIELD_TYPE_PLACEHOLDER,
		P126_ENTITY_FIELD_VALUE_LABEL,
		P126_ENTITY_TYPE_OPTIONS
	} from '$lib/caseContext/p126EntityCreateCopy';

	export let caseId: string;
	export let caseEngineToken: string;
	export let onSuccess: (entity: CaseEngineCaseEntity) => void;
	export let onCancel: () => void;

	let typeValue = '';
	let valueText = '';
	let noteText = '';
	let clientError = '';
	let submitting = false;

	function buildAttributes(): Record<string, unknown> {
		const n = String(noteText ?? '').trim();
		return n.length > 0 ? { note: n } : {};
	}

	async function submit(): Promise<void> {
		clientError = '';
		const t = validateCaseEntityTypeForSave(typeValue);
		if (!t.ok) {
			clientError = t.error;
			return;
		}
		const v = validateDisplayLabelForSave(valueText);
		if (!v.ok) {
			clientError = v.error;
			return;
		}
		const myCase = String(caseId ?? '').trim();
		if (!myCase || !caseEngineToken) {
			clientError = 'Case Engine session is required.';
			return;
		}
		submitting = true;
		try {
			const created = await createCaseEntity(myCase, caseEngineToken, {
				entity_type: t.value,
				display_label: v.value,
				attributes: buildAttributes()
			});
			onSuccess(created);
		} catch (e: unknown) {
			clientError = e instanceof Error ? e.message : 'Request failed.';
		} finally {
			submitting = false;
		}
	}
</script>

<div
	class="{DS_PANEL_CLASSES.primaryDense} flex flex-col gap-3"
	data-testid="case-entity-create-form"
	data-case-entity-create-form="true"
>
	<h2 class="{DS_TYPE_CLASSES.section} m-0 text-sm font-semibold text-[color:var(--ce-l-text-primary)]">
		{P126_ENTITY_CREATE_FORM_TITLE}
	</h2>
	<p class="text-xs text-[color:var(--ce-l-text-secondary)] m-0">{P126_ENTITY_CREATE_FORM_SUPPORT}</p>

	{#if clientError}
		<p class="text-sm text-red-700 dark:text-red-300 m-0" data-testid="case-entity-create-form--error" role="alert">
			{clientError}
		</p>
	{/if}

	<label class="flex flex-col gap-1 text-sm">
		<span class="text-[color:var(--ce-l-text-muted)]">{P126_ENTITY_FIELD_TYPE_LABEL}</span>
		<select
			class="rounded border border-[color:var(--ce-l-border-subtle)] bg-[color:var(--ce-l-surface-base)] px-2 py-1.5 text-[color:var(--ce-l-text-primary)]"
			data-testid="case-entity-create-form--type"
			disabled={submitting}
			bind:value={typeValue}
		>
			<option value="">{P126_ENTITY_FIELD_TYPE_PLACEHOLDER}</option>
			{#each P126_ENTITY_TYPE_OPTIONS as opt (opt.value)}
				<option value={opt.value}>{opt.label}</option>
			{/each}
		</select>
	</label>

	<label class="flex flex-col gap-1 text-sm">
		<span class="text-[color:var(--ce-l-text-muted)]">{P126_ENTITY_FIELD_VALUE_LABEL}</span>
		<textarea
			class="rounded border border-[color:var(--ce-l-border-subtle)] bg-[color:var(--ce-l-surface-base)] px-2 py-1 text-[color:var(--ce-l-text-primary)] min-h-[4rem]"
			rows="3"
			autocomplete="off"
			spellcheck="true"
			data-testid="case-entity-create-form--value"
			disabled={submitting}
			bind:value={valueText}
		></textarea>
	</label>

	<label class="flex flex-col gap-1 text-sm">
		<span class="text-[color:var(--ce-l-text-muted)]">{P126_ENTITY_FIELD_NOTE_LABEL}</span>
		<textarea
			class="rounded border border-[color:var(--ce-l-border-subtle)] bg-[color:var(--ce-l-surface-base)] px-2 py-1 text-[color:var(--ce-l-text-primary)] min-h-[3rem]"
			rows="2"
			autocomplete="off"
			spellcheck="true"
			data-testid="case-entity-create-form--note"
			disabled={submitting}
			bind:value={noteText}
		></textarea>
	</label>

	<div class="flex flex-wrap gap-2">
		<button
			type="button"
			class="{DS_BTN_CLASSES.primary}"
			data-testid="case-entity-create-form--submit"
			disabled={submitting}
			on:click={() => void submit()}
		>
			{submitting ? P126_ENTITY_CREATE_SUBMITTING : P126_ENTITY_CREATE_SUBMIT}
		</button>
		<button
			type="button"
			class="{DS_BTN_CLASSES.secondary}"
			data-testid="case-entity-create-form--cancel"
			disabled={submitting}
			on:click={() => onCancel()}
		>
			{P126_ENTITY_CREATE_CANCEL}
		</button>
	</div>
</div>
