/**
 * P100-03 — Entity-to-record traceability read model (read-only, single-case, no UI).
 *
 * Resolves a **P100-02** {@link CaseEntityAggregationGroup} into explicit match-level and
 * record-level views using only provenance already on {@link CaseEntityExtractionMatch}.
 * No new facts, no edges, no ranking, no persistence.
 */

import type { CaseEntityAggregationGroup, CaseEntityAggregationGroupKey } from '$lib/case/p100EntityAggregationContract';
import type {
	CaseEntityExtractionMatch,
	CaseEntitySourceKind,
	CaseEntityType
} from '$lib/case/p100EntityExtractionContract';

export const P100_ENTITY_TRACEABILITY_MODEL_V = 1 as const;

/**
 * One distinct `(source_kind, source_record_id)` with the matches that belong to this grouped entity
 * within that record (may be >1 match).
 */
export interface CaseEntityTraceRecordContributor {
	readonly v: typeof P100_ENTITY_TRACEABILITY_MODEL_V;
	readonly source_kind: CaseEntitySourceKind;
	readonly source_record_id: string;
	readonly match_count: number;
	readonly matches: readonly CaseEntityExtractionMatch[];
}

/**
 * Factual trace for one aggregated entity: same-case only; mirrors P100-02 group identity fields.
 */
export interface CaseEntityTraceResult {
	readonly v: typeof P100_ENTITY_TRACEABILITY_MODEL_V;
	readonly case_id: string;
	readonly entity_type: CaseEntityType;
	readonly grouping_key: CaseEntityAggregationGroupKey;
	readonly display_value: string;
	readonly total_match_count: number;
	readonly source_record_count: number;
	/** All contributing matches (same as P100-02 order). */
	readonly match_level: readonly CaseEntityExtractionMatch[];
	/** Distinct records, each with its matches (same-case evidence only). */
	readonly record_level: readonly CaseEntityTraceRecordContributor[];
}

/** Input grounded in an existing aggregation group (caller must supply same-case `group`). */
export interface CaseEntityTraceFromGroupInput {
	readonly case_id: string;
	readonly group: CaseEntityAggregationGroup;
}
