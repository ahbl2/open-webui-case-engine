/**
 * P129-02 — GET /cases/:id/activity-events (read-only). UI calls Case Engine only; no client-side event synthesis.
 */
import { CASE_ENGINE_BASE_URL } from '$lib/constants';

function extractApiErrorMessage(data: unknown, fallback: string): string {
	if (data != null && typeof data === 'object') {
		const d = data as Record<string, unknown>;
		if (
			d.error != null &&
			typeof d.error === 'object' &&
			typeof (d.error as Record<string, unknown>).message === 'string'
		) {
			return (d.error as Record<string, unknown>).message as string;
		}
		if (typeof d.error === 'string') return d.error;
		if (typeof d.message === 'string') return d.message;
	}
	return fallback;
}

function unwrapEnvelopeCanonicalFirst<T>(data: unknown, context: string): T {
	if (data == null || typeof data !== 'object') {
		throw new Error(`${context}: invalid response body`);
	}
	const d = data as Record<string, unknown>;
	if (!('success' in d)) {
		return data as T;
	}
	if (d.success === true) {
		if (!('data' in d)) {
			throw new Error(`${context}: invalid envelope (success true but missing data)`);
		}
		return d.data as T;
	}
	if (d.success === false) {
		throw new Error(extractApiErrorMessage(data, `${context} failed`));
	}
	throw new Error(`${context}: invalid envelope (success must be boolean)`);
}

export type CaseActivityEventType =
	| 'proposal_created'
	| 'proposal_accepted'
	| 'proposal_rejected'
	| 'timeline_entry_created'
	| 'workflow_item_created'
	| 'workflow_status_changed'
	| 'entity_created'
	| 'entity_link_created'
	| 'file_uploaded';

export type CaseActivityTargetType =
	| 'proposal'
	| 'timeline_entry'
	| 'case_workflow_item'
	| 'case_workflow_item_version'
	| 'case_entity'
	| 'case_entity_evidence_link'
	| 'case_file';

export interface CaseActivityEvent {
	event_id: string;
	event_type: CaseActivityEventType;
	case_id: string;
	occurred_at: string;
	recorded_at: string;
	actor_user_id: string;
	target_type: CaseActivityTargetType;
	target_id: string;
	metadata?: Record<string, string | number | boolean | null>;
}

export interface ListCaseActivityEventsResult {
	activity_events: CaseActivityEvent[];
	pagination: {
		limit: number;
		offset: number;
		total_count: number;
	};
}

/** Default ordering is newest-first by occurred_at (Case Engine). */
export async function listCaseActivityEvents(
	caseId: string,
	token: string,
	params?: { limit?: number; offset?: number }
): Promise<ListCaseActivityEventsResult> {
	const sp = new URLSearchParams();
	if (params?.limit != null) sp.set('limit', String(params.limit));
	if (params?.offset != null) sp.set('offset', String(params.offset));
	const qs = sp.toString();
	const url = qs
		? `${CASE_ENGINE_BASE_URL}/cases/${encodeURIComponent(caseId)}/activity-events?${qs}`
		: `${CASE_ENGINE_BASE_URL}/cases/${encodeURIComponent(caseId)}/activity-events`;
	const res = await fetch(url, {
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${token}`
		}
	});
	const data = await res.json().catch(() => ({}));
	if (!res.ok) {
		throw new Error(extractApiErrorMessage(data, `Activity events failed (${res.status})`));
	}
	return unwrapEnvelopeCanonicalFirst<ListCaseActivityEventsResult>(data, 'listCaseActivityEvents');
}
