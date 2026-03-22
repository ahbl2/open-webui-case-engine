/**
 * P20-PRE-05 — `askCaseQuestion` uses safe-read retry (no 422 retry).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const OK_RESPONSE = {
	answer: 'Mangis carried the bags.',
	cited_ids: ['entry-1'],
	confidence: 'HIGH',
	citations: [],
	used_citations: []
};

function makeOk() {
	return new Response(JSON.stringify(OK_RESPONSE), {
		status: 200,
		headers: { 'Content-Type': 'application/json' }
	});
}

function make422() {
	return new Response(JSON.stringify({ error: 'AI returned invalid response', citations: [] }), {
		status: 422,
		headers: { 'Content-Type': 'application/json' }
	});
}

describe('askCaseQuestion — P20-PRE-05 (no fake timers — 422 path)', () => {
	let fetchSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		fetchSpy = vi.spyOn(globalThis, 'fetch');
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('succeeds on first attempt without retry', async () => {
		fetchSpy.mockResolvedValueOnce(makeOk());

		const { askCaseQuestion } = await import('../index');
		const result = await askCaseQuestion('case-1', 'Who carried the bags?', 'token');

		expect(fetchSpy).toHaveBeenCalledTimes(1);
		expect(result.answer).toBe('Mangis carried the bags.');
	});

	it('does not retry 422 (validation / contract failure)', async () => {
		fetchSpy.mockResolvedValueOnce(make422());

		const { askCaseQuestion, CaseEngineRequestError } = await import('../index');
		await expect(askCaseQuestion('case-1', 'Who carried the bags?', 'token')).rejects.toThrow(
			CaseEngineRequestError
		);
		expect(fetchSpy).toHaveBeenCalledTimes(1);
	});

	it('does not retry 422 when a second OK would exist (still one fetch)', async () => {
		fetchSpy
			.mockResolvedValueOnce(make422())
			.mockResolvedValueOnce(makeOk());

		const { askCaseQuestion } = await import('../index');
		await expect(askCaseQuestion('case-1', 'Who carried the bags?', 'token')).rejects.toThrow();
		expect(fetchSpy).toHaveBeenCalledTimes(1);
	});
});

describe('askCaseQuestion — P20-PRE-05 (fake timers — 502 backoff)', () => {
	let fetchSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		vi.useFakeTimers({ shouldAdvanceTime: true });
		fetchSpy = vi.spyOn(globalThis, 'fetch');
	});

	afterEach(() => {
		vi.useRealTimers();
		vi.restoreAllMocks();
	});

	it('retries on 502 then succeeds', async () => {
		fetchSpy
			.mockResolvedValueOnce(new Response(JSON.stringify({ error: 'bad' }), { status: 502 }))
			.mockResolvedValueOnce(makeOk());

		const { askCaseQuestion } = await import('../index');
		const p = askCaseQuestion('case-1', 'Who carried the bags?', 'token');
		await vi.runAllTimersAsync();
		const result = await p;

		expect(fetchSpy).toHaveBeenCalledTimes(2);
		expect(result.answer).toBe('Mangis carried the bags.');
	});
});

describe('fetchCaseEngineHealth — P20-PRE-05 / P20-PRE-07 (safe-read retry on transient 502)', () => {
	let fetchSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		vi.useFakeTimers({ shouldAdvanceTime: true });
		fetchSpy = vi.spyOn(globalThis, 'fetch');
	});

	afterEach(() => {
		vi.useRealTimers();
		vi.restoreAllMocks();
	});

	it('retries 502 then unwraps canonical health envelope', async () => {
		fetchSpy
			.mockResolvedValueOnce(new Response(JSON.stringify({ error: 'bad' }), { status: 502 }))
			.mockResolvedValueOnce(
				new Response(
					JSON.stringify({
						success: true,
						data: { service: 'case-engine', status: 'ok' }
					}),
					{ status: 200, headers: { 'Content-Type': 'application/json' } }
				)
			);

		const { fetchCaseEngineHealth } = await import('../index');
		const p = fetchCaseEngineHealth();
		await vi.runAllTimersAsync();
		const h = await p;

		expect(fetchSpy).toHaveBeenCalledTimes(2);
		expect(h.service).toBe('case-engine');
	});
});
