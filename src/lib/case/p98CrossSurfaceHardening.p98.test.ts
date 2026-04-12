/**
 * P98-05 — Cross-surface consistency: copy, navigability, single-case, read-only (no new surfaces).
 */
import { describe, it, expect } from 'vitest';
import type { TimelineEntry } from '$lib/apis/caseEngine';
import type { CaseTask } from '$lib/case/caseTaskModel';
import {
	containsForbiddenRelationshipDisplayTerm,
	DECLARED_RELATIONSHIP_UI_COPY,
	declaredRelationshipItemsFromCaseTask,
	declaredRelationshipOriginKindSupported
} from '$lib/case/caseRecordRelationshipReadModel';
import { caseFileDeclaredRelationshipsPresentation } from '$lib/case/filesP98DeclaredRelationships';
import {
	buildSynthesisIntentForDeclaredTarget,
	p98DeclaredRelationshipNavigateAriaLabel as p98NavigateAriaFromNavigation
} from '$lib/case/p98DeclaredRelationshipNavigation';
import {
	mapDeclaredItemsToPresentationRows,
	P98_DECLARED_NAVIGATE_ARIA_LABEL_BY_KIND,
	P98_DECLARED_RELATIONSHIP_REGION_ARIA,
	P98_TARGET_UNAVAILABLE_NOTE,
	p98DeclaredRelationshipNavigateAriaLabel
} from '$lib/case/p98DeclaredRelationshipPresentation';
import { taskDeclaredRelationshipsPresentation } from '$lib/case/tasksP98DeclaredRelationships';
import { timelineEntryDeclaredRelationshipsPresentation } from '$lib/case/timelineP98DeclaredRelationships';

function timelineEntry(
	partial: Partial<TimelineEntry> & Pick<TimelineEntry, 'id' | 'occurred_at' | 'case_id'>
): TimelineEntry {
	return {
		created_at: '2026-01-01T00:00:00.000Z',
		created_by: 'u1',
		type: 'evidence',
		location_text: null,
		tags: [],
		text_original: 'body',
		text_cleaned: null,
		deleted_at: null,
		...partial
	} as TimelineEntry;
}

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

describe('P98-05 cross-surface hardening', () => {
	it('single source for unavailable note and region aria (read model ↔ presentation)', () => {
		expect(P98_TARGET_UNAVAILABLE_NOTE).toBe(DECLARED_RELATIONSHIP_UI_COPY.targetUnavailableNote);
		expect(P98_DECLARED_RELATIONSHIP_REGION_ARIA).toBe(DECLARED_RELATIONSHIP_UI_COPY.regionAriaLabel);
	});

	it('Timeline and Tasks use identical heading and footnote when populated', () => {
		const te = timelineEntryDeclaredRelationshipsPresentation(
			'c',
			timelineEntry({
				id: 'e1',
				case_id: 'c',
				occurred_at: '2026-01-01T12:00:00.000Z',
				linked_image_files: [{ id: 'a', original_filename: 'x.png', mime_type: 'image/png' }]
			})
		);
		const tk = taskDeclaredRelationshipsPresentation(
			'c',
			task({
				id: 't1',
				linkedTimelineEntryId: 'te-1'
			})
		);
		expect(te.show).toBe(true);
		expect(tk.show).toBe(true);
		expect(te.heading).toBe(tk.heading);
		expect(te.heading).toBe(DECLARED_RELATIONSHIP_UI_COPY.sectionHeading);
		expect(te.footnote).toBe(tk.footnote);
		expect(te.footnote).toBe(DECLARED_RELATIONSHIP_UI_COPY.supportingContextFootnote);
	});

	it('navigation module re-exports the same navigate-aria helper as presentation (no drift)', () => {
		expect(p98NavigateAriaFromNavigation).toBe(p98DeclaredRelationshipNavigateAriaLabel);
	});

	it('all navigate aria strings pass forbidden copy guard', () => {
		for (const s of Object.values(P98_DECLARED_NAVIGATE_ARIA_LABEL_BY_KIND)) {
			expect(containsForbiddenRelationshipDisplayTerm(s)).toBe(false);
		}
	});

	it('notebook_note has no synthesis intent (narrow same-case exception; no P97 state for notes)', () => {
		expect(buildSynthesisIntentForDeclaredTarget('c', 'notebook_note', 'n1')).toBeNull();
	});

	it('file origin remains unsupported: no rows, no show, originUnsupported factual', () => {
		const p = caseFileDeclaredRelationshipsPresentation('case-1', 'file-a');
		expect(p.show).toBe(false);
		expect(p.rows.length).toBe(0);
		expect(p.originUnsupported).toBe(true);
		expect(declaredRelationshipOriginKindSupported('case_file')).toBe(false);
	});

	it('navigability: unavailable targets are inert (no navigable, factual note only)', () => {
		const t = task({
			id: 'task-a',
			crossRefs: [
				{
					id: 'x1',
					linkedEntityType: 'note',
					linkedEntityId: 'n-1',
					displayLabel: 'Draft',
					targetStatus: 'unavailable',
					createdAt: '2026-01-01T00:00:00.000Z',
					createdBy: 'u1'
				}
			]
		});
		const p = taskDeclaredRelationshipsPresentation('case-1', t);
		const row = p.rows[0];
		expect(row?.navigable).toBe(false);
		expect(row?.availabilityNote).toBe(P98_TARGET_UNAVAILABLE_NOTE);
	});

	it('mapDeclaredItemsToPresentationRows preserves contract item order (no UI resort)', () => {
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
				}
			]
		});
		const items = declaredRelationshipItemsFromCaseTask('case-1', t);
		const rows = mapDeclaredItemsToPresentationRows(items);
		expect(rows.map((r) => r.relationship_key)).toEqual(items.map((i) => i.relationship_key));
	});
});
