/**
 * P98-01 — Declared record-to-record relationship read model (read-only, single-case, non-inferential).
 *
 * Surfaces **only** relationships already represented in Case Engine read contracts (e.g. persisted
 * task cross-refs, task→timeline reference ids, timeline→image file links). No AI, no ranking,
 * no write paths, no browser persistence.
 *
 * ## `relationship_key` invariants (structural only — never “smart”)
 *
 * - Built exclusively from: **provenance enum + origin.kind + origin.id + target.kind + target.id**.
 * - **Never** from display text, labels, filenames, sort position, timestamps, or optional fields.
 * - **Never** from heuristics or “relevance”. Lexicographic **sort** of items uses this key only
 *   for stable ordering; it does not feed back into key construction.
 * - Format: {@link structuralDeclaredRelationshipKey}. If two inputs collide on the same key,
 *   outputs are **deduped** deterministically (first wins after stable sort).
 *
 * ## New relationship builders (Phase 98 policy)
 *
 * A `declaredRelationshipItemsFrom…` / `buildCaseRecordRelationshipCollectionFrom…` helper is
 * **only** added when a **read contract** already exposes the link in Case Engine (or an existing
 * GET payload field). **No** temporary inference, UI stitching, or best-guess linking. If the
 * contract does not exist, keep using {@link buildCaseRecordRelationshipCollectionUnsupportedOrigin}.
 *
 * Authority (display copy must reinforce, never invert):
 * - Timeline entries: authoritative chronology
 * - Tasks: operational / supporting
 * - Files: supporting evidence
 * - Notebook notes: working drafts (not Timeline)
 * - Synthesis (elsewhere): derived only — **not** a declared relationship endpoint here
 *
 * Parity: aligns with Phase 97 drill-down discipline (`caseSynthesisSourceNavigation.ts`) — explicit
 * ids, single-case scope, deterministic shapes. Later P98 tickets consume this contract only.
 */
import type { TimelineEntry } from '$lib/apis/caseEngine';
import type { CaseTask, CaseTaskCrossRef } from '$lib/case/caseTaskModel';

export const CASE_RECORD_RELATIONSHIP_MODEL_V = 1 as const;

/** Allowed record kinds for declared relationship endpoints (both ends). No synthetic kinds. */
export type DeclaredRecordKind = 'timeline_entry' | 'case_task' | 'case_file' | 'notebook_note';

/** How the UI may describe target authority without implying official findings. */
export type DeclaredTargetAuthorityBand =
	| 'authoritative_timeline'
	| 'operational_task'
	| 'supporting_file'
	| 'notebook_working_note';

/**
 * Provenance ties each item to an existing server-side construct — never "inferred" or "smart".
 */
export type DeclaredRelationshipProvenance =
	| 'case_engine_case_task_cross_ref_note'
	| 'case_engine_case_task_cross_ref_file'
	| 'case_engine_case_task_timeline_reference'
	| 'case_engine_timeline_entry_linked_image_file';

export interface DeclaredRelationshipRecordRef {
	readonly kind: DeclaredRecordKind;
	readonly id: string;
}

/**
 * One normalized declared link. `relationship_key` is stable and deterministic for tests/dedupe.
 */
export interface DeclaredRelationshipItem {
	readonly v: typeof CASE_RECORD_RELATIONSHIP_MODEL_V;
	readonly case_id: string;
	/** Structural identity only — see module docblock. Use {@link structuralDeclaredRelationshipKey}. */
	readonly relationship_key: string;
	readonly provenance: DeclaredRelationshipProvenance;
	readonly origin: DeclaredRelationshipRecordRef;
	readonly target: DeclaredRelationshipRecordRef;
	readonly target_authority_band: DeclaredTargetAuthorityBand;
	/**
	 * Engine-reported resolvability of the **target** (e.g. cross-ref `target_status`).
	 * - `available`: target may be shown/navigated per normal rules.
	 * - `unavailable`: **factual** state from the read model (e.g. target not active in engine terms).
	 *   **Not** “missing, please refetch”, **not** a signal to infer or stitch a substitute target.
	 *   Later UI must not treat this as recoverable or run fallback resolution logic.
	 */
	readonly target_availability: 'available' | 'unavailable';
	/** Engine-provided label only; never paraphrased or invented here. */
	readonly label_from_engine: string | null;
}

export type CaseRecordRelationshipEmptyState =
	| 'populated'
	| 'no_declared_links'
	| 'origin_unsupported';

