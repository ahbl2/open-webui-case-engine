<script lang="ts">
	import { tick } from 'svelte';
	/**
	 * P69-07 — Entities overview board shell (P69-04 §1). P69-08 — focus handoff + snapshot restore.
	 */
	import type {
		CaseIntelligenceCommittedEntity,
		CaseIntelligenceEntityKind
	} from '$lib/apis/caseEngine';
	import EntitiesBoardToolbar from '$lib/components/case/EntitiesBoardToolbar.svelte';
	import EntitiesConnectionsSummary from '$lib/components/case/EntitiesConnectionsSummary.svelte';
	import EntitiesIntakeSubordinate from '$lib/components/case/EntitiesIntakeSubordinate.svelte';
	import EntitiesRegistryPanel from '$lib/components/case/EntitiesRegistryPanel.svelte';
	import CaseIntelligenceStage1Panel from '$lib/components/case/CaseIntelligenceStage1Panel.svelte';
	import CaseIntelligenceAssociationsPanel from '$lib/components/case/CaseIntelligenceAssociationsPanel.svelte';
	import { DS_ENTITY_BOARD_CLASSES } from '$lib/case/detectivePrimitiveFoundation';
	import {
		resolvePhonePanelMode,
		type EntitiesBoardSnapshot,
		type EntitiesRegistryPanelMode
	} from '$lib/utils/entitiesBoardTypes';

	export let caseId: string;
	export let token: string;
	export let caseTitle = '';
	export let caseNumber = '';
	/** Optional override; default placeholder until P69-10 (P69-04 §3.7). */
	export let phonePanelMode: EntitiesRegistryPanelMode | undefined = undefined;
	export let selectedEntityId: string | null = null;
	export let refreshNonce = 0;

	/**
	 * P69-04 §7 / P69-05 — Focus orchestration hook (stub in P69-07; P69-08 implements UI).
	 */
	export let onFocusRequested: ((detail: { entity: CaseIntelligenceCommittedEntity }) => void) | undefined =
		undefined;

	/** Opening detail modal / row UX (preserves Phase 68 behavior). */
	export let onRegistryRowActivate:
		| ((detail: { entity: CaseIntelligenceCommittedEntity }) => void)
		| undefined = undefined;

	/** Direct-create entry (Phase 68 modal). */
	export let onAddRequest: ((detail: { entityKind: CaseIntelligenceEntityKind }) => void) | undefined =
		undefined;

	let intakeExpanded = false;
	let boardScrollEl: HTMLDivElement | null = null;
	let connectionsComp: EntitiesConnectionsSummary;

	let personPanel: EntitiesRegistryPanel;
	let vehiclePanel: EntitiesRegistryPanel;
	let locationPanel: EntitiesRegistryPanel;
	let phonePanel: EntitiesRegistryPanel;

	$: resolvedPhoneMode = resolvePhonePanelMode(phonePanelMode);

	function handleRowActivate(detail: { entity: CaseIntelligenceCommittedEntity }): void {
		onFocusRequested?.(detail);
		onRegistryRowActivate?.(detail);
	}

	export async function refreshAllPanels(): Promise<void> {
		await Promise.all([
			personPanel?.refreshPanel(),
			vehiclePanel?.refreshPanel(),
			locationPanel?.refreshPanel(),
			phonePanel?.refreshPanel()
		]);
		connectionsComp?.refreshConnections?.();
	}

	export function getBoardSnapshot(): EntitiesBoardSnapshot {
		const panels: EntitiesBoardSnapshot['panels'] = {};
		try {
			panels.PERSON = personPanel?.getPanelState?.();
			panels.VEHICLE = vehiclePanel?.getPanelState?.();
			panels.LOCATION = locationPanel?.getPanelState?.();
			panels.PHONE = phonePanel?.getPanelState?.();
		} catch {
			/* refs not mounted */
		}
		return {
			scrollY: boardScrollEl?.scrollTop ?? 0,
			panels,
			intakeExpanded
		};
	}

	export async function applyBoardSnapshot(snap: EntitiesBoardSnapshot): Promise<void> {
		intakeExpanded = snap.intakeExpanded ?? false;
		const jobs: Promise<void>[] = [];
		const p = snap.panels;
		try {
			if (p.PERSON) jobs.push(personPanel.applyPanelState(p.PERSON));
			if (p.VEHICLE) jobs.push(vehiclePanel.applyPanelState(p.VEHICLE));
			if (p.LOCATION) jobs.push(locationPanel.applyPanelState(p.LOCATION));
			if (p.PHONE) jobs.push(phonePanel.applyPanelState(p.PHONE));
		} catch {
			/* panel refs not ready */
		}
		await Promise.all(jobs);
		await tick();
		if (boardScrollEl) boardScrollEl.scrollTop = snap.scrollY;
	}
