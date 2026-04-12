/**
 * P98-04 / P98-05 — Same-case navigation from declared relationship rows (read-only).
 *
 * **Default path (Phase 97):** `SynthesisSourceNavigationIntent` + `goto` with **history state only**
 * (no URL params for target ids) for **Timeline / Tasks / Files** targets. **P99-03** adds
 * `p98DeclaredRelationshipOrigin` to that state for deterministic return (same patterns; no `history.back()`).
 *
 * ### Notebook target — **narrow exception (do not generalize)**
 *
 * `DeclaredRecordKind` **`notebook_note`** is the **only** target kind that does **not** use the
 * synthesis intent / P97 history-state model. It uses **`goto('/case/:caseId/notes?note=:id')`**, aligned
 * with existing **task cross-ref → Notes** navigation — **not** because Notes share Phase 97 semantics,
 * but because that is the **pre-existing same-case read route** for notebook rows.
 *
 * **Locked rules (especially P98-05):**
 * - Treat this as a **documented one-off**, not a template for more special-case routers.
 * - **Do not** add additional ad-hoc `goto` patterns for other kinds here — extend P97 intent + builders
 *   when a target should participate in the standard drill-down model.
 * - **Notebook notes remain working drafts / supporting context** per product boundaries — this navigation
 *   must **never** imply **Notebook authority over Timeline** or merge Notes with the official record.
 *
 * Does not navigate when `navigable` is false or for unsupported file-origin strips (no rows).
 */
import type { SynthesisSourceNavigationIntent } from '$lib/case/caseSynthesisSourceNavigation';
import { synthesisDestinationPath, type GotoFn } from '$lib/case/caseSynthesisSourceNavigation';
import type { DeclaredRecordKind } from '$lib/case/caseRecordRelationshipReadModel';
import type { P98DeclaredRelationshipRow } from '$lib/case/p98DeclaredRelationshipPresentation';

/** PageState key — keep in sync with `src/app.d.ts`. */
export const P98_DECLARED_RELATIONSHIP_ORIGIN_STATE_KEY = 'p98DeclaredRelationshipOrigin' as const;

export {
	P98_DECLARED_NAVIGATE_ARIA_LABEL_BY_KIND,
	p98DeclaredRelationshipNavigateAriaLabel
} from '$lib/case/p98DeclaredRelationshipPresentation';

export function buildSynthesisIntentForDeclaredTarget(
	caseId: string,
	targetKind: DeclaredRecordKind,
	targetId: string
): SynthesisSourceNavigationIntent | null {
	const cid = caseId.trim();
	const tid = targetId.trim();
	if (!cid || !tid) return null;
	if (targetKind === 'notebook_note') return null;
	switch (targetKind) {
		case 'timeline_entry':
			return {
				v: 1,
				case_id: cid,
				authority: 'authoritative',
				source_kind: 'timeline_entry',
				source_record_id: tid,
				destination_surface: 'timeline'
			};
		case 'case_task':
			return {
				v: 1,
				case_id: cid,
				authority: 'supporting',
				source_kind: 'task',
				source_record_id: tid,
				destination_surface: 'tasks'
			};
		case 'case_file':
			return {
				v: 1,
				case_id: cid,
				authority: 'supporting',
				source_kind: 'case_file',
				source_record_id: tid,
				destination_surface: 'files'
			};
		default: {
			const _e: never = targetKind;
			return _e;
		}
	}
}

/**
 * Navigates to the declared target when {@link P98DeclaredRelationshipRow.navigable} is true.
 * No-op for non-navigable rows (unavailable targets, empty ids).
 *
 * **P99-03:** `origin` is the record the user navigated **from** (same case). It is written to history
 * state for deterministic return — **not** `history.back()`, not browser-storage.
 */
export async function navigateFromDeclaredRelationshipRow(
	gotoFn: GotoFn,
	caseId: string,
	row: Pick<P98DeclaredRelationshipRow, 'target_kind' | 'target_id' | 'navigable'>,
	origin: { kind: DeclaredRecordKind; id: string }
): Promise<void> {
	if (!row.navigable) return;
	const cid = caseId.trim();
	const tid = row.target_id.trim();
	if (!cid || !tid) return;
	const oid = origin.id.trim();
	const okind = origin.kind;
	if (!oid) return;

	const originState = { [P98_DECLARED_RELATIONSHIP_ORIGIN_STATE_KEY]: { kind: okind, id: oid } };

	/* Notebook: sole non–P97-intent branch — see module docblock “narrow exception”. */
	if (row.target_kind === 'notebook_note') {
		await gotoFn(`/case/${encodeURIComponent(cid)}/notes?note=${encodeURIComponent(tid)}`, {
			noScroll: false,
			state: originState
		});
		return;
	}

	const intent = buildSynthesisIntentForDeclaredTarget(cid, row.target_kind, tid);
	if (!intent) return;
	await gotoFn(synthesisDestinationPath(cid, intent.destination_surface), {
		state: { synthesisSourceNavigationIntent: intent, ...originState }
	});
}
