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
	class="entities-overview-board min-h-0 flex flex-col text-slate-100 [background:radial-gradient(120%_80%_at_50%_-10%,rgba(14,165,233,0.08),transparent_55%),linear-gradient(to_bottom,rgb(2,6,23),rgb(15,23,42))]"
	data-testid="entities-overview-board-shell"
>
	<div
		class="flex-1 min-h-0 overflow-y-auto overflow-x-hidden"
		bind:this={boardScrollEl}
		data-testid="entities-board-scroll"
	>
		<div class="max-w-[1600px] mx-auto px-4 md:px-8 pb-16 pt-4">
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

			<div
				class="h-px w-full bg-gradient-to-r from-transparent via-slate-600/40 to-transparent mb-9 md:mb-11"
				aria-hidden="true"
			></div>

			<div
				class="grid grid-cols-1 lg:grid-cols-2 gap-7 lg:gap-8 auto-rows-fr [&>*]:min-h-0"
				data-testid="entities-registry-grid"
			>
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
					subheader="Fourth registry — gated until Case Engine exposes committed phone list/create (P69-10)."
					testId="entities-registry-phone"
					{refreshNonce}
					{selectedEntityId}
					onRowActivate={handleRowActivate}
					onAddRequest={(d) => onAddRequest?.(d)}
				/>
			</div>

			<section class="mt-14 md:mt-16 pt-6 border-t border-slate-800/60 space-y-4" data-testid="entities-board-section-connections">
				<p class="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500 px-0.5">Association edges</p>
				<EntitiesConnectionsSummary bind:this={connectionsComp} {caseId} {token} />
			</section>

			<section class="mt-10 md:mt-12 space-y-3" data-testid="entities-board-section-intake">
				<p class="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500 px-0.5">Proposal &amp; staging</p>
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
