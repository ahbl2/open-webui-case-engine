/**
 * P102-04 — Case query API client guardrails.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { postCaseQuery } from './caseQueryApi';

const here = dirname(fileURLToPath(import.meta.url));
const apiPath = join(here, 'caseQueryApi.ts');

describe('caseQueryApi.ts (static)', () => {
	const src = readFileSync(apiPath, 'utf8');

	it('targets POST /cases/:id/query only', () => {
		expect(src).toContain('/query');
		expect(src).toContain('encodeURIComponent(caseId)');
		expect(src).toContain('scope:');
		expect(src).toContain('THIS_CASE');
	});

	it('uses safeReadFetch for classified retries', () => {
		expect(src).toContain("from '$lib/apis/caseEngine/retryPolicy'");
		expect(src).toContain('safeReadFetch');
	});

	it('does not send forbidden request keys', () => {
		expect(src).not.toMatch(/\brank\b/i);
		expect(src).not.toMatch(/\bconfidence\b/i);
		expect(src).not.toMatch(/\bcross_case\b/i);
	});

	it('P114-04: supports optional filters on the query body when active', () => {
		expect(src).toContain('filters');
		expect(src).toContain('hasActiveStructuredFilters');
	});
});

describe('postCaseQuery', () => {
	beforeEach(() => {
		vi.stubGlobal(
			'fetch',
			vi.fn(async () =>
				Promise.resolve(
					new Response(JSON.stringify({ success: true, data: { case_id: 'c1', status: 'ok', answer: 'x', citations: [], trace: { supporting_record_refs: [], support_coverage: 'full', execution_scope: 'THIS_CASE' } } }), {
						status: 200,
						headers: { 'Content-Type': 'application/json' }
					})
				)
			)
		);
	});

	afterEach(() => {
		vi.unstubAllGlobals();
		vi.restoreAllMocks();
	});

	it('unwraps envelope and returns data', async () => {
		const env = await postCaseQuery('c1', 'tok', { question: 'hello' });
		expect(env.status).toBe('ok');
		expect(env.case_id).toBe('c1');
		expect(vi.mocked(fetch)).toHaveBeenCalled();
		const call = vi.mocked(fetch).mock.calls[0];
		const init = call[1] as RequestInit;
		expect(init?.method).toBe('POST');
		expect(String(init?.body)).toBe(JSON.stringify({ question: 'hello', scope: 'THIS_CASE' }));
	});

	it('P114-04: includes filters in JSON only when provided with active predicates', async () => {
		vi.mocked(fetch).mockClear();
		await postCaseQuery('c1', 'tok', {
			question: 'hello',
			filters: { type: 'OBSERVATION', occurred_at_from: '2024-01-01T00:00:00.000Z' }
		});
		const init = vi.mocked(fetch).mock.calls[0]?.[1] as RequestInit | undefined;
		expect(String(init?.body)).toBe(
			JSON.stringify({
				question: 'hello',
				scope: 'THIS_CASE',
				filters: { type: 'OBSERVATION', occurred_at_from: '2024-01-01T00:00:00.000Z' }
			})
		);
	});

	it('P114-04: omits empty filters object from payload', async () => {
		vi.mocked(fetch).mockClear();
		await postCaseQuery('c1', 'tok', { question: 'hello', filters: {} });
		const init = vi.mocked(fetch).mock.calls[0]?.[1] as RequestInit | undefined;
		expect(String(init?.body)).toBe(JSON.stringify({ question: 'hello', scope: 'THIS_CASE' }));
	});

	it('throws on empty question', async () => {
		await expect(postCaseQuery('c1', 'tok', { question: '   ' })).rejects.toThrow(/required/i);
	});
});