export interface CaseRecordRelationshipCollection {
	readonly v: typeof CASE_RECORD_RELATIONSHIP_MODEL_V;
	readonly case_id: string;
	readonly origin: DeclaredRelationshipRecordRef;
	readonly items: readonly DeclaredRelationshipItem[];
	readonly empty_state: CaseRecordRelationshipEmptyState;
}

/** UI copy — factual, non-causal; safe defaults for later tickets (no surface work in P98-01). */
export const DECLARED_RELATIONSHIP_UI_COPY = {
	sectionHeading: 'Declared connections (same case)',
	emptyNoDeclaredLinks: 'No declared links for this record.',
	emptyOriginUnsupported: 'Declared links are not available for this record type in the read model.',
	supportingContextFootnote:
		'Declared connections are supporting context only. Timeline remains the authoritative record.',
	/** Factual only — not “retry”, not “missing” recovery (see `target_availability` docs). */
	targetUnavailableNote: 'Target unavailable (read-only).',
	/** Region `aria-label` for declared-connection strips (P98-05 — single source across surfaces). */
	regionAriaLabel: 'Declared same-case connections'
} as const;

/**
 * Terms / phrases that must not appear in relationship chrome or helper copy
 * (case-insensitive substring check). **Single enforcement point** — relationship surfaces must
 * call {@link containsForbiddenRelationshipDisplayTerm} (or {@link relationshipDisplayCopyIsAllowed})
 * on **all** operator-visible strings for this feature, not only on these constants.
 *
 * Blocks inference, ranking, cross-case, and **causal / narrative implication** (“related event”,
 * “led to”, “associated with”, …) so Phase 98 stays declarative.
 */
export const FORBIDDEN_RELATIONSHIP_DISPLAY_TERMS = [
	'related items',
	'related event',
	'connected incident',
	'this led to',
	' led to ',
	'led to',
	'associated with',
	'caused ',
	'because of',
	'suggested',
	'recommended',
	'smart ',
	' ai ',
	'inferred',
	'inference',
	'ranked',
	'ranking',
	'score ',
	'scoring',
	'likely cause',
	'because ',
	'workflow',
	'automation',
	'lead',
	'cross-case'
] as const;

/** Positive guard: `true` when `text` is safe to show in relationship UI (inverse of forbidden check). */
export function relationshipDisplayCopyIsAllowed(text: string): boolean {
	return !containsForbiddenRelationshipDisplayTerm(text);
}

/**
 * **Central** guard for Phase 98 relationship copy. All new UI strings must pass this before merge.
 */
export function containsForbiddenRelationshipDisplayTerm(text: string): boolean {
	const t = text.toLowerCase();
	for (const term of FORBIDDEN_RELATIONSHIP_DISPLAY_TERMS) {
		if (t.includes(term)) return true;
	}
	return false;
}

export function authorityBandForDeclaredTargetKind(kind: DeclaredRecordKind): DeclaredTargetAuthorityBand {
	switch (kind) {
		case 'timeline_entry':
			return 'authoritative_timeline';
		case 'case_task':
			return 'operational_task';
		case 'case_file':
			return 'supporting_file';
		case 'notebook_note':
			return 'notebook_working_note';
		default: {
			const _x: never = kind;
			return _x;
		}
	}
}

export function declaredRelationshipOriginKindSupported(kind: DeclaredRecordKind): boolean {
	return kind === 'case_task' || kind === 'timeline_entry';
}

function trimId(id: string | null | undefined): string {
	return (id ?? '').trim();
}

/** Prefix for structural keys; bump only if key grammar changes (not for display tweaks). */
export const DECLARED_RELATIONSHIP_KEY_PREFIX = 'ce:p98:v1' as const;

/**
 * Structural, deterministic relationship identity. **Only** provenance + origin ref + target ref.
 * IDs are expected to be engine ids (no colons). Do not pass display text or optional metadata.
 */
export function structuralDeclaredRelationshipKey(
	provenance: DeclaredRelationshipProvenance,
	origin: DeclaredRelationshipRecordRef,
	target: DeclaredRelationshipRecordRef
): string {
	const oid = trimId(origin.id);
	const tid = trimId(target.id);
	return `${DECLARED_RELATIONSHIP_KEY_PREFIX}:${provenance}:${origin.kind}:${oid}:${target.kind}:${tid}`;
}

function sortDeclaredItemsStable(items: DeclaredRelationshipItem[]): DeclaredRelationshipItem[] {
	return items.slice().sort((a, b) => (a.relationship_key < b.relationship_key ? -1 : a.relationship_key > b.relationship_key ? 1 : 0));
}

