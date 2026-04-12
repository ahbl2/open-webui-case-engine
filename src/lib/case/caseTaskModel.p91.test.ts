/**
 * P91-02 / P91-03 — Due date + priority helpers (display / sort).
 */
import { describe, it, expect } from 'vitest';
import type { CaseTask } from './caseTaskModel';
import {
	applyCaseTaskFilters,
	caseTaskOperationalAssigneeLine,
	caseTaskOperationalDueLineParts,
	caseTaskOperationalGroupLine,
	caseTaskOperationalPriorityLine,
	CASE_TASK_PRIORITY_DISPLAY_LABELS,
	CASE_TASK_PRIORITY_VALUES,
	formatCaseTaskDueDateDisplay,
	formatCaseTaskPriorityLabel,
	isCaseTaskDueDateOverdue,
	localCalendarDateYmd,
	sortCaseTasksForList
} from './caseTaskModel';

describe('P91-02 due date helpers', () => {
	it('localCalendarDateYmd is YYYY-MM-DD', () => {
		expect(localCalendarDateYmd()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
	});

	it('isCaseTaskDueDateOverdue compares to local calendar day', () => {
		expect(isCaseTaskDueDateOverdue('1900-01-01')).toBe(true);
		expect(isCaseTaskDueDateOverdue('2999-12-31')).toBe(false);
		expect(isCaseTaskDueDateOverdue(null)).toBe(false);
		expect(isCaseTaskDueDateOverdue('')).toBe(false);
	});

	it('formatCaseTaskDueDateDisplay formats YYYY-MM-DD', () => {
		const s = formatCaseTaskDueDateDisplay('2026-06-15');
		expect(s.length).toBeGreaterThan(0);
	});

	it('sortCaseTasksForList due_soonest orders by due date; nulls last', () => {
		const tasks: CaseTask[] = [
			{
				id: 'c',
				title: 'c',
				createdAt: 'a',
				createdBy: 'u',
				updatedAt: 'a',
				status: 'open',
				dueDate: '2026-02-01'
			},
			{
				id: 'a',
				title: 'a',
				createdAt: 'a',
				createdBy: 'u',
				updatedAt: 'a',
				status: 'open',
				dueDate: null
			},
			{
				id: 'b',
				title: 'b',
				createdAt: 'a',
				createdBy: 'u',
				updatedAt: 'a',
				status: 'open',
				dueDate: '2026-01-01'
			}
		];
		const out = sortCaseTasksForList(tasks, 'due_soonest');
		expect(out.map((t) => t.id)).toEqual(['b', 'c', 'a']);
	});

	it('sortCaseTasksForList due_latest puts latest due first; nulls still last', () => {
		const tasks: CaseTask[] = [
			{ id: 'n', title: 'n', createdAt: 'a', createdBy: 'u', updatedAt: 'a', status: 'open', dueDate: null },
			{ id: 'early', title: 'e', createdAt: 'a', createdBy: 'u', updatedAt: 'a', status: 'open', dueDate: '2026-01-01' },
			{ id: 'late', title: 'l', createdAt: 'a', createdBy: 'u', updatedAt: 'a', status: 'open', dueDate: '2026-03-01' }
		];
		expect(sortCaseTasksForList(tasks, 'due_latest').map((t) => t.id)).toEqual(['late', 'early', 'n']);
	});

	it('sortCaseTasksForList due modes: two null-due tasks tie-break by id', () => {
		const tasks: CaseTask[] = [
			{ id: 'z', title: 'z', createdAt: 'a', createdBy: 'u', updatedAt: 'a', status: 'open', dueDate: null },
			{ id: 'm', title: 'm', createdAt: 'a', createdBy: 'u', updatedAt: 'a', status: 'open', dueDate: null }
		];
		expect(sortCaseTasksForList(tasks, 'due_soonest').map((t) => t.id)).toEqual(['m', 'z']);
	});
});

describe('P91-03 priority', () => {
	it('formatCaseTaskPriorityLabel maps allowed values', () => {
		expect(formatCaseTaskPriorityLabel('low')).toBe('Low');
		expect(formatCaseTaskPriorityLabel('medium')).toBe('Medium');
		expect(formatCaseTaskPriorityLabel('high')).toBe('High');
		expect(formatCaseTaskPriorityLabel(null)).toBeNull();
	});

	it('display label order matches CASE_TASK_PRIORITY_VALUES sort order (locked)', () => {
		expect(CASE_TASK_PRIORITY_VALUES.length).toBe(CASE_TASK_PRIORITY_DISPLAY_LABELS.length);
		for (let i = 0; i < CASE_TASK_PRIORITY_VALUES.length; i++) {
			const v = CASE_TASK_PRIORITY_VALUES[i];
			expect(formatCaseTaskPriorityLabel(v)).toBe(CASE_TASK_PRIORITY_DISPLAY_LABELS[i]);
		}
	});

	it('sortCaseTasksForList priority_high_first: high before low; nulls last', () => {
		const tasks: CaseTask[] = [
			{ id: 'n', title: 'n', createdAt: 'a', createdBy: 'u', updatedAt: 'a', status: 'open', priority: null },
			{ id: 'lo', title: 'lo', createdAt: 'a', createdBy: 'u', updatedAt: 'a', status: 'open', priority: 'low' },
			{ id: 'hi', title: 'hi', createdAt: 'a', createdBy: 'u', updatedAt: 'a', status: 'open', priority: 'high' },
			{ id: 'mid', title: 'mid', createdAt: 'a', createdBy: 'u', updatedAt: 'a', status: 'open', priority: 'medium' }
		];
		expect(sortCaseTasksForList(tasks, 'priority_high_first').map((t) => t.id)).toEqual(['hi', 'mid', 'lo', 'n']);
	});

	it('sortCaseTasksForList priority_low_first: low before high; nulls last', () => {
		const tasks: CaseTask[] = [
			{ id: 'n', title: 'n', createdAt: 'a', createdBy: 'u', updatedAt: 'a', status: 'open', priority: null },
			{ id: 'hi', title: 'hi', createdAt: 'a', createdBy: 'u', updatedAt: 'a', status: 'open', priority: 'high' },
			{ id: 'lo', title: 'lo', createdAt: 'a', createdBy: 'u', updatedAt: 'a', status: 'open', priority: 'low' }
		];
		expect(sortCaseTasksForList(tasks, 'priority_low_first').map((t) => t.id)).toEqual(['lo', 'hi', 'n']);
	});
});

describe('P91-05 operational row lines (shared with TaskOperationalRowMeta)', () => {
	it('caseTaskOperationalAssigneeLine prefers display name then picker', () => {
		const base = {
			id: 't',
			title: 't',
			createdAt: 'a',
			createdBy: 'u',
			updatedAt: 'a',
			status: 'open' as const,
			assigneeUserId: 'u1',
			assigneeDisplayName: 'Pat'
		};
		expect(caseTaskOperationalAssigneeLine(base, [])).toBe('Assigned: Pat');
		expect(
			caseTaskOperationalAssigneeLine(
				{ ...base, assigneeDisplayName: null },
				[{ id: 'u1', name: 'Alex', role: 'CID' }]
			)
		).toBe('Assigned: Alex');
	});

	it('caseTaskOperationalPriorityLine and group line match row prefixes', () => {
		const t: CaseTask = {
			id: 'x',
			title: 'x',
			createdAt: 'a',
			createdBy: 'u',
			updatedAt: 'a',
			status: 'open',
			priority: 'high',
			groupLabel: 'Alpha'
		};
		expect(caseTaskOperationalPriorityLine(t)).toBe('Priority: High');
		expect(caseTaskOperationalGroupLine(t)).toBe('Group: Alpha');
	});

	it('caseTaskOperationalDueLineParts is null without due date', () => {
		const t: CaseTask = {
			id: 'x',
			title: 'x',
			createdAt: 'a',
			createdBy: 'u',
			updatedAt: 'a',
			status: 'open'
		};
		expect(caseTaskOperationalDueLineParts(t)).toBeNull();
	});
});

describe('P91-04 group label', () => {
	it('sortCaseTasksForList group_label_a_z: alphabetical; nulls last', () => {
		const tasks: CaseTask[] = [
			{ id: 'z', title: 'z', createdAt: 'a', createdBy: 'u', updatedAt: 'a', status: 'open', groupLabel: null },
			{ id: 'b', title: 'b', createdAt: 'a', createdBy: 'u', updatedAt: 'a', status: 'open', groupLabel: 'Beta' },
			{ id: 'a', title: 'a', createdAt: 'a', createdBy: 'u', updatedAt: 'a', status: 'open', groupLabel: 'Alpha' }
		];
		expect(sortCaseTasksForList(tasks, 'group_label_a_z').map((t) => t.id)).toEqual(['a', 'b', 'z']);
	});

	it('sortCaseTasksForList group_label_z_a: reverse; nulls last', () => {
		const tasks: CaseTask[] = [
			{ id: 'n', title: 'n', createdAt: 'a', createdBy: 'u', updatedAt: 'a', status: 'open', groupLabel: null },
			{ id: 'x', title: 'x', createdAt: 'a', createdBy: 'u', updatedAt: 'a', status: 'open', groupLabel: 'A' },
			{ id: 'y', title: 'y', createdAt: 'a', createdBy: 'u', updatedAt: 'a', status: 'open', groupLabel: 'B' }
		];
		expect(sortCaseTasksForList(tasks, 'group_label_z_a').map((t) => t.id)).toEqual(['y', 'x', 'n']);
	});

	it('sortCaseTasksForList group_label_a_z: same letters different case tie-break by id', () => {
		const tasks: CaseTask[] = [
			{ id: 'second', title: 's', createdAt: 'a', createdBy: 'u', updatedAt: 'a', status: 'open', groupLabel: 'Beta' },
			{ id: 'first', title: 'f', createdAt: 'a', createdBy: 'u', updatedAt: 'a', status: 'open', groupLabel: 'beta' }
		];
		expect(sortCaseTasksForList(tasks, 'group_label_a_z').map((t) => t.id)).toEqual(['first', 'second']);
	});

	it('applyCaseTaskFilters matches group label', () => {
		const tasks: CaseTask[] = [
			{
				id: '1',
				title: 'x',
				createdAt: 'a',
				createdBy: 'u',
				updatedAt: 'a',
				status: 'open',
				groupLabel: 'Witnesses'
			},
			{ id: '2', title: 'y', createdAt: 'a', createdBy: 'u', updatedAt: 'a', status: 'open', groupLabel: 'Other' }
		];
		expect(applyCaseTaskFilters(tasks, { statusFilter: 'all', textQuery: 'witness' }).map((t) => t.id)).toEqual([
			'1'
		]);
	});
});
