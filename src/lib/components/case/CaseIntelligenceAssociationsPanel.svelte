<script lang="ts">
	/**
	 * P66-10 — Stage 2 pilot: association edges (staging vs committed). All truth from Case Engine;
	 * no OWUI graph store. Orthogonal to P19 / proposal_records.
	 */
	import { onMount, tick } from 'svelte';
	import ConfirmDialog from '$lib/components/common/ConfirmDialog.svelte';
	import {
		listCaseIntelligenceAssociationStaging,
		createCaseIntelligenceAssociationStaging,
		patchCaseIntelligenceAssociationStaging,
		commitCaseIntelligenceAssociationStaging,
		rejectCaseIntelligenceAssociationStaging,
		listCaseIntelligenceCommittedAssociations,
		listCaseIntelligenceAssociationsForEntity,
		listCaseIntelligenceCommittedEntities,
		retireCaseIntelligenceAssociation,
		restoreCaseIntelligenceAssociation,
		type CaseIntelligenceAssociationKind,
		type CaseIntelligenceAssertionLane,
		type CaseIntelligenceAssociationStagingRecord,
		type CaseIntelligenceCommittedAssociationProjection,
		type CaseIntelligenceCommittedEntity
	} from '$lib/apis/caseEngine';

	export let caseId: string;
	export let token: string;

	const ASSOC_KINDS: CaseIntelligenceAssociationKind[] = ['KNOWS', 'ASSOCIATED_WITH', 'OPERATES_VEHICLE'];
	const LANES: CaseIntelligenceAssertionLane[] = ['HYPOTHESIS', 'SETTLED'];

	let assocStagingRows: CaseIntelligenceAssociationStagingRecord[] = [];
	let assocCommittedRows: CaseIntelligenceCommittedAssociationProjection[] = [];
	let entityRows: CaseIntelligenceCommittedEntity[] = [];
	let assocListScope: 'active_only' | 'include_retired' = 'active_only';
	let assocIncludeRetired = false;

	let adjacencyEntityId = '';
	let adjacencyIncludeRetired = false;
	let adjacencyRows: CaseIntelligenceCommittedAssociationProjection[] = [];
	let adjacencyLoading = false;
	let adjacencyError = '';

	let loadError = '';
	let loading = false;
	let mutationError = '';
	let mutationErrorAction = '';

	let assocConfirmShow = false;
	let assocConfirmTitle = '';
	let assocConfirmMessage = '';
	let assocConfirmButtonLabel = 'Confirm';
	let assocConfirmMode: 'assoc_commit' | 'assoc_reject' | 'assoc_retire' | null = null;
	let assocConfirmStaging: CaseIntelligenceAssociationStagingRecord | null = null;
	let assocConfirmCommitted: CaseIntelligenceCommittedAssociationProjection | null = null;

	let createAssocKind: CaseIntelligenceAssociationKind = 'KNOWS';
	let createEndpointA = '';
	let createEndpointB = '';
	let createLane: CaseIntelligenceAssertionLane = 'HYPOTHESIS';
	let createNotes = '';
	let createAttrsJson = '{}';
	let createAssocStatus: 'draft' | 'pending' = 'draft';
	let creatingAssoc = false;

	let editAssocKind: Record<string, CaseIntelligenceAssociationKind> = {};
	let editEndpointA: Record<string, string> = {};
	let editEndpointB: Record<string, string> = {};
	let editLane: Record<string, CaseIntelligenceAssertionLane> = {};
	let editNotes: Record<string, string> = {};
	let editAttrsJson: Record<string, string> = {};
	let editAssocStatus: Record<string, 'draft' | 'pending'> = {};

	let prevCaseId = '';

	$: activeEntities = entityRows.filter((e) => !e.deleted_at);
	$: entityOptionRows = [...entityRows].sort((a, b) =>
		a.display_label.localeCompare(b.display_label, undefined, { sensitivity: 'base' })
	);

	function entityLabel(id: string): string {
		const ent = entityRows.find((e) => e.id === id);
		if (!ent) return id;
		const retired = ent.deleted_at ? ' · entity retired' : '';
		return `${ent.display_label} (${ent.entity_kind})${retired}`;
	}

	function syncAssocEditBuffers(rows: CaseIntelligenceAssociationStagingRecord[]): void {
		const nextK = { ...editAssocKind };
		const nextA = { ...editEndpointA };
		const nextB = { ...editEndpointB };
		const nextL = { ...editLane };
		const nextN = { ...editNotes };
		const nextJ = { ...editAttrsJson };
		const nextS = { ...editAssocStatus };
		const ids = new Set(rows.map((r) => r.id));
		for (const id of Object.keys(nextK)) if (!ids.has(id)) delete nextK[id];
		for (const id of Object.keys(nextA)) if (!ids.has(id)) delete nextA[id];
		for (const id of Object.keys(nextB)) if (!ids.has(id)) delete nextB[id];
		for (const id of Object.keys(nextL)) if (!ids.has(id)) delete nextL[id];
		for (const id of Object.keys(nextN)) if (!ids.has(id)) delete nextN[id];
		for (const id of Object.keys(nextJ)) if (!ids.has(id)) delete nextJ[id];
		for (const id of Object.keys(nextS)) if (!ids.has(id)) delete nextS[id];
		for (const r of rows) {
			if (nextK[r.id] === undefined) nextK[r.id] = r.association_kind;
			if (nextA[r.id] === undefined) nextA[r.id] = r.endpoint_a_entity_id;
			if (nextB[r.id] === undefined) nextB[r.id] = r.endpoint_b_entity_id;
			if (nextL[r.id] === undefined) nextL[r.id] = r.assertion_lane;
			if (nextN[r.id] === undefined) nextN[r.id] = r.proposed_notes ?? '';
			if (nextJ[r.id] === undefined) {
				try {
					nextJ[r.id] = JSON.stringify(r.proposed_attributes ?? {}, null, 0);
				} catch {
					nextJ[r.id] = '{}';
				}
			}
			if (nextS[r.id] === undefined) nextS[r.id] = r.status === 'pending' ? 'pending' : 'draft';
		}
		editAssocKind = nextK;
		editEndpointA = nextA;
		editEndpointB = nextB;
		editLane = nextL;
		editNotes = nextN;
		editAttrsJson = nextJ;
		editAssocStatus = nextS;
	}

	async function loadAdjacency(): Promise<void> {
		adjacencyError = '';
		if (!caseId || !token || !adjacencyEntityId.trim()) {
			adjacencyRows = [];
			return;
		}
		adjacencyLoading = true;
		try {
			const out = await listCaseIntelligenceAssociationsForEntity(
				caseId,
				adjacencyEntityId.trim(),
				token,
				{ includeRetired: adjacencyIncludeRetired }
			);
			adjacencyRows = out.committed_associations;
		} catch (e) {
			adjacencyRows = [];
			adjacencyError = e instanceof Error ? e.message : 'Failed to load adjacency.';
		} finally {
			adjacencyLoading = false;
		}
	}

	async function refresh(): Promise<void> {
		if (!caseId || !token) return;
		loading = true;
		loadError = '';
		mutationError = '';
		mutationErrorAction = '';
		try {
			const [staging, assocList, entList] = await Promise.all([
				listCaseIntelligenceAssociationStaging(caseId, token),
				listCaseIntelligenceCommittedAssociations(caseId, token, { includeRetired: assocIncludeRetired }),
				listCaseIntelligenceCommittedEntities(caseId, token, { includeRetired: true })
			]);
			assocStagingRows = staging;
			assocCommittedRows = assocList.committed_associations;
			assocListScope = assocList.list_scope;
			entityRows = entList.committed_entities;
			syncAssocEditBuffers(assocStagingRows);
			await loadAdjacency();
		} catch (e) {
			loadError = e instanceof Error ? e.message : 'Failed to load association data.';
			assocStagingRows = [];
			assocCommittedRows = [];
			entityRows = [];
			adjacencyRows = [];
		} finally {
			loading = false;
		}
	}

	onMount(() => {
		void refresh();
	});

	$: if (caseId && token && caseId !== prevCaseId) {
		prevCaseId = caseId;
		assocStagingRows = [];
		assocCommittedRows = [];
		entityRows = [];
		adjacencyEntityId = '';
		adjacencyRows = [];
		editAssocKind = {};
		editEndpointA = {};
		editEndpointB = {};
		editLane = {};
		editNotes = {};
		editAttrsJson = {};
		editAssocStatus = {};
		void refresh();
	}

	function toggleAssocIncludeRetired(): void {
		assocIncludeRetired = !assocIncludeRetired;
		void refresh();
	}

	function parseAttrs(raw: string): Record<string, unknown> {
		const t = raw.trim() || '{}';
		const o = JSON.parse(t) as unknown;
		if (o === null || typeof o !== 'object' || Array.isArray(o)) {
			throw new Error('Proposed attributes must be a JSON object.');
		}
		return o as Record<string, unknown>;
	}

	function canonicalizeAssociatedWithEndpoints(a: string, b: string): { endpoint_a_entity_id: string; endpoint_b_entity_id: string } {
		if (a.localeCompare(b) < 0) return { endpoint_a_entity_id: a, endpoint_b_entity_id: b };
		return { endpoint_a_entity_id: b, endpoint_b_entity_id: a };
	}

	async function onCreateAssoc(): Promise<void> {
		if (!caseId || !token || creatingAssoc) return;
		mutationError = '';
		mutationErrorAction = '';
		const a = createEndpointA.trim();
		const b = createEndpointB.trim();
		if (!a || !b) {
			mutationError = 'Select both endpoint entities.';
			return;
		}
		if (a === b) {
			mutationError = 'Endpoints must be two different committed entities.';
			return;
		}
		let attrs: Record<string, unknown>;
		try {
			attrs = parseAttrs(createAttrsJson);
		} catch (e) {
			mutationError = e instanceof Error ? e.message : 'Invalid JSON for proposed attributes.';
			return;
		}
		let body = {
			association_kind: createAssocKind,
			endpoint_a_entity_id: a,
			endpoint_b_entity_id: b,
			assertion_lane: createLane,
			proposed_notes: createNotes.trim() || null,
			proposed_attributes: attrs,
			status: createAssocStatus
		};
		if (createAssocKind === 'ASSOCIATED_WITH') {
			const c = canonicalizeAssociatedWithEndpoints(a, b);
			body = { ...body, ...c };
		}
		creatingAssoc = true;
		try {
			await createCaseIntelligenceAssociationStaging(caseId, token, body);
			createEndpointA = '';
			createEndpointB = '';
			createNotes = '';
			createAttrsJson = '{}';
			await refresh();
		} catch (e) {
			mutationError = e instanceof Error ? e.message : 'Create association staging failed.';
		} finally {
			creatingAssoc = false;
		}
	}

	async function onSaveAssocStaging(row: CaseIntelligenceAssociationStagingRecord): Promise<void> {
		if (!caseId || !token || !isAssocOpenStaging(row)) return;
		mutationError = '';
		mutationErrorAction = '';
		const id = row.id;
		let attrs: Record<string, unknown>;
		try {
			attrs = parseAttrs(editAttrsJson[id] ?? '{}');
		} catch (e) {
			mutationError = e instanceof Error ? e.message : 'Invalid JSON for proposed attributes.';
			return;
		}
		const kind = editAssocKind[id] ?? row.association_kind;
		let endpoint_a_entity_id = (editEndpointA[id] ?? '').trim();
		let endpoint_b_entity_id = (editEndpointB[id] ?? '').trim();
		if (!endpoint_a_entity_id || !endpoint_b_entity_id) {
			mutationError = 'Both endpoint entities are required.';
			return;
		}
		if (kind === 'ASSOCIATED_WITH') {
			const c = canonicalizeAssociatedWithEndpoints(endpoint_a_entity_id, endpoint_b_entity_id);
			endpoint_a_entity_id = c.endpoint_a_entity_id;
			endpoint_b_entity_id = c.endpoint_b_entity_id;
		}
		const patch: Record<string, unknown> = {
			association_kind: kind,
			endpoint_a_entity_id,
			endpoint_b_entity_id,
			assertion_lane: editLane[id] ?? row.assertion_lane,
			proposed_notes: (editNotes[id] ?? '').trim() || null,
			proposed_attributes: attrs,
			status: editAssocStatus[id] ?? 'draft'
		};
		try {
			await patchCaseIntelligenceAssociationStaging(caseId, id, token, patch);
			await refresh();
		} catch (e) {
			mutationError = e instanceof Error ? e.message : 'Update failed.';
		}
	}

	function resetAssocConfirm(): void {
		assocConfirmMode = null;
		assocConfirmStaging = null;
		assocConfirmCommitted = null;
	}

	function openAssocCommit(row: CaseIntelligenceAssociationStagingRecord): void {
		if (!caseId || !token || loading) return;
		assocConfirmMode = 'assoc_commit';
		assocConfirmStaging = row;
		assocConfirmCommitted = null;
		assocConfirmTitle = 'Commit association to authoritative intel?';
		assocConfirmMessage = [
			`This creates an **authoritative** association **edge** in Case Engine (human-gated, audited).`,
			`**Not** a P19 proposal commit — intel associations use this pipeline only.`,
			``,
			`**Kind:** ${row.association_kind}`,
			`**Lane:** ${assertionLaneLabel(row.assertion_lane)}`,
			`**A → B:** ${entityLabel(row.endpoint_a_entity_id)} → ${entityLabel(row.endpoint_b_entity_id)}`,
			``,
			`After commit, the edge appears in **committed associations** and adjacency views. Staging closes as committed.`
		].join('\n');
		assocConfirmButtonLabel = 'Commit association';
		assocConfirmShow = true;
	}

	function openAssocReject(row: CaseIntelligenceAssociationStagingRecord): void {
		if (!caseId || !token || loading) return;
		assocConfirmMode = 'assoc_reject';
		assocConfirmStaging = row;
		assocConfirmCommitted = null;
		assocConfirmTitle = 'Reject association staging?';
		assocConfirmMessage = [
			`**Reject** closes this **non-authoritative** association proposal **without** adding an authoritative edge.`,
			`The authoritative association list **does not** change.`,
			``,
			`**Kind:** ${row.association_kind}`,
			`**Endpoints:** ${entityLabel(row.endpoint_a_entity_id)} · ${entityLabel(row.endpoint_b_entity_id)}`
		].join('\n');
		assocConfirmButtonLabel = 'Reject staging';
		assocConfirmShow = true;
	}

	function openAssocRetire(edge: CaseIntelligenceCommittedAssociationProjection): void {
		if (!caseId || !token || loading) return;
		assocConfirmMode = 'assoc_retire';
		assocConfirmStaging = null;
		assocConfirmCommitted = edge;
		assocConfirmTitle = 'Retire this association?';
		assocConfirmMessage = [
			`**Retire** soft-deletes the association edge in Case Engine (audit retained). It drops from **active** lists unless you include retired.`,
			``,
			`**Kind:** ${edge.association_kind}`,
			`**Lane:** ${assertionLaneLabel(edge.assertion_lane)}`,
			`**Endpoints:** ${entityLabel(edge.endpoint_a_entity_id)} · ${entityLabel(edge.endpoint_b_entity_id)}`
		].join('\n');
		assocConfirmButtonLabel = 'Retire association';
		assocConfirmShow = true;
	}

	async function handleAssocConfirmCancel(): Promise<void> {
		resetAssocConfirm();
		await tick();
	}

	async function executeAssocConfirm(): Promise<void> {
		const mode = assocConfirmMode;
		const row = assocConfirmStaging;
		const edge = assocConfirmCommitted;
		resetAssocConfirm();
		mutationError = '';
		mutationErrorAction = '';
		if (!caseId || !token) return;
		try {
			if (mode === 'assoc_commit' && row) {
				await commitCaseIntelligenceAssociationStaging(caseId, row.id, token);
			} else if (mode === 'assoc_reject' && row) {
				await rejectCaseIntelligenceAssociationStaging(caseId, row.id, token, {});
			} else if (mode === 'assoc_retire' && edge) {
				await retireCaseIntelligenceAssociation(caseId, edge.id, token);
			}
			await refresh();
		} catch (e) {
			const msg = e instanceof Error ? e.message : 'Request failed.';
			if (mode === 'assoc_commit') {
				mutationErrorAction = 'Commit association';
				mutationError = msg;
			} else if (mode === 'assoc_reject') {
				mutationErrorAction = 'Reject association staging';
				mutationError = msg;
			} else if (mode === 'assoc_retire') {
				mutationErrorAction = 'Retire association';
				mutationError = msg;
			} else {
				mutationError = msg;
			}
		}
	}

	async function onRestoreAssoc(edge: CaseIntelligenceCommittedAssociationProjection): Promise<void> {
		if (!caseId || !token) return;
		mutationError = '';
		mutationErrorAction = '';
		try {
			await restoreCaseIntelligenceAssociation(caseId, edge.id, token);
			await refresh();
		} catch (e) {
			mutationErrorAction = 'Restore association';
			mutationError = e instanceof Error ? e.message : 'Restore failed.';
		}
	}

	function isAssocOpenStaging(s: CaseIntelligenceAssociationStagingRecord): boolean {
		return s.status === 'draft' || s.status === 'pending';
	}

	function assocStagingLifecycleLabel(status: CaseIntelligenceAssociationStagingRecord['status']): string {
		switch (status) {
			case 'draft':
				return 'Draft';
			case 'pending':
				return 'Pending';
			case 'committed':
				return 'Committed (staging closed)';
			case 'rejected':
				return 'Rejected (staging closed)';
			case 'withdrawn':
				return 'Withdrawn (staging closed)';
			default:
				return String(status);
		}
	}

	function assertionLaneLabel(l: CaseIntelligenceAssertionLane): string {
		return l === 'HYPOTHESIS' ? 'Hypothesis (investigative posit)' : 'Settled (in-system)';
	}

	function assocListScopeLabel(scope: typeof assocListScope): string {
		return scope === 'include_retired' ? 'Including retired edges' : 'Active edges only';
	}

	function associationActive(edge: CaseIntelligenceCommittedAssociationProjection): boolean {
		if (typeof edge.association_active === 'boolean') return edge.association_active;
		return !edge.deleted_at;
	}