/** After stable sort: first row wins if the engine emitted duplicate structural edges. */
function dedupeByStructuralRelationshipKey(items: DeclaredRelationshipItem[]): DeclaredRelationshipItem[] {
	const sorted = sortDeclaredItemsStable(items);
	const seen = new Set<string>();
	const out: DeclaredRelationshipItem[] = [];
	for (const it of sorted) {
		if (seen.has(it.relationship_key)) continue;
		seen.add(it.relationship_key);
		out.push(it);
	}
	return out;
}

function emptyCollection(
	caseId: string,
	origin: DeclaredRelationshipRecordRef,
	empty_state: 'no_declared_links' | 'origin_unsupported'
): CaseRecordRelationshipCollection {
	return {
		v: CASE_RECORD_RELATIONSHIP_MODEL_V,
		case_id: caseId,
		origin,
		items: [],
		empty_state
	};
}

function crossRefProvenance(t: CaseTaskCrossRef['linkedEntityType']): DeclaredRelationshipProvenance | null {
	if (t === 'note') return 'case_engine_case_task_cross_ref_note';
	if (t === 'file') return 'case_engine_case_task_cross_ref_file';
	return null;
}

function targetKindFromCrossRef(t: CaseTaskCrossRef['linkedEntityType']): DeclaredRecordKind | null {
	if (t === 'note') return 'notebook_note';
	if (t === 'file') return 'case_file';
	return null;
}

/**
 * Maps persisted task cross-refs and the optional timeline_entry_id reference into declared items.
 * Invalid rows are dropped (unknown entity type, empty ids). Single-case: `caseId` must be the active case for `task`.
 */
export function declaredRelationshipItemsFromCaseTask(caseId: string, task: CaseTask): DeclaredRelationshipItem[] {
	const cid = trimId(caseId);
	const taskId = trimId(task.id);
	if (!cid || !taskId) return [];

	const origin: DeclaredRelationshipRecordRef = { kind: 'case_task', id: taskId };
	const out: DeclaredRelationshipItem[] = [];

	const timelineId = trimId(task.linkedTimelineEntryId ?? undefined);
	if (timelineId) {
		const target: DeclaredRelationshipRecordRef = { kind: 'timeline_entry', id: timelineId };
		const prov = 'case_engine_case_task_timeline_reference' as const;
		out.push({
			v: CASE_RECORD_RELATIONSHIP_MODEL_V,
			case_id: cid,
			relationship_key: structuralDeclaredRelationshipKey(prov, origin, target),
			provenance: prov,
			origin,
			target,
			target_authority_band: authorityBandForDeclaredTargetKind('timeline_entry'),
			target_availability: 'available',
			label_from_engine: null
		});
	}

	const refs = Array.isArray(task.crossRefs) ? task.crossRefs : [];
	for (const r of refs) {
		const prov = crossRefProvenance(r.linkedEntityType);
		const tk = targetKindFromCrossRef(r.linkedEntityType);
		const targetId = trimId(r.linkedEntityId);
		if (!prov || !tk || !targetId) continue;

		const avail: 'available' | 'unavailable' = r.targetStatus === 'active' ? 'available' : 'unavailable';
		const target: DeclaredRelationshipRecordRef = { kind: tk, id: targetId };
		out.push({
			v: CASE_RECORD_RELATIONSHIP_MODEL_V,
			case_id: cid,
			relationship_key: structuralDeclaredRelationshipKey(prov, origin, target),
			provenance: prov,
			origin,
			target,
			target_authority_band: authorityBandForDeclaredTargetKind(tk),
			target_availability: avail,
			label_from_engine: r.displayLabel != null && String(r.displayLabel).trim() !== '' ? String(r.displayLabel).trim() : null
		});
	}

	return dedupeByStructuralRelationshipKey(out);
}

/**
 * Timeline entry → linked image files only (explicit `linked_image_files` on the entry payload).
 * Drops links when `entry.case_id` does not match `caseId` (single-case guard).
 */
export function declaredRelationshipItemsFromTimelineEntry(caseId: string, entry: TimelineEntry): DeclaredRelationshipItem[] {
	const cid = trimId(caseId);
	const eid = trimId(entry.id);
	if (!cid || !eid) return [];
	if (trimId(entry.case_id) !== cid) return [];

	const origin: DeclaredRelationshipRecordRef = { kind: 'timeline_entry', id: eid };
	const files = Array.isArray(entry.linked_image_files) ? entry.linked_image_files : [];
	const out: DeclaredRelationshipItem[] = [];

	for (const f of files) {
		const fid = trimId(f?.id);
		if (!fid) continue;
		const label = f.original_filename?.trim() ? f.original_filename.trim() : null;
		const target: DeclaredRelationshipRecordRef = { kind: 'case_file', id: fid };
		const prov = 'case_engine_timeline_entry_linked_image_file' as const;
		out.push({
			v: CASE_RECORD_RELATIONSHIP_MODEL_V,
			case_id: cid,
			relationship_key: structuralDeclaredRelationshipKey(prov, origin, target),
			provenance: prov,
			origin,
			target,
			target_authority_band: authorityBandForDeclaredTargetKind('case_file'),
			target_availability: 'available',
			label_from_engine: label
		});
	}

	return dedupeByStructuralRelationshipKey(out);
}

