/**
 * P97 / P99 — Clear **history state** for synthesis/arrival handoff (read-only; no URL persistence).
 * Replaces with `{}` so `synthesisSourceNavigationIntent` and `p98DeclaredRelationshipOrigin` both clear.
 */
import { goto } from '$app/navigation';

export async function clearSynthesisNavigationPageState(pageSnapshot: { url: URL }): Promise<void> {
	const path = `${pageSnapshot.url.pathname}${pageSnapshot.url.search}`;
	await goto(path, { replaceState: true, state: {}, noScroll: true });
}
