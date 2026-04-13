<script lang="ts">
	/**
	 * P107-01 — Manual create/edit form for case entities (Phase 105 payloads only).
	 */
	import type { CaseEngineCaseEntity } from '$lib/apis/caseEngine/caseEntitiesApi';
	import { createCaseEntity, patchCaseEntity } from '$lib/apis/caseEngine/caseEntitiesApi';
	import {
		P107_CASE_ENTITY_ATTRIBUTES_JSON_HELP,
		P107_CASE_ENTITY_FIELD_ATTRIBUTES_JSON,
		P107_CASE_ENTITY_FIELD_DISPLAY_LABEL,
		P107_CASE_ENTITY_FIELD_ENTITY_TYPE,
		P107_CASE_ENTITY_FORM_CANCEL,
		P107_CASE_ENTITY_FORM_HEADING_CREATE,
		P107_CASE_ENTITY_FORM_HEADING_EDIT,
		P107_CASE_ENTITY_FORM_SUBMITTING,
		P107_CASE_ENTITY_FORM_SUBMIT_CREATE,
		P107_CASE_ENTITY_FORM_SUBMIT_SAVE,
		P107_CASE_ENTITY_FORM_SUPPORTING_NOTE
	} from '$lib/case/p107CaseEntityCreateEditCopy';
	import {
		parseCaseEntityAttributesJsonText,
		validateCaseEntityTypeForSave,
		validateDisplayLabelForSave
	} from '$lib/case/p107CaseEntityFormValidation';

	export let mode: 'create' | 'edit';
	export let caseId: string;
	export let caseEngineToken: string;
	/** Required when `mode === 'edit'`. */
	export let initialEntity: CaseEngineCaseEntity | null = null;

	export let onSuccess: (entity: CaseEngineCaseEntity) => void;
	export let onCancel: () => void;

	let entityType = '';
	let displayLabel = '';
	let attributesText = '{}';
	let clientError = '';
	let submitting = false;

	$: heading = mode === 'create' ? P107_CASE_ENTITY_FORM_HEADING_CREATE : P107_CASE_ENTITY_FORM_HEADING_EDIT;
	$: submitLabel = mode === 'create' ? P107_CASE_ENTITY_FORM_SUBMIT_CREATE : P107_CASE_ENTITY_FORM_SUBMIT_SAVE;

	/** Sync from Case Engine read model when opening edit or switching entity (`initialEntity.id`). */
	$: editSeedKey = mode === 'edit' && initialEntity ? initialEntity.id : '';
	$: if (editSeedKey) {
		entityType = initialEntity!.entity_type;
		displayLabel = initialEntity!.display_label;
		attributesText = JSON.stringify(initialEntity!.attributes ?? {}, null, 2);
	}

	function validateForm(): { ok: true } | { ok: false; error: string } {
		const t = validateCaseEntityTypeForSave(entityType);
		if (!t.ok) return t;
		const d = validateDisplayLabelForSave(displayLabel);
		if (!d.ok) return d;
		const a = parseCaseEntityAttributesJsonText(attributesText);
		if (!a.ok) return a;
		return { ok: true };
	}

	async function submit(): Promise<void> {
		clientError = '';
		const v = validateForm();
		if (!v.ok) {
			clientError = v.error;
			return;
		}
		const t = validateCaseEntityTypeForSave(entityType);
		const d = validateDisplayLabelForSave(displayLabel);
		const a = parseCaseEntityAttributesJsonText(attributesText);
		if (!t.ok || !d.ok || !a.ok) return;

		const myCase = String(caseId ?? '').trim();
		if (!myCase || !caseEngineToken) {
			clientError = 'Case Engine session is required.';
			return;
		}

		submitting = true;
		try {
			if (mode === 'create') {
				const created = await createCaseEntity(myCase, caseEngineToken, {
					entity_type: t.value,
					display_label: d.value,
					attributes: a.attributes
				});
				onSuccess(created);
			} else {
				if (!initialEntity) {
					clientError = 'Entity is not loaded.';
					return;
				}
				const updated = await patchCaseEntity(myCase, initialEntity.id, caseEngineToken, {
					entity_type: t.value,
					display_label: d.value,
					attributes: a.attributes
				});
				onSuccess(updated.case_entity);
			}
		} catch (e: unknown) {
			clientError = e instanceof Error ? e.message : 'Request failed.';
		} finally {
			submitting = false;
		}
	}
