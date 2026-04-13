/**
 * P97 / P99 / P103 — Clear **history state** for synthesis/arrival/P103 citation handoff (read-only; no URL persistence).
 * Replaces with `{}` so `synthesisSourceNavigationIntent`, `p103CitationNavigationIntent`, and `p98DeclaredRelationshipOrigin` all clear.
 */
import { goto } from '$app/navigation';

export async function clearSynthesisNavigationPageState(pageSnapshot: { url: URL }): Promise<void> {
	const path = `${pageSnapshot.url.pathname}${pageSnapshot.url.search}`;
	await goto(path, { replaceState: true, state: {}, noScroll: true });
}
