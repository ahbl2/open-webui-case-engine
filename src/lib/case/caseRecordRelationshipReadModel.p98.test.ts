/**
 * P98-01 — Declared relationship read model: determinism, scope, authority, non-inference.
 */
import { describe, it, expect } from 'vitest';
import type { TimelineEntry } from '$lib/apis/caseEngine';
import type { CaseTask } from '$lib/case/caseTaskModel';
import {
	authorityBandForDeclaredTargetKind,
	buildCaseRecordRelationshipCollectionFromCaseTask,
	buildCaseRecordRelationshipCollectionFromTimelineEntry,
	buildCaseRecordRelationshipCollectionUnsupportedOrigin,
	CASE_RECORD_RELATIONSHIP_MODEL_V,
	containsForbiddenRelationshipDisplayTerm,
	DECLARED_RELATIONSHIP_UI_COPY,
	declaredRelationshipItemsFromCaseTask,
	declaredRelationshipItemsFromTimelineEntry,
	declaredRelationshipOriginKindSupported,
	filterToDeclaredRelationshipItemsOnly,
	FORBIDDEN_RELATIONSHIP_DISPLAY_TERMS,
	relationshipDisplayCopyIsAllowed,
	structuralDeclaredRelationshipKey
} from './caseRecordRelationshipReadModel';

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

function timelineEntry(
	partial: Partial<TimelineEntry> & Pick<TimelineEntry, 'id' | 'occurred_at' | 'case_id'>
): TimelineEntry {
	return {
		created_at: '2026-01-01T00:00:00.000Z',
		created_by: 'u1',
		type: 'note',
		location_text: null,
		tags: [],
		text_original: 'x',
		text_cleaned: null,
		deleted_at: null,
		...partial
	} as TimelineEntry;
}

