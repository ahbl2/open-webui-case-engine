/**
 * P114-05 — UI filter shaping ↔ outbound JSON ↔ Case Engine contract alignment (no new semantics).
 */
import { describe, expect, it } from 'vitest';
import {
	hasActiveStructuredFiltersUi,
	structuredFiltersFromUiFields,
	deterministicStructuredFiltersPayload
} from './caseQueryStructuredFiltersUi';

/** Mirrors `postCaseQuery` JSON body construction (P114-04) for integration checks. */
function buildCaseQueryPostBody(question: string, filters?: ReturnType<typeof structuredFiltersFromUiFields>) {
	const q = String(question ?? '').trim();
	const payload: Record<string, unknown> = { question: q, scope: 'THIS_CASE' as const };
	if (filters !== undefined && hasActiveStructuredFiltersUi(filters)) {
		payload.filters = filters;
	}
	return payload;
}

describe('P114-05 case query integration (UI → payload)', () => {
	it('no active UI fields → no filters key in payload', () => {
		const fields = {
			typeToken: '',
			occurredAtFrom: '',
			occurredAtTo: '',
			tagsCommaSeparated: '',
			locationText: ''
		};
		const filters = structuredFiltersFromUiFields(fields);
		expect(filters).toBeUndefined();
		const body = buildCaseQueryPostBody('hello world', filters);
		expect(body).toEqual({ question: 'hello world', scope: 'THIS_CASE' });
		expect(JSON.stringify(body)).not.toContain('filters');
	});

	it('active fields → filters key with deterministic key order', () => {
		const fields = {
			typeToken: 'OBSERVATION',
			occurredAtFrom: '2024-06-15T00:00:00.000Z',
			occurredAtTo: '',
			tagsCommaSeparated: 'a, b',
			locationText: 'Site A'
		};
		const filters = structuredFiltersFromUiFields(fields);
		expect(filters).toBeDefined();
		const body = buildCaseQueryPostBody('q', filters);
		expect(body).toEqual({
			question: 'q',
			scope: 'THIS_CASE',
			filters: deterministicStructuredFiltersPayload(filters!)
		});
		expect(Object.keys((body.filters as Record<string, unknown>) ?? {})).toEqual([
			'type',
			'occurred_at_from',
			'tags',
			'location_text'
		]);
	});

	it('cleared UI fields → same as no-filter baseline', () => {
		const empty = {
			typeToken: '',
			occurredAtFrom: '',
			occurredAtTo: '',
			tagsCommaSeparated: '',
			locationText: ''
		};
		const baseline = buildCaseQueryPostBody('x', structuredFiltersFromUiFields(empty));
		const withTypeOnly = buildCaseQueryPostBody(
			'x',
			structuredFiltersFromUiFields({
				typeToken: 'OBSERVATION',
				occurredAtFrom: '',
				occurredAtTo: '',
				tagsCommaSeparated: '',
				locationText: ''
			})
		);
		const afterClear = buildCaseQueryPostBody('x', structuredFiltersFromUiFields(empty));
		expect(baseline).toEqual(afterClear);
		expect(withTypeOnly).toEqual({
			question: 'x',
			scope: 'THIS_CASE',
			filters: { type: 'OBSERVATION' }
		});
	});
});
