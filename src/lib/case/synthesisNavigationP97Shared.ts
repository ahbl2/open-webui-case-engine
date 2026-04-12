/**
 * P97 — Shared read-only lifecycle helpers for synthesis → source drill-down (no persistence, no URL params).
 */
import { clearSynthesisNavigationPageState } from '$lib/case/synthesisNavigationClear';

/** Ephemeral highlight + orientation preview duration (aligned across Timeline, Tasks, Files). */
export const P97_SYNTHESIS_REVEAL_HIGHLIGHT_MS = 4500;

/**
 * Parses `source_kind` for Files preview alignment — same truth as {@link pickSupportingFilesTargetId} filtering.
 */
export function parseFilesSourceKindFromIntent(intent: unknown): 'case_file' | 'extracted_text' | null {
	if (!intent || typeof intent !== 'object' || intent === null) return null;
	if (!('source_kind' in intent)) return null;
	const k = String((intent as { source_kind?: string }).source_kind ?? '');
	if (k === 'extracted_text') return 'extracted_text';
	if (k === 'case_file') return 'case_file';
	return null;
}

/**
 * Clears stale/mismatched `synthesisSourceNavigationIntent` from history state once, with a re-entrancy gate.
 * Call sites pass getters/setters so Svelte `let` state stays in the component.
 */
export function scheduleStaleSynthesisIntentClear(
	getPageSnapshot: () => { url: URL },
	readInFlight: () => boolean,
	writeInFlight: (next: boolean) => void
): void {
	if (readInFlight()) return;
	writeInFlight(true);
	void clearSynthesisNavigationPageState(getPageSnapshot()).finally(() => {
		writeInFlight(false);
	});
}
