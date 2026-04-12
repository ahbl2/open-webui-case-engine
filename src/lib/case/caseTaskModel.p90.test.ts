/**
 * P90-01 / P90-02 — Client-side task filters and sort (render-only; no API).
 */
import { describe, it, expect } from 'vitest';
import type { CaseTask } from './caseTaskModel';
import {
	applyCaseTaskFilters,
	applyCaseTaskTextSearch,
	caseTaskShouldOfferDetailToggle,
	formatCaseTaskArchiveAttribution,
	formatCaseTaskCompletionAttribution,
	formatCaseTaskSoftDeleteAttribution,
	sortCaseTasksByCreatedAt,
	sortCaseTasksByDeletedAtDesc
} from './caseTaskModel';

function task(partial: Partial<CaseTask> & Pick<CaseTask, 'id' | 'title' | 'status'>): CaseTask {
	return {
		createdAt: '2024-01-01T00:00:00.000Z',
		createdBy: 'u1',
		updatedAt: '2024-01-01T00:00:00.000Z',
		description: null,
		linkedTimelineEntryId: null,
		completedAt: null,
		archivedAt: null,
		archivedBy: null,
		completedBy: null,
		deletedAt: null,
		deletedBy: null,
		...partial
	};
}

describe('P90-01 applyCaseTaskFilters (lifecycle status only)', () => {
	const sample: CaseTask[] = [
		task({ id: 'a', title: 'Open Alpha', status: 'open', description: 'notes here' }),
		task({ id: 'b', title: 'Beta done', status: 'completed', description: null }),
		task({ id: 'c', title: 'Gamma archived', status: 'archived', description: 'ARCHIVED DESC' })
	];

	it('returns shallow copy when status is all', () => {
		const out = applyCaseTaskFilters(sample, { statusFilter: 'all' });
		expect(out.map((t) => t.id)).toEqual(['a', 'b', 'c']);
		expect(out).not.toBe(sample);
	});

	it('narrows by status open', () => {
		const out = applyCaseTaskFilters(sample, { statusFilter: 'open' });
		expect(out.map((t) => t.id)).toEqual(['a']);
	});

	it('narrows by status completed', () => {
		const out = applyCaseTaskFilters(sample, { statusFilter: 'completed' });
		expect(out.map((t) => t.id)).toEqual(['b']);
	});

	it('narrows by status archived', () => {
		const out = applyCaseTaskFilters(sample, { statusFilter: 'archived' });
		expect(out.map((t) => t.id)).toEqual(['c']);
	});

	it('preserves input order (deterministic)', () => {
		const multi: CaseTask[] = [
			task({ id: 'z1', title: 'Z', status: 'open' }),
			task({ id: 'z2', title: 'Y', status: 'open' })
		];
		const out = applyCaseTaskFilters(multi, { statusFilter: 'open' });
		expect(out.map((t) => t.id)).toEqual(['z1', 'z2']);
	});
});

describe('P92-02 applyCaseTaskTextSearch', () => {
	const sample: CaseTask[] = [
		task({ id: 'a', title: 'Open Alpha', status: 'open', description: 'notes here' }),
		task({ id: 'b', title: 'Beta done', status: 'completed', description: null }),
		task({ id: 'c', title: 'Gamma archived', status: 'archived', description: 'ARCHIVED DESC' })
	];

	it('returns shallow copy when query empty', () => {
		const out = applyCaseTaskTextSearch(sample, '');
		expect(out.map((t) => t.id)).toEqual(['a', 'b', 'c']);
		expect(out).not.toBe(sample);
	});

	it('matches title case-insensitively', () => {
		const out = applyCaseTaskTextSearch(sample, 'ALPHA');
		expect(out.map((t) => t.id)).toEqual(['a']);
	});

	it('matches description case-insensitively', () => {
		const out = applyCaseTaskTextSearch(sample, 'archived desc');
		expect(out.map((t) => t.id)).toEqual(['c']);
	});

	it('trims query whitespace', () => {
		const out = applyCaseTaskTextSearch(sample, '  beta  ');
		expect(out.map((t) => t.id)).toEqual(['b']);
	});

	it('applies after status: completed + text', () => {
		const narrowed = applyCaseTaskFilters(sample, { statusFilter: 'completed' });
		const out = applyCaseTaskTextSearch(narrowed, 'gamma');
		expect(out).toEqual([]);
	});

	it('search with all statuses', () => {
		const out = applyCaseTaskTextSearch(sample, 'notes');
		expect(out.map((t) => t.id)).toEqual(['a']);
	});

	it('returns empty when text matches nothing', () => {
		const out = applyCaseTaskTextSearch(sample, 'zzz');
		expect(out).toEqual([]);
	});

	it('matches assignee display name', () => {
		const rows: CaseTask[] = [
			task({
				id: 'x',
				title: 'T',
				status: 'open',
				assigneeDisplayName: 'Jordan Smith'
			})
		];
		expect(applyCaseTaskTextSearch(rows, 'smith').map((t) => t.id)).toEqual(['x']);
	});

	it('does not mutate source array', () => {
		const snap = sample.map((t) => t.id);
		void applyCaseTaskTextSearch(sample, 'alpha');
		expect(sample.map((t) => t.id)).toEqual(snap);
	});
});

