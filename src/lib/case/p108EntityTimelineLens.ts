/**
 * P108-01 — Entity → timeline lens. P108-02 — Entity → files lens.
 * Deterministic (explicit evidence links only; no inference).
 */
import type { CaseEngineEvidenceLinkReadItem } from '$lib/apis/caseEngine/caseEntitiesApi';
import type { CaseFile, TimelineEntry } from '$lib/apis/caseEngine';
import { sortTimelineEntriesOfficialOrder } from '$lib/caseTimeline/timelineEntriesOfficialSort';

/** URL query param name for entity-scoped timeline lens (user-triggered navigation only). */
export const P108_ENTITY_LENS_QUERY_PARAM = 'entityLens';

export function parseEntityLensEntityIdFromSearchParams(searchParams: URLSearchParams): string | null {
	const raw = searchParams.get(P108_ENTITY_LENS_QUERY_PARAM);
	const t = (raw ?? '').trim();
	return t.length > 0 ? t : null;
}

/**
 * Timeline entry ids explicitly linked via entity evidence rows (timeline_entry only).
 * Order: sorted by id string for deterministic iteration; membership uses Set at call sites.
 */
export function timelineEntryIdsLinkedFromEntityEvidence(
	links: readonly CaseEngineEvidenceLinkReadItem[]
): string[] {
	const ids = links
		.filter((l) => l.link_type === 'timeline_entry')
		.map((l) => String(l.target_id ?? '').trim())
		.filter((id) => id.length > 0);
	return [...new Set(ids)].sort((a, b) => a.localeCompare(b));
}

/** Filters to linked ids only; result ordered by occurred_at ASC, id ASC (official order). */
export function filterTimelineEntriesToEntityLinkedOnly(
	entries: readonly TimelineEntry[],
	linkedIds: ReadonlySet<string>
): TimelineEntry[] {
	const filtered = entries.filter((e) => linkedIds.has(e.id));
	return sortTimelineEntriesOfficialOrder(filtered);
}

/** Case file ids from explicit `case_file` evidence links only. */
export function caseFileIdsLinkedFromEntityEvidence(
	links: readonly CaseEngineEvidenceLinkReadItem[]
): string[] {
	const ids = links
		.filter((l) => l.link_type === 'case_file')
		.map((l) => String(l.target_id ?? '').trim())
		.filter((id) => id.length > 0);
	return [...new Set(ids)].sort((a, b) => a.localeCompare(b));
}

/** Preserves order from the Case Engine file list (no relevance reordering). */
export function filterCaseFilesToEntityLinkedOnly(
	files: readonly CaseFile[],
	linkedIds: ReadonlySet<string>
): CaseFile[] {
	return files.filter((f) => linkedIds.has(f.id));
}
