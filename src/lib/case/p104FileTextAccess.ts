/**
 * P104-02 — Explicit file text access rules (read-only; no new server capabilities).
 * Separates “successful extraction” from diagnostic or failed rows without conflating representations.
 */

/**
 * True only when the Case Engine row represents a successful extraction with non-empty usable text.
 * Whitespace-only extracted_text is not usable for span/navigation semantics.
 */
export function isCaseFileExtractedTextUsable(status: string, extractedText: string | null | undefined): boolean {
	return status === 'EXTRACTED' && (extractedText ?? '').trim() !== '';
}
