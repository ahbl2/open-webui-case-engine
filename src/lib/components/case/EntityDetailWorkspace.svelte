<script lang="ts">
	/**
	 * P69-09 — Entity detail workspace inside focus mode (P69-06): header, Overview cards, deep tabs, dirty hook.
	 */
	import {
		listCaseIntelligenceAssociationsForEntity,
		listCaseIntelligenceAssociationStaging,
		retireCaseIntelligenceEntity,
		restoreCaseIntelligenceEntity,
		type CaseIntelligenceCommittedAssociationProjection,
		type CaseIntelligenceAssociationStagingRecord,
		type CaseIntelligenceCommittedEntity,
		type CaseIntelligenceEntityKind
	} from '$lib/apis/caseEngine';
	import CaseEmptyState from '$lib/components/case/CaseEmptyState.svelte';
	import CaseErrorState from '$lib/components/case/CaseErrorState.svelte';
	import CaseLoadingState from '$lib/components/case/CaseLoadingState.svelte';
	import {
		associationKindLabel,
		assertionLaneLabel,
		coreAttributesEntries
	} from '$lib/utils/caseIntelligenceEntityDetailDisplay';
	import {
		buildRegistrySecondaryLine,
		entityPortraitUrl,
		initialsFromDisplayLabel,
		personPostureShort
	} from '$lib/utils/caseIntelligenceEntityRegistry';
	import { toast } from 'svelte-sonner';

	export let caseId: string;
	export let token: string;
	export let entity: CaseIntelligenceCommittedEntity | null;
	export let detailLoading = false;
	export let detailError = '';
	export let readScope: 'active_only' | 'include_retired' | null = null;
	export let onRetryDetail: () => void;
	/** P69-05 / P69-06 — workspace publishes aggregate dirty for shell gates. */
	export let onDetailDirtyChange: ((dirty: boolean) => void) | undefined = undefined;
	/** Opens Phase 68 association composer (modal) for this entity. */
	export let onOpenAssociationComposer: ((entity: CaseIntelligenceCommittedEntity) => void) | undefined =
		undefined;
	/** After retire/restore, parent should reload entity GET. */
	export let onEntityNeedsRefresh: (() => void) | undefined = undefined;

	/** Focus shell calls this when user chooses Discard at dirty gate. */
	export function discardUnsavedWorkspaceDraft(): void {
		notesDraft = '';
		onDetailDirtyChange?.(false);
	}

	export type EntityDetailPrimaryTab =
		| 'overview'
		| 'associations'
		| 'timeline'
		| 'notes'
		| 'history'
		| 'files';

	const PRIMARY_TABS: Array<{ id: EntityDetailPrimaryTab; label: string }> = [
		{ id: 'overview', label: 'Overview' },
		{ id: 'associations', label: 'Associations' },
		{ id: 'timeline', label: 'Timeline' },
		{ id: 'notes', label: 'Notes' },
		{ id: 'history', label: 'History' },
		{ id: 'files', label: 'Files' }
	];

	const ASSOC_SUMMARY_CAP = 5;

	let primaryTab: EntityDetailPrimaryTab = 'overview';
	let prevBoundEntityId = '';

	let assocCommitted: CaseIntelligenceCommittedAssociationProjection[] = [];
	let assocStaging: CaseIntelligenceAssociationStagingRecord[] = [];
	let assocLoading = false;
	let assocError = '';
	let assocLoadSeq = 0;

	let actionsOpen = false;
	let portraitFailed = false;

	let notesDraft = '';
	let showRetireConfirm = false;
	let retireBusy = false;

	$: summaryLine = entity ? buildRegistrySecondaryLine(entity.entity_kind, entity) : null;
	$: attrRows = entity ? coreAttributesEntries(entity.core_attributes ?? {}) : [];
	$: portraitUrl =
		entity && entity.entity_kind === 'PERSON'
			? entityPortraitUrl(entity.core_attributes ?? {})
			: null;
	$: metaMiddot =
		entity ? [personPostureShort(entity.person_identity_posture), summaryLine].filter(Boolean).join(' · ') : '';

	$: workspaceDirty = notesDraft.trim().length > 0;
	$: onDetailDirtyChange?.(workspaceDirty);

	$: if (entity?.id !== prevBoundEntityId) {
		prevBoundEntityId = entity?.id ?? '';
		primaryTab = 'overview';
		notesDraft = '';
		portraitFailed = false;
		assocCommitted = [];
		assocStaging = [];
		assocError = '';
		if (entity?.id) void loadAssociationsFor(entity.id);
		else assocLoading = false;
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

	function entityChipClass(kind: CaseIntelligenceEntityKind): string {
		switch (kind) {
			case 'PERSON':
				return 'bg-sky-950/55 text-sky-100 border-sky-500/35 shadow-sm shadow-sky-950/20';
			case 'VEHICLE':
				return 'bg-cyan-950/60 text-cyan-100 border-cyan-500/35 shadow-sm shadow-cyan-950/25';
			case 'LOCATION':
				return 'bg-amber-950/55 text-amber-100 border-amber-500/35 shadow-sm shadow-amber-950/20';
			default:
				return 'bg-slate-800 text-slate-200 border-slate-600';
		}
	}

	function setTab(tab: EntityDetailPrimaryTab): void {
		primaryTab = tab;
		actionsOpen = false;
	}

	function otherEndpointId(row: CaseIntelligenceCommittedAssociationProjection, anchor: string): string {
		return row.endpoint_a_entity_id === anchor ? row.endpoint_b_entity_id : row.endpoint_a_entity_id;
	}

	function isStagingOpen(s: CaseIntelligenceAssociationStagingRecord): boolean {
		return s.status === 'draft' || s.status === 'pending';
	}

	async function loadAssociationsFor(entityId: string): Promise<void> {
		assocLoadSeq += 1;
		const seq = assocLoadSeq;
		if (!caseId || !token || !entityId) return;
		assocLoading = true;
		assocError = '';
		try {
			const [adjacency, stagingAll] = await Promise.all([
				listCaseIntelligenceAssociationsForEntity(caseId, entityId, token, { includeRetired: true }),
				listCaseIntelligenceAssociationStaging(caseId, token, { status: 'draft,pending' })
			]);
			if (seq !== assocLoadSeq) return;
			assocCommitted = adjacency.committed_associations;
			const aid = adjacency.anchor_entity_id;
			assocStaging = stagingAll.filter(
				(r) =>
					isStagingOpen(r) && (r.endpoint_a_entity_id === aid || r.endpoint_b_entity_id === aid)
			);
		} catch (e) {
			if (seq !== assocLoadSeq) return;
			assocError = e instanceof Error ? e.message : 'Could not load associations.';
			assocCommitted = [];
			assocStaging = [];
		} finally {
			if (seq === assocLoadSeq) assocLoading = false;
		}
	}

	function retryAssoc(): void {
		if (entity?.id) void loadAssociationsFor(entity.id);
	}

	async function copyEntityId(): Promise<void> {
		if (!entity?.id || !navigator.clipboard) {
			toast.error('Copy not available.');
			return;
		}
		try {
			await navigator.clipboard.writeText(entity.id);
			toast.success('Entity id copied.');
		} catch {
			toast.error('Could not copy.');
		}
	}

	function proposalsHref(): string {
		return `/case/${caseId}/proposals`;
	}
	function notesHref(): string {
		return `/case/${caseId}/notes`;
	}
	function filesHref(): string {
		return `/case/${caseId}/files`;
	}
	function timelineCaseHref(): string {
		return `/case/${caseId}/timeline`;
	}

	async function confirmRetire(): Promise<void> {
		if (!entity || retireBusy) return;
		retireBusy = true;
		try {
			await retireCaseIntelligenceEntity(caseId, entity.id, token);
			toast.success('Entity retired.');
			showRetireConfirm = false;
			onEntityNeedsRefresh?.();
		} catch (e) {
			toast.error(e instanceof Error ? e.message : 'Retire failed.');
		} finally {
			retireBusy = false;
		}
	}

	async function runRestore(): Promise<void> {
		if (!entity) return;
		try {
			await restoreCaseIntelligenceEntity(caseId, entity.id, token);
			toast.success('Entity restored.');
			onEntityNeedsRefresh?.();
		} catch (e) {
			toast.error(e instanceof Error ? e.message : 'Restore failed.');
		}
	}

	$: assocPreview = assocCommitted.slice(0, ASSOC_SUMMARY_CAP);
</script>

<div class="entity-detail-workspace flex flex-col min-h-0 h-full" data-testid="entity-detail-workspace">
	{#if detailLoading && !entity}
		<div
			class="shrink-0 border-b border-slate-700/70 px-4 py-4 space-y-3"
			data-testid="entity-detail-header-skeleton"
			aria-busy="true"
		>
			<div class="h-6 w-2/3 rounded bg-slate-800 animate-pulse"></div>
			<div class="h-4 w-24 rounded bg-slate-800 animate-pulse"></div>
			<div class="h-3 w-full rounded bg-slate-800/80 animate-pulse"></div>
		</div>
	{:else if detailError}
		<div class="shrink-0 px-4 py-4 border-b border-slate-700/60" data-testid="entity-detail-header-error">
			<CaseErrorState title="Could not load entity" message={detailError} onRetry={onRetryDetail} />
		</div>
	{:else if entity}
		<header
			class="shrink-0 border-b border-slate-700/50 px-5 py-5 space-y-4 bg-gradient-to-r from-slate-950/98 via-slate-900/85 to-slate-950/98 shadow-[inset_0_-1px_0_0_rgba(255,255,255,0.04)]"
			data-testid="entity-detail-header"
		>
			{#if entity.deleted_at}
				<div
					class="rounded-lg border border-amber-800/60 bg-amber-950/35 px-3 py-2 text-xs text-amber-100"
					data-testid="entity-detail-retired-banner"
					role="status"
				>
					<strong>Retired</strong> — not in the active registry view. Restore from the Status card if permitted.
				</div>
			{/if}

			<div class="flex flex-wrap items-start gap-3 justify-between">
				<div class="flex gap-3 min-w-0 flex-1">
					{#if entity.entity_kind === 'PERSON'}
						{#if portraitUrl && !portraitFailed}
							<img
								src={portraitUrl}
								alt=""
								class="h-14 w-14 rounded-full object-cover border border-slate-500/60 ring-2 ring-sky-400/15 shadow-lg shrink-0"
								loading="lazy"
								on:error={() => (portraitFailed = true)}
							/>
						{:else}
							<span
								class="h-14 w-14 rounded-full flex items-center justify-center text-sm font-bold border border-slate-500/50 bg-gradient-to-br from-slate-700 to-slate-900 text-slate-50 ring-1 ring-sky-400/20 shrink-0"
								aria-hidden="true"
							>
								{initialsFromDisplayLabel(entity.display_label)}
							</span>
						{/if}
					{:else if entity.entity_kind === 'VEHICLE'}
						<span
							class="h-14 w-14 rounded-2xl flex items-center justify-center text-xl font-bold border border-cyan-500/35 bg-gradient-to-br from-cyan-950/80 to-slate-950 text-cyan-100 shadow-inner shadow-black/30 ring-1 ring-cyan-400/25 shrink-0"
							aria-hidden="true"
						>V</span>
					{:else}
						<span
							class="h-14 w-14 rounded-2xl flex items-center justify-center text-xl font-bold border border-amber-500/35 bg-gradient-to-br from-amber-950/80 to-slate-950 text-amber-100 shadow-inner shadow-black/30 ring-1 ring-amber-400/22 shrink-0"
							aria-hidden="true"
						>L</span>
					{/if}
					<div class="min-w-0">
						<div class="flex flex-wrap items-center gap-2">
							<h2
								class="text-xl md:text-2xl font-bold text-slate-50 leading-tight tracking-tight break-words"
								data-testid="entity-detail-hero-label"
							>
								{entity.display_label}
							</h2>
							<span
								class="text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0 {entityChipClass(
									entity.entity_kind
								)}"
								data-testid="entity-detail-kind-chip"
							>
								{kindLabel(entity.entity_kind)}
							</span>
						</div>
						{#if metaMiddot}
							<p class="mt-1 text-xs text-slate-400 leading-snug" data-testid="entity-detail-metadata-row">
								{metaMiddot}
							</p>
						{/if}
						{#if readScope}
							<p class="mt-1 text-[10px] text-slate-500">List scope: {readScope.replace(/_/g, ' ')}</p>
						{/if}
					</div>
				</div>

				<div class="relative shrink-0">
					<details bind:open={actionsOpen} class="group" data-testid="entity-detail-actions-menu">
						<summary
							class="list-none cursor-pointer rounded-lg border border-slate-600 bg-slate-900/80 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/80"
						>
							Actions
						</summary>
						<div
							class="absolute right-0 mt-1 w-56 rounded-lg border border-slate-600 bg-slate-950 shadow-xl py-1 z-20"
						>
							<button
								type="button"
								class="w-full text-left px-3 py-2 text-xs text-slate-400 cursor-not-allowed"
								disabled
								title="Case Engine does not expose entity PATCH in this UI build."
								data-testid="entity-detail-action-edit-disabled"
							>
								Edit entity…
							</button>
							<button
								type="button"
								class="w-full text-left px-3 py-2 text-xs text-slate-200 hover:bg-slate-800"
								data-testid="entity-detail-action-propose-association"
								on:click={() => {
									actionsOpen = false;
									onOpenAssociationComposer?.(entity);
								}}
							>
								Propose association…
							</button>
						</div>
					</details>
				</div>
			</div>

			<div class="flex flex-wrap gap-2" data-testid="entity-detail-quick-pills">
				<button
					type="button"
					class="text-[11px] px-2.5 py-1 rounded-full border border-slate-600 bg-slate-900/60 text-slate-200 hover:border-cyan-700/50"
					data-testid="entity-detail-pill-timeline"
					on:click={() => setTab('timeline')}
				>
					Timeline
				</button>
				<button
					type="button"
					class="text-[11px] px-2.5 py-1 rounded-full border border-slate-600 bg-slate-900/60 text-slate-200 hover:border-cyan-700/50"
					data-testid="entity-detail-pill-files"
					on:click={() => setTab('files')}
				>
					Files
				</button>
				<button
					type="button"
					class="text-[11px] px-2.5 py-1 rounded-full border border-slate-600 bg-slate-900/60 text-slate-200 hover:border-cyan-700/50"
					data-testid="entity-detail-pill-notes"
					on:click={() => setTab('notes')}
				>
					Notes
				</button>
				<a
					class="text-[11px] px-2.5 py-1 rounded-full border border-violet-800/50 bg-violet-950/30 text-violet-100 hover:border-violet-600/50"
					data-testid="entity-detail-pill-proposals"
					href={proposalsHref()}
				>
					Proposals (P19)
				</a>
			</div>

			<div class="flex flex-wrap items-center gap-2 text-[11px]">
				<span class="text-slate-500 font-mono truncate max-w-[min(100%,28rem)]" title={entity.id}>{entity.id}</span>
				<button
					type="button"
					class="text-cyan-400 hover:underline font-medium"
					data-testid="entity-detail-copy-id"
					on:click={() => void copyEntityId()}
				>
					Copy id
				</button>
			</div>
		</header>
	{/if}

	{#if entity}
		<div
			class="shrink-0 flex gap-1 px-3 pt-3 pb-0 border-b border-slate-800/80 sticky top-0 z-10 bg-slate-950/98 backdrop-blur-md overflow-x-auto shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]"
			data-testid="entity-detail-primary-tabstrip"
			role="tablist"
			aria-label="Entity primary tabs"
		>
			{#each PRIMARY_TABS as tab (tab.id)}
				<button
					type="button"
					role="tab"
					aria-selected={primaryTab === tab.id ? 'true' : 'false'}
					class="shrink-0 px-3.5 py-2.5 text-xs font-bold tracking-wide border-b-[3px] rounded-t-lg transition-colors {primaryTab === tab.id
						? 'border-cyan-400 text-cyan-50 bg-slate-900/80 shadow-[inset_0_1px_0_0_rgba(34,211,238,0.12)]'
						: 'border-transparent text-slate-500 hover:text-slate-200 hover:bg-slate-900/40'}"
					data-testid="entity-detail-tab-{tab.id}"
					on:click={() => setTab(tab.id)}
				>
					{tab.label}
				</button>
			{/each}
		</div>

		<div class="flex-1 min-h-0 overflow-y-auto px-4 py-5 bg-gradient-to-b from-slate-950/40 to-transparent" data-testid="entity-detail-panel-body">
			{#if primaryTab === 'overview'}
				<div
					class="grid grid-cols-1 xl:grid-cols-2 gap-4"
					data-testid="entity-detail-overview-grid"
				>
					<!-- Details card -->
					<section
						class="rounded-2xl border border-slate-600/45 bg-gradient-to-b from-slate-900/75 to-slate-950/92 p-5 shadow-[0_10px_36px_-14px_rgba(0,0,0,0.5)] ring-1 ring-white/[0.05]"
						data-testid="entity-detail-card-details"
					>
						<h3 class="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400/95">Details</h3>
						<p class="mt-1 text-[11px] text-slate-500">
							Read-only committed attributes. Edit when Case Engine exposes governed patch (P69-10).
						</p>
						{#if attrRows.length === 0}
							<p class="mt-3 text-sm text-slate-400">No extended attributes recorded.</p>
						{:else}
							<dl class="mt-3 grid gap-2 sm:grid-cols-2">
								{#each attrRows as row (row.key)}
									<div class="rounded-lg border border-slate-700/60 p-2 min-w-0">
										<dt class="text-[10px] font-medium text-slate-500">{row.label}</dt>
										<dd class="text-xs text-slate-100 break-words mt-0.5">{row.value}</dd>
									</div>
								{/each}
							</dl>
						{/if}
					</section>

					<!-- Status card (single owner for retire/restore per P69-06 §3.2) -->
					<section
						class="rounded-2xl border border-slate-600/45 bg-gradient-to-b from-slate-900/75 to-slate-950/92 p-5 shadow-[0_10px_36px_-14px_rgba(0,0,0,0.5)] ring-1 ring-white/[0.05]"
						data-testid="entity-detail-card-status"
					>
						<h3 class="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400/95">Status</h3>
						<dl class="mt-3 space-y-2 text-xs text-slate-300">
							<div class="flex flex-wrap gap-x-2">
								<dt class="text-slate-500">State</dt>
								<dd data-testid="entity-detail-status-active">{entity.deleted_at ? 'Retired' : 'Active'}</dd>
							</div>
							<div class="flex flex-wrap gap-x-2">
								<dt class="text-slate-500">Created</dt>
								<dd>{entity.created_at}</dd>
							</div>
							{#if entity.updated_at}
								<div class="flex flex-wrap gap-x-2">
									<dt class="text-slate-500">Updated</dt>
									<dd>{entity.updated_at}</dd>
								</div>
							{/if}
							{#if entity.deleted_at}
								<div class="flex flex-wrap gap-x-2">
									<dt class="text-slate-500">Retired at</dt>
									<dd>{entity.deleted_at}</dd>
								</div>
							{/if}
						</dl>
						<div class="mt-4 flex flex-wrap gap-2">
							{#if !entity.deleted_at}
								<button
									type="button"
									class="text-xs px-3 py-1.5 rounded-md border border-amber-700/60 text-amber-100 hover:bg-amber-950/40"
									data-testid="entity-detail-retire-open"
									on:click={() => (showRetireConfirm = true)}
								>
									Retire entity…
								</button>
							{:else}
								<button
									type="button"
									class="text-xs px-3 py-1.5 rounded-md border border-emerald-700/50 text-emerald-100 hover:bg-emerald-950/30"
									data-testid="entity-detail-restore"
									on:click={() => void runRestore()}
								>
									Restore entity…
								</button>
							{/if}
						</div>
					</section>

					<!-- Associations summary -->
					<section
						class="rounded-2xl border border-slate-600/45 bg-gradient-to-b from-slate-900/75 to-slate-950/92 p-5 shadow-[0_10px_36px_-14px_rgba(0,0,0,0.5)] ring-1 ring-white/[0.05] xl:col-span-2"
						data-testid="entity-detail-card-associations-summary"
					>
						<div class="flex flex-wrap items-center justify-between gap-2">
							<h3 class="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400/95">Associations</h3>
							<button
								type="button"
								class="text-[11px] font-medium text-cyan-400 hover:underline"
								data-testid="entity-detail-assoc-view-all"
								on:click={() => setTab('associations')}
							>
								View all
							</button>
						</div>
						{#if assocLoading}
							<CaseLoadingState label="Loading associations…" testId="entity-detail-assoc-summary-loading" />
						{:else if assocError}
							<div class="mt-2" data-testid="entity-detail-assoc-summary-error">
								<CaseErrorState title="Associations unavailable" message={assocError} onRetry={retryAssoc} />
							</div>
						{:else if assocCommitted.length === 0}
							<p class="mt-2 text-sm text-slate-400">
								No committed associations yet.
								<button
									type="button"
									class="text-cyan-400 font-medium hover:underline ml-1"
									data-testid="entity-detail-assoc-propose-inline"
									on:click={() => onOpenAssociationComposer?.(entity)}
								>
									Propose association
								</button>
							</p>
						{:else}
							<ul class="mt-2 space-y-2" data-testid="entity-detail-assoc-summary-list">
								{#each assocPreview as row (row.id)}
									<li class="text-xs text-slate-300 border border-slate-700/50 rounded-lg px-2 py-1.5">
										<span class="font-medium text-slate-200"
											>{associationKindLabel(row.association_kind)}</span
										>
										<span class="text-slate-500"> · </span>
										<span class="font-mono text-[10px]">{otherEndpointId(row, entity.id)}</span>
										<span class="text-slate-500"> · {assertionLaneLabel(row.assertion_lane)}</span>
									</li>
								{/each}
							</ul>
						{/if}
					</section>

					<!-- Recent timeline (deferred) -->
					<section
						class="rounded-xl border border-dashed border-slate-600 bg-slate-950/30 p-4"
						data-testid="entity-detail-card-timeline"
					>
						<h3 class="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400/95">Recent timeline</h3>
						<p class="mt-2 text-sm text-slate-400 leading-relaxed">
							Timeline linkage for this entity is not available in this build (Case Engine join pending — P69-10).
						</p>
						<button
							type="button"
							class="mt-2 text-xs font-medium text-cyan-400 hover:underline"
							data-testid="entity-detail-card-timeline-open-tab"
							on:click={() => setTab('timeline')}
						>
							Open Timeline tab
						</button>
					</section>

					<!-- Files card -->
					<section
						class="rounded-2xl border border-slate-600/45 bg-gradient-to-b from-slate-900/75 to-slate-950/92 p-5 shadow-[0_10px_36px_-14px_rgba(0,0,0,0.5)] ring-1 ring-white/[0.05]"
						data-testid="entity-detail-card-files"
					>
						<h3 class="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400/95">Files</h3>
						<p class="mt-2 text-sm text-slate-400">
							No entity-scoped file index from Case Engine in this build. Open the case Files tab for uploads and
							attachments.
						</p>
						<div class="mt-2 flex flex-wrap gap-2">
							<button
								type="button"
								class="text-xs font-medium text-cyan-400 hover:underline"
								data-testid="entity-detail-card-files-deep-tab"
								on:click={() => setTab('files')}
							>
								Files tab
							</button>
							<a class="text-xs font-medium text-cyan-400 hover:underline" href={filesHref()}>Case Files</a>
						</div>
					</section>

					<!-- Notes card -->
					<section
						class="rounded-2xl border border-slate-600/45 bg-gradient-to-b from-slate-900/75 to-slate-950/92 p-5 shadow-[0_10px_36px_-14px_rgba(0,0,0,0.5)] ring-1 ring-white/[0.05]"
						data-testid="entity-detail-card-notes"
					>
						<h3 class="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400/95">Notes</h3>
						<p class="mt-2 text-sm text-slate-400">
							Notebook notes are case-scoped in this build. Use the Notes tab to add working drafts — they are not
							the official timeline.
						</p>
						<a
							class="mt-2 inline-block text-xs font-medium text-cyan-400 hover:underline"
							data-testid="entity-detail-card-notes-link"
							href={notesHref()}
						>
							Open case Notes
						</a>
					</section>

					<!-- AI Assist (non-authoritative) -->
					<section
						class="rounded-xl border border-dashed border-amber-800/50 bg-amber-950/15 p-4 xl:col-span-2"
						data-testid="entity-detail-card-ai-assist"
					>
						<h3 class="text-[11px] font-bold uppercase tracking-[0.14em] text-amber-200/95">AI assist</h3>
						<p class="mt-2 text-sm text-amber-100/80 leading-relaxed">
							Non-authoritative analysis in entity context is deferred — no silent writes; Ask integrity rules apply
							when wired (P69-10 / Phase 33).
						</p>
					</section>
				</div>
			{:else if primaryTab === 'associations'}
				<div class="space-y-4" data-testid="entity-detail-deep-associations">
					<div class="flex flex-wrap items-center justify-between gap-2">
						<h3 class="text-sm font-semibold text-slate-200">Committed associations</h3>
						<button
							type="button"
							class="text-xs font-medium text-cyan-400 hover:underline"
							data-testid="entity-detail-deep-assoc-propose"
							on:click={() => onOpenAssociationComposer?.(entity)}
						>
							Propose association…
						</button>
					</div>
					{#if assocLoading}
						<CaseLoadingState label="Loading…" testId="entity-detail-deep-assoc-loading" />
					{:else if assocError}
						<CaseErrorState title="Could not load associations" message={assocError} onRetry={retryAssoc} />
					{:else if assocCommitted.length === 0}
						<CaseEmptyState
							title="No committed associations for this entity."
							description="Stage a proposal and commit from Stage 2 when ready."
							testId="entity-detail-deep-assoc-empty-committed"
						/>
					{:else}
						<ul class="space-y-2" data-testid="entity-detail-deep-assoc-committed-list">
							{#each assocCommitted as row (row.id)}
								<li
									class="rounded-lg border border-slate-700/60 bg-slate-900/50 px-3 py-2 text-xs text-slate-300"
								>
									<div class="font-medium text-slate-100">{associationKindLabel(row.association_kind)}</div>
									<div class="font-mono text-[10px] text-slate-500 mt-1">
										Other endpoint: {otherEndpointId(row, entity.id)}
									</div>
									<div class="text-slate-500 mt-0.5">{assertionLaneLabel(row.assertion_lane)}</div>
								</li>
							{/each}
						</ul>
					{/if}

					<h3 class="text-sm font-semibold text-slate-200 pt-2 border-t border-slate-800">Staging (draft / pending)</h3>
					{#if assocLoading}
						<p class="text-xs text-slate-500">…</p>
					{:else if assocStaging.length === 0}
						<p class="text-sm text-slate-400" data-testid="entity-detail-deep-assoc-staging-empty">
							No open staging rows referencing this entity. Use Propose association or Stage 2 queue on the board.
						</p>
					{:else}
						<ul class="space-y-2" data-testid="entity-detail-deep-assoc-staging-list">
							{#each assocStaging as row (row.id)}
								<li
									class="rounded-lg border border-violet-800/40 bg-violet-950/20 px-3 py-2 text-xs text-slate-300"
								>
									<div class="font-medium text-slate-100">{associationKindLabel(row.association_kind)}</div>
									<div class="text-slate-500">{row.status}</div>
								</li>
							{/each}
						</ul>
					{/if}
				</div>
			{:else if primaryTab === 'timeline'}
				<div
					class="rounded-xl border border-dashed border-slate-600 bg-slate-950/30 p-6"
					data-testid="entity-detail-deep-timeline"
				>
					<h3 class="text-sm font-semibold text-slate-200">Timeline</h3>
					<p class="mt-2 text-sm text-slate-400 leading-relaxed">
						Official timeline entries are not correlated to this entity in this UI build (P69-10). Review the case
						timeline for committed events.
					</p>
					<a
						class="mt-3 inline-block text-sm font-medium text-cyan-400 hover:underline"
						href={timelineCaseHref()}
						data-testid="entity-detail-deep-timeline-case-link"
					>
						Open case Timeline
					</a>
				</div>
			{:else if primaryTab === 'notes'}
				<div class="space-y-4" data-testid="entity-detail-deep-notes">
					<p class="text-sm text-slate-400">
						<strong class="text-slate-200">Notebook</strong> — drafts are not automatic timeline records. Open the case
						Notes tab to create or edit persisted notes.
					</p>
					<a
						class="inline-block text-sm font-medium text-cyan-400 hover:underline"
						href={notesHref()}
						data-testid="entity-detail-deep-notes-route"
					>
						Go to Notes tab (case)
					</a>
					<div class="rounded-xl border border-slate-700/60 bg-slate-900/40 p-4">
						<label for="entity-detail-notes-draft" class="text-xs font-semibold text-slate-300">
							Workspace draft (local only)
						</label>
						<p class="mt-1 text-[11px] text-slate-500 leading-relaxed">
							This text stays in your browser session until you clear it. It does not write to Case Engine — future
							entity-scoped notes may replace this (P69-10). Leaving text here flags the workspace as dirty for switch
							/ back guards.
						</p>
						<textarea
							id="entity-detail-notes-draft"
							rows="5"
							class="mt-2 w-full rounded-lg border border-slate-600 bg-slate-950/60 text-slate-100 text-sm px-3 py-2"
							placeholder="Optional scratch…"
							bind:value={notesDraft}
							data-testid="entity-detail-notes-draft"
						></textarea>
						{#if workspaceDirty}
							<button
								type="button"
								class="mt-2 text-xs text-slate-400 hover:text-slate-200 underline"
								data-testid="entity-detail-notes-discard-draft"
								on:click={() => {
									notesDraft = '';
									onDetailDirtyChange?.(false);
								}}
							>
								Discard draft
							</button>
						{/if}
					</div>
				</div>
			{:else if primaryTab === 'history'}
				<div
					class="rounded-xl border border-dashed border-slate-600 bg-slate-950/30 p-6"
					data-testid="entity-detail-deep-history"
				>
					<h3 class="text-sm font-semibold text-slate-200">History</h3>
					<p class="mt-2 text-sm text-slate-400 leading-relaxed">
						Audit-style history for this entity is not wired to Case Engine in this build — no fabricated events
						(P69-06 §4.4).
					</p>
				</div>
			{:else if primaryTab === 'files'}
				<div
					class="rounded-2xl border border-slate-600/45 bg-gradient-to-b from-slate-900/75 to-slate-950/92 p-6 shadow-[0_10px_36px_-14px_rgba(0,0,0,0.5)] ring-1 ring-white/[0.05]"
					data-testid="entity-detail-deep-files"
				>
					<h3 class="text-sm font-semibold text-slate-200">Files</h3>
					<p class="mt-2 text-sm text-slate-400 leading-relaxed">
						Case Engine does not expose an entity-linked file listing here yet. Use the case Files route for
						attachments (P69-10).
					</p>
					<a
						class="mt-3 inline-block text-sm font-medium text-cyan-400 hover:underline"
						href={filesHref()}
						data-testid="entity-detail-deep-files-route"
					>
						Open case Files
					</a>
				</div>
			{/if}
		</div>
	{/if}

	{#if showRetireConfirm && entity}
		<div
			class="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 px-4"
			role="dialog"
			aria-modal="true"
			aria-labelledby="entity-retire-title"
			data-testid="entity-detail-retire-confirm"
		>
			<div class="max-w-md w-full rounded-xl border border-slate-600 bg-slate-900 p-4 shadow-2xl">
				<h2 id="entity-retire-title" class="text-sm font-semibold text-slate-100">Retire this entity?</h2>
				<p class="mt-2 text-xs text-slate-400 leading-relaxed">
					Retire removes this committed row from the active intel view (soft delete in Case Engine). It can be restored
					when include-retired lists apply.
				</p>
				<div class="mt-4 flex flex-wrap justify-end gap-2">
					<button
						type="button"
						class="px-3 py-1.5 text-xs rounded-lg border border-slate-600 text-slate-200 hover:bg-slate-800"
						data-testid="entity-detail-retire-cancel"
						on:click={() => (showRetireConfirm = false)}
					>
						Cancel
					</button>
					<button
						type="button"
						class="px-3 py-1.5 text-xs rounded-lg border border-amber-600 bg-amber-950/40 text-amber-100 hover:bg-amber-950/60 disabled:opacity-50"
						data-testid="entity-detail-retire-confirm-btn"
						disabled={retireBusy}
						on:click={() => void confirmRetire()}
					>
						{retireBusy ? 'Retiring…' : 'Retire'}
					</button>
				</div>
			</div>
		</div>
	{/if}
</div>
