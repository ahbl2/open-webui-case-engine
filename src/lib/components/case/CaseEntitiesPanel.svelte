<script lang="ts">
	/**
	 * P106-02 / P106-03 / P106-05 — Case-scoped entities list. Rows link to detail. No client re-sort of server list order.
	 * P107-01 — Create form. P107-04 — Deterministic filter/group (client-side; read contract unchanged).
	 * P107-05 — Read-only audit line on rows (literal `updated_at` from list read).
	 */
	import { onDestroy } from 'svelte';
	import { goto } from '$app/navigation';
	import { getCaseEntitiesList, type CaseEngineCaseEntity } from '$lib/apis/caseEngine/caseEntitiesApi';
	import { auditFieldDisplay } from '$lib/case/p107CaseEntityAudit';
	import CaseEntityMutateForm from '$lib/components/case/CaseEntityMutateForm.svelte';
	import { P107_CASE_ENTITY_CREATE_BUTTON } from '$lib/case/p107CaseEntityCreateEditCopy';
	import {
		filterEntitiesForOrganization,
		groupByEntityTypePreservingOrder,
		uniqueSortedEntityTypes
	} from '$lib/case/p107CaseEntityOrganization';
	import { P107_AUDIT_LIST_LAST_UPDATED_LABEL } from '$lib/case/p107CaseEntityAuditCopy';
	import {
		P107_ORG_EMPTY_FILTERED,
		P107_ORG_FILTER_LABEL,
		P107_ORG_FILTER_TYPE_ALL,
		P107_ORG_FILTER_TYPE_LABEL,
		P107_ORG_GROUP_BY_TYPE,
		P107_ORG_INCLUDE_RETIRED,
		P107_ORG_NOTE,
		P107_ORG_RESET,
		P107_ORG_SECTION_LABEL
	} from '$lib/case/p107CaseEntityOrganizationCopy';
	import {
		P106_CASE_ENTITIES_EMPTY_COPY,
		P106_CASE_ENTITIES_ERROR_GENERIC,
		P106_CASE_ENTITIES_LIST_HEADING,
		P106_CASE_ENTITIES_LOADING,
		P106_CASE_ENTITIES_NO_SESSION,
		P106_CASE_ENTITIES_RETIRED_LABEL,
		P106_CASE_ENTITIES_SUPPORTING_COPY
	} from '$lib/case/p106CaseEntitiesOperatorCopy';
	import Spinner from '$lib/components/common/Spinner.svelte';

	export let caseId: string;
	export let caseEngineToken: string;

	let loading = false;
	let clientError = '';
	let entities: CaseEngineCaseEntity[] = [];
	let showCreateForm = false;

	/** P107-04 — reloads list via existing GET `include_retired` query only. */
	let includeRetired = false;
	let entityTypeFilter = '';
	let labelFilter = '';
	let groupByEntityType = false;

	let requestGeneration = 0;
	let activeCaseKey = '';

	function resetForCase(nextId: string): void {
		loading = false;
		clientError = '';
		entities = [];
		showCreateForm = false;
		includeRetired = false;
		entityTypeFilter = '';
		labelFilter = '';
		groupByEntityType = false;
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
			clientError = P106_CASE_ENTITIES_NO_SESSION;
			entities = [];
			return;
		}
		const gen = ++requestGeneration;
		loading = true;
		clientError = '';
		entities = [];
		try {
			const list = await getCaseEntitiesList(myCase, caseEngineToken, { includeRetired });
			if (gen !== requestGeneration || myCase !== caseId) return;
			entities = list;
		} catch (e: unknown) {
			if (gen !== requestGeneration || myCase !== caseId) return;
			entities = [];
			clientError = e instanceof Error ? e.message : P106_CASE_ENTITIES_ERROR_GENERIC;
		} finally {
			if (gen === requestGeneration && myCase === caseId) loading = false;
		}
	}

	async function handleCreated(entity: CaseEngineCaseEntity): Promise<void> {
		showCreateForm = false;
		await loadList();
		const cid = String(caseId ?? '').trim();
		if (cid && entity?.id) {
			await goto(`/case/${encodeURIComponent(cid)}/entities/${encodeURIComponent(entity.id)}`);
		}
	}

	function resetOrganization(): void {
		includeRetired = false;
		entityTypeFilter = '';
		labelFilter = '';
		groupByEntityType = false;
		void loadList();
	}

	$: entityTypeOptions = uniqueSortedEntityTypes(entities);
	$: filteredEntities = filterEntitiesForOrganization(entities, {
		entityType: entityTypeFilter,
		labelSubstring: labelFilter
	});
	$: groupedForDisplay = groupByEntityType
		? groupByEntityTypePreservingOrder(filteredEntities)
		: null;

	$: if (caseId && caseEngineToken && activeCaseKey === caseId) {
		void loadList();
	}

	$: if (caseId && !caseEngineToken && activeCaseKey === caseId) {
		clientError = P106_CASE_ENTITIES_NO_SESSION;
		entities = [];
		loading = false;
	}
