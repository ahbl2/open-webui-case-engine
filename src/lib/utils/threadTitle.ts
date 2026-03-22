/**
 * Deterministic thread title generation — no AI, no async, no model call.
 *
 * Derives a title from the first user message by collapsing internal whitespace
 * and truncating to 60 characters. Returns an empty string when input is blank
 * so callers can substitute a locale fallback if needed.
 */
export function generateThreadTitle(text: string): string {
	const cleaned = text.trim().replace(/\s+/g, ' ');
	return cleaned.length <= 60 ? cleaned : cleaned.slice(0, 60);
}
