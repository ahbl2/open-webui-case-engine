import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import type { CaseEntityExtractionMatch } from '$lib/case/p100EntityExtractionContract';
import { P100_ENTITY_EXTRACTION_MODEL_V } from '$lib/case/p100EntityExtractionContract';
import {
	aggregateCaseEntitiesFromSourceRecords,
	aggregateCaseEntityMatches,
	canonicalDisplayValue,
	makeAggregationGroupingKey
} from '$lib/case/p100EntityAggregation';
import { extractCaseEntitiesFromSourceText } from '$lib/case/p100EntityExtraction';

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

describe('aggregateCaseEntityMatches (P100-02)', () => {
	it('returns empty groups for empty case id or no matches', () => {
		expect(aggregateCaseEntityMatches({ case_id: '', matches: [] }).groups).toEqual([]);
		expect(aggregateCaseEntityMatches({ case_id: '  ', matches: [] }).groups).toEqual([]);
		expect(aggregateCaseEntityMatches({ case_id: 'c1', matches: [] }).groups).toEqual([]);
	});

	it('groups by entity_type and display value; counts matches and distinct records', () => {
		const m1 = mockMatch({
			case_id: 'c1',
			source_kind: 'timeline_entry',
			source_record_id: 'e1',
			entity_type: 'person_name',
			raw_text: 'Jane Smith',
			normalized_display: null,
			span: { start: 0, end: 10 }
		});
		const m2 = mockMatch({
			case_id: 'c1',
			source_kind: 'case_task',
			source_record_id: 't1',
			entity_type: 'person_name',
			raw_text: 'Jane Smith',
			normalized_display: null,
			span: { start: 5, end: 15 }
		});
		const r = aggregateCaseEntityMatches({ case_id: 'c1', matches: [m2, m1] });
		expect(r.groups).toHaveLength(1);
		const g = r.groups[0]!;
		expect(g.entity_type).toBe('person_name');
		expect(g.display_value).toBe('Jane Smith');
		expect(g.total_match_count).toBe(2);
		expect(g.source_record_count).toBe(2);
		expect(g.source_kind_counts).toEqual([
			{ source_kind: 'timeline_entry', match_count: 1 },
			{ source_kind: 'case_task', match_count: 1 }
		]);
		expect(g.contributing_matches).toHaveLength(2);
	});

	it('merges normalized display with same canonical value', () => {
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
		const r = aggregateCaseEntityMatches({ case_id: 'c1', matches: [m1, m2] });
		expect(r.groups).toHaveLength(1);
		expect(r.groups[0]!.total_match_count).toBe(2);
		expect(r.groups[0]!.source_record_count).toBe(1);
		expect(r.groups[0]!.source_kind_counts).toEqual([{ source_kind: 'timeline_entry', match_count: 2 }]);
	});

	it('excludes matches whose case_id does not match (no cross-case leakage)', () => {
		const m1 = mockMatch({
			case_id: 'c1',
			source_kind: 'timeline_entry',
			source_record_id: 'e1',
			entity_type: 'person_name',
			raw_text: 'Jane Smith',
			normalized_display: null,
			span: { start: 0, end: 10 }
		});
		const m2 = mockMatch({
			case_id: 'other-case',
			source_kind: 'timeline_entry',
			source_record_id: 'e9',
			entity_type: 'person_name',
			raw_text: 'Jane Smith',
			normalized_display: null,
			span: { start: 0, end: 10 }
		});
		const r = aggregateCaseEntityMatches({ case_id: 'c1', matches: [m1, m2] });
		expect(r.groups).toHaveLength(1);
		expect(r.groups[0]!.total_match_count).toBe(1);
	});

	it('is deterministic across repeated runs and input order', () => {
		const a = mockMatch({
			case_id: 'c1',
			source_kind: 'case_file',
			source_record_id: 'f1',
			entity_type: 'simple_identifier',
			raw_text: 'OR-111111',
			normalized_display: null,
			span: { start: 0, end: 9 }
		});
		const b = mockMatch({
			case_id: 'c1',
			source_kind: 'notebook_note',
			source_record_id: 'n1',
			entity_type: 'simple_identifier',
			raw_text: 'OR-111111',
			normalized_display: null,
			span: { start: 0, end: 9 }
		});
		const r1 = aggregateCaseEntityMatches({ case_id: 'c1', matches: [a, b] });
		const r2 = aggregateCaseEntityMatches({ case_id: 'c1', matches: [b, a] });
		expect(JSON.stringify(r1)).toBe(JSON.stringify(r2));
	});

	it('sorts groups by CASE_ENTITY_TYPES order then display value', () => {
		const addr = mockMatch({
			case_id: 'c1',
			source_kind: 'timeline_entry',
			source_record_id: 'e1',
			entity_type: 'address',
			raw_text: '9 Z St',
			normalized_display: null,
			span: { start: 0, end: 7 }
		});
		const name = mockMatch({
			case_id: 'c1',
			source_kind: 'timeline_entry',
			source_record_id: 'e1',
			entity_type: 'person_name',
			raw_text: 'Ann Other',
			normalized_display: null,
			span: { start: 10, end: 19 }
		});
		const r = aggregateCaseEntityMatches({ case_id: 'c1', matches: [name, addr] });
		/* CASE_ENTITY_TYPES: person_name, phone_number, address, vehicle, simple_identifier */
		expect(r.groups.map((g) => g.entity_type)).toEqual(['person_name', 'address']);
	});
});

