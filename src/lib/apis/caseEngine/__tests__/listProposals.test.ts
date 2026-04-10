/**
 * P19.75-08 — listProposals must use a path string for relative CASE_ENGINE_BASE_URL.
 * `new URL('/case-api/...')` throws TypeError before fetch (invalid relative URL without base).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

function jsonResponse(body: unknown, status = 200) {
	return new Response(JSON.stringify(body), {
		status,
		headers: { 'Content-Type': 'application/json' }
	});
}

describe('listProposals', () => {
	let fetchSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		fetchSpy = vi.spyOn(globalThis, 'fetch');
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('calls fetch with path-only URL and does not throw before fetch (relative /case-api)', async () => {
		fetchSpy.mockResolvedValueOnce(jsonResponse([]));

		const { listProposals } = await import('../index');
		const result = await listProposals('550e8400-e29b-41d4-a716-446655440000', 'tok');

		expect(fetchSpy).toHaveBeenCalledTimes(1);
		const [url, init] = fetchSpy.mock.calls[0];
		expect(url).toBe('/case-api/cases/550e8400-e29b-41d4-a716-446655440000/proposals');
		expect((init as RequestInit).headers).toMatchObject({
			Authorization: 'Bearer tok',
			'Content-Type': 'application/json'
		});
		expect(result).toEqual([]);
	});

	it('appends status query when provided', async () => {
		fetchSpy.mockResolvedValueOnce(jsonResponse([]));

		const { listProposals } = await import('../index');
		await listProposals('case-1', 'tok', 'pending');

		const [url] = fetchSpy.mock.calls[0];
		expect(url).toBe('/case-api/cases/case-1/proposals?status=pending');
	});

	it('returns proposal array on 200', async () => {
		const row = {
			id: 'p1',
			case_id: 'case-1',
			source_scope: 'case',
			source_thread_id: 't1',
			source_message_id: null,
			proposal_type: 'note',
			proposed_payload: '{}',
			status: 'pending',
			created_by: 'u1',
			created_at: '2024-01-01T00:00:00Z',
			reviewed_by: null,
			reviewed_at: null,
			committed_at: null,
			committed_record_id: null,
			rejection_reason: null
		};
		fetchSpy.mockResolvedValueOnce(jsonResponse([row]));

		const { listProposals } = await import('../index');
		const result = await listProposals('case-1', 'tok');
		expect(result).toHaveLength(1);
		expect(result[0].id).toBe('p1');
	});

	it('P43-06: 200 with non-array JSON does not return empty list — throws', async () => {
		fetchSpy.mockResolvedValueOnce(jsonResponse({ proposals: [] }));

		const { listProposals } = await import('../index');
		await expect(listProposals('case-1', 'tok')).rejects.toThrow(/not a JSON array/);
	});

	it('P43-06: 200 with invalid JSON body (parse fallback {}) throws', async () => {
		fetchSpy.mockResolvedValueOnce(
			new Response('not json', { status: 200, headers: { 'Content-Type': 'text/plain' } })
		);

		const { listProposals } = await import('../index');
		await expect(listProposals('case-1', 'tok')).rejects.toThrow(/not a JSON array/);
	});

	it('P43-06: valid empty array on 200 still succeeds', async () => {
		fetchSpy.mockResolvedValueOnce(jsonResponse([]));

		const { listProposals } = await import('../index');
		const result = await listProposals('case-1', 'tok');
		expect(result).toEqual([]);
	});
});
