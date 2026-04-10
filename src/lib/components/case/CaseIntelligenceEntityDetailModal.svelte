<script lang="ts">
	/**
	 * P67-06 — entity detail modal; P67-07 — association staging initiation from anchor context.
	 */
	import { createEventDispatcher, tick } from 'svelte';
	import {
		createCaseIntelligenceAssociationStaging,
		getCaseIntelligenceCommittedEntity,
		listCaseIntelligenceAssociationsForEntity,
		listCaseIntelligenceAssociationStaging,
		listCaseIntelligenceCommittedEntities,
		type CaseIntelligenceAssociationKind,
		type CaseIntelligenceAssociationStagingRecord,
		type CaseIntelligenceAssertionLane,
		type CaseIntelligenceCommittedAssociationProjection,
		type CaseIntelligenceCommittedEntity,
		type CaseIntelligenceEntityKind
	} from '$lib/apis/caseEngine';
	import CaseErrorState from '$lib/components/case/CaseErrorState.svelte';
	import CaseLoadingState from '$lib/components/case/CaseLoadingState.svelte';
	import {
		assertionLaneLabel,
		associationKindLabel,
		coreAttributesEntries
	} from '$lib/utils/caseIntelligenceEntityDetailDisplay';
	import {
		buildRegistrySecondaryLine,
		entityPortraitUrl,
		initialsFromDisplayLabel,
		personPostureShort
	} from '$lib/utils/caseIntelligenceEntityRegistry';
	import {
		canonicalizeAssociatedWithEndpoints,
		parsePlainObjectJson
	} from '$lib/utils/caseIntelligenceAssociationStagingDraft';

	const ASSOC_KINDS: CaseIntelligenceAssociationKind[] = ['KNOWS', 'ASSOCIATED_WITH', 'OPERATES_VEHICLE'];
	const ASSOC_LANES: CaseIntelligenceAssertionLane[] = ['HYPOTHESIS', 'SETTLED'];

	export let open = false;
	export let caseId = '';
	export let token = '';
	export let seedEntity: CaseIntelligenceCommittedEntity | null = null;

	const dispatch = createEventDispatcher<{ close: void }>();

	let dialogEl: HTMLDialogElement | null = null;

	let loadSeq = 0;
	let loading = true;
	let loadError = '';
	let entity: CaseIntelligenceCommittedEntity | null = null;
	let readScope: 'active_only' | 'include_retired' = 'active_only';

	let assocCommitted: CaseIntelligenceCommittedAssociationProjection[] = [];
	let assocStagingLocal: CaseIntelligenceAssociationStagingRecord[] = [];
	let entityLabelById = new Map<string, string>();
	let allCommittedEntities: CaseIntelligenceCommittedEntity[] = [];

	let portraitFailed = false;

	let showAddAssocForm = false;
	let otherEntitySearch = '';
	let addAssocOtherEntityId = '';
	let addAssocKind: CaseIntelligenceAssociationKind = 'KNOWS';
	let addAssocLane: CaseIntelligenceAssertionLane = 'HYPOTHESIS';
	let addAssocNotes = '';
	let addAssocAttrsJson = '{}';
	let addAssocStatus: 'draft' | 'pending' = 'draft';
	let addAssocSubmitting = false;
	let addAssocError = '';
	let addAssocSuccess = '';

	$: displayEntity = entity ?? seedEntity;
	$: anchorId = displayEntity?.id ?? '';
	$: attrRows = displayEntity ? coreAttributesEntries(displayEntity.core_attributes ?? {}) : [];
	$: summaryLine = displayEntity ? buildRegistrySecondaryLine(displayEntity.entity_kind, displayEntity) : null;
	$: portraitUrl =
		displayEntity && displayEntity.entity_kind === 'PERSON'
			? entityPortraitUrl(displayEntity.core_attributes ?? {})
			: null;

	$: activeOtherEntities = allCommittedEntities.filter(
		(e) => e.id !== anchorId && !e.deleted_at
	);
	$: filteredOtherEntities = otherEntitySearch.trim()
		? activeOtherEntities.filter((e) => {
				const q = otherEntitySearch.trim().toLowerCase();
				const k = kindLabel(e.entity_kind).toLowerCase();
				return (
					e.display_label.toLowerCase().includes(q) ||
					e.id.toLowerCase().includes(q) ||
					k.includes(q)
				);
			})
		: activeOtherEntities;

	$: assocEndpointPreview =
		addAssocOtherEntityId.trim() && anchorId
			? addAssocKind === 'ASSOCIATED_WITH'
				? canonicalizeAssociatedWithEndpoints(anchorId, addAssocOtherEntityId.trim())
				: { endpoint_a_entity_id: anchorId, endpoint_b_entity_id: addAssocOtherEntityId.trim() }
			: null;

	$: anchorRetired = !!(displayEntity?.deleted_at);

	$: if (addAssocOtherEntityId && addAssocOtherEntityId === anchorId) {
		addAssocOtherEntityId = '';
	}

	function kindLabel(k: CaseIntelligenceEntityKind): string {
		switch (k) {
			case 'PERSON':
				return 'Person';
			case 'VEHICLE':
				return 'Vehicle';
			case 'LOCATION':
				return 'Location';
			default:
				return k;
		}
	}

	function closeModal(): void {
		dialogEl?.close();
	}

	function onDialogClose(): void {
		loadSeq += 1;
		dispatch('close');
	}

	function scrollToStage2(): void {
		document.getElementById('case-intel-stage2-pilot-anchor')?.scrollIntoView({
			behavior: 'smooth',
			block: 'start'
		});
	}

	function otherEndpointId(row: CaseIntelligenceCommittedAssociationProjection, anchor: string): string {
		return row.endpoint_a_entity_id === anchor ? row.endpoint_b_entity_id : row.endpoint_a_entity_id;
	}

	function formatEndpointLabel(id: string): string {
		const hit = entityLabelById.get(id);
		return hit ?? id;
	}

	function isStagingOpen(s: CaseIntelligenceAssociationStagingRecord): boolean {
		return s.status === 'draft' || s.status === 'pending';
	}

	async function refreshAssociationViews(): Promise<void> {
		const aid = entity?.id ?? seedEntity?.id;
		if (!caseId || !token || !aid) return;
		const seq = loadSeq;
		try {
			const [adjacency, stagingAll] = await Promise.all([
				listCaseIntelligenceAssociationsForEntity(caseId, aid, token, { includeRetired: true }),
				listCaseIntelligenceAssociationStaging(caseId, token, { status: 'draft,pending' })
			]);
			if (seq !== loadSeq) return;
			assocCommitted = adjacency.committed_associations;
			assocStagingLocal = stagingAll.filter(
				(r) =>
					isStagingOpen(r) &&
					(r.endpoint_a_entity_id === aid || r.endpoint_b_entity_id === aid)
			);
		} catch {
			/* leave existing lists — operator can refresh modal */
		}
	}

	async function submitAddAssocStaging(): Promise<void> {
		addAssocError = '';
		addAssocSuccess = '';
		if (!caseId || !token || !displayEntity || addAssocSubmitting) return;
		if (displayEntity.deleted_at) {
			addAssocError = 'Cannot stage a new association from a retired anchor in this flow.';
			return;
		}
		const other = addAssocOtherEntityId.trim();
		if (!other) {
			addAssocError = 'Select the other committed entity.';
			return;
		}
		if (other === anchorId) {
			addAssocError = 'Other entity must be different from the anchor.';
			return;
		}
		let attrs: Record<string, unknown>;
		try {
			attrs = parsePlainObjectJson(addAssocAttrsJson, 'Proposed attributes');
		} catch (e) {
			addAssocError = e instanceof Error ? e.message : 'Invalid JSON.';
			return;
		}
		let body: Parameters<typeof createCaseIntelligenceAssociationStaging>[2] = {
			association_kind: addAssocKind,
			endpoint_a_entity_id: anchorId,
			endpoint_b_entity_id: other,
			assertion_lane: addAssocLane,
			proposed_notes: addAssocNotes.trim() || null,
			proposed_attributes: attrs,
			status: addAssocStatus
		};
		if (addAssocKind === 'ASSOCIATED_WITH') {
			body = { ...body, ...canonicalizeAssociatedWithEndpoints(anchorId, other) };
		}
		addAssocSubmitting = true;
		try {
			await createCaseIntelligenceAssociationStaging(caseId, token, body);
			addAssocSuccess = `Association staged as ${addAssocStatus}. It is not on the committed graph until an operator commits it from the Stage 2 queue (below this page, or scroll there after closing).`;
			addAssocOtherEntityId = '';
			addAssocNotes = '';
			addAssocAttrsJson = '{}';
			otherEntitySearch = '';
			await refreshAssociationViews();
		} catch (e) {
			addAssocError = e instanceof Error ? e.message : 'Association staging failed.';
		} finally {
			addAssocSubmitting = false;
		}
	}

	// P68-08-FU3: same as create modal — `open` must be read synchronously in `$:` so
	// toggling `open` re-runs sync after `dialogEl` is bound.
	$: if (dialogEl !== null) {
		const el = dialogEl;
		const shouldOpen = open;
		void tick().then(() => {
			if (!el.isConnected) return;
			if (shouldOpen) {
				if (!el.open) el.showModal();
			} else {
				if (el.open) el.close();
			}
		});
	}

	$: if (!open) {
		entity = null;
		loadError = '';
		portraitFailed = false;
		loading = true;
		allCommittedEntities = [];
		showAddAssocForm = false;
		otherEntitySearch = '';
		addAssocOtherEntityId = '';
		addAssocKind = 'KNOWS';
		addAssocLane = 'HYPOTHESIS';
		addAssocNotes = '';
		addAssocAttrsJson = '{}';
		addAssocStatus = 'draft';
		addAssocSubmitting = false;
		addAssocError = '';
		addAssocSuccess = '';
	}

	async function loadAll(): Promise<void> {
		if (!open || !caseId || !token || !seedEntity) {
			loading = false;
			return;
		}
		const seq = ++loadSeq;
		loading = true;
		loadError = '';
		entity = null;
		assocCommitted = [];
		assocStagingLocal = [];
		entityLabelById = new Map();
		allCommittedEntities = [];
		portraitFailed = false;
		addAssocError = '';
		addAssocSuccess = '';

		try {
			const [detail, adjacency, stagingAll, allEntities] = await Promise.all([
				getCaseIntelligenceCommittedEntity(caseId, seedEntity.id, token, { includeRetired: true }),
				listCaseIntelligenceAssociationsForEntity(caseId, seedEntity.id, token, { includeRetired: true }),
				listCaseIntelligenceAssociationStaging(caseId, token, { status: 'draft,pending' }),
				listCaseIntelligenceCommittedEntities(caseId, token, { includeRetired: true })
			]);
			if (seq !== loadSeq) return;
			entity = detail.committed_entity;
			readScope = detail.read_scope;
			assocCommitted = adjacency.committed_associations;
			const aid = adjacency.anchor_entity_id;
			assocStagingLocal = stagingAll.filter(
				(r) =>
					isStagingOpen(r) &&
					(r.endpoint_a_entity_id === aid || r.endpoint_b_entity_id === aid)
			);
			const map = new Map<string, string>();
			for (const e of allEntities.committed_entities) {
				const retired = e.deleted_at ? ' · retired' : '';
				map.set(e.id, `${e.display_label} (${kindLabel(e.entity_kind)})${retired}`);
			}
			entityLabelById = map;
			allCommittedEntities = allEntities.committed_entities;
		} catch (e) {
			if (seq !== loadSeq) return;
			loadError = e instanceof Error ? e.message : 'Failed to load entity detail.';
			entity = null;
			assocCommitted = [];
			assocStagingLocal = [];
			allCommittedEntities = [];
		} finally {
			if (seq === loadSeq) loading = false;
		}
	}

	$: if (open && seedEntity && caseId && token) {
		void loadAll();
	}

