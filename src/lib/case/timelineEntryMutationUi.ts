/**
 * P40-04 / P40-04A — Client-side preflight for Case Engine direct timeline PUT rules.
 *
 * **Authority:** Enforcement lives in Detective Case Engine
 * `src/utils/timelineEntryMutationGuards.ts`. This module duplicates only what the UI needs for
 * early feedback; the server response is always decisive.
 *
 * **Drift control:** Keep `TIMELINE_MUTATION_EDIT_GUARD_CONTRACT_VERSION` identical to the Case Engine
 * export of the same name. When bumping the contract or `TIMELINE_SENSITIVE_CHANGE_REASON_MIN_LEN`,
 * change both repositories in one revision.
 */
import type { TimelineEntry } from '$lib/apis/caseEngine';

/** Must match Case Engine `TIMELINE_MUTATION_EDIT_GUARD_CONTRACT_VERSION`. */
export const TIMELINE_MUTATION_EDIT_GUARD_CONTRACT_VERSION = 'p40-04a-v1' as const;

/** Must match Case Engine `TIMELINE_SENSITIVE_CHANGE_REASON_MIN_LEN` (HTTP 400 embeds this value). */
export const TIMELINE_SENSITIVE_CHANGE_REASON_MIN_LEN = 24;

function sameInstantIso(a: string, b: string): boolean {
	const ta = Date.parse(a.trim());
	const tb = Date.parse(b.trim());
	if (!Number.isNaN(ta) && !Number.isNaN(tb)) return ta === tb;
	return a.trim() === b.trim();
}

/** @internal — keep aligned with Case Engine `timelineEntryMutationGuards.levenshteinDistance` */
export function levenshteinDistance(a: string, b: string): number {
	if (a === b) return 0;
	const aLen = a.length;
	const bLen = b.length;
	if (aLen === 0) return bLen;
	if (bLen === 0) return aLen;
	const prev = new Array<number>(bLen + 1);
	const curr = new Array<number>(bLen + 1);
	for (let j = 0; j <= bLen; j++) prev[j] = j;
	for (let i = 1; i <= aLen; i++) {
		curr[0] = i;
		const ca = a.charCodeAt(i - 1);
		for (let j = 1; j <= bLen; j++) {
			const cost = ca === b.charCodeAt(j - 1) ? 0 : 1;
			curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
		}
		for (let j = 0; j <= bLen; j++) prev[j] = curr[j];
	}
	return prev[bLen];
}

/** @internal — keep aligned with Case Engine `normalizeTimelineTextForMaterialCompare` */
export function normalizeTimelineTextForMaterialCompare(s: string): string {
	return s.trim().replace(/\s+/g, ' ');
}

/** @internal — keep aligned with Case Engine `isTextMateriallyAltered` */
export function isTextMateriallyAltered(before: string, after: string): boolean {
	const An = normalizeTimelineTextForMaterialCompare(before);
	const Bn = normalizeTimelineTextForMaterialCompare(after);
	if (An === Bn) return false;

	const la = An.length;
	const lb = Bn.length;
	if (la === 0 || lb === 0) return true;

	const maxL = Math.max(la, lb);
	const minL = Math.min(la, lb);
	const lenSkew = maxL - minL;

	const cap = 800;
	const aSub = la > cap ? An.slice(0, cap) : An;
	const bSub = lb > cap ? Bn.slice(0, cap) : Bn;
	const dist = levenshteinDistance(aSub, bSub);
	const rel = dist / maxL;

	if (dist >= 38) return true;
	if (lenSkew >= 80 && dist >= 12) return true;
	if (lenSkew >= 56 && dist >= 18 && rel >= 0.1) return true;
	if (maxL >= 80 && dist >= 20) return true;

	if (maxL <= 36) {
		return (dist >= 4 && rel >= 0.28) || dist >= 8;
	}
	if (maxL <= 120) {
		return rel > 0.24 || dist >= 16;
	}
	return rel > 0.19 || dist >= 24;
}

/**
 * True when the pending edit would require a long `change_reason` on the server
 * (chronology, type, or material text). Location / image-only edits do not.
 */
export function timelineEditRequiresDetailedReason(
	baseline: Pick<TimelineEntry, 'occurred_at' | 'type' | 'text_original'>,
	draft: { type: string; text_original: string },
	draftOccurredAtIso: string
): boolean {
	const chronology = !sameInstantIso(baseline.occurred_at, draftOccurredAtIso);
	const typeChanged = baseline.type !== draft.type;
	const textMaterial = isTextMateriallyAltered(
		baseline.text_original ?? '',
		draft.text_original ?? ''
	);
	return chronology || typeChanged || textMaterial;
}

/** Operator hint; uses `TIMELINE_SENSITIVE_CHANGE_REASON_MIN_LEN` so copy tracks the server contract. */
export const TIMELINE_SENSITIVE_REASON_HINT = `Changing the time, type, or substantially rewriting the entry text requires at least ${TIMELINE_SENSITIVE_CHANGE_REASON_MIN_LEN} characters in “Reason for change” (official audit trail; Case Engine enforces this).`;
