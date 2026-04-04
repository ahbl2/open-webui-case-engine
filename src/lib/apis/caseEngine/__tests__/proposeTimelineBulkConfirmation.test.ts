/**
 * P40-05C / P40-05D / P40-05E — Bulk confirm body, envelope unwrap, typed confirmation_required (no error path).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

function jsonResponse(body: unknown, status = 200) {
	return new Response(JSON.stringify(body), {
		status,
		headers: { 'Content-Type': 'application/json' }
	});
}

describe('proposeTimelineEntriesFromCaseFile bulk confirmation token', () => {
	let fetchSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		fetchSpy = vi.spyOn(globalThis, 'fetch');
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('includes bulk_confirmation_token in JSON body when confirm_bulk and token provided', async () => {
		fetchSpy.mockResolvedValueOnce(
			jsonResponse(
				{
					status: 'created',
					proposals: [],
					proposal_count: 0,
					bulk_threshold: 10,
					source_text_truncated_for_model: false
				},
				201
			)
		);
		const { proposeTimelineEntriesFromCaseFile } = await import('../index');
		await proposeTimelineEntriesFromCaseFile('case-1', 'file-2', 'jwt', {
			confirm_bulk: true,
			bulk_confirmation_token: 'pending-token-uuid'
		});
		expect(fetchSpy).toHaveBeenCalledTimes(1);
		const init = fetchSpy.mock.calls[0][1] as RequestInit;
		const body = JSON.parse(String(init.body)) as Record<string, unknown>;
		expect(body.confirm_bulk).toBe(true);
		expect(body.bulk_confirmation_token).toBe('pending-token-uuid');
	});

	it('P40-05E: 200 confirmation_required returns typed outcome (not an error)', async () => {
		fetchSpy.mockResolvedValueOnce(
			jsonResponse(
				{
					status: 'confirmation_required',
					proposal_count: 12,
					threshold: 10,
					bulk_threshold: 10,
					bulk_confirmation_token: 'srv-token'
				},
				200
			)
		);
		const { proposeTimelineEntriesFromCaseFile } = await import('../index');
		const out = await proposeTimelineEntriesFromCaseFile('c', 'f', 'jwt', {});
		expect(out.status).toBe('confirmation_required');
		if (out.status === 'confirmation_required') {
			expect(out.proposal_count).toBe(12);
			expect(out.threshold).toBe(10);
			expect(out.bulk_confirmation_token).toBe('srv-token');
		}
	});

	it('P40-05E transition: legacy 409 BULK_PROPOSAL maps to confirmation_required', async () => {
		fetchSpy.mockResolvedValueOnce(
			jsonResponse(
				{
					error: 'legacy',
					code: 'BULK_PROPOSAL_CONFIRMATION_REQUIRED',
					proposal_count: 11,
					threshold: 10,
					bulk_confirmation_token: 'legacy-tok'
				},
				409
			)
		);
		const { proposeTimelineEntriesFromCaseFile } = await import('../index');
		const out = await proposeTimelineEntriesFromCaseFile('c', 'f', 'jwt', {});
		expect(out.status).toBe('confirmation_required');
		if (out.status === 'confirmation_required') {
			expect(out.bulk_confirmation_token).toBe('legacy-tok');
			expect(out.proposal_count).toBe(11);
		}
	});

	it('P40-05D: unwraps P20 envelope on 201 created so proposal_count is available', async () => {
		fetchSpy.mockResolvedValueOnce(
			jsonResponse(
				{
					success: true,
					data: {
						status: 'created',
						proposals: [{ id: 'p1' } as never],
						proposal_count: 1,
						bulk_threshold: 10,
						source_text_truncated_for_model: false
					}
				},
				201
			)
		);
		const { proposeTimelineEntriesFromCaseFile } = await import('../index');
		const out = await proposeTimelineEntriesFromCaseFile('c', 'f', 'jwt', {
			confirm_bulk: true,
			bulk_confirmation_token: 't'
		});
		expect(out.status).toBe('created');
		if (out.status === 'created') {
			expect(out.proposal_count).toBe(1);
			expect(out.proposals).toHaveLength(1);
		}
	});

	it('P40-05D: derives proposal_count from proposals when count omitted (legacy flat body)', async () => {
		fetchSpy.mockResolvedValueOnce(
			jsonResponse(
				{
					proposals: [{ id: 'a' } as never, { id: 'b' } as never],
					bulk_threshold: 10,
					source_text_truncated_for_model: false
				} as Record<string, unknown>,
				201
			)
		);
		const { proposeTimelineEntriesFromCaseFile } = await import('../index');
		const out = await proposeTimelineEntriesFromCaseFile('c', 'f', 'jwt', {});
		expect(out.status).toBe('created');
		if (out.status === 'created') {
			expect(out.proposal_count).toBe(2);
		}
	});

	it('P41-14: forwards AbortSignal to fetch when provided', async () => {
		fetchSpy.mockResolvedValueOnce(
			jsonResponse(
				{
					status: 'created',
					proposals: [],
					proposal_count: 0,
					bulk_threshold: 10,
					source_text_truncated_for_model: false
				},
				201
			)
		);
		const ac = new AbortController();
		const { proposeTimelineEntriesFromCaseFile } = await import('../index');
		await proposeTimelineEntriesFromCaseFile('c', 'f', 'jwt', { signal: ac.signal });
		expect(fetchSpy).toHaveBeenCalledTimes(1);
		const init = fetchSpy.mock.calls[0][1] as RequestInit;
		expect(init.signal).toBe(ac.signal);
	});

	it('P40-05D: 400 invalid/expired token surfaces message via extractApiErrorMessage', async () => {
		const bodyText =
			'Bulk confirmation is invalid or expired. Run propose timeline entries again to regenerate.';
		fetchSpy.mockResolvedValueOnce(jsonResponse({ error: bodyText }, 400));
		const { proposeTimelineEntriesFromCaseFile } = await import('../index');
		await expect(
			proposeTimelineEntriesFromCaseFile('c', 'f', 'jwt', {
				confirm_bulk: true,
				bulk_confirmation_token: 'stale'
			})
		).rejects.toThrow(bodyText);
	});
});
