/**
 * P41-05 — Operator-facing labels for Case Engine `occurred_at_timestamp_reconciliation` (read-only).
 */

import type { OccurredAtTimestampReconciliationState } from '$lib/apis/caseEngine';

const LABELS: Record<OccurredAtTimestampReconciliationState, string> = {
	no_model_timestamp: 'No valid model timestamp',
	no_deterministic_candidates: 'No deterministic candidates',
	exact_match: 'Exact match (model ↔ deterministic instant)',
	date_match_precision_diff: 'Same operational calendar day — precision differs',
	deterministic_more_precise:
		'Deterministic time is more specific (model at local operational midnight)',
	model_more_precise: 'Model time is more specific (deterministic is date-only)',
	conflict: 'Conflict — compare manually',
	deterministic_ambiguous: 'Deterministic date ambiguous in source',
	deterministic_partial_only: 'Only partial / incomplete deterministic time in text',
	unresolved: 'Unresolved comparison'
};

/** Badge palette aligned with review metadata (not success/failure). */
const BADGE: Record<OccurredAtTimestampReconciliationState, string> = {
	no_model_timestamp: 'bg-amber-100/90 text-amber-950 dark:bg-amber-950/40 dark:text-amber-100',
	no_deterministic_candidates: 'bg-gray-100/90 text-gray-800 dark:bg-gray-800/80 dark:text-gray-100',
	exact_match: 'bg-emerald-100/90 text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-100',
	date_match_precision_diff:
		'bg-sky-100/90 text-sky-950 dark:bg-sky-950/40 dark:text-sky-100',
	deterministic_more_precise:
		'bg-violet-100/90 text-violet-950 dark:bg-violet-950/40 dark:text-violet-100',
	model_more_precise:
		'bg-violet-100/90 text-violet-950 dark:bg-violet-950/40 dark:text-violet-100',
	conflict: 'bg-rose-100/90 text-rose-950 dark:bg-rose-950/40 dark:text-rose-100',
	deterministic_ambiguous:
		'bg-amber-100/90 text-amber-950 dark:bg-amber-950/40 dark:text-amber-100',
	deterministic_partial_only:
		'bg-amber-100/90 text-amber-950 dark:bg-amber-950/40 dark:text-amber-100',
	unresolved: 'bg-gray-100/90 text-gray-800 dark:bg-gray-800/80 dark:text-gray-100'
};

export function occurredAtTimestampReconciliationLabel(state: string): string {
	const k = state as OccurredAtTimestampReconciliationState;
	return LABELS[k] ?? state;
}

export function occurredAtTimestampReconciliationBadgeClass(state: string): string {
	const k = state as OccurredAtTimestampReconciliationState;
	return (
		BADGE[k] ?? 'bg-gray-100/90 text-gray-800 dark:bg-gray-800/80 dark:text-gray-100'
	);
}
