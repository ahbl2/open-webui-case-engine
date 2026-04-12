/**
 * P99-01 — Arrival context read-model: determinism, guards, no inference.
 */
import { describe, it, expect } from 'vitest';
import {
	ARRIVAL_UI_COPY,
	ARRIVAL_VIA_VALUES,
	arrivalContextIsUsable,
	buildArrivalContextFromNavigationState,
	containsForbiddenArrivalDisplayTerm,
	filterValidArrivalContext,
	isArrivalVia,
	type ArrivalContext,
	type NavigationArrivalInput
} from './p99ArrivalContextReadModel';

function synthIntent(
	partial: Partial<import('$lib/case/caseSynthesisSourceNavigation').SynthesisSourceNavigationIntent> &
		Pick<
			import('$lib/case/caseSynthesisSourceNavigation').SynthesisSourceNavigationIntent,
			'source_kind' | 'source_record_id' | 'destination_surface'
		>
): import('$lib/case/caseSynthesisSourceNavigation').SynthesisSourceNavigationIntent {
	return {
		v: 1,
		case_id: 'case-a',
		authority: 'authoritative',
		...partial
	} as import('$lib/case/caseSynthesisSourceNavigation').SynthesisSourceNavigationIntent;
}

describe('p99ArrivalContextReadModel (P99-01)', () => {
	it('ARRIVAL_UI_COPY strings pass forbidden-language guard', () => {
		for (const v of Object.values(ARRIVAL_UI_COPY)) {
			expect(containsForbiddenArrivalDisplayTerm(v)).toBe(false);
		}
	});

	it('arrived_via is a closed three-value enum (no casual extensions)', () => {
		expect(ARRIVAL_VIA_VALUES).toEqual([
			'synthesis_drilldown',
			'declared_relationship',
			'direct_link'
		]);
		expect(isArrivalVia('synthesis_drilldown')).toBe(true);
		expect(isArrivalVia('unknown')).toBe(false);
		expect(isArrivalVia('other')).toBe(false);
	});

	it('containsForbiddenArrivalDisplayTerm blocks connective / interpretive phrasing', () => {
		expect(containsForbiddenArrivalDisplayTerm('related to prior event')).toBe(true);
		expect(containsForbiddenArrivalDisplayTerm('connected to the file')).toBe(true);
		expect(containsForbiddenArrivalDisplayTerm('because of the memo')).toBe(true);
		expect(containsForbiddenArrivalDisplayTerm('This led to review')).toBe(true);
		expect(containsForbiddenArrivalDisplayTerm('Opened from Task')).toBe(false);
	});

	it('builds valid arrival context from p97_synthesis_intent + valid intent', () => {
		const intent = synthIntent({
			case_id: 'case-a',
			source_kind: 'timeline_entry',
			source_record_id: 'e1',
			destination_surface: 'timeline'
		});
		const a = buildArrivalContextFromNavigationState({ kind: 'p97_synthesis_intent', intent }, 'case-a');
		expect(a).not.toBeNull();
		expect(a!.is_valid).toBe(true);
		expect(a!.arrived_via).toBe('synthesis_drilldown');
		expect(a!.source_kind).toBeNull();
		expect(a!.target_kind).toBe('timeline_entry');
		expect(a!.target_id).toBe('e1');
		expect(a!.is_returnable).toBe(false);
		expect(arrivalContextIsUsable(a)).toBe(true);
	});

	it('rejects cross-case state (is_valid false; filter drops)', () => {
		const intent = synthIntent({
			case_id: 'other',
			source_kind: 'timeline_entry',
			source_record_id: 'e1',
			destination_surface: 'timeline'
		});
		const a = buildArrivalContextFromNavigationState({ kind: 'p97_synthesis_intent', intent }, 'case-a');
		expect(a!.is_valid).toBe(false);
		expect(filterValidArrivalContext(a)).toBeNull();
		expect(arrivalContextIsUsable(a)).toBe(false);
	});

	it('returns null for malformed synthesis intent', () => {
		const bad = { ...synthIntent({ source_kind: 'timeline_entry', source_record_id: 'e1', destination_surface: 'timeline' }), v: 2 as 1 };
		expect(
			buildArrivalContextFromNavigationState({ kind: 'p97_synthesis_intent', intent: bad }, 'case-a')
		).toBeNull();
		expect(
			buildArrivalContextFromNavigationState(
				{ kind: 'p97_synthesis_intent', intent: synthIntent({ source_kind: 'timeline_entry', source_record_id: '', destination_surface: 'timeline' }) },
				'case-a'
			)
		).toBeNull();
	});

	it('is deterministic (same input → same output)', () => {
		const intent = synthIntent({
			case_id: 'case-a',
			source_kind: 'task',
			source_record_id: 't1',
			destination_surface: 'tasks'
		});
		const input: NavigationArrivalInput = { kind: 'p97_synthesis_intent', intent };
		const a = buildArrivalContextFromNavigationState(input, 'case-a');
		const b = buildArrivalContextFromNavigationState(input, 'case-a');
		expect(a).toEqual(b);
	});

	it('p98_declared sets origin, arrived_via, and is_returnable when valid', () => {
		const intent = synthIntent({
			case_id: 'case-a',
			source_kind: 'task',
			source_record_id: 't2',
			destination_surface: 'tasks',
			authority: 'supporting'
		});
		const a = buildArrivalContextFromNavigationState(
			{
				kind: 'p98_declared',
				intent,
				origin: { kind: 'timeline_entry', id: 'e9' }
			},
			'case-a'
		);
		expect(a!.arrived_via).toBe('declared_relationship');
		expect(a!.source_kind).toBe('timeline_entry');
		expect(a!.source_id).toBe('e9');
		expect(a!.is_returnable).toBe(true);
		expect(a!.heading).toBe(ARRIVAL_UI_COPY.openedFromTimelineEntry);
	});

	it('maps extracted_text intent target_kind to case_file', () => {
		const intent = synthIntent({
			case_id: 'case-a',
			source_kind: 'extracted_text',
			source_record_id: 'f1',
			destination_surface: 'files',
			authority: 'supporting'
		});
		const a = buildArrivalContextFromNavigationState({ kind: 'p97_synthesis_intent', intent }, 'case-a');
		expect(a!.target_kind).toBe('case_file');
	});

	it('p98_note_goto does not use synthesis intent (direct_link, notebook target)', () => {
		const a = buildArrivalContextFromNavigationState(
			{ kind: 'p98_note_goto', caseId: 'case-a', noteId: 'n1' },
			'case-a'
		);
		expect(a!.arrived_via).toBe('direct_link');
		expect(a!.target_kind).toBe('notebook_note');
		expect(a!.is_returnable).toBe(false);
		const keys = Object.keys(a as ArrivalContext);
		expect(keys.some((k) => k.includes('synthesis'))).toBe(false);
	});

	it('does not fabricate source_echo; drops echo with forbidden terms', () => {
		const intent = synthIntent({
			case_id: 'case-a',
			source_kind: 'timeline_entry',
			source_record_id: 'e1',
			destination_surface: 'timeline'
		});
		const clean = buildArrivalContextFromNavigationState(
			{
				kind: 'p97_synthesis_intent',
				intent,
				source_echo: ['Witness statement excerpt.']
			},
			'case-a'
		);
		expect(clean!.source_echo).toEqual(['Witness statement excerpt.']);

		const badEcho = buildArrivalContextFromNavigationState(
			{
				kind: 'p97_synthesis_intent',
				intent,
				source_echo: ['This led to review']
			},
			'case-a'
		);
		expect(badEcho!.source_echo).toBeNull();
	});

	it('rejects empty currentCaseId', () => {
		const intent = synthIntent({
			case_id: 'case-a',
			source_kind: 'timeline_entry',
			source_record_id: 'e1',
			destination_surface: 'timeline'
		});
		expect(buildArrivalContextFromNavigationState({ kind: 'p97_synthesis_intent', intent }, '   ')).toBeNull();
	});

	it('p98_note_goto rejects case mismatch', () => {
		const a = buildArrivalContextFromNavigationState(
			{ kind: 'p98_note_goto', caseId: 'case-b', noteId: 'n1' },
			'case-a'
		);
		expect(a!.is_valid).toBe(false);
	});

	it('p98_note_goto returns null when note id is empty', () => {
		expect(
			buildArrivalContextFromNavigationState({ kind: 'p98_note_goto', caseId: 'case-a', noteId: '  ' }, 'case-a')
		).toBeNull();
	});
});
