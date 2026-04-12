/**
 * P99-02 — Presentation helpers: P99-01 only, surface matching.
 */
import { describe, it, expect } from 'vitest';
import type { SynthesisSourceNavigationIntent } from '$lib/case/caseSynthesisSourceNavigation';
import { ARRIVAL_UI_COPY } from './p99ArrivalContextReadModel';
import {
	arrivalContextFromNoteQueryParam,
	arrivalContextFromPageState,
	arrivalContextFromSynthesisPageState,
	nextP99ArrivalSnapshot
} from './p99ArrivalContextPresentation';

const intent = (partial: {
	destination_surface: 'timeline' | 'tasks' | 'files';
	source_kind: 'timeline_entry' | 'task' | 'case_file' | 'extracted_text';
	source_record_id: string;
	case_id?: string;
}): SynthesisSourceNavigationIntent =>
	({
		v: 1 as const,
		case_id: partial.case_id ?? 'c1',
		authority: 'supporting' as const,
		...partial
	}) as SynthesisSourceNavigationIntent;

describe('p99ArrivalContextPresentation', () => {
	it('arrivalContextFromSynthesisPageState returns null when surface mismatches', () => {
		const i = intent({
			destination_surface: 'tasks',
			source_kind: 'task',
			source_record_id: 't1'
		});
		expect(arrivalContextFromSynthesisPageState(i, 'c1', 'timeline')).toBeNull();
	});

	it('arrivalContextFromSynthesisPageState returns valid context when surface matches', () => {
		const i = intent({
			destination_surface: 'timeline',
			source_kind: 'timeline_entry',
			source_record_id: 'e1',
			case_id: 'c1'
		});
		const a = arrivalContextFromSynthesisPageState(i, 'c1', 'timeline');
		expect(a?.arrived_via).toBe('synthesis_drilldown');
		expect(a?.target_id).toBe('e1');
	});

	it('nextP99ArrivalSnapshot preserves previous when intent cleared from state', () => {
		const i = intent({
			destination_surface: 'files',
			source_kind: 'case_file',
			source_record_id: 'f1',
			case_id: 'c1'
		});
		const first = nextP99ArrivalSnapshot({ synthesisSourceNavigationIntent: i }, 'c1', 'files', null);
		expect(first).not.toBeNull();
		const afterClear = nextP99ArrivalSnapshot({}, 'c1', 'files', first);
		expect(afterClear).toBe(first);
	});

	it('arrivalContextFromNoteQueryParam builds direct_link from query only', () => {
		const a = arrivalContextFromNoteQueryParam('c1', 'n9');
		expect(a?.arrived_via).toBe('direct_link');
		expect(a?.target_kind).toBe('notebook_note');
		expect(a?.heading).toBe(ARRIVAL_UI_COPY.openedFromRelatedRecord);
		expect(arrivalContextFromNoteQueryParam('c1', null)).toBeNull();
		expect(arrivalContextFromNoteQueryParam('c1', '   ')).toBeNull();
	});

	it('arrivalContextFromSynthesisPageState returns null when case_id does not match (cross-case)', () => {
		const i = intent({
			destination_surface: 'timeline',
			source_kind: 'timeline_entry',
			source_record_id: 'e1',
			case_id: 'other-case'
		});
		expect(arrivalContextFromSynthesisPageState(i, 'c1', 'timeline')).toBeNull();
	});

	it('arrivalContextFromPageState builds declared_relationship when intent + origin (returnable)', () => {
		const i = intent({
			destination_surface: 'tasks',
			source_kind: 'task',
			source_record_id: 't2',
			case_id: 'c1'
		});
		const a = arrivalContextFromPageState(
			{
				synthesisSourceNavigationIntent: i,
				p98DeclaredRelationshipOrigin: { kind: 'timeline_entry', id: 'e9' }
			},
			'c1',
			'tasks'
		);
		expect(a?.arrived_via).toBe('declared_relationship');
		expect(a?.is_returnable).toBe(true);
		expect(a?.source_kind).toBe('timeline_entry');
		expect(a?.source_id).toBe('e9');
	});

	it('arrivalContextFromPageState ignores origin without intent', () => {
		expect(
			arrivalContextFromPageState(
				{ p98DeclaredRelationshipOrigin: { kind: 'case_task', id: 't1' } },
				'c1',
				'tasks'
			)
		).toBeNull();
	});

	it('arrivalContextFromPageState returns null when destination_surface mismatches', () => {
		const i = intent({
			destination_surface: 'tasks',
			source_kind: 'task',
			source_record_id: 't2',
			case_id: 'c1'
		});
		expect(
			arrivalContextFromPageState(
				{
					synthesisSourceNavigationIntent: i,
					p98DeclaredRelationshipOrigin: { kind: 'timeline_entry', id: 'e9' }
				},
				'c1',
				'files'
			)
		).toBeNull();
	});

	it('nextP99ArrivalSnapshot preserves declared snapshot after state clear', () => {
		const i = intent({
			destination_surface: 'tasks',
			source_kind: 'task',
			source_record_id: 't2',
			case_id: 'c1'
		});
		const first = nextP99ArrivalSnapshot(
			{
				synthesisSourceNavigationIntent: i,
				p98DeclaredRelationshipOrigin: { kind: 'timeline_entry', id: 'e9' }
			},
			'c1',
			'tasks',
			null
		);
		expect(first?.is_returnable).toBe(true);
		const afterClear = nextP99ArrivalSnapshot({}, 'c1', 'tasks', first);
		expect(afterClear).toBe(first);
	});
});
