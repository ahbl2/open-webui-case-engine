/**
 * P20-PRE-05 — centralized retry policy (safe reads only in this module).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
	safeReadFetch,
	httpStatusIsSafeReadTransientRetryable,
	isTransportFailure
} from '../retryPolicy';

describe('retryPolicy helpers', () => {
	it('classifies transient safe-read statuses', () => {
		expect(httpStatusIsSafeReadTransientRetryable(502)).toBe(true);
		expect(httpStatusIsSafeReadTransientRetryable(503)).toBe(true);
		expect(httpStatusIsSafeReadTransientRetryable(504)).toBe(true);
		expect(httpStatusIsSafeReadTransientRetryable(429)).toBe(true);
		expect(httpStatusIsSafeReadTransientRetryable(422)).toBe(false);
		expect(httpStatusIsSafeReadTransientRetryable(404)).toBe(false);
	});

	it('isTransportFailure matches TypeError', () => {
		expect(isTransportFailure(new TypeError('Failed to fetch'))).toBe(true);
	});
});

describe('safeReadFetch', () => {
	beforeEach(() => {
		vi.useFakeTimers({ shouldAdvanceTime: true });
	});
	afterEach(() => {
		vi.useRealTimers();
		vi.restoreAllMocks();
	});

	it('retries once on 502 then succeeds', async () => {
		const fetchSpy = vi.spyOn(globalThis, 'fetch');
		fetchSpy
			.mockResolvedValueOnce(new Response('bad', { status: 502 }))
			.mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }));

		const p = safeReadFetch(() => fetch('http://x'), 'test');
		await vi.runAllTimersAsync();
		const res = await p;
		expect(res.ok).toBe(true);
		expect(fetchSpy).toHaveBeenCalledTimes(2);
	});

	it('does not retry 422', async () => {
		const fetchSpy = vi.spyOn(globalThis, 'fetch');
		fetchSpy.mockResolvedValueOnce(
			new Response(JSON.stringify({ error: 'no' }), { status: 422 })
		);
		const p = safeReadFetch(() => fetch('http://x'), 'test');
		await vi.runAllTimersAsync();
		const res = await p;
		expect(res.status).toBe(422);
		expect(fetchSpy).toHaveBeenCalledTimes(1);
	});

	it('honors Retry-After on 429 when retrying', async () => {
		const fetchSpy = vi.spyOn(globalThis, 'fetch');
		fetchSpy
			.mockResolvedValueOnce(
				new Response('wait', { status: 429, headers: { 'Retry-After': '1' } })
			)
			.mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }));

		const p = safeReadFetch(() => fetch('http://x'), 'test');
		await vi.runAllTimersAsync();
		const res = await p;
		expect(res.ok).toBe(true);
		expect(fetchSpy).toHaveBeenCalledTimes(2);
	});
});
