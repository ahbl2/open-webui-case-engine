/**
 * P100-02 / P100-05 — Deterministic case-level aggregation over P100-01 matches (read-only).
 *
 * - Same-case: matches whose `case_id` (trimmed) differs from input `case_id` are **excluded**.
 * - Grouping: `entity_type` + canonical `display_value` = `trim(normalized_display ?? raw_text)`.
 * - Counts: every match counts toward `total_match_count`; `source_record_count` uses distinct
 *   `(source_kind, source_record_id)`; `source_kind_counts` sum matches per kind.
 * - Ordering: groups use `CASE_ENTITY_TYPES` then `display_value` (`en`); `contributing_matches` use
 *   source-kind order, record id, span, entity-type index only (P100-05: locked—no “importance” sorts).
 */

import type {
	CaseEntityAggregationGroup,
	CaseEntityAggregationInput,
	CaseEntityAggregationResult,
	CaseEntitySourceKindCountRow
} from '$lib/case/p100EntityAggregationContract';
import { P100_ENTITY_AGGREGATION_MODEL_V } from '$lib/case/p100EntityAggregationContract';
import type {
	CaseEntityExtractionMatch,
	CaseEntitySourceKind,
	CaseEntitySourceRecordInput,
	CaseEntityType
} from '$lib/case/p100EntityExtractionContract';
import {
	CASE_ENTITY_SOURCE_KINDS,
	CASE_ENTITY_TYPES
} from '$lib/case/p100EntityExtractionContract';
import { extractCaseEntitiesFromSourceText } from '$lib/case/p100EntityExtraction';

const US = '\u001f' as const;

function entityTypeOrderIndex(t: CaseEntityType): number {
	return CASE_ENTITY_TYPES.indexOf(t);
}

function sourceKindOrderIndex(k: CaseEntitySourceKind): number {
	return CASE_ENTITY_SOURCE_KINDS.indexOf(k);
}

export function canonicalDisplayValue(m: CaseEntityExtractionMatch): string {
	const s = m.normalized_display ?? m.raw_text;
	return s.trim();
}

export function makeAggregationGroupingKey(m: CaseEntityExtractionMatch): string {
	return `${m.entity_type}${US}${canonicalDisplayValue(m)}`;
}

/** Exported for P100-03 trace bucketing — same ordering as aggregation `contributing_matches`. */
export function sortContributingMatches(matches: readonly CaseEntityExtractionMatch[]): CaseEntityExtractionMatch[] {
	return [...matches].sort((a, b) => {
		const ak = sourceKindOrderIndex(a.source_kind);
		const bk = sourceKindOrderIndex(b.source_kind);
		if (ak !== bk) return ak - bk;
		const c = a.source_record_id.localeCompare(b.source_record_id);
		if (c !== 0) return c;
		if (a.span.start !== b.span.start) return a.span.start - b.span.start;
		if (a.span.end !== b.span.end) return a.span.end - b.span.end;
		return entityTypeOrderIndex(a.entity_type) - entityTypeOrderIndex(b.entity_type);
	});
}

function sortGroups(groups: CaseEntityAggregationGroup[]): CaseEntityAggregationGroup[] {
	return [...groups].sort((a, b) => {
		const at = entityTypeOrderIndex(a.entity_type);
		const bt = entityTypeOrderIndex(b.entity_type);
		if (at !== bt) return at - bt;
		return a.display_value.localeCompare(b.display_value, 'en');
	});
}

function buildSourceKindCounts(matches: readonly CaseEntityExtractionMatch[]): readonly CaseEntitySourceKindCountRow[] {
	const map = new Map<CaseEntitySourceKind, number>();
	for (const m of matches) {
		map.set(m.source_kind, (map.get(m.source_kind) ?? 0) + 1);
	}
	const rows: CaseEntitySourceKindCountRow[] = [];
	for (const kind of CASE_ENTITY_SOURCE_KINDS) {
		const n = map.get(kind);
		if (n !== undefined && n > 0) {
			rows.push({ source_kind: kind, match_count: n });
		}
	}
	return rows;
}

function distinctSourceRecordKeys(matches: readonly CaseEntityExtractionMatch[]): number {
	const set = new Set<string>();
	for (const m of matches) {
		set.add(`${m.source_kind}\n${m.source_record_id}`);
	}
	return set.size;
}

/**
 * Aggregate P100-01 matches for one case. Matches with a different `case_id` (after trim) are dropped.
 */
export function aggregateCaseEntityMatches(input: CaseEntityAggregationInput): CaseEntityAggregationResult {
	const caseId = input.case_id?.trim() ?? '';
	if (!caseId) {
		return { groups: [] };
	}

	const filtered: CaseEntityExtractionMatch[] = [];
	for (const m of input.matches) {
		if (m.case_id.trim() === caseId) filtered.push(m);
	}

	if (filtered.length === 0) {
		return { groups: [] };
	}

	const byKey = new Map<string, CaseEntityExtractionMatch[]>();
	for (const m of filtered) {
		const key = makeAggregationGroupingKey(m);
		const list = byKey.get(key);
		if (list) list.push(m);
		else byKey.set(key, [m]);
	}

	const groups: CaseEntityAggregationGroup[] = [];
	const sortedKeys = [...byKey.keys()].sort((a, b) => a.localeCompare(b, 'en'));

	for (const key of sortedKeys) {
		const list = byKey.get(key)!;
		const sortedContrib = sortContributingMatches(list);
		const first = sortedContrib[0]!;
		const display_value = canonicalDisplayValue(first);
		groups.push({
			v: P100_ENTITY_AGGREGATION_MODEL_V,
			case_id: caseId,
			entity_type: first.entity_type,
			grouping_key: key,
			display_value,
			total_match_count: sortedContrib.length,
			source_record_count: distinctSourceRecordKeys(sortedContrib),
			source_kind_counts: buildSourceKindCounts(sortedContrib),
			contributing_matches: sortedContrib
		});
	}

	return { groups: sortGroups(groups) };
}

/**
 * Extract P100-01 matches per record (same-case records only), then aggregate. Records whose
 * `case_id` does not match `input.case_id` (trimmed) are skipped — no extraction, no leakage.
 */
export function aggregateCaseEntitiesFromSourceRecords(input: {
	readonly case_id: string;
	readonly records: readonly CaseEntitySourceRecordInput[];
}): CaseEntityAggregationResult {
	const caseId = input.case_id?.trim() ?? '';
	if (!caseId) {
		return { groups: [] };
	}

	const all: CaseEntityExtractionMatch[] = [];
	for (const r of input.records) {
		const rid = r.case_id?.trim() ?? '';
		if (rid !== caseId) continue;
		const ex = extractCaseEntitiesFromSourceText({
			...r,
			case_id: caseId
		});
		all.push(...ex.matches);
	}

	return aggregateCaseEntityMatches({ case_id: caseId, matches: all });
}
