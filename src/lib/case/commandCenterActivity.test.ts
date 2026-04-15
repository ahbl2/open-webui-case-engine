/**
 * P131-03 — Mapping + sort only; values preserved verbatim.
 */
import { describe, expect, it } from 'vitest';
import type { CaseActivityEvent, CaseEngineCase } from '$lib/apis/caseEngine';
import {
	mapActivityEventToRow,
	sortCommandCenterActivityRowsByOccurredDesc,
	type CommandCenterActivityRow
} from './commandCenterActivity';

function ev(partial: Partial<CaseActivityEvent> & Pick<CaseActivityEvent, 'event_id'>): CaseActivityEvent {
	return {
		event_type: 'timeline_entry_created',
		case_id: 'c1',
		occurred_at: '2026-01-02T00:00:00.000Z',
		recorded_at: '2026-01-02T00:00:00.000Z',
		actor_user_id: 'u1',
		target_type: 'timeline_entry',
		target_id: 't1',
		...partial
	} as CaseActivityEvent;
}

describe('commandCenterActivity', () => {
	it('mapActivityEventToRow preserves event_type and actor_user_id; case_identifier uses case_number', () => {
		const c: CaseEngineCase = {
			id: 'c1',
			case_number: 'CID-99',
			title: 'T',
			unit: 'CID',
			status: 'OPEN'
		} as CaseEngineCase;
		const m = new Map<string, CaseEngineCase>([['c1', c]]);
		const row = mapActivityEventToRow(ev({ event_id: 'e1', event_type: 'proposal_created' }), m);
		expect(row.event_type).toBe('proposal_created');
		expect(row.actor_user_id).toBe('u1');
		expect(row.case_identifier).toBe('CID-99');
		expect(row.occurred_at).toBe('2026-01-02T00:00:00.000Z');
		expect(Object.keys(row).sort()).toEqual(
			['actor_user_id', 'case_id', 'case_identifier', 'event_id', 'event_type', 'occurred_at'].sort()
		);
	});

	it('mapActivityEventToRow falls back to case_id when case_number missing', () => {
		const m = new Map<string, CaseEngineCase>();
		const row = mapActivityEventToRow(ev({ event_id: 'e2', case_id: 'cid-raw' }), m);
		expect(row.case_identifier).toBe('cid-raw');
	});

	it('sortCommandCenterActivityRowsByOccurredDesc orders by occurred_at descending', () => {
		const a: CommandCenterActivityRow = {
			event_id: 'a',
			actor_user_id: 'u',
			event_type: 'x',
			case_id: 'c',
			case_identifier: '1',
			occurred_at: '2026-01-01T00:00:00.000Z'
		};
		const b: CommandCenterActivityRow = {
			event_id: 'b',
			actor_user_id: 'u',
			event_type: 'x',
			case_id: 'c',
			case_identifier: '1',
			occurred_at: '2026-01-03T00:00:00.000Z'
		};
		const out = sortCommandCenterActivityRowsByOccurredDesc([a, b]);
		expect(out[0].event_id).toBe('b');
		expect(out[1].event_id).toBe('a');
	});
});
