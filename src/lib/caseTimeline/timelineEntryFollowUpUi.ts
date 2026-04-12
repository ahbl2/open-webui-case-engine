/**
 * P84-04 — Local-only “needs follow-up” markers (timeline page scope; no persistence).
 */

export function toggleFollowUpEntryId(set: ReadonlySet<string>, entryId: string): Set<string> {
	const next = new Set(set);
	if (next.has(entryId)) next.delete(entryId);
	else next.add(entryId);
	return next;
}

export function removeFollowUpEntryId(set: ReadonlySet<string>, entryId: string): Set<string> {
	const next = new Set(set);
	next.delete(entryId);
	return next;
}
