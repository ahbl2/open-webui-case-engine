// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// interface Platform {}
		interface PageState {
			/** P97-01: one-shot synthesis → source navigation intent (read-only; no URL persistence). */
			synthesisSourceNavigationIntent?: import('$lib/case/caseSynthesisSourceNavigation').SynthesisSourceNavigationIntent;
			/**
			 * P99-03: same-case **origin** record when navigating from a Phase 98 declared relationship row.
			 * Paired with `synthesisSourceNavigationIntent` for Timeline/Tasks/Files targets, or alone for the
			 * narrow notebook `?note=` route (origin only — **not** synthesis intent).
			 */
			p98DeclaredRelationshipOrigin?: {
				readonly kind: import('$lib/case/caseRecordRelationshipReadModel').DeclaredRecordKind;
				readonly id: string;
			};
		}
	}
}

export {};
