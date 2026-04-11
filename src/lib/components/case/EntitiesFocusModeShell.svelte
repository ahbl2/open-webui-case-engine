<script lang="ts">
	/**
	 * P69-08 — Focus mode shell: top chrome, anchored registry, detail region.
	 * P69-09 — EntityDetailWorkspace + dirty gates (P69-05 §7).
	 */
	import { browser } from '$app/environment';
	import {
		getCaseIntelligenceCommittedEntity,
		type CaseIntelligenceCommittedEntity,
		type CaseIntelligenceEntityKind
	} from '$lib/apis/caseEngine';
	import EntitiesRegistryPanel from '$lib/components/case/EntitiesRegistryPanel.svelte';
	import EntityDetailWorkspace from '$lib/components/case/EntityDetailWorkspace.svelte';
	import { DS_BTN_CLASSES, DS_ENTITY_BOARD_CLASSES } from '$lib/case/detectivePrimitiveFoundation';
	import type { EntitiesBoardPanelState } from '$lib/utils/entitiesBoardTypes';
	import { tick } from 'svelte';
	import { toast } from 'svelte-sonner';

	export let caseId: string;
	export let token: string;
	/** Initial row from board (may be list-shaped; refreshed via GET). */
	export let focusedEntity: CaseIntelligenceCommittedEntity;
	export let caseTitle = '';
	export let caseNumber = '';
	export let onBack: () => void;
	export let onAddRequest: ((detail: { entityKind: CaseIntelligenceEntityKind }) => void) | undefined =
		undefined;
	export let refreshNonce = 0;
	export let seedPanelState: EntitiesBoardPanelState | undefined = undefined;
	export let onOpenAssociationComposer: ((entity: CaseIntelligenceCommittedEntity) => void) | undefined =
		undefined;

	let detailEntity: CaseIntelligenceCommittedEntity = focusedEntity;
	let detailLoading = false;
	let detailLoadId = 0;
	let prevFocusedId = '';
	let detailReadScope: 'active_only' | 'include_retired' | null = null;
	let detailError = '';

	let detailWorkspace: EntityDetailWorkspace | null = null;
	let detailDirty = false;
	let dirtyGateOpen = false;
	let dirtyGateKind: 'row' | 'back' | null = null;
	let pendingRowDetail: { entity: CaseIntelligenceCommittedEntity } | null = null;

	$: anchoredKind = focusedEntity.entity_kind;
	$: registryHeading =
		anchoredKind === 'PERSON'
			? 'People'
			: anchoredKind === 'VEHICLE'
				? 'Vehicles'
				: 'Locations';
	$: registrySubheader = 'Anchored registry — same filters as the board panel for this type.';
	$: registryTestId = 'entities-anchored-registry';
	$: reducedMotion =
		browser && typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

	$: if (focusedEntity.id !== prevFocusedId) {
		prevFocusedId = focusedEntity.id;
		detailEntity = focusedEntity;
		detailError = '';
		void loadDetailCommitted(prevFocusedId);
	}

	async function loadDetailCommitted(entityId: string): Promise<void> {
		detailLoadId += 1;
		const id = detailLoadId;
		detailLoading = true;
		detailError = '';
		try {
			const res = await getCaseIntelligenceCommittedEntity(caseId, entityId, token, {
				includeRetired: true
			});
			if (id !== detailLoadId) return;
			detailEntity = res.committed_entity;
			detailReadScope = res.read_scope;
		} catch (e) {
			if (id !== detailLoadId) return;
			detailEntity = null;
			detailReadScope = null;
			detailError = e instanceof Error ? e.message : 'Could not load entity detail.';
		} finally {
			if (id === detailLoadId) detailLoading = false;
		}
	}

	async function proceedAnchoredRow(detail: { entity: CaseIntelligenceCommittedEntity }): Promise<void> {
		const next = detail.entity;
		if (next.id === detailEntity?.id) return;

		const previousEntity = detailEntity;
		detailEntity = next;
		detailLoadId += 1;
		const id = detailLoadId;
		detailLoading = true;
		detailError = '';
		let scrollToRowId = next.id;

		try {
			const res = await getCaseIntelligenceCommittedEntity(caseId, next.id, token, { includeRetired: true });
			if (id !== detailLoadId) return;
			detailEntity = res.committed_entity;
			detailReadScope = res.read_scope;
		} catch (e) {
			if (id !== detailLoadId) return;
			detailEntity = previousEntity ?? null;
			detailError = '';
			scrollToRowId = previousEntity?.id ?? next.id;
			toast.error(e instanceof Error ? e.message : 'Could not open that entity.');
		} finally {
			if (id === detailLoadId) detailLoading = false;
		}

		await tick();
		document
			.querySelector(`[data-testid="${registryTestId}-row-${scrollToRowId}"]`)
			?.scrollIntoView({ block: 'nearest', behavior: reducedMotion ? 'auto' : 'smooth' });
	}

	async function handleAnchoredRow(detail: { entity: CaseIntelligenceCommittedEntity }): Promise<void> {
		if (detailDirty) {
			pendingRowDetail = detail;
			dirtyGateKind = 'row';
			dirtyGateOpen = true;
			return;
		}
		await proceedAnchoredRow(detail);
	}

	function handleDetailDirtyChange(d: boolean): void {
		detailDirty = d;
	}

	function handleBackRequest(): void {
		if (detailDirty) {
			dirtyGateKind = 'back';
			dirtyGateOpen = true;
			return;
		}
		onBack();
	}

	function dirtyGateCancel(): void {
		dirtyGateOpen = false;
		dirtyGateKind = null;
		pendingRowDetail = null;
	}

	async function dirtyGateDiscard(): Promise<void> {
		detailWorkspace?.discardUnsavedWorkspaceDraft();
		detailDirty = false;
		dirtyGateOpen = false;
		const kind = dirtyGateKind;
		dirtyGateKind = null;
		const pending = pendingRowDetail;
		pendingRowDetail = null;
		await tick();
		if (kind === 'row' && pending) await proceedAnchoredRow(pending);
		else if (kind === 'back') onBack();
	}

	function retryDetailLoad(): void {
		if (detailEntity?.id) void loadDetailCommitted(detailEntity.id);
		else if (focusedEntity.id) void loadDetailCommitted(focusedEntity.id);
	}
