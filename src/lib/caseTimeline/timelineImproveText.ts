/**
 * Timeline composer text-improvement helpers.
 *
 * The "Improve text" action (upgrade from P39-06 deterministic "Clean up")
 * calls `previewStructuredNotesExtraction` — the same AI-powered backend pipeline
 * that Notes uses for "Structure Note" — and puts the improved text directly into
 * the Timeline composer for reviewer edit before explicit save.
 *
 * UX contract (Timeline-specific, stricter than Notes):
 *   trigger action → AI improves text → result lands in composer → detective
 *   reviews/edits → explicit save remains required.
 *
 * No review panel, no separate draft path, no auto-save, no hidden write.
 * The composer remains the single visible and editable state.
 *
 * Paragraph restoration (this module):
 *   Notes uses `renderedText` directly, which joins statement blocks with \n\n
 *   for multi-paragraph edit-friendly display. Timeline needs a single flowing
 *   narrative paragraph. `renderTimelineParagraphText` extracts only `statement`
 *   blocks from the render result and joins them with a single space, restoring
 *   proper paragraph form without the Notes-specific annotation sections
 *   (conflicts, ambiguities, actions, issues) that do not belong in a timeline entry.
 *
 * Certainty disclaimer exclusion (this module):
 *   When a statement is classified as hedged or questioned, the backend renderer
 *   appends a synthetic certainty block (`blockSuffix: 'h'`, hardcoded for hedged)
 *   containing commentary such as "This information is not confirmed." This block
 *   carries `kind: 'statement'` and appears in `render.blocks`. It must be excluded
 *   from Timeline output: Timeline may preserve hedged wording already present in the
 *   detective's own text, but must not inject synthesized commentary sentences.
 *   The `~h` blockId suffix is the stable discriminator for these blocks.
 */

import type { StructuredNoteRenderedBlock } from '../types/structuredNotes/extractionPreview';

export type TimelineImproveState = 'idle' | 'processing' | 'applied' | 'noop' | 'error';

/**
 * Assembles Timeline-appropriate paragraph text from structured note render blocks.
 *
 * The backend renderer joins all statement blocks with `\n\n` (and appends
 * annotation sections) when producing `renderedText`. For Notes this is correct:
 * multi-paragraph structure supports editing individual statements. For Timeline,
 * this creates broken lines instead of a single flowing narrative.
 *
 * This function takes only the `statement` blocks — the same verified, expanded,
 * punctuated text the backend produced — and joins them with a single space to
 * produce one continuous paragraph narrative. Non-statement blocks (conflicts,
 * ambiguities, actions, issues) are excluded: they carry structured annotation
 * meaning that does not belong in a timeline entry's text field.
 *
 * Certainty disclaimer blocks (blockId ending `~h`) are also excluded. The backend
 * uses the hardcoded suffix `'h'` (hedged) to distinguish synthesized commentary
 * from narrative statement segments. Regular multi-segment statements use numeric
 * suffixes (`~0`, `~1`, …). Excluding `~h` removes appended sentences such as
 * "This information is not confirmed." without touching legitimate hedged wording
 * that the detective's own text already carries.
 *
 * Each statement block already ends with a period (from the backend
 * `ensureTrailingPeriod` rule), so joining with ` ` produces correct spacing.
 */
export function renderTimelineParagraphText(blocks: StructuredNoteRenderedBlock[]): string {
	return blocks
		.filter((b) => b.kind === 'statement' && !b.blockId.endsWith('~h'))
		.map((b) => b.text.trim())
		.filter(Boolean)
		.join(' ');
}

/**
 * Returns true when the AI response should be treated as a no-op:
 *   - paragraph text is empty or whitespace-only
 *   - paragraph text trims to the same string as source text
 *
 * In both cases the "Improve text" action reports "Already looks good" rather
 * than placing identical content back into the composer.
 */
export function isTimelineImproveTextNoop(renderedText: string, sourceText: string): boolean {
	if (!renderedText.trim()) return true;
	if (renderedText.trim() === sourceText.trim()) return true;
	return false;
}
