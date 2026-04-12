/**
 * P97-02 — Timeline synthesis navigation intent resolution (read-only).
 */
import { describe, it, expect } from 'vitest';
import { pickTimelineAuthoritativeTargetId } from './timelineSynthesisNavigation';
import type { SynthesisSourceNavigationIntent } from './caseSynthesisSourceNavigation';

function timelineIntent(overrides: Partial<SynthesisSourceNavigationIntent> = {}): SynthesisSourceNavigationIntent {
	return {
		v: 1,
		case_id: 'case-a',
		authority: 'authoritative',
		source_kind: 'timeline_entry',
		source_record_id: 'ent-1',
		destination_surface: 'timeline',
		...overrides
	};
}

describe('pickTimelineAuthoritativeTargetId (P97-02)', () => {
	it('returns source_record_id for valid authoritative Timeline intent matching case', () => {
		expect(pickTimelineAuthoritativeTargetId(timelineIntent(), 'case-a')).toBe('ent-1');
	});

	it('returns null when case id mismatches (no cross-case)', () => {
		expect(pickTimelineAuthoritativeTargetId(timelineIntent(), 'other-case')).toBeNull();
	});

	it('returns null for non-timeline destination (Tasks/Files ignored here)', () => {
		expect(
			pickTimelineAuthoritativeTargetId(
				timelineIntent({ destination_surface: 'tasks', source_record_id: 't1' }),
				'case-a'
			)
		).toBeNull();
		expect(
			pickTimelineAuthoritativeTargetId(
				timelineIntent({ destination_surface: 'files', source_record_id: 'f1' }),
				'case-a'
			)
		).toBeNull();
	});

	it('returns null for supporting authority or non-timeline_entry kind', () => {
		expect(
			pickTimelineAuthoritativeTargetId(
				timelineIntent({ authority: 'supporting', source_kind: 'task' }),
				'case-a'
			)
		).toBeNull();
	});

	it('returns null for garbage input', () => {
		expect(pickTimelineAuthoritativeTargetId(null, 'case-a')).toBeNull();
		expect(pickTimelineAuthoritativeTargetId({}, 'case-a')).toBeNull();
	});
});