</script>

<div
	class="flex flex-col gap-3 min-h-0"
	data-testid="case-entities-panel"
	data-case-entities-panel-case-id={caseId}
>
	<header class="flex flex-col gap-1 shrink-0">
		<h1 class="text-lg font-semibold text-[color:var(--ce-l-text-primary)]">{P106_CASE_ENTITIES_LIST_HEADING}</h1>
		<p class="text-sm text-[color:var(--ce-l-text-secondary)]">{P106_CASE_ENTITIES_SUPPORTING_COPY}</p>
		{#if caseEngineToken}
			<div class="pt-1">
				<button
					type="button"
					class="rounded px-3 py-1.5 text-sm font-medium border border-[color:var(--ce-l-border-subtle)] text-[color:var(--ce-l-text-primary)] hover:opacity-90"
					data-testid="case-entities-panel--create-open"
					disabled={loading}
					on:click={() => {
						showCreateForm = !showCreateForm;
					}}
				>
					{P107_CASE_ENTITY_CREATE_BUTTON}
				</button>
			</div>
		{/if}
	</header>

	{#if showCreateForm && caseEngineToken}
		<CaseEntityMutateForm
			mode="create"
			caseId={caseId}
			caseEngineToken={caseEngineToken}
			initialEntity={null}
			onSuccess={(e) => void handleCreated(e)}
			onCancel={() => {
				showCreateForm = false;
			}}
		/>
	{/if}

	{#if caseEngineToken}
		<section
			class="flex flex-col gap-2 rounded-md border border-[color:var(--ce-l-border-subtle)] p-3 bg-[color:var(--ce-l-surface-raised)]"
			data-testid="case-entities-panel--organization"
			aria-label={P107_ORG_SECTION_LABEL}
		>
			<div class="text-xs font-medium text-[color:var(--ce-l-text-muted)]">{P107_ORG_SECTION_LABEL}</div>
			<p class="text-xs text-[color:var(--ce-l-text-secondary)] max-w-prose">{P107_ORG_NOTE}</p>
			<div class="flex flex-col sm:flex-row sm:flex-wrap gap-3 text-sm">
				<label class="flex items-center gap-2 cursor-pointer">
					<input
						type="checkbox"
						data-testid="case-entities-panel--include-retired"
						disabled={loading}
						bind:checked={includeRetired}
						on:change={() => void loadList()}
					/>
					<span>{P107_ORG_INCLUDE_RETIRED}</span>
				</label>
				<label class="flex flex-col gap-0.5 min-w-[10rem]">
					<span class="text-[color:var(--ce-l-text-muted)]">{P107_ORG_FILTER_TYPE_LABEL}</span>
					<select
						class="rounded border border-[color:var(--ce-l-border-subtle)] bg-[color:var(--ce-l-surface-base)] px-2 py-1 text-[color:var(--ce-l-text-primary)]"
						data-testid="case-entities-panel--filter-entity-type"
						disabled={loading}
						bind:value={entityTypeFilter}
					>
						<option value="">{P107_ORG_FILTER_TYPE_ALL}</option>
						{#each entityTypeOptions as t (t)}
							<option value={t}>{t}</option>
						{/each}
					</select>
				</label>
				<label class="flex flex-col gap-0.5 flex-1 min-w-[12rem]">
					<span class="text-[color:var(--ce-l-text-muted)]">{P107_ORG_FILTER_LABEL}</span>
					<input
						type="text"
						class="rounded border border-[color:var(--ce-l-border-subtle)] bg-[color:var(--ce-l-surface-base)] px-2 py-1 text-[color:var(--ce-l-text-primary)]"
						autocomplete="off"
						data-testid="case-entities-panel--filter-label"
						disabled={loading}
						bind:value={labelFilter}
					/>
				</label>
				<label class="flex items-center gap-2 cursor-pointer self-center sm:self-end">
					<input
						type="checkbox"
						data-testid="case-entities-panel--group-by-type"
						disabled={loading}
						bind:checked={groupByEntityType}
					/>
					<span>{P107_ORG_GROUP_BY_TYPE}</span>
				</label>
				<button
					type="button"
					class="rounded px-3 py-1.5 text-sm font-medium border border-[color:var(--ce-l-border-subtle)] text-[color:var(--ce-l-text-primary)] hover:opacity-90 self-start sm:self-end disabled:opacity-60"
					data-testid="case-entities-panel--org-reset"
					disabled={loading}
					on:click={() => resetOrganization()}
				>
					{P107_ORG_RESET}
				</button>
			</div>
		</section>
	{/if}

	{#if loading}
		<div
			class="flex items-center gap-2 text-sm text-[color:var(--ce-l-text-secondary)]"
			data-testid="case-entities-panel--loading"
		>
			<Spinner />
			<span>{P106_CASE_ENTITIES_LOADING}</span>
		</div>
	{:else if clientError}
		<p class="text-sm text-[color:var(--ce-l-text-secondary)]" data-testid="case-entities-panel--error" role="alert">
			{clientError}
		</p>
	{:else if entities.length === 0}
		<p class="text-sm text-[color:var(--ce-l-text-secondary)]" data-testid="case-entities-panel--empty">
			{P106_CASE_ENTITIES_EMPTY_COPY}
		</p>
	{:else if filteredEntities.length === 0}
		<p class="text-sm text-[color:var(--ce-l-text-secondary)]" data-testid="case-entities-panel--empty-filtered">
			{P107_ORG_EMPTY_FILTERED}
		</p>
	{:else if groupedForDisplay}
		<div class="flex flex-col gap-4 min-h-0 overflow-auto" data-testid="case-entities-panel--grouped">
			{#each groupedForDisplay as g (g.groupKey)}
				<div class="flex flex-col gap-2" data-testid="case-entities-panel--group" data-entity-type-group={g.groupKey}>
					<h2 class="text-xs font-semibold uppercase tracking-wide text-[color:var(--ce-l-text-muted)]">
						{g.groupKey}
					</h2>
					<ul class="flex flex-col gap-2 list-none p-0 m-0" data-testid="case-entities-panel--list">
						{#each g.items as ent (ent.id)}
							<li>
								<a
									href={`/case/${encodeURIComponent(caseId)}/entities/${encodeURIComponent(ent.id)}`}
									class="block rounded-md border border-[color:var(--ce-l-border-subtle)] px-3 py-2 bg-[color:var(--ce-l-surface-raised)] no-underline text-inherit hover:opacity-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--ce-l-focus-ring)]"
									data-testid="case-entities-row-link"
									data-case-entity-id={ent.id}
								>
									<div class="flex flex-wrap items-baseline justify-between gap-2">
										<span class="font-medium text-[color:var(--ce-l-text-primary)]">{ent.display_label}</span>
										{#if ent.deleted_at}
											<span
												class="text-xs uppercase tracking-wide text-[color:var(--ce-l-text-muted)]"
												data-testid="case-entities-row--retired"
											>
												{P106_CASE_ENTITIES_RETIRED_LABEL}
											</span>
										{/if}
									</div>
									<div class="text-xs text-[color:var(--ce-l-text-secondary)] mt-0.5">{ent.entity_type}</div>
									<div class="text-xs text-[color:var(--ce-l-text-muted)] mt-0.5" data-testid="case-entities-row--audit">
										{P107_AUDIT_LIST_LAST_UPDATED_LABEL}{' '}
										<span data-testid="case-entities-row--audit-updated-at">{auditFieldDisplay(ent.updated_at)}</span>
									</div>
								</a>
							</li>
						{/each}
					</ul>
				</div>
			{/each}
		</div>
	{:else}
		<ul
			class="flex flex-col gap-2 min-h-0 overflow-auto list-none p-0 m-0"
			data-testid="case-entities-panel--list"
		>
			{#each filteredEntities as ent (ent.id)}
				<li>
					<a
						href={`/case/${encodeURIComponent(caseId)}/entities/${encodeURIComponent(ent.id)}`}
						class="block rounded-md border border-[color:var(--ce-l-border-subtle)] px-3 py-2 bg-[color:var(--ce-l-surface-raised)] no-underline text-inherit hover:opacity-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--ce-l-focus-ring)]"
						data-testid="case-entities-row-link"
						data-case-entity-id={ent.id}
					>
						<div class="flex flex-wrap items-baseline justify-between gap-2">
							<span class="font-medium text-[color:var(--ce-l-text-primary)]">{ent.display_label}</span>
							{#if ent.deleted_at}
								<span
									class="text-xs uppercase tracking-wide text-[color:var(--ce-l-text-muted)]"
									data-testid="case-entities-row--retired"
								>
									{P106_CASE_ENTITIES_RETIRED_LABEL}
								</span>
							{/if}
						</div>
						<div class="text-xs text-[color:var(--ce-l-text-secondary)] mt-0.5">{ent.entity_type}</div>
						<div class="text-xs text-[color:var(--ce-l-text-muted)] mt-0.5" data-testid="case-entities-row--audit">
							{P107_AUDIT_LIST_LAST_UPDATED_LABEL}{' '}
							<span data-testid="case-entities-row--audit-updated-at">{auditFieldDisplay(ent.updated_at)}</span>
						</div>
					</a>
				</li>
			{/each}
		</ul>
	{/if}
</div>
