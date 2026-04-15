/**
 * P119-04 — POST /cases/:id/export/p119 (Case Engine deterministic export).
 */
import { CASE_ENGINE_BASE_URL } from '$lib/constants';

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

export type CaseP119ExportResult = {
	format: 'json' | 'plain_text';
	body: string;
};

/** Read-only export; mutating retry policy not used (explicit user action). */
export async function postCaseP119Export(
	caseId: string,
	token: string,
	payload: {
		inclusion: Record<string, boolean>;
		format: 'json' | 'plain_text';
		/** Phase 120 template (plain_text only); omit for P119-only plain text. */
		template?: 'RAW_EXPORT' | 'CHRONOLOGICAL_REPORT' | 'TIMELINE_WITH_NOTES';
	}
): Promise<CaseP119ExportResult> {
	const bodyObj: Record<string, unknown> = {
		inclusion: payload.inclusion,
		format: payload.format
	};
	if (payload.template != null) {
		bodyObj.template = payload.template;
	}
	const res = await fetch(
		`${CASE_ENGINE_BASE_URL}/cases/${encodeURIComponent(caseId)}/export/p119`,
		{
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${token}`
			},
			body: JSON.stringify(bodyObj)
		}
	);
	const data = await res.json().catch(() => ({}));
	if (!res.ok) {
		throw new Error(extractApiErrorMessage(data, `Export failed (${res.status})`));
	}
	return unwrapEnvelopeCanonicalFirst<CaseP119ExportResult>(data, 'postCaseP119Export');
}
