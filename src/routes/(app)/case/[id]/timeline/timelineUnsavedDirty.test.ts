/**
 * P38-06 — Timeline unsaved dirty detection for route guard.
 */
import { describe, it, expect } from 'vitest';
import {
	isDirtyTimelineCreate,
	isDirtyTimelineEdit,
	isoToDatetimeLocal,
	type TimelineEditDraftForDirty
} from './timelineUnsavedDirty';
import type { TimelineEntry } from '$lib/apis/caseEngine';

const baseEntry: TimelineEntry = {
	id: 'e1',
	case_id: 'c1',
	occurred_at: '2024-01-15T10:00:00Z',
	created_at: '2024-01-16T10:00:00Z',
	created_by: 'u1',
	type: 'note',
	location_text: 'Loc A',
	tags: [],
	text_original: 'Hello',
	text_cleaned: null,
	deleted_at: null,
	version_count: 0
};

describe('isDirtyTimelineCreate', () => {
	it('false when no draft', () => {
		expect(isDirtyTimelineCreate(null)).toBe(false);
	});

	it('false when text empty', () => {
		expect(isDirtyTimelineCreate({ text_original: '' })).toBe(false);
		expect(isDirtyTimelineCreate({ text_original: '   ' })).toBe(false);
	});

	it('true when text non-empty', () => {
		expect(isDirtyTimelineCreate({ text_original: 'x' })).toBe(true);
	});
});

describe('isDirtyTimelineEdit', () => {
	const draftMatch: TimelineEditDraftForDirty = {
		text_original: 'Hello',
		type: 'note',
		occurred_at: isoToDatetimeLocal(baseEntry.occurred_at),
		location_text: 'Loc A',
		change_reason: ''
	};

	it('false when not editing', () => {
		expect(isDirtyTimelineEdit(null, draftMatch, [baseEntry])).toBe(false);
		expect(isDirtyTimelineEdit('e1', null, [baseEntry])).toBe(false);
	});

	it('false when entry missing', () => {
		expect(isDirtyTimelineEdit('missing', draftMatch, [baseEntry])).toBe(false);
	});

	it('false when draft matches entry and no reason', () => {
		expect(isDirtyTimelineEdit('e1', draftMatch, [baseEntry])).toBe(false);
	});

	it('true when text changed', () => {
		expect(
			isDirtyTimelineEdit('e1', { ...draftMatch, text_original: 'Hi' }, [baseEntry])
		).toBe(true);
	});

	it('true when change_reason started', () => {
		expect(
			isDirtyTimelineEdit('e1', { ...draftMatch, change_reason: 'typo' }, [baseEntry])
		).toBe(true);
	});

	it('true when type changed', () => {
		expect(
			isDirtyTimelineEdit('e1', { ...draftMatch, type: 'evidence' }, [baseEntry])
		).toBe(true);
	});

	it('true when location changed', () => {
		expect(
			isDirtyTimelineEdit('e1', { ...draftMatch, location_text: 'Loc B' }, [baseEntry])
		).toBe(true);
	});

	it('true when occurred_at (datetime-local) differs from persisted ISO', () => {
		expect(
			isDirtyTimelineEdit(
				'e1',
				{ ...draftMatch, occurred_at: '2024-01-15T11:00:00' },
				[baseEntry]
			)
		).toBe(true);
	});
});

describe('isoToDatetimeLocal', () => {
	it('aligns Zulu occurred_at with edit draft comparison', () => {
		expect(isoToDatetimeLocal('2024-01-15T10:00:00Z')).toBe('2024-01-15T10:00:00');
	});
});
