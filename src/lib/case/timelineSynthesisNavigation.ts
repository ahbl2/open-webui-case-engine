/**
 * P97-02 — Timeline destination handling for `synthesisSourceNavigationIntent` (read-only).
 *
 * Reveal/scroll targets are derived from the intent’s `destination_surface` + `source_record_id`
 * after validation — do not extend the intent with UI/scroll/position metadata (Phase 97 anchor).
 */
import type { SynthesisSourceNavigationIntent } from '$lib/case/caseSynthesisSourceNavigation';

/**
 * Returns the Timeline entry id to reveal when the intent is an authoritative Timeline navigation
 * for the current case. Otherwise returns null (caller should clear stale state without treating as error).
 */
export function pickTimelineAuthoritativeTargetId(
	intent: unknown,
	currentCaseId: string
): string | null {
	if (!intent || typeof intent !== 'object') return null;
	const i = intent as Partial<SynthesisSourceNavigationIntent>;
	if (i.v !== 1) return null;
	if (i.destination_surface !== 'timeline') return null;
	const cid = currentCaseId?.trim() ?? '';
	const ic = i.case_id?.trim() ?? '';
	if (!cid || !ic || ic !== cid) return null;
	if (i.authority !== 'authoritative' || i.source_kind !== 'timeline_entry') return null;
	const rid = i.source_record_id?.trim() ?? '';
	return rid || null;
}
