<script lang="ts">
	/**
	 * P115-04 — Explicit operator relationship create + read-only list (Case Engine authority).
	 */
	import {
		listCaseTimelineEntries,
		listCaseFiles,
		listCaseNotebookNotes,
		type TimelineEntry,
		type CaseFile,
		type NotebookNote
	} from '$lib/apis/caseEngine/index';
	import { listCaseTasks, type CaseEngineCaseTask } from '$lib/apis/caseEngine/caseTasksApi';
	import { getCaseEntitiesList, type CaseEngineCaseEntity } from '$lib/apis/caseEngine/caseEntitiesApi';
	import {
		CASE_RELATIONSHIP_TYPES,
		createCaseRelationship,
		listCaseRelationships,
		type CaseRelationshipRow,
		type CaseRelationshipType
	} from '$lib/apis/caseEngine/caseRelationshipsApi';
	import {
		postCaseRelatedRecordNavigation,
		type RelatedRecordNavigationResult
	} from '$lib/apis/caseEngine/caseNavigationApi';
	import { navigateFromCitationNavigationResult } from '$lib/case/p118CitationNavigationNavigate';
	import {
		P118_NAVIGATION_LOADING_COPY,
		P118_NAVIGATION_PREFETCH_FAILED_COPY
	} from '$lib/case/p118NavigationOperatorCopy';

	export let caseId: string;
	export let caseEngineToken: string;

	const RECORD_KINDS = [
		'timeline_entry',
		'case_file',
		'case_task',
		'notebook_note',
		'case_entity'
	] as const;

	type RecordKind = (typeof RECORD_KINDS)[number];

	let relationships: CaseRelationshipRow[] = [];
	let timeline: TimelineEntry[] = [];
	let files: CaseFile[] = [];
	let tasks: CaseEngineCaseTask[] = [];
	let notes: NotebookNote[] = [];
	let entities: CaseEngineCaseEntity[] = [];

	let loadingLists = false;
	let loadingRels = false;
	let submitting = false;
	let listError = '';
	let createError = '';
	let activeCaseKey = '';
	let lastLoadedKey = '';

	let sourceKind: RecordKind | '' = '';
	let sourceId = '';
	let targetKind: RecordKind | '' = '';
	let targetId = '';
	let relationshipType: CaseRelationshipType | '' = '';

	let relatedNav: RelatedRecordNavigationResult | null = null;
	let relatedLoading = false;
	let relatedError = '';
	let relatedPrefetchGen = 0;
	let relatedSourceKey = '';

	function resetForCase(nextId: string): void {
		relationships = [];
		timeline = [];
		files = [];
		tasks = [];
		notes = [];
		entities = [];
		sourceKind = '';
		sourceId = '';
		targetKind = '';
		targetId = '';
		relationshipType = '';
		listError = '';
		createError = '';
		relatedNav = null;
		relatedError = '';
		relatedPrefetchGen += 1;
		relatedSourceKey = '';
		activeCaseKey = nextId;
		lastLoadedKey = '';
	}

	$: if (caseId && caseId !== activeCaseKey) {
		resetForCase(caseId);
	}

	function optionsForKind(kind: RecordKind): Array<{ id: string; label: string }> {
		switch (kind) {
			case 'timeline_entry':
				return timeline.map((e) => ({
					id: e.id,
					label: `${e.type} — ${e.occurred_at.slice(0, 19)}Z — ${e.id}`
				}));
			case 'case_file':
				return files.map((f) => ({ id: f.id, label: `${f.original_filename} — ${f.id}` }));
			case 'case_task':
				return tasks.filter((t) => !t.deleted_at).map((t) => ({ id: t.id, label: `${t.title} — ${t.id}` }));
			case 'notebook_note':
				return notes.map((n) => ({
					id: String(n.id),
					label: `${n.title != null && String(n.title).trim() !== '' ? n.title : 'Note'} — ${n.id}`
				}));
			case 'case_entity':
				return entities.map((e) => ({ id: e.id, label: `${e.display_label} — ${e.id}` }));
			default:
				return [];
		}
	}

	$: sourceOptions = sourceKind ? optionsForKind(sourceKind) : [];
	$: targetOptions = targetKind ? optionsForKind(targetKind) : [];

	$: if (sourceKind && sourceId && !sourceOptions.some((o) => o.id === sourceId)) {
		sourceId = '';
	}
	$: if (targetKind && targetId && !targetOptions.some((o) => o.id === targetId)) {
		targetId = '';
	}

	async function loadRelationships(): Promise<void> {
		if (!caseEngineToken || !caseId) return;
		loadingRels = true;
		listError = '';
		try {
			relationships = await listCaseRelationships(caseId, caseEngineToken);
		} catch (e: unknown) {
			listError = e instanceof Error ? e.message : 'Failed to load relationships.';
		} finally {
			loadingRels = false;
		}
	}

	async function loadPickerData(): Promise<void> {
		if (!caseEngineToken || !caseId) return;
		loadingLists = true;
		listError = '';
		try {
			const [tl, fl, tk, nt, ent] = await Promise.all([
				listCaseTimelineEntries(caseId, caseEngineToken),
				listCaseFiles(caseId, caseEngineToken),
				listCaseTasks(caseId, caseEngineToken),
				listCaseNotebookNotes(caseId, caseEngineToken),
				getCaseEntitiesList(caseId, caseEngineToken)
			]);
			timeline = tl;
			files = fl;
			tasks = tk;
			notes = nt;
			entities = ent;
		} catch (e: unknown) {
			listError = e instanceof Error ? e.message : 'Failed to load case records for picker.';
		} finally {
			loadingLists = false;
		}
	}

	async function refreshAll(): Promise<void> {
		await Promise.all([loadPickerData(), loadRelationships()]);
	}

	async function loadRelatedRecordNavigation(): Promise<void> {
		if (!caseEngineToken || !caseId || !sourceKind || !sourceId) {
			relatedNav = null;
			relatedError = '';
			return;
		}
		const gen = ++relatedPrefetchGen;
		relatedLoading = true;
		relatedError = '';
		try {
			const res = await postCaseRelatedRecordNavigation(caseId, caseEngineToken, {
				source_kind: sourceKind,
				source_record_id: sourceId
			});
			if (gen !== relatedPrefetchGen) return;
			relatedNav = res;
		} catch (e: unknown) {
			if (gen !== relatedPrefetchGen) return;
			relatedNav = null;
			relatedError = e instanceof Error ? e.message : P118_NAVIGATION_PREFETCH_FAILED_COPY;
		} finally {
			if (gen === relatedPrefetchGen) relatedLoading = false;
		}
	}

	function neighborEndpoint(
		row: {
			source_record_type: string;
			source_record_id: string;
			target_record_type: string;
			target_record_id: string;
		},
		sk: string,
		sid: string
	): { kind: string; id: string } {
		if (row.source_record_type === sk && row.source_record_id === sid) {
			return { kind: row.target_record_type, id: row.target_record_id };
		}
		return { kind: row.source_record_type, id: row.source_record_id };
	}

	async function openNeighborNavigation(
		nav: import('$lib/case/p118CitationNavigationTypes').CitationNavigationResult
	): Promise<void> {
		const res = await navigateFromCitationNavigationResult(nav, caseId);
		if (!res.ok) {
			relatedError =
				res.reason === 'CASE_ID_MISMATCH'
					? 'Navigation did not match this case.'
					: 'Navigation could not be started.';
		}
	}

	$: {
		const k =
			caseEngineToken && caseId && sourceKind && sourceId
				? `${sourceKind}:${sourceId}`
				: '';
		if (k !== relatedSourceKey) {
			relatedSourceKey = k;
			if (k) {
				void loadRelatedRecordNavigation();
			} else {
				relatedNav = null;
				relatedError = '';
			}
		}
	}

	$: {
		const k = caseId && caseEngineToken ? `${caseId}:${caseEngineToken}` : '';
		if (k && k !== lastLoadedKey) {
			lastLoadedKey = k;
			void refreshAll();
		}
	}

	async function submitCreate(): Promise<void> {
		createError = '';
		if (!caseEngineToken) {
			createError = 'Case Engine session is required.';
			return;
		}
		if (!sourceKind || !sourceId || !targetKind || !targetId || !relationshipType) {
			createError = 'Select source record, target record, and relationship type.';
			return;
		}
		submitting = true;
		try {
			await createCaseRelationship(caseId, caseEngineToken, {
				source_record_type: sourceKind,
				source_record_id: sourceId,
				target_record_type: targetKind,
				target_record_id: targetId,
				relationship_type: relationshipType
			});
			await loadRelationships();
		} catch (e: unknown) {
			createError = e instanceof Error ? e.message : 'Create failed.';
		} finally {
			submitting = false;
		}
	}
