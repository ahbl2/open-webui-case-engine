/**
 * P118-04 — Case Engine read-only navigation resolution (`/cases/:id/navigation/*`).
 */
import { CASE_ENGINE_BASE_URL } from '$lib/constants';
import { safeReadFetch } from '$lib/apis/caseEngine/retryPolicy';
import type { CaseQueryCitation } from '$lib/apis/caseEngine/caseQueryApi';
import type { CitationNavigationResult } from '$lib/case/p118CitationNavigationTypes';

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

export async function postCaseCitationNavigation(
	caseId: string,
	token: string,
	body: { citation: CaseQueryCitation; enforce_envelope_case_id?: string }
): Promise<CitationNavigationResult> {
	const doFetch = () =>
		fetch(`${CASE_ENGINE_BASE_URL}/cases/${encodeURIComponent(caseId)}/navigation/citation`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${token}`
			},
			body: JSON.stringify(body)
		});

	const res = await safeReadFetch(doFetch, 'postCaseCitationNavigation');
	const data = await res.json().catch(() => ({}));
	if (!res.ok) {
		throw new Error(extractApiErrorMessage(data, `Citation navigation failed (${res.status})`));
	}
	const unwrapped = unwrapEnvelopeCanonicalFirst<{ navigation: CitationNavigationResult }>(
		data,
		'postCaseCitationNavigation'
	);
	return unwrapped.navigation;
}

/** P118-02 single-hop related record navigation result (mirrors Case Engine). */
export type RelatedRecordNavigationResult =
	| {
			ok: true;
			case_id: string;
			source_kind: string;
			source_record_id: string;
			source_navigation: CitationNavigationResult;
			candidates: Array<{
				relationship_id: string;
				relationship_type: string;
				source_record_type: string;
				source_record_id: string;
				target_record_type: string;
				target_record_id: string;
				navigation: CitationNavigationResult;
			}>;
	  }
	| {
			ok: false;
			case_id: string;
			reason_code: 'MISSING_CASE_CONTEXT' | 'INVALID_SOURCE' | 'SOURCE_RECORD_NOT_AVAILABLE';
			message?: string;
	  };

export async function postCaseRelatedRecordNavigation(
	caseId: string,
	token: string,
	body: { source_kind: string; source_record_id: string }
): Promise<RelatedRecordNavigationResult> {
	const doFetch = () =>
		fetch(`${CASE_ENGINE_BASE_URL}/cases/${encodeURIComponent(caseId)}/navigation/related-records`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${token}`
			},
			body: JSON.stringify(body)
		});

	const res = await safeReadFetch(doFetch, 'postCaseRelatedRecordNavigation');
	const data = await res.json().catch(() => ({}));
	if (!res.ok) {
		throw new Error(extractApiErrorMessage(data, `Related record navigation failed (${res.status})`));
	}
	return unwrapEnvelopeCanonicalFirst<RelatedRecordNavigationResult>(data, 'postCaseRelatedRecordNavigation');
}
