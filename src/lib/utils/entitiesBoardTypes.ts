/**
 * P69-07 — Entities overview board: shared types for registries + P69-08 snapshot handoff.
 */
import type { CaseIntelligenceEntityKind } from '$lib/apis/caseEngine';

/** Fourth panel kind; API list/create may be pending (P69-02 §1.14 Mode B). */
export type EntitiesRegistryKind = CaseIntelligenceEntityKind | 'PHONE';

export type EntitiesRegistryPanelMode = 'live' | 'placeholder';

/** Default until P69-10 verifies committed phone registry (P69-04 §3.7). */
export const DEFAULT_PHONE_PANEL_MODE: EntitiesRegistryPanelMode = 'placeholder';

export function resolvePhonePanelMode(
	override?: EntitiesRegistryPanelMode | null
): EntitiesRegistryPanelMode {
	if (override === 'live' || override === 'placeholder') return override;
	return DEFAULT_PHONE_PANEL_MODE;
}

export type EntitiesBoardPanelKey = 'PERSON' | 'VEHICLE' | 'LOCATION' | 'PHONE';

export interface EntitiesBoardPanelState {
	searchQuery: string;
	sortKey: string;
	includeRetired: boolean;
	expanded: boolean;
	scrollTop: number;
}

/** Aligns with P69-05 BoardStateSnapshot for focus restore (P69-08). */
export interface EntitiesBoardSnapshot {
	scrollY: number;
	panels: Partial<Record<EntitiesBoardPanelKey, EntitiesBoardPanelState>>;
	intakeExpanded?: boolean;
}
