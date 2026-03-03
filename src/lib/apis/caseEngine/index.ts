/**
 * Case Engine API (Ticket 5) – separate from WebUI backend.
 * Proxied at /case-api by Caddy.
 */
import { CASE_ENGINE_BASE_URL } from '$lib/constants';

export type CaseEngineScope = 'case' | 'CID' | 'SIU' | 'ALL';
export type CaseEngineCitation = { type: 'entry' | 'file'; id: string };

export interface CaseEngineCase {
	id: string;
	case_number: string;
	title: string;
	unit: string;
	status: string;
	created_at?: string;
	[key: string]: unknown;
}

export async function login(name: string, password: string): Promise<{ token: string; user: { id: string; name: string; role: string } }> {
	const res = await fetch(`${CASE_ENGINE_BASE_URL}/auth/login`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ name, password })
	});
	const data = await res.json().catch(() => ({}));
	if (!res.ok) {
		throw new Error(data?.error ?? `Login failed (${res.status})`);
	}
	return data;
}

export async function listCases(unit: 'CID' | 'SIU' | 'ALL', token: string): Promise<CaseEngineCase[]> {
	const res = await fetch(`${CASE_ENGINE_BASE_URL}/cases?unit=${unit}`, {
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${token}`
		}
	});
	const data = await res.json().catch(() => ({}));
	if (!res.ok) {
		throw new Error(data?.error ?? `Failed to list cases (${res.status})`);
	}
	return Array.isArray(data) ? data : [];
}

export async function askCase(
	caseId: string,
	question: string,
	scope: CaseEngineScope,
	token: string
): Promise<{ answer: string; citations: CaseEngineCitation[] }> {
	const res = await fetch(`${CASE_ENGINE_BASE_URL}/cases/${caseId}/ask`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${token}`
		},
		body: JSON.stringify({ question, scope })
	});
	const data = await res.json().catch(() => ({}));
	if (!res.ok) {
		throw new Error(data?.error ?? `Ask failed (${res.status})`);
	}
	return data;
}
