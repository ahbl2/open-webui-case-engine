/**
 * P110-04 — Thin clipboard wrapper for deterministic plain-text copy (testable).
 */

export async function writePlainTextToClipboard(text: string): Promise<void> {
	await navigator.clipboard.writeText(text);
}
