/**
 * Canonical case datetime formatting utilities.
 *
 * formatCaseDateTime       — YYYY-MM-DD HH:mm  (minute precision, general use)
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

import { formatIsoInOperationalTimezone } from '$lib/caseTimeline/operationalOccurredAt';
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
