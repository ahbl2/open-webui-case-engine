/**
 * P20-PRE-05 — mutating Case Engine calls must not auto-retry (incl. bootstrap).
 */
import { describe, it, expect, vi, afterEach } from 'vitest';

describe('mutating routes — no retry helper / single-shot fetch', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('createCase issues exactly one fetch on 502', async () => {
		const fetchSpy = vi.spyOn(globalThis, 'fetch');
		fetchSpy.mockResolvedValueOnce(
			new Response(JSON.stringify({ success: false, error: { code: 'X', message: 'n' } }), {
				status: 502
			})
		);
		const { createCase } = await import('../index');
		await expect(
			createCase('tok', {
				case_number: 'x',
				title: 't',
				unit: 'CID',
				status: 'OPEN',
				incident_date: '2026-01-01'
			})
		).rejects.toThrow();
		expect(fetchSpy).toHaveBeenCalledTimes(1);
	});

	it('browserResolveOwuiAuth is single-shot on transport failure (no second fetch)', async () => {
		const fetchSpy = vi.spyOn(globalThis, 'fetch');
		fetchSpy.mockRejectedValueOnce(new TypeError('Failed to fetch'));

		const { browserResolveOwuiAuth, BrowserResolveFailure } = await import('../index');
		await expect(
			browserResolveOwuiAuth({
				owui_user_id: 'u1',
				username_or_email: 'a@b.c'
			})
		).rejects.toThrow(BrowserResolveFailure);

		expect(fetchSpy).toHaveBeenCalledTimes(1);
	});
});
