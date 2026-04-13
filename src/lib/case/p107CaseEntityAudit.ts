/**
 * P107-05 — Literal display helpers for Case Engine audit fields (no inference or synthesis).
 */

const EM_DASH = '\u2014';

/**
 * Returns trimmed API string, or an em dash when missing/blank — never invents values.
 */
export function auditFieldDisplay(value: string | null | undefined): string {
	if (value == null) return EM_DASH;
	const t = String(value).trim();
	return t.length > 0 ? t : EM_DASH;
}
