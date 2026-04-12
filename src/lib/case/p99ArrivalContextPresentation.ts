/**
 * P99-02 / P99-03 — Thin presentation helpers for arrival UI (no contract duplication).
 *
 * Maps ephemeral navigation state to {@link ArrivalContext} via P99-01 only — **no** fallback strings,
 * **no** UI-side reinterpretation of `arrived_via`.
 */
import type { DeclaredRecordKind } from '$lib/case/caseRecordRelationshipReadModel';
import type { SynthesisSourceNavigationIntent, SynthesisDestinationSurface } from '$lib/case/caseSynthesisSourceNavigation';
import {
	buildArrivalContextFromNavigationState,
	filterValidArrivalContext,
	type ArrivalContext
} from '$lib/case/p99ArrivalContextReadModel';

/** Subset of `App.PageState` used for P99 arrival (keep keys aligned with `src/app.d.ts`). */
export type P99ArrivalPageState = {
	synthesisSourceNavigationIntent?: SynthesisSourceNavigationIntent | null;
	p98DeclaredRelationshipOrigin?: { readonly kind: DeclaredRecordKind; readonly id: string } | null;
};

/**
 * P99-03 — Builds arrival context from history state: **p98_declared** when intent + origin are both
 * present (Phase 98 declared navigation); otherwise **p97_synthesis_intent** when intent alone matches
 * the destination surface. **No** fabrication; **no** `origin`-only branch here (Notes `?note=` stays
 * {@link arrivalContextFromNoteQueryParam}).
 */
export function arrivalContextFromPageState(
	state: P99ArrivalPageState | null | undefined,
	caseId: string,
	destinationSurface: SynthesisDestinationSurface
): ArrivalContext | null {
	const intent = state?.synthesisSourceNavigationIntent ?? null;
	const origin = state?.p98DeclaredRelationshipOrigin ?? null;

	if (intent && origin) {
		if (intent.destination_surface !== destinationSurface) return null;
		return filterValidArrivalContext(
			buildArrivalContextFromNavigationState(
				{ kind: 'p98_declared', intent, origin: { kind: origin.kind, id: origin.id } },
				caseId
			)
		);
	}

	if (intent) {
		return arrivalContextFromSynthesisPageState(intent, caseId, destinationSurface);
	}

	return null;
}

/**
 * When `synthesisSourceNavigationIntent` is present and matches `destinationSurface`, returns a **valid**
 * filtered context, or `null`. Does **not** coerce unknown modes.
 */
export function arrivalContextFromSynthesisPageState(
	intent: SynthesisSourceNavigationIntent | null | undefined,
	caseId: string,
	destinationSurface: SynthesisDestinationSurface
): ArrivalContext | null {
	if (!intent) return null;
	if (intent.destination_surface !== destinationSurface) return null;
	return filterValidArrivalContext(
		buildArrivalContextFromNavigationState({ kind: 'p97_synthesis_intent', intent }, caseId)
	);
}

/** Same-case note deep link from URL query only — no synthesis intent. */
export function arrivalContextFromNoteQueryParam(caseId: string, noteParam: string | null): ArrivalContext | null {
	const tid = (noteParam ?? '').trim();
	if (!tid) return null;
	return filterValidArrivalContext(
		buildArrivalContextFromNavigationState({ kind: 'p98_note_goto', caseId, noteId: tid }, caseId)
	);
}

/**
 * **Snapshot** while `state` holds a matching handoff; **preserves** `previous` after history state is cleared
 * (read-only memory; not `sessionStorage`). **P99-03:** prefers {@link arrivalContextFromPageState} so
 * declared-relationship + origin survives intent clear when the snapshot already captured it.
 */
export function nextP99ArrivalSnapshot(
	state: P99ArrivalPageState | null | undefined,
	caseId: string,
	destinationSurface: SynthesisDestinationSurface,
	previous: ArrivalContext | null
): ArrivalContext | null {
	const next = arrivalContextFromPageState(state, caseId, destinationSurface);
	if (next) return next;
	return previous;
}
