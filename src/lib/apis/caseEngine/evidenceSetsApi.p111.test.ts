/**
 * P111-04 — Export fetch: correct URLs, binary body, JSON errors; no payload construction.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchEvidenceSetExportDocx, fetchEvidenceSetExportPdf } from './evidenceSetsApi';

describe('evidenceSetsApi P111-04 export', () => {
	const origFetch = globalThis.fetch;

	beforeEach(() => {
		globalThis.fetch = vi.fn();
	});

	afterEach(() => {
		globalThis.fetch = origFetch;
	});

	it('fetchEvidenceSetExportDocx calls GET export/docx with Bearer only', async () => {
		const blob = new Blob([new Uint8Array([1, 2, 3])], { type: 'application/octet-stream' });
		vi.mocked(globalThis.fetch).mockResolvedValue(
			new Response(blob, { status: 200, headers: { 'Content-Type': 'application/octet-stream' } })
		);
		const out = await fetchEvidenceSetExportDocx('cid-1', 'sid-2', 'tok');
		expect((globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls.length).toBe(1);
		const [url, init] = vi.mocked(globalThis.fetch).mock.calls[0] as [string, RequestInit];
		expect(url).toContain('/cases/cid-1/evidence-sets/sid-2/export/docx');
		expect(init.method).toBe('GET');
		expect((init.headers as Record<string, string>).Authorization).toBe('Bearer tok');
		expect(init.body).toBeUndefined();
		expect(await out.arrayBuffer()).toEqual(await blob.arrayBuffer());
	});

	it('fetchEvidenceSetExportPdf calls GET export/pdf with Bearer only', async () => {
		const blob = new Blob([new Uint8Array([1, 2, 3])], { type: 'application/pdf' });
		vi.mocked(globalThis.fetch).mockResolvedValue(
			new Response(blob, { status: 200, headers: { 'Content-Type': 'application/pdf' } })
		);
		const out = await fetchEvidenceSetExportPdf('cid-1', 'sid-2', 'tok');
		const [url] = vi.mocked(globalThis.fetch).mock.calls[0] as [string, RequestInit];
		expect(url).toContain('/cases/cid-1/evidence-sets/sid-2/export/pdf');
		expect(await out.arrayBuffer()).toEqual(await blob.arrayBuffer());
	});

	it('non-OK response throws with explicit message (no silent failure)', async () => {
		vi.mocked(globalThis.fetch).mockResolvedValue(
			new Response(JSON.stringify({ error: 'Evidence set not found' }), {
				status: 404,
				headers: { 'Content-Type': 'application/json' }
			})
		);
		await expect(fetchEvidenceSetExportDocx('c', 's', 't')).rejects.toThrow(/Evidence set not found/);
	});
});
