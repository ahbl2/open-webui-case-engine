/**
 * P132-05 — Read-only governance listing (GET /admin/governance/users). No client permission logic.
 */
import { CASE_ENGINE_BASE_URL } from '$lib/constants';

export type GovernanceUserRow = {
	user_id: string;
	role: string;
	unit: string;
};

export type GovernanceUsersResult =
	| { ok: true; users: GovernanceUserRow[] }
	| { ok: false };

export async function fetchGovernanceUsers(token: string): Promise<GovernanceUsersResult> {
	const t = String(token ?? '').trim();
	if (!t) return { ok: false };

	const res = await fetch(`${CASE_ENGINE_BASE_URL}/admin/governance/users`, {
		method: 'GET',
		cache: 'no-store',
		headers: {
			Authorization: `Bearer ${t}`
		}
	});

	if (res.status === 404) return { ok: false };

	if (!res.ok) return { ok: false };

	const body = (await res.json().catch(() => ({}))) as { data?: { users?: unknown } };
	const users = body?.data?.users;
	if (!Array.isArray(users)) return { ok: false };

	return { ok: true, users: users as GovernanceUserRow[] };
}
