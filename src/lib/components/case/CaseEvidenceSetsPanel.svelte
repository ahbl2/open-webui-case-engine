<script lang="ts">
	/**
	 * P109-03 — Case-scoped evidence set management: list (Case Engine) + create from session selection.
	 * P109-04 — List rows link to read-only detail.
	 * P109-05 — Audit attribution + surface constraint copy.
	 */
	import { onDestroy } from 'svelte';
	import {
		evidenceSelection,
		evidenceSelectionCounts,
		evidenceSelectionToCreateItems,
		clearEvidenceSelection,
		ensureEvidenceSelectionCaseScope
	} from '$lib/case/p109EvidenceSelection';
	import {
		getEvidenceSetsList,
		createEvidenceSet,
		type CaseEngineEvidenceSet
	} from '$lib/apis/caseEngine/evidenceSetsApi';
	import {
		P109_EVIDENCE_SET_AUDIT_ATTRIBUTION_LINE,
		P109_EVIDENCE_SETS_PAGE_TITLE,
		P109_EVIDENCE_SETS_SUPPORTING_COPY,
		P109_EVIDENCE_SETS_SESSION_SELECTION_LABEL,
		P109_EVIDENCE_SETS_SAVED_LIST_LABEL,
		P109_EVIDENCE_SETS_SAVED_LIST_AUDIT_HINT,
		P109_EVIDENCE_SETS_EMPTY_LIST,
		P109_EVIDENCE_SETS_LOADING,
		P109_EVIDENCE_SETS_ERROR_GENERIC,
		P109_EVIDENCE_SETS_NO_SESSION,
		P109_EVIDENCE_SETS_NAME_LABEL,
		P109_EVIDENCE_SETS_NAME_PLACEHOLDER,
		P109_EVIDENCE_SETS_CREATE_BUTTON,
		P109_EVIDENCE_SETS_CREATE_SECTION_ARIA_LABEL,
		P109_EVIDENCE_SETS_CREATE_DISABLED_NO_SELECTION,
		P109_EVIDENCE_SETS_SELECTION_COUNTS,
		P109_EVIDENCE_SETS_REFRESH,
		P109_EVIDENCE_SETS_CREATE_SUCCESS,
		P109_EVIDENCE_SETS_CREATE_FAILED,
		P109_EVIDENCE_SET_DETAIL_LIST_LINK_TITLE
	} from '$lib/case/p109EvidenceSetsCopy';
	import { formatEvidenceSetSavedAt } from '$lib/case/p109EvidenceSetsFormat';
	import Spinner from '$lib/components/common/Spinner.svelte';

	export let caseId: string;
	export let caseEngineToken: string;

	let listLoading = false;
	let listError = '';
	let sets: CaseEngineEvidenceSet[] = [];

	let setName = '';
	let creating = false;
	let createError = '';
	let successMessage = '';

	let requestGeneration = 0;
	let activeCaseKey = '';

	function resetForCase(nextId: string): void {
		listLoading = false;
		listError = '';
		sets = [];
		setName = '';
		creating = false;
		createError = '';
		successMessage = '';
		requestGeneration += 1;
		activeCaseKey = nextId;
	}

	$: if (caseId && caseId !== activeCaseKey) {
		resetForCase(caseId);
	}

	$: ensureEvidenceSelectionCaseScope(caseId);

	$: selState = $evidenceSelection;
	$: counts =
		selState.caseId === caseId ? evidenceSelectionCounts(selState) : { total: 0, timeline: 0, files: 0 };
	$: itemsForCreate =
		selState.caseId === caseId ? evidenceSelectionToCreateItems(selState.selected) : [];

	onDestroy(() => {
		requestGeneration += 1;
	});

	async function loadList(): Promise<void> {
		const myCase = caseId;
		if (!myCase) return;
		if (!caseEngineToken) {
			listError = P109_EVIDENCE_SETS_NO_SESSION;
			sets = [];
			return;
		}
		const gen = ++requestGeneration;
		listLoading = true;
		listError = '';
		sets = [];
		try {
			const list = await getEvidenceSetsList(myCase, caseEngineToken);
			if (gen !== requestGeneration || myCase !== caseId) return;
			sets = list;
		} catch (e: unknown) {
			if (gen !== requestGeneration || myCase !== caseId) return;
			sets = [];
			listError = e instanceof Error ? e.message : P109_EVIDENCE_SETS_ERROR_GENERIC;
		} finally {
			if (gen === requestGeneration && myCase === caseId) listLoading = false;
		}
	}

	async function handleCreate(): Promise<void> {
		const myCase = caseId;
		const name = setName.trim();
		createError = '';
		successMessage = '';
		if (!myCase || !caseEngineToken || creating) return;
		if (!name || itemsForCreate.length === 0) return;

		creating = true;
		try {
			const created = await createEvidenceSet(myCase, caseEngineToken, {
				name,
				items: itemsForCreate
			});
			if (myCase !== caseId) return;
			clearEvidenceSelection();
			setName = '';
			successMessage = P109_EVIDENCE_SETS_CREATE_SUCCESS(created.name, created.items.length);
			await loadList();
		} catch (e: unknown) {
			if (myCase !== caseId) return;
			createError = e instanceof Error ? e.message : P109_EVIDENCE_SETS_CREATE_FAILED;
		} finally {
			if (myCase === caseId) creating = false;
		}
	}

	$: if (caseId && caseEngineToken && activeCaseKey === caseId) {
		void loadList();
	}

	$: if (caseId && !caseEngineToken && activeCaseKey === caseId) {
		listError = P109_EVIDENCE_SETS_NO_SESSION;
		sets = [];
		listLoading = false;
	}

	$: createDisabled =
		creating ||
		!caseEngineToken ||
		counts.total === 0 ||
		!setName.trim() ||
		itemsForCreate.length === 0;
