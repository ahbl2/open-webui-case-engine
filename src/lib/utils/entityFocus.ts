export type EntityFocusType = 'phone' | 'person' | 'location';

export interface EntityFocusEvidenceRow {
	case: { id: string; case_number: string; title: string; unit: string };
	source: { kind: string; id: string; occurred_at?: string };
	match: { excerpt: string };
	citation: { label: string; case_id: string; source_kind: string; source_id: string };
}

export function isSupportedEntityFocusType(type: string): type is EntityFocusType {
	return type === 'phone' || type === 'person' || type === 'location';
}

export function buildEntityFocusHref(input: {
	caseId: string;
	type: string;
	normalizedValue: string;
	scope?: 'THIS_CASE' | 'CID' | 'SIU' | 'ALL';
}): string | null {
	const { caseId, type, normalizedValue, scope } = input;
	if (!caseId || !normalizedValue || !isSupportedEntityFocusType(type)) return null;
	const base = `/case/${caseId}/intelligence/entity/${type}/${encodeURIComponent(normalizedValue)}`;
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

