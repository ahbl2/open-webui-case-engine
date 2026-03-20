/**
 * Guardrail tests for `askCaseQuestion` 422 retry behaviour.
 *
 * The 422 is an intermittent LLM JSON parse failure (Ollama returns prose
 * instead of the required JSON envelope). A single transparent retry is issued
 * before surfacing the error to the user.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const OK_RESPONSE = {
	answer: 'Mangis carried the bags.',
	cited_ids: ['entry-1'],
	confidence: 'HIGH',
	citations: [],
	used_citations: []
};

function make422() {
	return new Response(JSON.stringify({ error: 'AI returned invalid response', citations: [] }), {
		status: 422,
		headers: { 'Content-Type': 'application/json' }
	});
}

function makeOk() {
	return new Response(JSON.stringify(OK_RESPONSE), {
		status: 200,
		headers: { 'Content-Type': 'application/json' }
	});
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('askCaseQuestion — 422 retry', () => {
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

	it('retries once on 422 and returns the successful retry response', async () => {
		fetchSpy
			.mockResolvedValueOnce(make422())   // first attempt: 422
			.mockResolvedValueOnce(makeOk());   // retry: succeeds

		const { askCaseQuestion } = await import('../index');
		const result = await askCaseQuestion('case-1', 'Who carried the bags?', 'token');

		expect(fetchSpy).toHaveBeenCalledTimes(2);
		expect(result.answer).toBe('Mangis carried the bags.');
	});

	it('throws after two consecutive 422s (retry exhausted)', async () => {
		fetchSpy
			.mockResolvedValueOnce(make422())
			.mockResolvedValueOnce(make422());

		const { askCaseQuestion } = await import('../index');
		await expect(askCaseQuestion('case-1', 'Who carried the bags?', 'token')).rejects.toThrow(
			'AI returned invalid response'
		);
		expect(fetchSpy).toHaveBeenCalledTimes(2);
	});

	it('retry uses the identical request body', async () => {
		fetchSpy
			.mockResolvedValueOnce(make422())
			.mockResolvedValueOnce(makeOk());

		const { askCaseQuestion } = await import('../index');
		await askCaseQuestion('case-1', 'Who carried the bags?', 'token', 8);

		const [first, second] = fetchSpy.mock.calls;
		expect(first[1]?.body).toBe(second[1]?.body);
	});

	it('does not retry on non-422 errors', async () => {
		fetchSpy.mockResolvedValueOnce(
			new Response(JSON.stringify({ error: 'Internal error' }), { status: 502 })
		);

		const { askCaseQuestion } = await import('../index');
		await expect(askCaseQuestion('case-1', 'Who carried the bags?', 'token')).rejects.toThrow();
		expect(fetchSpy).toHaveBeenCalledTimes(1);
	});
});
