/**
 * P101 — Phase 101 `case_proposals` (JWT manual create). No legacy `proposal_records`.
 */
import { CASE_ENGINE_BASE_URL } from '$lib/constants';

function extractError(data: unknown, fallback: string): string {
	if (data != null && typeof data === 'object') {
		const d = data as Record<string, unknown>;
		if (typeof d.error === 'string') return d.error;
		if (typeof d.message === 'string') return d.message;
	}
	return fallback;
}

export interface CaseProposalCreateResponse {
	id: string;
	case_id: string;
	proposal_type: string;
	lifecycle_state: string;
	payload: unknown;
	source_refs: unknown[] | null;
	created_by: string;
	created_at: string;
	updated_at: string;
	version_number: number;
	creation_mode: string;
}

export async function createCaseProposalManual(
	caseId: string,
	token: string,
	body: {
		creation_mode: 'manual';
		proposal_type: 'timeline_entry' | 'task';
		payload: Record<string, unknown>;
		source_refs?: unknown[] | null;
	}
): Promise<CaseProposalCreateResponse> {
	const res = await fetch(
		`${CASE_ENGINE_BASE_URL}/cases/${encodeURIComponent(caseId)}/case-proposals`,
		{
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${token}`
			},
			body: JSON.stringify(body)
		}
	);
	const data = await res.json().catch(() => ({}));
	if (!res.ok) {
		throw new Error(extractError(data, `Failed to create proposal (${res.status})`));
	}
	const raw = data as { case_proposal?: CaseProposalCreateResponse };
	if (!raw.case_proposal?.id) {
		throw new Error('Invalid create proposal response');
	}
	return raw.case_proposal;
}