</script>

<dialog
	bind:this={dialogEl}
	class="max-w-2xl w-[calc(100vw-2rem)] max-h-[min(90vh,40rem)] rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 shadow-2xl p-0 backdrop:bg-black/50"
	data-testid="case-intel-entity-detail-modal"
	aria-labelledby="case-intel-entity-detail-title"
	on:click={(e) => {
		if (e.currentTarget === e.target) closeModal();
	}}
	on:close={onDialogClose}
>
	{#if displayEntity}
		<div class="flex flex-col max-h-[min(90vh,40rem)]">
			<div
				class="flex items-start justify-between gap-3 px-4 pt-4 pb-3 border-b border-gray-100 dark:border-gray-800 shrink-0"
			>
				<div class="min-w-0 flex-1 flex gap-3">
					{#if displayEntity.entity_kind === 'PERSON'}
						{#if portraitUrl && !portraitFailed}
							<img
								src={portraitUrl}
								alt=""
								class="h-14 w-14 rounded-full object-cover border border-gray-200 dark:border-gray-700 shrink-0"
								loading="lazy"
								on:error={() => (portraitFailed = true)}
							/>
						{:else}
							<span
								class="h-14 w-14 rounded-full flex items-center justify-center text-sm font-semibold border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 shrink-0"
								aria-hidden="true"
							>
								{initialsFromDisplayLabel(displayEntity.display_label)}
							</span>
						{/if}
					{:else if displayEntity.entity_kind === 'VEHICLE'}
						<span
							class="h-14 w-14 rounded-xl flex items-center justify-center text-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 shrink-0"
							aria-hidden="true"
						>🚗</span>
					{:else}
						<span
							class="h-14 w-14 rounded-xl flex items-center justify-center text-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 shrink-0"
							aria-hidden="true"
						>📍</span>
					{/if}
					<div class="min-w-0">
						<p class="text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
							Case Intelligence · {kindLabel(displayEntity.entity_kind)}
						</p>
						<h2 id="case-intel-entity-detail-title" class="text-lg font-semibold leading-snug line-clamp-2 break-words">
							{displayEntity.display_label}
						</h2>
						<div class="mt-1 flex flex-wrap gap-1.5 items-center">
							<span
								class="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
							>
								Committed entity
							</span>
							{#if displayEntity.person_identity_posture}
								<span class="text-[10px] text-gray-500 dark:text-gray-400">
									{personPostureShort(displayEntity.person_identity_posture)}
								</span>
							{/if}
							{#if displayEntity.deleted_at}
								<span
									class="text-[10px] font-medium px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/40 text-amber-900 dark:text-amber-200"
								>
									Retired
								</span>
							{/if}
							{#if entity}
								<span class="text-[10px] text-gray-400 dark:text-gray-500">Read scope: {readScope}</span>
							{/if}
						</div>
						{#if summaryLine}
							<p class="mt-1 text-xs text-gray-600 dark:text-gray-300 line-clamp-2">{summaryLine}</p>
						{/if}
					</div>
				</div>
				<button
					type="button"
					class="shrink-0 rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
					data-testid="case-intel-entity-detail-close"
					aria-label="Close entity detail"
					on:click={closeModal}
				>
					<span aria-hidden="true" class="text-lg leading-none">×</span>
				</button>
			</div>

			<div class="flex-1 min-h-0 overflow-y-auto px-4 py-3 space-y-5">
				{#if loading}
					<CaseLoadingState label="Loading entity…" testId="case-intel-entity-detail-loading" />
				{:else if loadError}
					<CaseErrorState title="Could not load entity" message={loadError} />
				{:else}
					<section aria-labelledby="case-intel-entity-detail-profile">
						<h3 id="case-intel-entity-detail-profile" class="text-sm font-semibold text-gray-900 dark:text-gray-100">
							Entity information
						</h3>
						<p class="mt-0.5 text-[11px] text-gray-500 dark:text-gray-400">
							Structured fields from committed <code class="text-[10px]">core_attributes</code>. Empty fields are omitted.
						</p>
						{#if attrRows.length === 0}
							<p class="mt-2 text-sm text-gray-500 dark:text-gray-400">No additional attributes recorded.</p>
						{:else}
							<dl class="mt-2 grid gap-2 sm:grid-cols-2" data-testid="case-intel-entity-detail-attributes">
								{#each attrRows as row (row.key)}
									<div class="rounded border border-gray-100 dark:border-gray-800 p-2 min-w-0">
										<dt class="text-[10px] font-medium text-gray-500 dark:text-gray-400">{row.label}</dt>
										<dd class="text-xs text-gray-900 dark:text-gray-100 break-words mt-0.5">{row.value}</dd>
									</div>
								{/each}
							</dl>
						{/if}
					</section>

					<section class="rounded-lg border border-gray-100 dark:border-gray-800 p-3 bg-gray-50/50 dark:bg-gray-950/30">
						<h3 class="text-xs font-semibold text-gray-700 dark:text-gray-300">System</h3>
						<dl class="mt-2 space-y-1 text-[11px] text-gray-600 dark:text-gray-400">
							<div class="flex flex-wrap gap-x-2">
								<dt class="font-medium text-gray-500">Id</dt>
								<dd class="font-mono break-all">{displayEntity.id}</dd>
							</div>
							<div class="flex flex-wrap gap-x-2">
								<dt class="font-medium text-gray-500">Created</dt>
								<dd>{displayEntity.created_at}</dd>
							</div>
							{#if displayEntity.updated_at}
								<div class="flex flex-wrap gap-x-2">
									<dt class="font-medium text-gray-500">Updated</dt>
									<dd>{displayEntity.updated_at}</dd>
								</div>
							{/if}
							<div class="flex flex-wrap gap-x-2">
								<dt class="font-medium text-gray-500">Created by</dt>
								<dd>{displayEntity.created_by}</dd>
							</div>
						</dl>
					</section>

					<section aria-labelledby="case-intel-entity-detail-assoc-committed">
						<h3 id="case-intel-entity-detail-assoc-committed" class="text-sm font-semibold text-gray-900 dark:text-gray-100">
							Committed associations
						</h3>
						<p class="mt-0.5 text-[11px] text-gray-500 dark:text-gray-400">
							<strong>Committed</strong> edges from Case Engine for this entity. Open staging rows are separate (below); they are not authoritative until Stage&nbsp;2 commit.
						</p>
						{#if assocCommitted.length === 0}
							<p class="mt-2 text-sm text-gray-500 dark:text-gray-400" data-testid="case-intel-entity-detail-assoc-empty">
								No committed associations incident to this entity in the current list scope.
							</p>
						{:else}
							<ul class="mt-2 space-y-2" data-testid="case-intel-entity-detail-assoc-list">
								{#each assocCommitted as edge (edge.id)}
									<li class="rounded-lg border border-gray-200 dark:border-gray-700 p-2 text-xs space-y-1">
										<div class="flex flex-wrap gap-2 items-center">
											<span class="font-medium">{associationKindLabel(edge.association_kind)}</span>
											<span
												class="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800"
											>{assertionLaneLabel(edge.assertion_lane)}</span
											>
											{#if edge.deleted_at}
												<span class="text-[10px] text-amber-700 dark:text-amber-300 font-medium">Retired</span>
											{/if}
										</div>
										<p class="text-gray-600 dark:text-gray-300">
											Other entity:
											<span class="font-medium text-gray-800 dark:text-gray-100"
											>{formatEndpointLabel(otherEndpointId(edge, anchorId))}</span
											>
										</p>
										{#if edge.notes}
											<p class="text-[11px] text-gray-500 dark:text-gray-400 italic">{edge.notes}</p>
										{/if}
									</li>
								{/each}
							</ul>
						{/if}
					</section>

					<section aria-labelledby="case-intel-entity-detail-assoc-staging">
						<h3 id="case-intel-entity-detail-assoc-staging" class="text-sm font-semibold text-gray-900 dark:text-gray-100">
							Association staging (this case)
						</h3>
						<p class="mt-0.5 text-[11px] text-gray-500 dark:text-gray-400">
							<strong>Staging only</strong> (draft/pending) — not part of the committed association graph. Commit or reject in
							<strong>Stage&nbsp;2</strong> on this page.
						</p>
						{#if assocStagingLocal.length === 0}
							<p class="mt-2 text-sm text-gray-500 dark:text-gray-400">
								No open association staging rows reference this entity.
							</p>
						{:else}
							<ul class="mt-2 space-y-2" data-testid="case-intel-entity-detail-staging-list">
								{#each assocStagingLocal as row (row.id)}
									<li class="rounded-lg border border-amber-200/80 dark:border-amber-900/50 p-2 text-xs space-y-1 bg-amber-50/30 dark:bg-amber-950/10">
										<div class="flex flex-wrap gap-2">
											<span class="font-medium">{associationKindLabel(row.association_kind)}</span>
											<span class="text-[10px] text-amber-900 dark:text-amber-200">{row.status}</span>
											<span class="text-[10px]">{assertionLaneLabel(row.assertion_lane)}</span>
										</div>
										<p class="text-gray-600 dark:text-gray-300">
											{formatEndpointLabel(row.endpoint_a_entity_id)} ↔ {formatEndpointLabel(row.endpoint_b_entity_id)}
										</p>
										{#if row.proposed_notes}
											<p class="text-[11px] text-gray-500 dark:text-gray-400">{row.proposed_notes}</p>
										{/if}
									</li>
								{/each}
							</ul>
						{/if}
					</section>

					{#if showAddAssocForm}
						<section
							class="rounded-lg border-2 border-amber-400/70 dark:border-amber-800/80 p-3 space-y-3 bg-amber-50/40 dark:bg-amber-950/25"
							aria-labelledby="case-intel-entity-detail-propose-assoc"
							data-testid="case-intel-entity-detail-add-assoc-panel"
						>
							<h3 id="case-intel-entity-detail-propose-assoc" class="text-sm font-semibold text-amber-950 dark:text-amber-100">
								Propose association (staging only)
							</h3>
							<p class="text-[11px] text-amber-950/90 dark:text-amber-200/90">
								Submits a <strong>staging row</strong> only (Case Engine — same queue as Stage&nbsp;2). No edge becomes
								<strong>committed</strong> until Stage&nbsp;2 commit. <strong>P19</strong> timeline/notebook proposals stay on the
								Proposals tab.
							</p>

							{#if anchorRetired}
								<p class="text-xs text-red-700 dark:text-red-300" data-testid="case-intel-entity-detail-add-assoc-anchor-retired">
									This entity is <strong>retired</strong>. Use Stage 2 (pilot) if you must stage from retired endpoints.
								</p>
							{:else}
								<div class="rounded-md border border-blue-200 dark:border-blue-900/60 bg-blue-50/50 dark:bg-blue-950/20 p-2 space-y-1">
									<p class="text-[10px] font-semibold uppercase tracking-wide text-blue-900 dark:text-blue-200">
										Anchor (fixed — this entity)
									</p>
									<p class="text-sm font-medium text-gray-900 dark:text-gray-100">
										{displayEntity.display_label} · {kindLabel(displayEntity.entity_kind)}
									</p>
									<p class="text-[10px] font-mono text-gray-500 dark:text-gray-400">{anchorId}</p>
								</div>

								<div class="space-y-2">
									<label class="block text-[10px] font-medium text-gray-600 dark:text-gray-300" for="case-intel-detail-other-search">
										Find other committed entity (this case)
									</label>
									<input
										id="case-intel-detail-other-search"
										type="search"
										class="w-full text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-2 py-1.5"
										placeholder="Search by label, id, or kind…"
										data-testid="case-intel-entity-detail-add-assoc-entity-search"
										bind:value={otherEntitySearch}
										autocomplete="off"
									/>
									<label class="block text-[10px] font-medium text-gray-600 dark:text-gray-300" for="case-intel-detail-other-select">
										Other endpoint
									</label>
									<select
										id="case-intel-detail-other-select"
										class="w-full text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-2 py-1.5"
										data-testid="case-intel-entity-detail-add-assoc-other-select"
										bind:value={addAssocOtherEntityId}
									>
										<option value="">Select committed entity…</option>
										{#each filteredOtherEntities as ent (ent.id)}
											<option value={ent.id}
												>{ent.display_label} ({kindLabel(ent.entity_kind)}) — {ent.id}</option
											>
										{/each}
									</select>
									<p class="text-[10px] text-gray-500 dark:text-gray-400">
										Only <strong>active</strong> committed entities (excluding this anchor). Retired entities are omitted here;
										use Stage 2 for edge cases.
									</p>
								</div>

								<div class="grid gap-2 sm:grid-cols-2">
									<div>
										<label class="block text-[10px] text-gray-500 mb-0.5">Association kind</label>
										<select
											class="w-full text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900"
											data-testid="case-intel-entity-detail-add-assoc-kind"
											bind:value={addAssocKind}
										>
											{#each ASSOC_KINDS as k}
												<option value={k}>{associationKindLabel(k)}</option>
											{/each}
										</select>
									</div>
									<div>
										<label class="block text-[10px] text-gray-500 mb-0.5">Assertion lane</label>
										<select
											class="w-full text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900"
											data-testid="case-intel-entity-detail-add-assoc-lane"
											bind:value={addAssocLane}
										>
											{#each ASSOC_LANES as ln}
												<option value={ln}>{assertionLaneLabel(ln)}</option>
											{/each}
										</select>
									</div>
									<div class="sm:col-span-2">
										<label class="block text-[10px] text-gray-500 mb-0.5">Initial staging status</label>
										<select
											class="w-full text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900"
											data-testid="case-intel-entity-detail-add-assoc-status"
											bind:value={addAssocStatus}
										>
											<option value="draft">Draft (still editing)</option>
											<option value="pending">Pending (ready for commit review)</option>
										</select>
									</div>
								</div>

								{#if addAssocKind === 'ASSOCIATED_WITH'}
									<p class="text-[10px] text-amber-900/90 dark:text-amber-200/90">
										For <strong>Associated with</strong>, Case Engine stores endpoints with <strong>A id &lt; B id</strong> (lexicographic).
										Preview:
										{#if assocEndpointPreview}
											<span class="font-mono text-[10px]">
												A={assocEndpointPreview.endpoint_a_entity_id.slice(0, 8)}… → B={assocEndpointPreview.endpoint_b_entity_id.slice(
													0,
													8
												)}…
											</span>
										{/if}
									</p>
								{/if}

								<div>
									<label class="block text-[10px] text-gray-500 mb-0.5">Operator notes (optional)</label>
									<input
										type="text"
										class="w-full text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-2 py-1.5"
										data-testid="case-intel-entity-detail-add-assoc-notes"
										bind:value={addAssocNotes}
									/>
								</div>

								<div>
									<label class="block text-[10px] text-gray-500 mb-0.5">Proposed attributes (JSON object)</label>
									<textarea
										class="w-full text-xs font-mono rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-2 py-1.5 min-h-[4rem]"
										data-testid="case-intel-entity-detail-add-assoc-attrs"
										bind:value={addAssocAttrsJson}
										rows="3"
									/>
								</div>

								{#if addAssocError}
									<p class="text-xs text-red-600 dark:text-red-400" data-testid="case-intel-entity-detail-add-assoc-error">
										{addAssocError}
									</p>
								{/if}
								{#if addAssocSuccess}
									<p class="text-xs text-green-700 dark:text-green-300" data-testid="case-intel-entity-detail-add-assoc-success">
										{addAssocSuccess}
									</p>
								{/if}

								<div class="flex flex-wrap gap-2 pt-1">
									<button
										type="button"
										class="px-3 py-1.5 rounded-md text-xs font-medium bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50"
										data-testid="case-intel-entity-detail-add-assoc-submit"
										disabled={addAssocSubmitting || !addAssocOtherEntityId.trim()}
										on:click={() => void submitAddAssocStaging()}
									>
										{addAssocSubmitting ? 'Staging…' : 'Stage association'}
									</button>
									<button
										type="button"
										class="px-3 py-1.5 rounded-md text-xs font-medium border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800"
										data-testid="case-intel-entity-detail-add-assoc-cancel"
										disabled={addAssocSubmitting}
										on:click={() => {
											showAddAssocForm = false;
											addAssocError = '';
											addAssocSuccess = '';
										}}
									>
										Cancel
									</button>
								</div>
							{/if}
						</section>
					{/if}
				{/if}
			</div>

			<div
				class="px-4 py-3 border-t border-gray-100 dark:border-gray-800 shrink-0 flex flex-wrap gap-2 items-center justify-between bg-gray-50/80 dark:bg-gray-950/40"
			>
				<p class="text-[11px] text-gray-500 dark:text-gray-400 max-w-md leading-snug">
					<strong>Stage&nbsp;2</strong> is the queue for staged edges: edit, <strong>commit</strong> (authoritative),
					reject, or retire. Associations do not advance lifecycle from this dialog alone.
				</p>
				<div class="flex flex-wrap gap-2">
					<button
						type="button"
						class="px-3 py-1.5 rounded-md text-xs font-medium border border-amber-600 dark:border-amber-500 text-amber-900 dark:text-amber-200 hover:bg-amber-50 dark:hover:bg-amber-950/40 disabled:opacity-50"
						data-testid="case-intel-entity-detail-add-assoc-toggle"
						disabled={loading || !!loadError || anchorRetired}
						title={anchorRetired ? 'Anchor is retired — use Stage 2 if needed.' : 'Create a staging row (not committed until Stage 2 commit)'}
						on:click={() => {
							showAddAssocForm = !showAddAssocForm;
							if (!showAddAssocForm) {
								addAssocError = '';
								addAssocSuccess = '';
							}
						}}
					>
						{showAddAssocForm ? 'Close proposal form' : 'Propose association'}
					</button>
					<button
						type="button"
						class="px-3 py-1.5 rounded-md text-xs font-medium border border-blue-600 dark:border-blue-500 text-blue-800 dark:text-blue-200 hover:bg-blue-50 dark:hover:bg-blue-950/50"
						data-testid="case-intel-entity-detail-handoff-stage2"
						title="Scroll to Stage 2 association pilot on this case page"
						on:click={() => {
							closeModal();
							scrollToStage2();
						}}
					>
						Go to Stage 2 queue
					</button>
				</div>
			</div>
		</div>
	{/if}
</dialog>
