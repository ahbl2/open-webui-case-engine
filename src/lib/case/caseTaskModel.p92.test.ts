/**
 * P92-04 / P92-05 / P92-06 — bulk eligibility, cross-ref mapping, guardrails (client-side).
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';

const modelSrcPath = join(dirname(fileURLToPath(import.meta.url)), 'caseTaskModel.ts');
import type { CaseEngineCaseTask } from '$lib/apis/caseEngine/caseTasksApi';
import type { CaseTask } from './caseTaskModel';
import {
	caseEngineTaskToCaseTask,
	caseTaskBulkArchiveEligible,
	caseTaskBulkCompleteEligible,
	caseTaskBulkRestoreEligible,
	caseTaskCrossRefCounts
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

describe('P92-04 caseTaskModel bulk eligibility', () => {
	it('complete: open non-deleted only', () => {
		expect(caseTaskBulkCompleteEligible(task({ id: '1', status: 'open' }))).toBe(true);
		expect(caseTaskBulkCompleteEligible(task({ id: '2', status: 'completed' }))).toBe(false);
		expect(caseTaskBulkCompleteEligible(task({ id: '3', status: 'archived' }))).toBe(false);
		expect(
			caseTaskBulkCompleteEligible(
				task({ id: '4', status: 'open', deletedAt: '2020-02-01T00:00:00.000Z' })
			)
		).toBe(false);
	});

	it('archive: open or completed non-deleted only', () => {
		expect(caseTaskBulkArchiveEligible(task({ id: '1', status: 'open' }))).toBe(true);
		expect(caseTaskBulkArchiveEligible(task({ id: '2', status: 'completed' }))).toBe(true);
		expect(caseTaskBulkArchiveEligible(task({ id: '3', status: 'archived' }))).toBe(false);
		expect(
			caseTaskBulkArchiveEligible(
				task({ id: '4', status: 'open', deletedAt: '2020-02-01T00:00:00.000Z' })
			)
		).toBe(false);
	});

	it('restore: soft-deleted rows only', () => {
		expect(caseTaskBulkRestoreEligible(task({ id: '1', status: 'open' }))).toBe(false);
		expect(
			caseTaskBulkRestoreEligible(
				task({ id: '2', status: 'open', deletedAt: '2020-02-01T00:00:00.000Z' })
			)
		).toBe(true);
	});
});

describe('P92-05 caseTaskModel cross_refs', () => {
	it('maps engine cross_refs to crossRefs', () => {
		const row = {
			id: 't1',
			case_id: 'c1',
			title: 'x',
			description: null,
			status: 'OPEN',
			timeline_entry_id: null,
			created_at: '2020-01-01T00:00:00.000Z',
			created_by: 'u',
			updated_at: '2020-01-01T00:00:00.000Z',
			updated_by: 'u',
			completed_at: null,
			completed_by: null,
			archived_at: null,
			archived_by: null,
			deleted_at: null,
			deleted_by: null,
			assignee_user_id: null,
			assignee_display_name: null,
			due_date: null,
			priority: null,
			group_label: null,
			cross_refs: [
				{
					id: 'r1',
					case_id: 'c1',
					case_task_id: 't1',
					linked_entity_type: 'note' as const,
					linked_entity_id: '42',
					created_at: '2020-01-02T00:00:00.000Z',
					created_by: 'u',
					display_label: 'Hello',
					target_status: 'active' as const
				}
			]
		} satisfies CaseEngineCaseTask;
		const m = caseEngineTaskToCaseTask(row);
		expect(m.crossRefs.length).toBe(1);
		expect(m.crossRefs[0]?.linkedEntityId).toBe('42');
		expect(m.crossRefs[0]?.displayLabel).toBe('Hello');
	});

	it('caseTaskCrossRefCounts splits notes vs files (P94-03)', () => {
		const t = task({
			id: 'x',
			status: 'open',
			crossRefs: [
				{
					id: 'a',
					linkedEntityType: 'note',
					linkedEntityId: 'n1',
					displayLabel: null,
					targetStatus: 'active',
					createdAt: 'x',
					createdBy: 'u'
				},
				{
					id: 'b',
					linkedEntityType: 'note',
					linkedEntityId: 'n2',
					displayLabel: null,
					targetStatus: 'active',
					createdAt: 'x',
					createdBy: 'u'
				},
				{
					id: 'c',
					linkedEntityType: 'file',
					linkedEntityId: 'f1',
					displayLabel: null,
					targetStatus: 'active',
					createdAt: 'x',
					createdBy: 'u'
				}
			]
		});
		expect(caseTaskCrossRefCounts(t)).toEqual({ notes: 2, files: 1 });
		expect(caseTaskCrossRefCounts(task({ id: 'y', status: 'open' }))).toEqual({ notes: 0, files: 0 });
	});

	it('defaults missing cross_refs to empty', () => {
		const row = {
			id: 't1',
			case_id: 'c1',
			title: 'x',
			description: null,
			status: 'OPEN',
			timeline_entry_id: null,
			created_at: '2020-01-01T00:00:00.000Z',
			created_by: 'u',
			updated_at: '2020-01-01T00:00:00.000Z',
			updated_by: 'u',
			completed_at: null,
			completed_by: null,
			archived_at: null,
			archived_by: null,
			deleted_at: null,
			deleted_by: null,
			assignee_user_id: null,
			assignee_display_name: null,
			due_date: null,
			priority: null,
			group_label: null
		} as unknown as CaseEngineCaseTask;
		expect(caseEngineTaskToCaseTask(row).crossRefs).toEqual([]);
	});
});

describe('P92-06 caseTaskModel guardrails', () => {
	it('keeps filter/search/multi-criteria implementation blocks free of occurred_at', () => {
		const src = readFileSync(modelSrcPath, 'utf8');
		const start = src.indexOf('export function applyCaseTaskFilters');
		const end = src.indexOf('export function collectDistinctCaseTaskGroupLabels');
		expect(start).toBeGreaterThan(-1);
		expect(end).toBeGreaterThan(start);
		const block = src.slice(start, end);
		expect(block).not.toMatch(/\boccurred_at\b/);
	});

	it('does not persist Phase 92 client state via localStorage', () => {
		const src = readFileSync(modelSrcPath, 'utf8');
		expect(src).not.toMatch(/localStorage/);
	});
});
