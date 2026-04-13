/**
 * P118-04 — Case Engine navigation API client: envelope unwrap, endpoints, no client route tables.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

const here = dirname(fileURLToPath(import.meta.url));
const apiPath = join(here, 'caseNavigationApi.ts');

describe('caseNavigationApi.ts (static)', () => {
	const src = readFileSync(apiPath, 'utf8');

	it('POSTs only to Case Engine navigation paths under /cases/:id/', () => {
		expect(src).toContain('/navigation/citation');
		expect(src).toContain('/navigation/related-records');
		expect(src).toContain('encodeURIComponent(caseId)');
	});

	it('uses safeReadFetch', () => {
		expect(src).toContain("from '$lib/apis/caseEngine/retryPolicy'");
		expect(src).toContain('safeReadFetch');
	});

	it('does not construct application routes from record kind switches', () => {
		expect(src).not.toMatch(/\/case\/\$\{/);
		expect(src).not.toContain('goto(');
	});
});

describe('postCaseCitationNavigation', () => {
	beforeEach(() => {
		vi.stubGlobal(
			'fetch',
			vi.fn(async () =>
				Promise.resolve(
					new Response(
						JSON.stringify({
							success: true,
							data: {
								navigation: {
									ok: true,
									payload: {
										contract_version: '1',
										case_id: 'c1',
										citation_kind: 'timeline_entry',
										target_id: 'e1',
										route_key: 'timeline'
									}
								}
							}
						}),
						{ status: 200, headers: { 'Content-Type': 'application/json' } }
					)
				)
			)
		);
	});

	afterEach(() => {
		vi.unstubAllGlobals();
		vi.restoreAllMocks();
	});

	it('unwraps envelope and returns navigation only', async () => {
		const { postCaseCitationNavigation } = await import('./caseNavigationApi');
		const nav = await postCaseCitationNavigation('c1', 'tok', {
			citation: { kind: 'timeline_entry', id: 'e1' },
			enforce_envelope_case_id: 'c1'
		});
		expect(nav.ok).toBe(true);
		if (nav.ok) {
			expect(nav.payload.route_key).toBe('timeline');
			expect(nav.payload.target_id).toBe('e1');
		}
		const call = vi.mocked(fetch).mock.calls[0];
		expect(String(call[0])).toContain('/cases/c1/navigation/citation');
		const init = call[1] as RequestInit;
		expect(init?.method).toBe('POST');
		expect(String(init?.body)).toContain('enforce_envelope_case_id');
		expect(String(init?.body)).toContain('timeline_entry');
	});
});

describe('postCaseRelatedRecordNavigation', () => {
	beforeEach(() => {
		vi.stubGlobal(
			'fetch',
			vi.fn(async () =>
				Promise.resolve(
					new Response(
						JSON.stringify({
							success: true,
							data: {
								ok: true,
								case_id: 'c1',
								source_kind: 'timeline_entry',
								source_record_id: 'e1',
								source_navigation: { ok: false, unavailable: { contract_version: '1', case_id: 'c1', reason_code: 'RECORD_NOT_AVAILABLE' } },
								candidates: []
							}
						}),
						{ status: 200, headers: { 'Content-Type': 'application/json' } }
					)
				)
			)
		);
	});

	afterEach(() => {
		vi.unstubAllGlobals();
		vi.restoreAllMocks();
	});

	it('unwraps envelope and returns related-record result', async () => {
		const { postCaseRelatedRecordNavigation } = await import('./caseNavigationApi');
		const r = await postCaseRelatedRecordNavigation('c1', 'tok', {
			source_kind: 'timeline_entry',
			source_record_id: 'e1'
		});
		expect(r.ok).toBe(true);
		if (r.ok) {
			expect(r.candidates).toEqual([]);
		}
		const call = vi.mocked(fetch).mock.calls[0];
		expect(String(call[0])).toContain('/navigation/related-records');
	});
});
