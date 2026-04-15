/**
 * P119-04 — Case Engine export API client (envelope unwrap; no client-side export logic).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { postCaseP119Export } from '../caseP119ExportApi';

describe('postCaseP119Export', () => {
	const originalFetch = globalThis.fetch;

	beforeEach(() => {
		vi.stubGlobal(
			'fetch',
			vi.fn(async () =>
				Promise.resolve({
					ok: true,
					json: async () => ({
						success: true,
						data: { format: 'json', body: '{"a":1}' }
					})
				} as Response)
			)
		);
	});

	afterEach(() => {
		vi.unstubAllGlobals();
		globalThis.fetch = originalFetch;
	});

	it('POSTs to case-scoped export path with inclusion + format', async () => {
		const fetchMock = globalThis.fetch as ReturnType<typeof vi.fn>;
		const res = await postCaseP119Export('case-xyz', 'tok', {
			inclusion: { notes: true },
			format: 'json'
		});
		expect(fetchMock).toHaveBeenCalledTimes(1);
		const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
		expect(String(url)).toContain('/cases/case-xyz/export/p119');
		expect(init.method).toBe('POST');
		expect(init.headers).toMatchObject({
			Authorization: 'Bearer tok',
			'Content-Type': 'application/json'
		});
		expect(JSON.parse(init.body as string)).toEqual({
			inclusion: { notes: true },
			format: 'json'
		});
		expect(res.body).toBe('{"a":1}');
		expect(res.format).toBe('json');
	});

	it('includes template in POST body when provided (plain text Phase 120)', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(async () =>
				Promise.resolve({
					ok: true,
					json: async () => ({
						success: true,
						data: { format: 'plain_text', body: 'x' }
					})
				} as Response)
			)
		);
		const fetchMock = globalThis.fetch as ReturnType<typeof vi.fn>;
		await postCaseP119Export('c1', 't', {
			inclusion: {},
			format: 'plain_text',
			template: 'TIMELINE_WITH_NOTES'
		});
		const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
		expect(JSON.parse(init.body as string)).toEqual({
			inclusion: {},
			format: 'plain_text',
			template: 'TIMELINE_WITH_NOTES'
		});
	});

	it('returns body unchanged (exact string)', async () => {
		const txt = 'line1\n\nline2\t';
		vi.stubGlobal(
			'fetch',
			vi.fn(async () =>
				Promise.resolve({
					ok: true,
					json: async () => ({
						success: true,
						data: { format: 'plain_text', body: txt }
					})
				} as Response)
			)
		);
		const res = await postCaseP119Export('c1', 't', { inclusion: {}, format: 'plain_text' });
		expect(res.body).toBe(txt);
		expect(res.body.length).toBe(txt.length);
	});
});
