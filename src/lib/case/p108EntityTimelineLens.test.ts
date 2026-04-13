/**
 * P108-01 — Entity timeline lens helpers (deterministic; explicit links only).
 */
import { describe, expect, it } from 'vitest';

import type { CaseEngineEvidenceLinkReadItem } from '$lib/apis/caseEngine/caseEntitiesApi';
import type { TimelineEntry } from '$lib/apis/caseEngine';
import {
	caseFileIdsLinkedFromEntityEvidence,
	filterCaseFilesToEntityLinkedOnly,
	filterTimelineEntriesToEntityLinkedOnly,
	parseEntityLensEntityIdFromSearchParams,
	P108_ENTITY_LENS_QUERY_PARAM,
	timelineEntryIdsLinkedFromEntityEvidence
} from './p108EntityTimelineLens';
import type { CaseFile } from '$lib/apis/caseEngine';

function link(
	overrides: Partial<CaseEngineEvidenceLinkReadItem> & Pick<CaseEngineEvidenceLinkReadItem, 'target_id'>
): CaseEngineEvidenceLinkReadItem {
	return {
		id: 'l1',
		case_id: 'c1',
		case_entity_id: 'e1',
		link_type: 'timeline_entry',
		created_at: '2024-01-01T00:00:00Z',
		created_by: 'u1',
		deleted_at: null,
		deleted_by: null,
		target_label: null,
		target_status: 'active',
		...overrides
	};
}

function entry(id: string, occurred_at: string): TimelineEntry {
	return {
		id,
		case_id: 'c1',
		occurred_at,
		created_at: '2024-01-01T00:00:00Z',
		created_by: 'u1',
		type: 'note',
		location_text: null,
		tags: [],
		text_original: 't',
		text_cleaned: null,
		deleted_at: null
	};
}

describe('p108EntityTimelineLens', () => {
	it('parseEntityLensEntityIdFromSearchParams reads entityLens only', () => {
		const a = new URLSearchParams('');
		expect(parseEntityLensEntityIdFromSearchParams(a)).toBeNull();
		const b = new URLSearchParams({ [P108_ENTITY_LENS_QUERY_PARAM]: '  ent-1  ' });
		expect(parseEntityLensEntityIdFromSearchParams(b)).toBe('ent-1');
	});

	it('timelineEntryIdsLinkedFromEntityEvidence collects timeline_entry targets only (deterministic sorted unique)', () => {
		const ids = timelineEntryIdsLinkedFromEntityEvidence([
			link({ target_id: 'b', id: '1' }),
			link({ target_id: 'a', id: '2' }),
			link({ id: '3', target_id: 'f1', link_type: 'case_file' }),
			link({ target_id: 'a', id: '4' })
		]);
		expect(ids).toEqual(['a', 'b']);
	});

	it('filterTimelineEntriesToEntityLinkedOnly keeps explicit matches and official order', () => {
		const linked = new Set(['t2', 't1']);
		const out = filterTimelineEntriesToEntityLinkedOnly(
			[entry('t2', '2020-01-02T00:00:00Z'), entry('x', '2019-01-01T00:00:00Z'), entry('t1', '2020-01-01T00:00:00Z')],
			linked
		);
		expect(out.map((e) => e.id)).toEqual(['t1', 't2']);
	});

	it('caseFileIdsLinkedFromEntityEvidence collects case_file targets only', () => {
		const ids = caseFileIdsLinkedFromEntityEvidence([
			link({ target_id: 'f2', id: '1', link_type: 'case_file' }),
			link({ target_id: 'f1', id: '2', link_type: 'case_file' }),
			link({ target_id: 't1', id: '3' })
		]);
		expect(ids).toEqual(['f1', 'f2']);
	});

	it('filterCaseFilesToEntityLinkedOnly preserves list order', () => {
		const a = { id: 'a' } as CaseFile;
		const b = { id: 'b' } as CaseFile;
		const out = filterCaseFilesToEntityLinkedOnly([a, b, { id: 'c' } as CaseFile], new Set(['c', 'a']));
		expect(out.map((f) => f.id)).toEqual(['a', 'c']);
	});
});
