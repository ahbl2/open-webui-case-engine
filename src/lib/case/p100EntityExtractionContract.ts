/**
 * P100-01 — Entity extraction read-model contract (read-only, deterministic, single-case).
 *
 * - **Pattern-only:** matches come only from deterministic pattern application to the supplied record text (no ML, no guessing).
 * - **No persistence:** no storage; pure functions over caller-supplied strings + ids.
 * - **No aggregation:** per-record extraction only — callers combine results in later tickets (P100-02+).
 * - **Authority:** aligns with Phase 97–98 record kinds (`DeclaredRecordKind` + `extracted_text` for file text).
 *
 * ### Entity groups (roadmap-aligned)
 *
 * - `person_name` — conservative two-token person-reference style only (see extractor docblock).
 * - `phone_number` — bounded NANP-style patterns; normalization is digits/formatting only.
 * - `address` — numeric street number + street name + suffix token (see extractor).
 * - `vehicle` — narrowly scoped (e.g. labeled VIN / plate); no “detect any plate” heuristics.
 * - `simple_identifier` — UUIDs and a few explicit alphanumeric / hyphenated id patterns.
 */

export const P100_ENTITY_EXTRACTION_MODEL_V = 1 as const;

/** Closed set — matches Phase 98 declared record kinds plus file extracted text. */
export const CASE_ENTITY_SOURCE_KINDS = [
	'timeline_entry',
	'case_task',
	'case_file',
	'notebook_note',
	'extracted_text'
] as const;

export type CaseEntitySourceKind = (typeof CASE_ENTITY_SOURCE_KINDS)[number];

export function isCaseEntitySourceKind(value: string): value is CaseEntitySourceKind {
	return (CASE_ENTITY_SOURCE_KINDS as readonly string[]).includes(value);
}

/** Roadmap entity groups (canonical `entity_type` values). */
export const CASE_ENTITY_TYPES = [
	'person_name',
	'phone_number',
	'address',
	'vehicle',
	'simple_identifier'
] as const;

export type CaseEntityType = (typeof CASE_ENTITY_TYPES)[number];

export function isCaseEntityType(value: string): value is CaseEntityType {
	return (CASE_ENTITY_TYPES as readonly string[]).includes(value);
}

/**
 * Match span in **UTF-16 code units** (JavaScript `string` indices), aligned with `String` / `RegExp#exec`.
 */
export interface CaseEntityMatchSpan {
	readonly start: number;
	/** Exclusive end index. */
	readonly end: number;
}

/**
 * One deterministic extraction match with record-level provenance for later P100 tickets.
 * No cross-record fields — record boundaries are explicit via `source_kind` + `source_record_id`.
 */
export interface CaseEntityExtractionMatch {
	readonly v: typeof P100_ENTITY_EXTRACTION_MODEL_V;
	readonly case_id: string;
	readonly source_kind: CaseEntitySourceKind;
	readonly source_record_id: string;
	readonly entity_type: CaseEntityType;
	/** Exact substring from `text` at {@link span}. */
	readonly raw_text: string;
	/**
	 * Deterministic display/comparison form when applicable; `null` when identical to `raw_text` or N/A.
	 * Never introduces information not recoverable from `raw_text` + normalization rules.
	 */
	readonly normalized_display: string | null;
	readonly span: CaseEntityMatchSpan;
}

export interface CaseEntityExtractionResult {
	readonly matches: readonly CaseEntityExtractionMatch[];
}

/**
 * Single source record input: real text already available to the UI layer for this case.
 */
export interface CaseEntitySourceRecordInput {
	readonly case_id: string;
	readonly source_kind: CaseEntitySourceKind;
	readonly source_record_id: string;
	readonly text: string;
}
