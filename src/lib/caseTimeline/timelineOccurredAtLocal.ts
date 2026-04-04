/**
 * P40-05G — Canonical occurred_at local edit ↔ UTC ISO transport.
 *
 * **Storage / API (Case Engine):** `occurred_at` is always full ISO 8601 with explicit
 * timezone (normalized to UTC `...Z` on write per `validateAndNormalizeOccurredAt`).
 *
 * **Operator UI:** `<input type="datetime-local">` values are *local civil time* with no
 * zone suffix. We convert:
 * - **Display / edit:** UTC instant → local YYYY-MM-DDTHH:mm:ss for the input.
 * - **Save:** local string → `Date` (interpreted in the browser's local zone) → `toISOString()`.
 *
 * This matches `formatCaseDateTime` / `formatCaseDateTimeWithSeconds`, which use `new Date(iso)`
 * and render local clock fields — edit controls now show the same instant the list cards show.
 */

function pad2(n: number): string {
	return String(n).padStart(2, '0');
}

/**
 * Format a Date's *local* calendar/clock fields for datetime-local (seconds precision).
 */
export function dateToDatetimeLocalValue(d: Date): string {
	if (isNaN(d.getTime())) return '';
	const y = d.getFullYear();
	const mo = pad2(d.getMonth() + 1);
	const da = pad2(d.getDate());
	const h = pad2(d.getHours());
	const mi = pad2(d.getMinutes());
	const s = pad2(d.getSeconds());
	return `${y}-${mo}-${da}T${h}:${mi}:${s}`;
}

/**
 * Convert API `occurred_at` (ISO with Z or offset) to a value suitable for
 * `<input type="datetime-local">` in the operator's local timezone.
 */
export function isoToDatetimeLocal(iso: string): string {
	const trimmed = String(iso ?? '').trim();
	if (!trimmed) return '';
	const d = new Date(trimmed);
	if (!isNaN(d.getTime())) {
		return dateToDatetimeLocalValue(d);
	}
	/** Legacy fallback: malformed strings — best-effort slice (no TZ conversion). */
	const match = trimmed.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?)/);
	if (!match) return trimmed.slice(0, 19).replace(' ', 'T');
	const base = match[1];
	return base.length === 16 ? `${base}:00` : base.slice(0, 19);
}

/**
 * Convert datetime-local string (local civil time, no Z) to UTC ISO for the Case Engine API.
 * Accepts `YYYY-MM-DDTHH:mm` or `YYYY-MM-DDTHH:mm:ss`.
 */
export function datetimeLocalToIso(local: string): string {
	const clean = String(local ?? '').trim();
	if (!clean) return '';
	/** `new Date('YYYY-MM-DDTHH:mm')` is interpreted as local time in modern browsers. */
	const normalized = clean.length === 16 ? `${clean}:00` : clean;
	const d = new Date(normalized);
	if (isNaN(d.getTime())) {
		/** Legacy: already looks like ISO with Z — pass through */
		if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(clean) && /Z|[+-]\d{2}:\d{2}$/.test(clean)) {
			return clean;
		}
		return '';
	}
	return d.toISOString();
}
