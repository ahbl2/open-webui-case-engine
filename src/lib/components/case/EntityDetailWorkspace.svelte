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
	import { CASE_DESTINATION_LABELS, CASE_DESTINATION_TITLES } from '$lib/utils/caseDestinationLabels';
	import { committedEntityEvidenceFocusGate } from '$lib/utils/entityFocus';
	import { toast } from 'svelte-sonner';
	import {
		DS_BTN_CLASSES,
		DS_ENTITY_BOARD_CLASSES,
		DS_ENTITY_DETAIL_CLASSES,
		DS_INTELLIGENCE_CLASSES,
		DS_SKELETON_CLASSES,
		DS_TIMELINE_CLASSES,
		DS_TYPE_CLASSES
	} from '$lib/case/detectivePrimitiveFoundation';

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

	$: entityFocusAffordance = entity ? committedEntityEvidenceFocusGate(entity) : null;

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

	function kindBadgeClass(kind: CaseIntelligenceEntityKind): string {
		switch (kind) {
			case 'PERSON':
				return DS_ENTITY_DETAIL_CLASSES.kindBadgePerson;
			case 'VEHICLE':
				return DS_ENTITY_DETAIL_CLASSES.kindBadgeVehicle;
			case 'LOCATION':
				return DS_ENTITY_DETAIL_CLASSES.kindBadgeLocation;
			default:
				return DS_ENTITY_DETAIL_CLASSES.kindBadgeDefault;
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

<div
	class="{DS_ENTITY_DETAIL_CLASSES.workspaceRoot} entity-detail-workspace min-h-0 h-full flex-1"
	data-testid="entity-detail-workspace"
>
	{#if detailLoading && !entity}
		<div class="{DS_ENTITY_DETAIL_CLASSES.headerSkeleton} space-y-3" data-testid="entity-detail-header-skeleton" aria-busy="true">
			<div class="{DS_SKELETON_CLASSES.base} {DS_SKELETON_CLASSES.shimmer} h-6 w-2/3 rounded"></div>
			<div class="{DS_SKELETON_CLASSES.base} {DS_SKELETON_CLASSES.shimmer} h-4 w-24 rounded"></div>
			<div class="{DS_SKELETON_CLASSES.base} {DS_SKELETON_CLASSES.shimmer} h-3 w-full rounded opacity-90"></div>
		</div>
	{:else if detailError}
		<div class="{DS_ENTITY_DETAIL_CLASSES.headerError}" data-testid="entity-detail-header-error">
			<CaseErrorState title="Could not load entity" message={detailError} onRetry={onRetryDetail} />
		</div>
	{:else if entity}
		<header class="{DS_ENTITY_DETAIL_CLASSES.header} space-y-4" data-testid="entity-detail-header">
			{#if entity.deleted_at}
				<div class="{DS_ENTITY_DETAIL_CLASSES.retiredBanner}" data-testid="entity-detail-retired-banner" role="status">
					<strong class="font-semibold">Retired</strong>
					<span> — not in the active registry view. Restore from the Status card if permitted.</span>
				</div>
			{/if}

			<div class="{DS_ENTITY_DETAIL_CLASSES.identityRow}">
				<div class="{DS_ENTITY_DETAIL_CLASSES.identityMain}">
					{#if entity.entity_kind === 'PERSON'}
						{#if portraitUrl && !portraitFailed}
							<img
								src={portraitUrl}
								alt=""
								class="{DS_ENTITY_DETAIL_CLASSES.portrait}"
								loading="lazy"
								on:error={() => (portraitFailed = true)}
							/>
						{:else}
							<span class="{DS_ENTITY_DETAIL_CLASSES.portraitFallback}" aria-hidden="true">
								{initialsFromDisplayLabel(entity.display_label)}
							</span>
						{/if}
					{:else if entity.entity_kind === 'VEHICLE'}
						<span class="{DS_ENTITY_DETAIL_CLASSES.kindTileVehicle}" aria-hidden="true">V</span>
					{:else}
						<span class="{DS_ENTITY_DETAIL_CLASSES.kindTileLocation}" aria-hidden="true">L</span>
					{/if}
					<div class="min-w-0">
						<div class="flex flex-wrap items-center gap-2">
							<h2 class="{DS_ENTITY_DETAIL_CLASSES.heroTitle}" data-testid="entity-detail-hero-label">
								{entity.display_label}
							</h2>
							<span
								class="shrink-0 {kindBadgeClass(entity.entity_kind)}"
								data-testid="entity-detail-kind-chip"
							>
								{kindLabel(entity.entity_kind)}
							</span>
						</div>
						{#if metaMiddot}
							<p class="{DS_ENTITY_DETAIL_CLASSES.metaLine}" data-testid="entity-detail-metadata-row">
								{metaMiddot}
							</p>
						{/if}
						{#if readScope}
							<p class="{DS_ENTITY_DETAIL_CLASSES.scopeLine}">List scope: {readScope.replace(/_/g, ' ')}</p>
						{/if}
					</div>
				</div>

				<div class="{DS_ENTITY_DETAIL_CLASSES.actionsWrap}">
					<details bind:open={actionsOpen} data-testid="entity-detail-actions-menu">
						<summary class="{DS_ENTITY_DETAIL_CLASSES.actionsSummary}">Actions</summary>
						<div class="{DS_ENTITY_DETAIL_CLASSES.actionsMenuPanel}">
							<button
								type="button"
								class="{DS_ENTITY_DETAIL_CLASSES.actionsMenuItem} {DS_ENTITY_DETAIL_CLASSES.actionsMenuItemDisabled}"
								disabled
								title="Case Engine does not expose entity PATCH in this UI build."
								data-testid="entity-detail-action-edit-disabled"
							>
								Edit entity…
							</button>
							<button
								type="button"
								class="{DS_ENTITY_DETAIL_CLASSES.actionsMenuItem}"
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

			<div class="{DS_ENTITY_DETAIL_CLASSES.quickPills}" data-testid="entity-detail-quick-pills">
				<div class="{DS_ENTITY_DETAIL_CLASSES.quickPillCluster}" data-testid="entity-detail-quick-pills-workspace">
					<p id="entity-detail-quick-pills-ws-label" class="{DS_ENTITY_DETAIL_CLASSES.quickPillClusterLabel}">
						In this workspace
					</p>
					<div
						class="{DS_ENTITY_DETAIL_CLASSES.quickPillClusterRow}"
						role="group"
						aria-labelledby="entity-detail-quick-pills-ws-label"
					>
						<button
							type="button"
							class="{DS_ENTITY_DETAIL_CLASSES.quickPill} {DS_ENTITY_DETAIL_CLASSES.quickPillWorkspace}"
							data-testid="entity-detail-pill-timeline"
							aria-pressed={primaryTab === 'timeline' ? 'true' : 'false'}
							title="Opens the Timeline tab in this workspace — not the official case timeline."
							on:click={() => setTab('timeline')}
						>
							Timeline
						</button>
						<button
							type="button"
							class="{DS_ENTITY_DETAIL_CLASSES.quickPill} {DS_ENTITY_DETAIL_CLASSES.quickPillWorkspace}"
							data-testid="entity-detail-pill-files"
							aria-pressed={primaryTab === 'files' ? 'true' : 'false'}
							title="Opens the Files tab in this workspace — not an entity-linked file index from Case Engine."
							on:click={() => setTab('files')}
						>
							Files
						</button>
						<button
							type="button"
							class="{DS_ENTITY_DETAIL_CLASSES.quickPill} {DS_ENTITY_DETAIL_CLASSES.quickPillWorkspace}"
							data-testid="entity-detail-pill-notes"
							aria-pressed={primaryTab === 'notes' ? 'true' : 'false'}
							title="Opens the Notes tab in this workspace — use case Notes for persisted notebook drafts."
							on:click={() => setTab('notes')}
						>
							Notes
						</button>
					</div>
				</div>
				<div class="{DS_ENTITY_DETAIL_CLASSES.quickPillCluster}" data-testid="entity-detail-quick-pills-governed-route">
					<p id="entity-detail-quick-pills-gov-label" class="{DS_ENTITY_DETAIL_CLASSES.quickPillClusterLabel}">
						Governed case route
					</p>
					<div
						class="{DS_ENTITY_DETAIL_CLASSES.quickPillClusterRow}"
						role="group"
						aria-labelledby="entity-detail-quick-pills-gov-label"
					>
						<a
							class="{DS_ENTITY_DETAIL_CLASSES.quickPill} {DS_ENTITY_DETAIL_CLASSES.quickPillProposals}"
							data-testid="entity-detail-pill-proposals"
							href={proposalsHref()}
							title={CASE_DESTINATION_TITLES.caseProposalsOpenPill}
						>
							{CASE_DESTINATION_LABELS.caseProposals} (P19)
						</a>
					</div>
				</div>
			</div>

			{#if entityFocusAffordance}
				<div
					class="rounded-lg border border-[var(--ds-border-subtle)] bg-[var(--ds-surface-raised)]/60 px-3 py-2.5"
					data-testid="entity-detail-entity-focus-affordance"
					role="region"
					aria-label={CASE_DESTINATION_TITLES.entityIntelligenceFocusRegion}
				>
					{#if entityFocusAffordance.outcome === 'navigate'}
						<a
							class="{DS_INTELLIGENCE_CLASSES.inlineLink} font-semibold"
							data-testid="entity-detail-open-entity-focus"
							href={entityFocusAffordance.href}
							title={CASE_DESTINATION_TITLES.entityIntelligenceFocusRegion}
						>
							{CASE_DESTINATION_LABELS.entityIntelligenceFocusDrillDown}
						</a>
					{:else if entityFocusAffordance.outcome === 'vehicle_unsupported'}
						<p class="{DS_TYPE_CLASSES.body} text-[var(--ds-text-secondary)]" data-testid="entity-detail-focus-unavailable-vehicle">
							Entity focus not available for this type yet. Use this workspace for committed vehicle records.
						</p>
					{:else}
						<p class="{DS_TYPE_CLASSES.body} text-[var(--ds-text-secondary)]" data-testid="entity-detail-focus-unavailable-normalized">
							Entity focus not available for this record yet (missing normalized identifier).
						</p>
					{/if}
				</div>
			{/if}

			<div class="{DS_ENTITY_DETAIL_CLASSES.idRow}">
				<span class={DS_TYPE_CLASSES.mono} title={entity.id}>{entity.id}</span>
				<button
					type="button"
					class="{DS_INTELLIGENCE_CLASSES.inlineLink} font-semibold"
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
			class="{DS_ENTITY_DETAIL_CLASSES.tabstrip} sticky top-0 z-10"
			data-testid="entity-detail-primary-tabstrip"
			role="tablist"
			aria-label="Entity primary tabs"
		>
			{#each PRIMARY_TABS as tab (tab.id)}
				<button
					type="button"
					role="tab"
					aria-selected={primaryTab === tab.id ? 'true' : 'false'}
					class="{DS_ENTITY_DETAIL_CLASSES.tab} {primaryTab === tab.id
						? DS_ENTITY_DETAIL_CLASSES.tabActive
						: DS_ENTITY_DETAIL_CLASSES.tabInactive}"
					data-testid="entity-detail-tab-{tab.id}"
					on:click={() => setTab(tab.id)}
				>
					{tab.label}
				</button>
			{/each}
		</div>

		<div class="{DS_ENTITY_DETAIL_CLASSES.panelBody}" data-testid="entity-detail-panel-body">
			{#if primaryTab === 'overview'}
				<div class="{DS_ENTITY_DETAIL_CLASSES.overviewGrid}" data-testid="entity-detail-overview-grid">
					<!-- Details card -->
					<section class="{DS_INTELLIGENCE_CLASSES.panel}" data-testid="entity-detail-card-details">
						<h3 class="{DS_ENTITY_DETAIL_CLASSES.sectionLabel}">Details</h3>
						<p class="{DS_ENTITY_DETAIL_CLASSES.sectionHint}">
							Read-only committed attributes. Edit when Case Engine exposes governed patch (P69-10).
						</p>
						{#if attrRows.length === 0}
							<p class="{DS_TYPE_CLASSES.meta} mt-3">No extended attributes recorded.</p>
						{:else}
							<dl class="{DS_ENTITY_DETAIL_CLASSES.attrGrid}">
								{#each attrRows as row (row.key)}
									<div class="{DS_ENTITY_DETAIL_CLASSES.attrCell}">
										<dt class="{DS_ENTITY_DETAIL_CLASSES.attrDt}">{row.label}</dt>
										<dd class="{DS_ENTITY_DETAIL_CLASSES.attrDd}">{row.value}</dd>
									</div>
								{/each}
							</dl>
						{/if}
					</section>

					<!-- Status card (single owner for retire/restore per P69-06 §3.2) -->
					<section class="{DS_INTELLIGENCE_CLASSES.panel}" data-testid="entity-detail-card-status">
						<h3 class="{DS_ENTITY_DETAIL_CLASSES.sectionLabel}">Status</h3>
						<dl class="{DS_ENTITY_DETAIL_CLASSES.statusDl}">
							<div class="{DS_ENTITY_DETAIL_CLASSES.statusRow}">
								<dt class="{DS_ENTITY_DETAIL_CLASSES.statusDt}">State</dt>
								<dd data-testid="entity-detail-status-active">{entity.deleted_at ? 'Retired' : 'Active'}</dd>
							</div>
							<div class="{DS_ENTITY_DETAIL_CLASSES.statusRow}">
								<dt class="{DS_ENTITY_DETAIL_CLASSES.statusDt}">Created</dt>
								<dd>{entity.created_at}</dd>
							</div>
							{#if entity.updated_at}
								<div class="{DS_ENTITY_DETAIL_CLASSES.statusRow}">
									<dt class="{DS_ENTITY_DETAIL_CLASSES.statusDt}">Updated</dt>
									<dd>{entity.updated_at}</dd>
								</div>
							{/if}
							{#if entity.deleted_at}
								<div class="{DS_ENTITY_DETAIL_CLASSES.statusRow}">
									<dt class="{DS_ENTITY_DETAIL_CLASSES.statusDt}">Retired at</dt>
									<dd>{entity.deleted_at}</dd>
								</div>
							{/if}
						</dl>
						<div class="mt-4 flex flex-wrap gap-2">
							{#if !entity.deleted_at}
								<button
									type="button"
									class="{DS_BTN_CLASSES.secondary} !text-xs"
									data-testid="entity-detail-retire-open"
									on:click={() => (showRetireConfirm = true)}
								>
									Retire entity…
								</button>
							{:else}
								<button
									type="button"
									class="{DS_BTN_CLASSES.primary} !text-xs"
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
						class="{DS_INTELLIGENCE_CLASSES.panel} xl:col-span-2"
						data-testid="entity-detail-card-associations-summary"
					>
						<div class="flex flex-wrap items-center justify-between gap-2">
							<h3 class="{DS_ENTITY_DETAIL_CLASSES.sectionLabel}">Associations</h3>
							<button
								type="button"
								class="{DS_INTELLIGENCE_CLASSES.inlineLink} text-[11px] font-semibold"
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
							<p class="{DS_TYPE_CLASSES.body} mt-2">
								<span class="opacity-90">No committed associations yet.</span>
								<button
									type="button"
									class="{DS_INTELLIGENCE_CLASSES.inlineLink} ml-1 font-semibold"
									data-testid="entity-detail-assoc-propose-inline"
									on:click={() => onOpenAssociationComposer?.(entity)}
								>
									Propose association
								</button>
							</p>
						{:else}
							<ul class="{DS_ENTITY_DETAIL_CLASSES.assocSummaryList}" data-testid="entity-detail-assoc-summary-list">
								{#each assocPreview as row (row.id)}
									<li class="{DS_ENTITY_DETAIL_CLASSES.assocSummaryRow}">
										<span class="font-semibold text-[color:var(--ds-text-primary)]"
											>{associationKindLabel(row.association_kind)}</span
										>
										<span class="opacity-70"> · </span>
										<span class="{DS_TYPE_CLASSES.mono} text-[10px]">{otherEndpointId(row, entity.id)}</span>
										<span class="opacity-70"> · {assertionLaneLabel(row.assertion_lane)}</span>
									</li>
								{/each}
							</ul>
						{/if}
					</section>

					<!-- Recent timeline (deferred) -->
					<section class="{DS_INTELLIGENCE_CLASSES.emptyDashed}" data-testid="entity-detail-card-timeline">
						<h3 class="{DS_ENTITY_DETAIL_CLASSES.sectionLabel}">Recent timeline</h3>
						<p class="{DS_TYPE_CLASSES.body} mt-2 leading-relaxed opacity-90">
							Timeline linkage for this entity is not available in this build (Case Engine join pending — P69-10).
						</p>
						<button
							type="button"
							class="{DS_INTELLIGENCE_CLASSES.inlineLink} mt-2 text-xs font-semibold"
							data-testid="entity-detail-card-timeline-open-tab"
							on:click={() => setTab('timeline')}
						>
							Open Timeline tab
						</button>
					</section>

					<!-- Files card -->
					<section class="{DS_INTELLIGENCE_CLASSES.panel}" data-testid="entity-detail-card-files">
						<h3 class="{DS_ENTITY_DETAIL_CLASSES.sectionLabel}">Files</h3>
						<p class="{DS_TYPE_CLASSES.body} mt-2 opacity-90">
							No entity-scoped file index from Case Engine in this build. Open the case Files tab for uploads and
							attachments.
						</p>
						<div class="mt-2 flex flex-wrap gap-2">
							<button
								type="button"
								class="{DS_INTELLIGENCE_CLASSES.inlineLink} text-xs font-semibold"
								data-testid="entity-detail-card-files-deep-tab"
								on:click={() => setTab('files')}
							>
								Files tab
							</button>
							<a class="{DS_INTELLIGENCE_CLASSES.inlineLink} text-xs font-semibold" href={filesHref()}>Case Files</a>
						</div>
					</section>

					<!-- Notes card -->
					<section class="{DS_INTELLIGENCE_CLASSES.panel}" data-testid="entity-detail-card-notes">
						<h3 class="{DS_ENTITY_DETAIL_CLASSES.sectionLabel}">Notes</h3>
						<p class="{DS_TYPE_CLASSES.body} mt-2 opacity-90">
							Notebook notes are case-scoped in this build. Use the Notes tab to add working drafts — they are not
							the official timeline.
						</p>
						<a
							class="{DS_INTELLIGENCE_CLASSES.inlineLink} mt-2 inline-block text-xs font-semibold"
							data-testid="entity-detail-card-notes-link"
							href={notesHref()}
						>
							Open case Notes
						</a>
					</section>

					<!-- AI Assist (non-authoritative) -->
					<section class="{DS_ENTITY_DETAIL_CLASSES.aiAssistCard} xl:col-span-2" data-testid="entity-detail-card-ai-assist">
						<h3 class="{DS_ENTITY_DETAIL_CLASSES.sectionLabel}">AI assist</h3>
						<p class="{DS_TYPE_CLASSES.body} mt-2 leading-relaxed opacity-95">
							Non-authoritative analysis in entity context is deferred — no silent writes; Ask integrity rules apply
							when wired (P69-10 / Phase 33).
						</p>
					</section>
				</div>
			{:else if primaryTab === 'associations'}
				<div class="flex flex-col gap-4" data-testid="entity-detail-deep-associations">
					<div class="flex flex-wrap items-center justify-between gap-2">
						<h3 class="{DS_ENTITY_DETAIL_CLASSES.deepSectionTitle}">Committed associations</h3>
						<button
							type="button"
							class="{DS_INTELLIGENCE_CLASSES.inlineLink} text-xs font-semibold"
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
						<ul class="flex flex-col gap-2" data-testid="entity-detail-deep-assoc-committed-list">
							{#each assocCommitted as row (row.id)}
								<li class="{DS_ENTITY_DETAIL_CLASSES.assocCommittedRow}">
									<div class="font-semibold text-[color:var(--ds-text-primary)]">{associationKindLabel(row.association_kind)}</div>
									<div class="{DS_TYPE_CLASSES.mono} mt-1 text-[10px] opacity-80">
										Other endpoint: {otherEndpointId(row, entity.id)}
									</div>
									<div class="mt-0.5 opacity-80">{assertionLaneLabel(row.assertion_lane)}</div>
								</li>
							{/each}
						</ul>
					{/if}

					<div class="{DS_ENTITY_DETAIL_CLASSES.deepDivider}">
						<h3 class="{DS_ENTITY_DETAIL_CLASSES.deepSectionTitle}">Staging (draft / pending)</h3>
					</div>
					{#if assocLoading}
						<p class="{DS_TYPE_CLASSES.meta} opacity-80">…</p>
					{:else if assocStaging.length === 0}
						<p class="{DS_TYPE_CLASSES.body} opacity-90" data-testid="entity-detail-deep-assoc-staging-empty">
							No open staging rows referencing this entity. Use Propose association or Stage 2 queue on the board.
						</p>
					{:else}
						<ul class="flex flex-col gap-2" data-testid="entity-detail-deep-assoc-staging-list">
							{#each assocStaging as row (row.id)}
								<li class="{DS_ENTITY_DETAIL_CLASSES.assocStagingRow}">
									<div class="font-semibold text-[color:var(--ds-text-primary)]">{associationKindLabel(row.association_kind)}</div>
									<div class="opacity-80">{row.status}</div>
								</li>
							{/each}
						</ul>
					{/if}
				</div>
			{:else if primaryTab === 'timeline'}
				<div class="{DS_INTELLIGENCE_CLASSES.emptyDashed} p-6" data-testid="entity-detail-deep-timeline">
					<h3 class="{DS_ENTITY_DETAIL_CLASSES.deepSectionTitle}">Timeline</h3>
					<p class="{DS_TYPE_CLASSES.body} mt-2 leading-relaxed opacity-90">
						Official timeline entries are not correlated to this entity in this UI build (P69-10). Review the case
						timeline for committed events.
					</p>
					<a
						class="{DS_INTELLIGENCE_CLASSES.inlineLink} mt-3 inline-block text-sm font-semibold"
						href={timelineCaseHref()}
						data-testid="entity-detail-deep-timeline-case-link"
					>
						Open case Timeline
					</a>
				</div>
			{:else if primaryTab === 'notes'}
				<div class="flex flex-col gap-4" data-testid="entity-detail-deep-notes">
					<p class="{DS_TYPE_CLASSES.body} opacity-90">
						<strong class="text-[color:var(--ds-text-primary)]">Notebook</strong> — drafts are not automatic timeline records. Open the case
						Notes tab to create or edit persisted notes.
					</p>
					<a
						class="{DS_INTELLIGENCE_CLASSES.inlineLink} inline-block text-sm font-semibold"
						href={notesHref()}
						data-testid="entity-detail-deep-notes-route"
					>
						Go to Notes tab (case)
					</a>
					<div class="{DS_ENTITY_DETAIL_CLASSES.notesDraftPanel}">
						<label for="entity-detail-notes-draft" class="{DS_ENTITY_DETAIL_CLASSES.notesDraftLabel}">
							Workspace draft (local only)
						</label>
						<p class="{DS_ENTITY_DETAIL_CLASSES.notesDraftHint}">
							This text stays in your browser session until you clear it. It does not write to Case Engine — future
							entity-scoped notes may replace this (P69-10). Leaving text here flags the workspace as dirty for switch
							/ back guards.
						</p>
						<textarea
							id="entity-detail-notes-draft"
							rows="5"
							class="mt-2 w-full {DS_TIMELINE_CLASSES.formControl}"
							placeholder="Optional scratch…"
							bind:value={notesDraft}
							data-testid="entity-detail-notes-draft"
						></textarea>
						{#if workspaceDirty}
							<button
								type="button"
								class="{DS_ENTITY_DETAIL_CLASSES.discardDraftBtn}"
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
				<div class="{DS_INTELLIGENCE_CLASSES.emptyDashed} p-6" data-testid="entity-detail-deep-history">
					<h3 class="{DS_ENTITY_DETAIL_CLASSES.deepSectionTitle}">History</h3>
					<p class="{DS_TYPE_CLASSES.body} mt-2 leading-relaxed opacity-90">
						Audit-style history for this entity is not wired to Case Engine in this build — no fabricated events
						(P69-06 §4.4).
					</p>
				</div>
			{:else if primaryTab === 'files'}
				<div class="{DS_INTELLIGENCE_CLASSES.panel}" data-testid="entity-detail-deep-files">
					<h3 class="{DS_ENTITY_DETAIL_CLASSES.deepSectionTitle}">Files</h3>
					<p class="{DS_TYPE_CLASSES.body} mt-2 leading-relaxed opacity-90">
						Case Engine does not expose an entity-linked file listing here yet. Use the case Files route for
						attachments (P69-10).
					</p>
					<a
						class="{DS_INTELLIGENCE_CLASSES.inlineLink} mt-3 inline-block text-sm font-semibold"
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
			class="{DS_ENTITY_BOARD_CLASSES.focusDirtyGateOverlay}"
			role="dialog"
			aria-modal="true"
			aria-labelledby="entity-retire-title"
			data-testid="entity-detail-retire-confirm"
		>
			<div class="{DS_ENTITY_BOARD_CLASSES.focusDirtyGateCard} max-w-md w-full">
				<h2 id="entity-retire-title" class="{DS_TYPE_CLASSES.body} font-semibold">Retire this entity?</h2>
				<p class="{DS_TYPE_CLASSES.meta} mt-2 leading-relaxed">
					Retire removes this committed row from the active intel view (soft delete in Case Engine). It can be restored
					when include-retired lists apply.
				</p>
				<div class="mt-4 flex flex-wrap justify-end gap-2">
					<button
						type="button"
						class="{DS_BTN_CLASSES.ghost} !text-xs"
						data-testid="entity-detail-retire-cancel"
						on:click={() => (showRetireConfirm = false)}
					>
						Cancel
					</button>
					<button
						type="button"
						class="{DS_BTN_CLASSES.danger} !text-xs"
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
