/**
 * P102-04: Phase 102 single-case query — `POST /cases/:id/query` (read-only; Case Engine is authority).
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

/** P114-04: Align with Case Engine active-predicate rule — only attach `filters` when non-empty. */
function hasActiveStructuredFilters(f?: CaseQueryStructuredFilters | null): boolean {
	if (f == null) return false;
	return (
		f.type !== undefined ||
		f.occurred_at_from !== undefined ||
		f.occurred_at_to !== undefined ||
		(f.tags !== undefined && f.tags.length > 0) ||
		f.location_text !== undefined
	);
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

/** P20-PRE-02 envelope unwrap (same rules as `caseEngine/index.ts`). */
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

export type CaseQueryResultStatus = 'ok' | 'degraded' | 'refused' | 'error';

export type CaseQueryReasonCode =
	| 'INSUFFICIENT_SUPPORT'
	| 'UNSUPPORTED_QUESTION_PHASE'
	| 'NO_MATCHING_RECORDS'
	| 'INVALID_REQUEST'
	| 'QUERY_CONTRACT_VIOLATION'
	| 'NO_ANSWER';

/** P113-05: Deterministic no-answer cause (Case Engine). */
export type CaseQueryNoAnswerCause =
	| 'CASE_NOT_AVAILABLE_FOR_QUERY'
	| 'NO_CASE_RECORDS'
	| 'NO_QUALIFYING_MATCHES'
	| 'INSUFFICIENT_TOKEN_SUPPORT'
	| 'EMPTY_REFERENTIAL_ROWS'
	| 'CITATIONS_NOT_GROUNDED'
	| 'RESPONSE_SHAPE_INVARIANT';

export type CaseQueryContractViolationCode =
	| 'summarization_not_allowed'
	| 'narrative_generation_not_allowed'
	| 'interpretation_not_allowed'
	| 'inferred_relationship_not_allowed'
	| 'partial_support_not_allowed'
	| 'citation_completeness_failed'
	| 'scope_request_invalid'
	| 'scope_boundary_violation';

export type CaseQuerySupportCoverage = 'full' | 'partial' | 'none';

/** P113-04: Single-case query execution scope (backend contract). */
export type CaseQueryExecutionScope = 'THIS_CASE';

/** P114-01: Optional structured filters — must match Case Engine request contract. */
export interface CaseQueryStructuredFilters {
	type?: string;
	occurred_at_from?: string;
	occurred_at_to?: string;
	tags?: string[];
	location_text?: string;
}

export type CaseQueryReferentialSourceType =
	| 'timeline_entry'
	| 'case_task'
	| 'case_workflow_item'
	| 'case_file'
	| 'notebook_note';

export interface CaseQueryReferentialFactRow {
	source_type: CaseQueryReferentialSourceType;
	source_id: string;
	field_name: string;
	value: string | null;
}

export type CaseQueryCitation =
	| { kind: 'timeline_entry'; id: string; excerpt?: string; field_name?: string }
	| { kind: 'case_task'; id: string; excerpt?: string; field_name?: string }
	| { kind: 'case_workflow_item'; id: string; excerpt?: string; field_name?: string }
	| {
			kind: 'case_file';
			id: string;
			excerpt?: string;
			text_span?: { start: number; end: number };
			field_name?: string;
	  }
	| { kind: 'notebook_note'; id: string; excerpt?: string; field_name?: string }
	| { kind: 'case_read_model'; id: string; read_surface: 'understanding' | 'synthesis' };

/** P115-03 — Operational trace when relationship-linked retrieval was requested; no semantics. */
export interface CaseQueryRelationshipRetrievalTrace {
	requested: boolean;
	enabled: boolean;
	base_match_refs: Array<{ kind: string; id: string }>;
	tuples_considered: Array<{
		relationship_id: string;
		source_record_type: string;
		source_record_id: string;
		target_record_type: string;
		target_record_id: string;
		relationship_type: string;
	}>;
	linked_included: Array<{
		kind: string;
		id: string;
		via_relationship_id: string;
	}>;
	linked_excluded: Array<{
		reason: string;
		detail?: string;
	}>;
}

export interface CaseQueryTrace {
	supporting_record_refs: CaseQueryCitation[];
	support_coverage: CaseQuerySupportCoverage;
	/** P113-04: Auditable execution scope — always `THIS_CASE` for this endpoint. */
	execution_scope: CaseQueryExecutionScope;
	reason_code?: CaseQueryReasonCode;
	/** P113-05: Present when `reason_code` is `NO_ANSWER`. */
	no_answer_cause?: CaseQueryNoAnswerCause;
	contract_violation?: CaseQueryContractViolationCode;
	/** P114-03: Applied structured filters snapshot when predicates were active (Case Engine). */
	structured_filters?: CaseQueryStructuredFilters;
	/** P115-03: Present when the client requested relationship-linked retrieval. */
	relationship_retrieval?: CaseQueryRelationshipRetrievalTrace;
}

/** Mirrors Case Engine P102-01 / P102-03 / P113 response envelope. */
export interface CaseQueryResponseEnvelope {
	case_id: string;
	status: CaseQueryResultStatus;
	answer: string | null;
	citations: CaseQueryCitation[];
	trace: CaseQueryTrace;
	message?: string;
	reason_code?: CaseQueryReasonCode;
	referential_facts?: CaseQueryReferentialFactRow[];
}

/**
 * Submit a single-case question. Always sends `scope: THIS_CASE` per P113-04 (backend is authority for scope).
 * P114-04: Include `filters` only when explicitly provided with at least one active predicate.
 * P115-04: Include `include_relationship_linked_records` only when explicitly true (default off in UI).
 * HTTP errors throw; HTTP 200 returns the envelope (including refused/degraded/error statuses).
 */
export async function postCaseQuery(
	caseId: string,
	token: string,
	body: { question: string; filters?: CaseQueryStructuredFilters; include_relationship_linked_records?: boolean }
): Promise<CaseQueryResponseEnvelope> {
	const q = String(body.question ?? '').trim();
	if (!q) {
		throw new Error('Question is required');
	}
	const payload: Record<string, unknown> = { question: q, scope: 'THIS_CASE' as const };
	if (body.filters !== undefined && hasActiveStructuredFilters(body.filters)) {
		payload.filters = body.filters;
	}
	if (body.include_relationship_linked_records === true) {
		payload.include_relationship_linked_records = true;
	}
	const outboundRequestId = newRequestId();
	const doFetch = () =>
		fetch(`${CASE_ENGINE_BASE_URL}/cases/${encodeURIComponent(caseId)}/query`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${token}`,
				'X-Request-Id': outboundRequestId
			},
			body: JSON.stringify(payload)
		});

	const res = await safeReadFetch(doFetch, 'postCaseQuery');
	const data = await res.json().catch(() => ({}));
	const correlator = responseRequestId(res) ?? outboundRequestId;

	if (!res.ok) {
		throw new Error(extractApiErrorMessage(data, `Case query failed (${res.status})`));
	}

	try {
		return unwrapEnvelopeCanonicalFirst<CaseQueryResponseEnvelope>(data, 'postCaseQuery');
	} catch (e) {
		const m = e instanceof Error ? e.message : String(e);
		throw new Error(`${m} (requestId: ${correlator})`);
	}
}
