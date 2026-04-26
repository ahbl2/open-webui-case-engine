/**
 * Canonical case datetime formatting utilities.
 *
 * formatCaseDateTime       — YYYY-MM-DD HH:mm  (minute precision, general use)
 * formatCaseDateOnly       — YYYY-MM-DD  (date-only, e.g. file grid cards)
 * formatCaseDateTimeWithSeconds — YYYY-MM-DD HH:mm:ss  (second precision, evidence-critical timestamps)
 *
 * Both:
 *   - 24-hour time
 *   - Zero-padded fields
 *   - Unambiguous and locale-independent
 *   - Use the browser's local timezone
 *
 * P41-10 — `formatOperationalCaseDateTime*` use the operational IANA zone (default
 * America/New_York) for `occurred_at` / timeline event display so wall-clock matches
 * detective workflow regardless of the operator's browser timezone.
 *
 * Use formatOperationalCaseDateTimeWithSeconds for occurred_at on official timeline entries
 * where sub-minute sequence accuracy matters (e.g. two events in the same minute).
 */

import {
	DEFAULT_OPERATIONAL_TIMEZONE,
	formatIsoInOperationalTimezone
} from '$lib/caseTimeline/operationalOccurredAt';
export function formatCaseDateTime(iso: string): string {
	try {
		const d = new Date(iso);
		if (isNaN(d.getTime())) return iso;
		const yyyy = d.getFullYear();
		const mm = String(d.getMonth() + 1).padStart(2, '0');
		const dd = String(d.getDate()).padStart(2, '0');
		const hh = String(d.getHours()).padStart(2, '0');
		const min = String(d.getMinutes()).padStart(2, '0');
		return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
	} catch {
		return iso;
	}
}

/** Local calendar date only (YYYY-MM-DD), e.g. compact file list rows without time-of-day. */
export function formatCaseDateOnly(iso: string): string {
	try {
		const d = new Date(iso);
		if (isNaN(d.getTime())) return iso;
		const yyyy = d.getFullYear();
		const mm = String(d.getMonth() + 1).padStart(2, '0');
		const dd = String(d.getDate()).padStart(2, '0');
		return `${yyyy}-${mm}-${dd}`;
	} catch {
		return iso;
	}
}

export function formatCaseDateTimeWithSeconds(iso: string): string {
	try {
		const d = new Date(iso);
		if (isNaN(d.getTime())) return iso;
		const yyyy = d.getFullYear();
		const mm = String(d.getMonth() + 1).padStart(2, '0');
		const dd = String(d.getDate()).padStart(2, '0');
		const hh = String(d.getHours()).padStart(2, '0');
		const min = String(d.getMinutes()).padStart(2, '0');
		const sec = String(d.getSeconds()).padStart(2, '0');
		return `${yyyy}-${mm}-${dd} ${hh}:${min}:${sec}`;
	} catch {
		return iso;
	}
}

/** P41-10 — occurred_at / timeline wall-clock in operational timezone (default America/New_York). */
export function formatOperationalCaseDateTime(iso: string): string {
	return formatIsoInOperationalTimezone(iso, { seconds: false });
}

export function formatOperationalCaseDateTimeWithSeconds(iso: string): string {
	return formatIsoInOperationalTimezone(iso, { seconds: true });
}

/** P41-10 — operational zone time-of-day only (HH:mm), for compact timeline snippets. */
export function formatOperationalCaseTimeHm(iso: string): string {
	const full = formatIsoInOperationalTimezone(iso, { seconds: false });
	const i = full.indexOf(' ');
	if (i === -1) return full;
	return full.slice(i + 1);
}

/** P41-10 — operational zone time in 12-hour form (e.g. `11:47 PM`) for timeline rail UI. */
export function formatOperationalOccurredTime12h(iso: string): string {
	const trimmed = String(iso ?? '').trim();
	if (!trimmed) return '';
	const d = new Date(trimmed);
	if (isNaN(d.getTime())) return trimmed;
	try {
		return new Intl.DateTimeFormat('en-US', {
			timeZone: DEFAULT_OPERATIONAL_TIMEZONE,
			hour: 'numeric',
			minute: '2-digit',
			hour12: true
		}).format(d);
	} catch {
		return trimmed;
	}
}

/**
 * Compact relative hint for activity feed rows (browser-local calendar day).
 */
export function formatActivityFeedTimeContext(iso: string): string {
	try {
		const d = new Date(iso);
		if (isNaN(d.getTime())) return iso;
		const now = new Date();
		const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
		const startThat = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
		const dayDiff = Math.round((startToday - startThat) / 86400000);
		if (dayDiff === 0) return 'Today';
		if (dayDiff === 1) return 'Yesterday';
		if (dayDiff > 1 && dayDiff < 7) return `${dayDiff} days ago`;
		return formatCaseDateTime(iso);
	} catch {
		return iso;
	}
}

const MAX_SANE_AGE = 130;

/**
 * Best-effort parse of a date-of-birth string to a local calendar Date. Prefer
 * unambiguous YYYY-MM-DD; avoids `new Date("YYYY-MM-DD")` UTC midnight issues.
 */
function tryParseDobToLocalDate(s: string): Date | null {
	const t = s.trim();
	if (!t) return null;
	const m = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
	if (m) {
		const y = parseInt(m[1]!, 10);
		const mo = parseInt(m[2]!, 10) - 1;
		const d = parseInt(m[3]!, 10);
		const dt = new Date(y, mo, d);
		if (dt.getFullYear() === y && dt.getMonth() === mo && dt.getDate() === d) return dt;
	}
	const p = Date.parse(t);
	if (!Number.isNaN(p)) {
		const dt = new Date(p);
		if (!isNaN(dt.getTime())) return dt;
	}
	return null;
}

/**
 * Full years from birth to reference date (default: today) in the browser’s local
 * calendar, or null if unparseable, future DOB, or result outside 0..130.
 */
export function ageInFullYearsToReference(birth: Date, ref: Date = new Date()): number | null {
	if (isNaN(birth.getTime()) || isNaN(ref.getTime())) return null;
	const b0 = new Date(birth.getFullYear(), birth.getMonth(), birth.getDate());
	const r0 = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate());
	if (b0.getTime() > r0.getTime()) return null;
	let age = r0.getFullYear() - b0.getFullYear();
	if (r0.getMonth() < b0.getMonth() || (r0.getMonth() === b0.getMonth() && r0.getDate() < b0.getDate())) {
		age -= 1;
	}
	if (age < 0 || age > MAX_SANE_AGE) return null;
	return age;
}

/**
 * Integer age in years from a best-effort DOB string, or null if not computable.
 */
export function ageInYearsFromDobString(dob: string, ref: Date = new Date()): number | null {
	const birth = tryParseDobToLocalDate(dob);
	if (!birth) return null;
	return ageInFullYearsToReference(birth, ref);
}
