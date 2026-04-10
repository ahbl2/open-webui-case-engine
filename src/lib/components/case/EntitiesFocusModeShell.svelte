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
	class="entities-focus-mode flex flex-col min-h-[480px] rounded-2xl border border-slate-600/50 bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900 text-slate-100 shadow-[0_20px_60px_-24px_rgba(0,0,0,0.65)] ring-1 ring-white/[0.06] transition-opacity duration-200 motion-reduce:transition-none"
	data-testid="entities-focus-mode-shell"
	aria-busy={detailLoading ? 'true' : 'false'}
>
	<header
		class="flex flex-wrap items-center gap-4 border-b border-slate-700/60 px-4 py-3.5 shrink-0 bg-gradient-to-r from-slate-950/98 to-slate-900/90 backdrop-blur-md shadow-[inset_0_-1px_0_0_rgba(255,255,255,0.04)]"
		data-testid="entities-focus-top-chrome"
	>
		<button
			type="button"
			class="inline-flex items-center gap-2 rounded-xl border border-slate-600/80 bg-slate-900/90 px-3.5 py-2 text-sm font-semibold text-slate-100 hover:bg-slate-800/95 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/80 shadow-sm"
			data-testid="entities-focus-back-to-board"
			on:click={handleBackRequest}
		>
			<span aria-hidden="true">←</span>
			Back to board
		</button>
		<div class="text-xs text-slate-400 truncate max-w-[min(28rem,50vw)] font-medium" data-testid="entities-focus-case-meta">
			{#if caseNumber}
				<span class="font-mono text-slate-300">{caseNumber}</span>
			{/if}
			{#if caseTitle}
				<span class={caseNumber ? 'mx-2 text-slate-600' : ''}>·</span>
				<span class="text-slate-300">{caseTitle}</span>
			{/if}
		</div>
	</header>

	<div
		class="flex-1 min-h-0 flex flex-col lg:flex-row gap-0 lg:gap-0 p-3 lg:p-4 lg:gap-6"
		data-testid="entities-focus-body"
	>
		<div
			class="min-h-0 flex shrink-0 lg:h-auto lg:pr-2 lg:border-r lg:border-slate-800/80"
			data-testid="entities-focus-anchored-column"
		>
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

		<section
			class="flex-1 min-h-0 min-w-0 flex flex-col rounded-2xl border border-slate-600/45 bg-gradient-to-b from-slate-900/55 to-slate-950/90 overflow-hidden shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] ring-1 ring-white/[0.04]"
			data-testid="entities-focus-detail-region"
		>
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
			class="fixed inset-0 z-[110] flex items-center justify-center bg-black/65 px-4"
			role="dialog"
			aria-modal="true"
			aria-labelledby="entity-dirty-gate-title"
			data-testid="entity-detail-dirty-gate"
		>
			<div class="max-w-md w-full rounded-xl border border-slate-600 bg-slate-900 p-4 shadow-2xl">
				<h2 id="entity-dirty-gate-title" class="text-sm font-semibold text-slate-100">Unsaved workspace draft</h2>
				<p class="mt-2 text-xs text-slate-400 leading-relaxed">
					The Notes workspace draft is not saved to Case Engine. Save to the server is not available for this field in
					MVP — discard the draft to continue, or cancel to keep editing.
				</p>
				<div class="mt-4 flex flex-col sm:flex-row flex-wrap justify-end gap-2">
					<button
						type="button"
						class="px-3 py-1.5 text-xs rounded-lg border border-slate-600 text-slate-200 hover:bg-slate-800"
						data-testid="entity-detail-dirty-cancel"
						on:click={dirtyGateCancel}
					>
						Cancel
					</button>
					<button
						type="button"
						class="px-3 py-1.5 text-xs rounded-lg border border-slate-500 text-slate-300 hover:bg-slate-800 disabled:opacity-40"
						disabled
						title="No persisted entity fields are editable in this workspace draft MVP."
						data-testid="entity-detail-dirty-save-disabled"
					>
						Save
					</button>
					<button
						type="button"
						class="px-3 py-1.5 text-xs rounded-lg border border-amber-700/60 bg-amber-950/35 text-amber-100 hover:bg-amber-950/55"
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