</script>

<div
	class="rounded-md border border-[color:var(--ce-l-border-subtle)] p-3 bg-[color:var(--ce-l-surface-raised)] flex flex-col gap-3"
	data-testid="case-entity-form"
	data-case-entity-form-mode={mode}
>
	<h2 class="text-sm font-medium text-[color:var(--ce-l-text-primary)]">{heading}</h2>
	<p class="text-xs text-[color:var(--ce-l-text-secondary)]">{P107_CASE_ENTITY_FORM_SUPPORTING_NOTE}</p>

	{#if clientError}
		<p class="text-sm text-red-700 dark:text-red-300" data-testid="case-entity-form--error" role="alert">
			{clientError}
		</p>
	{/if}

	<label class="flex flex-col gap-1 text-sm">
		<span class="text-[color:var(--ce-l-text-muted)]">{P107_CASE_ENTITY_FIELD_ENTITY_TYPE}</span>
		<input
			type="text"
			class="rounded border border-[color:var(--ce-l-border-subtle)] bg-[color:var(--ce-l-surface-base)] px-2 py-1 text-[color:var(--ce-l-text-primary)]"
			autocomplete="off"
			data-testid="case-entity-form--entity-type"
			disabled={submitting}
			bind:value={entityType}
		/>
	</label>

	<label class="flex flex-col gap-1 text-sm">
		<span class="text-[color:var(--ce-l-text-muted)]">{P107_CASE_ENTITY_FIELD_DISPLAY_LABEL}</span>
		<textarea
			class="rounded border border-[color:var(--ce-l-border-subtle)] bg-[color:var(--ce-l-surface-base)] px-2 py-1 text-[color:var(--ce-l-text-primary)] min-h-[4rem]"
			rows="3"
			autocomplete="off"
			data-testid="case-entity-form--display-label"
			disabled={submitting}
			bind:value={displayLabel}
		></textarea>
	</label>

	<label class="flex flex-col gap-1 text-sm">
		<span class="text-[color:var(--ce-l-text-muted)]">{P107_CASE_ENTITY_FIELD_ATTRIBUTES_JSON}</span>
		<span class="text-xs text-[color:var(--ce-l-text-muted)]">{P107_CASE_ENTITY_ATTRIBUTES_JSON_HELP}</span>
		<textarea
			class="rounded border border-[color:var(--ce-l-border-subtle)] bg-[color:var(--ce-l-surface-base)] px-2 py-1 font-mono text-xs text-[color:var(--ce-l-text-primary)] min-h-[6rem]"
			spellcheck="false"
			data-testid="case-entity-form--attributes-json"
			disabled={submitting}
			bind:value={attributesText}
		></textarea>
	</label>

	<div class="flex flex-wrap gap-2">
		<button
			type="button"
			class="rounded px-3 py-1.5 text-sm font-medium bg-gray-800 text-white hover:bg-gray-700 disabled:opacity-60 dark:bg-gray-200 dark:text-gray-900 dark:hover:bg-white"
			data-testid="case-entity-form--submit"
			disabled={submitting}
			on:click={() => void submit()}
		>
			{submitting ? P107_CASE_ENTITY_FORM_SUBMITTING : submitLabel}
		</button>
		<button
			type="button"
			class="rounded px-3 py-1.5 text-sm font-medium border border-[color:var(--ce-l-border-subtle)] text-[color:var(--ce-l-text-primary)] hover:opacity-90 disabled:opacity-60"
			data-testid="case-entity-form--cancel"
			disabled={submitting}
			on:click={() => onCancel()}
		>
			{P107_CASE_ENTITY_FORM_CANCEL}
		</button>
	</div>
</div>
