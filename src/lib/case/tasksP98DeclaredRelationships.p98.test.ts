/**
 * P98-03 — Task declared relationships presentation (contract-only).
 */
import { describe, it, expect } from 'vitest';
import type { CaseTask } from '$lib/case/caseTaskModel';
import { DECLARED_RELATIONSHIP_UI_COPY } from '$lib/case/caseRecordRelationshipReadModel';
import { P98_TARGET_UNAVAILABLE_NOTE } from '$lib/case/p98DeclaredRelationshipPresentation';
import {
	assertTaskP98DeclaredCopyPassesGuard,
	taskDeclaredRelationshipsPresentation
} from './tasksP98DeclaredRelationships';

function task(partial: Partial<CaseTask> & Pick<CaseTask, 'id'>): CaseTask {
	return {
		title: 'T',
		createdAt: '2026-01-01T00:00:00.000Z',
		createdBy: 'u1',
		updatedAt: '2026-01-01T00:00:00.000Z',
		status: 'open',
		crossRefs: [],
		...partial
	} as CaseTask;
}

describe('tasksP98DeclaredRelationships (P98-03)', () => {
	it('shows declared rows only from P98-01 contract order (deterministic)', () => {
		const t = task({
			id: 'task-a',
			linkedTimelineEntryId: 'te-1',
			crossRefs: [
				{
					id: 'x2',
					linkedEntityType: 'file',
					linkedEntityId: 'f-1',
					displayLabel: 'a.pdf',
					targetStatus: 'active',
					createdAt: '2026-01-01T00:00:00.000Z',
					createdBy: 'u1'
				},
				{
					id: 'x1',
					linkedEntityType: 'note',
					linkedEntityId: 'n-1',
					displayLabel: null,
					targetStatus: 'unavailable',
					createdAt: '2026-01-01T00:00:00.000Z',
					createdBy: 'u1'
				}
			]
		});
		const p = taskDeclaredRelationshipsPresentation('case-1', t);
		expect(p.show).toBe(true);
		expect(p.rows.map((r) => r.relationship_key)).toEqual([
			'ce:p98:v1:case_engine_case_task_cross_ref_file:case_task:task-a:case_file:f-1',
			'ce:p98:v1:case_engine_case_task_cross_ref_note:case_task:task-a:notebook_note:n-1',
			'ce:p98:v1:case_engine_case_task_timeline_reference:case_task:task-a:timeline_entry:te-1'
		]);
		expect(p.rows[1]?.availabilityNote).toBe(P98_TARGET_UNAVAILABLE_NOTE);
		expect(p.rows[0]?.navigable).toBe(true);
		expect(p.rows[1]?.navigable).toBe(false);
		expect(p.rows[2]?.navigable).toBe(true);
	});

	it('empty when no declared links (non-speculative)', () => {
		const p = taskDeclaredRelationshipsPresentation('case-1', task({ id: 'solo' }));
		expect(p.show).toBe(false);
	});

	it('copy guard on footnote', () => {
		assertTaskP98DeclaredCopyPassesGuard(DECLARED_RELATIONSHIP_UI_COPY.sectionHeading, 'heading');
	});
});
