/**
 * P40-05G — Local datetime-local ↔ UTC ISO (same semantics as Timeline edit + proposal review).
 */
import { describe, it, expect } from 'vitest';
import { isoToDatetimeLocal, datetimeLocalToIso, dateToDatetimeLocalValue } from './timelineOccurredAtLocal';

describe('timelineOccurredAtLocal (P40-05G)', () => {
	it('round-trips a Zulu instant: local edit value converts back to same UTC ms', () => {
		const iso = '2024-06-15T18:30:45.000Z';
		const local = isoToDatetimeLocal(iso);
		expect(local).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/);
		const back = datetimeLocalToIso(local);
		expect(back).toMatch(/Z$/);
		expect(new Date(back).getTime()).toBe(new Date(iso).getTime());
	});

	it('round-trips noon UTC edge', () => {
		const iso = '2024-01-01T12:00:00.000Z';
		const back = datetimeLocalToIso(isoToDatetimeLocal(iso));
		expect(new Date(back).getTime()).toBe(new Date(iso).getTime());
	});

	it('datetimeLocalToIso accepts minute-only local strings', () => {
		const local = '2024-07-04T09:05';
		const iso = datetimeLocalToIso(local);
		expect(iso).toMatch(/Z$/);
		const backLocal = isoToDatetimeLocal(iso);
		expect(new Date(datetimeLocalToIso(backLocal)).getTime()).toBe(new Date(iso).getTime());
	});

	it('dateToDatetimeLocalValue returns empty for invalid Date', () => {
		expect(dateToDatetimeLocalValue(new Date('bad'))).toBe('');
	});
});
