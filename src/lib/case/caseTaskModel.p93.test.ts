/**
 * P93-01 — Visual grouping (view-layer only; deterministic; no mutation).
 */
import { describe, it, expect } from 'vitest';
import type { CaseTask } from './caseTaskModel';
import {
	caseTaskGroupLabelStableKey,
	caseTaskPriorityStableKey,
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

describe('P93-01 groupCaseTasksForVisualList (group_label)', () => {
	it('returns empty for empty input', () => {
		expect(groupCaseTasksForVisualList([], 'group_label')).toEqual([]);
	});

	it('sorts group keys alphabetically (base-insensitive) and places No Group last', () => {
		const a = task({ id: 'a', status: 'open', groupLabel: 'zebra' });
		const b = task({ id: 'b', status: 'open', groupLabel: 'Alpha' });
		const c = task({ id: 'c', status: 'open', groupLabel: null });
		const input = [a, b, c];
		const groups = groupCaseTasksForVisualList(input, 'group_label');
		expect(groups.map((g) => g.key)).toEqual([
			caseTaskGroupLabelStableKey('Alpha'),
			caseTaskGroupLabelStableKey('zebra'),
			caseTaskGroupLabelStableKey(null)
		]);
		expect(groups.map((g) => g.label)).toEqual(['Alpha', 'zebra', 'No Group']);
		expect(groups.flatMap((g) => g.tasks.map((t) => t.id))).toEqual(['b', 'a', 'c']);
	});

	it('folds group label case for one bucket; display preserves first-seen casing in list order', () => {
		const first = task({ id: '1', status: 'open', groupLabel: 'ops' });
		const second = task({ id: '2', status: 'open', groupLabel: 'OPS' });
		const groups = groupCaseTasksForVisualList([first, second], 'group_label');
		expect(groups).toHaveLength(1);
		expect(groups[0]?.key).toBe(caseTaskGroupLabelStableKey('ops'));
		expect(groups[0]?.label).toBe('ops');
		expect(groups[0]?.tasks.map((t) => t.id)).toEqual(['1', '2']);
	});

	it('preserves input order within each bucket', () => {
		const t1 = task({ id: '1', status: 'open', groupLabel: 'G' });
		const t2 = task({ id: '2', status: 'open', groupLabel: 'G' });
		const g = groupCaseTasksForVisualList([t1, t2], 'group_label');
		expect(g).toHaveLength(1);
		expect(g[0]?.tasks.map((x) => x.id)).toEqual(['1', '2']);
	});

	it('does not mutate the input array or task references', () => {
		const t = task({ id: 'x', status: 'open', groupLabel: 'Z' });
		const arr = [t];
		const copy = [...arr];
		const groups = groupCaseTasksForVisualList(arr, 'group_label');
		expect(arr).toEqual(copy);
		expect(groups[0]?.tasks[0]).toBe(t);
	});
});

describe('P93-01 groupCaseTasksForVisualList (priority)', () => {
	it('orders High → Medium → Low → No Priority; omits empty buckets', () => {
		const low = task({ id: 'l', status: 'open', priority: 'low' });
		const high = task({ id: 'h', status: 'open', priority: 'high' });
		const none = task({ id: 'n', status: 'open', priority: null });
		const weird = task({ id: 'w', status: 'open', priority: 'urgent' });
		const input = [low, high, none, weird];
		const groups = groupCaseTasksForVisualList(input, 'priority');
		expect(groups.map((g) => g.key)).toEqual([
			caseTaskPriorityStableKey('high'),
			caseTaskPriorityStableKey('low'),
			caseTaskPriorityStableKey('urgent')
		]);
		expect(groups.map((g) => g.label)).toEqual(['High', 'Low', 'No Priority']);
		expect(groups[0]?.tasks.map((t) => t.id)).toEqual(['h']);
		expect(groups[1]?.tasks.map((t) => t.id)).toEqual(['l']);
		expect(groups[2]?.tasks.map((t) => t.id)).toEqual(['n', 'w']);
	});

	it('treats unknown priority values as No Priority', () => {
		const u = task({ id: 'u', status: 'open', priority: 'URGENT' });
		const g = groupCaseTasksForVisualList([u], 'priority');
		expect(g).toHaveLength(1);
		expect(g[0]?.key).toBe(caseTaskPriorityStableKey('URGENT'));
		expect(g[0]?.label).toBe('No Priority');
	});

	it('preserves global list order as subsequence within each group (no cross-bucket reorder)', () => {
		const t1 = task({ id: 'a', status: 'open', groupLabel: 'Z', title: 'z1' });
		const t2 = task({ id: 'b', status: 'open', groupLabel: 'A', title: 'a1' });
		const t3 = task({ id: 'c', status: 'open', groupLabel: 'Z', title: 'z2' });
		const sorted = [t2, t1, t3];
		const groups = groupCaseTasksForVisualList(sorted, 'group_label');
		const z = groups.find((g) => g.label === 'Z');
		expect(z?.tasks.map((t) => t.id)).toEqual(['a', 'c']);
		const a = groups.find((g) => g.label === 'A');
		expect(a?.tasks.map((t) => t.id)).toEqual(['b']);
	});
});

describe('P93-01 + P93-02: group_label sort then group_label grouping', () => {
	it('does not reorder groups from sort; groups stay alphabetical by key; within-group order follows sorted list', () => {
		const m = task({ id: 'm', status: 'open', groupLabel: 'M', createdAt: '2020-01-01T00:00:00.000Z' });
		const a1 = task({
			id: 'a1',
			status: 'open',
			groupLabel: 'A',
			createdAt: '2018-01-01T00:00:00.000Z'
		});
		const a2 = task({
			id: 'a2',
			status: 'open',
			groupLabel: 'A',
			createdAt: '2019-01-01T00:00:00.000Z'
		});
		const input = [m, a1, a2];
		const sorted = sortCaseTasksForList(input, 'group_label_a_z');
		const groups = groupCaseTasksForVisualList(sorted, 'group_label');
		expect(groups.map((g) => g.label)).toEqual(['A', 'M']);
		expect(groups[0]?.tasks.map((t) => t.id)).toEqual(['a1', 'a2']);
		expect(groups[1]?.tasks.map((t) => t.id)).toEqual(['m']);
		expect(sorted.map((t) => t.id)).toEqual(['a1', 'a2', 'm']);
	});
});
