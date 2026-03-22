/**
 * P20-PRE-05 — Centralized Case Engine retry / connection guardrails (client only).
 *
 * Policy summary:
 * - `safeReadFetch`: GET + “read-like” POST (ask) — retries transport failures and 429 / 502 / 503 / 504 only.
 * - Mutating routes (including `POST /auth/owui/browser-resolve`): **no** auto-retry here — use plain `fetch` at call sites.
 *
 * Never retried: 400, 401, 403, 404, 422, other 4xx (except 429), invalid envelope (handled after OK response).
 *
 * P20-PRE-06 — Request id: callers should pass the same `X-Request-Id` on each `doFetch()` invocation so one logical operation stays one `request_id` across retries. Pre-20 does not emit attempt-level ids.
 */

export const SAFE_READ_MAX_ATTEMPTS = 3;

export function backoffMs(attemptIndex: number): number {
	return 250 * (attemptIndex + 1);
}

/** True for failed `fetch()` (offline, DNS, CORS network layer, etc.). */
export function isTransportFailure(err: unknown): boolean {
	if (err instanceof TypeError) return true;
	const msg = err instanceof Error ? err.message : String(err);
	return /failed to fetch|networkerror|load failed|network request failed/i.test(msg);
}

/** Safe-read retry: rate limit + gateway / upstream unavailable. */
export function httpStatusIsSafeReadTransientRetryable(status: number): boolean {
	return status === 429 || status === 502 || status === 503 || status === 504;
}

async function drainResponseBody(res: Response): Promise<void> {
	try {
		await res.text();
	} catch {
		/* ignore */
	}
}

function retryAfterMsFromResponse(res: Response): number | null {
	const h = res.headers.get('Retry-After');
	if (h == null) return null;
	const sec = parseInt(h, 10);
	if (Number.isNaN(sec) || sec < 0) return null;
	return sec * 1000;
}

/**
 * Safe read / ask: retry transient HTTP + transport only.
 * Returns the final `Response` (caller checks `ok`, parses body, unwraps envelope).
 * Loop iterations are transport/HTTP retries; correlation ids are the caller’s responsibility (see P20-PRE-06 file comment).
 */
export async function safeReadFetch(
	doFetch: () => Promise<Response>,
	_context: string
): Promise<Response> {
	let lastTransportErr: unknown;
	for (let attempt = 0; attempt < SAFE_READ_MAX_ATTEMPTS; attempt++) {
		try {
			const res = await doFetch();
			if (res.ok) {
				return res;
			}
			if (httpStatusIsSafeReadTransientRetryable(res.status) && attempt < SAFE_READ_MAX_ATTEMPTS - 1) {
				let delay = backoffMs(attempt);
				if (res.status === 429) {
					const ra = retryAfterMsFromResponse(res);
					if (ra != null) delay = Math.max(delay, ra);
				}
				await drainResponseBody(res);
				await new Promise((r) => setTimeout(r, delay));
				continue;
			}
			return res;
		} catch (e) {
			lastTransportErr = e;
			if (isTransportFailure(e) && attempt < SAFE_READ_MAX_ATTEMPTS - 1) {
				await new Promise((r) => setTimeout(r, backoffMs(attempt)));
				continue;
			}
			throw e;
		}
	}
	throw lastTransportErr;
}
