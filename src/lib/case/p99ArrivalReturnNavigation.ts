/**
 * P99-03 — Deterministic return to the **origin** record when {@link ArrivalContext.is_returnable} is true.
 *
 * - **No** `history.back()`, **no** `sessionStorage` / `localStorage`, **no** stacked return chains.
 * - Reuses Phase 97 `navigateToSynthesisSource` for Timeline / Tasks / Files; **narrow** same-case
 *   `?note=` for `notebook_note` origin only (not synthesis intent — do not convert Notes into P97 intent).
 */
import { navigateToSynthesisSource, type GotoFn } from '$lib/case/caseSynthesisSourceNavigation';
import { buildSynthesisIntentForDeclaredTarget } from '$lib/case/p98DeclaredRelationshipNavigation';
import type { ArrivalContext } from '$lib/case/p99ArrivalContextReadModel';
import { ARRIVAL_UI_COPY } from '$lib/case/p99ArrivalContextReadModel';

/** Minimal visible label — not workflow / CTA phrasing. */
export const P99_RETURN_ACTION_LABEL = 'Return' as const;

/** Factual `aria-label` for the return control (contract ids only). */
export function arrivalReturnAriaLabel(context: ArrivalContext): string {
	const sk = context.source_kind;
	const sid = (context.source_id ?? '').trim();
	if (!sk || !sid) return P99_RETURN_ACTION_LABEL;
	const kindLabel =
		sk === 'timeline_entry'
			? ARRIVAL_UI_COPY.targetTimeline
			: sk === 'case_task'
				? ARRIVAL_UI_COPY.targetTask
				: sk === 'case_file'
					? ARRIVAL_UI_COPY.targetFile
					: sk === 'notebook_note'
						? ARRIVAL_UI_COPY.targetNotebook
						: '';
	if (!kindLabel) return P99_RETURN_ACTION_LABEL;
	return `${P99_RETURN_ACTION_LABEL} · ${kindLabel} · ${sid}`;
}

export async function navigateArrivalReturnToSource(context: ArrivalContext, gotoFn: GotoFn): Promise<void> {
	if (!context.is_valid || !context.is_returnable) return;
	const sk = context.source_kind;
	const sid = context.source_id;
	const cid = context.case_id.trim();
	if (!sk || !cid) return;
	const id = (sid ?? '').trim();
	if (!id) return;

	if (sk === 'notebook_note') {
		await gotoFn(`/case/${encodeURIComponent(cid)}/notes?note=${encodeURIComponent(id)}`, {
			noScroll: false
		});
		return;
	}

	const intent = buildSynthesisIntentForDeclaredTarget(cid, sk, id);
	if (!intent) return;
	await navigateToSynthesisSource(intent, gotoFn);
}
