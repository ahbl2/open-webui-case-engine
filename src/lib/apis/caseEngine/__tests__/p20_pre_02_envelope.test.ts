/**
 * P20-PRE-02 — Client must parse canonical `{ success, data, error }` first; legacy only when `success` is absent.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

function jsonResponse(body: unknown, status = 200) {
	return new Response(JSON.stringify(body), {
		status,
		headers: { 'Content-Type': 'application/json' }
	});
}

describe('P20-PRE-02 canonical-first parsing', () => {
	let fetchSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		fetchSpy = vi.spyOn(globalThis, 'fetch');
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('login: canonical success uses data', async () => {
		fetchSpy.mockResolvedValueOnce(
			jsonResponse({
				success: true,
				data: { token: 't1', user: { id: 'u1', name: 'n', role: 'CID' } }
			})
		);
		const { login } = await import('../index');
		const out = await login('u', 'p');
		expect(out.token).toBe('t1');
		expect(out.user.id).toBe('u1');
	});

	it('login: legacy body without success still works', async () => {
		fetchSpy.mockResolvedValueOnce(jsonResponse({ token: 'legacy', user: { id: 'u1', name: 'n', role: 'CID' } }));
		const { login } = await import('../index');
		const out = await login('u', 'p');
		expect(out.token).toBe('legacy');
	});

	it('login: success true without data throws', async () => {
		fetchSpy.mockResolvedValueOnce(jsonResponse({ success: true }));
		const { login } = await import('../index');
		await expect(login('u', 'p')).rejects.toThrow(/invalid envelope/);
	});

	it('listCases: canonical array in data', async () => {
		fetchSpy.mockResolvedValueOnce(
			jsonResponse({
				success: true,
				data: [{ id: 'c1', case_number: 'X', title: 't', unit: 'CID', status: 'OPEN' }]
			})
		);
		const { listCases } = await import('../index');
		const rows = await listCases('ALL', 'tok');
		expect(rows).toHaveLength(1);
		expect(rows[0].id).toBe('c1');
	});

	it('getCaseById: uses GET /cases/:id and unwraps data', async () => {
		fetchSpy.mockResolvedValueOnce(
			jsonResponse({
				success: true,
				data: { id: 'cid', case_number: 'N', title: 'T', unit: 'CID', status: 'OPEN' }
			})
		);
		const { getCaseById } = await import('../index');
		const c = await getCaseById('cid', 'tok');
		expect(c.case_number).toBe('N');
		const [url, init] = fetchSpy.mock.calls[0];
		expect(String(url)).toContain('/cases/cid');
		expect((init as RequestInit).headers).toMatchObject({ Authorization: 'Bearer tok' });
	});

	it('createCase: POST /cases unwraps data', async () => {
		fetchSpy.mockResolvedValueOnce(
			jsonResponse(
				{
					success: true,
					data: { id: 'new', case_number: 'N', title: 'T', unit: 'CID', status: 'OPEN' }
				},
				201
			)
		);
		const { createCase } = await import('../index');
		const c = await createCase('tok', {
			case_number: 'N',
			title: 'T',
			unit: 'CID',
			status: 'OPEN'
		});
		expect(c.id).toBe('new');
		expect(fetchSpy.mock.calls[0][1]).toMatchObject({ method: 'POST' });
	});

	it('fetchCaseEngineHealth: unwraps data', async () => {
		fetchSpy.mockResolvedValueOnce(
			jsonResponse({ success: true, data: { status: 'ok', service: 'case-engine' } })
		);
		const { fetchCaseEngineHealth } = await import('../index');
		const h = await fetchCaseEngineHealth();
		expect(h.service).toBe('case-engine');
		expect(String(fetchSpy.mock.calls[0][0])).toMatch(/\/health$/);
	});

	it('HTTP error prefers canonical error.message', async () => {
		fetchSpy.mockResolvedValueOnce(
			jsonResponse({ success: false, error: { code: 'BAD_REQUEST', message: 'unit must be CID or SIU' } }, 400)
		);
		const { createCase } = await import('../index');
		await expect(
			createCase('tok', { case_number: 'x', title: 't', unit: 'CID', status: 'OPEN' })
		).rejects.toThrow(/unit must be CID or SIU/);
	});

	it('success false on OK status throws from unwrap', async () => {
		fetchSpy.mockResolvedValueOnce(
			jsonResponse({ success: false, error: { code: 'X', message: 'nope' } }, 200)
		);
		const { listCases } = await import('../index');
		await expect(listCases('ALL', 'tok')).rejects.toThrow(/nope/);
	});

	it('getCaseById: invalid envelope on OK throws CaseEngineRequestError (P20-PRE-04)', async () => {
		fetchSpy.mockResolvedValueOnce(jsonResponse({ success: true }, 200));
		const { getCaseById, CaseEngineRequestError } = await import('../index');
		let err: unknown;
		try {
			await getCaseById('cid', 'tok');
		} catch (e) {
			err = e;
		}
		expect(err).toBeInstanceOf(CaseEngineRequestError);
		expect((err as InstanceType<typeof CaseEngineRequestError>).errorCode).toBe('INVALID_ENVELOPE');
	});

	it('P20-PRE-07: askCaseQuestion rejects success envelope without data (canonical contract)', async () => {
		fetchSpy.mockResolvedValueOnce(jsonResponse({ success: true }, 200));
		const { askCaseQuestion, CaseEngineRequestError } = await import('../index');
		let err: unknown;
		try {
			await askCaseQuestion('case-1', 'question text ok?', 'tok');
		} catch (e) {
			err = e;
		}
		expect(err).toBeInstanceOf(CaseEngineRequestError);
		expect((err as InstanceType<typeof CaseEngineRequestError>).errorCode).toBe('INVALID_ENVELOPE');
	});
});
