/**
 * P33 — Shorthand-aware safe-mode coarse length ceiling (trimmed UTF-16 code units).
 * Must match DetectiveCaseEngine `noteCommitIntegrityService` exports of the same names.
 *
 * Values are **operational defaults** (tunable later), not permanent constants.
 * Ticket mapping: SHORT_NOTE_THRESHOLD, ABSOLUTE_GROWTH_ALLOWANCE, ×2 shorthand leg, GROWTH_RATIO.
 */
export const SAFE_MODE_SHORT_NOTE_THRESHOLD_CHARS = 120;
export const SAFE_MODE_SHORT_NOTE_ABSOLUTE_GROWTH_ALLOWANCE = 100;
export const SAFE_MODE_SHORT_NOTE_MAX_LENGTH_MULTIPLIER = 2;
export const SAFE_MODE_LONG_NOTE_LENGTH_GROWTH_RATIO = 1.25;
/**
 * Backward-compatibility alias: **only** the long-note ×ratio leg (same as `SAFE_MODE_LONG_NOTE_LENGTH_GROWTH_RATIO`).
 * **Not** the full safe-mode length rule — use `safeModeCoarseLengthAllowanceChars` for the real ceiling.
 * @deprecated Prefer `SAFE_MODE_LONG_NOTE_LENGTH_GROWTH_RATIO` or `safeModeCoarseLengthAllowanceChars`.
 */
export const SAFE_MODE_MAX_LENGTH_GROWTH_RATIO = SAFE_MODE_LONG_NOTE_LENGTH_GROWTH_RATIO;

export function safeModeCoarseLengthAllowanceChars(origTrimmedLen: number): number {
	if (origTrimmedLen <= 0) return Number.POSITIVE_INFINITY;
	if (origTrimmedLen < SAFE_MODE_SHORT_NOTE_THRESHOLD_CHARS) {
		return Math.ceil(
			Math.max(
				origTrimmedLen * SAFE_MODE_SHORT_NOTE_MAX_LENGTH_MULTIPLIER,
				origTrimmedLen + SAFE_MODE_SHORT_NOTE_ABSOLUTE_GROWTH_ALLOWANCE
			)
		);
	}
	return Math.ceil(origTrimmedLen * SAFE_MODE_LONG_NOTE_LENGTH_GROWTH_RATIO);
}

/** Debug-oriented only; not an API contract field. */
export function safeModeLengthGuardSignals(original: string, enhanced: string): {
	isShortInput: boolean;
	growthRatio: number;
	allowedLength: number;
} {
	const o = original.trim().length;
	const e = enhanced.trim().length;
	const allowed = safeModeCoarseLengthAllowanceChars(o);
	return {
		isShortInput: o > 0 && o < SAFE_MODE_SHORT_NOTE_THRESHOLD_CHARS,
		growthRatio: o === 0 ? 0 : e / o,
		allowedLength: allowed
	};
}
