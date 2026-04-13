/**
 * P114-04 — Structured filter UI → request payload mapping (deterministic; no inference).
 */
import { describe, expect, it } from 'vitest';
import {
	deterministicStructuredFiltersPayload,
	hasActiveStructuredFiltersUi,
	structuredFiltersFromUiFields
} from './caseQueryStructuredFiltersUi';

describe('caseQueryStructuredFiltersUi (P114-04)', () => {
	it('returns undefined when all fields empty', () => {
		expect(
			structuredFiltersFromUiFields({
				typeToken: '',
				occurredAtFrom: '',
				occurredAtTo: '',
				tagsCommaSeparated: '',
				locationText: ''
			})
		).toBeUndefined();
	});

	it('maps type only', () => {
		expect(
			structuredFiltersFromUiFields({
				typeToken: ' OBSERVATION ',
				occurredAtFrom: '',
				occurredAtTo: '',
				tagsCommaSeparated: '',
				locationText: ''
			})
		).toEqual({ type: 'OBSERVATION' });
	});

	it('splits tags on comma and trims', () => {
		expect(
			structuredFiltersFromUiFields({
				typeToken: '',
				occurredAtFrom: '',
				occurredAtTo: '',
				tagsCommaSeparated: ' alpha , beta ',
				locationText: ''
			})
		).toEqual({ tags: ['alpha', 'beta'] });
	});

	it('preserves tag character casing (no silent normalization)', () => {
		expect(
			structuredFiltersFromUiFields({
				typeToken: '',
				occurredAtFrom: '',
				occurredAtTo: '',
				tagsCommaSeparated: 'PhotoTag',
				locationText: ''
			})
		).toEqual({ tags: ['PhotoTag'] });
	});

	it('deterministic payload key order for multiple fields', () => {
		const o = deterministicStructuredFiltersPayload({
			location_text: 'Site A',
			type: 'OBSERVATION',
			occurred_at_from: '2024-01-01T00:00:00.000Z'
		});
		expect(Object.keys(o)).toEqual(['type', 'occurred_at_from', 'location_text']);
	});

	it('hasActiveStructuredFiltersUi matches partial object', () => {
		expect(hasActiveStructuredFiltersUi({})).toBe(false);
		expect(hasActiveStructuredFiltersUi({ type: 'X' })).toBe(true);
	});

	it('identical fields produce identical payload twice', () => {
		const fields = {
			typeToken: 'OBSERVATION',
			occurredAtFrom: '2024-06-01T00:00:00.000Z',
			occurredAtTo: '',
			tagsCommaSeparated: 'evidence',
			locationText: 'Northbound'
		};
		expect(JSON.stringify(structuredFiltersFromUiFields(fields))).toBe(
			JSON.stringify(structuredFiltersFromUiFields(fields))
		);
	});
});
