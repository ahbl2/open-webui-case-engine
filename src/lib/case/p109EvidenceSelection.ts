/**
 * P109-01 — UI-only manual evidence selection for the active case (session memory).
 * Non-authoritative; no persistence; no backend calls.
 */
import { writable, derived, type Readable } from 'svelte/store';

export type EvidenceSelectionKind = 'timeline_entry' | 'file';

export type EvidenceSelectionItem = {
	kind: EvidenceSelectionKind;
	id: string;
	case_id: string;
};

export type EvidenceSelectionState = {
	caseId: string;
	/** Keys: `${kind}:${id}` */
	selected: Record<string, true>;
};

const initialState: EvidenceSelectionState = {
	caseId: '',
	selected: {}
};

export const evidenceSelection = writable<EvidenceSelectionState>(initialState);

export function evidenceSelectionKey(kind: EvidenceSelectionKind, id: string): string {
	return `${kind}:${id}`;
}

export function parseEvidenceSelectionKey(key: string): EvidenceSelectionItem | null {
	const idx = key.indexOf(':');
	if (idx <= 0) return null;
	const kind = key.slice(0, idx) as EvidenceSelectionKind;
	if (kind !== 'timeline_entry' && kind !== 'file') return null;
	const id = key.slice(idx + 1);
	if (!id) return null;
	return { kind, id, case_id: '' };
}

/**
 * When `caseId` changes, clears selection so nothing carries across cases.
 */
export function ensureEvidenceSelectionCaseScope(caseId: string): void {
	if (!caseId) return;
	evidenceSelection.update((s) => {
		if (s.caseId === caseId) return s;
		return { caseId, selected: {} };
	});
}

export function toggleEvidenceSelection(
	kind: EvidenceSelectionKind,
	id: string,
	caseId: string
): void {
	if (!caseId || !id) return;
	evidenceSelection.update((s) => {
		const scoped = s.caseId === caseId ? s : { caseId, selected: {} };
		const k = evidenceSelectionKey(kind, id);
		const next = { ...scoped.selected };
		if (next[k]) {
			delete next[k];
		} else {
			next[k] = true;
		}
		return { caseId, selected: next };
	});
}

export function clearEvidenceSelection(): void {
	evidenceSelection.update((s) => ({ ...s, selected: {} }));
}

export function removeEvidenceSelectionKey(
	kind: EvidenceSelectionKind,
	id: string,
	caseId: string
): void {
	if (!caseId || !id) return;
	evidenceSelection.update((s) => {
		if (s.caseId !== caseId) return s;
		const k = evidenceSelectionKey(kind, id);
		if (!s.selected[k]) return s;
		const next = { ...s.selected };
		delete next[k];
		return { caseId, selected: next };
	});
}

/**
 * Drops timeline keys that are no longer valid for the active list:
 * - always: keys for rows we can see as soft-deleted in `entries`;
 * - when `hasMore` is false: keys whose ids are absent from the loaded result set
 *   (filters, full corpus, or entity lens — no stale ids after a complete sync).
 * When `hasMore` is true, ids not yet loaded are left alone (pagination).
 */
export function pruneEvidenceSelectionAfterTimelineSync(
	caseId: string,
	entries: Array<{ id: string; deleted_at?: string | null }>,
	hasMore: boolean
): void {
	evidenceSelection.update((s) => {
		if (s.caseId !== caseId) return s;
		const next = { ...s.selected };
		const entryIds = new Set(entries.map((e) => e.id));
		const deletedInView = new Set(entries.filter((e) => e.deleted_at).map((e) => e.id));
		for (const key of Object.keys(next)) {
			if (!key.startsWith('timeline_entry:')) continue;
			const id = key.slice('timeline_entry:'.length);
			if (deletedInView.has(id)) {
				delete next[key];
				continue;
			}
			if (!hasMore && !entryIds.has(id)) {
				delete next[key];
			}
		}
		return { caseId, selected: next };
	});
}

/**
 * Same contract as timeline: complete file list when `hasMore` is false.
 * `hasMore` should be `files.length < totalFiles` when `totalFiles > 0`.
 */
export function pruneEvidenceSelectionAfterFilesSync(
	caseId: string,
	files: Array<{ id: string; deleted_at?: string | null }>,
	hasMore: boolean
): void {
	evidenceSelection.update((s) => {
		if (s.caseId !== caseId) return s;
		const next = { ...s.selected };
		const fileIds = new Set(files.map((f) => f.id));
		const deletedInView = new Set(files.filter((f) => f.deleted_at).map((f) => f.id));
		for (const key of Object.keys(next)) {
			if (!key.startsWith('file:')) continue;
			const id = key.slice('file:'.length);
			if (deletedInView.has(id)) {
				delete next[key];
				continue;
			}
			if (!hasMore && !fileIds.has(id)) {
				delete next[key];
			}
		}
		return { caseId, selected: next };
	});
}

export function isEvidenceSelected(
	state: EvidenceSelectionState,
	kind: EvidenceSelectionKind,
	id: string
): boolean {
	return !!state.selected[evidenceSelectionKey(kind, id)];
}

/**
 * Maps the current session selection keys to the Case Engine P109-02 create payload (explicit kinds + ids only).
 * Deterministic order: kind then source_id.
 */
export function evidenceSelectionToCreateItems(
	selected: Record<string, true>
): Array<{ kind: EvidenceSelectionKind; source_id: string }> {
	const out: Array<{ kind: EvidenceSelectionKind; source_id: string }> = [];
	for (const key of Object.keys(selected)) {
		const p = parseEvidenceSelectionKey(key);
		if (!p) continue;
		out.push({ kind: p.kind, source_id: p.id });
	}
	out.sort((a, b) => {
		const c = a.kind.localeCompare(b.kind);
		if (c !== 0) return c;
		return a.source_id.localeCompare(b.source_id);
	});
	return out;
}

export function evidenceSelectionCounts(state: EvidenceSelectionState): {
	total: number;
	timeline: number;
	files: number;
} {
	let timeline = 0;
	let files = 0;
	for (const key of Object.keys(state.selected)) {
		if (key.startsWith('timeline_entry:')) timeline += 1;
		else if (key.startsWith('file:')) files += 1;
	}
	return { total: timeline + files, timeline, files };
}

export const evidenceSelectionCountSummary: Readable<ReturnType<typeof evidenceSelectionCounts>> =
	derived(evidenceSelection, (s) => evidenceSelectionCounts(s));
