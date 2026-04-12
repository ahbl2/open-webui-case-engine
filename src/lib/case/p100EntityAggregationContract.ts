/**
 * P100-02 — Case-level entity aggregation read model (read-only, deterministic, single-case).
 *
 * - Builds on **P100-01** {@link CaseEntityExtractionMatch} only — no re-parsing rules here.
 * - **No persistence**, no ranking, no co-occurrence semantics, no trace UI — factual counts and
 *   grouping keys for later tickets only.
 */

import type {
	CaseEntityExtractionMatch,
	CaseEntitySourceKind,
	CaseEntityType
} from '$lib/case/p100EntityExtractionContract';

export const P100_ENTITY_AGGREGATION_MODEL_V = 1 as const;

/** Opaque deterministic key: `entity_type` + unit separator + canonical display string. */
export type CaseEntityAggregationGroupKey = string;

export interface CaseEntitySourceKindCountRow {
	readonly source_kind: CaseEntitySourceKind;
	/** Number of extraction matches in this group from records of this kind (factual, not deduped across kinds). */
	readonly match_count: number;
}

/**
 * One grouped entity: factual aggregates only. {@link contributing_matches} preserves P100-03 trace inputs.
 */
export interface CaseEntityAggregationGroup {
	readonly v: typeof P100_ENTITY_AGGREGATION_MODEL_V;
	readonly case_id: string;
	readonly entity_type: CaseEntityType;
	/** Stable grouping identity within this case only. */
	readonly grouping_key: CaseEntityAggregationGroupKey;
	/** Display string used for grouping: `normalized_display ?? raw_text`, trimmed. */
	readonly display_value: string;
	readonly total_match_count: number;
	/** Distinct `(source_kind, source_record_id)` with ≥1 contributing match in this group. */
	readonly source_record_count: number;
	/** Subtotals from provenance only; sorted by `CaseEntitySourceKind` enum order. */
	readonly source_kind_counts: readonly CaseEntitySourceKindCountRow[];
	/** All P100-01 matches in this group, sorted deterministically for trace handoff. */
	readonly contributing_matches: readonly CaseEntityExtractionMatch[];
}

export interface CaseEntityAggregationResult {
	readonly groups: readonly CaseEntityAggregationGroup[];
}

export interface CaseEntityAggregationInput {
	readonly case_id: string;
	readonly matches: readonly CaseEntityExtractionMatch[];
}
