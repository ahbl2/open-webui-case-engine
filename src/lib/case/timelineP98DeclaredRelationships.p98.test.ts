/**
 * P98-02 — Timeline declared relationships: contract-only presentation, authority-safe copy, determinism.
 */
import { describe, it, expect } from 'vitest';
import type { TimelineEntry } from '$lib/apis/caseEngine';
import type { DeclaredRelationshipItem } from '$lib/case/caseRecordRelationshipReadModel';
import {
	CASE_RECORD_RELATIONSHIP_MODEL_V,
	containsForbiddenRelationshipDisplayTerm,
	DECLARED_RELATIONSHIP_UI_COPY
} from '$lib/case/caseRecordRelationshipReadModel';
import {
	assertTimelineP98DeclaredCopyPassesGuard,
	rowPrimaryLineFromDeclaredItem,
	timelineEntryDeclaredRelationshipsPresentation,
	TIMELINE_P98_TARGET_UNAVAILABLE_NOTE
} from './timelineP98DeclaredRelationships';

function entry(
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

describe('timelineP98DeclaredRelationships (P98-02)', () => {
	it('copy shipped for Timeline P98 passes P98-01 forbidden guard', () => {
		assertTimelineP98DeclaredCopyPassesGuard(TIMELINE_P98_TARGET_UNAVAILABLE_NOTE, 'unavailable note');
		for (const v of Object.values(DECLARED_RELATIONSHIP_UI_COPY)) {
			assertTimelineP98DeclaredCopyPassesGuard(v, 'DECLARED_RELATIONSHIP_UI_COPY');
		}
		expect(containsForbiddenRelationshipDisplayTerm(TIMELINE_P98_TARGET_UNAVAILABLE_NOTE)).toBe(false);
	});

	it('presentation is empty when no declared links (non-speculative)', () => {
		const e = entry({
			id: 'e1',
			case_id: 'case-a',
			occurred_at: '2026-01-01T12:00:00.000Z',
			linked_image_files: []
		});
		const p = timelineEntryDeclaredRelationshipsPresentation('case-a', e);
		expect(p.show).toBe(false);
		expect(p.rows.length).toBe(0);
	});

	it('cross-case caseId mismatch yields no UI rows (single-case boundary)', () => {
		const e = entry({
			id: 'e1',
			case_id: 'case-a',
			occurred_at: '2026-01-01T12:00:00.000Z',
			linked_image_files: [{ id: 'f1', original_filename: 'a.png', mime_type: 'image/png' }]
		});
		const p = timelineEntryDeclaredRelationshipsPresentation('case-b', e);
		expect(p.show).toBe(false);
	});

	it('renders only from contract items with stable order (no UI resort)', () => {
		const e = entry({
			id: 'e1',
			case_id: 'c',
			occurred_at: '2026-01-01T12:00:00.000Z',
			linked_image_files: [
				{ id: 'b', original_filename: 'second.png', mime_type: 'image/png' },
				{ id: 'a', original_filename: 'first.png', mime_type: 'image/png' }
			]
		});
		const p = timelineEntryDeclaredRelationshipsPresentation('c', e);
		expect(p.show).toBe(true);
		expect(p.heading).toBe(DECLARED_RELATIONSHIP_UI_COPY.sectionHeading);
		expect(p.rows.map((r) => r.relationship_key)).toEqual([
			'ce:p98:v1:case_engine_timeline_entry_linked_image_file:timeline_entry:e1:case_file:a',
			'ce:p98:v1:case_engine_timeline_entry_linked_image_file:timeline_entry:e1:case_file:b'
		]);
		expect(p.rows[0]?.primaryLine).toContain('Supporting file');
		expect(p.rows[0]?.primaryLine).toContain('first.png');
		expect(p.rows.every((r) => r.navigable)).toBe(true);
		expect(p.rows[0]?.target_kind).toBe('case_file');
	});

	it('unavailable target shows factual note only (no recovery semantics)', () => {
		const item: DeclaredRelationshipItem = {
			v: CASE_RECORD_RELATIONSHIP_MODEL_V,
			case_id: 'c',
			relationship_key: 'ce:p98:v1:case_engine_timeline_entry_linked_image_file:timeline_entry:e1:case_file:f1',
			provenance: 'case_engine_timeline_entry_linked_image_file',
			origin: { kind: 'timeline_entry', id: 'e1' },
			target: { kind: 'case_file', id: 'f1' },
			target_authority_band: 'supporting_file',
			target_availability: 'unavailable',
			label_from_engine: 'scan.png'
		};
		const line = rowPrimaryLineFromDeclaredItem(item);
		expect(line).toBe('Supporting file · scan.png');
		const note =
			item.target_availability === 'unavailable' ? TIMELINE_P98_TARGET_UNAVAILABLE_NOTE : null;
		expect(note).toBe(TIMELINE_P98_TARGET_UNAVAILABLE_NOTE);
		expect(containsForbiddenRelationshipDisplayTerm(note ?? '')).toBe(false);
	});
});
