/**
 * P106-02 / P106-03 — Case entities read APIs (GET).
 * P107-01 — Create (POST) and update (PATCH).
 * P107-02 — Retire/restore (POST lifecycle).
 * P107-03 — Evidence link create/remove (Phase 105) reuse existing contracts; no client-side persistence.
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

/** P20-PRE-02 envelope unwrap (same rules as `caseQueryApi.ts`). */
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

/** Mirrors Case Engine `CaseEntityResponse` (read surface). */
export interface CaseEngineCaseEntity {
	id: string;
	case_id: string;
	entity_type: string;
	display_label: string;
	attributes: Record<string, unknown>;
	created_at: string;
	created_by: string;
	updated_at: string;
	updated_by: string | null;
	deleted_at: string | null;
	deleted_by: string | null;
}

/**
 * GET `/cases/:id/case-entities` — list active entities by default; optional `includeRetired`.
 * Returns rows in **server order** (do not re-sort client-side).
 */
export async function getCaseEntitiesList(
	caseId: string,
	token: string,
	options?: { includeRetired?: boolean }
): Promise<CaseEngineCaseEntity[]> {
	const cid = String(caseId ?? '').trim();
	if (!cid) {
		throw new Error('Case id is required');
	}
	if (!token) {
		throw new Error('Token is required');
	}
	const q = options?.includeRetired === true ? '?include_retired=1' : '';
	const outboundRequestId = newRequestId();
	const doFetch = () =>
		fetch(`${CASE_ENGINE_BASE_URL}/cases/${encodeURIComponent(cid)}/case-entities${q}`, {
			method: 'GET',
			headers: {
				Authorization: `Bearer ${token}`,
				'X-Request-Id': outboundRequestId
			}
		});

	const res = await safeReadFetch(doFetch, 'getCaseEntitiesList');
	const data = await res.json().catch(() => ({}));
	const correlator = responseRequestId(res) ?? outboundRequestId;

	if (!res.ok) {
		throw new Error(extractApiErrorMessage(data, `Could not load entities (${res.status})`));
	}

	try {
		const body = unwrapEnvelopeCanonicalFirst<{ case_entities: CaseEngineCaseEntity[] }>(
			data,
			'getCaseEntitiesList'
		);
		const raw = Array.isArray(body.case_entities) ? body.case_entities : [];
		return raw.filter((e) => String(e.case_id) === cid);
	} catch (e) {
		const m = e instanceof Error ? e.message : String(e);
		throw new Error(`${m} (requestId: ${correlator})`);
	}
}

/** Evidence link row from detail/read-model (display labels only). */
export interface CaseEngineEvidenceLinkReadItem {
	id: string;
	case_id: string;
	case_entity_id: string;
	link_type: 'timeline_entry' | 'case_file';
	target_id: string;
	created_at: string;
	created_by: string;
	deleted_at: string | null;
	deleted_by: string | null;
	target_label: string | null;
	target_status: 'active' | 'unavailable';
}

export interface CaseEngineCaseEntityDetail {
	case_entity: CaseEngineCaseEntity;
	evidence_links: CaseEngineEvidenceLinkReadItem[];
}

/**
 * GET `/cases/:id/case-entities/:entityId` — entity + active evidence links (server order; do not re-sort client-side).
 */
export async function getCaseEntityDetail(
	caseId: string,
	entityId: string,
	token: string,
	options?: { includeRetired?: boolean }
): Promise<CaseEngineCaseEntityDetail> {
	const cid = String(caseId ?? '').trim();
	const eid = String(entityId ?? '').trim();
	if (!cid || !eid) {
		throw new Error('Case id and entity id are required');
	}
	if (!token) {
		throw new Error('Token is required');
	}
	const q = options?.includeRetired === true ? '?include_retired=1' : '';
	const outboundRequestId = newRequestId();
	const doFetch = () =>
		fetch(
			`${CASE_ENGINE_BASE_URL}/cases/${encodeURIComponent(cid)}/case-entities/${encodeURIComponent(eid)}${q}`,
			{
				method: 'GET',
				headers: {
					Authorization: `Bearer ${token}`,
					'X-Request-Id': outboundRequestId
				}
			}
		);

	const res = await safeReadFetch(doFetch, 'getCaseEntityDetail');
	const data = await res.json().catch(() => ({}));
	const correlator = responseRequestId(res) ?? outboundRequestId;

	if (!res.ok) {
		throw new Error(extractApiErrorMessage(data, `Could not load entity (${res.status})`));
	}

	try {
		const body = unwrapEnvelopeCanonicalFirst<{ case_entity: CaseEngineCaseEntity; evidence_links: unknown }>(
			data,
			'getCaseEntityDetail'
		);
		const ce = body.case_entity;
		if (!ce || String(ce.case_id) !== cid || String(ce.id) !== eid) {
			throw new Error('Case Engine response did not match this entity');
		}
		const rawLinks = Array.isArray(body.evidence_links) ? body.evidence_links : [];
		const evidence_links = rawLinks.filter(
			(x) =>
				x != null &&
				typeof x === 'object' &&
				String((x as CaseEngineEvidenceLinkReadItem).case_id) === cid &&
				String((x as CaseEngineEvidenceLinkReadItem).case_entity_id) === eid
		) as CaseEngineEvidenceLinkReadItem[];
		return { case_entity: ce, evidence_links };
	} catch (e) {
		const m = e instanceof Error ? e.message : String(e);
		throw new Error(`${m} (requestId: ${correlator})`);
	}
}

