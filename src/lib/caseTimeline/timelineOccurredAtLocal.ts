/**
 * P40-05G / P41-10 — Canonical occurred_at operational edit ↔ UTC ISO transport.
 *
 * **Storage / API (Case Engine):** `occurred_at` is always full ISO 8601 with explicit
 * timezone (normalized to UTC `...Z` on write per `validateAndNormalizeOccurredAt`).
 *
 * **Operator UI:** `<input type="datetime-local">` values are *civil time in the
 * operational IANA zone* (default **America/New_York**), not the browser's local zone.
 * This matches investigator-facing timeline cards and proposal review (P41-10).
 *
 * - **Display / edit:** UTC instant → operational YYYY-MM-DDTHH:mm:ss for the input.
 * - **Save:** operational local string → UTC `toISOString()` for the API.
 */

import {
	DEFAULT_OPERATIONAL_TIMEZONE,
	utcMsToOperationalDatetimeLocalValue,
	operationalWallClockToUtcMs
} from './operationalOccurredAt';

/**
 * Format a Date's wall-clock fields in the operational timezone for datetime-local (seconds precision).
 */
export function dateToOperationalDatetimeLocalValue(
	d: Date,
	timeZone: string = DEFAULT_OPERATIONAL_TIMEZONE
): string {
	if (isNaN(d.getTime())) return '';
	return utcMsToOperationalDatetimeLocalValue(d.getTime(), timeZone);
}

/** @deprecated Use dateToOperationalDatetimeLocalValue (P41-10). */
export const dateToDatetimeLocalValue = dateToOperationalDatetimeLocalValue;

/**
 * Convert API `occurred_at` (ISO with Z or offset) to a value suitable for
 * `<input type="datetime-local">` in the operational timezone.
 */
export function isoToDatetimeLocal(iso: string, timeZone: string = DEFAULT_OPERATIONAL_TIMEZONE): string {
	const trimmed = String(iso ?? '').trim();
	if (!trimmed) return '';
	const d = new Date(trimmed);
	if (!isNaN(d.getTime())) {
		return utcMsToOperationalDatetimeLocalValue(d.getTime(), timeZone);
	}
	/** Legacy fallback: malformed strings — best-effort slice (no TZ conversion). */
	const match = trimmed.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?)/);
	if (!match) return trimmed.slice(0, 19).replace(' ', 'T');
	const base = match[1];
	return base.length === 16 ? `${base}:00` : base.slice(0, 19);
}

/**
 * Convert datetime-local string (operational civil time, no Z) to UTC ISO for the Case Engine API.
 * Accepts `YYYY-MM-DDTHH:mm` or `YYYY-MM-DDTHH:mm:ss`.
 */
export function datetimeLocalToIso(local: string, timeZone: string = DEFAULT_OPERATIONAL_TIMEZONE): string {
	const clean = String(local ?? '').trim();
	if (!clean) return '';
	/** Already ISO with zone — pass through */
	if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(clean) && /Z|[+-]\d{2}:\d{2}$/.test(clean)) {
		return clean;
	}
	const normalized = clean.length === 16 ? `${clean}:00` : clean;
	const m = normalized.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})$/);
	if (!m) return '';
	const y = parseInt(m[1], 10);
	const mo = parseInt(m[2], 10);
	const d = parseInt(m[3], 10);
	const h = parseInt(m[4], 10);
	const mi = parseInt(m[5], 10);
	const s = parseInt(m[6], 10);
	try {
		const ms = operationalWallClockToUtcMs(y, mo, d, h, mi, s, timeZone);
		return new Date(ms).toISOString();
	} catch {
		return '';
	}
}
