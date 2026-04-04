/**
 * P41-04 — deterministic timestamp candidate parsing + presentation helpers.
 */
import { describe, expect, it } from 'vitest';
import {
	deterministicCandidateOperatorNote,
	deterministicConfidenceCategoryShortLabel,
	parseDeterministicTimestampCandidatesFromPayload
} from './deterministicTimestampCandidates';

const v2Ambiguous = {
	schema_version: 2,
	raw_text: '03/04/2024',
	normalized_value: null,
	precision: 'partial',
	confidence_category: 'ambiguous',
	evidence_start: 3,
	evidence_end: 13,
	evidence_excerpt: '03/04/2024',
	reason_codes: ['NUMERIC_SLASH_AMBIGUOUS'],
	alternate_date_only_values: ['2024-03-04', '2024-04-03']
} as const;

describe('parseDeterministicTimestampCandidatesFromPayload', () => {
	it('returns empty when key missing or not array', () => {
		expect(parseDeterministicTimestampCandidatesFromPayload({})).toEqual([]);
		expect(parseDeterministicTimestampCandidatesFromPayload({ deterministic_timestamp_candidates: null })).toEqual(
			[]
		);
	});

	it('parses schema_version 2 with confidence_category', () => {
		const parsed = parseDeterministicTimestampCandidatesFromPayload({
			deterministic_timestamp_candidates: [
				{
					schema_version: 2,
					raw_text: '2024-01-01T12:00:00Z',
					normalized_value: '2024-01-01T12:00:00.000Z',
					precision: 'exact',
					confidence_category: 'exact_with_tz',
					evidence_start: 0,
					evidence_end: 20,
					evidence_excerpt: '2024-01-01T12:00:00Z',
					reason_codes: ['ISO_DATETIME_WITH_OFFSET']
				}
			]
		});
		expect(parsed).toHaveLength(1);
		expect(parsed[0].kind).toBe('v2');
		if (parsed[0].kind === 'v2') {
			expect(parsed[0].candidate.confidence_category).toBe('exact_with_tz');
			expect(parsed[0].candidate.normalized_value).toContain('2024-01-01');
		}
	});

	it('preserves ambiguous alternates without normalizing a primary value', () => {
		const parsed = parseDeterministicTimestampCandidatesFromPayload({
			deterministic_timestamp_candidates: [v2Ambiguous]
		});
		expect(parsed).toHaveLength(1);
		if (parsed[0].kind === 'v2') {
			expect(parsed[0].candidate.normalized_value).toBeNull();
			expect(parsed[0].candidate.alternate_date_only_values).toEqual(['2024-03-04', '2024-04-03']);
		}
	});

	it('treats unknown schema_version as legacy for safe UI', () => {
		const parsed = parseDeterministicTimestampCandidatesFromPayload({
			deterministic_timestamp_candidates: [{ schema_version: 1, confidence: 'high', foo: 1 }]
		});
		expect(parsed).toHaveLength(1);
		expect(parsed[0].kind).toBe('legacy');
	});

	it('ignores non-object array entries', () => {
		expect(
			parseDeterministicTimestampCandidatesFromPayload({
				deterministic_timestamp_candidates: [null, 'x', v2Ambiguous]
			}).length
		).toBe(1);
	});
});

describe('deterministicConfidenceCategoryShortLabel', () => {
	it('covers all contract categories', () => {
		const cats = ['exact_with_tz', 'exact_no_tz', 'date_only', 'ambiguous', 'partial'] as const;
		for (const c of cats) {
			expect(deterministicConfidenceCategoryShortLabel(c).length).toBeGreaterThan(2);
		}
	});
});

describe('deterministicCandidateOperatorNote', () => {
	it('explains partial time-only', () => {
		const note = deterministicCandidateOperatorNote({
			schema_version: 2,
			raw_text: '3:00 PM',
			normalized_value: null,
			precision: 'partial',
			confidence_category: 'partial',
			evidence_start: 0,
			evidence_end: 7,
			evidence_excerpt: '3:00 PM',
			reason_codes: ['TIME_ONLY_NO_DATE']
		});
		expect(note).toMatch(/Time without/i);
	});
});