</script>

<div
	class="{DS_ENTITY_BOARD_CLASSES.focusShell} entities-focus-mode motion-reduce:transition-none"
	data-testid="entities-focus-mode-shell"
	aria-busy={detailLoading ? 'true' : 'false'}
>
	<header class="{DS_ENTITY_BOARD_CLASSES.focusHeader}" data-testid="entities-focus-top-chrome">
		<button
			type="button"
			class="{DS_ENTITY_BOARD_CLASSES.focusBackBtn}"
			data-testid="entities-focus-back-to-board"
			on:click={handleBackRequest}
		>
			<span aria-hidden="true">←</span>
			Back to board
		</button>
		<div class="{DS_ENTITY_BOARD_CLASSES.focusCaseMeta}" data-testid="entities-focus-case-meta">
			{#if caseNumber}
				<span class="font-mono text-slate-300">{caseNumber}</span>
			{/if}
			{#if caseTitle}
				<span class={caseNumber ? 'mx-2 text-slate-600' : ''}>·</span>
				<span class="text-slate-300">{caseTitle}</span>
			{/if}
		</div>
	</header>

	<div class="{DS_ENTITY_BOARD_CLASSES.focusBody}" data-testid="entities-focus-body">
		<div class="{DS_ENTITY_BOARD_CLASSES.focusAnchoredCol}" data-testid="entities-focus-anchored-column">
			<EntitiesRegistryPanel
				{caseId}
				{token}
				entityKind={anchoredKind}
				panelMode="live"
				heading={registryHeading}
				subheader={registrySubheader}
				testId={registryTestId}
				layoutVariant="anchored"
				seedPanelState={seedPanelState ?? null}
				{refreshNonce}
				selectedEntityId={detailEntity?.id ?? focusedEntity.id}
				onRowActivate={(d) => void handleAnchoredRow(d)}
				onAddRequest={(d) => onAddRequest?.(d)}
			/>
		</div>

		<section class="{DS_ENTITY_BOARD_CLASSES.focusDetailRegion}" data-testid="entities-focus-detail-region">
			<EntityDetailWorkspace
				bind:this={detailWorkspace}
				{caseId}
				{token}
				entity={detailEntity}
				{detailLoading}
				detailError={detailEntity ? '' : detailError}
				readScope={detailReadScope}
				onRetryDetail={retryDetailLoad}
				onDetailDirtyChange={handleDetailDirtyChange}
				onOpenAssociationComposer={onOpenAssociationComposer}
				onEntityNeedsRefresh={() => {
					if (detailEntity?.id) void loadDetailCommitted(detailEntity.id);
				}}
			/>
		</section>
	</div>

	{#if dirtyGateOpen}
		<div
			class="{DS_ENTITY_BOARD_CLASSES.focusDirtyGateOverlay}"
			role="dialog"
			aria-modal="true"
			aria-labelledby="entity-dirty-gate-title"
			data-testid="entity-detail-dirty-gate"
		>
			<div class="{DS_ENTITY_BOARD_CLASSES.focusDirtyGateCard} max-w-md w-full">
				<h2 id="entity-dirty-gate-title" class="ds-type-body font-semibold">Unsaved workspace draft</h2>
				<p class="ds-type-meta mt-2 leading-relaxed">
					The Notes workspace draft is not saved to Case Engine. Save to the server is not available for this field in
					MVP — discard the draft to continue, or cancel to keep editing.
				</p>
				<div class="mt-4 flex flex-col sm:flex-row flex-wrap justify-end gap-2">
					<button
						type="button"
						class="{DS_BTN_CLASSES.ghost} !text-xs"
						data-testid="entity-detail-dirty-cancel"
						on:click={dirtyGateCancel}
					>
						Cancel
					</button>
					<button
						type="button"
						class="{DS_BTN_CLASSES.secondary} !text-xs"
						disabled
						title="No persisted entity fields are editable in this workspace draft MVP."
						data-testid="entity-detail-dirty-save-disabled"
					>
						Save
					</button>
					<button
						type="button"
						class="{DS_BTN_CLASSES.danger} !text-xs"
						data-testid="entity-detail-dirty-discard"
						on:click={() => void dirtyGateDiscard()}
					>
						Discard draft
					</button>
				</div>
			</div>
		</div>
	{/if}
</div>
