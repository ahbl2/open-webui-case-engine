/**
 * P93-04 — Pin is display-only in the client model; must not affect sort, group, or filter pipelines.
 */
import { describe, it, expect } from 'vitest';
import type { CaseTask } from './caseTaskModel';
import {
	applyCaseTaskMultiCriteriaFilters,
	caseTaskMultiCriteriaFilterFromUiState,
	groupCaseTasksForVisualList,
	sortCaseTasksForList
} from './caseTaskModel';

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

describe('P93-04 pin does not affect list pipelines', () => {
	it('sortCaseTasksForList order ignores pinned', () => {
		const a = task({
			id: 'a',
			status: 'open',
			createdAt: '2022-01-01T00:00:00.000Z',
			pinned: true
		});
		const b = task({
			id: 'b',
			status: 'open',
			createdAt: '2021-01-01T00:00:00.000Z',
			pinned: false
		});
		const out = sortCaseTasksForList([a, b], 'created_newest');
		expect(out.map((t) => t.id)).toEqual(['a', 'b']);
		const out2 = sortCaseTasksForList([b, a], 'created_newest');
		expect(out2.map((t) => t.id)).toEqual(['a', 'b']);
	});

	it('groupCaseTasksForVisualList ignores pinned', () => {
		const rows = [
			task({ id: 'p', status: 'open', groupLabel: 'Z', pinned: true }),
			task({ id: 'q', status: 'open', groupLabel: 'A', pinned: false })
		];
		const groups = groupCaseTasksForVisualList(rows, 'group_label');
		expect(groups.map((g) => g.key)).toEqual(['group_label:a', 'group_label:z']);
	});

	it('applyCaseTaskMultiCriteriaFilters ignores pinned', () => {
		const rows = [
			task({ id: 'a', status: 'open', pinned: true }),
			task({ id: 'b', status: 'open', pinned: false })
		];
		const f = caseTaskMultiCriteriaFilterFromUiState({
			assigneeUserId: '',
			dueStatus: '',
			priorityLow: false,
			priorityMedium: false,
			priorityHigh: false,
			groupLabel: ''
		});
		expect(applyCaseTaskMultiCriteriaFilters(rows, f).map((t) => t.id)).toEqual(['a', 'b']);
	});
});
