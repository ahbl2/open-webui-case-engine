/**
 * P41-10 — Operational IANA timezone for investigator-facing `occurred_at` display and edit.
 *
 * Matches Case Engine default `CASE_ENGINE_OPERATIONAL_TIMEZONE` (America/New_York).
 * Wall-clock shown in proposal review, timeline cards, and `<input type="datetime-local">`
 * is **operational** civil time in this zone — not the browser's local timezone.
 *
 * Storage and API instants remain UTC / explicit-offset ISO per Case Engine; this module
 * only formats and parses the operational edit/display layer.
 */

export const DEFAULT_OPERATIONAL_TIMEZONE = 'America/New_York';

function pad2(n: number): string {
	return String(n).padStart(2, '0');
}

function readWallClockInZone(ms: number, timeZone: string) {
	const formatter = new Intl.DateTimeFormat('en-US', {
		timeZone,
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit',
		hourCycle: 'h23',
		hour12: false
	});
	const parts = formatter.formatToParts(new Date(ms));
	const get = (type: Intl.DateTimeFormatPartTypes) =>
		parseInt(parts.find((p) => p.type === type)?.value ?? 'NaN', 10);
	const hourRaw = get('hour');
	/** Node/V8 may emit hour `24` for midnight in h23. */
	const hour = hourRaw === 24 ? 0 : hourRaw;
	return {
		y: get('year'),
		mo: get('month'),
		d: get('day'),
		h: hour,
		mi: get('minute'),
		s: get('second')
	};
}

/**
 * UTC instant → YYYY-MM-DDTHH:mm:ss civil time in `timeZone` (for datetime-local).
 */
export function utcMsToOperationalDatetimeLocalValue(ms: number, timeZone = DEFAULT_OPERATIONAL_TIMEZONE): string {
	if (Number.isNaN(ms)) return '';
	const p = readWallClockInZone(ms, timeZone);
	if ([p.y, p.mo, p.d, p.h, p.mi, p.s].some((n) => Number.isNaN(n))) return '';
	return `${p.y}-${pad2(p.mo)}-${pad2(p.d)}T${pad2(p.h)}:${pad2(p.mi)}:${pad2(p.s)}`;
}

/**
 * Civil Y-M-D H:M:S in `timeZone` → UTC epoch ms. Iterative (DST-safe).
 */
export function operationalWallClockToUtcMs(
	y: number,
	mo: number,
	d: number,
	h: number,
	mi: number,
	s: number,
	timeZone: string
): number {
	let guess = Date.UTC(y, mo - 1, d, h, mi, s);
	for (let i = 0; i < 48; i++) {
		const p = readWallClockInZone(guess, timeZone);
		if (p.y === y && p.mo === mo && p.d === d && p.h === h && p.mi === mi && p.s === s) {
			return guess;
		}
		const sodDiff = (h - p.h) * 3600000 + (mi - p.mi) * 60000 + (s - p.s) * 1000;
		let dayMs = 0;
		if (p.y !== y || p.mo !== mo || p.d !== d) {
			const wantMid = Date.UTC(y, mo - 1, d, 12, 0, 0);
			const gotMid = Date.UTC(p.y, p.mo - 1, p.d, 12, 0, 0);
			dayMs = wantMid - gotMid;
		}
		guess += sodDiff + dayMs;
	}
	throw new Error(
		`operationalWallClockToUtcMs: could not resolve ${y}-${pad2(mo)}-${pad2(d)}T${pad2(h)}:${pad2(mi)}:${pad2(s)} in ${timeZone}`
	);
}

/** YYYY-MM-DD HH:mm[:ss] in operational zone; locale-independent digits. */
export function formatIsoInOperationalTimezone(
	iso: string,
	opts: { seconds: boolean; timeZone?: string }
): string {
	const trimmed = String(iso ?? '').trim();
	if (!trimmed) return trimmed;
	const d = new Date(trimmed);
	if (isNaN(d.getTime())) return trimmed;
	const timeZone = opts.timeZone ?? DEFAULT_OPERATIONAL_TIMEZONE;
	const p = readWallClockInZone(d.getTime(), timeZone);
	if ([p.y, p.mo, p.d, p.h, p.mi, p.s].some((n) => Number.isNaN(n))) return trimmed;
	const date = `${p.y}-${pad2(p.mo)}-${pad2(p.d)}`;
	const time = opts.seconds
		? `${pad2(p.h)}:${pad2(p.mi)}:${pad2(p.s)}`
		: `${pad2(p.h)}:${pad2(p.mi)}`;
	return `${date} ${time}`;
}
