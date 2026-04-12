/**
 * P97-03 — Supporting surface intent resolution (Tasks / Files).
 */
import { describe, it, expect } from 'vitest';
import { pickSupportingFilesTargetId, pickSupportingTaskTargetId } from './supportingSynthesisNavigation';
import type { SynthesisSourceNavigationIntent } from './caseSynthesisSourceNavigation';

function base(overrides: Partial<SynthesisSourceNavigationIntent>): SynthesisSourceNavigationIntent {
	return {
		v: 1,
		case_id: 'c1',
		authority: 'supporting',
		source_kind: 'task',
		source_record_id: 'x',
		destination_surface: 'tasks',
		...overrides
	};
}

describe('pickSupportingTaskTargetId (P97-03)', () => {
	it('returns task id for tasks surface + supporting + task kind', () => {
		expect(pickSupportingTaskTargetId(base({ source_record_id: 't1' }), 'c1')).toBe('t1');
	});

	it('returns null for Timeline authoritative intents', () => {
		expect(
			pickSupportingTaskTargetId(
				{
					v: 1,
					case_id: 'c1',
					authority: 'authoritative',
					source_kind: 'timeline_entry',
					source_record_id: 'e1',
					destination_surface: 'timeline'
				},
				'c1'
			)
		).toBeNull();
	});

	it('returns null for Files destination', () => {
		expect(
			pickSupportingTaskTargetId(
				base({ destination_surface: 'files', source_kind: 'case_file', source_record_id: 'f1' }),
				'c1'
			)
		).toBeNull();
	});

	it('returns null on case mismatch', () => {
		expect(pickSupportingTaskTargetId(base({ source_record_id: 't1' }), 'other')).toBeNull();
	});
});

describe('pickSupportingFilesTargetId (P97-03)', () => {
	it('accepts case_file and extracted_text kinds', () => {
		expect(
			pickSupportingFilesTargetId(
				base({
					destination_surface: 'files',
					source_kind: 'case_file',
					source_record_id: 'f1'
				}),
				'c1'
			)
		).toBe('f1');
		expect(
			pickSupportingFilesTargetId(
				base({
					destination_surface: 'files',
					source_kind: 'extracted_text',
					source_record_id: 'f1'
				}),
				'c1'
			)
		).toBe('f1');
	});

	it('returns null for task destination', () => {
		expect(pickSupportingFilesTargetId(base({ destination_surface: 'tasks', source_record_id: 't1' }), 'c1')).toBeNull();
	});

	it('returns null for authoritative intents', () => {
		expect(
			pickSupportingFilesTargetId(
				{
					v: 1,
					case_id: 'c1',
					authority: 'authoritative',
					source_kind: 'timeline_entry',
					source_record_id: 'e1',
					destination_surface: 'timeline'
				},
				'c1'
			)
		).toBeNull();
	});
});
