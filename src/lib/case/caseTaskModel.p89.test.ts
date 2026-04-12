/**
 * P89-07 — Case Engine task mapping and list helpers (no mount).
 */
import { describe, it, expect } from 'vitest';
import type { CaseEngineCaseTask } from '$lib/apis/caseEngine/caseTasksApi';
import { caseEngineTaskToCaseTask, replaceTaskInList } from './caseTaskModel';

const baseRow = (): CaseEngineCaseTask => ({
	id: 't1',
	case_id: 'c1',
	title: 'Hello',
	description: null,
	status: 'OPEN',
	timeline_entry_id: null,
	created_at: '2024-01-01T00:00:00.000Z',
	created_by: 'u1',
	updated_at: '2024-01-01T00:00:00.000Z',
	updated_by: 'u1',
	completed_at: null,
	completed_by: null,
	archived_at: null,
	archived_by: null,
	deleted_at: null,
	deleted_by: null,
	assignee_user_id: null,
	assignee_display_name: null,
	due_date: null,
	priority: null
});

describe('P89-07 caseTaskModel', () => {
	it('maps engine row to UI without occurred_at', () => {
		const m = caseEngineTaskToCaseTask(baseRow());
		expect(m.id).toBe('t1');
		expect(m.status).toBe('open');
		expect(m).not.toHaveProperty('occurred_at');
		expect(m.linkedTimelineEntryId).toBeNull();
	});

	it('maps COMPLETED and ARCHIVED statuses', () => {
		const c = caseEngineTaskToCaseTask({ ...baseRow(), status: 'COMPLETED' });
		expect(c.status).toBe('completed');
		const a = caseEngineTaskToCaseTask({ ...baseRow(), status: 'ARCHIVED' });
		expect(a.status).toBe('archived');
	});

	it('maps completed_by and archived_by from engine row', () => {
		const m = caseEngineTaskToCaseTask({
			...baseRow(),
			status: 'ARCHIVED',
			completed_at: '2024-02-01T00:00:00.000Z',
			completed_by: 'cuser',
			archived_at: '2024-03-01T00:00:00.000Z',
			archived_by: 'auser'
		});
		expect(m.completedBy).toBe('cuser');
		expect(m.archivedBy).toBe('auser');
	});

	it('maps assignee_user_id (P91-01)', () => {
		const m = caseEngineTaskToCaseTask({ ...baseRow(), assignee_user_id: 'legacy-u2' });
		expect(m.assigneeUserId).toBe('legacy-u2');
	});

	it('maps assignee_display_name for historical/inactive display (P91)', () => {
		const m = caseEngineTaskToCaseTask({
			...baseRow(),
			assignee_user_id: 'legacy-u2',
			assignee_display_name: 'Former User'
		});
		expect(m.assigneeDisplayName).toBe('Former User');
	});

	it('maps due_date (P91-02)', () => {
		const m = caseEngineTaskToCaseTask({ ...baseRow(), due_date: '2026-04-20' });
		expect(m.dueDate).toBe('2026-04-20');
	});

	it('maps priority (P91-03)', () => {
		const m = caseEngineTaskToCaseTask({ ...baseRow(), priority: 'medium' });
		expect(m.priority).toBe('medium');
	});

	it('maps deleted_by from engine row', () => {
		const m = caseEngineTaskToCaseTask({
			...baseRow(),
			deleted_at: '2024-04-01T00:00:00.000Z',
			deleted_by: 'duser'
		});
		expect(m.deletedBy).toBe('duser');
		expect(m.deletedAt).toBe('2024-04-01T00:00:00.000Z');
	});

	it('replaceTaskInList updates by id', () => {
		const a = caseEngineTaskToCaseTask(baseRow());
		const b = caseEngineTaskToCaseTask({ ...baseRow(), id: 't2', title: 'B' });
		const list = [a, b];
		const upd = caseEngineTaskToCaseTask({ ...baseRow(), id: 't1', title: 'Hi' });
		const next = replaceTaskInList(list, upd);
		expect(next.find((x) => x.id === 't1')?.title).toBe('Hi');
		expect(next.length).toBe(2);
	});
});
