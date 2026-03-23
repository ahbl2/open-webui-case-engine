/**
 * Canonical case datetime formatting utility.
 *
 * Output format: YYYY-MM-DD HH:mm
 *   - 24-hour time
 *   - Zero-padded month, day, hour, and minute
 *   - Unambiguous and locale-independent
 *   - Uses the browser's local timezone (same as the existing per-file helpers it replaces)
 *
 * All case-facing timestamp displays should use this function.
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