</script>

<div
	class="{DS_ENTITY_BOARD_CLASSES.root} entities-overview-board min-h-0 flex flex-col"
	data-testid="entities-overview-board-shell"
>
	<div
		class="{DS_ENTITY_BOARD_CLASSES.scroll} flex-1 min-h-0"
		bind:this={boardScrollEl}
		data-testid="entities-board-scroll"
	>
		<div class="{DS_ENTITY_BOARD_CLASSES.inner}">
			<EntitiesBoardToolbar
				{caseId}
				{caseTitle}
				{caseNumber}
				{intakeExpanded}
				addMenuDisabled={!token}
				onRefreshAll={() => void refreshAllPanels()}
				onAddPerson={() => onAddRequest?.({ entityKind: 'PERSON' })}
				onAddVehicle={() => onAddRequest?.({ entityKind: 'VEHICLE' })}
				onAddLocation={() => onAddRequest?.({ entityKind: 'LOCATION' })}
				onToggleIntake={() => (intakeExpanded = !intakeExpanded)}
			/>

			<div class="{DS_ENTITY_BOARD_CLASSES.divider}" aria-hidden="true"></div>

			<div class="{DS_ENTITY_BOARD_CLASSES.grid} auto-rows-fr [&>*]:min-h-0" data-testid="entities-registry-grid">
				<EntitiesRegistryPanel
					bind:this={personPanel}
					{caseId}
					{token}
					entityKind="PERSON"
					panelMode="live"
					heading="People"
					subheader="Committed people — Case Engine registry; Add registers directly."
					testId="entities-registry-people"
					{refreshNonce}
					{selectedEntityId}
					onRowActivate={handleRowActivate}
					onAddRequest={(d) => onAddRequest?.(d)}
				/>
				<EntitiesRegistryPanel
					bind:this={vehiclePanel}
					{caseId}
					{token}
					entityKind="VEHICLE"
					panelMode="live"
					heading="Vehicles"
					subheader="Committed vehicles — Case Engine registry; Add registers directly."
					testId="entities-registry-vehicles"
					{refreshNonce}
					{selectedEntityId}
					onRowActivate={handleRowActivate}
					onAddRequest={(d) => onAddRequest?.(d)}
				/>
				<EntitiesRegistryPanel
					bind:this={locationPanel}
					{caseId}
					{token}
					entityKind="LOCATION"
					panelMode="live"
					heading="Locations"
					subheader="Committed locations — Case Engine registry; Add registers directly."
					testId="entities-registry-locations"
					{refreshNonce}
					{selectedEntityId}
					onRowActivate={handleRowActivate}
					onAddRequest={(d) => onAddRequest?.(d)}
				/>
				<EntitiesRegistryPanel
					bind:this={phonePanel}
					{caseId}
					{token}
					entityKind="PHONE"
					panelMode={resolvedPhoneMode}
					heading="Phone numbers"
					subheader="Placeholder — no committed phone list here yet (P69-10). For phone evidence focus, use Intelligence mode search, not this column."
					testId="entities-registry-phone"
					{refreshNonce}
					{selectedEntityId}
					onRowActivate={handleRowActivate}
					onAddRequest={(d) => onAddRequest?.(d)}
				/>
			</div>

			<section class="{DS_ENTITY_BOARD_CLASSES.section} space-y-4" data-testid="entities-board-section-connections">
				<p class="{DS_ENTITY_BOARD_CLASSES.sectionLabel}">Association edges</p>
				<EntitiesConnectionsSummary bind:this={connectionsComp} {caseId} {token} />
			</section>

			<section class="mt-10 space-y-3 md:mt-12" data-testid="entities-board-section-intake">
				<p class="{DS_ENTITY_BOARD_CLASSES.sectionLabel}">Proposal &amp; staging</p>
				<EntitiesIntakeSubordinate bind:expanded={intakeExpanded}>
					<div class="space-y-4" data-testid="entities-intake-panels">
						<CaseIntelligenceStage1Panel {caseId} {token} />
						<CaseIntelligenceAssociationsPanel {caseId} {token} />
					</div>
				</EntitiesIntakeSubordinate>
			</section>
		</div>
	</div>
</div>
