import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import type { CaseEntityAggregationGroup } from '$lib/case/p100EntityAggregationContract';
import { P100_ENTITY_AGGREGATION_MODEL_V } from '$lib/case/p100EntityAggregationContract';
import { aggregateCaseEntityMatches } from '$lib/case/p100EntityAggregation';
import type { CaseEntityExtractionMatch } from '$lib/case/p100EntityExtractionContract';
import { P100_ENTITY_EXTRACTION_MODEL_V } from '$lib/case/p100EntityExtractionContract';
import {
	buildEntityTraceFromAggregateGroup,
	buildEntityTraceFromGroupInput,
	findEntityTraceInAggregation,
	traceCaseSurfaceBasePath,
	traceDestinationSurfaceForSourceKind
} from '$lib/case/p100EntityTraceability';

const _dir = dirname(fileURLToPath(import.meta.url));

function mockMatch(
	overrides: Partial<CaseEntityExtractionMatch> &
		Pick<
			CaseEntityExtractionMatch,
			'case_id' | 'source_kind' | 'source_record_id' | 'entity_type' | 'raw_text' | 'span'
		>
): CaseEntityExtractionMatch {
	return {
		v: P100_ENTITY_EXTRACTION_MODEL_V,
		normalized_display: null,
		...overrides
	};
}

function mockGroup(overrides: Partial<CaseEntityAggregationGroup> & Pick<CaseEntityAggregationGroup, 'contributing_matches'>): CaseEntityAggregationGroup {
	return {
		v: P100_ENTITY_AGGREGATION_MODEL_V,
		case_id: 'c1',
		entity_type: 'person_name',
		grouping_key: 'person_name\u001fJane Smith',
		display_value: 'Jane Smith',
		total_match_count: overrides.contributing_matches.length,
		source_record_count: 0,
		source_kind_counts: [],
		...overrides,
		source_record_count:
			overrides.source_record_count ??
			new Set(overrides.contributing_matches.map((m) => `${m.source_kind}\n${m.source_record_id}`)).size
	};
}

describe('buildEntityTraceFromAggregateGroup (P100-03)', () => {
	it('returns null when case id does not match group case id', () => {
		const g = mockGroup({
			case_id: 'c1',
			contributing_matches: [
				mockMatch({
					case_id: 'c1',
					source_kind: 'timeline_entry',
					source_record_id: 'e1',
					entity_type: 'person_name',
					raw_text: 'Jane Smith',
					span: { start: 0, end: 10 }
				})
			]
		});
		expect(buildEntityTraceFromAggregateGroup('other', g)).toBeNull();
	});

	it('returns structured match_level and record_level from contributing matches', () => {
		const m1 = mockMatch({
			case_id: 'c1',
			source_kind: 'timeline_entry',
			source_record_id: 'e1',
			entity_type: 'person_name',
			raw_text: 'Jane Smith',
			span: { start: 0, end: 10 }
		});
		const m2 = mockMatch({
			case_id: 'c1',
			source_kind: 'case_task',
			source_record_id: 't1',
			entity_type: 'person_name',
			raw_text: 'Jane Smith',
			span: { start: 0, end: 10 }
		});
		const g = mockGroup({
			case_id: 'c1',
			contributing_matches: [m1, m2],
			total_match_count: 2,
			source_kind_counts: [
				{ source_kind: 'timeline_entry', match_count: 1 },
				{ source_kind: 'case_task', match_count: 1 }
			]
		});
		const t = buildEntityTraceFromAggregateGroup('c1', g)!;
		expect(t.match_level).toHaveLength(2);
		expect(t.record_level).toHaveLength(2);
		expect(t.record_level.map((r) => r.match_count)).toEqual([1, 1]);
		expect(t.grouping_key).toBe(g.grouping_key);
	});

	it('keeps multiple matches under one record as one contributor with match_count > 1', () => {
		const m1 = mockMatch({
			case_id: 'c1',
			source_kind: 'timeline_entry',
			source_record_id: 'e1',
			entity_type: 'phone_number',
			raw_text: '(503) 555-1111',
			normalized_display: '503-555-1111',
			span: { start: 0, end: 14 }
		});
		const m2 = mockMatch({
			case_id: 'c1',
			source_kind: 'timeline_entry',
			source_record_id: 'e1',
			entity_type: 'phone_number',
			raw_text: '503-555-1111',
			normalized_display: '503-555-1111',
			span: { start: 20, end: 32 }
		});
		const g = mockGroup({
			entity_type: 'phone_number',
			grouping_key: 'phone_number\u001f503-555-1111',
			display_value: '503-555-1111',
			contributing_matches: [m1, m2],
			total_match_count: 2,
			source_record_count: 1,
			source_kind_counts: [{ source_kind: 'timeline_entry', match_count: 2 }]
		});
		const t = buildEntityTraceFromAggregateGroup('c1', g)!;
		expect(t.record_level).toHaveLength(1);
		expect(t.record_level[0]!.match_count).toBe(2);
		expect(t.record_level[0]!.matches).toHaveLength(2);
	});

	it('returns null for empty contributing matches', () => {
		const g = mockGroup({ contributing_matches: [], total_match_count: 0, source_record_count: 0 });
		expect(buildEntityTraceFromAggregateGroup('c1', g)).toBeNull();
	});

	it('buildEntityTraceFromGroupInput delegates to same validation', () => {
		const g = mockGroup({
			contributing_matches: [
				mockMatch({
					case_id: 'c1',
					source_kind: 'timeline_entry',
					source_record_id: 'e1',
					entity_type: 'person_name',
					raw_text: 'X',
					span: { start: 0, end: 1 }
				})
			]
		});
		expect(buildEntityTraceFromGroupInput({ case_id: 'c1', group: g })).not.toBeNull();
		expect(buildEntityTraceFromGroupInput({ case_id: 'wrong', group: g })).toBeNull();
	});
});

