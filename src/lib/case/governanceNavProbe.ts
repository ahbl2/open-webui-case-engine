/**
 * P132-05 — Server-driven eligibility for Governance GNAV (GET success ⇒ show link). No role parsing in UI.
 */
import { browser } from '$app/environment';
import { derived } from 'svelte/store';
import { get } from 'svelte/store';
import type { Unsubscriber } from 'svelte/store';
import { caseEngineToken, caseEngineUser, governanceNavEligible } from '$lib/stores';
import { fetchGovernanceUsers } from './governance';

let detachProbe: Unsubscriber | undefined;

export function initGovernanceNavProbe(): void {
	if (!browser) return;
	detachProbe?.();
	detachProbe = undefined;

	const probeKey = derived(
		[caseEngineToken, caseEngineUser],
		([tok, u]) => ({
			token: String(tok ?? '').trim(),
			uid: u?.id ?? ''
		})
	);

	detachProbe = probeKey.subscribe(({ token, uid }) => {
		governanceNavEligible.set(null);
		if (!token || !uid) {
			governanceNavEligible.set(false);
			return;
		}
		void fetchGovernanceUsers(token).then((r) => {
			if (get(caseEngineToken)?.trim() !== token || get(caseEngineUser)?.id !== uid) return;
			governanceNavEligible.set(r.ok);
		});
	});
}