</script>

<div
	id="case-intel-stage2-pilot-anchor"
	class="mt-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 space-y-4"
	data-testid="case-intel-stage2-assoc-panel"
>
	<div class="flex flex-wrap items-start justify-between gap-2">
		<div>
			<h2 class="text-sm font-semibold text-gray-900 dark:text-gray-100">
				Case Intelligence — Stage 2 associations (pilot)
			</h2>
			<p class="mt-1 text-[11px] text-gray-500 dark:text-gray-400 max-w-prose leading-relaxed">
				<strong class="text-gray-600 dark:text-gray-300">Committed</strong> edges are authoritative association intel
				(human-gated). <strong class="text-amber-700 dark:text-amber-400">Staging</strong> is queued work: commit to publish the
				edge, reject to discard. Orthogonal to <strong>P19</strong> proposals. Entity detail can start a staging row;
				Stage&nbsp;2 finishes the lifecycle.
			</p>
		</div>
		<button
			type="button"
			class="text-xs px-2 py-1 rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
			disabled={loading || !token }
			on:click={() => void refresh()}
			data-testid="case-intel-stage2-assoc-refresh"
		>
			{loading ? 'Loading…' : 'Refresh'}
		</button>
	</div>

	{#if loadError}
		<p class="text-xs text-red-600 dark:text-red-400" data-testid="case-intel-stage2-assoc-load-error">{loadError}</p>
	{/if}
	{#if mutationError}
		<div
			class="rounded-md border border-red-200 dark:border-red-900/60 bg-red-50/90 dark:bg-red-950/30 px-3 py-2 space-y-1"
			role="alert"
			data-testid="case-intel-stage2-assoc-mutation-error"
		>
			{#if mutationErrorAction}
				<p class="text-[10px] font-semibold uppercase tracking-wide text-red-800 dark:text-red-200">
					{mutationErrorAction}
				</p>
			{/if}
			<p class="text-xs text-red-700 dark:text-red-300">{mutationError}</p>
		</div>
	{/if}

	<!-- Committed associations -->
	<div
		class="rounded-lg border-l-4 border-teal-600 pl-3 pr-2 py-3 space-y-2 bg-teal-50/40 dark:bg-teal-950/20"
		data-testid="case-intel-stage2-assoc-committed-section"
		data-case-intel-authority="authoritative_case_intel"
	>
		<div class="flex flex-wrap items-center gap-2">
			<h3 class="text-sm font-semibold text-teal-900 dark:text-teal-100">Authoritative associations (committed)</h3>
			<span
				class="text-[10px] font-medium px-1.5 py-0.5 rounded bg-teal-100 dark:bg-teal-900/40 text-teal-800 dark:text-teal-200"
			>
				Authoritative · staged separately from P19
			</span>
			<span class="text-[10px] text-gray-500 dark:text-gray-400">{assocListScopeLabel(assocListScope)}</span>
		</div>
		<label class="flex items-center gap-2 text-[11px] text-gray-600 dark:text-gray-400 cursor-pointer">
			<input type="checkbox" checked={assocIncludeRetired} on:change={toggleAssocIncludeRetired} />
			Include retired association edges
		</label>
		{#if loading && assocCommittedRows.length === 0 && !loadError}
			<p class="text-xs text-gray-500" data-testid="case-intel-stage2-assoc-committed-loading">Loading…</p>
		{:else if assocCommittedRows.length === 0}
			<p class="text-xs text-gray-500" data-testid="case-intel-stage2-assoc-committed-empty">No committed edges for this view.</p>
		{:else}
			<ul class="space-y-2" data-testid="case-intel-stage2-assoc-committed-list">
				{#each assocCommittedRows as edge (edge.id)}
					<li
						class="rounded border border-teal-200/80 dark:border-teal-900/50 p-2 text-xs space-y-1 {!associationActive(edge) ? 'opacity-75' : ''}"
						data-testid="case-intel-assoc-committed-{edge.id}"
						data-assertion-lane={edge.assertion_lane}
						data-association-active={associationActive(edge)}
					>
						<div class="flex flex-wrap items-center gap-2">
							<span class="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800">{edge.association_kind}</span>
							<span class="text-[10px] px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900/40 text-indigo-900 dark:text-indigo-100">
								{assertionLaneLabel(edge.assertion_lane)}
							</span>
							{#if !associationActive(edge)}
								<span class="text-[10px] text-amber-700 dark:text-amber-300 font-medium">Retired</span>
							{:else}
								<span class="text-[10px] text-emerald-700 dark:text-emerald-300 font-medium">Active</span>
							{/if}
							{#if edge.endpoint_a_retired || edge.endpoint_b_retired}
								<span class="text-[10px] text-gray-600 dark:text-gray-400" title="Endpoint entity retired in Stage 1">
									Endpoint retired flag
								</span>
							{/if}
						</div>
						<p class="text-[11px] text-gray-800 dark:text-gray-200">
							<span class="font-medium">A</span>: {entityLabel(edge.endpoint_a_entity_id)} ·
							<span class="font-medium">B</span>: {entityLabel(edge.endpoint_b_entity_id)}
						</p>
						<p class="text-[10px] text-gray-400 font-mono">{edge.id}</p>
						<div class="flex flex-wrap gap-2 pt-1">
							{#if associationActive(edge)}
								<button
									type="button"
									class="text-[11px] px-2 py-0.5 rounded border border-red-300 dark:border-red-800 text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/30"
									disabled={loading}
									on:click={() => openAssocRetire(edge)}
									data-testid="case-intel-assoc-retire-{edge.id}"
								>
									Retire edge
								</button>
							{:else}
								<button
									type="button"
									class="text-[11px] px-2 py-0.5 rounded border border-teal-600 text-teal-800 dark:text-teal-200 hover:bg-teal-50 dark:hover:bg-teal-950/30"
									disabled={loading}
									on:click={() => void onRestoreAssoc(edge)}
									data-testid="case-intel-assoc-restore-{edge.id}"
								>
									Restore edge
								</button>
							{/if}
						</div>
					</li>
				{/each}
			</ul>
		{/if}
	</div>

	<!-- Adjacency -->
	<div
		class="rounded-lg border border-gray-200 dark:border-gray-700 p-3 space-y-2"
		data-testid="case-intel-stage2-assoc-adjacency-section"
	>
		<h3 class="text-sm font-semibold text-gray-900 dark:text-gray-100">Incident associations (by entity)</h3>
		<p class="text-[11px] text-gray-500 dark:text-gray-400">
			List-only view of edges touching one committed entity (Case Engine adjacency). Not a graph canvas.
		</p>
		<div class="flex flex-wrap gap-2 items-end">
			<div>
				<label class="block text-[10px] text-gray-500 mb-0.5">Anchor entity</label>
				<select
					class="text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 min-w-[200px]"
					bind:value={adjacencyEntityId}
					on:change={() => void loadAdjacency()}
					data-testid="case-intel-stage2-assoc-adjacency-entity"
				>
					<option value="">— Select —</option>
					{#each entityOptionRows as ent (ent.id)}
						<option value={ent.id}>{ent.display_label} ({ent.entity_kind}){ent.deleted_at ? ' · retired' : ''}</option>
					{/each}
				</select>
			</div>
			<label class="flex items-center gap-2 text-[11px] text-gray-600 dark:text-gray-400 cursor-pointer">
				<input
					type="checkbox"
					bind:checked={adjacencyIncludeRetired}
					on:change={() => void loadAdjacency()}
				/>
				Include retired edges
			</label>
		</div>
		{#if adjacencyError}
			<p class="text-xs text-red-600" data-testid="case-intel-stage2-assoc-adjacency-error">{adjacencyError}</p>
		{/if}
		{#if adjacencyLoading}
			<p class="text-xs text-gray-500" data-testid="case-intel-stage2-assoc-adjacency-loading">Loading adjacency…</p>
		{:else if !adjacencyEntityId}
			<p class="text-xs text-gray-500">Select an entity to load incident associations.</p>
		{:else if adjacencyRows.length === 0}
			<p class="text-xs text-gray-500" data-testid="case-intel-stage2-assoc-adjacency-empty">No incident edges for this anchor.</p>
		{:else}
			<ul class="space-y-1" data-testid="case-intel-stage2-assoc-adjacency-list">
				{#each adjacencyRows as edge (edge.id)}
					<li class="text-xs border border-gray-100 dark:border-gray-800 rounded px-2 py-1" data-testid="case-intel-assoc-adj-{edge.id}">
						<span class="font-medium">{edge.association_kind}</span>
						· {assertionLaneLabel(edge.assertion_lane)}
						· {entityLabel(edge.endpoint_a_entity_id)} ↔ {entityLabel(edge.endpoint_b_entity_id)}
						{#if !associationActive(edge)}
							<span class="text-amber-700 dark:text-amber-300">(retired)</span>
						{/if}
					</li>
				{/each}
			</ul>
		{/if}
	</div>

	<!-- Staging -->
	<div
		class="rounded-lg border-l-4 border-amber-500 pl-3 pr-2 py-3 space-y-3 bg-amber-50/50 dark:bg-amber-950/15"
		data-testid="case-intel-stage2-assoc-staging-section"
		data-case-intel-authority="non_authoritative"
	>
		<div class="flex flex-wrap items-center gap-2">
			<h3 class="text-sm font-semibold text-amber-900 dark:text-amber-100">Association staging (not authoritative)</h3>
			<span class="text-[10px] font-medium px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/40 text-amber-900 dark:text-amber-100">
				Not authoritative
			</span>
		</div>

		<div class="rounded border border-amber-200/80 dark:border-amber-900/50 p-2 space-y-2 bg-white/60 dark:bg-gray-900/40">
			<p class="text-[11px] font-medium text-gray-800 dark:text-gray-200">Propose new association edge</p>
			<p class="text-[10px] text-amber-900/80 dark:text-amber-200/90">
				Endpoints must be <strong>committed Stage 1 entities</strong> for this case. For
				<strong>ASSOCIATED_WITH</strong>, Case Engine requires endpoint A id &lt; B id (lexicographic) — the form applies
				that when saving.
			</p>
			<div class="grid gap-2 sm:grid-cols-2">
				<div>
					<label class="block text-[10px] text-gray-500 mb-0.5">Kind</label>
					<select
						class="w-full text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900"
						bind:value={createAssocKind}
					>
						{#each ASSOC_KINDS as k}
							<option value={k}>{k}</option>
						{/each}
					</select>
				</div>
				<div>
					<label class="block text-[10px] text-gray-500 mb-0.5">Assertion lane</label>
					<select
						class="w-full text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900"
						bind:value={createLane}
					>
						{#each LANES as ln}
							<option value={ln}>{assertionLaneLabel(ln)}</option>
						{/each}
					</select>
				</div>
				<div>
					<label class="block text-[10px] text-gray-500 mb-0.5">Endpoint A</label>
					<select
						class="w-full text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900"
						bind:value={createEndpointA}
						data-testid="case-intel-stage2-assoc-create-endpoint-a"
					>
						<option value="">—</option>
						{#each activeEntities as ent (ent.id)}
							<option value={ent.id}>{ent.display_label} ({ent.entity_kind})</option>
						{/each}
					</select>
				</div>
				<div>
					<label class="block text-[10px] text-gray-500 mb-0.5">Endpoint B</label>
					<select
						class="w-full text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900"
						bind:value={createEndpointB}
						data-testid="case-intel-stage2-assoc-create-endpoint-b"
					>
						<option value="">—</option>
						{#each activeEntities as ent (ent.id)}
							<option value={ent.id}>{ent.display_label} ({ent.entity_kind})</option>
						{/each}
					</select>
				</div>
				<div>
					<label class="block text-[10px] text-gray-500 mb-0.5">Initial status</label>
					<select
						class="w-full text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900"
						bind:value={createAssocStatus}
					>
						<option value="draft">Draft</option>
						<option value="pending">Pending</option>
					</select>
				</div>
			</div>
			<div>
				<label class="block text-[10px] text-gray-500 mb-0.5">Operator notes (optional)</label>
				<input
					type="text"
					class="w-full text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-2 py-1"
					bind:value={createNotes}
				/>
			</div>
			<div>
				<label class="block text-[10px] text-gray-500 mb-0.5">Proposed attributes (JSON object)</label>
				<textarea
					class="w-full text-xs font-mono rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-2 py-1"
					rows="2"
					bind:value={createAttrsJson}
				></textarea>
			</div>
			<button
				type="button"
				class="text-xs px-2 py-1 rounded bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50"
				disabled={creatingAssoc || loading || !token || activeEntities.length < 2}
				on:click={() => void onCreateAssoc()}
				data-testid="case-intel-stage2-assoc-create-submit"
			>
				{creatingAssoc ? 'Creating…' : 'Create association staging'}
			</button>
			{#if activeEntities.length < 2}
				<p class="text-[10px] text-gray-500">Add at least two committed entities (Stage 1) before staging associations.</p>
			{/if}
		</div>

		{#if loading && assocStagingRows.length === 0 && !loadError}
			<p class="text-xs text-gray-500">Loading staging…</p>
		{:else if assocStagingRows.length === 0}
			<p class="text-xs text-gray-500" data-testid="case-intel-stage2-assoc-staging-empty">No association staging rows.</p>
		{:else}
			<ul class="space-y-3" data-testid="case-intel-stage2-assoc-staging-list">
				{#each assocStagingRows as row (row.id)}
					<li
						class="rounded border border-amber-200 dark:border-amber-900/50 p-2 text-xs space-y-2 bg-white/50 dark:bg-gray-900/30"
						data-testid="case-intel-assoc-staging-{row.id}"
					>
						<div class="flex flex-wrap items-center gap-2">
							<span class="text-[10px] font-mono text-gray-500">{row.id}</span>
							<span class="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800">{assocStagingLifecycleLabel(row.status)}</span>
							<span class="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/30">Non-authoritative staging</span>
						</div>
						{#if isAssocOpenStaging(row)}
							<div class="grid gap-2 sm:grid-cols-2">
								<div>
									<label class="block text-[10px] text-gray-500">Kind</label>
									<select
										class="w-full text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900"
										bind:value={editAssocKind[row.id]}
									>
										{#each ASSOC_KINDS as k}
											<option value={k}>{k}</option>
										{/each}
									</select>
								</div>
								<div>
									<label class="block text-[10px] text-gray-500">Lane</label>
									<select
										class="w-full text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900"
										bind:value={editLane[row.id]}
										data-testid="case-intel-assoc-staging-lane-{row.id}"
									>
										{#each LANES as ln}
											<option value={ln}>{assertionLaneLabel(ln)}</option>
										{/each}
									</select>
								</div>
								<div>
									<label class="block text-[10px] text-gray-500">Endpoint A</label>
									<select
										class="w-full text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900"
										bind:value={editEndpointA[row.id]}
									>
										{#each entityRows as ent (ent.id)}
											<option value={ent.id}
												>{ent.display_label}{ent.deleted_at ? ' (retired entity)' : ''}</option
											>
										{/each}
									</select>
								</div>
								<div>
									<label class="block text-[10px] text-gray-500">Endpoint B</label>
									<select
										class="w-full text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900"
										bind:value={editEndpointB[row.id]}
									>
										{#each entityRows as ent (ent.id)}
											<option value={ent.id}
												>{ent.display_label}{ent.deleted_at ? ' (retired entity)' : ''}</option
											>
										{/each}
									</select>
								</div>
								<div>
									<label class="block text-[10px] text-gray-500">Status</label>
									<select
										class="w-full text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900"
										bind:value={editAssocStatus[row.id]}
									>
										<option value="draft">Draft</option>
										<option value="pending">Pending</option>
									</select>
								</div>
							</div>
							<div>
								<label class="block text-[10px] text-gray-500">Notes</label>
								<input
									type="text"
									class="w-full text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-2 py-1"
									bind:value={editNotes[row.id]}
								/>
							</div>
							<div>
								<label class="block text-[10px] text-gray-500">Proposed attributes (JSON)</label>
								<textarea
									class="w-full text-xs font-mono rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-2 py-1"
									rows="2"
									bind:value={editAttrsJson[row.id]}
								></textarea>
							</div>
							<div class="flex flex-wrap gap-2">
								<button
									type="button"
									class="text-[11px] px-2 py-0.5 rounded border border-gray-400 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800"
									disabled={loading}
									on:click={() => void onSaveAssocStaging(row)}
									data-testid="case-intel-assoc-staging-save-{row.id}"
								>
									Save edits
								</button>
								<button
									type="button"
									class="text-[11px] px-2 py-0.5 rounded bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50"
									disabled={loading}
									on:click={() => openAssocCommit(row)}
									data-testid="case-intel-assoc-staging-commit-{row.id}"
								>
									Commit association
								</button>
								<button
									type="button"
									class="text-[11px] px-2 py-0.5 rounded border border-red-400 text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/20"
									disabled={loading}
									on:click={() => openAssocReject(row)}
									data-testid="case-intel-assoc-staging-reject-{row.id}"
								>
									Reject staging
								</button>
							</div>
						{:else}
							<div class="text-gray-700 dark:text-gray-300 space-y-1">
								<p>
									<span class="font-medium">{row.association_kind}</span>
									· {assertionLaneLabel(row.assertion_lane)}
								</p>
								<p class="text-[10px] text-gray-500">
									{entityLabel(row.endpoint_a_entity_id)} · {entityLabel(row.endpoint_b_entity_id)}
								</p>
								{#if row.result_association_id}
									<p class="text-[10px] text-gray-500">
										Committed edge id: <span class="font-mono">{row.result_association_id}</span>
									</p>
								{/if}
							</div>
						{/if}
					</li>
				{/each}
			</ul>
		{/if}
	</div>
</div>

<div data-testid="case-intel-stage2-assoc-confirm">
	<ConfirmDialog
		bind:show={assocConfirmShow}
		title={assocConfirmTitle}
		message={assocConfirmMessage}
		cancelLabel="Cancel"
		confirmLabel={assocConfirmButtonLabel}
		on:cancel={handleAssocConfirmCancel}
		onConfirm={executeAssocConfirm}
	/>
</div>
