import { describe, expect, it } from 'vitest';
import type { CaseActivityEvent } from '$lib/apis/caseEngine/caseP129ActivityEventsApi';
import { buildP129ActivityChromeRollup, P129_ACTIVITY_CHROME_ROLLUP_LABELS } from './p129ActivityChromeRollup';

function ev(partial: Partial<CaseActivityEvent>): CaseActivityEvent {
	return {
		event_id: 'e1',
		event_type: 'timeline_entry_created',
		case_id: 'c1',
		occurred_at: '2026-01-01T12:00:00.000Z',
		recorded_at: '2026-01-01T12:00:00.000Z',
		actor_user_id: 'u1',
		target_type: 'timeline_entry',
		target_id: 't1',
		...partial
	};
}

describe('buildP129ActivityChromeRollup', () => {
	it('includes Notes and Subjects & Assets with zero when no matching events', () => {
		const rows = buildP129ActivityChromeRollup([ev({}), ev({ event_id: 'e2' })]);
		const labels = rows.map((r) => r.label);
		expect(labels).toContain('Notes');
		expect(labels).toContain('Subjects & Assets');
		expect(rows.find((r) => r.label === 'Notes')?.count).toBe(0);
		expect(rows.find((r) => r.label === 'Subjects & Assets')?.count).toBe(0);
		expect(rows.find((r) => r.label === 'Timeline')?.count).toBe(2);
	});

	it('maps file and proposal events into Files and Proposals counts', () => {
		const rows = buildP129ActivityChromeRollup([
			ev({
				event_id: 'f1',
				event_type: 'file_uploaded',
				target_type: 'case_file',
				target_id: 'cf1'
			}),
			ev({
				event_id: 'p1',
				event_type: 'proposal_created',
				target_type: 'proposal',
				target_id: 'pr1'
			})
		]);
		expect(rows.find((r) => r.label === 'Files')?.count).toBe(1);
		expect(rows.find((r) => r.label === 'Proposals')?.count).toBe(1);
		expect(rows.find((r) => r.label === 'Other')).toBeUndefined();
	});

	it('appends Other when domain is not in the fixed chrome list', () => {
		const rows = buildP129ActivityChromeRollup([
			ev({
				event_id: 'o1',
				event_type: 'unknown_future_type' as CaseActivityEvent['event_type'],
				target_type: 'bogus_target' as CaseActivityEvent['target_type'],
				target_id: 'x'
			})
		]);
		const other = rows.find((r) => r.label === 'Other');
		expect(other?.count).toBe(1);
	});

	it('exposes a stable label order for the base set', () => {
		expect(P129_ACTIVITY_CHROME_ROLLUP_LABELS[0]).toBe('Timeline');
		expect(P129_ACTIVITY_CHROME_ROLLUP_LABELS).toContain('Notes');
		expect(P129_ACTIVITY_CHROME_ROLLUP_LABELS).toContain('Subjects & Assets');
	});
});