describe('P98-01 caseRecordRelationshipReadModel', () => {
	it('accepts only declared engine-backed inputs and emits deterministic normalized output', () => {
		const t = task({
			id: 'task-a',
			linkedTimelineEntryId: 'te-1',
			crossRefs: [
				{
					id: 'xref-2',
					linkedEntityType: 'file',
					linkedEntityId: 'f-1',
					displayLabel: 'scan.pdf',
					targetStatus: 'active',
					createdAt: '2026-01-03T00:00:00.000Z',
					createdBy: 'u1'
				},
				{
					id: 'xref-1',
					linkedEntityType: 'note',
					linkedEntityId: 'n-1',
					displayLabel: 'Draft',
					targetStatus: 'unavailable',
					createdAt: '2026-01-02T00:00:00.000Z',
					createdBy: 'u1'
				}
			]
		});
		const a = declaredRelationshipItemsFromCaseTask('case-1', t);
		const b = declaredRelationshipItemsFromCaseTask('case-1', {
			...t,
			crossRefs: [...t.crossRefs].reverse()
		});
		expect(a).toEqual(b);
		expect(a.map((x) => x.relationship_key)).toEqual([
			'ce:p98:v1:case_engine_case_task_cross_ref_file:case_task:task-a:case_file:f-1',
			'ce:p98:v1:case_engine_case_task_cross_ref_note:case_task:task-a:notebook_note:n-1',
			'ce:p98:v1:case_engine_case_task_timeline_reference:case_task:task-a:timeline_entry:te-1'
		]);
		expect(a.every((x) => x.v === CASE_RECORD_RELATIONSHIP_MODEL_V)).toBe(true);
		expect(a.every((x) => x.case_id === 'case-1')).toBe(true);
	});

	it('drops unsupported / invalid cross-ref shapes (no inferred targets)', () => {
		const t = task({
			id: 't1',
			crossRefs: [
				{
					id: 'bad-empty',
					linkedEntityType: 'note',
					linkedEntityId: '   ',
					displayLabel: null,
					targetStatus: 'active',
					createdAt: '2026-01-01T00:00:00.000Z',
					createdBy: 'u1'
				},
				{
					id: 'ok',
					linkedEntityType: 'note',
					linkedEntityId: 'n9',
					displayLabel: null,
					targetStatus: 'active',
					createdAt: '2026-01-01T00:00:00.000Z',
					createdBy: 'u1'
				}
			]
		});
		const items = declaredRelationshipItemsFromCaseTask('case-1', t);
		expect(items.map((x) => x.target.id)).toEqual(['n9']);
	});

	it('preserves single-case boundaries on timeline-linked image extraction', () => {
		const e = timelineEntry({
			id: 'e1',
			case_id: 'case-1',
			occurred_at: '2026-01-01T12:00:00.000Z',
			linked_image_files: [
				{ id: 'b', original_filename: 'b.png', mime_type: 'image/png' },
				{ id: 'a', original_filename: 'a.png', mime_type: 'image/png' }
			]
		});
		const same = declaredRelationshipItemsFromTimelineEntry('case-1', e);
		const wrongCase = declaredRelationshipItemsFromTimelineEntry('other', e);
		expect(wrongCase).toEqual([]);
		expect(same.map((x) => x.relationship_key)).toEqual([
			'ce:p98:v1:case_engine_timeline_entry_linked_image_file:timeline_entry:e1:case_file:a',
			'ce:p98:v1:case_engine_timeline_entry_linked_image_file:timeline_entry:e1:case_file:b'
		]);
		expect(same.every((x) => x.target.kind === 'case_file')).toBe(true);
	});

	it('preserves real target identity and authority-safe bands (P97-style)', () => {
		const items = declaredRelationshipItemsFromCaseTask('c', task({ id: 't', linkedTimelineEntryId: 'te' }));
		expect(items).toHaveLength(1);
		expect(items[0]?.target).toEqual({ kind: 'timeline_entry', id: 'te' });
		expect(items[0]?.target_authority_band).toBe('authoritative_timeline');
		const fileOnly = declaredRelationshipItemsFromCaseTask(
			'c',
			task({
				id: 't2',
				crossRefs: [
					{
						id: 'x1',
						linkedEntityType: 'file',
						linkedEntityId: 'f1',
						displayLabel: null,
						targetStatus: 'active',
						createdAt: '2026-01-01T00:00:00.000Z',
						createdBy: 'u1'
					}
				]
			})
		);
		expect(fileOnly[0]?.target_authority_band).toBe('supporting_file');
	});

	it('emits correct empty-state when no declared relationships exist', () => {
		const col = buildCaseRecordRelationshipCollectionFromCaseTask('case-1', task({ id: 'solo' }));
		expect(col.items).toEqual([]);
		expect(col.empty_state).toBe('no_declared_links');
	});

	it('emits origin_unsupported for case_file origin (read contract not in P98-01)', () => {
		const col = buildCaseRecordRelationshipCollectionUnsupportedOrigin('case-1', {
			kind: 'case_file',
			id: 'f1'
		});
		expect(col.empty_state).toBe('origin_unsupported');
		expect(col.items).toEqual([]);
	});

	it('filterToDeclaredRelationshipItemsOnly rejects malformed or non-declared items', () => {
		const good = declaredRelationshipItemsFromCaseTask('c', task({ id: 't', linkedTimelineEntryId: 'te' }));
		const bad = [
			...good,
			{
				...good[0],
				v: 99,
				relationship_key: 'x'
			},
			{
				...good[0],
				provenance: 'inferred_guess' as never,
				relationship_key: 'y'
			}
		] as never;
		const filtered = filterToDeclaredRelationshipItemsOnly(bad);
		expect(filtered).toEqual(good);
	});

	it('UI copy constants do not contain forbidden relationship terms', () => {
		for (const v of Object.values(DECLARED_RELATIONSHIP_UI_COPY)) {
			expect(containsForbiddenRelationshipDisplayTerm(v)).toBe(false);
			expect(relationshipDisplayCopyIsAllowed(v)).toBe(true);
		}
		for (const term of FORBIDDEN_RELATIONSHIP_DISPLAY_TERMS) {
			expect(containsForbiddenRelationshipDisplayTerm(`prefix ${term} suffix`)).toBe(true);
			expect(relationshipDisplayCopyIsAllowed(`prefix ${term} suffix`)).toBe(false);
		}
	});

	it('forbidden guard blocks causal / narrative implication phrases (central enforcement)', () => {
		const bad = [
			'Related event in the file',
			'Connected incident summary',
			'This led to a follow-up',
			'Associated with the witness',
			'Led to review',
			'Because of the memo'
		];
		for (const s of bad) {
			expect(containsForbiddenRelationshipDisplayTerm(s), s).toBe(true);
		}
		expect(containsForbiddenRelationshipDisplayTerm('unrelated noise')).toBe(false);
	});

	it('relationship_key is structural only (ignores display label / xref row id)', () => {
		const t1 = task({
			id: 'task-a',
			crossRefs: [
				{
					id: 'xref-2',
					linkedEntityType: 'note',
					linkedEntityId: 'n-1',
					displayLabel: 'Alpha',
					targetStatus: 'active',
					createdAt: '2026-01-03T00:00:00.000Z',
					createdBy: 'u1'
				}
			]
		});
		const t2 = task({
			id: 'task-a',
			crossRefs: [
				{
					id: 'xref-2',
					linkedEntityType: 'note',
					linkedEntityId: 'n-1',
					displayLabel: 'Beta different',
					targetStatus: 'active',
					createdAt: '2026-01-03T00:00:00.000Z',
					createdBy: 'u1'
				}
			]
		});
		const k1 = declaredRelationshipItemsFromCaseTask('case-1', t1)[0]?.relationship_key;
		const k2 = declaredRelationshipItemsFromCaseTask('case-1', t2)[0]?.relationship_key;
		expect(k1).toBe(k2);
		expect(k1).toBe(
			structuralDeclaredRelationshipKey('case_engine_case_task_cross_ref_note', { kind: 'case_task', id: 'task-a' }, { kind: 'notebook_note', id: 'n-1' })
		);
	});

	it('dedupes duplicate structural edges (same origin + target + provenance)', () => {
		const t = task({
			id: 'task-a',
			crossRefs: [
				{
					id: 'row-a',
					linkedEntityType: 'note',
					linkedEntityId: 'n1',
					displayLabel: null,
					targetStatus: 'active',
					createdAt: '2026-01-01T00:00:00.000Z',
					createdBy: 'u1'
				},
				{
					id: 'row-b',
					linkedEntityType: 'note',
					linkedEntityId: 'n1',
					displayLabel: 'dup',
					targetStatus: 'active',
					createdAt: '2026-01-02T00:00:00.000Z',
					createdBy: 'u1'
				}
			]
		});
		const items = declaredRelationshipItemsFromCaseTask('case-1', t);
		expect(items).toHaveLength(1);
	});

	it('declaredRelationshipOriginKindSupported matches contract (timeline + task only)', () => {
		expect(declaredRelationshipOriginKindSupported('timeline_entry')).toBe(true);
		expect(declaredRelationshipOriginKindSupported('case_task')).toBe(true);
		expect(declaredRelationshipOriginKindSupported('case_file')).toBe(false);
		expect(declaredRelationshipOriginKindSupported('notebook_note')).toBe(false);
	});

	it('authorityBandForDeclaredTargetKind covers all declared record kinds without drift', () => {
		expect(authorityBandForDeclaredTargetKind('timeline_entry')).toBe('authoritative_timeline');
		expect(authorityBandForDeclaredTargetKind('case_task')).toBe('operational_task');
		expect(authorityBandForDeclaredTargetKind('case_file')).toBe('supporting_file');
		expect(authorityBandForDeclaredTargetKind('notebook_note')).toBe('notebook_working_note');
	});

	it('buildCaseRecordRelationshipCollectionFromTimelineEntry drops cross-case entry rows', () => {
		const e = timelineEntry({
			id: 'e1',
			case_id: 'case-a',
			occurred_at: '2026-01-01T12:00:00.000Z',
			linked_image_files: [{ id: 'f', original_filename: 'x', mime_type: null }]
		});
		const col = buildCaseRecordRelationshipCollectionFromTimelineEntry('case-b', e);
		expect(col.items).toEqual([]);
		expect(col.empty_state).toBe('no_declared_links');
	});

	it('collection is populated when at least one declared item exists', () => {
		const col = buildCaseRecordRelationshipCollectionFromCaseTask(
			'case-1',
			task({ id: 't', linkedTimelineEntryId: 'te' })
		);
		expect(col.empty_state).toBe('populated');
		expect(col.items.length).toBe(1);
	});
});
