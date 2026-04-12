/**
 * P96-03 — Deterministic display helpers for synthesis traceability (read-only; no inference).
 */

/** Compact comma-separated IDs; appends “(+N more)” when truncated. */
export function formatTraceIdLine(ids: readonly string[], maxShow = 8): string {
	if (ids.length === 0) return '';
	const slice = ids.slice(0, maxShow);
	const more = ids.length - slice.length;
	return more > 0 ? `${slice.join(', ')} (+${more} more)` : slice.join(', ');
}
