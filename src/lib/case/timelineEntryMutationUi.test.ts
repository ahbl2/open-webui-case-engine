/**
 * P40-04 — parity tests for timeline direct-edit sensitivity hints (UI).
 */
import { describe, it, expect } from 'vitest';
import {
	isTextMateriallyAltered,
	timelineEditRequiresDetailedReason,
	TIMELINE_SENSITIVE_CHANGE_REASON_MIN_LEN
} from './timelineEntryMutationUi';
import type { TimelineEntry } from '$lib/apis/caseEngine';

const baseEntry: TimelineEntry = {
	id: 'e1',
	case_id: 'c1',
	occurred_at: '2024-06-01T10:00:00Z',
	created_at: '2024-06-02T10:00:00Z',
	created_by: 'u1',
	type: 'note',
	location_text: null,
	tags: [],
	text_original: 'Witness statement v1',
	text_cleaned: null,
	deleted_at: null,
	version_count: 0,
	linked_image_files: []
};

describe('timelineEntryMutationUi', () => {
	it('exposes same minimum length as Case Engine (24)', () => {
		expect(TIMELINE_SENSITIVE_CHANGE_REASON_MIN_LEN).toBe(24);
	});

	it('timelineEditRequiresDetailedReason is false for minor text tweak', () => {
		expect(
			timelineEditRequiresDetailedReason(
				baseEntry,
				{ type: 'note', text_original: 'Witness statement v1.' },
				'2024-06-01T10:00:00Z'
			)
		).toBe(false);
	});

	it('timelineEditRequiresDetailedReason is true when occurred_at instant changes', () => {
		expect(
			timelineEditRequiresDetailedReason(
				baseEntry,
				{ type: 'note', text_original: 'Witness statement v1' },
				'2024-06-02T10:00:00Z'
			)
		).toBe(true);
	});

	it('timelineEditRequiresDetailedReason is true when type changes', () => {
		expect(
			timelineEditRequiresDetailedReason(
				baseEntry,
				{ type: 'interview', text_original: 'Witness statement v1' },
				'2024-06-01T10:00:00Z'
			)
		).toBe(true);
	});

	it('isTextMateriallyAltered matches engine-style material detection', () => {
		expect(isTextMateriallyAltered('Hello world', 'Hello world.')).toBe(false);
		expect(isTextMateriallyAltered('Short old', 'A much longer replacement narrative for the case file.')).toBe(
			true
		);
	});
});
