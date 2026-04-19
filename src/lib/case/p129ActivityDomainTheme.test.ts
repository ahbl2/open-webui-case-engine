import { describe, expect, it } from 'vitest';
import type { CaseActivityEvent } from '$lib/apis/caseEngine/caseP129ActivityEventsApi';
import { p129ActivityDomainTheme } from './p129ActivityDomainTheme';

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

describe('p129ActivityDomainTheme', () => {
	it('maps timeline events to blue', () => {
		const t = p129ActivityDomainTheme(ev({ event_type: 'timeline_entry_created' }));
		expect(t.variant).toBe('blue');
		expect(t.kpiModifierClass).toBe('ds-occ-kpi-card--blue');
		expect(t.domainLabel).toBe('Timeline');
	});

	it('maps proposal events to rose', () => {
		const t = p129ActivityDomainTheme(ev({ event_type: 'proposal_created' }));
		expect(t.variant).toBe('rose');
		expect(t.domainLabel).toBe('Proposals');
	});

	it('falls back to target_type when event_type is unknown', () => {
		const t = p129ActivityDomainTheme({
			...ev({}),
			event_type: 'unknown_future_type' as CaseActivityEvent['event_type'],
			target_type: 'case_file',
			target_id: 'f1'
		});
		expect(t.variant).toBe('green');
		expect(t.domainLabel).toBe('Files');
	});
});
