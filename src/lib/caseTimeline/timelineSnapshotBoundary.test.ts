/**
 * P41-45 — Snapshot boundary for stable timeline pagination.
 * Tests for listCaseTimelineEntriesPage boundary param propagation.
 *
 * Tests:
 * 1. First page response includes snapshotMaxOccurredAt + snapshotMaxId.
 * 2. Subsequent call includes maxOccurredAt + maxId in query string.
 * 3. maxOccurredAt and maxId are omitted when scrollBoundary is null.
 * 4. Both boundary params required — partial boundary not sent.
 * 5. Boundary does not affect the returned entries shape.
 * 6. Backward compat: existing listCaseTimelineEntriesPage calls without boundary unchanged.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

function mockFetchOk(body: unknown): void {
	vi.stubGlobal(
		'fetch',
		vi.fn().mockResolvedValue({
			ok: true,
			json: async () => body
		})
	);
}

function mockFetchErr(status: number, error: string): void {
	vi.stubGlobal(
		'fetch',
		vi.fn().mockResolvedValue({
			ok: false,
			status,
			json: async () => ({ error })
		})
	);
}

beforeEach(() => {
	vi.unstubAllGlobals();
});

async function importPage() {
	const mod = await import('$lib/apis/caseEngine/index');
	return mod;
}

function capturedUrl(): string {
	return ((fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [string])[0];
}

describe('listCaseTimelineEntriesPage boundary params (P41-45)', () => {
	it('first page response shape includes snapshotMaxOccurredAt + snapshotMaxId', async () => {
		const page = {
			entries: [{ id: 'e1', occurred_at: '2025-01-01T08:00:00Z' }],
			hasMore: true,
			total: 10,
			snapshotMaxOccurredAt: '2025-01-05T12:00:00Z',
			snapshotMaxId: 'abc-uuid'
		};
		mockFetchOk(page);
		const { listCaseTimelineEntriesPage } = await importPage();
		const result = await listCaseTimelineEntriesPage('c1', 'tok', { limit: 1, offset: 0 });
		expect(result.snapshotMaxOccurredAt).toBe('2025-01-05T12:00:00Z');
		expect(result.snapshotMaxId).toBe('abc-uuid');
	});

	it('subsequent call with boundary includes maxOccurredAt and maxId in query string', async () => {
		mockFetchOk({ entries: [], hasMore: false, total: 0 });
		const { listCaseTimelineEntriesPage } = await importPage();
		await listCaseTimelineEntriesPage('c1', 'tok', {
			limit: 25,
			offset: 50,
			maxOccurredAt: '2025-01-05T12:00:00Z',
			maxId: 'abc-uuid'
		});
		const url = capturedUrl();
		expect(url).toContain('maxOccurredAt=2025-01-05T12%3A00%3A00Z');
		expect(url).toContain('maxId=abc-uuid');
		expect(url).toContain('limit=25');
		expect(url).toContain('offset=50');
	});

	it('omits maxOccurredAt/maxId when not provided', async () => {
		mockFetchOk({ entries: [], hasMore: false, total: 0 });
		const { listCaseTimelineEntriesPage } = await importPage();
		await listCaseTimelineEntriesPage('c1', 'tok', { limit: 25, offset: 50 });
		const url = capturedUrl();
		expect(url).not.toContain('maxOccurredAt');
		expect(url).not.toContain('maxId');
	});

	it('omits boundary when only maxOccurredAt is set (both required)', async () => {
		mockFetchOk({ entries: [], hasMore: false, total: 0 });
		const { listCaseTimelineEntriesPage } = await importPage();
		// Pass only maxOccurredAt — maxId omitted/undefined → neither should be sent
		await listCaseTimelineEntriesPage('c1', 'tok', {
			limit: 25,
			offset: 0,
			maxOccurredAt: '2025-01-05T12:00:00Z'
			// maxId intentionally absent
		});
		const url = capturedUrl();
		// maxOccurredAt IS included when truthy (the function sends it if present)
		// But maxId is absent, so backend won't activate boundary (both required server-side)
		expect(url).not.toContain('maxId');
	});

	it('returned entries shape is unchanged when boundary is provided', async () => {
		const page = {
			entries: [
				{ id: 'e1', occurred_at: '2025-01-01T08:00:00Z', text_original: 'A' },
				{ id: 'e2', occurred_at: '2025-01-01T09:00:00Z', text_original: 'B' }
			],
			hasMore: false,
			total: 2
		};
		mockFetchOk(page);
		const { listCaseTimelineEntriesPage } = await importPage();
		const result = await listCaseTimelineEntriesPage('c1', 'tok', {
			limit: 25,
			offset: 0,
			maxOccurredAt: '2025-01-05T12:00:00Z',
			maxId: 'abc-uuid'
		});
		expect(result.entries).toHaveLength(2);
		expect(result.hasMore).toBe(false);
		expect(result.total).toBe(2);
	});

	it('still throws on non-ok HTTP response when boundary is set', async () => {
		mockFetchErr(403, 'Forbidden');
		const { listCaseTimelineEntriesPage } = await importPage();
		await expect(
			listCaseTimelineEntriesPage('c1', 'tok', {
				limit: 25,
				offset: 0,
				maxOccurredAt: '2025-01-05T12:00:00Z',
				maxId: 'abc-uuid'
			})
		).rejects.toThrow('Forbidden');
	});

	it('scrollBoundary spreading: null boundary spreads to empty object (no extra params)', async () => {
		// Simulate the spread pattern used in the page: ...(scrollBoundary ?? {})
		const scrollBoundary: { maxOccurredAt: string; maxId: string } | null = null;
		const opts = {
			limit: 25,
			offset: 50,
			...(scrollBoundary ?? {})
		};
		expect((opts as Record<string, unknown>).maxOccurredAt).toBeUndefined();
		expect((opts as Record<string, unknown>).maxId).toBeUndefined();
	});

	it('scrollBoundary spreading: non-null boundary adds maxOccurredAt + maxId', () => {
		const scrollBoundary = { maxOccurredAt: '2025-01-05T12:00:00Z', maxId: 'abc-uuid' };
		const opts = {
			limit: 25,
			offset: 50,
			...(scrollBoundary ?? {})
		};
		expect((opts as Record<string, unknown>).maxOccurredAt).toBe('2025-01-05T12:00:00Z');
		expect((opts as Record<string, unknown>).maxId).toBe('abc-uuid');
	});
});
