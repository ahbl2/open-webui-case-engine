/**
 * P115-04 — Case relationship create (POST) and list (GET); Case Engine is authority.
 */
import { CASE_ENGINE_BASE_URL } from '$lib/constants';

export const CASE_RELATIONSHIP_TYPES = ['RELATED_TO', 'DERIVED_FROM', 'ASSOCIATED_WITH'] as const;
export type CaseRelationshipType = (typeof CASE_RELATIONSHIP_TYPES)[number];

export interface CaseRelationshipRow {
	relationship_id: string;
	case_id: string;
	source_record_type: string;
	source_record_id: string;
	target_record_type: string;
	target_record_id: string;
	relationship_type: string;
	created_at: string;
	created_by: string;
	deleted_at: string | null;
}

function extractApiErrorMessage(data: unknown, fallback: string): string {
	if (data != null && typeof data === 'object') {
		const d = data as Record<string, unknown>;
		if (d.error != null && typeof d.error === 'object' && typeof (d.error as Record<string, unknown>).message === 'string') {
			return (d.error as Record<string, unknown>).message as string;
		}
		if (typeof d.error === 'string') return d.error;
		if (typeof d.message === 'string') return d.message;
	}
	return fallback;
}

export async function listCaseRelationships(caseId: string, token: string): Promise<CaseRelationshipRow[]> {
	const res = await fetch(`${CASE_ENGINE_BASE_URL}/cases/${encodeURIComponent(caseId)}/relationships`, {
		headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
	});
	const data = await res.json().catch(() => ({}));
	if (!res.ok) {
		throw new Error(extractApiErrorMessage(data, `Failed to load relationships (${res.status})`));
	}
	const body = data as { relationships?: unknown };
	if (!Array.isArray(body.relationships)) {
		throw new Error('Invalid relationships response');
	}
	return body.relationships as CaseRelationshipRow[];
}

export async function createCaseRelationship(
	caseId: string,
	token: string,
	body: {
		source_record_type: string;
		source_record_id: string;
		target_record_type: string;
		target_record_id: string;
		relationship_type: CaseRelationshipType;
	}
): Promise<CaseRelationshipRow> {
	const res = await fetch(`${CASE_ENGINE_BASE_URL}/cases/${encodeURIComponent(caseId)}/relationships`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
		body: JSON.stringify(body)
	});
	const data = await res.json().catch(() => ({}));
	if (!res.ok) {
		throw new Error(extractApiErrorMessage(data, `Failed to create relationship (${res.status})`));
	}
	const d = data as { relationship?: CaseRelationshipRow };
	if (!d.relationship) {
		throw new Error('Invalid create relationship response');
	}
	return d.relationship;
}
