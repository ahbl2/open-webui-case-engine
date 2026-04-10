<script lang="ts">
	/**
	 * P64-10: minimal Stage 1 pilot — committed vs staging Case Intelligence.
	 * P68-06 / P68-07: proposal/staging-first; registries are primary browse/register; committed block here is operator mirror.
	 * All state is loaded from Case Engine; no OWUI persistence of intel truth.
	 */
	import { onMount, tick } from 'svelte';
	import ConfirmDialog from '$lib/components/common/ConfirmDialog.svelte';
	import {
		listCaseIntelligenceStaging,
		createCaseIntelligenceStaging,
		patchCaseIntelligenceStaging,
		commitCaseIntelligenceStaging,
		rejectCaseIntelligenceStaging,
		listCaseIntelligenceCommittedEntities,
		retireCaseIntelligenceEntity,
		restoreCaseIntelligenceEntity,
		type CaseIntelligenceCommittedEntity,
		type CaseIntelligenceEntityKind,
		type CaseIntelligenceStagingRecord,
		type CaseIntelligencePersonPosture
	} from '$lib/apis/caseEngine';

	export let caseId: string;
	export let token: string;

	const KINDS: CaseIntelligenceEntityKind[] = ['PERSON', 'VEHICLE', 'LOCATION'];
	const POSTURES: CaseIntelligencePersonPosture[] = [
		'IDENTIFIED',
		'UNKNOWN_PARTIAL',
		'UNKNOWN_PLACEHOLDER'
	];

	let stagingRows: CaseIntelligenceStagingRecord[] = [];
	let committedRows: CaseIntelligenceCommittedEntity[] = [];
	let listScope: 'active_only' | 'include_retired' = 'active_only';
	let includeRetired = false;

	let loadError = '';
	let loading = false;
	let mutationError = '';
	/** P65-04b / F-10: short label for which action failed (commit / reject / retire). */
	let mutationErrorAction = '';

	/** P65-04b / F-03: single shared confirm dialog for commit / reject / retire. */
	let mutationConfirmShow = false;
	let mutationConfirmTitle = '';
	let mutationConfirmMessage = '';
	let mutationConfirmButtonLabel = 'Confirm';
	let mutationConfirmMode: 'commit' | 'reject' | 'retire' | null = null;
	let mutationConfirmStagingRow: CaseIntelligenceStagingRecord | null = null;
	let mutationConfirmRetireEntity: CaseIntelligenceCommittedEntity | null = null;

	let createKind: CaseIntelligenceEntityKind = 'VEHICLE';
	let createLabel = '';
	let createPosture: CaseIntelligencePersonPosture = 'IDENTIFIED';
	let createAttrsJson = '{}';
	let createStatus: 'draft' | 'pending' = 'draft';
	let creating = false;

	/** Inline edit buffers keyed by staging id */
	let editLabel: Record<string, string> = {};
	let editAttrsJson: Record<string, string> = {};
	let editStatus: Record<string, 'draft' | 'pending'> = {};
	let editKind: Record<string, CaseIntelligenceEntityKind> = {};
	let editPosture: Record<string, CaseIntelligencePersonPosture | ''> = {};

	let prevCaseId = '';

	function syncEditBuffers(rows: CaseIntelligenceStagingRecord[]): void {
		const nextLabel = { ...editLabel };
		const nextAttrs = { ...editAttrsJson };
		const nextStatus = { ...editStatus };
		const nextKind = { ...editKind };
		const nextPosture = { ...editPosture };
		const ids = new Set(rows.map((r) => r.id));
		for (const id of Object.keys(nextLabel)) {
			if (!ids.has(id)) delete nextLabel[id];
		}
		for (const id of Object.keys(nextAttrs)) {
			if (!ids.has(id)) delete nextAttrs[id];
		}
		for (const id of Object.keys(nextStatus)) {
			if (!ids.has(id)) delete nextStatus[id];
		}
		for (const id of Object.keys(nextKind)) {
			if (!ids.has(id)) delete nextKind[id];
		}
		for (const id of Object.keys(nextPosture)) {
			if (!ids.has(id)) delete nextPosture[id];
		}
		for (const r of rows) {
			if (nextLabel[r.id] === undefined) nextLabel[r.id] = r.proposed_display_label;
			if (nextAttrs[r.id] === undefined) {
				try {
					nextAttrs[r.id] = JSON.stringify(r.proposed_core_attributes ?? {}, null, 0);
				} catch {
					nextAttrs[r.id] = '{}';
				}
			}
			if (nextStatus[r.id] === undefined) {
				nextStatus[r.id] = r.status === 'pending' ? 'pending' : 'draft';
			}
			if (nextKind[r.id] === undefined) nextKind[r.id] = r.entity_kind;
			if (nextPosture[r.id] === undefined) {
				nextPosture[r.id] = r.person_identity_posture ?? '';
			}
		}
		editLabel = nextLabel;
		editAttrsJson = nextAttrs;
		editStatus = nextStatus;
		editKind = nextKind;
		editPosture = nextPosture;
	}

	async function refresh(): Promise<void> {
		if (!caseId || !token) return;
		loading = true;
		loadError = '';
		mutationError = '';
		mutationErrorAction = '';
		try {
			const [staging, committedList] = await Promise.all([
				listCaseIntelligenceStaging(caseId, token),
				listCaseIntelligenceCommittedEntities(caseId, token, { includeRetired })
			]);
			stagingRows = staging;
			committedRows = committedList.committed_entities;
			listScope = committedList.list_scope;
			syncEditBuffers(stagingRows);
		} catch (e) {
			loadError = e instanceof Error ? e.message : 'Failed to load Case Intelligence data.';
			stagingRows = [];
			committedRows = [];
		} finally {
			loading = false;
		}
	}

	onMount(() => {
		void refresh();
	});

	$: if (caseId && token && caseId !== prevCaseId) {
		prevCaseId = caseId;
		stagingRows = [];
		committedRows = [];
		editLabel = {};
		editAttrsJson = {};
		editStatus = {};
		editKind = {};
		editPosture = {};
		void refresh();
	}

	function toggleIncludeRetired(): void {
		includeRetired = !includeRetired;
		void refresh();
	}

	function parseAttrs(raw: string): Record<string, unknown> {
		const t = raw.trim() || '{}';
		const o = JSON.parse(t) as unknown;
		if (o === null || typeof o !== 'object' || Array.isArray(o)) {
			throw new Error('Core attributes must be a JSON object.');
		}
		return o as Record<string, unknown>;
	}

	async function onCreate(): Promise<void> {
		if (!caseId || !token || creating) return;
		mutationError = '';
		mutationErrorAction = '';
		const label = createLabel.trim();
		if (!label) {
			mutationError = 'Display label is required.';
			return;
		}
		let attrs: Record<string, unknown>;
		try {
			attrs = parseAttrs(createAttrsJson);
		} catch (e) {
			mutationError = e instanceof Error ? e.message : 'Invalid JSON for core attributes.';
			return;
		}
		creating = true;
		try {
			const body: Parameters<typeof createCaseIntelligenceStaging>[2] = {
				entity_kind: createKind,
				proposed_display_label: label,
				proposed_core_attributes: attrs,
				status: createStatus
			};
			if (createKind === 'PERSON') {
				body.person_identity_posture = createPosture;
			}
			await createCaseIntelligenceStaging(caseId, token, body);
			createLabel = '';
			createAttrsJson = '{}';
			await refresh();
		} catch (e) {
			mutationError = e instanceof Error ? e.message : 'Create failed.';
		} finally {
			creating = false;
		}
	}

	async function onSaveStaging(row: CaseIntelligenceStagingRecord): Promise<void> {
		if (!caseId || !token || row.status === 'committed' || row.status === 'rejected') return;
		mutationError = '';
		mutationErrorAction = '';
		const id = row.id;
		let attrs: Record<string, unknown>;
		try {
			attrs = parseAttrs(editAttrsJson[id] ?? '{}');
		} catch (e) {
			mutationError = e instanceof Error ? e.message : 'Invalid JSON for core attributes.';
			return;
		}
		const kind = editKind[id] ?? row.entity_kind;
		const patch: Record<string, unknown> = {
			proposed_display_label: (editLabel[id] ?? '').trim(),
			proposed_core_attributes: attrs,
			status: editStatus[id] ?? 'draft',
			entity_kind: kind
		};
		if (kind === 'PERSON') {
			const p = editPosture[id];
			if (!p) {
				mutationError = 'Person identity posture is required for PERSON.';
				return;
			}
			patch.person_identity_posture = p;
		} else {
			patch.person_identity_posture = null;
		}
		try {
			await patchCaseIntelligenceStaging(caseId, id, token, patch);
			await refresh();
		} catch (e) {
			mutationError = e instanceof Error ? e.message : 'Update failed.';
		}
	}

	function resetMutationConfirmState(): void {
		mutationConfirmMode = null;
		mutationConfirmStagingRow = null;
		mutationConfirmRetireEntity = null;
	}

	function openCommitConfirmation(row: CaseIntelligenceStagingRecord): void {
		if (!caseId || !token || loading) return;
		mutationConfirmMode = 'commit';
		mutationConfirmStagingRow = row;
		mutationConfirmRetireEntity = null;
		mutationConfirmTitle = 'Commit to authoritative intel?';
		mutationConfirmMessage = [
			`This **promotes** this **staging proposal** to **authoritative** committed case intelligence in Case Engine (human-gated, audited).`,
			``,
			`**Label:** ${row.proposed_display_label}`,
			`**Kind:** ${entityKindLabel(row.entity_kind)}`,
			``,
			`After promotion, the staging row **closes** and the entity appears in the **committed** list above and in the **registries**.`
		].join('\n');
		mutationConfirmButtonLabel = 'Commit to authoritative';
		mutationConfirmShow = true;
	}

	function openRejectConfirmation(row: CaseIntelligenceStagingRecord): void {
		if (!caseId || !token || loading) return;
		mutationConfirmMode = 'reject';
		mutationConfirmStagingRow = row;
		mutationConfirmRetireEntity = null;
		mutationConfirmTitle = 'Reject this staging row?';
		mutationConfirmMessage = [
			`**Reject** closes this **non-authoritative** staging proposal **without** creating authoritative intel.`,
			``,
			`**Label:** ${row.proposed_display_label}`,
			`**Kind:** ${entityKindLabel(row.entity_kind)}`,
			``,
			`The row stays visible below as **rejected** (not deleted). Nothing in the committed list changes.`
		].join('\n');
		mutationConfirmButtonLabel = 'Reject staging';
		mutationConfirmShow = true;
	}

	function openRetireConfirmation(ent: CaseIntelligenceCommittedEntity): void {
		if (!caseId || !token || loading) return;
		mutationConfirmMode = 'retire';
		mutationConfirmStagingRow = null;
		mutationConfirmRetireEntity = ent;
		mutationConfirmTitle = 'Retire this entity from active intel?';
		mutationConfirmMessage = [
			`**Retire** removes this entity from the **active** authoritative intel view (soft delete in Case Engine).`,
			``,
			`**Label:** ${ent.display_label}`,
			`**Kind:** ${entityKindLabel(ent.entity_kind)}`,
			``,
			`It remains stored with **audit history** and can be **restored** when “Include retired” is enabled.`
		].join('\n');
		mutationConfirmButtonLabel = 'Retire entity';
		mutationConfirmShow = true;
	}

	async function handleMutationConfirmCancel(): Promise<void> {
		resetMutationConfirmState();
		await tick();
	}

	async function executeConfirmedMutation(): Promise<void> {
		const mode = mutationConfirmMode;
		const row = mutationConfirmStagingRow;
		const ent = mutationConfirmRetireEntity;
		resetMutationConfirmState();
		mutationError = '';
		mutationErrorAction = '';
		if (!caseId || !token) return;
		try {
			if (mode === 'commit' && row) {
				await commitCaseIntelligenceStaging(caseId, row.id, token);
			} else if (mode === 'reject' && row) {
				await rejectCaseIntelligenceStaging(caseId, row.id, token, {});
			} else if (mode === 'retire' && ent) {
				await retireCaseIntelligenceEntity(caseId, ent.id, token);
			}
			await refresh();
		} catch (e) {
			const msg = e instanceof Error ? e.message : 'Request failed.';
			if (mode === 'commit') {
				mutationErrorAction = 'Commit to authoritative intel';
				mutationError = msg;
			} else if (mode === 'reject') {
				mutationErrorAction = 'Reject staging';
				mutationError = msg;
			} else if (mode === 'retire') {
				mutationErrorAction = 'Retire entity';
				mutationError = msg;
			} else {
				mutationError = msg;
			}
		}
	}

	async function onRestore(ent: CaseIntelligenceCommittedEntity): Promise<void> {
		if (!caseId || !token) return;
		mutationError = '';
		mutationErrorAction = '';
		try {
			await restoreCaseIntelligenceEntity(caseId, ent.id, token);
			await refresh();
		} catch (e) {
			mutationError = e instanceof Error ? e.message : 'Restore failed.';
		}
	}

	function attrsPreview(obj: Record<string, unknown>): string {
		try {
			const s = JSON.stringify(obj);
			return s.length > 120 ? `${s.slice(0, 117)}…` : s;
		} catch {
			return '—';
		}
	}

	function isOpenStaging(s: CaseIntelligenceStagingRecord): boolean {
		return s.status === 'draft' || s.status === 'pending';
	}

	/** P65-04a: operator-facing labels (T-02, T-03, T-04, T-09, T-10, T-11) — API values unchanged. */
	function listScopeLabel(scope: typeof listScope): string {
		return scope === 'include_retired' ? 'Including retired intel' : 'Active intel only';
	}

	function stagingLifecycleLabel(status: CaseIntelligenceStagingRecord['status']): string {
		switch (status) {
			case 'draft':
				return 'Draft';
			case 'pending':
				return 'Pending';
			case 'committed':
				return 'Promoted (staging closed)';
			case 'rejected':
				return 'Rejected (staging closed)';
			case 'withdrawn':
				return 'Withdrawn (staging closed)';
			default:
				return String(status);
		}
	}

	function stagingQueueBadgeLabel(row: CaseIntelligenceStagingRecord): string {
		return isOpenStaging(row) ? 'Open in staging queue' : 'Closed staging record';
	}

	function entityKindLabel(kind: CaseIntelligenceEntityKind): string {
		switch (kind) {
			case 'PERSON':
				return 'Person';
			case 'VEHICLE':
				return 'Vehicle';
			case 'LOCATION':
				return 'Location';
			default:
				return kind;
		}
	}

	function personPostureLabel(p: CaseIntelligencePersonPosture): string {
		switch (p) {
			case 'IDENTIFIED':
				return 'Identified';
			case 'UNKNOWN_PARTIAL':
				return 'Unknown (partial)';
			case 'UNKNOWN_PLACEHOLDER':
				return 'Unknown (placeholder)';
			default:
				return p;
		}
	}
