/**
 * P40-05C — Client sends bulk_confirmation_token with confirm_bulk for fast server confirm.
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
});
