/**
 * P40-05C / P40-05D — Bulk confirm request body + success envelope unwrapping + stable counts for UI.
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
			jsonResponse({
				proposals: [],
				proposal_count: 11,
				bulk_threshold: 10,
				source_text_truncated_for_model: false
			},
			201)
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

	it('attaches bulk_confirmation_token to thrown 409 error for UI modal state', async () => {
		fetchSpy.mockResolvedValueOnce(
			jsonResponse(
				{
					error: 'BULK',
					code: 'BULK_PROPOSAL_CONFIRMATION_REQUIRED',
					proposal_count: 12,
					threshold: 10,
					bulk_confirmation_token: 'srv-token'
				},
				409
			)
		);
		const { proposeTimelineEntriesFromCaseFile } = await import('../index');
		try {
			await proposeTimelineEntriesFromCaseFile('c', 'f', 'jwt', {});
			expect.fail('expected throw');
		} catch (e: unknown) {
			const err = e as Error & {
				code?: string;
				bulk_confirmation_token?: string;
				status?: number;
			};
			expect(err.status).toBe(409);
			expect(err.code).toBe('BULK_PROPOSAL_CONFIRMATION_REQUIRED');
			expect(err.bulk_confirmation_token).toBe('srv-token');
		}
	});

	it('P40-05D: unwraps P20 envelope on 201 so proposal_count is available to the UI', async () => {
		fetchSpy.mockResolvedValueOnce(
			jsonResponse(
				{
					success: true,
					data: {
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
		expect(out.proposal_count).toBe(1);
		expect(out.proposals).toHaveLength(1);
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
		expect(out.proposal_count).toBe(2);
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