describe('findEntityTraceInAggregation (P100-03)', () => {
	it('finds group by case_id, entity_type, grouping_key', () => {
		const agg = aggregateCaseEntityMatches({
			case_id: 'cx',
			matches: [
				mockMatch({
					case_id: 'cx',
					source_kind: 'notebook_note',
					source_record_id: 'n1',
					entity_type: 'simple_identifier',
					raw_text: 'AA-111111',
					span: { start: 0, end: 9 }
				}),
				mockMatch({
					case_id: 'cx',
					source_kind: 'timeline_entry',
					source_record_id: 'e1',
					entity_type: 'simple_identifier',
					raw_text: 'AA-111111',
					span: { start: 0, end: 9 }
				})
			]
		});
		const g = agg.groups.find((x) => x.entity_type === 'simple_identifier')!;
		const t = findEntityTraceInAggregation(agg, 'cx', 'simple_identifier', g.grouping_key);
		expect(t).not.toBeNull();
		expect(t!.match_level.length).toBe(2);
		expect(findEntityTraceInAggregation(agg, 'other', 'simple_identifier', g.grouping_key)).toBeNull();
		expect(findEntityTraceInAggregation(agg, 'cx', 'person_name', g.grouping_key)).toBeNull();
	});
});

describe('traceDestinationSurfaceForSourceKind / traceCaseSurfaceBasePath (P100-03)', () => {
	it('maps source kinds to read-only base paths for same case', () => {
		expect(traceDestinationSurfaceForSourceKind('timeline_entry')).toBe('timeline');
		expect(traceCaseSurfaceBasePath('c1', 'timeline_entry')).toBe('/case/c1/timeline');
		expect(traceCaseSurfaceBasePath('c1', 'notebook_note')).toBe('/case/c1/notes');
		expect(traceCaseSurfaceBasePath('c1', 'extracted_text')).toBe('/case/c1/files');
	});
});

describe('P100-03 static guardrails', () => {
	const files = ['p100EntityTraceabilityContract.ts', 'p100EntityTraceability.ts'];

	it('trace modules do not reference browser persistence or cross-case APIs', () => {
		for (const f of files) {
			const src = readFileSync(join(_dir, f), 'utf8');
			expect(src).not.toMatch(/localStorage|sessionStorage|indexedDB/);
			expect(src).not.toMatch(/\bcrossCase\b|cross_case\b/i);
		}
	});

	it('trace modules do not reference LLM client surfaces', () => {
		for (const f of files) {
			const src = readFileSync(join(_dir, f), 'utf8');
			expect(src).not.toMatch(/openai|anthropic|huggingface/i);
			expect(src).not.toContain('@huggingface/transformers');
		}
	});

	it('trace modules avoid graph / implication wording in source', () => {
		const rel = /\b(relationship|relationships|graph|network|infer\b|rank\b)\b/i;
		for (const f of files) {
			const src = readFileSync(join(_dir, f), 'utf8');
			expect(src).not.toMatch(rel);
		}
	});

	it('trace modules do not import Svelte or mount viewers', () => {
		for (const f of files) {
			const src = readFileSync(join(_dir, f), 'utf8');
			expect(src).not.toMatch(/\.svelte/);
			expect(src).not.toMatch(/\bmount\s*\(/);
		}
	});
});
