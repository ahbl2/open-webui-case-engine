/**
 * P40-04 / P40-04A — parity tests for timeline direct-edit sensitivity (UI preflight only).
 * Case Engine `timelineEntryMutationGuards.ts` is authoritative; contract version must match.
 */
import { describe, it, expect } from 'vitest';
import {
	isTextMateriallyAltered,
	normalizeTimelineTextForMaterialCompare,
	timelineEditRequiresDetailedReason,
	TIMELINE_MUTATION_EDIT_GUARD_CONTRACT_VERSION,
	TIMELINE_SENSITIVE_CHANGE_REASON_MIN_LEN,
	TIMELINE_SENSITIVE_REASON_HINT
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
	it('mirrors Case Engine edit-guard contract version (drift guard)', () => {
		expect(TIMELINE_MUTATION_EDIT_GUARD_CONTRACT_VERSION).toBe('p40-04a-v1');
	});

	it('documents 24-character sensitive change_reason contract (server enforces)', () => {
		expect(TIMELINE_SENSITIVE_CHANGE_REASON_MIN_LEN).toBe(24);
		expect(TIMELINE_SENSITIVE_REASON_HINT).toContain('24');
		expect(TIMELINE_SENSITIVE_REASON_HINT.toLowerCase()).toContain('case engine');
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

	it('timelineEditRequiresDetailedReason is false for whitespace-only cleanup (P40-04A)', () => {
		const entry: TimelineEntry = {
			...baseEntry,
			text_original: 'Line  one  \n two.'
		};
		expect(
			timelineEditRequiresDetailedReason(
				entry,
				{ type: 'note', text_original: 'Line one two.' },
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

	it('timelineEditRequiresDetailedReason is true for substantive text rewrite', () => {
		expect(
			timelineEditRequiresDetailedReason(
				baseEntry,
				{
					type: 'note',
					text_original:
						'A full replacement narrative that is not a minor edit to the prior witness statement body.'
				},
				'2024-06-01T10:00:00Z'
			)
		).toBe(true);
	});

	it('normalizeTimelineTextForMaterialCompare matches engine behavior', () => {
		expect(normalizeTimelineTextForMaterialCompare('  x  \n y')).toBe('x y');
	});

	it('isTextMateriallyAltered matches tuned material detection (P40-04A)', () => {
		expect(isTextMateriallyAltered('Hello world', 'Hello world.')).toBe(false);
		expect(isTextMateriallyAltered('Short old', 'A much longer replacement narrative for the case file.')).toBe(
			true
		);
		expect(isTextMateriallyAltered('a  b', 'a b')).toBe(false);
	});
});
