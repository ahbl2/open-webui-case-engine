/**
 * P20-PRE-06 — Client sends `X-Request-Id`; preserves server echo on `CaseEngineRequestError`.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('P20-PRE-06 request correlation', () => {
	let fetchSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		fetchSpy = vi.spyOn(globalThis, 'fetch');
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('getCaseById sends X-Request-Id and maps response header to CaseEngineRequestError', async () => {
		fetchSpy.mockResolvedValueOnce(
			new Response(
				JSON.stringify({
					success: false,
					error: { code: 'NOT_FOUND', message: 'Case not found' }
				}),
				{
					status: 404,
					headers: {
						'Content-Type': 'application/json',
						'X-Request-Id': 'ce-echo-get-case'
					}
				}
			)
		);

		const { getCaseById, CaseEngineRequestError } = await import('../index');
		try {
			await getCaseById('00000000-0000-4000-8000-000000000001', 'tok');
			expect.fail('expected throw');
		} catch (e) {
			expect(e).toBeInstanceOf(CaseEngineRequestError);
			expect((e as InstanceType<typeof CaseEngineRequestError>).requestId).toBe('ce-echo-get-case');
		}

		const init = fetchSpy.mock.calls[0][1] as RequestInit;
		const h = new Headers(init.headers);
		expect(h.get('X-Request-Id')).toBeTruthy();
		expect(h.get('X-Request-Id')!.length).toBeGreaterThanOrEqual(8);
	});

	it('askCaseQuestion includes requestId on 422', async () => {
		fetchSpy.mockResolvedValueOnce(
			new Response(
				JSON.stringify({
					success: false,
					error: { code: 'ASK_VALIDATION_FAILED', message: 'bad', details: {} }
				}),
				{
					status: 422,
					headers: {
						'Content-Type': 'application/json',
						'X-Request-Id': 'ce-echo-ask'
					}
				}
			)
		);

		const { askCaseQuestion, CaseEngineRequestError } = await import('../index');
		try {
			await askCaseQuestion('case-1', 'Who carried the bags?', 'token');
			expect.fail('expected throw');
		} catch (e) {
			expect(e).toBeInstanceOf(CaseEngineRequestError);
			expect((e as InstanceType<typeof CaseEngineRequestError>).requestId).toBe('ce-echo-ask');
		}
	});

	it('askCrossCase includes requestId on HTTP error', async () => {
		// Use 403 — 502 would trigger safeReadFetch retries and exhaust the mock (relative `/case-api` URL in Vitest).
		fetchSpy.mockResolvedValueOnce(
			new Response(JSON.stringify({ success: false, error: { code: 'FORBIDDEN', message: 'x' } }), {
				status: 403,
				headers: {
					'Content-Type': 'application/json',
					'X-Request-Id': 'ce-echo-cross'
				}
			})
		);

		const { askCrossCase, CaseEngineRequestError } = await import('../index');
		try {
			await askCrossCase('question here ok', 'token');
			expect.fail('expected throw');
		} catch (e) {
			expect(e).toBeInstanceOf(CaseEngineRequestError);
			expect((e as InstanceType<typeof CaseEngineRequestError>).requestId).toBe('ce-echo-cross');
		}
	});
});
