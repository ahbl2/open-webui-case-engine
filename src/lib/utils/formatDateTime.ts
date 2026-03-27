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
 * Use formatCaseDateTimeWithSeconds for occurred_at on official timeline entries
 * where sub-minute sequence accuracy matters (e.g. two events in the same minute).
 */
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
