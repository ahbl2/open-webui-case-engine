/**
 * P118-04 — Mirror of Detective Case Engine citation navigation result (consumer-only).
 */
export type CitationNavigationUnavailableReason =
	| 'MISSING_CASE_CONTEXT'
	| 'CASE_ID_MISMATCH'
	| 'INVALID_CITATION'
	| 'UNSUPPORTED_CITATION_KIND'
	| 'RECORD_NOT_AVAILABLE'
	| 'UNKNOWN_RECORD_KIND';

export interface CitationNavigationUnavailable {
	readonly contract_version: string;
	readonly case_id: string;
	readonly reason_code: CitationNavigationUnavailableReason;
	readonly message?: string;
}

export interface CitationNavigationPayloadOk {
	readonly contract_version: string;
	readonly case_id: string;
	readonly citation_kind: string;
	readonly target_id: string;
	readonly route_key: string;
	readonly anchor?: { summary_fragment_id?: string };
	readonly text_span?: { start: number; end: number };
}

export type CitationNavigationResult =
	| { ok: true; payload: CitationNavigationPayloadOk }
	| { ok: false; unavailable: CitationNavigationUnavailable };
