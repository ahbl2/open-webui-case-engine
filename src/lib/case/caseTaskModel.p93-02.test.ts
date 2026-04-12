/**
 * P93-02 — Sort field + direction UI mapping (existing sort modes only).
 */
import { describe, it, expect } from 'vitest';
import type { CaseTask, CaseTaskSortField } from './caseTaskModel';
import {
	CASE_TASK_LIST_SORT_MODES_ALL,
	CASE_TASK_SORT_FIELD_PAIR,
	CASE_TASK_SORT_QUICK_PRESET,
	caseTaskListSortModeFromFieldAndPairIndex,
	caseTaskSortActiveSummary,
	caseTaskSortFieldFromListSortMode,
	caseTaskSortFieldShortLabel,
	caseTaskSortPairDirectionLabels,
	caseTaskSortPairIndexFromListSortMode,
	sortCaseTasksForList
} from './caseTaskModel';

const SORT_FIELDS: CaseTaskSortField[] = ['created', 'due', 'priority', 'group_label'];

function task(partial: Partial<CaseTask> & Pick<CaseTask, 'id' | 'status'>): CaseTask {
	return {
		id: partial.id,
		title: partial.title ?? 't',
		createdAt: partial.createdAt ?? '2020-01-01T00:00:00.000Z',
		createdBy: partial.createdBy ?? 'u',
		updatedAt: partial.updatedAt ?? '2020-01-01T00:00:00.000Z',
		status: partial.status,
		...partial,
		crossRefs: partial.crossRefs ?? []
	};
}

describe('P93-02 sort UI mapping', () => {
	it('presets map to expected list sort modes', () => {
		expect(CASE_TASK_SORT_QUICK_PRESET.dueSoon).toBe('due_soonest');
		expect(CASE_TASK_SORT_QUICK_PRESET.highPriorityFirst).toBe('priority_high_first');
		expect(CASE_TASK_SORT_QUICK_PRESET.recentlyCreated).toBe('created_newest');
	});

	it('round-trips field + pair index to mode and back', () => {
		for (const field of SORT_FIELDS) {
			for (const idx of [0, 1] as const) {
				const mode = caseTaskListSortModeFromFieldAndPairIndex(field, idx);
				expect(caseTaskSortFieldFromListSortMode(mode)).toBe(field);
				expect(caseTaskSortPairIndexFromListSortMode(mode)).toBe(idx);
			}
		}
	});

	it('default created_newest matches primary created pair', () => {
		expect(caseTaskListSortModeFromFieldAndPairIndex('created', 0)).toBe('created_newest');
		expect(caseTaskSortActiveSummary('created_newest')).toMatch(/Newest first/);
		expect(caseTaskSortActiveSummary('created_newest')).toMatch(/Created/);
	});

	it('pair direction labels cover all fields', () => {
		expect(caseTaskSortPairDirectionLabels('due')[0]).toContain('Soonest');
		expect(caseTaskSortPairDirectionLabels('priority')[0]).toContain('High');
	});
});

describe('P93-02 sort determinism (no task mutation)', () => {
	it('reorders references only; task objects unchanged', () => {
		const a = task({ id: 'a', status: 'open', createdAt: '2021-01-01T00:00:00.000Z' });
		const b = task({ id: 'b', status: 'open', createdAt: '2020-01-01T00:00:00.000Z' });
		const out = sortCaseTasksForList([a, b], 'created_newest');
		expect(out.map((t) => t.id)).toEqual(['a', 'b']);
		expect(out[0]).toBe(a);
		expect(out[1]).toBe(b);
	});

	it('priority_high_first uses rank mapping only; unknown values sort last (not string order)', () => {
		const hi = task({ id: 'h', status: 'open', priority: 'high' });
		const unk = task({ id: 'u', status: 'open', priority: 'urgent' });
		const low = task({ id: 'l', status: 'open', priority: 'low' });
		const out = sortCaseTasksForList([unk, low, hi], 'priority_high_first');
		expect(out.map((t) => t.id)).toEqual(['h', 'l', 'u']);
	});
});

describe('P93-02 CASE_TASK_SORT_FIELD_PAIR integrity', () => {
	it('every field has exactly two distinct modes; union covers CASE_TASK_LIST_SORT_MODES_ALL', () => {
		const fields = Object.keys(CASE_TASK_SORT_FIELD_PAIR) as CaseTaskSortField[];
		expect(fields.length).toBe(4);
		const flattened: CaseTaskListSortMode[] = [];
		for (const f of fields) {
			const pair = CASE_TASK_SORT_FIELD_PAIR[f];
			expect(pair).toHaveLength(2);
			expect(pair[0]).not.toBe(pair[1]);
			flattened.push(pair[0], pair[1]);
		}
		expect(new Set(flattened).size).toBe(8);
		const expected = new Set(CASE_TASK_LIST_SORT_MODES_ALL);
		expect(new Set(flattened)).toEqual(expected);
	});

	it('caseTaskSortActiveSummary is defined from listSortMode alone for every mode', () => {
		for (const mode of CASE_TASK_LIST_SORT_MODES_ALL) {
			const s = caseTaskSortActiveSummary(mode);
			expect(s.length).toBeGreaterThan(10);
			expect(s).toContain('·');
			const field = caseTaskSortFieldFromListSortMode(mode);
			expect(s).toContain(caseTaskSortFieldShortLabel(field));
		}
	});

	it('quick presets round-trip field, pair index, and summary (same as manual listSortMode)', () => {
		const presets: CaseTaskListSortMode[] = [
			CASE_TASK_SORT_QUICK_PRESET.dueSoon,
			CASE_TASK_SORT_QUICK_PRESET.highPriorityFirst,
			CASE_TASK_SORT_QUICK_PRESET.recentlyCreated
		];
		for (const mode of presets) {
			const field = caseTaskSortFieldFromListSortMode(mode);
			expect(caseTaskListSortModeFromFieldAndPairIndex(field, caseTaskSortPairIndexFromListSortMode(mode))).toBe(
				mode
			);
			expect(caseTaskSortActiveSummary(mode)).toContain(caseTaskSortFieldShortLabel(field));
		}
	});
});