export interface CaseEntityCreatePayload {
	entity_type: string;
	display_label: string;
	/** Defaults to `{}` when omitted on the wire. */
	attributes?: Record<string, unknown>;
}

/**
 * POST `/cases/:id/case-entities` — create entity (Phase 105). Mutating: plain `fetch` (no safe-read retry).
 */
export async function createCaseEntity(
	caseId: string,
	token: string,
	payload: CaseEntityCreatePayload
): Promise<CaseEngineCaseEntity> {
	const cid = String(caseId ?? '').trim();
	if (!cid) {
		throw new Error('Case id is required');
	}
	if (!token) {
		throw new Error('Token is required');
	}
	const body: Record<string, unknown> = {
		entity_type: payload.entity_type,
		display_label: payload.display_label,
		attributes: payload.attributes ?? {}
	};
	const outboundRequestId = newRequestId();
	const res = await fetch(`${CASE_ENGINE_BASE_URL}/cases/${encodeURIComponent(cid)}/case-entities`, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${token}`,
			'Content-Type': 'application/json',
			'X-Request-Id': outboundRequestId
		},
		body: JSON.stringify(body)
	});
	const data = await res.json().catch(() => ({}));
	const correlator = responseRequestId(res) ?? outboundRequestId;

	if (!res.ok) {
		throw new Error(extractApiErrorMessage(data, `Could not create entity (${res.status})`));
	}

	try {
		const unwrapped = unwrapEnvelopeCanonicalFirst<{ case_entity: CaseEngineCaseEntity }>(
			data,
			'createCaseEntity'
		);
		const ce = unwrapped.case_entity;
		if (!ce || String(ce.case_id) !== cid) {
			throw new Error('Case Engine response did not match this case');
		}
		return ce;
	} catch (e) {
		const m = e instanceof Error ? e.message : String(e);
		throw new Error(`${m} (requestId: ${correlator})`);
	}
}

export interface CaseEntityPatchPayload {
	entity_type?: string;
	display_label?: string;
	attributes?: Record<string, unknown>;
}

/**
 * PATCH `/cases/:id/case-entities/:entityId` — update entity (Phase 105). Mutating: plain `fetch`.
 */
export async function patchCaseEntity(
	caseId: string,
	entityId: string,
	token: string,
	payload: CaseEntityPatchPayload
): Promise<{ case_entity: CaseEngineCaseEntity; mutated: boolean }> {
	const cid = String(caseId ?? '').trim();
	const eid = String(entityId ?? '').trim();
	if (!cid || !eid) {
		throw new Error('Case id and entity id are required');
	}
	if (!token) {
		throw new Error('Token is required');
	}
	const keys = Object.keys(payload);
	if (keys.length === 0) {
		throw new Error('At least one field is required');
	}
	const body: Record<string, unknown> = {};
	if (payload.entity_type !== undefined) body.entity_type = payload.entity_type;
	if (payload.display_label !== undefined) body.display_label = payload.display_label;
	if (payload.attributes !== undefined) body.attributes = payload.attributes;

	const outboundRequestId = newRequestId();
	const res = await fetch(
		`${CASE_ENGINE_BASE_URL}/cases/${encodeURIComponent(cid)}/case-entities/${encodeURIComponent(eid)}`,
		{
			method: 'PATCH',
			headers: {
				Authorization: `Bearer ${token}`,
				'Content-Type': 'application/json',
				'X-Request-Id': outboundRequestId
			},
			body: JSON.stringify(body)
		}
	);
	const data = await res.json().catch(() => ({}));
	const correlator = responseRequestId(res) ?? outboundRequestId;

	if (!res.ok) {
		throw new Error(extractApiErrorMessage(data, `Could not update entity (${res.status})`));
	}

	try {
		const unwrapped = unwrapEnvelopeCanonicalFirst<{
			case_entity: CaseEngineCaseEntity;
			mutated?: boolean;
		}>(data, 'patchCaseEntity');
		const ce = unwrapped.case_entity;
		if (!ce || String(ce.case_id) !== cid || String(ce.id) !== eid) {
			throw new Error('Case Engine response did not match this entity');
		}
		return { case_entity: ce, mutated: unwrapped.mutated === true };
	} catch (e) {
		const m = e instanceof Error ? e.message : String(e);
		throw new Error(`${m} (requestId: ${correlator})`);
	}
}

/** Phase 105 lifecycle POST bodies must be an empty JSON object (no client-controlled fields). */
const LIFECYCLE_POST_BODY = '{}';

/**
 * POST `/cases/:id/case-entities/:entityId/retire` — soft-retire entity. Mutating: plain `fetch`.
 */
export async function retireCaseEntity(
	caseId: string,
	entityId: string,
	token: string
): Promise<CaseEngineCaseEntity> {
	const cid = String(caseId ?? '').trim();
	const eid = String(entityId ?? '').trim();
	if (!cid || !eid) {
		throw new Error('Case id and entity id are required');
	}
	if (!token) {
		throw new Error('Token is required');
	}
	const outboundRequestId = newRequestId();
	const res = await fetch(
		`${CASE_ENGINE_BASE_URL}/cases/${encodeURIComponent(cid)}/case-entities/${encodeURIComponent(eid)}/retire`,
		{
			method: 'POST',
			headers: {
				Authorization: `Bearer ${token}`,
				'Content-Type': 'application/json',
				'X-Request-Id': outboundRequestId
			},
			body: LIFECYCLE_POST_BODY
		}
	);
	const data = await res.json().catch(() => ({}));
	const correlator = responseRequestId(res) ?? outboundRequestId;

	if (!res.ok) {
		throw new Error(extractApiErrorMessage(data, `Could not retire entity (${res.status})`));
	}

	try {
		const unwrapped = unwrapEnvelopeCanonicalFirst<{ case_entity: CaseEngineCaseEntity }>(data, 'retireCaseEntity');
		const ce = unwrapped.case_entity;
		if (!ce || String(ce.case_id) !== cid || String(ce.id) !== eid) {
			throw new Error('Case Engine response did not match this entity');
		}
		return ce;
	} catch (e) {
		const m = e instanceof Error ? e.message : String(e);
		throw new Error(`${m} (requestId: ${correlator})`);
	}
}

/**
 * POST `/cases/:id/case-entities/:entityId/restore` — restore retired entity. Mutating: plain `fetch`.
 */
export async function restoreCaseEntity(
	caseId: string,
	entityId: string,
	token: string
): Promise<CaseEngineCaseEntity> {
	const cid = String(caseId ?? '').trim();
	const eid = String(entityId ?? '').trim();
	if (!cid || !eid) {
		throw new Error('Case id and entity id are required');
	}
	if (!token) {
		throw new Error('Token is required');
	}
	const outboundRequestId = newRequestId();
	const res = await fetch(
		`${CASE_ENGINE_BASE_URL}/cases/${encodeURIComponent(cid)}/case-entities/${encodeURIComponent(eid)}/restore`,
		{
			method: 'POST',
			headers: {
				Authorization: `Bearer ${token}`,
				'Content-Type': 'application/json',
				'X-Request-Id': outboundRequestId
			},
			body: LIFECYCLE_POST_BODY
		}
	);
	const data = await res.json().catch(() => ({}));
	const correlator = responseRequestId(res) ?? outboundRequestId;

	if (!res.ok) {
		throw new Error(extractApiErrorMessage(data, `Could not restore entity (${res.status})`));
	}

	try {
		const unwrapped = unwrapEnvelopeCanonicalFirst<{ case_entity: CaseEngineCaseEntity }>(
			data,
			'restoreCaseEntity'
		);
		const ce = unwrapped.case_entity;
		if (!ce || String(ce.case_id) !== cid || String(ce.id) !== eid) {
			throw new Error('Case Engine response did not match this entity');
		}
		return ce;
	} catch (e) {
		const m = e instanceof Error ? e.message : String(e);
		throw new Error(`${m} (requestId: ${correlator})`);
	}
}

/** Raw evidence link row from create/remove responses (matches Case Engine `CaseEntityEvidenceLinkResponse`). */
export interface CaseEntityEvidenceLinkMutationRow {
	id: string;
	case_id: string;
	case_entity_id: string;
	link_type: 'timeline_entry' | 'case_file';
	target_id: string;
	created_at: string;
	created_by: string;
	deleted_at: string | null;
	deleted_by: string | null;
}

/**
 * POST `/cases/:id/case-entities/:entityId/evidence-links` — body `{ link_type, target_id }` only.
 */
export async function createCaseEntityEvidenceLink(
	caseId: string,
	entityId: string,
	token: string,
	payload: { link_type: 'timeline_entry' | 'case_file'; target_id: string }
): Promise<{ evidence_link: CaseEntityEvidenceLinkMutationRow; idempotent: boolean }> {
	const cid = String(caseId ?? '').trim();
	const eid = String(entityId ?? '').trim();
	if (!cid || !eid) {
		throw new Error('Case id and entity id are required');
	}
	if (!token) {
		throw new Error('Token is required');
	}
	const outboundRequestId = newRequestId();
	const res = await fetch(
		`${CASE_ENGINE_BASE_URL}/cases/${encodeURIComponent(cid)}/case-entities/${encodeURIComponent(eid)}/evidence-links`,
		{
			method: 'POST',
			headers: {
				Authorization: `Bearer ${token}`,
				'Content-Type': 'application/json',
				'X-Request-Id': outboundRequestId
			},
			body: JSON.stringify({ link_type: payload.link_type, target_id: payload.target_id })
		}
	);
	const data = await res.json().catch(() => ({}));
	const correlator = responseRequestId(res) ?? outboundRequestId;

	if (!res.ok) {
		throw new Error(extractApiErrorMessage(data, `Could not add evidence link (${res.status})`));
	}

	try {
		const unwrapped = unwrapEnvelopeCanonicalFirst<{
			evidence_link: CaseEntityEvidenceLinkMutationRow;
			idempotent?: boolean;
		}>(data, 'createCaseEntityEvidenceLink');
		const el = unwrapped.evidence_link;
		if (!el || String(el.case_id) !== cid || String(el.case_entity_id) !== eid) {
			throw new Error('Case Engine response did not match this entity');
		}
		return { evidence_link: el, idempotent: unwrapped.idempotent === true };
	} catch (e) {
		const m = e instanceof Error ? e.message : String(e);
		throw new Error(`${m} (requestId: ${correlator})`);
	}
}

/**
 * POST `/cases/:id/case-entities/:entityId/evidence-links/:linkId/remove` — body `{}`.
 */
export async function removeCaseEntityEvidenceLink(
	caseId: string,
	entityId: string,
	linkId: string,
	token: string
): Promise<CaseEntityEvidenceLinkMutationRow> {
	const cid = String(caseId ?? '').trim();
	const eid = String(entityId ?? '').trim();
	const lid = String(linkId ?? '').trim();
	if (!cid || !eid || !lid) {
		throw new Error('Case id, entity id, and link id are required');
	}
	if (!token) {
		throw new Error('Token is required');
	}
	const outboundRequestId = newRequestId();
	const res = await fetch(
		`${CASE_ENGINE_BASE_URL}/cases/${encodeURIComponent(cid)}/case-entities/${encodeURIComponent(eid)}/evidence-links/${encodeURIComponent(lid)}/remove`,
		{
			method: 'POST',
			headers: {
				Authorization: `Bearer ${token}`,
				'Content-Type': 'application/json',
				'X-Request-Id': outboundRequestId
			},
			body: LIFECYCLE_POST_BODY
		}
	);
	const data = await res.json().catch(() => ({}));
	const correlator = responseRequestId(res) ?? outboundRequestId;

	if (!res.ok) {
		throw new Error(extractApiErrorMessage(data, `Could not remove evidence link (${res.status})`));
	}

	try {
		const unwrapped = unwrapEnvelopeCanonicalFirst<{ evidence_link: CaseEntityEvidenceLinkMutationRow }>(
			data,
			'removeCaseEntityEvidenceLink'
		);
		const el = unwrapped.evidence_link;
		if (!el || String(el.case_id) !== cid || String(el.case_entity_id) !== eid || String(el.id) !== lid) {
			throw new Error('Case Engine response did not match this link');
		}
		return el;
	} catch (e) {
		const m = e instanceof Error ? e.message : String(e);
		throw new Error(`${m} (requestId: ${correlator})`);
	}
}
