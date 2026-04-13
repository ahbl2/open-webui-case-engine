/**
 * P109-03 — Evidence sets (Case Engine): list + create. Mutating POST uses plain fetch (no safe-read retry).
 * P109-04 — GET single set with items (read-only detail).
 * P110-01 — GET expanded: resolved timeline + file rows (read-only; deterministic order on server).
 */
import { CASE_ENGINE_BASE_URL } from '$lib/constants';
import { safeReadFetch } from '$lib/apis/caseEngine/retryPolicy';

function newRequestId(): string {
	if (typeof globalThis.crypto !== 'undefined' && typeof globalThis.crypto.randomUUID === 'function') {
		return globalThis.crypto.randomUUID();
	}
	return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

function responseRequestId(res: Response): string | undefined {
	return res.headers.get('x-request-id') ?? res.headers.get('X-Request-Id') ?? undefined;
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

/** P20-PRE-02 envelope unwrap (same rules as `caseEntitiesApi.ts`). */
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

export interface CaseEngineEvidenceSet {
	id: string;
	case_id: string;
	name: string;
	created_by: string;
	created_at: string;
	updated_at: string;
	deleted_at: string | null;
}

export interface CaseEngineEvidenceSetItem {
	id: string;
	evidence_set_id: string;
	case_id: string;
	item_kind: 'timeline_entry' | 'file';
	source_id: string;
	created_at: string;
}

export interface CaseEngineEvidenceSetWithItems extends CaseEngineEvidenceSet {
	items: CaseEngineEvidenceSetItem[];
}

/** Slim set metadata returned by expansion (no updated_at / deleted_at). */
export interface CaseEngineEvidenceSetExpandedMeta {
	id: string;
	case_id: string;
	name: string;
	created_at: string;
	created_by: string;
}

export interface CaseEngineExpandedTimelineEntry {
	source_id: string;
	occurred_at: string;
	created_at: string;
	created_by: string;
	type: string;
	text_original: string;
}

export interface CaseEngineExpandedCaseFile {
	source_id: string;
	original_filename: string;
	mime_type: string | null;
	uploaded_by: string;
	uploaded_at: string;
	created_at: string;
}

export interface CaseEngineEvidenceSetExpanded {
	evidence_set: CaseEngineEvidenceSetExpandedMeta;
	timeline_entries: CaseEngineExpandedTimelineEntry[];
	files: CaseEngineExpandedCaseFile[];
	membership: Array<{ item_kind: 'timeline_entry' | 'file'; source_id: string }>;
}

function assertExpandedShape(body: CaseEngineEvidenceSetExpanded, caseId: string, setId: string): void {
	const cid = String(caseId ?? '').trim();
	const sid = String(setId ?? '').trim();
	const ev = body.evidence_set;
	if (!ev?.id || String(ev.case_id) !== cid || ev.id !== sid) {
		throw new Error('Evidence set expanded response mismatch');
	}
	if (!Array.isArray(body.timeline_entries) || !Array.isArray(body.files) || !Array.isArray(body.membership)) {
		throw new Error('Invalid evidence set expanded response');
	}
}

export async function getEvidenceSetsList(caseId: string, token: string): Promise<CaseEngineEvidenceSet[]> {
	const cid = String(caseId ?? '').trim();
	if (!cid) {
		throw new Error('Case id is required');
	}
	if (!token) {
		throw new Error('Token is required');
	}
	const outboundRequestId = newRequestId();
	const doFetch = () =>
		fetch(`${CASE_ENGINE_BASE_URL}/cases/${encodeURIComponent(cid)}/evidence-sets`, {
			method: 'GET',
			headers: {
				Authorization: `Bearer ${token}`,
				'X-Request-Id': outboundRequestId
			}
		});

	const res = await safeReadFetch(doFetch, 'getEvidenceSetsList');
	const data = await res.json().catch(() => ({}));
	const correlator = responseRequestId(res) ?? outboundRequestId;

	if (!res.ok) {
		throw new Error(extractApiErrorMessage(data, `Could not load evidence sets (${res.status})`));
	}

	try {
		const body = unwrapEnvelopeCanonicalFirst<{ evidence_sets: CaseEngineEvidenceSet[] }>(
			data,
			'getEvidenceSetsList'
		);
		const raw = Array.isArray(body.evidence_sets) ? body.evidence_sets : [];
		return raw.filter((e) => String(e.case_id) === cid);
	} catch (e) {
		const m = e instanceof Error ? e.message : String(e);
		throw new Error(`${m} (requestId: ${correlator})`);
	}
}

/**
 * GET `/cases/:caseId/evidence-sets/:setId` — one set with membership. Returns `null` when not found (404).
 */
export async function getEvidenceSetDetail(
	caseId: string,
	setId: string,
	token: string
): Promise<CaseEngineEvidenceSetWithItems | null> {
	const cid = String(caseId ?? '').trim();
	const sid = String(setId ?? '').trim();
	if (!cid || !sid) {
		throw new Error('Case id and set id are required');
	}
	if (!token) {
		throw new Error('Token is required');
	}
	const outboundRequestId = newRequestId();
	const doFetch = () =>
		fetch(
			`${CASE_ENGINE_BASE_URL}/cases/${encodeURIComponent(cid)}/evidence-sets/${encodeURIComponent(sid)}`,
			{
				method: 'GET',
				headers: {
					Authorization: `Bearer ${token}`,
					'X-Request-Id': outboundRequestId
				}
			}
		);

	const res = await safeReadFetch(doFetch, 'getEvidenceSetDetail');
	const data = await res.json().catch(() => ({}));
	const correlator = responseRequestId(res) ?? outboundRequestId;

	if (res.status === 404) {
		return null;
	}
	if (!res.ok) {
		throw new Error(extractApiErrorMessage(data, `Could not load evidence set (${res.status})`));
	}

	try {
		const body = unwrapEnvelopeCanonicalFirst<{ evidence_set: CaseEngineEvidenceSetWithItems }>(
			data,
			'getEvidenceSetDetail'
		);
		const ev = body.evidence_set;
		if (!ev?.id || !Array.isArray(ev.items)) {
			throw new Error('Invalid evidence set detail response');
		}
		if (String(ev.case_id) !== cid || ev.id !== sid) {
			throw new Error('Evidence set detail case mismatch');
		}
		return ev;
	} catch (e) {
		const m = e instanceof Error ? e.message : String(e);
		throw new Error(`${m} (requestId: ${correlator})`);
	}
}

export async function createEvidenceSet(
	caseId: string,
	token: string,
	body: {
		name: string;
		items: Array<{ kind: 'timeline_entry' | 'file'; source_id: string }>;
	}
): Promise<CaseEngineEvidenceSetWithItems> {
	const cid = String(caseId ?? '').trim();
	if (!cid) {
		throw new Error('Case id is required');
	}
	if (!token) {
		throw new Error('Token is required');
	}
	const res = await fetch(`${CASE_ENGINE_BASE_URL}/cases/${encodeURIComponent(cid)}/evidence-sets`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${token}`
		},
		body: JSON.stringify(body)
	});
	const data = await res.json().catch(() => ({}));
	if (!res.ok) {
		throw new Error(extractApiErrorMessage(data, `Could not create evidence set (${res.status})`));
	}
	const raw = data as { evidence_set?: CaseEngineEvidenceSetWithItems };
	if (!raw.evidence_set?.id || !Array.isArray(raw.evidence_set.items)) {
		throw new Error('Invalid create evidence set response');
	}
	return raw.evidence_set;
}

/**
 * GET `/cases/:caseId/evidence-sets/:setId/expanded` — resolved source rows. Returns `null` on 422 is not used; 422 throws.
 * Returns `null` when not found (404).
 */
export async function getEvidenceSetExpanded(
	caseId: string,
	setId: string,
	token: string
): Promise<CaseEngineEvidenceSetExpanded | null> {
	const cid = String(caseId ?? '').trim();
	const sid = String(setId ?? '').trim();
	if (!cid || !sid) {
		throw new Error('Case id and set id are required');
	}
	if (!token) {
		throw new Error('Token is required');
	}
	const outboundRequestId = newRequestId();
	const doFetch = () =>
		fetch(
			`${CASE_ENGINE_BASE_URL}/cases/${encodeURIComponent(cid)}/evidence-sets/${encodeURIComponent(sid)}/expanded`,
			{
				method: 'GET',
				headers: {
					Authorization: `Bearer ${token}`,
					'X-Request-Id': outboundRequestId
				}
			}
		);

	const res = await safeReadFetch(doFetch, 'getEvidenceSetExpanded');
	const data = await res.json().catch(() => ({}));
	const correlator = responseRequestId(res) ?? outboundRequestId;

	if (res.status === 404) {
		return null;
	}
	if (res.status === 422) {
		throw new Error(extractApiErrorMessage(data, 'This set cannot be expanded right now (422)'));
	}
	if (!res.ok) {
		throw new Error(extractApiErrorMessage(data, `Could not load expanded evidence set (${res.status})`));
	}

	try {
		const body = unwrapEnvelopeCanonicalFirst<CaseEngineEvidenceSetExpanded>(data, 'getEvidenceSetExpanded');
		assertExpandedShape(body, cid, sid);
		return body;
	} catch (e) {
		const m = e instanceof Error ? e.message : String(e);
		throw new Error(`${m} (requestId: ${correlator})`);
	}
}

/**
 * P111-04 — GET binary export (DOCX). No JSON body; no client-side payload construction.
 * Uses plain `fetch` (no safe-read auto-retry) per export UX contract.
 */
export async function fetchEvidenceSetExportDocx(
	caseId: string,
	setId: string,
	token: string
): Promise<Blob> {
	const cid = String(caseId ?? '').trim();
	const sid = String(setId ?? '').trim();
	if (!cid || !sid) {
		throw new Error('Case id and set id are required');
	}
	if (!token) {
		throw new Error('Token is required');
	}
	const outboundRequestId = newRequestId();
	const res = await fetch(
		`${CASE_ENGINE_BASE_URL}/cases/${encodeURIComponent(cid)}/evidence-sets/${encodeURIComponent(sid)}/export/docx`,
		{
			method: 'GET',
			headers: {
				Authorization: `Bearer ${token}`,
				'X-Request-Id': outboundRequestId
			}
		}
	);
	if (!res.ok) {
		const data = await res.json().catch(() => ({}));
		const correlator = responseRequestId(res) ?? outboundRequestId;
		throw new Error(`${extractApiErrorMessage(data, `DOCX export failed (${res.status})`)} (requestId: ${correlator})`);
	}
	return res.blob();
}

/**
 * P111-04 — GET binary export (PDF). No JSON body; no client-side payload construction.
 */
export async function fetchEvidenceSetExportPdf(
	caseId: string,
	setId: string,
	token: string
): Promise<Blob> {
	const cid = String(caseId ?? '').trim();
	const sid = String(setId ?? '').trim();
	if (!cid || !sid) {
		throw new Error('Case id and set id are required');
	}
	if (!token) {
		throw new Error('Token is required');
	}
	const outboundRequestId = newRequestId();
	const res = await fetch(
		`${CASE_ENGINE_BASE_URL}/cases/${encodeURIComponent(cid)}/evidence-sets/${encodeURIComponent(sid)}/export/pdf`,
		{
			method: 'GET',
			headers: {
				Authorization: `Bearer ${token}`,
				'X-Request-Id': outboundRequestId
			}
		}
	);
	if (!res.ok) {
		const data = await res.json().catch(() => ({}));
		const correlator = responseRequestId(res) ?? outboundRequestId;
		throw new Error(`${extractApiErrorMessage(data, `PDF export failed (${res.status})`)} (requestId: ${correlator})`);
	}
	return res.blob();
}
