import { afterEach, describe, expect, it, vi } from 'vitest';

function jsonResponse(body: unknown, status = 200) {
	return new Response(JSON.stringify(body), {
		status,
		headers: { 'Content-Type': 'application/json' }
	});
}

function deferred<T>() {
	let resolve!: (value: T) => void;
	let reject!: (reason?: unknown) => void;
	const promise = new Promise<T>((res, rej) => {
		resolve = res;
		reject = rej;
	});
	return { promise, resolve, reject };
}

describe('resolveBrowserAuthOnce', () => {
	afterEach(() => {
		vi.useRealTimers();
		vi.restoreAllMocks();
	});

	it('uses single-flight and shares one in-flight request', async () => {
		const fetchSpy = vi.spyOn(globalThis, 'fetch');
		const pending = deferred<Response>();
		fetchSpy.mockReturnValueOnce(pending.promise as Promise<Response>);

		const { resolveBrowserAuthOnce } = await import('../index');
		const params = { owui_user_id: 'u1', username_or_email: 'u1@example.com', display_name: 'User 1' };
		const p1 = resolveBrowserAuthOnce(params);
		const p2 = resolveBrowserAuthOnce(params);

		expect(fetchSpy).toHaveBeenCalledTimes(1);
		pending.resolve(
			jsonResponse({
				state: 'active',
				user: { id: 'ce-1', role: 'admin', units: ['CID'], capabilities: [] },
				token: 'tok-1'
			})
		);

		const [a, b] = await Promise.all([p1, p2]);
		expect(a.state).toBe('active');
		expect(b.state).toBe('active');
	});

	it('retries with backoff and enforces cooldown for 429', async () => {
		vi.useFakeTimers();
		const fetchSpy = vi.spyOn(globalThis, 'fetch');
		for (let i = 0; i < 4; i += 1) {
			fetchSpy.mockResolvedValueOnce(
				jsonResponse(
					{ success: false, error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Too many requests' } },
					429
				)
			);
		}

		const { resolveBrowserAuthOnce, BrowserResolveFailure } = await import('../index');
		const params = { owui_user_id: 'u2', username_or_email: 'u2@example.com', display_name: 'User 2' };
		const firstAttempt = resolveBrowserAuthOnce(params);
		const firstAttemptExpectation = expect(firstAttempt).rejects.toBeInstanceOf(BrowserResolveFailure);

		await vi.advanceTimersByTimeAsync(4000);
		await vi.advanceTimersByTimeAsync(4000);
		await vi.advanceTimersByTimeAsync(4000);

		await firstAttemptExpectation;
		expect(fetchSpy).toHaveBeenCalledTimes(4);

		// Cooldown should short-circuit immediate retries with no new fetch.
		await expect(resolveBrowserAuthOnce(params)).rejects.toBeInstanceOf(BrowserResolveFailure);
		expect(fetchSpy).toHaveBeenCalledTimes(4);
	});
});
