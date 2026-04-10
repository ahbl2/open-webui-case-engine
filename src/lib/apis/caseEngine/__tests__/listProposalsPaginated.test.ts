/**
 * P43-08 — listProposalsPaginated client parsing and request params.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

function jsonResponse(body: unknown, status = 200) {
	return new Response(JSON.stringify(body), {
		status,
		headers: { 'Content-Type': 'application/json' }
	});
}

describe('listProposalsPaginated', () => {
	let fetchSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		fetchSpy = vi.spyOn(globalThis, 'fetch');
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('builds query with status, limit, offset, optional proposal_type', async () => {
		fetchSpy.mockResolvedValueOnce(
			jsonResponse({
				proposals: [],
				total: 0,
				limit: 50,
				offset: 50,
				totalsByStatus: { pending: 0, approved: 0, rejected: 0, committed: 0 }
			})
		);

		const { listProposalsPaginated } = await import('../index');
		const r = await listProposalsPaginated('case-x', 'tok', 'approved', {
			limit: 50,
			offset: 50,
			proposalType: 'timeline'
		});

		expect(fetchSpy).toHaveBeenCalledTimes(1);
		const [url] = fetchSpy.mock.calls[0];
		expect(String(url)).toContain('/case-api/cases/case-x/proposals?');
		expect(String(url)).toContain('status=approved');
		expect(String(url)).toContain('limit=50');
		expect(String(url)).toContain('offset=50');
		expect(String(url)).toContain('proposal_type=timeline');
		expect(r.total).toBe(0);
		expect(r.totalsByStatus.approved).toBe(0);
	});

	it('includes query param when non-empty (P43-10)', async () => {
		fetchSpy.mockResolvedValueOnce(
			jsonResponse({
				proposals: [],
				total: 0,
				limit: 50,
				offset: 0,
				totalsByStatus: { pending: 0, approved: 0, rejected: 0, committed: 0 }
			})
		);

		const { listProposalsPaginated } = await import('../index');
		await listProposalsPaginated('case-x', 'tok', 'pending', {
			limit: 50,
			offset: 0,
			query: '  alpha  '
		});

		const [url] = fetchSpy.mock.calls[0];
		expect(String(url)).toContain('query=alpha');
	});

	it('rejects non-object 200 body (P43-06 discipline)', async () => {
		fetchSpy.mockResolvedValueOnce(jsonResponse('unexpected', 200));

		const { listProposalsPaginated } = await import('../index');
		await expect(
			listProposalsPaginated('c', 't', 'pending', { limit: 10, offset: 0 })
		).rejects.toThrow(/not a JSON object/);
	});

	it('rejects envelope missing proposals array', async () => {
		fetchSpy.mockResolvedValueOnce(
			jsonResponse({ total: 1, limit: 10, offset: 0, totalsByStatus: {} }, 200)
		);

		const { listProposalsPaginated } = await import('../index');
		await expect(
			listProposalsPaginated('c', 't', 'pending', { limit: 10, offset: 0 })
		).rejects.toThrow(/missing a proposals array/);
	});
});
