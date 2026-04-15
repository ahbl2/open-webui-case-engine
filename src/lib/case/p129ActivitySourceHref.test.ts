/**
 * P129-04 — Deterministic source URLs from event shape only.
 */
import { describe, expect, it } from 'vitest';
import type { CaseActivityEvent } from '$lib/apis/caseEngine/caseP129ActivityEventsApi';
import { p129ActivitySourceHref } from './p129ActivitySourceHref';

function ev(partial: Partial<CaseActivityEvent> & Pick<CaseActivityEvent, 'target_type' | 'target_id'>): CaseActivityEvent {
	return {
		event_id: 'e1',
		event_type: 'timeline_entry_created',
		case_id: 'c1',
		occurred_at: '2025-01-01T00:00:00.000Z',
		recorded_at: '2025-01-01T00:00:00.000Z',
		actor_user_id: 'u1',
		...partial
	};
}

describe('p129ActivitySourceHref', () => {
	const caseId = 'case-abc';

	it('maps timeline_entry to highlight param', () => {
		const href = p129ActivitySourceHref(
			caseId,
			ev({ target_type: 'timeline_entry', target_id: 'te-1' })
		);
		expect(href).toBe(`/case/${encodeURIComponent(caseId)}/timeline?highlight=${encodeURIComponent('te-1')}`);
	});

	it('maps case_file to files file param', () => {
		const href = p129ActivitySourceHref(caseId, ev({ target_type: 'case_file', target_id: 'f-9' }));
		expect(href).toBe(`/case/${encodeURIComponent(caseId)}/files?file=${encodeURIComponent('f-9')}`);
	});

	it('maps proposal to proposals list', () => {
		const href = p129ActivitySourceHref(caseId, ev({ target_type: 'proposal', target_id: 'p-1' }));
		expect(href).toBe(`/case/${encodeURIComponent(caseId)}/proposals`);
	});

	it('maps case_workflow_item to witem route', () => {
		const href = p129ActivitySourceHref(caseId, ev({ target_type: 'case_workflow_item', target_id: 'w-1' }));
		expect(href).toBe(`/case/${encodeURIComponent(caseId)}/workflow/witem/${encodeURIComponent('w-1')}`);
	});

	it('maps case_workflow_item_version using metadata workflow_item_id', () => {
		const href = p129ActivitySourceHref(
			caseId,
			ev({
				target_type: 'case_workflow_item_version',
				target_id: 'ver-1',
				metadata: { workflow_item_id: 'w-2', previous_status: 'OPEN', status: 'CLOSED' }
			})
		);
		expect(href).toBe(`/case/${encodeURIComponent(caseId)}/workflow/witem/${encodeURIComponent('w-2')}`);
	});

	it('maps case_workflow_item_version without workflow_item_id to workflow list', () => {
		const href = p129ActivitySourceHref(
			caseId,
			ev({ target_type: 'case_workflow_item_version', target_id: 'ver-1', metadata: {} })
		);
		expect(href).toBe(`/case/${encodeURIComponent(caseId)}/workflow`);
	});

	it('maps case_entity to entities detail', () => {
		const href = p129ActivitySourceHref(caseId, ev({ target_type: 'case_entity', target_id: 'ent-1' }));
		expect(href).toBe(`/case/${encodeURIComponent(caseId)}/entities/${encodeURIComponent('ent-1')}`);
	});

	it('maps case_entity_evidence_link using metadata case_entity_id', () => {
		const href = p129ActivitySourceHref(
			caseId,
			ev({
				target_type: 'case_entity_evidence_link',
				target_id: 'link-1',
				metadata: { case_entity_id: 'ent-2', link_type: 'case_file' }
			})
		);
		expect(href).toBe(`/case/${encodeURIComponent(caseId)}/entities/${encodeURIComponent('ent-2')}`);
	});
});
