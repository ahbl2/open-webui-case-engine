import { describe, expect, it } from 'vitest';
import type { CaseActivityEvent } from '$lib/apis/caseEngine/caseP129ActivityEventsApi';
import {
	p129ActivityDistinctActorOptions,
	p129ActivityEventMatchesClientFilter
} from './p129ActivityFeedFilter';

function ev(partial: Partial<CaseActivityEvent>): CaseActivityEvent {
	return {
		event_id: 'e1',
		event_type: 'timeline_entry_created',
		case_id: 'c1',
		occurred_at: '2026-01-15T12:00:00.000Z',
		recorded_at: '2026-01-15T12:00:00.000Z',
		actor_user_id: 'actor-xyz',
		target_type: 'timeline_entry',
		target_id: 't1',
		...partial
	};
}

const allFilters = {
	searchRaw: '',
	domainFilter: 'all' as const,
	actorFilter: 'all' as const,
	dateFrom: '',
	dateTo: ''
};

describe('p129ActivityEventMatchesClientFilter', () => {
	it('filters by domain label', () => {
		const e = ev({});
		expect(
			p129ActivityEventMatchesClientFilter(e, { ...allFilters, domainFilter: 'Timeline' })
		).toBe(true);
		expect(
			p129ActivityEventMatchesClientFilter(e, { ...allFilters, domainFilter: 'Proposals' })
		).toBe(false);
	});

	it('filters by actor user id', () => {
		const e = ev({ actor_user_id: 'u-1' });
		expect(
			p129ActivityEventMatchesClientFilter(e, { ...allFilters, actorFilter: 'u-1' })
		).toBe(true);
		expect(
			p129ActivityEventMatchesClientFilter(e, { ...allFilters, actorFilter: 'u-2' })
		).toBe(false);
	});

	it('filters by occurred date range', () => {
		const e = ev({ occurred_at: '2026-01-15T18:00:00.000Z' });
		expect(
			p129ActivityEventMatchesClientFilter(e, {
				...allFilters,
				dateFrom: '2099-01-01',
				dateTo: '2099-12-31'
			})
		).toBe(false);
		expect(
			p129ActivityEventMatchesClientFilter(e, {
				...allFilters,
				dateFrom: '2020-01-01',
				dateTo: '2030-12-31'
			})
		).toBe(true);
	});

	it('matches search on actor id', () => {
		const e = ev({ actor_user_id: 'unique-actor-id' });
		expect(
			p129ActivityEventMatchesClientFilter(e, { ...allFilters, searchRaw: 'unique-actor' })
		).toBe(true);
		expect(
			p129ActivityEventMatchesClientFilter(e, { ...allFilters, searchRaw: 'nomatch' })
		).toBe(false);
	});
});

describe('p129ActivityDistinctActorOptions', () => {
	it('dedupes actors and sorts labels', () => {
		const list = [
			ev({ event_id: 'a', actor_user_id: 'z-id' }),
			ev({ event_id: 'b', actor_user_id: 'a-id' }),
			ev({ event_id: 'c', actor_user_id: 'a-id' })
		];
		const opts = p129ActivityDistinctActorOptions(list);
		expect(opts).toHaveLength(2);
		const labels = opts.map((o) => o.displayLabel);
		expect([...labels].sort()).toEqual(labels);
	});
});
