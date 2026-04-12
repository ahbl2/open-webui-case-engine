/**
 * P100-05 — Cross-surface consistency: ordering, same-case isolation, copy guardrails (static + behavioral).
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import type { CaseEntityExtractionMatch } from '$lib/case/p100EntityExtractionContract';
import { P100_ENTITY_EXTRACTION_MODEL_V } from '$lib/case/p100EntityExtractionContract';
import { aggregateCaseEntityMatches, makeAggregationGroupingKey } from '$lib/case/p100EntityAggregation';
import { CASE_ENTITY_TYPES } from '$lib/case/p100EntityExtractionContract';
import { buildEntityTraceFromAggregateGroup } from '$lib/case/p100EntityTraceability';
import { openTraceContributorAriaLabel, traceContributorSurfaceLabel } from '$lib/case/p100CaseUnderstandingNavigation';
import {
	P100_OVERVIEW_SECTION_DECK,
	P100_PANEL_AUTHORITY_LINE,
	P100_PANEL_FILE_ROW_LIMITATION
} from '$lib/case/p100Phase100Copy';

const _dir = dirname(fileURLToPath(import.meta.url));

const PHASE_100_CODE_GLOBS = [
	'p100EntityExtractionContract.ts',
	'p100EntityExtraction.ts',
	'p100EntityAggregationContract.ts',
	'p100EntityAggregation.ts',
	'p100EntityTraceabilityContract.ts',
	'p100EntityTraceability.ts',
	'p100CaseUnderstandingNavigation.ts',
	'p100Phase100Copy.ts',
	'caseUnderstandingSourceRecords.ts',
	'caseUnderstandingLoad.ts',
	'../components/case/CaseUnderstandingPanel.svelte',
	'../components/case/CaseUnderstandingOverviewSection.svelte'
];

const FORBIDDEN = {
	storage: /localStorage|sessionStorage|indexedDB/,
	crossCaseApi: /\bcrossCase\b|cross_case\b/i,
	llm: /openai|anthropic|huggingface/i,
	hfPkg: '@huggingface/transformers',
	graph: /\b(relationship|relationships|graph|network|infer\b|rank\b)\b/i,
	priority: [/\bkey entity\b/i, /\btop\b/i, /\bmost important\b/i, /\blikely related\b/i, /\bcentral\b/i]
};

function mockMatch(
	partial: Partial<CaseEntityExtractionMatch> &
		Pick<
			CaseEntityExtractionMatch,
			'case_id' | 'source_kind' | 'source_record_id' | 'entity_type' | 'raw_text' | 'span'
		>
): CaseEntityExtractionMatch {
	return {
		v: P100_ENTITY_EXTRACTION_MODEL_V,
		normalized_display: null,
		...partial
	};
}

describe('P100-05 aggregate + trace ordering', () => {
	it('aggregation group order follows CASE_ENTITY_TYPES then display_value', () => {
		const agg = aggregateCaseEntityMatches({
			case_id: 'c',
			matches: [
				mockMatch({
					case_id: 'c',
					source_kind: 'timeline_entry',
					source_record_id: 'e1',
					entity_type: 'address',
					raw_text: '1 Main St',
					span: { start: 0, end: 9 }
				}),
				mockMatch({
					case_id: 'c',
					source_kind: 'timeline_entry',
					source_record_id: 'e1',
					entity_type: 'person_name',
					raw_text: 'Ann Other',
					span: { start: 0, end: 9 }
				})
			]
		});
		const types = agg.groups.map((g) => g.entity_type);
		expect(types[0]).toBe('person_name');
		expect(types[1]).toBe('address');
	});

	it('grouping keys are stable for same entity_type + display', () => {
		const a = mockMatch({
			case_id: 'c',
			source_kind: 'timeline_entry',
			source_record_id: 'e1',
			entity_type: 'phone_number',
			raw_text: '(503) 555-1111',
			normalized_display: '503-555-1111',
			span: { start: 0, end: 14 }
		});
		expect(makeAggregationGroupingKey(a)).toBe(makeAggregationGroupingKey(a));
	});

	it('trace rejects case id mismatch', () => {
		const g = aggregateCaseEntityMatches({
			case_id: 'c',
			matches: [
				mockMatch({
					case_id: 'c',
					source_kind: 'timeline_entry',
					source_record_id: 'e1',
					entity_type: 'person_name',
					raw_text: 'X Y',
					span: { start: 0, end: 3 }
				})
			]
		}).groups[0]!;
		expect(buildEntityTraceFromAggregateGroup('wrong', g)).toBeNull();
		expect(buildEntityTraceFromAggregateGroup('c', g)).not.toBeNull();
	});
});

describe('P100-05 navigation labels vs Phase 97 surfaces', () => {
	it('surface labels stay aligned with synthesis-style wording', () => {
		expect(traceContributorSurfaceLabel('timeline_entry')).toBe('Timeline');
		expect(traceContributorSurfaceLabel('case_task')).toBe('Tasks');
		expect(traceContributorSurfaceLabel('notebook_note')).toBe('Notes');
	});

	it('openTraceContributorAriaLabel is factual', () => {
		expect(openTraceContributorAriaLabel('timeline_entry', 'e1')).toBe('Open Timeline record e1');
	});
});

describe('P100-05 shared copy constants', () => {
	it('overview deck and authority line avoid interpretive workflow phrasing', () => {
		expect(P100_OVERVIEW_SECTION_DECK).toMatch(/deterministic/i);
		expect(P100_PANEL_AUTHORITY_LINE).toMatch(/official chronology/i);
		expect(P100_PANEL_FILE_ROW_LIMITATION).toMatch(/display names/i);
	});
});

describe('P100-05 static guardrails (Phase 100 modules)', () => {
	for (const f of PHASE_100_CODE_GLOBS) {
		it(`${f} passes storage / LLM / graph guardrails`, () => {
			const src = readFileSync(join(_dir, f), 'utf8');
			expect(src).not.toMatch(FORBIDDEN.storage);
			expect(src).not.toMatch(FORBIDDEN.crossCaseApi);
			expect(src).not.toMatch(FORBIDDEN.llm);
			expect(src).not.toContain(FORBIDDEN.hfPkg);
			expect(src).not.toMatch(FORBIDDEN.graph);
			for (const re of FORBIDDEN.priority) {
				expect(src).not.toMatch(re);
			}
		});
	}
});
