/**
 * P84-03 — Local-only timeline entry “relationship” pairing (in-memory; no persistence).
 * Pure state machine for parent (timeline page) — unit-testable without Svelte.
 */

export type RelationshipPair = { a: string; b: string };

export type RelateUiState = {
	pendingId: string | null;
	pair: RelationshipPair | null;
};

export function normalizeRelationPair(id1: string, id2: string): RelationshipPair {
	return id1 < id2 ? { a: id1, b: id2 } : { a: id2, b: id1 };
}

export function isEntryInRelationPair(entryId: string, pair: RelationshipPair | null): boolean {
	if (!pair) return false;
	return pair.a === entryId || pair.b === entryId;
}

/**
 * One active pair at a time; pending source waits for a second entry.
 * - Idle → click A: pending A
 * - Pending A → click A: clear
 * - Pending A → click B: pair (A,B)
 * - Pair (A,B) → click A or B: clear
 * - Pair (A,B) → click C: pending C (prior pair cleared)
 */
export function nextRelateState(state: RelateUiState, entryId: string): RelateUiState {
	const { pendingId, pair } = state;
	if (pair) {
		if (isEntryInRelationPair(entryId, pair)) {
			return { pendingId: null, pair: null };
		}
		return { pendingId: entryId, pair: null };
	}
	if (pendingId) {
		if (pendingId === entryId) {
			return { pendingId: null, pair: null };
		}
		return { pendingId: null, pair: normalizeRelationPair(pendingId, entryId) };
	}
	return { pendingId: entryId, pair: null };
}
