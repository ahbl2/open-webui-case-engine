/**
 * P117-04 — Phase 117 case workflow items (`/cases/:id/case-workflow-items`).
 * Distinct from legacy P13 workflow-items routes (no `case_` prefix on that surface).
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

export type CaseWorkflowItemType = 'TASK' | 'LEAD';

export type CaseWorkflowItemStatus = 'OPEN' | 'IN_PROGRESS' | 'CLOSED';

/** Mirrors Case Engine `CaseWorkflowItemResponse`. */
export interface CaseEngineCaseWorkflowItem {
	workflow_item_id: string;
	case_id: string;
	workflow_type: CaseWorkflowItemType;
	title: string;
	description: string | null;
	status: CaseWorkflowItemStatus;
	created_at: string;
	created_by: string;
	updated_at: string;
	updated_by: string;
	deleted_at: string | null;
}

function itemsBase(caseId: string): string {
	return `${CASE_ENGINE_BASE_URL}/cases/${encodeURIComponent(caseId)}/case-workflow-items`;
}

/**
 * GET — list active workflow items for the case (server order; do not re-sort for Timeline authority).
 */
export async function listCaseWorkflowItems(caseId: string, token: string): Promise<CaseEngineCaseWorkflowItem[]> {
	const cid = String(caseId ?? '').trim();
	if (!cid) {
		throw new Error('Case id is required');
	}
	if (!token) {
		throw new Error('Token is required');
	}
	const outboundRequestId = newRequestId();
	const doFetch = () =>
		fetch(itemsBase(cid), {
			method: 'GET',
			headers: {
				Authorization: `Bearer ${token}`,
				'X-Request-Id': outboundRequestId
			}
		});

	const res = await safeReadFetch(doFetch, 'listCaseWorkflowItems');
	const data = await res.json().catch(() => ({}));
	const correlator = responseRequestId(res) ?? outboundRequestId;

	if (!res.ok) {
		throw new Error(extractApiErrorMessage(data, `Could not load workflow items (${res.status})`));
	}

	try {
		const body = unwrapEnvelopeCanonicalFirst<{ case_workflow_items: CaseEngineCaseWorkflowItem[] }>(
			data,
			'listCaseWorkflowItems'
		);
		const raw = Array.isArray(body.case_workflow_items) ? body.case_workflow_items : [];
		return raw.filter((w) => String(w.case_id) === cid);
	} catch (e) {
		const m = e instanceof Error ? e.message : String(e);
		throw new Error(`${m} (requestId: ${correlator})`);
	}
}

export interface CaseWorkflowItemCreatePayload {
	workflow_type: CaseWorkflowItemType;
	title: string;
	description?: string | null;
	status?: CaseWorkflowItemStatus;
}

/**
 * POST — create workflow item. No client actor fields.
 */
export async function createCaseWorkflowItem(
	caseId: string,
	token: string,
	payload: CaseWorkflowItemCreatePayload
): Promise<CaseEngineCaseWorkflowItem> {
	const cid = String(caseId ?? '').trim();
	if (!cid) {
		throw new Error('Case id is required');
	}
	if (!token) {
		throw new Error('Token is required');
	}
	const body: Record<string, unknown> = {
		workflow_type: payload.workflow_type,
		title: payload.title
	};
	if (payload.description !== undefined) {
		body.description = payload.description;
	}
	if (payload.status !== undefined) {
		body.status = payload.status;
	}

	const outboundRequestId = newRequestId();
	const res = await fetch(itemsBase(cid), {
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
		throw new Error(extractApiErrorMessage(data, `Could not create workflow item (${res.status})`));
	}

	try {
		const unwrapped = unwrapEnvelopeCanonicalFirst<{ case_workflow_item: CaseEngineCaseWorkflowItem }>(
			data,
			'createCaseWorkflowItem'
		);
		const item = unwrapped.case_workflow_item;
		if (!item || String(item.case_id) !== cid) {
			throw new Error('Case Engine response did not match this case');
		}
		return item;
	} catch (e) {
		const m = e instanceof Error ? e.message : String(e);
		throw new Error(`${m} (requestId: ${correlator})`);
	}
}

export interface CaseWorkflowItemUpdatePayload {
	title?: string;
	description?: string | null;
	status?: CaseWorkflowItemStatus;
}

/**
 * PUT — update workflow item (explicit operator save; no hidden defaults).
 */
export async function updateCaseWorkflowItem(
	caseId: string,
	workflowItemId: string,
	token: string,
	payload: CaseWorkflowItemUpdatePayload
): Promise<CaseEngineCaseWorkflowItem> {
	const cid = String(caseId ?? '').trim();
	const wid = String(workflowItemId ?? '').trim();
	if (!cid || !wid) {
		throw new Error('Case id and workflow item id are required');
	}
	if (!token) {
		throw new Error('Token is required');
	}
	const keys = Object.keys(payload);
	if (keys.length === 0) {
		throw new Error('At least one field is required');
	}
	const body: Record<string, unknown> = {};
	if (payload.title !== undefined) body.title = payload.title;
	if (payload.description !== undefined) body.description = payload.description;
	if (payload.status !== undefined) body.status = payload.status;

	const outboundRequestId = newRequestId();
	const res = await fetch(`${itemsBase(cid)}/${encodeURIComponent(wid)}`, {
		method: 'PUT',
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
		throw new Error(extractApiErrorMessage(data, `Could not update workflow item (${res.status})`));
	}

	try {
		const unwrapped = unwrapEnvelopeCanonicalFirst<{ case_workflow_item: CaseEngineCaseWorkflowItem }>(
			data,
			'updateCaseWorkflowItem'
		);
		const item = unwrapped.case_workflow_item;
		if (!item || String(item.case_id) !== cid || String(item.workflow_item_id) !== wid) {
			throw new Error('Case Engine response did not match this workflow item');
		}
		return item;
	} catch (e) {
		const m = e instanceof Error ? e.message : String(e);
		throw new Error(`${m} (requestId: ${correlator})`);
	}
}
