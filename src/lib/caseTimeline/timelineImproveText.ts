/**
 * Timeline composer text-improvement helpers.
 *
 * The "Improve text" action (upgrade from P39-06 deterministic "Clean up")
 * calls `previewStructuredNotesExtraction` — the same AI-powered backend pipeline
 * that Notes uses for "Structure Note" — and puts the improved `renderedText`
 * directly into the Timeline composer for reviewer edit before explicit save.
 *
 * UX contract (Timeline-specific, stricter than Notes):
 *   trigger action → AI improves text → result lands in composer → detective
 *   reviews/edits → explicit save remains required.
 *
 * No review panel, no separate draft path, no auto-save, no hidden write.
 * The composer remains the single visible and editable state.
 *
 * `isTimelineImproveTextNoop` — determines whether an AI response contains a
 * meaningful improvement or should be treated as "no change" (noop).
 */

export type TimelineImproveState = 'idle' | 'processing' | 'applied' | 'noop' | 'error';

/**
 * Returns true when the AI response should be treated as a no-op:
 *   - rendered text is empty or whitespace-only
 *   - rendered text trims to the same string as source text
 *
 * In both cases the "Improve text" action reports "Already looks good" rather
 * than placing identical content back into the composer.
 */
export function isTimelineImproveTextNoop(renderedText: string, sourceText: string): boolean {
	if (!renderedText.trim()) return true;
	if (renderedText.trim() === sourceText.trim()) return true;
	return false;
}