</script>

<div
	class="flex flex-col gap-4 min-h-0"
	data-testid="case-evidence-sets-panel"
	data-case-evidence-sets-case-id={caseId}
>
	<header class="flex flex-col gap-1 shrink-0">
		<h1 class="text-lg font-semibold text-[color:var(--ce-l-text-primary)]">{P109_EVIDENCE_SETS_PAGE_TITLE}</h1>
		<p class="text-sm text-[color:var(--ce-l-text-secondary)] max-w-prose">{P109_EVIDENCE_SETS_SUPPORTING_COPY}</p>
	</header>

	<section
		class="flex flex-col gap-2 rounded-md border border-[color:var(--ce-l-border-subtle)] p-3 bg-[color:var(--ce-l-surface-raised)]"
		data-testid="case-evidence-sets-panel--session-selection"
		aria-label={P109_EVIDENCE_SETS_SESSION_SELECTION_LABEL}
	>
		<div class="text-xs font-medium text-[color:var(--ce-l-text-muted)]">
			{P109_EVIDENCE_SETS_SESSION_SELECTION_LABEL}
		</div>
		<p class="text-sm text-[color:var(--ce-l-text-primary)]" data-testid="case-evidence-sets-panel--selection-counts">
			{P109_EVIDENCE_SETS_SELECTION_COUNTS(counts.timeline, counts.files)}
		</p>
		{#if counts.total === 0}
			<p class="text-xs text-[color:var(--ce-l-text-secondary)]">{P109_EVIDENCE_SETS_CREATE_DISABLED_NO_SELECTION}</p>
		{/if}
	</section>

	<section
		class="flex flex-col gap-2 rounded-md border border-[color:var(--ce-l-border-subtle)] p-3 bg-[color:var(--ce-l-surface-raised)]"
		data-testid="case-evidence-sets-panel--create"
		aria-label={P109_EVIDENCE_SETS_CREATE_SECTION_ARIA_LABEL}
	>
		<label class="flex flex-col gap-1 text-sm">
			<span class="text-[color:var(--ce-l-text-muted)]">{P109_EVIDENCE_SETS_NAME_LABEL}</span>
			<input
				type="text"
				class="rounded border border-[color:var(--ce-l-border-subtle)] bg-[color:var(--ce-l-surface-base)] px-2 py-1.5 text-[color:var(--ce-l-text-primary)]"
				autocomplete="off"
				data-testid="case-evidence-sets-panel--name-input"
				disabled={creating || !caseEngineToken}
				bind:value={setName}
				placeholder={P109_EVIDENCE_SETS_NAME_PLACEHOLDER}
			/>
		</label>
		<div class="flex flex-wrap items-center gap-2">
			<button
				type="button"
				class="rounded px-3 py-1.5 text-sm font-medium border border-[color:var(--ce-l-border-subtle)] text-[color:var(--ce-l-text-primary)] hover:opacity-90 disabled:opacity-50"
				data-testid="case-evidence-sets-panel--create-submit"
				disabled={createDisabled}
				on:click={() => void handleCreate()}
			>
				{creating ? 'Saving…' : P109_EVIDENCE_SETS_CREATE_BUTTON}
			</button>
		</div>
		{#if createError}
			<p class="text-sm text-[color:var(--ce-l-text-secondary)]" data-testid="case-evidence-sets-panel--create-error" role="alert">
				{createError}
			</p>
		{/if}
		{#if successMessage}
			<p class="text-sm text-[color:var(--ce-l-text-secondary)]" data-testid="case-evidence-sets-panel--create-success" role="status">
				{successMessage}
			</p>
		{/if}
	</section>

	<section class="flex flex-col gap-2" data-testid="case-evidence-sets-panel--list-section">
		<div class="flex flex-col gap-1">
			<div class="flex flex-wrap items-center justify-between gap-2">
			<h2 class="text-sm font-semibold text-[color:var(--ce-l-text-primary)]">
				{P109_EVIDENCE_SETS_SAVED_LIST_LABEL}
			</h2>
			<button
				type="button"
				class="rounded px-2 py-1 text-xs font-medium border border-[color:var(--ce-l-border-subtle)] text-[color:var(--ce-l-text-primary)] hover:opacity-90 disabled:opacity-50"
				data-testid="case-evidence-sets-panel--refresh"
				disabled={listLoading || !caseEngineToken}
				on:click={() => void loadList()}
			>
				{P109_EVIDENCE_SETS_REFRESH}
			</button>
			</div>
			<p class="text-xs text-[color:var(--ce-l-text-muted)] max-w-prose" data-testid="case-evidence-sets-panel--list-audit-hint">
				{P109_EVIDENCE_SETS_SAVED_LIST_AUDIT_HINT}
			</p>
		</div>

		{#if listLoading}
			<div class="flex items-center gap-2 text-sm text-[color:var(--ce-l-text-secondary)]" data-testid="case-evidence-sets-panel--loading">
				<Spinner />
				<span>{P109_EVIDENCE_SETS_LOADING}</span>
			</div>
		{:else if listError}
			<p class="text-sm text-[color:var(--ce-l-text-secondary)]" data-testid="case-evidence-sets-panel--list-error" role="alert">
				{listError}
			</p>
		{:else if sets.length === 0}
			<p class="text-sm text-[color:var(--ce-l-text-secondary)]" data-testid="case-evidence-sets-panel--empty">
				{P109_EVIDENCE_SETS_EMPTY_LIST}
			</p>
		{:else}
			<ul class="flex flex-col gap-2 min-h-0" data-testid="case-evidence-sets-panel--list">
				{#each sets as s (s.id)}
					<li data-testid="case-evidence-sets-panel--row" data-evidence-set-id={s.id}>
						<a
							href={`/case/${encodeURIComponent(caseId)}/evidence-sets/${encodeURIComponent(s.id)}`}
							class="block rounded border border-[color:var(--ce-l-border-subtle)] p-3 bg-[color:var(--ce-l-surface-base)] hover:opacity-90 no-underline text-[color:inherit]"
							data-testid="case-evidence-sets-panel--row-link"
							title={P109_EVIDENCE_SET_DETAIL_LIST_LINK_TITLE}
						>
							<div class="font-medium text-[color:var(--ce-l-text-primary)]">{s.name}</div>
							<div class="text-xs text-[color:var(--ce-l-text-muted)] mt-1" data-testid="case-evidence-sets-panel--row-audit">
								{P109_EVIDENCE_SET_AUDIT_ATTRIBUTION_LINE(formatEvidenceSetSavedAt(s.created_at), s.created_by)}
							</div>
						</a>
					</li>
				{/each}
			</ul>
		{/if}
	</section>
</div>
