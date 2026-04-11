import type { CaseIntelligenceCommittedEntity } from '$lib/apis/caseEngine';
import { CASE_DESTINATION_LABELS } from '$lib/utils/caseDestinationLabels';
import { pickAttrString } from '$lib/utils/caseIntelligenceEntityRegistry';

/** Route segment types for `/intelligence/entity/[type]/[value]` (UI deep links). */
export type EntityFocusType = 'phone' | 'person' | 'location' | 'vehicle';

export interface EntityFocusEvidenceRow {
	case: { id: string; case_number: string; title: string; unit: string };
	source: { kind: string; id: string; occurred_at?: string };
	match: { excerpt: string };
	citation: { label: string; case_id: string; source_kind: string; source_id: string };
}

export function isSupportedEntityFocusType(type: string): type is EntityFocusType {
	const t = type.trim().toLowerCase();
	return t === 'phone' || t === 'person' || t === 'location' || t === 'vehicle';
}

/**
 * Types accepted by Case Engine `getEntityProfile` / `getEntityTimeline` / `getEntityCases`
 * for evidence-grounded entity focus (P78-09 — vehicle route exists in UI only).
 */
export function entityFocusEvidenceBackendSupportsRouteType(type: string): boolean {
	const t = type.trim().toLowerCase();
	return t === 'phone' || t === 'person' || t === 'location';
}

export type CommittedEntityEvidenceFocusGate =
	| { outcome: 'navigate'; href: string }
	| { outcome: 'vehicle_unsupported' }
	| { outcome: 'missing_normalized' };

export function committedEntityEvidenceFocusGate(
	ent: CaseIntelligenceCommittedEntity
): CommittedEntityEvidenceFocusGate {
	if (ent.entity_kind === 'VEHICLE') return { outcome: 'vehicle_unsupported' };
	const a = ent.core_attributes ?? {};
	const norm =
		pickAttrString(a, ['normalized_id', 'entity_normalized_id', 'normalized_value', 'canonical_key'])?.trim() ??
		'';
	if (!norm) return { outcome: 'missing_normalized' };
	const routeType = ent.entity_kind === 'PERSON' ? 'person' : ent.entity_kind === 'LOCATION' ? 'location' : null;
	if (!routeType) return { outcome: 'missing_normalized' };
	const href = buildEntityFocusHref({ caseId: ent.case_id, type: routeType, normalizedValue: norm });
	if (!href) return { outcome: 'missing_normalized' };
	return { outcome: 'navigate', href };
}

export function buildEntityFocusHref(input: {
	caseId: string;
	type: string;
	normalizedValue: string;
	scope?: 'THIS_CASE' | 'CID' | 'SIU' | 'ALL';
}): string | null {
	const { caseId, type, normalizedValue, scope } = input;
	if (!caseId || !normalizedValue || !isSupportedEntityFocusType(type)) return null;
	const routeType = type.trim().toLowerCase();
	const base = `/case/${caseId}/intelligence/entity/${routeType}/${encodeURIComponent(normalizedValue)}`;
	if (scope) {
		return `${base}?scope=${encodeURIComponent(scope)}`;
	}
	return base;
}

export function splitEntityEvidenceByCase(
	evidence: EntityFocusEvidenceRow[],
	currentCaseId: string
): {
	currentCaseEvidence: EntityFocusEvidenceRow[];
	otherCaseEvidence: EntityFocusEvidenceRow[];
} {
	const currentCaseEvidence = evidence.filter((row) => row.case.id === currentCaseId);
	const otherCaseEvidence = evidence.filter((row) => row.case.id !== currentCaseId);
	return { currentCaseEvidence, otherCaseEvidence };
}

/** Heuristic for UI hints only — not validation. */
export function looksLikePhoneDigitsQuery(q: string): boolean {
	const d = q.replace(/\D/g, '');
	return d.length >= 10 && d.length <= 15;
}

/**
 * Primary control label for entity evidence focus links (P78-12 — phone path clarity).
 */
export function entityEvidenceFocusControlLabel(entityType: string | undefined | null): string {
	const t = String(entityType ?? '').trim().toLowerCase();
	if (t === 'phone') return 'Phone evidence focus';
	return CASE_DESTINATION_LABELS.entityIntelligenceFocusDrillDown;
}

