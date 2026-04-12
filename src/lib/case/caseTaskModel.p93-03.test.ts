/**
 * P93-03 — Scan cues (overdue emphasis + priority differentiation); UI derivation only.
 */
import { describe, it, expect } from 'vitest';
import type { CaseTask } from './caseTaskModel';
import {
	CASE_TASK_SCAN_SR_OVERDUE,
	CASE_TASK_SCAN_VISIBLE_PAST_DUE,
	applyCaseTaskMultiCriteriaFilters,
	caseTaskMultiCriteriaFilterFromUiState,
	caseTaskOperationalPriorityLine,
	caseTaskScanOverdueCue,
	caseTaskScanPriorityCueLevel,
	formatCaseTaskPriorityLabel,
	groupCaseTasksForVisualList,
	isCaseTaskDueDateOverdue,
	localCalendarDateYmd,
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

describe('P93-03 canonical overdue copy (SR + visible)', () => {
	it('CASE_TASK_SCAN_SR_OVERDUE and CASE_TASK_SCAN_VISIBLE_PAST_DUE are stable', () => {
		expect(CASE_TASK_SCAN_SR_OVERDUE).toBe('Overdue.');
		expect(CASE_TASK_SCAN_VISIBLE_PAST_DUE).toBe(' (past due)');
	});
});

describe('P93-03 overdue cue (calendar vs local today)', () => {
	const ref = '2026-04-12';

	it('isCaseTaskDueDateOverdue: past date vs reference', () => {
		expect(isCaseTaskDueDateOverdue('2026-04-01', ref)).toBe(true);
		expect(isCaseTaskDueDateOverdue('2026-04-12', ref)).toBe(false);
		expect(isCaseTaskDueDateOverdue('2026-04-20', ref)).toBe(false);
	});

	it('isCaseTaskDueDateOverdue: empty is false', () => {
		expect(isCaseTaskDueDateOverdue(null, ref)).toBe(false);
		expect(isCaseTaskDueDateOverdue('', ref)).toBe(false);
	});

	it('localCalendarDateYmd: today is not overdue (implicit reference matches canonical helper)', () => {
		const today = localCalendarDateYmd();
		expect(/^\d{4}-\d{2}-\d{2}$/.test(today)).toBe(true);
		expect(isCaseTaskDueDateOverdue(today)).toBe(false);
		expect(isCaseTaskDueDateOverdue(today, today)).toBe(false);
	});

	it('caseTaskScanOverdueCue: active open + overdue', () => {
		const t = task({ id: 'a', status: 'open', dueDate: '2020-01-01' });
		expect(caseTaskScanOverdueCue(t, 'active')).toBe(true);
	});

	it('overdue + no priority: overdue cue on, priority tier off (no dot dependency)', () => {
		const t = task({
			id: 'np',
			status: 'open',
			dueDate: '2020-01-01',
			priority: null
		});
		expect(caseTaskScanOverdueCue(t, 'active')).toBe(true);
		expect(caseTaskScanPriorityCueLevel(t)).toBeNull();
		expect(caseTaskOperationalPriorityLine(t)).toBeNull();
	});

	it('caseTaskScanOverdueCue: future due is false', () => {
		const t = task({ id: 'a', status: 'open', dueDate: '2099-01-01' });
		expect(caseTaskScanOverdueCue(t, 'active')).toBe(false);
	});

	it('caseTaskScanOverdueCue: no due date', () => {
		const t = task({ id: 'a', status: 'open' });
		expect(caseTaskScanOverdueCue(t, 'active')).toBe(false);
	});

	it('caseTaskScanOverdueCue: suppressed for inactive even when calendar-overdue', () => {
		const past = task({ id: 'a', status: 'completed', dueDate: '2020-01-01' });
		expect(caseTaskScanOverdueCue(past, 'inactive')).toBe(false);
		const archived = task({ id: 'b', status: 'archived', dueDate: '2020-01-01' });
		expect(caseTaskScanOverdueCue(archived, 'inactive')).toBe(false);
		const deleted = task({
			id: 'c',
			status: 'open',
			dueDate: '2020-01-01',
			deletedAt: '2026-01-01T00:00:00.000Z'
		});
		expect(caseTaskScanOverdueCue(deleted, 'inactive')).toBe(false);
	});

	it('caseTaskScanOverdueCue: open but soft-deleted uses inactive path in UI; direct call still false for deleted row in active section', () => {
		const deletedOpen = task({
			id: 'c',
			status: 'open',
			dueDate: '2020-01-01',
			deletedAt: '2026-01-01T00:00:00.000Z'
		});
		expect(caseTaskScanOverdueCue(deletedOpen, 'active')).toBe(false);
	});
});

describe('P93-03 priority cue level', () => {
	it('maps canonical values only', () => {
		expect(caseTaskScanPriorityCueLevel(task({ id: 'a', status: 'open', priority: 'high' }))).toBe('high');
		expect(caseTaskScanPriorityCueLevel(task({ id: 'b', status: 'open', priority: 'medium' }))).toBe('medium');
		expect(caseTaskScanPriorityCueLevel(task({ id: 'c', status: 'open', priority: 'low' }))).toBe('low');
	});

	it('returns null when unset or unknown', () => {
		expect(caseTaskScanPriorityCueLevel(task({ id: 'a', status: 'open', priority: null }))).toBeNull();
		expect(caseTaskScanPriorityCueLevel(task({ id: 'b', status: 'open', priority: 'urgent' }))).toBeNull();
	});

	it('future values (e.g. urgent): no scan tier; label passes through for row text without colored dot', () => {
		const urgent = task({ id: 'u', status: 'open', priority: 'urgent' });
		expect(caseTaskScanPriorityCueLevel(urgent)).toBeNull();
		expect(formatCaseTaskPriorityLabel('urgent')).toBe('urgent');
		expect(caseTaskOperationalPriorityLine(urgent)).toBe('Priority: urgent');
	});
});

describe('P93-03 scan cues do not affect ordering, grouping, or filtering', () => {
	const ref = '2026-04-12';

	it('sortCaseTasksForList is unchanged by cue logic (independent pipelines)', () => {
		const a = task({
			id: 'a',
			status: 'open',
			createdAt: '2021-01-01T00:00:00.000Z',
			dueDate: '2020-01-01',
			priority: 'high'
		});
		const b = task({
			id: 'b',
			status: 'open',
			createdAt: '2022-01-01T00:00:00.000Z',
			dueDate: '2099-01-01',
			priority: 'low'
		});
		const modes = [
			'created_newest',
			'created_oldest',
			'due_soonest',
			'due_latest',
			'priority_high_first',
			'priority_low_first',
			'group_label_a_z',
			'group_label_z_a'
		] as const;
		for (const mode of modes) {
			const sorted = sortCaseTasksForList([a, b], mode);
			void caseTaskScanOverdueCue(sorted[0]!, 'active');
			void caseTaskScanPriorityCueLevel(sorted[0]!);
			const sortedAgain = sortCaseTasksForList([a, b], mode);
			expect(sortedAgain.map((t) => t.id)).toEqual(sorted.map((t) => t.id));
		}
	});

	it('groupCaseTasksForVisualList unchanged after cue inspection', () => {
		const rows = [
			task({ id: 'x', status: 'open', groupLabel: 'Z', priority: 'high' }),
			task({ id: 'y', status: 'open', groupLabel: 'A', priority: 'low' })
		];
		const groups = groupCaseTasksForVisualList(rows, 'group_label');
		for (const g of groups) {
			for (const t of g.tasks) {
				void caseTaskScanOverdueCue(t, 'active');
			}
		}
		const groups2 = groupCaseTasksForVisualList(rows, 'group_label');
		expect(groups2.map((g) => g.key)).toEqual(groups.map((g) => g.key));
		expect(groups2.flatMap((g) => g.tasks.map((t) => t.id))).toEqual(
			groups.flatMap((g) => g.tasks.map((t) => t.id))
		);
	});

	it('applyCaseTaskMultiCriteriaFilters is independent of scan cues', () => {
		const rows = [
			task({ id: 'a', status: 'open', dueDate: '2020-01-01', priority: 'high' }),
			task({ id: 'b', status: 'open', dueDate: '2099-01-01', priority: 'low' })
		];
		const f = caseTaskMultiCriteriaFilterFromUiState({
			assigneeUserId: '',
			dueStatus: 'OVERDUE',
			priorityLow: false,
			priorityMedium: false,
			priorityHigh: true,
			groupLabel: ''
		});
		const filtered = applyCaseTaskMultiCriteriaFilters(rows, f, { referenceLocalDateYmd: ref });
		for (const t of filtered) {
			void caseTaskScanOverdueCue(t, 'active');
		}
		const filtered2 = applyCaseTaskMultiCriteriaFilters(rows, f, { referenceLocalDateYmd: ref });
		expect(filtered2.map((t) => t.id)).toEqual(filtered.map((t) => t.id));
	});
});