describe('P90-02 sortCaseTasksByCreatedAt', () => {
	it('orders newest first with id tie-break', () => {
		const rows: CaseTask[] = [
			task({
				id: 'b',
				title: 'B',
				status: 'open',
				createdAt: '2024-01-02T00:00:00.000Z'
			}),
			task({
				id: 'a',
				title: 'A',
				status: 'open',
				createdAt: '2024-01-02T00:00:00.000Z'
			}),
			task({
				id: 'c',
				title: 'C',
				status: 'completed',
				createdAt: '2024-01-01T00:00:00.000Z'
			})
		];
		const out = sortCaseTasksByCreatedAt(rows, 'newest');
		expect(out.map((t) => t.id)).toEqual(['a', 'b', 'c']);
	});

	it('orders oldest first with id tie-break', () => {
		const rows: CaseTask[] = [
			task({
				id: 'b',
				title: 'B',
				status: 'open',
				createdAt: '2024-01-02T00:00:00.000Z'
			}),
			task({
				id: 'a',
				title: 'A',
				status: 'open',
				createdAt: '2024-01-02T00:00:00.000Z'
			})
		];
		const out = sortCaseTasksByCreatedAt(rows, 'oldest');
		expect(out.map((t) => t.id)).toEqual(['a', 'b']);
	});

	it('does not mutate the source array', () => {
		const rows: CaseTask[] = [
			task({ id: 'x', title: 'X', status: 'open', createdAt: '2024-01-02T00:00:00.000Z' }),
			task({ id: 'y', title: 'Y', status: 'open', createdAt: '2024-01-01T00:00:00.000Z' })
		];
		const snap = rows.map((t) => t.id);
		void sortCaseTasksByCreatedAt(rows, 'newest');
		expect(rows.map((t) => t.id)).toEqual(snap);
	});

	it('composes after filters (status + sort)', () => {
		const rows: CaseTask[] = [
			task({
				id: 'o1',
				title: 'Old open',
				status: 'open',
				createdAt: '2024-01-01T00:00:00.000Z'
			}),
			task({
				id: 'o2',
				title: 'New open',
				status: 'open',
				createdAt: '2024-01-03T00:00:00.000Z'
			}),
			task({
				id: 'x',
				title: 'Done',
				status: 'completed',
				createdAt: '2024-01-02T00:00:00.000Z'
			})
		];
		const filtered = applyCaseTaskFilters(rows, { statusFilter: 'open' });
		const sorted = sortCaseTasksByCreatedAt(filtered, 'oldest');
		expect(sorted.map((t) => t.id)).toEqual(['o1', 'o2']);
	});
});

describe('P90-03 caseTaskShouldOfferDetailToggle', () => {
	it('is true when reference link is set', () => {
		const t = task({
			id: '1',
			title: 'T',
			status: 'open',
			linkedTimelineEntryId: 'te-1'
		});
		expect(caseTaskShouldOfferDetailToggle(t)).toBe(true);
	});

	it('is true when description is long', () => {
		const long = 'x'.repeat(141);
		const t = task({ id: '1', title: 'T', status: 'open', description: long });
		expect(caseTaskShouldOfferDetailToggle(t)).toBe(true);
	});

	it('is false for short description without link', () => {
		const t = task({
			id: '1',
			title: 'T',
			status: 'open',
			description: 'short'
		});
		expect(caseTaskShouldOfferDetailToggle(t)).toBe(false);
	});
});

describe('P90-04 lifecycle attribution formatting', () => {
	it('formats completion when both actor and time exist', () => {
		const t = task({
			id: '1',
			title: 'T',
			status: 'completed',
			completedBy: 'alice',
			completedAt: '2024-06-01T12:00:00.000Z'
		});
		const s = formatCaseTaskCompletionAttribution(t);
		expect(s).toContain('Completed by alice');
		expect(s).toMatch(/\d{1,2}\/\d{1,2}\/\d{2}/);
	});

	it('returns null for completion when no completion fields', () => {
		const t = task({ id: '1', title: 'T', status: 'open', completedAt: null, completedBy: null });
		expect(formatCaseTaskCompletionAttribution(t)).toBeNull();
	});

	it('formats archive when both actor and time exist', () => {
		const t = task({
			id: '1',
			title: 'T',
			status: 'archived',
			archivedBy: 'bob',
			archivedAt: '2024-07-01T08:00:00.000Z'
		});
		const s = formatCaseTaskArchiveAttribution(t);
		expect(s).toContain('Archived by bob');
		expect(s).toMatch(/\d{1,2}\/\d{1,2}\/\d{2}/);
	});

	it('returns null for archive when no archive fields', () => {
		const t = task({
			id: '1',
			title: 'T',
			status: 'open',
			archivedAt: null,
			archivedBy: null
		});
		expect(formatCaseTaskArchiveAttribution(t)).toBeNull();
	});
});

describe('P90-05 soft-delete attribution and sort', () => {
	it('formats soft-delete attribution', () => {
		const t = task({
			id: '1',
			title: 'T',
			status: 'open',
			deletedAt: '2024-08-01T00:00:00.000Z',
			deletedBy: 'd1'
		});
		const s = formatCaseTaskSoftDeleteAttribution(t);
		expect(s).toContain('Removed by d1');
	});

	it('sortCaseTasksByDeletedAtDesc orders by deleted time', () => {
		const a = task({
			id: 'a',
			title: 'A',
			status: 'open',
			deletedAt: '2024-01-01T00:00:00.000Z'
		});
		const b = task({
			id: 'b',
			title: 'B',
			status: 'open',
			deletedAt: '2024-06-01T00:00:00.000Z'
		});
		const out = sortCaseTasksByDeletedAtDesc([a, b]);
		expect(out.map((x) => x.id)).toEqual(['b', 'a']);
	});
});
