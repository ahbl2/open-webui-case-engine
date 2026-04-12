/**
 * P100-03 / P100-05 — Deterministic entity-to-record trace from P100-02 groups (read-only).
 *
 * - Same-case: `case_id` must match `group.case_id` (trimmed) or result is `null`.
 * - No re-aggregation, no re-extraction; uses `contributing_matches` only.
 * - Record ordering uses source-kind index + record id + span (no priority semantics).
 */

import type {
	CaseEntityTraceRecordContributor,
	CaseEntityTraceResult,
	CaseEntityTraceFromGroupInput
} from '$lib/case/p100EntityTraceabilityContract';
import { P100_ENTITY_TRACEABILITY_MODEL_V } from '$lib/case/p100EntityTraceabilityContract';
import type {
	CaseEntityAggregationGroup,
	CaseEntityAggregationResult
} from '$lib/case/p100EntityAggregationContract';
import type {
	CaseEntityExtractionMatch,
	CaseEntitySourceKind,
	CaseEntityType
} from '$lib/case/p100EntityExtractionContract';
import { CASE_ENTITY_SOURCE_KINDS } from '$lib/case/p100EntityExtractionContract';
import { sortContributingMatches } from '$lib/case/p100EntityAggregation';

function sourceKindOrderIndex(k: CaseEntitySourceKind): number {
	return CASE_ENTITY_SOURCE_KINDS.indexOf(k);
}

function recordSortKey(m: CaseEntityExtractionMatch): string {
	return `${m.source_kind}\n${m.source_record_id}`;
}

function buildRecordContributors(matches: readonly CaseEntityExtractionMatch[]): CaseEntityTraceRecordContributor[] {
	const byKey = new Map<string, CaseEntityExtractionMatch[]>();
	for (const m of matches) {
		const k = recordSortKey(m);
		const list = byKey.get(k);
		if (list) list.push(m);
		else byKey.set(k, [m]);
	}

	const keys = [...byKey.keys()].sort((a, b) => {
		const ak = a.split('\n')[0] as CaseEntitySourceKind;
		const bk = b.split('\n')[0] as CaseEntitySourceKind;
		const aid = a.split('\n')[1]!;
		const bid = b.split('\n')[1]!;
		const kr = sourceKindOrderIndex(ak) - sourceKindOrderIndex(bk);
		if (kr !== 0) return kr;
		return aid.localeCompare(bid);
	});

	const out: CaseEntityTraceRecordContributor[] = [];
	for (const k of keys) {
		const raw = byKey.get(k)!;
		const sortedMs = sortContributingMatches(raw);
		const kind = sortedMs[0]!.source_kind;
		const id = sortedMs[0]!.source_record_id;
		out.push({
			v: P100_ENTITY_TRACEABILITY_MODEL_V,
			source_kind: kind,
			source_record_id: id,
			match_count: sortedMs.length,
			matches: sortedMs
		});
	}
	return out;
}

/**
 * Build trace from a P100-02 group. Returns `null` when `case_id` does not match the group’s case
 * or when the group has no contributing matches.
 */
export function buildEntityTraceFromAggregateGroup(
	caseId: string,
	group: CaseEntityAggregationGroup
): CaseEntityTraceResult | null {
	const cid = caseId.trim();
	if (!cid) return null;
	if (group.case_id.trim() !== cid) return null;
	if (group.contributing_matches.length === 0) return null;

	const match_level = group.contributing_matches;
	const record_level = buildRecordContributors(match_level);

	return {
		v: P100_ENTITY_TRACEABILITY_MODEL_V,
		case_id: cid,
		entity_type: group.entity_type,
		grouping_key: group.grouping_key,
		display_value: group.display_value,
		total_match_count: group.total_match_count,
		source_record_count: group.source_record_count,
		match_level,
		record_level
	};
}

export function buildEntityTraceFromGroupInput(input: CaseEntityTraceFromGroupInput): CaseEntityTraceResult | null {
	return buildEntityTraceFromAggregateGroup(input.case_id, input.group);
}

/**
 * Locate a group in an aggregation result and build trace. Unknown group or case mismatch → `null`.
 */
export function findEntityTraceInAggregation(
	aggregation: CaseEntityAggregationResult,
	case_id: string,
	entity_type: CaseEntityType,
	grouping_key: string
): CaseEntityTraceResult | null {
	const cid = case_id.trim();
	if (!cid) return null;
	const g = aggregation.groups.find(
		(x) =>
			x.case_id.trim() === cid && x.entity_type === entity_type && x.grouping_key === grouping_key
	);
	if (!g) return null;
	return buildEntityTraceFromAggregateGroup(cid, g);
}

/** Read-only surface hint for P100-04 routing (same-case paths only; not a viewer). */
export type CaseEntityTraceDestinationSurface = 'timeline' | 'tasks' | 'files' | 'notes';

export function traceDestinationSurfaceForSourceKind(
	kind: CaseEntitySourceKind
): CaseEntityTraceDestinationSurface {
	switch (kind) {
		case 'timeline_entry':
			return 'timeline';
		case 'case_task':
			return 'tasks';
		case 'case_file':
		case 'extracted_text':
			return 'files';
		case 'notebook_note':
			return 'notes';
	}
}

/**
 * Base path for the case surface that holds this record kind (no query/hash; ids for navigation belong in P100-04+).
 */
export function traceCaseSurfaceBasePath(caseId: string, kind: CaseEntitySourceKind): string {
	const id = caseId.trim();
	const surf = traceDestinationSurfaceForSourceKind(kind);
	if (surf === 'notes') return `/case/${id}/notes`;
	return `/case/${id}/${surf}`;
}