export function buildCaseRecordRelationshipCollectionFromCaseTask(
	caseId: string,
	task: CaseTask
): CaseRecordRelationshipCollection {
	const cid = trimId(caseId);
	const taskId = trimId(task.id);
	if (!cid || !taskId) {
		return emptyCollection(cid, { kind: 'case_task', id: taskId }, 'no_declared_links');
	}
	const items = declaredRelationshipItemsFromCaseTask(cid, task);
	const origin: DeclaredRelationshipRecordRef = { kind: 'case_task', id: taskId };
	if (items.length === 0) {
		return {
			v: CASE_RECORD_RELATIONSHIP_MODEL_V,
			case_id: cid,
			origin,
			items: [],
			empty_state: 'no_declared_links'
		};
	}
	return {
		v: CASE_RECORD_RELATIONSHIP_MODEL_V,
		case_id: cid,
		origin,
		items,
		empty_state: 'populated'
	};
}

export function buildCaseRecordRelationshipCollectionFromTimelineEntry(
	caseId: string,
	entry: TimelineEntry
): CaseRecordRelationshipCollection {
	const cid = trimId(caseId);
	const eid = trimId(entry.id);
	if (!cid || !eid) {
		return emptyCollection(cid, { kind: 'timeline_entry', id: eid }, 'no_declared_links');
	}
	if (trimId(entry.case_id) !== cid) {
		return {
			v: CASE_RECORD_RELATIONSHIP_MODEL_V,
			case_id: cid,
			origin: { kind: 'timeline_entry', id: eid },
			items: [],
			empty_state: 'no_declared_links'
		};
	}
	const items = declaredRelationshipItemsFromTimelineEntry(cid, entry);
	const origin: DeclaredRelationshipRecordRef = { kind: 'timeline_entry', id: eid };
	if (items.length === 0) {
		return {
			v: CASE_RECORD_RELATIONSHIP_MODEL_V,
			case_id: cid,
			origin,
			items: [],
			empty_state: 'no_declared_links'
		};
	}
	return {
		v: CASE_RECORD_RELATIONSHIP_MODEL_V,
		case_id: cid,
		origin,
		items,
		empty_state: 'populated'
	};
}

/**
 * Explicit stub for origins without a declared-link read contract in P98-01 (e.g. `case_file`, `notebook_note` alone).
 * Later tickets add builders when read paths exist — do not infer links here.
 */
export function buildCaseRecordRelationshipCollectionUnsupportedOrigin(
	caseId: string,
	origin: DeclaredRelationshipRecordRef
): CaseRecordRelationshipCollection {
	const cid = trimId(caseId);
	const oid = trimId(origin.id);
	if (!cid || !oid) {
		return emptyCollection(cid, { kind: origin.kind, id: oid }, 'no_declared_links');
	}
	return {
		v: CASE_RECORD_RELATIONSHIP_MODEL_V,
		case_id: cid,
		origin: { kind: origin.kind, id: oid },
		items: [],
		empty_state: 'origin_unsupported'
	};
}

/**
 * Narrow guard for tests and call sites: rejects shapes that are not declared engine links.
 * Does not mutate inputs.
 */
export function filterToDeclaredRelationshipItemsOnly(
	items: readonly DeclaredRelationshipItem[]
): DeclaredRelationshipItem[] {
	const out: DeclaredRelationshipItem[] = [];
	for (const it of items) {
		if (it.v !== CASE_RECORD_RELATIONSHIP_MODEL_V) continue;
		if (!trimId(it.case_id) || !trimId(it.relationship_key)) continue;
		if (!trimId(it.origin.id) || !trimId(it.target.id)) continue;
		if (!isDeclaredRelationshipProvenance(it.provenance)) continue;
		out.push(it);
	}
	return dedupeByStructuralRelationshipKey(out);
}

function isDeclaredRelationshipProvenance(p: string): p is DeclaredRelationshipProvenance {
	return (
		p === 'case_engine_case_task_cross_ref_note' ||
		p === 'case_engine_case_task_cross_ref_file' ||
		p === 'case_engine_case_task_timeline_reference' ||
		p === 'case_engine_timeline_entry_linked_image_file'
	);
}
