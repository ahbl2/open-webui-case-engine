/**
 * P129-02 — Activity events API client: URL + envelope only (no logic).
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { listCaseActivityEvents } from '../caseP129ActivityEventsApi';

describe('caseP129ActivityEventsApi', () => {
	const orig = globalThis.fetch;

	beforeEach(() => {
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => ({
				ok: true,
				json: async () => ({
					success: true,
					data: {
						activity_events: [],
						pagination: { limit: 100, offset: 0, total_count: 0 }
					}
				})
			})) as unknown as typeof fetch
		);
	});

	afterEach(() => {
		globalThis.fetch = orig;
		vi.unstubAllGlobals();
	});

	it('requests GET /cases/:id/activity-events with query params', async () => {
		await listCaseActivityEvents('case-abc', 'tok', { limit: 10, offset: 5 });
		const fetchMock = globalThis.fetch as ReturnType<typeof vi.fn>;
		expect(fetchMock).toHaveBeenCalledTimes(1);
		const url = String(fetchMock.mock.calls[0][0]);
		expect(url).toContain('/cases/case-abc/activity-events');
		expect(url).toContain('limit=10');
		expect(url).toContain('offset=5');
	});
});
