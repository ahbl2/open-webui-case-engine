/**
 * P40-05G / P41-10 — Operational datetime-local ↔ UTC ISO (America/New_York).
 */
import { describe, it, expect } from 'vitest';
import {
	isoToDatetimeLocal,
	datetimeLocalToIso,
	dateToOperationalDatetimeLocalValue
} from './timelineOccurredAtLocal';
import { DEFAULT_OPERATIONAL_TIMEZONE } from './operationalOccurredAt';

describe('timelineOccurredAtLocal (P40-05G / P41-10)', () => {
	it('maps Zulu instant to Eastern summer wall clock and round-trips', () => {
		const iso = '2024-06-15T18:30:45.000Z';
		const local = isoToDatetimeLocal(iso, DEFAULT_OPERATIONAL_TIMEZONE);
		expect(local).toBe('2024-06-15T14:30:45');
		const back = datetimeLocalToIso(local, DEFAULT_OPERATIONAL_TIMEZONE);
		expect(back).toMatch(/Z$/);
		expect(new Date(back).getTime()).toBe(new Date(iso).getTime());
	});

	it('round-trips noon UTC edge (winter EST display)', () => {
		const iso = '2024-01-01T12:00:00.000Z';
		const back = datetimeLocalToIso(isoToDatetimeLocal(iso, DEFAULT_OPERATIONAL_TIMEZONE), DEFAULT_OPERATIONAL_TIMEZONE);
		expect(new Date(back).getTime()).toBe(new Date(iso).getTime());
	});

	it('datetimeLocalToIso accepts minute-only local strings', () => {
		const local = '2024-07-04T09:05';
		const iso = datetimeLocalToIso(local, DEFAULT_OPERATIONAL_TIMEZONE);
		expect(iso).toBe('2024-07-04T13:05:00.000Z');
		const backLocal = isoToDatetimeLocal(iso, DEFAULT_OPERATIONAL_TIMEZONE);
		expect(datetimeLocalToIso(backLocal, DEFAULT_OPERATIONAL_TIMEZONE)).toBe(iso);
	});

	it('dateToOperationalDatetimeLocalValue returns empty for invalid Date', () => {
		expect(dateToOperationalDatetimeLocalValue(new Date('bad'))).toBe('');
	});
});
