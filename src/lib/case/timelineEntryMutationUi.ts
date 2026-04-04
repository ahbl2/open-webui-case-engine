/**
 * P40-04 — UI-side alignment with Case Engine direct-edit mutation rules.
 * Keep classification in sync with `DetectiveCaseEngine/src/utils/timelineEntryMutationGuards.ts`.
 */
import type { TimelineEntry } from '$lib/apis/caseEngine';

export const TIMELINE_SENSITIVE_CHANGE_REASON_MIN_LEN = 24;

function sameInstantIso(a: string, b: string): boolean {
	const ta = Date.parse(a.trim());
	const tb = Date.parse(b.trim());
	if (!Number.isNaN(ta) && !Number.isNaN(tb)) return ta === tb;
	return a.trim() === b.trim();
}

/** @internal — duplicated from Case Engine for parity */
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

/** @internal — duplicated from Case Engine for parity */
export function isTextMateriallyAltered(before: string, after: string): boolean {
	const A = before.trim();
	const B = after.trim();
	if (A === B) return false;
	const la = A.length;
	const lb = B.length;
	if (la === 0 || lb === 0) return true;
	const maxL = Math.max(la, lb);
	const minL = Math.min(la, lb);
	if (maxL - minL >= 120) return true;
	if (minL >= 28 && maxL / minL >= 1.72) return true;
	const cap = 800;
	const aSub = la > cap ? A.slice(0, cap) : A;
	const bSub = lb > cap ? B.slice(0, cap) : B;
	const dist = levenshteinDistance(aSub, bSub);
	return dist / maxL > 0.26;
}

/**
 * True when the pending edit would require a long `change_reason` on the server
 * (chronology, type, or material text change). Location / image-only edits do not.
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

export const TIMELINE_SENSITIVE_REASON_HINT =
	'Changing the time, type, or substantially rewriting the entry text requires at least 24 characters in “Reason for change” (official audit trail).';