</script>

<div
	id="case-intel-stage1-pilot-anchor"
	class="rounded-xl border border-dashed border-gray-300 dark:border-gray-600 bg-gray-50/70 dark:bg-gray-900/40 p-4 space-y-4"
	data-testid="case-intel-stage1-panel"
>
	<div class="flex flex-wrap items-start justify-between gap-2">
		<div>
			<h2 class="text-sm font-semibold text-gray-900 dark:text-gray-100">
				Stage 1 — staging &amp; promote (pilot)
			</h2>
			<p
				class="mt-1 text-[11px] text-gray-500 dark:text-gray-400 max-w-prose leading-relaxed"
				data-testid="case-intel-stage1-proposal-framing"
			>
				<strong class="font-medium text-amber-800 dark:text-amber-300">Propose / stage / suggest</strong> here — rows stay
				<strong>non-authoritative</strong> until <strong>promote</strong>. <strong>Register</strong> committed entities with each
				registry’s <strong>Add …</strong> above (not this panel).
			</p>
		</div>
		<button
			type="button"
			class="text-xs px-2 py-1 rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
			disabled={loading || !token}
			on:click={() => void refresh()}
			data-testid="case-intel-stage1-refresh"
		>
			{loading ? 'Loading…' : 'Refresh'}
		</button>
	</div>

	{#if loadError}
		<p class="text-xs text-red-600 dark:text-red-400" data-testid="case-intel-stage1-load-error">{loadError}</p>
	{/if}
	{#if mutationError}
		<div
			class="rounded-md border border-red-200 dark:border-red-900/60 bg-red-50/90 dark:bg-red-950/30 px-3 py-2 space-y-1"
			role="alert"
			data-testid="case-intel-stage1-mutation-error"
		>
			{#if mutationErrorAction}
				<p class="text-[10px] font-semibold uppercase tracking-wide text-red-800 dark:text-red-200">
					{mutationErrorAction}
				</p>
			{/if}
			<p class="text-xs text-red-700 dark:text-red-300">{mutationError}</p>
		</div>
	{/if}

	<!-- Authoritative committed -->
	<div
		class="rounded-lg border-l-4 border-emerald-600 pl-3 pr-2 py-3 space-y-2 bg-emerald-50/40 dark:bg-emerald-950/20"
		data-testid="case-intel-stage1-committed-section"
		data-case-intel-authority="authoritative_case_intel"
	>
		<div class="flex flex-wrap items-center gap-2">
			<h3 class="text-sm font-semibold text-emerald-900 dark:text-emerald-100">
				Committed mirror — retire / restore
			</h3>
			<span
				class="text-[10px] font-medium px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-200"
				title="Human-gated committed intel in Case Engine (P63-02)"
			>
				Authoritative · human-gated
			</span>
			<span class="text-[10px] text-gray-500 dark:text-gray-400">{listScopeLabel(listScope)}</span>
		</div>
		<p class="text-[11px] text-gray-600 dark:text-gray-400" data-testid="case-intel-stage1-committed-mirror-help">
			Same Case Engine data as the registries above — browse and open detail there. Use this list for <strong>Retire</strong> and
			<strong>Restore</strong> when you want those actions without leaving the pilot block.
		</p>
		<label class="flex items-center gap-2 text-[11px] text-gray-600 dark:text-gray-400 cursor-pointer">
			<input type="checkbox" checked={includeRetired} on:change={toggleIncludeRetired} />
			Include retired entities (needed for restore)
		</label>

		{#if loading && committedRows.length === 0 && !loadError}
			<p class="text-xs text-gray-500" data-testid="case-intel-stage1-committed-loading">Loading committed…</p>
		{:else if committedRows.length === 0}
			<p class="text-xs text-gray-500" data-testid="case-intel-stage1-committed-empty">No committed entities for this view.</p>
		{:else}
			<ul class="space-y-2" data-testid="case-intel-stage1-committed-list">
				{#each committedRows as ent (ent.id)}
					<li
						class="rounded border border-emerald-200/80 dark:border-emerald-900/50 p-2 text-xs space-y-1
							{ent.deleted_at ? 'opacity-70' : ''}"
						data-testid="case-intel-committed-{ent.id}"
					>
						<div class="flex flex-wrap items-center gap-2">
							<span class="font-medium text-gray-900 dark:text-gray-100">{ent.display_label}</span>
							<span class="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800"
								>{entityKindLabel(ent.entity_kind)}</span
							>
							{#if ent.person_identity_posture}
								<span class="text-[10px] text-gray-500"
									>{personPostureLabel(ent.person_identity_posture)}</span
								>
							{/if}
							{#if ent.deleted_at}
								<span class="text-[10px] text-amber-700 dark:text-amber-300 font-medium">Retired</span>
							{/if}
							<span class="text-[10px] text-gray-400 font-mono ml-auto">{ent.id}</span>
						</div>
						<p class="text-[10px] text-gray-500 dark:text-gray-400 break-all">
							{attrsPreview(ent.core_attributes)}
						</p>
						<div class="flex flex-wrap gap-2 pt-1">
							{#if !ent.deleted_at}
								<button
									type="button"
									class="text-[11px] px-2 py-0.5 rounded border border-red-300 dark:border-red-800 text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/30"
									disabled={loading}
									on:click={() => openRetireConfirmation(ent)}
									data-testid="case-intel-retire-{ent.id}"
								>
									Retire
								</button>
							{:else}
								<button
									type="button"
									class="text-[11px] px-2 py-0.5 rounded border border-emerald-600 text-emerald-800 dark:text-emerald-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
									disabled={loading}
									on:click={() => void onRestore(ent)}
									data-testid="case-intel-restore-{ent.id}"
								>
									Restore
								</button>
							{/if}
						</div>
					</li>
				{/each}
			</ul>
		{/if}
	</div>

	<!-- Staging -->
	<div
		class="rounded-lg border-l-4 border-amber-500 pl-3 pr-2 py-3 space-y-3 bg-amber-50/50 dark:bg-amber-950/15"
		data-testid="case-intel-stage1-staging-section"
		data-case-intel-authority="non_authoritative"
	>
		<div class="flex flex-wrap items-center gap-2">
			<h3 class="text-sm font-semibold text-amber-900 dark:text-amber-100">
				Proposed intel — staging (not authoritative)
			</h3>
			<span
				class="text-[10px] font-medium px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/40 text-amber-900 dark:text-amber-100"
				title="Staging is not authoritative case intelligence until commit (P63-02)"
			>
				Not authoritative · staging only
			</span>
		</div>
		<p class="text-[11px] text-amber-950/80 dark:text-amber-200/90">
			Rows here are <strong>staging only</strong> — not the committed registry. <strong>Draft</strong> while editing;
			<strong>Pending</strong> when ready to <strong>promote</strong> or <strong>reject</strong>. Nothing becomes authoritative
			until promotion (Case Engine).
		</p>

		<div class="rounded border border-amber-200/80 dark:border-amber-900/50 p-2 space-y-2 bg-white/60 dark:bg-gray-900/40">
			<div>
				<p class="text-[11px] font-medium text-gray-800 dark:text-gray-200">Propose entity (staging)</p>
				<p class="text-[10px] text-amber-950/70 dark:text-amber-200/80 mt-0.5">
					Adds a <strong>non-authoritative</strong> staging row — not the same as registry <strong>Add …</strong> (committed
					register).
				</p>
			</div>
			<div class="flex flex-wrap gap-2 items-end">
				<div>
					<label class="block text-[10px] text-gray-500 mb-0.5">Kind</label>
					<select
						class="text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900"
						bind:value={createKind}
					>
						{#each KINDS as k}
							<option value={k}>{entityKindLabel(k)}</option>
						{/each}
					</select>
				</div>
				{#if createKind === 'PERSON'}
					<div>
						<label class="block text-[10px] text-gray-500 mb-0.5">Person posture</label>
						<select
							class="text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900"
							bind:value={createPosture}
						>
							{#each POSTURES as p}
								<option value={p}>{personPostureLabel(p)}</option>
							{/each}
						</select>
					</div>
				{/if}
				<div>
					<label class="block text-[10px] text-gray-500 mb-0.5">Initial status</label>
					<select
						class="text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900"
						bind:value={createStatus}
					>
						<option value="draft">Draft (work in progress)</option>
						<option value="pending">Pending (ready to commit or reject)</option>
					</select>
				</div>
				<div class="flex-1 min-w-[160px]">
					<label class="block text-[10px] text-gray-500 mb-0.5">Display label</label>
					<input
						type="text"
						class="w-full text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-2 py-1"
						bind:value={createLabel}
						placeholder="e.g. Silver sedan / 123 Oak St"
						data-testid="case-intel-create-label"
					/>
				</div>
			</div>
			<div>
				<label class="block text-[10px] text-gray-500 mb-0.5">Core attributes (JSON object)</label>
				<textarea
					class="w-full text-xs font-mono rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-2 py-1"
					rows="2"
					bind:value={createAttrsJson}
					data-testid="case-intel-create-attrs"
				></textarea>
			</div>
			<button
				type="button"
				class="text-xs px-2 py-1 rounded bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50"
				disabled={creating || loading || !token}
				on:click={() => void onCreate()}
				data-testid="case-intel-create-submit"
			>
				{creating ? 'Proposing…' : 'Propose in staging'}
			</button>
		</div>

		{#if loading && stagingRows.length === 0 && !loadError}
			<p class="text-xs text-gray-500" data-testid="case-intel-stage1-staging-loading">Loading staging…</p>
		{:else if stagingRows.length === 0}
			<p class="text-xs text-gray-500" data-testid="case-intel-stage1-staging-empty">No staging rows.</p>
		{:else}
			<ul class="space-y-3" data-testid="case-intel-stage1-staging-list">
				{#each stagingRows as row (row.id)}
					<li
						class="rounded border border-amber-200 dark:border-amber-900/50 p-2 text-xs space-y-2 bg-white/50 dark:bg-gray-900/30"
						data-testid="case-intel-staging-{row.id}"
						data-staging-status={row.status}
					>
						<div class="flex flex-wrap items-center gap-2">
							<span class="text-[10px] font-mono text-gray-500">{row.id}</span>
							<span class="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800"
								>{stagingLifecycleLabel(row.status)}</span
							>
							<span class="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/30"
								>{stagingQueueBadgeLabel(row)}</span
							>
						</div>
						{#if isOpenStaging(row)}
							<div class="grid gap-2 sm:grid-cols-2">
								<div>
									<label class="block text-[10px] text-gray-500">Kind</label>
									<select
										class="w-full text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900"
										bind:value={editKind[row.id]}
									>
										{#each KINDS as k}
											<option value={k}>{entityKindLabel(k)}</option>
										{/each}
									</select>
								</div>
								<div>
									<label class="block text-[10px] text-gray-500">Status</label>
									<select
										class="w-full text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900"
										bind:value={editStatus[row.id]}
									>
										<option value="draft">Draft (work in progress)</option>
										<option value="pending">Pending (ready to commit or reject)</option>
									</select>
								</div>
							</div>
							{#if editKind[row.id] === 'PERSON'}
								<div>
									<label class="block text-[10px] text-gray-500">Person posture</label>
									<select
										class="w-full text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900"
										bind:value={editPosture[row.id]}
									>
										{#each POSTURES as p}
											<option value={p}>{personPostureLabel(p)}</option>
										{/each}
									</select>
								</div>
							{/if}
							<div>
								<label class="block text-[10px] text-gray-500">Display label</label>
								<input
									type="text"
									class="w-full text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-2 py-1"
									bind:value={editLabel[row.id]}
								/>
							</div>
							<div>
								<label class="block text-[10px] text-gray-500">Core attributes (JSON)</label>
								<textarea
									class="w-full text-xs font-mono rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-2 py-1"
									rows="2"
									bind:value={editAttrsJson[row.id]}
								></textarea>
							</div>
							<p class="text-[10px] text-gray-600 dark:text-gray-400">
								<strong>Reject</strong> closes this staging row <strong>without</strong> creating authoritative intel. The
								row stays in the list as closed (not deleted).
							</p>
							<div class="flex flex-wrap gap-2">
								<button
									type="button"
									class="text-[11px] px-2 py-0.5 rounded border border-gray-400 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800"
									disabled={loading}
									on:click={() => void onSaveStaging(row)}
									data-testid="case-intel-staging-save-{row.id}"
								>
									Save edits
								</button>
								<button
									type="button"
									class="text-[11px] px-2 py-0.5 rounded bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
									disabled={loading}
									on:click={() => openCommitConfirmation(row)}
									data-testid="case-intel-staging-commit-{row.id}"
								>
									Promote to committed
								</button>
								<button
									type="button"
									class="text-[11px] px-2 py-0.5 rounded border border-red-400 text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/20"
									disabled={loading}
									on:click={() => openRejectConfirmation(row)}
									data-testid="case-intel-staging-reject-{row.id}"
								>
									Reject staging
								</button>
							</div>
						{:else}
							<div class="text-gray-700 dark:text-gray-300">
								<span class="font-medium">{row.proposed_display_label}</span>
								<span class="text-gray-500"> · {entityKindLabel(row.entity_kind)}</span>
								{#if row.result_entity_id}
									<p class="text-[10px] text-gray-500 mt-0.5">
										Authoritative entity ID (after promote): <span class="font-mono">{row.result_entity_id}</span>
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

<!-- P65-04b / F-03: confirm before commit, reject, or retire (shared ConfirmDialog pattern). -->
<div data-testid="case-intel-stage1-mutation-confirm">
	<ConfirmDialog
		bind:show={mutationConfirmShow}
		title={mutationConfirmTitle}
		message={mutationConfirmMessage}
		cancelLabel="Cancel"
		confirmLabel={mutationConfirmButtonLabel}
		on:cancel={handleMutationConfirmCancel}
		onConfirm={executeConfirmedMutation}
	/>
</div>
