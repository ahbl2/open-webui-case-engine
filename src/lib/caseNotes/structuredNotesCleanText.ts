/**
 * Certainty-safe text reconstruction for the Notes structured extraction pipeline.
 *
 * Problem:
 *   The Case Engine backend renderer (`renderStructuredNoteExtractionProposal`) emits a
 *   synthetic certainty/disclaimer segment (blockSuffix 'h', hardcoded for hedged/
 *   questioned certainty) alongside each statement whose certainty was classified as
 *   hedged but whose verbatim text does not already carry uncertainty language. This
 *   segment has `kind: 'statement'` and text such as "This information is not confirmed."
 *   It is embedded in `render.renderedText` and present in `render.blocks`.
 *
 * Fix:
 *   `renderNotesCleanText` reconstructs the same multi-section Notes-format text that the
 *   backend would have produced — statement paragraphs followed by conflict / ambiguity /
 *   action / issue sections — but with ~h certainty-disclaimer blocks excluded. Regular
 *   multi-segment statement splits use numeric suffixes (~0, ~1, …); ~h is the sole
 *   discriminator for synthesized commentary. Hedged wording the detective already
 *   wrote (e.g. "I think", "maybe") is preserved: those words stay in the statement body
 *   text and are not removed by this function.
 *
 * Usage:
 *   Use `renderNotesCleanText(data.render.blocks)` wherever `render.renderedText` would
 *   otherwise be displayed or loaded into the Notes editor. Do NOT use `render.renderedText`
 *   directly for editor hydration or display — it contains synthesized commentary.
 *
 * Section headers (must match backend renderer exactly):
 *   Conflicts   → "### Conflicting details"
 *   Ambiguities → "### Unresolved or unclear details"
 *   Actions     → "### Planned or stated next steps"
 *   Issues      → "### Extraction notes"
 */

import type { StructuredNoteRenderedBlock } from '../types/structuredNotes/extractionPreview';

/**
 * Reconstruct Notes-format rendered text from blocks, excluding certainty disclaimers.
 *
 * Mirrors the structure of `render.renderedText` (statement paragraphs \n\n-joined,
 * followed by annotation sections with their headers) but without ~h certainty blocks.
 *
 * Returns an empty string if there are no statement blocks and no annotation sections.
 */
export function renderNotesCleanText(blocks: StructuredNoteRenderedBlock[]): string {
	const parts: string[] = [];

	const stmtBlocks = blocks.filter((b) => b.kind === 'statement' && !b.blockId.endsWith('~h'));
	if (stmtBlocks.length > 0) {
		parts.push(stmtBlocks.map((b) => b.text).join('\n\n'));
	}

	const confBlocks = blocks.filter((b) => b.kind === 'conflict');
	if (confBlocks.length > 0) {
		parts.push(['### Conflicting details', ...confBlocks.map((b) => b.text)].join('\n'));
	}

	const ambBlocks = blocks.filter((b) => b.kind === 'ambiguity');
	if (ambBlocks.length > 0) {
		parts.push(['### Unresolved or unclear details', ...ambBlocks.map((b) => b.text)].join('\n'));
	}

	const actBlocks = blocks.filter((b) => b.kind === 'action');
	if (actBlocks.length > 0) {
		parts.push(['### Planned or stated next steps', ...actBlocks.map((b) => b.text)].join('\n'));
	}

	const issBlocks = blocks.filter((b) => b.kind === 'issue');
	if (issBlocks.length > 0) {
		parts.push(['### Extraction notes', ...issBlocks.map((b) => b.text)].join('\n'));
	}

	return parts.join('\n\n');
}

/**
 * Returns true if the cleaned text derived from blocks is empty (no statements, no
 * annotation sections). Use in guards where you previously checked `renderedText.trim()`.
 */
export function isNotesCleanTextEmpty(blocks: StructuredNoteRenderedBlock[]): boolean {
	return renderNotesCleanText(blocks).trim() === '';
}
