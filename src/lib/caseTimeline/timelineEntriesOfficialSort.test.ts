/**
 * P41-44-FU2 — Official timeline ordering: occurred_at ASC, id ASC.
 */
import { describe, it, expect } from 'vitest';
import {
	compareTimelineEntriesOfficialOrder,
	sortTimelineEntriesOfficialOrder
} from './timelineEntriesOfficialSort';

describe('compareTimelineEntriesOfficialOrder (P41-44-FU2)', () => {
	it('orders by occurred_at ascending', () => {
		const a = { id: 'z', occurred_at: '2025-06-02T12:00:00.000Z' };
		const b = { id: 'a', occurred_at: '2025-06-01T12:00:00.000Z' };
		expect(compareTimelineEntriesOfficialOrder(a, b)).toBeGreaterThan(0);
		expect(compareTimelineEntriesOfficialOrder(b, a)).toBeLessThan(0);
	});

	it('uses id ASC when occurred_at is identical', () => {
		const t = '2025-01-01T00:00:00.000Z';
		const first = { id: 'aaa-111', occurred_at: t };
		const second = { id: 'bbb-222', occurred_at: t };
		expect(compareTimelineEntriesOfficialOrder(first, second)).toBeLessThan(0);
		expect(compareTimelineEntriesOfficialOrder(second, first)).toBeGreaterThan(0);
	});

	it('treats null/empty occurred_at as last (after finite instants)', () => {
		const withTime = { id: 'a', occurred_at: '2025-01-01T00:00:00.000Z' };
		const nullAt = { id: 'b', occurred_at: null };
		const emptyAt = { id: 'c', occurred_at: '' };
		expect(compareTimelineEntriesOfficialOrder(withTime, nullAt)).toBeLessThan(0);
		expect(compareTimelineEntriesOfficialOrder(nullAt, withTime)).toBeGreaterThan(0);
		expect(compareTimelineEntriesOfficialOrder(withTime, emptyAt)).toBeLessThan(0);
	});

	it('invalid ISO parses as last bucket; ids still order within bucket', () => {
		const bad = { id: 'm', occurred_at: 'not-a-date' };
		const good = { id: 'n', occurred_at: '2020-01-01T00:00:00.000Z' };
		expect(compareTimelineEntriesOfficialOrder(good, bad)).toBeLessThan(0);
	});
});

describe('sortTimelineEntriesOfficialOrder (P41-44-FU2)', () => {
	it('returns new array and does not mutate input', () => {
		const input = [
			{ id: 'c', occurred_at: '2025-03-03T00:00:00.000Z' },
			{ id: 'a', occurred_at: '2025-01-01T00:00:00.000Z' },
			{ id: 'b', occurred_at: '2025-02-02T00:00:00.000Z' }
		];
		const out = sortTimelineEntriesOfficialOrder(input);
		expect(out.map((e) => e.id)).toEqual(['a', 'b', 'c']);
		expect(input[0].id).toBe('c');
	});

	it('simulates edit moving one row: entry jumps to correct index', () => {
		const rows = [
			{ id: 'e1', occurred_at: '2025-01-01T10:00:00.000Z', text: 'early' },
			{ id: 'e2', occurred_at: '2025-06-01T12:00:00.000Z', text: 'mid' },
			{ id: 'e3', occurred_at: '2025-12-01T08:00:00.000Z', text: 'late' }
		];
		const edited = rows.map((r) =>
			r.id === 'e3' ? { ...r, occurred_at: '2025-01-01T08:00:00.000Z' } : r
		);
		const sorted = sortTimelineEntriesOfficialOrder(edited);
		expect(sorted.map((r) => r.id)).toEqual(['e3', 'e1', 'e2']);
	});

	it('unchanged occurred_at keeps relative id order among same timestamp', () => {
		const t = '2025-01-01T00:00:00.000Z';
		const rows = [
			{ id: 'x1', occurred_at: t },
			{ id: 'x2', occurred_at: t }
		];
		const updated = rows.map((r) => (r.id === 'x1' ? { ...r, text: 'edited' } : r));
		const sorted = sortTimelineEntriesOfficialOrder(updated);
		expect(sorted.map((r) => r.id)).toEqual(['x1', 'x2']);
	});
});
