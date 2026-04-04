/**
 * P41-10 — Operational America/New_York display and edit helpers (independent of process TZ).
 */
import { describe, expect, it } from 'vitest';
import {
	formatIsoInOperationalTimezone,
	operationalWallClockToUtcMs,
	utcMsToOperationalDatetimeLocalValue,
	DEFAULT_OPERATIONAL_TIMEZONE
} from './operationalOccurredAt';
import { datetimeLocalToIso, isoToDatetimeLocal } from './timelineOccurredAtLocal';

describe('operationalOccurredAt (P41-10)', () => {
	it('formats UTC instant as 09:14 Eastern on summer date (EDT)', () => {
		const iso = '2024-06-15T13:14:00.000Z';
		expect(formatIsoInOperationalTimezone(iso, { seconds: true })).toBe('2024-06-15 09:14:00');
	});

	it('formats explicit negative offset without double-shifting wall clock', () => {
		const iso = '2024-06-15T09:14:00-04:00';
		expect(formatIsoInOperationalTimezone(iso, { seconds: true })).toBe('2024-06-15 09:14:00');
	});

	it('formats winter EST correctly', () => {
		const iso = '2024-01-15T14:14:00.000Z';
		expect(formatIsoInOperationalTimezone(iso, { seconds: true })).toBe('2024-01-15 09:14:00');
	});

	it('minute precision variant', () => {
		expect(formatIsoInOperationalTimezone('2024-06-15T13:14:00.000Z', { seconds: false })).toBe(
			'2024-06-15 09:14'
		);
	});
});

describe('P41-10 — operational NY vs other zone wall clocks (failure mode)', () => {
	it('same instant is 07:14 in Denver and 09:14 in New York — old browser-local UI used the former', () => {
		const iso = '2024-06-15T13:14:00.000Z';
		expect(formatIsoInOperationalTimezone(iso, { seconds: true, timeZone: 'America/Denver' })).toBe(
			'2024-06-15 07:14:00'
		);
		expect(formatIsoInOperationalTimezone(iso, { seconds: true, timeZone: 'America/New_York' })).toBe(
			'2024-06-15 09:14:00'
		);
	});
});

describe('timelineOccurredAtLocal operational round-trip', () => {
	it('round-trips summer EDT wall clock', () => {
		const iso = '2024-06-15T18:30:45.000Z';
		const local = isoToDatetimeLocal(iso, DEFAULT_OPERATIONAL_TIMEZONE);
		expect(local).toBe('2024-06-15T14:30:45');
		expect(datetimeLocalToIso(local, DEFAULT_OPERATIONAL_TIMEZONE)).toBe('2024-06-15T18:30:45.000Z');
	});

	it('round-trips explicit offset input through display string', () => {
		const iso = '2024-06-15T09:14:00-04:00';
		const local = isoToDatetimeLocal(iso, DEFAULT_OPERATIONAL_TIMEZONE);
		expect(local).toBe('2024-06-15T09:14:00');
		expect(datetimeLocalToIso(local, DEFAULT_OPERATIONAL_TIMEZONE)).toBe('2024-06-15T13:14:00.000Z');
	});

	it('no double conversion: iso → operational local → iso matches single normalization', () => {
		const iso = '2024-06-15T13:14:00.000Z';
		const once = datetimeLocalToIso(isoToDatetimeLocal(iso), DEFAULT_OPERATIONAL_TIMEZONE);
		expect(once).toBe(iso);
	});

	it('operationalWallClockToUtcMs matches datetimeLocalToIso for June boundary', () => {
		const ms = operationalWallClockToUtcMs(2024, 6, 15, 9, 14, 0, DEFAULT_OPERATIONAL_TIMEZONE);
		expect(new Date(ms).toISOString()).toBe('2024-06-15T13:14:00.000Z');
	});

	it('utcMsToOperationalDatetimeLocalValue formats datetime-local fragment', () => {
		const ms = Date.parse('2024-06-15T13:14:00.000Z');
		expect(utcMsToOperationalDatetimeLocalValue(ms, DEFAULT_OPERATIONAL_TIMEZONE)).toBe(
			'2024-06-15T09:14:00'
		);
	});
});
