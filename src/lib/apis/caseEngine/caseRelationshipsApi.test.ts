/**
 * P115-04 — Case relationships API client.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { createCaseRelationship, listCaseRelationships, CASE_RELATIONSHIP_TYPES } from './caseRelationshipsApi';

const here = dirname(fileURLToPath(import.meta.url));
const apiPath = join(here, 'caseRelationshipsApi.ts');

describe('caseRelationshipsApi.ts (static)', () => {
	const src = readFileSync(apiPath, 'utf8');

	it('targets GET and POST /cases/:id/relationships', () => {
		expect(src).toContain('/relationships');
		expect(src).toContain('encodeURIComponent(caseId)');
	});

	it('exposes only allowed relationship types', () => {
		expect(CASE_RELATIONSHIP_TYPES).toEqual(['RELATED_TO', 'DERIVED_FROM', 'ASSOCIATED_WITH']);
	});

	it('stringifies only the operator body for create (no extra keys in POST payload)', () => {
		expect(src).toContain('JSON.stringify(body)');
		expect(src).not.toMatch(/JSON\.stringify\(\s*\{[^}]*actor/);
	});
});

describe('createCaseRelationship', () => {
	beforeEach(() => {
		vi.stubGlobal(
			'fetch',
			vi.fn(async () =>
				Promise.resolve(
					new Response(
						JSON.stringify({
							relationship: {
								relationship_id: 'rid-1',
								case_id: 'c1',
								source_record_type: 'timeline_entry',
								source_record_id: 'a',
								target_record_type: 'case_file',
								target_record_id: 'b',
								relationship_type: 'RELATED_TO',
								created_at: 'x',
								created_by: 'u1',
								deleted_at: null
							}
						}),
						{ status: 201, headers: { 'Content-Type': 'application/json' } }
					)
				)
			)
		);
	});

	afterEach(() => {
		vi.unstubAllGlobals();
		vi.restoreAllMocks();
	});

	it('POSTs only relationship fields', async () => {
		await createCaseRelationship('c1', 'tok', {
			source_record_type: 'timeline_entry',
			source_record_id: 'a',
			target_record_type: 'case_file',
			target_record_id: 'b',
			relationship_type: 'RELATED_TO'
		});
		const init = vi.mocked(fetch).mock.calls[0]?.[1] as RequestInit;
		expect(init?.method).toBe('POST');
		expect(String(init?.body)).toBe(
			JSON.stringify({
				source_record_type: 'timeline_entry',
				source_record_id: 'a',
				target_record_type: 'case_file',
				target_record_id: 'b',
				relationship_type: 'RELATED_TO'
			})
		);
	});
});

describe('listCaseRelationships', () => {
	beforeEach(() => {
		vi.stubGlobal(
			'fetch',
			vi.fn(async () =>
				Promise.resolve(
					new Response(JSON.stringify({ relationships: [] }), {
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

	it('GETs the relationships endpoint', async () => {
		await listCaseRelationships('c1', 'tok');
		const url = String(vi.mocked(fetch).mock.calls[0]?.[0]);
		expect(url).toContain('/cases/c1/relationships');
		const init = vi.mocked(fetch).mock.calls[0]?.[1] as RequestInit | undefined;
		expect(init?.method).toBeUndefined();
	});
});