</script>

<div
	class="ce-l-case-relationships-panel mt-6 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/40 p-4"
	data-testid="case-relationships-panel"
	data-case-relationships-case-id={caseId}
>
	<h2 class="text-sm font-semibold text-gray-900 dark:text-gray-100">Case relationships</h2>
	<p class="text-xs text-gray-600 dark:text-gray-400 mt-1">
		Explicit links between records in this case. Add relationship is operator-initiated only.
	</p>

	{#if !caseEngineToken}
		<p class="mt-3 text-sm text-amber-800 dark:text-amber-200" data-testid="case-relationships-no-token">
			Case Engine session is required for this case.
		</p>
	{/if}

	{#if listError}
		<p class="mt-3 text-sm text-red-700 dark:text-red-300" data-testid="case-relationships-list-error" role="alert">
			{listError}
		</p>
	{/if}

	<div class="mt-4" data-testid="case-relationships-readonly-list">
		<div class="text-xs font-medium text-gray-800 dark:text-gray-200">Stored relationships</div>
		{#if loadingRels}
			<p class="mt-2 text-xs text-gray-600 dark:text-gray-400">Loading…</p>
		{:else if relationships.length === 0}
			<p class="mt-2 text-sm text-gray-600 dark:text-gray-400" data-testid="case-relationships-empty">
				No relationships recorded.
			</p>
		{:else}
			<ul class="mt-2 space-y-2 list-none pl-0" data-testid="case-relationships-rows">
				{#each relationships as r (r.relationship_id)}
					<li
						class="rounded border border-gray-200 dark:border-gray-600 p-2 text-xs font-mono text-gray-800 dark:text-gray-200"
						data-testid="case-relationships-row"
						data-relationship-id={r.relationship_id}
					>
						<span data-field="relationship_type">{r.relationship_type}</span>
						<span class="mx-1">·</span>
						<span data-field="source">{r.source_record_type}</span>
						<span class="mx-0.5">/</span>
						<span data-field="source_id">{r.source_record_id}</span>
						<span class="mx-1">→</span>
						<span data-field="target">{r.target_record_type}</span>
						<span class="mx-0.5">/</span>
						<span data-field="target_id">{r.target_record_id}</span>
					</li>
				{/each}
			</ul>
		{/if}
	</div>

	{#if caseEngineToken && sourceKind && sourceId}
		<div class="mt-4" data-testid="case-relationships-linked-navigation">
			<div class="text-xs font-medium text-gray-800 dark:text-gray-200">Linked records (single hop)</div>
			<p class="mt-1 text-xs text-gray-600 dark:text-gray-400">
				From selected source only. Order matches Case Engine. Relationship type is stored metadata only.
			</p>
			{#if relatedLoading}
				<p class="mt-2 text-xs text-gray-600 dark:text-gray-400" data-testid="case-relationships-linked-loading">
					{P118_NAVIGATION_LOADING_COPY}
				</p>
			{:else if relatedError}
				<p class="mt-2 text-xs text-red-700 dark:text-red-300" data-testid="case-relationships-linked-error" role="alert">
					{relatedError}
				</p>
			{:else if relatedNav && !relatedNav.ok}
				<p class="mt-2 text-xs text-gray-600 dark:text-gray-400" data-testid="case-relationships-linked-source-unavailable">
					Source record is not available for relationship navigation ({relatedNav.reason_code}).
				</p>
			{:else if relatedNav && relatedNav.ok}
				{#if relatedNav.candidates.length === 0}
					<p class="mt-2 text-sm text-gray-600 dark:text-gray-400" data-testid="case-relationships-linked-empty">
						No linked records for this source.
					</p>
				{:else}
					<ul class="mt-2 space-y-2 list-none pl-0" data-testid="case-relationships-linked-rows">
						{#each relatedNav.candidates as cand (cand.relationship_id)}
							{@const nb = neighborEndpoint(cand, sourceKind, sourceId)}
							<li
								class="rounded border border-gray-200 dark:border-gray-600 p-2 text-xs text-gray-800 dark:text-gray-200"
								data-testid="case-relationships-linked-row"
								data-relationship-id={cand.relationship_id}
							>
								<div class="font-mono">
									<span data-field="relationship_type">{cand.relationship_type}</span>
									<span class="mx-1">·</span>
									<span data-field="neighbor_kind">{nb.kind}</span>
									<span class="mx-0.5">/</span>
									<span data-field="neighbor_id">{nb.id}</span>
								</div>
								{#if cand.navigation.ok}
									<button
										type="button"
										class="mt-2 rounded px-2 py-1 text-xs font-medium bg-gray-800 text-white hover:bg-gray-700 dark:bg-gray-200 dark:text-gray-900 dark:hover:bg-white"
										data-testid="case-relationships-linked-open"
										on:click={() => void openNeighborNavigation(cand.navigation)}
									>
										Open record
									</button>
								{:else}
									<p
										class="mt-2 text-xs text-gray-600 dark:text-gray-400"
										data-testid="case-relationships-linked-not-navigable"
									>
										Navigation unavailable for this linked record.
									</p>
								{/if}
							</li>
						{/each}
					</ul>
				{/if}
			{/if}
		</div>
	{/if}

	<div class="mt-4 rounded border border-gray-200 dark:border-gray-600 p-3 space-y-3" data-testid="case-relationships-create">
		<div class="text-xs font-medium text-gray-800 dark:text-gray-200">Add relationship</div>
		<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
			<label class="flex flex-col gap-1 min-w-0">
				<span class="text-xs font-medium text-gray-700 dark:text-gray-300">Source record type</span>
				<select
					class="rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-950 px-2 py-1.5 text-sm"
					bind:value={sourceKind}
					disabled={submitting || !caseEngineToken || loadingLists}
					data-testid="case-relationships-source-kind"
				>
					<option value="">—</option>
					{#each RECORD_KINDS as k}
						<option value={k}>{k}</option>
					{/each}
				</select>
			</label>
			<label class="flex flex-col gap-1 min-w-0">
				<span class="text-xs font-medium text-gray-700 dark:text-gray-300">Source record</span>
				<select
					class="rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-950 px-2 py-1.5 text-sm font-mono"
					bind:value={sourceId}
					disabled={submitting || !caseEngineToken || loadingLists || !sourceKind}
					data-testid="case-relationships-source-id"
				>
					<option value="">—</option>
					{#each sourceOptions as o (o.id)}
						<option value={o.id}>{o.label}</option>
					{/each}
				</select>
			</label>
			<label class="flex flex-col gap-1 min-w-0">
				<span class="text-xs font-medium text-gray-700 dark:text-gray-300">Target record type</span>
				<select
					class="rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-950 px-2 py-1.5 text-sm"
					bind:value={targetKind}
					disabled={submitting || !caseEngineToken || loadingLists}
					data-testid="case-relationships-target-kind"
				>
					<option value="">—</option>
					{#each RECORD_KINDS as k}
						<option value={k}>{k}</option>
					{/each}
				</select>
			</label>
			<label class="flex flex-col gap-1 min-w-0">
				<span class="text-xs font-medium text-gray-700 dark:text-gray-300">Target record</span>
				<select
					class="rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-950 px-2 py-1.5 text-sm font-mono"
					bind:value={targetId}
					disabled={submitting || !caseEngineToken || loadingLists || !targetKind}
					data-testid="case-relationships-target-id"
				>
					<option value="">—</option>
					{#each targetOptions as o (o.id)}
						<option value={o.id}>{o.label}</option>
					{/each}
				</select>
			</label>
			<label class="flex flex-col gap-1 min-w-0 sm:col-span-2">
				<span class="text-xs font-medium text-gray-700 dark:text-gray-300">Relationship type</span>
				<select
					class="rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-950 px-2 py-1.5 text-sm font-mono"
					bind:value={relationshipType}
					disabled={submitting || !caseEngineToken}
					data-testid="case-relationships-type"
				>
					<option value="">—</option>
					{#each CASE_RELATIONSHIP_TYPES as t}
						<option value={t}>{t}</option>
					{/each}
				</select>
			</label>
		</div>
		<button
			type="button"
			class="rounded px-3 py-2 text-sm font-medium bg-gray-800 text-white hover:bg-gray-700 disabled:opacity-50 dark:bg-gray-200 dark:text-gray-900 dark:hover:bg-white"
			disabled={submitting || !caseEngineToken || loadingLists || !sourceKind || !sourceId || !targetKind || !targetId || !relationshipType}
			on:click={() => void submitCreate()}
			data-testid="case-relationships-submit"
		>
			{#if submitting}
				Submitting…
			{:else}
				Submit relationship
			{/if}
		</button>
		{#if createError}
			<p class="text-sm text-red-700 dark:text-red-300" data-testid="case-relationships-create-error" role="alert">
				{createError}
			</p>
		{/if}
	</div>
</div>