describe('aggregateCaseEntitiesFromSourceRecords (P100-02)', () => {
	it('extracts per record then aggregates for one case', () => {
		const r = aggregateCaseEntitiesFromSourceRecords({
			case_id: 'case-x',
			records: [
				{
					case_id: 'case-x',
					source_kind: 'timeline_entry',
					source_record_id: 'e1',
					text: 'Jane Smith at (503) 555-0001.'
				},
				{
					case_id: 'case-x',
					source_kind: 'case_task',
					source_record_id: 't1',
					text: 'Jane Smith left a voicemail.'
				}
			]
		});
		const nameGroup = r.groups.find((g) => g.entity_type === 'person_name');
		expect(nameGroup).toBeDefined();
		expect(nameGroup!.total_match_count).toBe(2);
		expect(nameGroup!.source_record_count).toBe(2);
		expect(nameGroup!.contributing_matches.every((m) => m.case_id === 'case-x')).toBe(true);
	});

	it('skips records whose case_id does not match the aggregation case id', () => {
		const r = aggregateCaseEntitiesFromSourceRecords({
			case_id: 'case-x',
			records: [
				{
					case_id: 'other',
					source_kind: 'timeline_entry',
					source_record_id: 'e1',
					text: 'Jane Smith was here.'
				}
			]
		});
		expect(r.groups).toHaveLength(0);
	});

	it('returns empty when case_id is blank', () => {
		expect(
			aggregateCaseEntitiesFromSourceRecords({ case_id: '', records: [] }).groups
		).toEqual([]);
	});
});

describe('P100-02 helpers', () => {
	it('canonicalDisplayValue and grouping key are stable', () => {
		const m = mockMatch({
			case_id: 'c',
			source_kind: 'timeline_entry',
			source_record_id: 'e',
			entity_type: 'phone_number',
			raw_text: '  x  ',
			normalized_display: '503-555-1111',
			span: { start: 0, end: 1 }
		});
		expect(canonicalDisplayValue(m)).toBe('503-555-1111');
		expect(makeAggregationGroupingKey(m)).toBe(`phone_number\u001f503-555-1111`);
	});
});

describe('P100-02 integration with P100-01 extraction', () => {
	it('end-to-end: multiple records produce expected aggregation', () => {
		const caseId = 'c-int';
		const m1 = extractCaseEntitiesFromSourceText({
			case_id: caseId,
			source_kind: 'timeline_entry',
			source_record_id: 'e1',
			text: 'OR-999999'
		});
		const m2 = extractCaseEntitiesFromSourceText({
			case_id: caseId,
			source_kind: 'case_file',
			source_record_id: 'f1',
			text: 'Ref OR-999999 again.'
		});
		const agg = aggregateCaseEntityMatches({ case_id: caseId, matches: [...m1.matches, ...m2.matches] });
		const g = agg.groups.find((x) => x.display_value === 'OR-999999');
		expect(g).toBeDefined();
		expect(g!.total_match_count).toBe(2);
		expect(g!.source_record_count).toBe(2);
	});
});

describe('P100-02 static guardrails', () => {
	const files = ['p100EntityAggregationContract.ts', 'p100EntityAggregation.ts'];

	it('aggregation modules do not reference browser persistence or cross-case APIs', () => {
		for (const f of files) {
			const src = readFileSync(join(_dir, f), 'utf8');
			expect(src).not.toMatch(/localStorage|sessionStorage|indexedDB/);
			expect(src).not.toMatch(/\bcrossCase\b|cross_case\b/i);
		}
	});

	it('aggregation modules do not reference LLM client surfaces', () => {
		for (const f of files) {
			const src = readFileSync(join(_dir, f), 'utf8');
			expect(src).not.toMatch(/openai|anthropic|huggingface/i);
			expect(src).not.toContain('@huggingface/transformers');
		}
	});

	it('aggregation modules avoid graph / workflow-implication wording in source', () => {
		const rel = /\b(relationship|relationships|graph|network|infer\b|rank\b)\b/i;
		for (const f of files) {
			const src = readFileSync(join(_dir, f), 'utf8');
			expect(src).not.toMatch(rel);
		}
	});
});
