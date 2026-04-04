/**
 * Case Engine API (Ticket 5) – separate from WebUI backend.
 * Proxied at /case-api by Caddy.
 */
import { v4 as uuidv4 } from 'uuid';
import { CASE_ENGINE_BASE_URL } from '$lib/constants';
import type {
	AskFactItem,
	AskInferenceItem,
	AskIntegrityPresentation
} from '$lib/utils/askIntegrityUi';
import { normalizeAskFactInferenceArrays } from '$lib/utils/askIntegrityUi';
import { isTransportFailure, safeReadFetch } from './retryPolicy';
import {
	parseStructuredNotesExtractionPreviewData,
	type StructuredNotesExtractionPreviewData
} from '$lib/types/structuredNotes/extractionPreview';
import {
	parseNarrativeIntegrityPayload,
	type NarrativeIntegrityResult
} from '$lib/caseNotes/narrativePreviewReviewUi';

export type { AskFactItem, AskInferenceItem, AskIntegrityPresentation } from '$lib/utils/askIntegrityUi';
export type { StructuredNotesExtractionPreviewData } from '$lib/types/structuredNotes/extractionPreview';

/** P20-PRE-06: one `request_id` per logical client operation; `safeReadFetch` retries reuse the same `X-Request-Id` (no attempt-level id in Pre-20). Echoed by Case Engine. */
function newCaseEngineRequestId(): string {
	if (typeof globalThis.crypto !== 'undefined' && typeof globalThis.crypto.randomUUID === 'function') {
		return globalThis.crypto.randomUUID();
	}
	return uuidv4();
}

function responseRequestId(res: Response): string | undefined {
	return res.headers.get('x-request-id') ?? res.headers.get('X-Request-Id') ?? undefined;
}

/** Extract error message from API response; canonical `{ success: false, error: { message } }` first, then legacy string `error`. */
function extractApiErrorMessage(data: unknown, fallback: string): string {
	if (data != null && typeof data === 'object') {
		const d = data as Record<string, unknown>;
		if (d.error != null && typeof d.error === 'object' && typeof (d.error as Record<string, unknown>).message === 'string') {
			return (d.error as Record<string, unknown>).message as string;
		}
		if (typeof d.error === 'string') return d.error;
		if (typeof d.message === 'string') return d.message;
	}
	return fallback;
}

function extractApiErrorCode(data: unknown): string | undefined {
	if (data != null && typeof data === 'object') {
		const d = data as Record<string, unknown>;
		if (d.error != null && typeof d.error === 'object') {
			const c = (d.error as Record<string, unknown>).code;
			if (typeof c === 'string') return c;
		}
	}
	return undefined;
}

function extractApiErrorDetails(data: unknown): unknown {
	if (data != null && typeof data === 'object') {
		const d = data as Record<string, unknown>;
		if (d.error != null && typeof d.error === 'object' && 'details' in d.error) {
			return (d.error as Record<string, unknown>).details;
		}
	}
	return undefined;
}

function normalizeCaseNumber(input: string): string {
	return String(input ?? '').trim().toUpperCase();
}

function normalizeIncidentDate(input: unknown): string | undefined {
	if (input == null) return undefined;
	const value = String(input).trim();
	return value.length > 0 ? value : undefined;
}

function isValidIncidentDate(input: string): boolean {
	if (!/^\d{4}-\d{2}-\d{2}$/.test(input)) return false;
	const [yearRaw, monthRaw, dayRaw] = input.split('-');
	const year = Number(yearRaw);
	const month = Number(monthRaw);
	const day = Number(dayRaw);
	if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return false;
	if (month < 1 || month > 12 || day < 1 || day > 31) return false;
	const dt = new Date(Date.UTC(year, month - 1, day));
	return (
		dt.getUTCFullYear() === year &&
		dt.getUTCMonth() === month - 1 &&
		dt.getUTCDate() === day
	);
}

/**
 * P20-PRE-04: Typed Case Engine HTTP / contract failures for UI classification (status + optional API code).
 * `details` may hold `{ citations }` for 422 ask responses (see CaseAiAskTab / CaseCrossCaseSearch).
 */
export class CaseEngineRequestError extends Error {
	override readonly name = 'CaseEngineRequestError';
	constructor(
		message: string,
		public readonly httpStatus?: number,
		public readonly errorCode?: string,
		public readonly details?: unknown,
		/** P20-PRE-06: same id as the logical operation’s `X-Request-Id` (retries reuse it). */
		public readonly requestId?: string
	) {
		super(message);
		Object.setPrototypeOf(this, new.target.prototype);
	}

	/** Optional parse-error citations from API (422 ask paths). */
	get citations(): unknown {
		if (this.details != null && typeof this.details === 'object' && 'citations' in this.details) {
			return (this.details as { citations?: unknown }).citations;
		}
		return undefined;
	}
}

/**
 * P20-PRE-02: After HTTP OK, parse body — canonical envelope is primary; legacy only when `success` is absent.
 * - `success === true` → require `data` (else throw)
 * - `success === false` → throw with `error.message`
 * - no `success` key → treat whole body as legacy payload `T`
 */
function unwrapEnvelopeCanonicalFirst<T>(data: unknown, context: string): T {
	if (data == null || typeof data !== 'object') {
		throw new Error(`${context}: invalid response body`);
	}
	const d = data as Record<string, unknown>;
	if (!('success' in d)) {
		return data as T;
	}
	if (d.success === true) {
		if (!('data' in d)) {
			throw new Error(`${context}: invalid envelope (success true but missing data)`);
		}
		return d.data as T;
	}
	if (d.success === false) {
		throw new Error(extractApiErrorMessage(data, `${context} failed`));
	}
	throw new Error(`${context}: invalid envelope (success must be boolean)`);
}

export type CaseEngineScope = 'case' | 'CID' | 'SIU' | 'ALL';
export type CaseEngineUnit = 'CID' | 'SIU';
export type CaseEngineCitation = { type: 'entry' | 'file'; id: string };

export interface CaseEngineCase {
	id: string;
	case_number: string;
	title: string;
	unit: string;
	status: string;
	incident_date?: string | null;
	created_at?: string;
	[key: string]: unknown;
}

/**
 * P19.75-02: Explicit failure classification for POST /auth/owui/browser-resolve.
 * Distinguishes true network failure from HTTP 429 / 401 / 5xx so the UI does not
 * treat a reachable but rate-limited Case Engine as “service unavailable.”
 */
export type BrowserResolveFailureClassification =
	| 'network_unreachable'
	| 'rate_limited'
	| 'unauthorized'
	| 'server_error'
	| 'client_error';

export class BrowserResolveFailure extends Error {
	override readonly name = 'BrowserResolveFailure';
	constructor(
		public readonly classification: BrowserResolveFailureClassification,
		message: string,
		public readonly httpStatus?: number,
		public readonly body?: unknown
	) {
		super(message);
		Object.setPrototypeOf(this, new.target.prototype);
	}
}

function classifyBrowserResolveHttpStatus(status: number): BrowserResolveFailureClassification {
	if (status === 429) return 'rate_limited';
	if (status === 401 || status === 403) return 'unauthorized';
	if (status >= 500 && status <= 599) return 'server_error';
	if (status >= 400 && status <= 499) return 'client_error';
	return 'server_error';
}

/**
 * P19-05: Browser-accessible authorization state resolution.
 * Called once per session after OWUI login to determine Case Engine access state
 * without requiring a separate Case Engine login step.
 *
 * P19 Auth Bridge: When state is 'active', backend also returns a token for Case Engine API calls.
 *
 * P19.75-02: Non-OK HTTP responses throw {@link BrowserResolveFailure} with a stable classification.
 * Only {@link BrowserResolveFailureClassification} `network_unreachable` should map to /access-unavailable.
 *
 * Security note: this endpoint trusts the reverse proxy (Caddy/Vite) to enforce
 * OWUI session authentication before requests reach Case Engine.
 */
export async function browserResolveOwuiAuth(params: {
	owui_user_id: string;
	username_or_email: string;
	display_name?: string;
}): Promise<{
	state: string;
	user: null | { id: string; role: string; units: string[]; capabilities: string[] };
	reason?: string;
	token?: string;
}> {
	const url = `${CASE_ENGINE_BASE_URL}/auth/owui/browser-resolve`;
	const body = JSON.stringify(params);
	const outboundRequestId = newCaseEngineRequestId();
	/** P20-PRE-05 corrective: POST mutating bootstrap — single-shot (no auto-retry; dropped response ≠ safe replay). */
	let res: Response;
	try {
		res = await fetch(url, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json', 'X-Request-Id': outboundRequestId },
			body
		});
	} catch (e) {
		const msg = e instanceof Error ? e.message : String(e);
		if (isTransportFailure(e)) {
			throw new BrowserResolveFailure('network_unreachable', msg, undefined, undefined);
		}
		throw e;
	}
	const data = await res.json().catch(() => ({}));
	if (!res.ok) {
		const msg = extractApiErrorMessage(
			data,
			`Failed to resolve Case Engine auth state (${res.status})`
		);
		throw new BrowserResolveFailure(classifyBrowserResolveHttpStatus(res.status), msg, res.status, data);
	}
	return data;
}

const AUTH_RESOLVE_RETRY_DELAYS_MS = [500, 1500, 3000] as const;
const AUTH_RESOLVE_RATE_LIMIT_COOLDOWN_MS = 4000;
const AUTH_RATE_LIMIT_USER_MESSAGE = 'System is temporarily busy. Please wait a moment and try again.';

let inFlightAuthPromise: Promise<{
	state: string;
	user: null | { id: string; role: string; units: string[]; capabilities: string[] };
	reason?: string;
	token?: string;
}> | null = null;
let authResolveCooldownUntil = 0;

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function resolveBrowserAuthOnce(
	params: {
		owui_user_id: string;
		username_or_email: string;
		display_name?: string;
	},
	options?: { force?: boolean }
): Promise<{
	state: string;
	user: null | { id: string; role: string; units: string[]; capabilities: string[] };
	reason?: string;
	token?: string;
}> {
	if (inFlightAuthPromise) return inFlightAuthPromise;

	const force = options?.force === true;
	if (!force && Date.now() < authResolveCooldownUntil) {
		console.warn('[AUTH] rate limited');
		throw new BrowserResolveFailure('rate_limited', AUTH_RATE_LIMIT_USER_MESSAGE, 429);
	}

	inFlightAuthPromise = (async () => {
		let retryIndex = 0;
		while (true) {
			try {
				return await browserResolveOwuiAuth(params);
			} catch (err) {
				const isBrowserResolveFailure = err instanceof BrowserResolveFailure;
				if (!isBrowserResolveFailure) throw err;

				const retryable =
					err.classification === 'rate_limited' ||
					err.classification === 'network_unreachable' ||
					err.classification === 'server_error';
				if (!retryable || retryIndex >= AUTH_RESOLVE_RETRY_DELAYS_MS.length) {
					if (err.classification === 'rate_limited') {
						authResolveCooldownUntil = Date.now() + AUTH_RESOLVE_RATE_LIMIT_COOLDOWN_MS;
						throw new BrowserResolveFailure(
							'rate_limited',
							AUTH_RATE_LIMIT_USER_MESSAGE,
							err.httpStatus,
							err.body
						);
					}
					throw err;
				}

				const delay = AUTH_RESOLVE_RETRY_DELAYS_MS[retryIndex];
				const waitMs =
					err.classification === 'rate_limited'
						? Math.max(delay, AUTH_RESOLVE_RATE_LIMIT_COOLDOWN_MS)
						: delay;
				if (err.classification === 'rate_limited') {
					authResolveCooldownUntil = Date.now() + waitMs;
					console.warn('[AUTH] rate limited');
				}
				console.warn('[AUTH] retrying with backoff', retryIndex + 1, waitMs);
				await sleep(waitMs);
				retryIndex += 1;
			}
		}
	})().finally(() => {
		inFlightAuthPromise = null;
	});

	return inFlightAuthPromise;
}

export async function login(name: string, password: string): Promise<{ token: string; user: { id: string; name: string; role: string } }> {
	const res = await fetch(`${CASE_ENGINE_BASE_URL}/auth/login`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ name, password })
	});
	const data = await res.json().catch(() => ({}));
	if (!res.ok) {
		throw new Error(extractApiErrorMessage(data, `Login failed (${res.status})`));
	}
	return unwrapEnvelopeCanonicalFirst<{ token: string; user: { id: string; name: string; role: string } }>(
		data,
		'login'
	);
}

/** Case Engine OWUI user list (admin only). status filter optional: pending | active | disabled */
export interface CaseEngineOwuiUserRow {
	owui_user_id: string;
	username_or_email: string;
	display_name: string | null;
	status: string;
	role: string;
	created_at: string;
	/** Matches backend UnitAssignment[]: 'CID' | 'SIU'. No adapter — direct deserialization. */
	units: CaseEngineUnit[];
	/** P27-11: True only for the single protected System Admin. Backend truth — never inferred. */
	is_system_admin: boolean;
}

export async function listCaseEngineOwuiUsers(
	token: string,
	status?: 'pending' | 'active' | 'disabled'
): Promise<CaseEngineOwuiUserRow[]> {
	const qs = status ? `?status=${status}` : '';
	const res = await fetch(`${CASE_ENGINE_BASE_URL}/auth/owui/users${qs}`, {
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${token}`
		}
	});
	const data = await res.json().catch(() => ({}));
	if (!res.ok) {
		throw new Error(data?.error ?? `Failed to list users (${res.status})`);
	}
	return Array.isArray(data) ? data : [];
}

export async function updateCaseEngineOwuiUserStatus(
	token: string,
	owuiUserId: string,
	status: 'pending' | 'active' | 'disabled'
): Promise<{ state: string; user: unknown }> {
	const res = await fetch(`${CASE_ENGINE_BASE_URL}/auth/owui/users/${encodeURIComponent(owuiUserId)}/status`, {
		method: 'PUT',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${token}`
		},
		body: JSON.stringify({ status })
	});
	const data = await res.json().catch(() => ({}));
	if (!res.ok) {
		throw new Error(data?.error ?? `Failed to update status (${res.status})`);
	}
	return data;
}

/**
 * P27-16: Admin-triggered CE profile provision for an OWUI user with no CE profile.
 * Returns the newly created CE user row on success.
 * Throws if the user already has a profile (409) or required fields are missing.
 */
export async function provisionCeUser(
	token: string,
	owuiUserId: string,
	usernameOrEmail: string,
	displayName?: string | null,
	/** P27-22: CE role for the provisioned profile. Defaults to 'detective'. Pass 'admin' for OWUI admins. */
	ceRole?: 'admin' | 'detective'
): Promise<CaseEngineOwuiUserRow> {
	const res = await fetch(
		`${CASE_ENGINE_BASE_URL}/auth/owui/users/${encodeURIComponent(owuiUserId)}/provision`,
		{
			method: 'POST',
			headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
			body: JSON.stringify({
				username_or_email: usernameOrEmail,
				display_name: displayName ?? null,
				...(ceRole ? { role: ceRole } : {})
			})
		}
	);
	const data = await res.json().catch(() => ({}));
	if (!res.ok) throw new Error(extractApiErrorMessage(data, `Failed to provision CE profile (${res.status})`));
	return data as CaseEngineOwuiUserRow;
}

/**
 * P27-23b: Read-only backend detection of admin-role mismatches.
 *
 * Pass `owuiAdminIds` (OWUI admin user IDs from the OWUI user list) for confirmed mode:
 * the backend filters CE users to those IDs and returns those with CE role != 'admin'.
 *
 * Omit `owuiAdminIds` for candidates mode: the backend returns all CE detective users.
 * CE cannot independently verify OWUI roles in this mode (owui_role = 'unknown').
 */
export async function detectCeAdminRoleMismatches(
	token: string,
	owuiAdminIds?: string[]
): Promise<{
	count: number;
	users: Array<{ owui_user_id: string; username_or_email: string; ce_role: string; owui_role: string }>;
	detection_mode: 'confirmed' | 'candidates';
}> {
	const qs =
		owuiAdminIds && owuiAdminIds.length > 0
			? `?owui_admin_ids=${owuiAdminIds.map(encodeURIComponent).join(',')}`
			: '';
	const res = await fetch(
		`${CASE_ENGINE_BASE_URL}/auth/owui/repair/admin-role-alignment/mismatches${qs}`,
		{ headers: { Authorization: `Bearer ${token}` } }
	);
	const data = await res.json().catch(() => ({}));
	if (!res.ok)
		throw new Error(extractApiErrorMessage(data, `Failed to detect mismatches (${res.status})`));
	return data as {
		count: number;
		users: Array<{ owui_user_id: string; username_or_email: string; ce_role: string; owui_role: string }>;
		detection_mode: 'confirmed' | 'candidates';
	};
}

/** P27-23: Repair OWUI-admin / CE-detective role mismatches for the supplied OWUI user IDs. */
export async function repairCeAdminRoleAlignment(
	token: string,
	owuiUserIds: string[]
): Promise<{ repaired: string[]; skipped: string[]; not_found: string[] }> {
	const res = await fetch(`${CASE_ENGINE_BASE_URL}/auth/owui/repair/admin-role-alignment`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
		body: JSON.stringify({ owui_user_ids: owuiUserIds })
	});
	const data = await res.json().catch(() => ({}));
	if (!res.ok) throw new Error(extractApiErrorMessage(data, `Failed to repair admin role alignment (${res.status})`));
	return data as { repaired: string[]; skipped: string[]; not_found: string[] };
}

/** P27-11: Transfer System Admin role to another active CE admin. */
export async function transferCeSystemAdmin(token: string, targetOwuiUserId: string): Promise<void> {
	const res = await fetch(`${CASE_ENGINE_BASE_URL}/auth/owui/transfer-system-admin`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
		body: JSON.stringify({ target_owui_user_id: targetOwuiUserId })
	});
	const data = await res.json().catch(() => ({}));
	if (!res.ok) throw new Error(data?.error ?? `Failed to transfer System Admin (${res.status})`);
}

export async function updateCaseEngineOwuiUserRole(
	token: string,
	owuiUserId: string,
	role: 'detective' | 'admin'
): Promise<{ state: string; user: unknown }> {
	const res = await fetch(`${CASE_ENGINE_BASE_URL}/auth/owui/users/${encodeURIComponent(owuiUserId)}/role`, {
		method: 'PUT',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${token}`
		},
		body: JSON.stringify({ role })
	});
	const data = await res.json().catch(() => ({}));
	if (!res.ok) {
		throw new Error(data?.error ?? `Failed to update role (${res.status})`);
	}
	return data;
}

export async function updateCaseEngineOwuiUserUnits(
	token: string,
	owuiUserId: string,
	units: string[]
): Promise<{ state: string; user: unknown }> {
	const res = await fetch(`${CASE_ENGINE_BASE_URL}/auth/owui/users/${encodeURIComponent(owuiUserId)}/units`, {
		method: 'PUT',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${token}`
		},
		body: JSON.stringify({ units })
	});
	const data = await res.json().catch(() => ({}));
	if (!res.ok) {
		throw new Error(data?.error ?? `Failed to update units (${res.status})`);
	}
	return data;
}

export async function updateCaseEngineOwuiUserCapabilities(
	token: string,
	owuiUserId: string,
	capabilities: string[]
): Promise<{ state: string; user: unknown }> {
	const res = await fetch(`${CASE_ENGINE_BASE_URL}/auth/owui/users/${encodeURIComponent(owuiUserId)}/capabilities`, {
		method: 'PUT',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${token}`
		},
		body: JSON.stringify({ capabilities })
	});
	const data = await res.json().catch(() => ({}));
	if (!res.ok) {
		throw new Error(data?.error ?? `Failed to update capabilities (${res.status})`);
	}
	return data;
}

/** P27-02: Legacy API user row (users table). */
export interface CaseEngineLegacyUserRow {
	id: string;
	name: string;
	role: string;
	status: 'active' | 'disabled';
	created_at: string;
}

/** P27-02: List all legacy API users (admin only). */
export async function listCaseEngineLegacyUsers(token: string): Promise<CaseEngineLegacyUserRow[]> {
	const res = await fetch(`${CASE_ENGINE_BASE_URL}/admin/users`, {
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${token}`
		}
	});
	const data = await res.json().catch(() => ({}));
	if (!res.ok) {
		throw new Error(data?.error ?? `Failed to list API users (${res.status})`);
	}
	return Array.isArray(data?.data) ? data.data : [];
}

/** P27-02: Disable a legacy API user (admin only). */
export async function disableCaseEngineLegacyUser(
	token: string,
	userId: string
): Promise<CaseEngineLegacyUserRow> {
	const res = await fetch(`${CASE_ENGINE_BASE_URL}/admin/users/${encodeURIComponent(userId)}/disable`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${token}`
		}
	});
	const data = await res.json().catch(() => ({}));
	if (!res.ok) {
		throw new Error(data?.error ?? `Failed to disable user (${res.status})`);
	}
	return data?.data ?? data;
}

/** P27-02: Enable a legacy API user (admin only). */
export async function enableCaseEngineLegacyUser(
	token: string,
	userId: string
): Promise<CaseEngineLegacyUserRow> {
	const res = await fetch(`${CASE_ENGINE_BASE_URL}/admin/users/${encodeURIComponent(userId)}/enable`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${token}`
		}
	});
	const data = await res.json().catch(() => ({}));
	if (!res.ok) {
		throw new Error(data?.error ?? `Failed to enable user (${res.status})`);
	}
	return data?.data ?? data;
}

/** P27-03: Admin case row (minimal, for case selector). */
export interface AdminCaseRow {
	id: string;
	case_number: string;
	title: string;
	unit: string;
	status: string;
	created_at: string;
}

/** P27-03: Assignment enriched with user name and disabled status. */
export interface AdminCaseAssignment {
	id: string;
	case_id: string;
	user_id: string;
	principal_type: string;
	is_lead: boolean;
	assigned_by: string;
	created_at: string;
	revoked_at: string | null;
	revoked_by: string | null;
	revoke_reason: string | null;
	user_name: string | null;
	user_status: string | null;
}

/** P27-03: List all non-deleted cases for admin selection (admin only). */
export async function listAdminCases(token: string): Promise<AdminCaseRow[]> {
	const res = await fetch(`${CASE_ENGINE_BASE_URL}/admin/cases`, {
		headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
	});
	const data = await res.json().catch(() => ({}));
	if (!res.ok) throw new Error(data?.error ?? `Failed to list cases (${res.status})`);
	return Array.isArray(data?.data) ? data.data : [];
}

/** P27-03: Get assignments for a case enriched with user name + status (admin only). */
export async function getAdminCaseAssignments(
	token: string,
	caseId: string
): Promise<AdminCaseAssignment[]> {
	const res = await fetch(
		`${CASE_ENGINE_BASE_URL}/admin/cases/${encodeURIComponent(caseId)}/assignments`,
		{ headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` } }
	);
	const data = await res.json().catch(() => ({}));
	if (!res.ok) throw new Error(data?.error ?? `Failed to load assignments (${res.status})`);
	return Array.isArray(data?.data) ? data.data : [];
}

/** P27-03: Add a member to a case (reuses existing /cases/:id/assignments endpoint). */
export async function addCaseAssignment(
	token: string,
	caseId: string,
	userId: string,
	isLead: boolean = false
): Promise<unknown> {
	const res = await fetch(`${CASE_ENGINE_BASE_URL}/cases/${encodeURIComponent(caseId)}/assignments`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
		body: JSON.stringify({ user_id: userId, is_lead: isLead })
	});
	const data = await res.json().catch(() => ({}));
	if (!res.ok) throw new Error(data?.error ?? `Failed to add assignment (${res.status})`);
	return data;
}

/** P27-03: Remove a member from a case (reuses existing /cases/:id/assignments/:id endpoint). */
export async function revokeCaseAssignment(
	token: string,
	caseId: string,
	assignmentId: string,
	opts: { clearLead?: boolean; replacementLeadAssignmentId?: string; allowZeroAssignments?: boolean; revoke_reason?: string } = {}
): Promise<unknown> {
	const res = await fetch(
		`${CASE_ENGINE_BASE_URL}/cases/${encodeURIComponent(caseId)}/assignments/${encodeURIComponent(assignmentId)}`,
		{
			method: 'DELETE',
			headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
			body: JSON.stringify(opts)
		}
	);
	const data = await res.json().catch(() => ({}));
	if (!res.ok) throw new Error(data?.error ?? `Failed to revoke assignment (${res.status})`);
	return data;
}

/** P27-03: Set the lead on a case by assignment id (reuses /cases/:id/lead). */
export async function setCaseLead(
	token: string,
	caseId: string,
	assignmentId: string
): Promise<unknown> {
	const res = await fetch(`${CASE_ENGINE_BASE_URL}/cases/${encodeURIComponent(caseId)}/lead`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
		body: JSON.stringify({ assignment_id: assignmentId })
	});
	const data = await res.json().catch(() => ({}));
	if (!res.ok) throw new Error(data?.error ?? `Failed to set lead (${res.status})`);
	return data;
}

/** P27-03: Clear the lead on a case (reuses /cases/:id/lead DELETE). */
export async function clearCaseLead(token: string, caseId: string): Promise<void> {
	const res = await fetch(`${CASE_ENGINE_BASE_URL}/cases/${encodeURIComponent(caseId)}/lead`, {
		method: 'DELETE',
		headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
	});
	if (!res.ok) {
		const data = await res.json().catch(() => ({}));
		throw new Error(data?.error ?? `Failed to clear lead (${res.status})`);
	}
}

/** Ticket 7: Sidebar case list - minimal metadata, RBAC enforced server-side */
export async function listCasesSidebar(token: string): Promise<CaseEngineCase[]> {
	const res = await fetch(`${CASE_ENGINE_BASE_URL}/cases/sidebar`, {
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

export async function listCases(unit: 'CID' | 'SIU' | 'ALL', token: string): Promise<CaseEngineCase[]> {
	/** P20-PRE-05: GET list — safe-read retry (transient HTTP + transport). */
	const res = await safeReadFetch(
		() =>
			fetch(`${CASE_ENGINE_BASE_URL}/cases?unit=${unit}`, {
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`
				}
			}),
		'listCases'
	);
	const data = await res.json().catch(() => ({}));
	if (!res.ok) {
		throw new Error(extractApiErrorMessage(data, `Failed to list cases (${res.status})`));
	}
	const list = unwrapEnvelopeCanonicalFirst<CaseEngineCase[]>(data, 'listCases');
	return Array.isArray(list) ? list : [];
}

/** P20-PRE-02: GET /health — canonical envelope primary. */
export async function fetchCaseEngineHealth(): Promise<Record<string, unknown>> {
	/** P20-PRE-05: GET health — safe-read retry. */
	const res = await safeReadFetch(() => fetch(`${CASE_ENGINE_BASE_URL}/health`), 'fetchCaseEngineHealth');
	const data = await res.json().catch(() => ({}));
	if (!res.ok) {
		throw new Error(extractApiErrorMessage(data, `Case Engine health failed (${res.status})`));
	}
	return unwrapEnvelopeCanonicalFirst<Record<string, unknown>>(data, 'fetchCaseEngineHealth');
}

/** P20-PRE-02: GET /cases/:id — canonical envelope primary. */
export async function getCaseById(caseId: string, token: string): Promise<CaseEngineCase> {
	const outboundRequestId = newCaseEngineRequestId();
	const headers: Record<string, string> = {
		'Content-Type': 'application/json',
		Authorization: `Bearer ${token}`,
		'X-Request-Id': outboundRequestId
	};
	/** P20-PRE-05: GET case — safe-read retry. */
	const res = await safeReadFetch(
		() =>
			fetch(`${CASE_ENGINE_BASE_URL}/cases/${encodeURIComponent(caseId)}`, {
				headers
			}),
		'getCaseById'
	);
	const correlator = responseRequestId(res) ?? outboundRequestId;
	const data = await res.json().catch(() => ({}));
	if (!res.ok) {
		throw new CaseEngineRequestError(
			extractApiErrorMessage(data, `Failed to load case (${res.status})`),
			res.status,
			extractApiErrorCode(data),
			undefined,
			correlator
		);
	}
	try {
		return unwrapEnvelopeCanonicalFirst<CaseEngineCase>(data, 'getCaseById');
	} catch (e) {
		const m = e instanceof Error ? e.message : String(e);
		throw new CaseEngineRequestError(m, res.status, 'INVALID_ENVELOPE', undefined, correlator);
	}
}

/** P20-PRE-02: POST /cases — canonical envelope primary. */
export async function createCase(
	token: string,
	payload: {
		case_number: string;
		title: string;
		unit: 'CID' | 'SIU' | string;
		status?: 'OPEN' | 'CLOSED' | string;
		incident_date?: string | null;
	}
): Promise<CaseEngineCase> {
	const case_number = normalizeCaseNumber(String(payload.case_number ?? ''));
	const title = String(payload.title ?? '').trim();
	const unitRaw = String(payload.unit ?? '').trim().toUpperCase();
	const statusRaw = String(payload.status ?? 'OPEN').trim().toUpperCase();
	const incidentDateRaw = normalizeIncidentDate(payload.incident_date);
	if (!case_number) throw new Error('Case number is required.');
	if (!title) throw new Error('Title is required.');
	if (unitRaw !== 'CID' && unitRaw !== 'SIU') throw new Error('Unit must be CID or SIU.');
	if (statusRaw !== 'OPEN' && statusRaw !== 'CLOSED') throw new Error('Status must be OPEN or CLOSED.');
	if (!incidentDateRaw) throw new Error('Incident date is required.');
	if (incidentDateRaw && !isValidIncidentDate(incidentDateRaw)) {
		throw new Error('Incident date must use YYYY-MM-DD.');
	}
	const normalizedPayload = {
		case_number,
		title,
		unit: unitRaw as 'CID' | 'SIU',
		status: statusRaw as 'OPEN' | 'CLOSED',
		incident_date: incidentDateRaw
	};
	/** P20-PRE-05: POST create — mutating; no auto-retry. */
	const res = await fetch(`${CASE_ENGINE_BASE_URL}/cases`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${token}`
		},
		body: JSON.stringify(normalizedPayload)
	});
	const data = await res.json().catch(() => ({}));
	if (!res.ok) {
		throw new Error(extractApiErrorMessage(data, `Create case failed (${res.status})`));
	}
	return unwrapEnvelopeCanonicalFirst<CaseEngineCase>(data, 'createCase');
}

/** PATCH /cases/:id — case metadata edit (case_number/title/incident_date). */
export async function updateCase(
	token: string,
	caseId: string,
	payload: {
		case_number?: string;
		title?: string;
		incident_date?: string;
	}
): Promise<CaseEngineCase> {
	const case_number =
		Object.prototype.hasOwnProperty.call(payload ?? {}, 'case_number')
			? normalizeCaseNumber(String(payload.case_number ?? ''))
			: undefined;
	const title =
		Object.prototype.hasOwnProperty.call(payload ?? {}, 'title')
			? String(payload.title ?? '').trim()
			: undefined;
	const incidentDateRaw =
		Object.prototype.hasOwnProperty.call(payload ?? {}, 'incident_date')
			? normalizeIncidentDate(payload.incident_date)
			: undefined;

	if (case_number !== undefined && !case_number) throw new Error('Case number is required.');
	if (title !== undefined && !title) throw new Error('Title is required.');
	if (incidentDateRaw !== undefined && !incidentDateRaw) throw new Error('Incident date is required.');
	if (incidentDateRaw !== undefined && !isValidIncidentDate(incidentDateRaw)) {
		throw new Error('Incident date must use YYYY-MM-DD.');
	}

	const patchPayload: Record<string, string> = {};
	if (case_number !== undefined) patchPayload.case_number = case_number;
	if (title !== undefined) patchPayload.title = title;
	if (incidentDateRaw !== undefined) patchPayload.incident_date = incidentDateRaw;
	if (Object.keys(patchPayload).length === 0) {
		throw new Error('At least one field is required.');
	}

	const res = await fetch(`${CASE_ENGINE_BASE_URL}/cases/${encodeURIComponent(caseId)}`, {
		method: 'PATCH',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${token}`
		},
		body: JSON.stringify(patchPayload)
	});
	const data = await res.json().catch(() => ({}));
	if (!res.ok) {
		throw new Error(extractApiErrorMessage(data, `Update case failed (${res.status})`));
	}
	return unwrapEnvelopeCanonicalFirst<CaseEngineCase>(data, 'updateCase');
}

/** Ticket 8: AI context bundle - case + timeline + files + citations (for prompt injection) */
export interface AiContextBundle {
	case: {
		id: string;
		case_number: string;
		title: string;
		unit: string;
		status: string;
		incident_date?: string | null;
	};
	timeline: Array<{
		id: string;
		occurred_at: string;
		type: string;
		location_text: string | null;
		text_cleaned: string | null;
		text_original: string;
		created_by: string;
		created_at: string;
	}>;
	files: Array<{ id: string; original_filename: string; extracted_text_preview: string }>;
	citations: Array<
		| { kind: 'timeline'; id: string; occurred_at: string; created_by: string }
		| { kind: 'file'; id: string; original_filename: string }
	>;
}

export async function getCaseAiContext(
	caseId: string,
	token: string
): Promise<AiContextBundle | null> {
	const res = await fetch(`${CASE_ENGINE_BASE_URL}/cases/${caseId}/ai-context`, {
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${token}`
		}
	});
	if (res.status === 403 || res.status === 404) return null;
	if (!res.ok) {
		throw new Error('Failed to fetch AI context');
	}
	return res.json();
}

/** Ticket 7: Case context - metadata + recent entries */
export interface CaseContextEntry {
	id: string;
	occurred_at: string;
	type: string;
	location_text: string | null;
	text_original: string;
	created_by: string;
	created_at: string;
	/** Ticket 25: Evidence tags */
	tags?: string[];
}

export interface CaseContextResponse {
	case: {
		id: string;
		case_number: string;
		title: string;
		unit: string;
		status: string;
		incident_date?: string | null;
	};
	recent_entries: CaseContextEntry[];
}

export async function getCaseContext(caseId: string, token: string): Promise<CaseContextResponse> {
	const res = await fetch(`${CASE_ENGINE_BASE_URL}/cases/${caseId}/context`, {
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${token}`
		}
	});
	const data = await res.json().catch(() => ({}));
	if (!res.ok) {
		throw new Error(data?.error ?? `Failed to get context (${res.status})`);
	}
	return data;
}

/** Legacy ask: now uses Ticket 10 RAG flow; maps response to legacy citation shape for Chat.svelte */
export async function askCase(
	caseId: string,
	question: string,
	_scope: CaseEngineScope,
	token: string,
	threadId: string
): Promise<{
	answer: string;
	citations: CaseEngineCitation[];
	integrityPresentation?: AskIntegrityPresentation;
	facts: AskFactItem[];
	inferences: AskInferenceItem[];
}> {
	const res = await askCaseQuestion(caseId, question, token, 8, undefined, threadId);
	const { facts, inferences } = normalizeAskFactInferenceArrays(res.facts, res.inferences);
	return {
		answer: res.answer,
		citations: res.citations.map((c) => ({
			type: c.type,
			id: c.id
		})),
		integrityPresentation: res.integrityPresentation,
		facts,
		inferences
	};
}

/** Ticket 10: Case-scoped AI Q&A with citations (RAG-lite) */
export type AskCitation =
	| {
			source_type: 'timeline_entry';
			id: string;
			occurred_at: string;
			created_at: string;
			type: string;
			snippet: string;
	  }
	| {
			source_type: 'case_file';
			id: string;
			chunk_id: string | null;
			original_filename: string;
			uploaded_at: string;
			page_start: number | null;
			page_end: number | null;
			snippet: string;
	  };

/** P20-PRE-03: canonical fields + evidence payloads (matches Case Engine `data`). */
export interface AskCaseQuestionResponse {
	answer: string;
	citations: Array<{ type: 'entry' | 'file'; id: string }>;
	meta: { source: 'case' | 'cross-case'; model?: string };
	question: string;
	confidence: 'LOW' | 'MEDIUM' | 'HIGH';
	evidence_citations: AskCitation[];
	used_citations: AskCitation[];
	/** P33-04 — Present on HTTP 200 when the Case Engine runs read-time integrity. */
	integrityPresentation?: AskIntegrityPresentation;
	facts?: AskFactItem[];
	inferences?: AskInferenceItem[];
}

export async function askCaseQuestion(
	caseId: string,
	question: string,
	token: string,
	topK?: number,
	model?: string,
	threadId?: string,
	options?: {
		mode?: 'strict' | 'analyst';
		retrievalScope?: 'case_all' | 'thread_selected_files';
	}
): Promise<AskCaseQuestionResponse> {
	const normalizedThreadId = String(threadId ?? '').trim();
	if (!normalizedThreadId) {
		throw new Error('A thread must be active before asking a case question.');
	}
	const body: Record<string, unknown> = {
		question: question.trim(),
		topK: topK ?? 8,
		thread_id: normalizedThreadId
	};
	if (model) body.model = model;
	if (options?.mode) body.mode = options.mode;
	if (options?.retrievalScope) body.retrieval_scope = options.retrievalScope;

	const outboundRequestId = newCaseEngineRequestId();
	const authHeaders: Record<string, string> = {
		'Content-Type': 'application/json',
		Authorization: `Bearer ${token}`,
		'X-Request-Id': outboundRequestId
	};

	const doFetch = () =>
		fetch(`${CASE_ENGINE_BASE_URL}/cases/${caseId}/ask`, {
			method: 'POST',
			headers: authHeaders,
			body: JSON.stringify(body)
		});

	/** P20-PRE-05: POST ask — classified safe-read retry (transient HTTP + transport); 422 never retried. */
	const res = await safeReadFetch(doFetch, 'askCaseQuestion');

	const correlator = responseRequestId(res) ?? outboundRequestId;
	const data = await res.json().catch(() => ({}));

	if (res.status === 422) {
		const msg = extractApiErrorMessage(data, 'AI returned invalid response');
		const det = data as { error?: { details?: { citations?: AskCitation[] } } };
		const citations = det?.error?.details?.citations;
		throw new CaseEngineRequestError(
			msg,
			422,
			extractApiErrorCode(data) ?? 'ASK_VALIDATION_FAILED',
			citations !== undefined ? { citations } : undefined,
			correlator
		);
	}
	if (!res.ok) {
		throw new CaseEngineRequestError(
			extractApiErrorMessage(data, `Ask failed (${res.status})`),
			res.status,
			extractApiErrorCode(data),
			undefined,
			correlator
		);
	}
	try {
		return unwrapEnvelopeCanonicalFirst<AskCaseQuestionResponse>(data, 'askCaseQuestion');
	} catch (e) {
		const m = e instanceof Error ? e.message : String(e);
		throw new CaseEngineRequestError(m, res.status, 'INVALID_ENVELOPE', undefined, correlator);
	}
}

// ─── Files (Ticket 5 Part 5) ───────────────────────────────────────────────

export interface CaseFile {
	id: string;
	original_filename: string;
	mime_type: string | null;
	file_size_bytes: number;
	uploaded_by: string;
	uploaded_at: string;
	/** Ticket 25: Evidence tags */
	tags?: string[];
	[key: string]: unknown;
}

export async function listCaseFiles(caseId: string, token: string): Promise<CaseFile[]> {
	const res = await fetch(`${CASE_ENGINE_BASE_URL}/cases/${caseId}/files`, {
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${token}`
		}
	});
	const data = await res.json().catch(() => ({}));
	if (!res.ok) {
		throw new Error(data?.error ?? `Failed to list files (${res.status})`);
	}
	return Array.isArray(data) ? data : [];
}

export async function uploadCaseFile(caseId: string, file: File, token: string): Promise<CaseFile> {
	const form = new FormData();
	form.append('file', file);
	const res = await fetch(`${CASE_ENGINE_BASE_URL}/cases/${encodeURIComponent(caseId)}/files`, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${token}`
		},
		body: form
	});
	const data = await res.json().catch(() => ({}));
	if (!res.ok) {
		throw new Error(extractApiErrorMessage(data, `Upload failed (${res.status})`));
	}
	return unwrapEnvelopeCanonicalFirst<CaseFile>(data, 'uploadCaseFile');
}

export function getCaseFileDownloadUrl(fileId: string): string {
	return `${CASE_ENGINE_BASE_URL}/files/${fileId}`;
}

export async function downloadCaseFile(fileId: string, filename: string, token: string): Promise<void> {
	const res = await fetch(`${CASE_ENGINE_BASE_URL}/files/${fileId}`, {
		headers: { Authorization: `Bearer ${token}` }
	});
	if (!res.ok) throw new Error(`Download failed (${res.status})`);
	const blob = await res.blob();
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = filename || 'download';
	a.click();
	URL.revokeObjectURL(url);
}

/** Authorized GET /files/:id — returns a blob: URL; caller must URL.revokeObjectURL when done. */
export async function fetchCaseFileObjectUrl(fileId: string, token: string): Promise<string> {
	const res = await fetch(`${CASE_ENGINE_BASE_URL}/files/${fileId}`, {
		headers: { Authorization: `Bearer ${token}` }
	});
	if (!res.ok) throw new Error(`Could not load file (${res.status})`);
	const blob = await res.blob();
	return URL.createObjectURL(blob);
}

export async function extractCaseFileText(fileId: string, token: string): Promise<{
	id: string;
	fileId: string;
	caseId: string;
	status: string;
	message: string | null;
	extracted_at: string;
}> {
	const res = await fetch(`${CASE_ENGINE_BASE_URL}/files/${fileId}/extract-text`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${token}`
		}
	});
	const data = await res.json().catch(() => ({}));
	if (!res.ok) {
		throw new Error(data?.error ?? `Extract failed (${res.status})`);
	}
	return data;
}

export async function getCaseFileText(fileId: string, token: string): Promise<{
	fileId: string;
	caseId: string;
	status: string;
	message: string | null;
	extracted_text: string;
	extracted_at: string;
	extracted_by: string;
}> {
	const res = await fetch(`${CASE_ENGINE_BASE_URL}/files/${fileId}/text`, {
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${token}`
		}
	});
	const data = await res.json().catch(() => ({}));
	if (!res.ok) {
		throw new Error(data?.error ?? `Failed to get text (${res.status})`);
	}
	return data;
}

// ─── AI Intake (Ticket 9) ──────────────────────────────────────────────────

export interface Intake {
	id: string;
	case_id: string;
	raw_text: string;
	status: string;
	submitted_by: string;
	created_at: string;
	[key: string]: unknown;
}

export interface IntakeProposal {
	id: string;
	intake_id: string;
	occurred_at: string | null;
	type: string;
	location_text: string | null;
	tags: string | string[] | null;
	text_original: string;
	text_cleaned?: string | null;
	created_by: string;
	proposed_at: string;
	created_at: string;
	[key: string]: unknown;
}

export async function createIntake(
	caseId: string,
	rawText: string,
	token: string
): Promise<{ intake: Intake }> {
	const res = await fetch(`${CASE_ENGINE_BASE_URL}/cases/${caseId}/intakes`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${token}`
		},
		body: JSON.stringify({ raw_text: rawText })
	});
	const data = await res.json().catch(() => ({}));
	if (!res.ok) {
		throw new Error(data?.error ?? `Submit failed (${res.status})`);
	}
	return data;
}

export async function proposeIntake(
	intakeId: string,
	token: string,
	model?: string
): Promise<{ intake: Intake; proposals: IntakeProposal[] }> {
	const res = await fetch(`${CASE_ENGINE_BASE_URL}/intakes/${intakeId}/propose`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${token}`
		},
		body: JSON.stringify(model ? { model } : {})
	});
	const data = await res.json().catch(() => ({}));
	if (!res.ok) {
		if (res.status === 422) {
			throw new Error(data?.error ?? 'AI returned invalid proposal');
		}
		throw new Error(data?.error ?? `Propose failed (${res.status})`);
	}
	return data;
}

export async function getIntake(
	intakeId: string,
	token: string
): Promise<{ intake: Intake; proposals: IntakeProposal[] }> {
	const res = await fetch(`${CASE_ENGINE_BASE_URL}/intakes/${intakeId}`, {
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${token}`
		}
	});
	const data = await res.json().catch(() => ({}));
	if (!res.ok) {
		throw new Error(data?.error ?? `Failed to get intake (${res.status})`);
	}
	return data;
}

export async function getIntakeProposals(
	intakeId: string,
	token: string
): Promise<IntakeProposal[]> {
	const res = await fetch(`${CASE_ENGINE_BASE_URL}/intakes/${intakeId}/proposals`, {
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${token}`
		}
	});
	const data = await res.json().catch(() => ({}));
	if (!res.ok) {
		throw new Error(data?.error ?? `Failed to get proposals (${res.status})`);
	}
	return Array.isArray(data) ? data : [];
}

export async function decideIntake(
	intakeId: string,
	outcome: 'APPROVED' | 'REJECTED',
	token: string,
	reason?: string
): Promise<{ created_entry_ids?: string[]; intake?: Intake }> {
	const res = await fetch(`${CASE_ENGINE_BASE_URL}/intakes/${intakeId}/decide`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${token}`
		},
		body: JSON.stringify({ outcome, reason: reason ?? undefined })
	});
	const data = await res.json().catch(() => ({}));
	if (!res.ok) {
		throw new Error(data?.error ?? `Decide failed (${res.status})`);
	}
	return data;
}

function buildExportParams(
	format: 'html' | 'pdf',
	opts?: { includeOriginal?: boolean; includeFiles?: boolean }
): string {
	const sp = new URLSearchParams();
	sp.set('format', format);
	if (opts?.includeOriginal) sp.set('includeOriginal', 'true');
	if (opts?.includeFiles) sp.set('includeFiles', 'true');
	return sp.toString();
}

/** Ticket 11: Running Case Notes export – opens HTML in new tab (auth via fetch) */
export async function openRunningNotesHtml(
	caseId: string,
	token: string,
	opts?: { includeOriginal?: boolean; includeFiles?: boolean }
): Promise<void> {
	const res = await fetch(
		`${CASE_ENGINE_BASE_URL}/cases/${caseId}/export/running-notes?${buildExportParams('html', opts)}`,
		{ headers: { Authorization: `Bearer ${token}` } }
	);
	if (!res.ok) throw new Error(`Export failed (${res.status})`);
	const html = await res.text();
	const blob = new Blob([html], { type: 'text/html' });
	const url = URL.createObjectURL(blob);
	window.open(url, '_blank');
	setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/** Ticket 11: Download Running Notes as HTML with friendly filename */
export async function downloadRunningNotesHtml(
	caseId: string,
	token: string,
	opts?: { includeOriginal?: boolean; includeFiles?: boolean; caseNumber?: string }
): Promise<void> {
	const res = await fetch(
		`${CASE_ENGINE_BASE_URL}/cases/${caseId}/export/running-notes?${buildExportParams('html', opts)}`,
		{ headers: { Authorization: `Bearer ${token}` } }
	);
	if (!res.ok) throw new Error(`Export failed (${res.status})`);
	const html = await res.text();
	const contentDisposition = res.headers.get('Content-Disposition');
	let filename = `Case_${caseId.slice(0, 8)}_Running_Notes_${new Date().toISOString().slice(0, 10)}.html`;
	if (contentDisposition) {
		const match = contentDisposition.match(/filename="?([^";\n]+)"?/);
		if (match) filename = match[1].trim();
	} else if (opts?.caseNumber) {
		const safe = (opts.caseNumber || '').replace(/[^a-zA-Z0-9_-]/g, '_') || 'case';
		filename = `Case_${safe}_Running_Notes_${new Date().toISOString().slice(0, 10)}.html`;
	}
	const blob = new Blob([html], { type: 'text/html' });
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = filename;
	a.click();
	URL.revokeObjectURL(url);
}

/** Ticket 12: Cross-case AI query – search across cases within unit scope */
export type CrossCaseCitation =
	| {
			source_type: 'timeline_entry';
			id: string;
			case_id: string;
			case_number: string;
			occurred_at: string;
			snippet: string;
	  }
	| {
			source_type: 'case_file';
			id: string;
			case_id: string;
			case_number: string;
			filename: string;
			snippet: string;
	  };

export interface AskCrossCaseResponse {
	answer: string;
	citations: Array<{ type: 'entry' | 'file'; id: string }>;
	meta: { source: 'case' | 'cross-case'; model?: string };
	question: string;
	confidence: 'LOW' | 'MEDIUM' | 'HIGH';
	evidence_citations: CrossCaseCitation[];
	used_citations: CrossCaseCitation[];
	integrityPresentation?: AskIntegrityPresentation;
	facts?: AskFactItem[];
	inferences?: AskInferenceItem[];
}

export async function askCrossCase(
	question: string,
	token: string,
	opts?: { topK?: number; unitScope?: 'CID' | 'SIU' | 'ALL' }
): Promise<AskCrossCaseResponse> {
	const body: Record<string, unknown> = { question: question.trim() };
	if (opts?.topK != null) body.topK = opts.topK;
	if (opts?.unitScope != null) body.unitScope = opts.unitScope;
	const outboundRequestId = newCaseEngineRequestId();
	const headers: Record<string, string> = {
		'Content-Type': 'application/json',
		Authorization: `Bearer ${token}`,
		'X-Request-Id': outboundRequestId
	};
	/** P20-PRE-05: POST ask-cross — same safe-read policy as case ask (no 422 retry). */
	const res = await safeReadFetch(
		() =>
			fetch(`${CASE_ENGINE_BASE_URL}/cases/ask-cross`, {
				method: 'POST',
				headers,
				body: JSON.stringify(body)
			}),
		'askCrossCase'
	);
	const correlator = responseRequestId(res) ?? outboundRequestId;
	const data = await res.json().catch(() => ({}));
	if (res.status === 422) {
		const msg = extractApiErrorMessage(data, 'AI returned invalid response');
		const det = data as { error?: { details?: { citations?: CrossCaseCitation[] } } };
		const citations = det?.error?.details?.citations;
		throw new CaseEngineRequestError(
			msg,
			422,
			extractApiErrorCode(data) ?? 'ASK_VALIDATION_FAILED',
			citations !== undefined ? { citations } : undefined,
			correlator
		);
	}
	if (!res.ok) {
		throw new CaseEngineRequestError(
			extractApiErrorMessage(data, `Cross-case ask failed (${res.status})`),
			res.status,
			extractApiErrorCode(data),
			undefined,
			correlator
		);
	}
	try {
		return unwrapEnvelopeCanonicalFirst<AskCrossCaseResponse>(data, 'askCrossCase');
	} catch (e) {
		const m = e instanceof Error ? e.message : String(e);
		throw new CaseEngineRequestError(m, res.status, 'INVALID_ENVELOPE', undefined, correlator);
	}
}

/** Ticket 11: Download Running Notes as PDF – returns false if not implemented (501) */
export async function downloadRunningNotesPdf(
	caseId: string,
	token: string,
	opts?: { includeOriginal?: boolean; includeFiles?: boolean }
): Promise<boolean> {
	const res = await fetch(
		`${CASE_ENGINE_BASE_URL}/cases/${caseId}/export/running-notes?${buildExportParams('pdf', opts)}`,
		{ headers: { Authorization: `Bearer ${token}` } }
	);
	if (res.status === 501) return false;
	if (!res.ok) {
		const data = await res.json().catch(() => ({}));
		throw new Error((data as { error?: string })?.error ?? `Export failed (${res.status})`);
	}
	const blob = await res.blob();
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = `running-notes-${caseId.slice(0, 8)}.pdf`;
	a.click();
	URL.revokeObjectURL(url);
	return true;
}

export async function listCaseIntakes(caseId: string, token: string): Promise<Intake[]> {
	const res = await fetch(`${CASE_ENGINE_BASE_URL}/cases/${caseId}/intakes`, {
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${token}`
		}
	});
	const data = await res.json().catch(() => ({}));
	if (!res.ok) {
		throw new Error(data?.error ?? `Failed to list intakes (${res.status})`);
	}
	return Array.isArray(data) ? data : [];
}

// ─── Ticket 21: Evidence Graph ──────────────────────────────────────────────

export interface GraphSourceRef {
  evidenceItemId: string;
  offsets?: [number, number];
}

export interface GraphNode {
  id: string;
  type: 'person' | 'phone' | 'location' | 'event';
  label: string;
  normalized: string;
  sources: GraphSourceRef[];
}

export interface GraphEdge {
  id: string;
  type: string;
  from: string;
  to: string;
  sources: GraphSourceRef[];
}

export interface GraphEvidenceItem {
  id: string;
  kind: 'timeline_entry' | 'case_file';
  sourceId: string;
  occurredAt?: string;
  createdAt?: string;
  createdBy?: string;
  uploadedAt?: string;
  uploadedBy?: string;
  filename?: string;
  text: string;
}

export interface CaseGraphResponse {
  caseId: string;
  generatedAt: string;
  params: { includeDeleted: boolean; maxSources: number; maxTextPerSource: number; mode: string };
  evidencePack: { packVersion: number; items: GraphEvidenceItem[] };
  graph: {
    nodes: GraphNode[];
    edges: GraphEdge[];
    stats: { nodeCount: number; edgeCount: number; sourceCount: number };
  };
}

export interface EntityScopeParams {
	scope?: 'UNIT' | 'ALL';
	unit?: 'CID' | 'SIU';
}

export interface EntityProfileEvidenceRow {
	case: { id: string; case_number: string; title: string; unit: string };
	source: { kind: string; id: string; occurred_at?: string };
	match: { excerpt: string };
	citation: { label: string; case_id: string; source_kind: string; source_id: string };
}

export interface EntityProfileResponse {
	entity: { type: string; normalized_id: string; display_label: string };
	scope_applied: string;
	unit_applied: string | null;
	summary: {
		case_count: number;
		occurrence_count: number;
		timeline_occurrence_count: number;
		file_occurrence_count: number;
		first_seen_at: string | null;
		last_seen_at: string | null;
	};
	evidence: EntityProfileEvidenceRow[];
}

export interface EntityTimelineItem {
	source: 'timeline_entry' | 'file_excerpt';
	source_id: string;
	case_id: string;
	case_number: string;
	case_title?: string;
	unit: string;
	timestamp: string | null;
	occurred_at: string | null;
	created_at: string | null;
	extracted_at: string | null;
	entry_id: string | null;
	file_id: string | null;
	file_name?: string;
	excerpt: string;
	evidence_ref: string;
	citation: { source_kind: string; source_id: string; case_id: string; case_number: string };
}

export interface EntityTimelineResponse {
	items: EntityTimelineItem[];
	case_count: number;
	total_count: number;
	entity?: { type: string; normalized_id: string; display_label?: string };
	scope_applied: string;
	unit_applied: string | null;
}

export interface EntityCasesResponse {
	entity: { type: string; normalized_id: string };
	scope_applied: string;
	unit_applied: string | null;
	result_count: number;
	cases: Array<{
		case: { id: string; case_number: string; title: string; unit: string };
		summary: { occurrence_count: number; first_seen_at: string; last_seen_at: string };
		top_citations: Array<{ label: string; case_id: string; source_kind: string; source_id: string }>;
	}>;
}

function toEntityScopeParams(params?: EntityScopeParams): string {
	const sp = new URLSearchParams();
	if (params?.scope) sp.set('scope', params.scope);
	if (params?.unit) sp.set('unit', params.unit);
	const qs = sp.toString();
	return qs ? `?${qs}` : '';
}

export async function getEntityProfile(
	type: 'phone' | 'person' | 'location',
	normalizedId: string,
	token: string,
	params?: EntityScopeParams
): Promise<EntityProfileResponse> {
	const qs = toEntityScopeParams(params);
	const res = await fetch(
		`${CASE_ENGINE_BASE_URL}/entities/${encodeURIComponent(type)}/${encodeURIComponent(normalizedId)}/profile${qs}`,
		{
			headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
		}
	);
	const data = await res.json().catch(() => ({}));
	if (!res.ok) {
		throw new Error((data as { error?: string })?.error ?? `Failed to load entity profile (${res.status})`);
	}
	return data as EntityProfileResponse;
}

export async function getEntityTimeline(
	type: 'phone' | 'person' | 'location',
	normalizedId: string,
	token: string,
	params?: EntityScopeParams & { limit?: number; offset?: number }
): Promise<EntityTimelineResponse> {
	const sp = new URLSearchParams();
	if (params?.scope) sp.set('scope', params.scope);
	if (params?.unit) sp.set('unit', params.unit);
	if (params?.limit != null) sp.set('limit', String(params.limit));
	if (params?.offset != null) sp.set('offset', String(params.offset));
	const qs = sp.toString();
	const res = await fetch(
		`${CASE_ENGINE_BASE_URL}/entities/${encodeURIComponent(type)}/${encodeURIComponent(normalizedId)}/timeline${qs ? `?${qs}` : ''}`,
		{
			headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
		}
	);
	const data = await res.json().catch(() => ({}));
	if (!res.ok) {
		throw new Error((data as { error?: string })?.error ?? `Failed to load entity timeline (${res.status})`);
	}
	return data as EntityTimelineResponse;
}

export async function getEntityCases(
	type: 'phone' | 'person' | 'location',
	normalizedId: string,
	token: string,
	params?: EntityScopeParams
): Promise<EntityCasesResponse> {
	const qs = toEntityScopeParams(params);
	const res = await fetch(
		`${CASE_ENGINE_BASE_URL}/entities/${encodeURIComponent(type)}/${encodeURIComponent(normalizedId)}/cases${qs}`,
		{
			headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
		}
	);
	const data = await res.json().catch(() => ({}));
	if (!res.ok) {
		throw new Error((data as { error?: string })?.error ?? `Failed to load entity cases (${res.status})`);
	}
	return data as EntityCasesResponse;
}

export async function getCaseGraph(
  caseId: string,
  token: string,
  params?: { includeDeleted?: boolean; maxSources?: number; maxTextPerSource?: number }
): Promise<CaseGraphResponse> {
  const sp = new URLSearchParams();
  if (params?.includeDeleted) sp.set('includeDeleted', 'true');
  if (params?.maxSources != null) sp.set('maxSources', String(params.maxSources));
  if (params?.maxTextPerSource != null) sp.set('maxTextPerSource', String(params.maxTextPerSource));
  const qs = sp.toString();
  const url = `${CASE_ENGINE_BASE_URL}/cases/${caseId}/graph${qs ? `?${qs}` : ''}`;
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as { error?: string })?.error ?? `Failed to load graph (${res.status})`);
  }
  return data as CaseGraphResponse;
}

// ─── Ticket 23: Timeline Intelligence ───────────────────────────────────────

export interface TimelineIntelligenceParams {
	q?: string;
	person?: string;
	phone?: string;
	location?: string;
	type?: string;
	tag?: string;
	startDate?: string;
	endDate?: string;
	cluster?: 'none' | 'day' | 'week';
}

export interface TimelineIntelligenceEntry {
	id: string;
	occurred_at: string;
	type: string;
	location_text: string | null;
	text_original: string;
	text_cleaned: string | null;
	cluster_key?: string;
}

export interface TimelineIntelligenceResponse {
	caseId: string;
	entries: TimelineIntelligenceEntry[];
	stats: { returnedEntries: number; totalMatches?: number };
	cluster?: string;
}

export async function getTimelineIntelligence(
	caseId: string,
	token: string,
	params?: TimelineIntelligenceParams
): Promise<TimelineIntelligenceResponse> {
	const sp = new URLSearchParams();
	if (params?.q) sp.set('q', params.q);
	if (params?.person) sp.set('person', params.person);
	if (params?.phone) sp.set('phone', params.phone);
	if (params?.location) sp.set('location', params.location);
	if (params?.type) sp.set('type', params.type);
	if (params?.tag) sp.set('tag', params.tag);
	if (params?.startDate) sp.set('startDate', params.startDate);
	if (params?.endDate) sp.set('endDate', params.endDate);
	if (params?.cluster) sp.set('cluster', params.cluster);
	const qs = sp.toString();
	const url = `${CASE_ENGINE_BASE_URL}/cases/${caseId}/timeline/intelligence${qs ? `?${qs}` : ''}`;
	const res = await fetch(url, {
		headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
	});
	const data = await res.json().catch(() => ({}));
	if (!res.ok) {
		throw new Error((data as { error?: string })?.error ?? `Timeline intelligence failed (${res.status})`);
	}
	return data as TimelineIntelligenceResponse;
}

// ─── Search (Ticket 5 Part 5) ──────────────────────────────────────────────

export type SearchScope = 'case' | 'unit' | 'all';

export interface SearchResultItem {
	type: 'entry' | 'file';
	caseId: string;
	id: string;
	snippet: string;
	sort_time: string;
}

export interface SearchResponse {
	q: string;
	scope: string;
	results: SearchResultItem[];
}

// ─── Ticket 13: Integrity & Audit ───────────────────────────────────────────

export interface AuditLogItem {
	id: string;
	action: string;
	created_at: string;
	user_id: string;
	user_role: string | null;
	entity_type: string;
	entity_id: string;
	details: Record<string, unknown>;
}

export interface CaseAuditResponse {
	case: { id: string; case_number: string };
	items: AuditLogItem[];
	next_cursor: string | null;
}

export async function getCaseAudit(
	caseId: string,
	token: string,
	params?: { limit?: number; cursor?: string; before?: string; includeSystem?: boolean; includeDeleted?: boolean }
): Promise<CaseAuditResponse> {
	const sp = new URLSearchParams();
	if (params?.limit != null) sp.set('limit', String(params.limit));
	if (params?.cursor) sp.set('cursor', params.cursor);
	if (params?.before) sp.set('before', params.before);
	if (params?.includeSystem === false) sp.set('includeSystem', 'false');
	if (params?.includeDeleted) sp.set('includeDeleted', 'true');
	const qs = sp.toString();
	const url = `${CASE_ENGINE_BASE_URL}/cases/${caseId}/audit${qs ? `?${qs}` : ''}`;
	const res = await fetch(url, {
		headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
	});
	const data = await res.json().catch(() => ({}));
	if (!res.ok) throw new Error((data as { error?: string })?.error ?? `Failed to fetch audit (${res.status})`);
	return data;
}

export async function exportCaseAudit(
	caseId: string,
	token: string,
	format: 'json' | 'csv',
	params?: { limit?: number; includeDeleted?: boolean }
): Promise<void> {
	const sp = new URLSearchParams();
	sp.set('format', format);
	if (params?.limit != null) sp.set('limit', String(params.limit));
	if (params?.includeDeleted) sp.set('includeDeleted', 'true');
	const res = await fetch(
		`${CASE_ENGINE_BASE_URL}/cases/${caseId}/audit/export?${sp}`,
		{ headers: { Authorization: `Bearer ${token}` } }
	);
	if (!res.ok) {
		const data = await res.json().catch(() => ({}));
		throw new Error((data as { error?: string })?.error ?? `Export failed (${res.status})`);
	}
	const blob = await res.blob();
	const contentDisposition = res.headers.get('Content-Disposition');
	let filename = `Case_${caseId.slice(0, 8)}_Audit_${new Date().toISOString().slice(0, 10)}.${format}`;
	if (contentDisposition) {
		const match = contentDisposition.match(/filename="?([^";\n]+)"?/);
		if (match) filename = match[1].trim();
	}
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = filename;
	a.click();
	URL.revokeObjectURL(url);
}

export interface DeletedItemsResponse {
	entries: Array<Record<string, unknown>>;
	files: Array<Record<string, unknown>>;
	intakes: Array<Record<string, unknown>>;
}

export async function getCaseDeleted(
	caseId: string,
	token: string,
	types?: string
): Promise<DeletedItemsResponse> {
	const sp = types ? `?types=${encodeURIComponent(types)}` : '';
	const res = await fetch(`${CASE_ENGINE_BASE_URL}/cases/${caseId}/deleted${sp}`, {
		headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
	});
	const data = await res.json().catch(() => ({}));
	if (!res.ok) throw new Error((data as { error?: string })?.error ?? `Failed to fetch deleted items (${res.status})`);
	return data;
}

// ─── Official Case Timeline (timeline_entries) ────────────────────────────────

/** Linked case file rows returned with timeline entries (images only; source of truth is case_files). */
export interface TimelineLinkedImageFile {
	id: string;
	original_filename: string;
	mime_type: string | null;
}

/** P40-02 / P40-02A: derived provenance for committed entries (Case Engine). */
export interface TimelineEntryProvenance {
	origin_kind: string;
	origin_label: string;
	lineage_explanation: string;
	derivation_source: string;
	/** Back-compat intake column only — not the modern proposal path */
	legacy_intake_fallback?: boolean;
	proposal_payload_unreadable?: boolean;
	committed_via_proposal: boolean;
	proposal_id: string | null;
	source_case_file_id: string | null;
	source_file_display_name: string | null;
	ai_assisted_draft: boolean;
	implies_chat_context_draft: boolean;
	/** P40-03: normalized from committed proposal snapshot — separate from origin / source file */
	chronology_occurred_at_confidence?: 'high' | 'medium' | 'low' | null;
	/** True when operator confirmed low-confidence chronology before commit */
	chronology_operator_confirmed?: boolean;
}

export interface TimelineEntry {
	id: string;
	case_id: string;
	occurred_at: string;
	created_at: string;
	created_by: string;
	type: string;
	location_text: string | null;
	tags: string[];
	text_original: string;
	text_cleaned: string | null;
	deleted_at: string | null;
	/** Number of prior-state version snapshots. 0 = never edited; N = edited N times (current = vN+1). */
	version_count?: number;
	/** Image attachments linked via timeline_entry_case_files → case_files. */
	linked_image_files?: TimelineLinkedImageFile[];
	/** How this official row was added (explanatory; authority remains the committed timeline entry). */
	provenance?: TimelineEntryProvenance;
}

/**
 * List official timeline entries for a case, ordered by occurred_at ASC.
 * By default returns only non-deleted entries.
 * When options.includeDeleted is true AND the authenticated user is ADMIN,
 * the backend also returns soft-deleted entries (with deleted_at populated).
 * Non-ADMIN requests ignore includeDeleted and always receive active-only entries.
 */
export async function listCaseTimelineEntries(
	caseId: string,
	token: string,
	options?: { includeDeleted?: boolean }
): Promise<TimelineEntry[]> {
	const qs = options?.includeDeleted ? '?includeDeleted=true' : '';
	const res = await fetch(`${CASE_ENGINE_BASE_URL}/cases/${caseId}/entries${qs}`, {
		headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
	});
	const data = await res.json().catch(() => ({}));
	if (!res.ok) throw new Error((data as { error?: string })?.error ?? `Failed to load timeline (${res.status})`);
	return data as TimelineEntry[];
}

/**
 * P28-35: Soft-delete a timeline entry.
 * Endpoint: DELETE /entries/:entryId  (not case-scoped in the URL)
 * Available to any authenticated user with mutate access to the entry's case.
 * Returns 204 No Content. The entry is NOT permanently deleted — an ADMIN can restore it.
 * The action is audited as ENTRY_DELETE_SOFT.
 */
export async function softDeleteTimelineEntry(entryId: string, token: string): Promise<void> {
	const res = await fetch(`${CASE_ENGINE_BASE_URL}/entries/${entryId}`, {
		method: 'DELETE',
		headers: { Authorization: `Bearer ${token}` }
	});
	if (!res.ok) {
		const data = await res.json().catch(() => ({}));
		throw new Error(
			(data as { error?: string })?.error ?? `Soft-delete failed (${res.status})`
		);
	}
}

export async function restoreTimelineEntry(caseId: string, entryId: string, token: string): Promise<Record<string, unknown>> {
	const res = await fetch(`${CASE_ENGINE_BASE_URL}/cases/${caseId}/entries/${entryId}/restore`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
	});
	const data = await res.json().catch(() => ({}));
	if (!res.ok) throw new Error((data as { error?: string })?.error ?? `Restore failed (${res.status})`);
	return data;
}

/** P28-33: Prior-state snapshot for a timeline entry version. */
export interface TimelineEntryVersion {
	id: string;
	entry_id: string;
	case_id: string;
	version_number: number;
	prior_occurred_at: string;
	prior_type: string;
	prior_text_original: string;
	prior_text_cleaned: string | null;
	prior_location_text: string | null;
	prior_tags: string | null;
	changed_by: string;
	changed_at: string;
	change_reason: string;
}

/**
 * P28-33: Lazy-fetch prior-version history for a single timeline entry.
 * Endpoint: GET /cases/:caseId/entries/:entryId/versions
 * Returns versions ordered by version_number DESC (newest capture first).
 * The current entry state is NOT included — only prior-state snapshots.
 */
export async function listTimelineEntryVersions(
	caseId: string,
	entryId: string,
	token: string
): Promise<TimelineEntryVersion[]> {
	const res = await fetch(
		`${CASE_ENGINE_BASE_URL}/cases/${caseId}/entries/${entryId}/versions`,
		{ headers: { Authorization: `Bearer ${token}` } }
	);
	const data = await res.json().catch(() => ({}));
	if (!res.ok) {
		throw new Error(
			(data as { error?: string })?.error ?? `Failed to load version history (${res.status})`
		);
	}
	return data as TimelineEntryVersion[];
}

/**
 * P28-34: Update an existing timeline entry with mandatory version capture.
 * Endpoint: PUT /cases/:caseId/entries/:entryId
 * - change_reason is required (enforced by both UI and backend)
 * - Backend atomically captures the prior state before applying the update
 * - Response is the updated timeline_entries row plus linked_image_files (does NOT include computed version_count)
 * - Caller is responsible for locally incrementing version_count after a successful save
 * - Omit linked_file_ids to leave links unchanged; pass [] to clear; pass ids to replace set
 */
export async function updateCaseTimelineEntry(
	caseId: string,
	entryId: string,
	token: string,
	payload: {
		text_original?: string;
		type?: string;
		occurred_at?: string;
		location_text?: string | null;
		change_reason: string;
		linked_file_ids?: string[];
	}
): Promise<Partial<TimelineEntry>> {
	const res = await fetch(
		`${CASE_ENGINE_BASE_URL}/cases/${caseId}/entries/${entryId}`,
		{
			method: 'PUT',
			headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
			body: JSON.stringify(payload)
		}
	);
	const data = await res.json().catch(() => ({}));
	if (!res.ok) {
		throw new Error(
			(data as { error?: string })?.error ?? `Update failed (${res.status})`
		);
	}
	return data as Partial<TimelineEntry>;
}

/**
 * P28-37: Create a new timeline entry directly in a case.
 * Endpoint: POST /cases/:caseId/entries
 *
 * - occurred_at must be ISO 8601 with timezone (Z or ±HH:MM)
 * - type and text_original are required
 * - location_text is optional (pass null or omit to leave blank)
 * - Available to any user with mutate access to the case (CID/SIU/ADMIN)
 * - Returns HTTP 201 + the created timeline_entries row and linked_image_files
 * - Note: version_count is not included in the create response (starts at 0 implicitly)
 */
export async function createCaseTimelineEntry(
	caseId: string,
	token: string,
	payload: {
		occurred_at: string;
		type: string;
		text_original: string;
		location_text?: string | null;
		linked_file_ids?: string[];
	}
): Promise<TimelineEntry> {
	const res = await fetch(`${CASE_ENGINE_BASE_URL}/cases/${caseId}/entries`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
		body: JSON.stringify(payload)
	});
	const data = await res.json().catch(() => ({}));
	if (!res.ok) {
		throw new Error(
			(data as { error?: string })?.error ?? `Create failed (${res.status})`
		);
	}
	return data as TimelineEntry;
}

// ── Intelligence alerts (P28-40) ─────────────────────────────────────────────
//
// The backend produces ENTITY_OVERLAP alerts when a phone number or address
// extracted from a new timeline entry or file matches the same entity in another
// active case in the same unit. Alerts are deterministic, deduplicated, evidence-
// validated, and RBAC-enforced. This is a read surface only — alerts are not
// created or modified here except via ACK.

export interface IntelligenceCitation {
	source_kind: 'timeline_entry' | 'file';
	source_id: string;
	case_id: string;
	case_number: string;
	excerpt: string;
}

export interface IntelligenceAlertMatch {
	entity_kind: 'PHONE' | 'ADDRESS';
	normalized: string;
	display: string;
}

export interface IntelligenceAlertExplanation {
	reason_code: string;
	match: IntelligenceAlertMatch;
	source: { case_id: string; citations: IntelligenceCitation[] };
	target: { case_id: string; citations: IntelligenceCitation[] };
}

export interface IntelligenceAlert {
	id: number;
	status: 'OPEN' | 'ACKED';
	alert_type: string;
	unit: string;
	created_at: string;
	acked_at: string | null;
	acked_by: string | null;
	entity_type: string;
	normalized_entity: string;
	source_case_id: string;
	source_case_number: string;
	target_case_id: string;
	target_case_number: string;
	reason_code: string;
	explanation_json: IntelligenceAlertExplanation;
	source_case: { id: string; case_number: string; title: string };
	target_case: { id: string; case_number: string; title: string };
	match: IntelligenceAlertMatch;
	summary: string;
}

/**
 * P28-40: List OPEN intelligence alerts involving a specific case.
 * Endpoint: GET /alerts?caseId=:caseId&status=OPEN
 *
 * Returns alerts where the case is either source or target.
 * Only OPEN alerts are returned — ACKED alerts are excluded.
 * Evidence is validated server-side; stale alerts are filtered out automatically.
 */
export async function listCaseIntelligenceAlerts(
	caseId: string,
	token: string
): Promise<IntelligenceAlert[]> {
	const res = await fetch(
		`${CASE_ENGINE_BASE_URL}/alerts?caseId=${encodeURIComponent(caseId)}&status=OPEN&limit=50`,
		{ headers: { Authorization: `Bearer ${token}` } }
	);
	const data = await res.json().catch(() => ({}));
	if (!res.ok) {
		throw new Error(
			(data as { error?: string })?.error ?? `Failed to load alerts (${res.status})`
		);
	}
	return ((data as { alerts?: IntelligenceAlert[] })?.alerts ?? []);
}

/**
 * P28-40: Acknowledge an intelligence alert.
 * Endpoint: POST /alerts/:id/ack
 *
 * Transitions the alert from OPEN to ACKED. Audited server-side.
 * Returns the updated alert object.
 */
export async function ackIntelligenceAlert(
	alertId: number,
	token: string
): Promise<IntelligenceAlert> {
	const res = await fetch(`${CASE_ENGINE_BASE_URL}/alerts/${alertId}/ack`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
	});
	const data = await res.json().catch(() => ({}));
	if (!res.ok) {
		throw new Error(
			(data as { error?: string })?.error ?? `Acknowledge failed (${res.status})`
		);
	}
	return data as IntelligenceAlert;
}

export async function restoreCaseFile(caseId: string, fileId: string, token: string): Promise<Record<string, unknown>> {
	const res = await fetch(`${CASE_ENGINE_BASE_URL}/cases/${caseId}/files/${fileId}/restore`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
	});
	const data = await res.json().catch(() => ({}));
	if (!res.ok) throw new Error((data as { error?: string })?.error ?? `Restore failed (${res.status})`);
	return data;
}

export interface IntakeHistoryItem {
	[key: string]: unknown;
	proposals?: IntakeProposal[];
}

export interface IntakeHistoryResponse {
	intakes: IntakeHistoryItem[];
}

export async function getCaseIntakeHistory(
	caseId: string,
	token: string,
	params?: { limit?: number; includeProposals?: boolean; includeDeleted?: boolean }
): Promise<IntakeHistoryResponse> {
	const sp = new URLSearchParams();
	if (params?.limit != null) sp.set('limit', String(params.limit));
	if (params?.includeProposals === false) sp.set('includeProposals', 'false');
	if (params?.includeDeleted) sp.set('includeDeleted', 'true');
	const qs = sp.toString();
	const url = `${CASE_ENGINE_BASE_URL}/cases/${caseId}/intakes/history${qs ? `?${qs}` : ''}`;
	const res = await fetch(url, {
		headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
	});
	const data = await res.json().catch(() => ({}));
	if (!res.ok) throw new Error((data as { error?: string })?.error ?? `Failed to fetch intake history (${res.status})`);
	return data;
}

// ─── Ticket 17: Warrant Workflow (templates, render, AI draft, warrant packet) ─────

export interface TemplateMeta {
	templateId: string;
	label: string;
	category: string;
	disabled?: boolean;
}

export async function listTemplates(token: string): Promise<{ templates: TemplateMeta[] }> {
	const res = await fetch(`${CASE_ENGINE_BASE_URL}/templates`, {
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${token}`
		}
	});
	const data = await res.json().catch(() => ({}));
	if (!res.ok) {
		throw new Error((data as { error?: string })?.error ?? `Failed to list templates (${res.status})`);
	}
	const templates = Array.isArray((data as { templates?: TemplateMeta[] }).templates)
		? (data as { templates: TemplateMeta[] }).templates
		: [];
	return { templates };
}

export interface RenderTemplateResponse {
	templateId: string;
	renderedHtml: string;
	missingFields: string[];
}

export async function renderTemplate(
	caseId: string,
	templateId: string,
	token: string,
	opts?: {
		mergeOverrides?: { case?: Record<string, unknown>; agency?: Record<string, unknown> };
		options?: { includeDeleted?: boolean };
	}
): Promise<RenderTemplateResponse> {
	const body: { templateId: string; mergeOverrides?: unknown; options?: unknown } = { templateId: templateId.trim() };
	if (opts?.mergeOverrides) body.mergeOverrides = opts.mergeOverrides;
	if (opts?.options) body.options = opts.options;
	const res = await fetch(`${CASE_ENGINE_BASE_URL}/cases/${caseId}/templates/render`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${token}`
		},
		body: JSON.stringify(body)
	});
	const data = await res.json().catch(() => ({}));
	if (!res.ok) {
		throw new Error((data as { error?: string })?.error ?? `Render failed (${res.status})`);
	}
	return data as RenderTemplateResponse;
}

/** Ticket 20: Render template to PDF (download) */
export async function renderTemplatePdf(
	caseId: string,
	templateId: string,
	token: string,
	opts?: {
		mergeOverrides?: { case?: Record<string, unknown>; agency?: Record<string, unknown> };
		options?: { includeDeleted?: boolean };
		caseNumber?: string;
	}
): Promise<void> {
	const body: { templateId: string; mergeOverrides?: unknown; options?: unknown } = { templateId: templateId.trim() };
	if (opts?.mergeOverrides) body.mergeOverrides = opts.mergeOverrides;
	if (opts?.options) body.options = opts.options;
	const res = await fetch(`${CASE_ENGINE_BASE_URL}/cases/${caseId}/templates/render-pdf`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${token}`
		},
		body: JSON.stringify(body)
	});
	if (!res.ok) {
		const data = await res.json().catch(() => ({}));
		throw new Error((data as { error?: string })?.error ?? `PDF render failed (${res.status})`);
	}
	const blob = await res.blob();
	const contentDisposition = res.headers.get('Content-Disposition');
	let filename = `Rendered_Template_${caseId.slice(0, 8)}_${new Date().toISOString().slice(0, 10)}.pdf`;
	if (contentDisposition) {
		const match = contentDisposition.match(/filename="?([^";\n]+)"?/);
		if (match) filename = match[1].trim();
	} else if (opts?.caseNumber) {
		const safe = (opts.caseNumber || '').replace(/[^a-zA-Z0-9_-]/g, '_') || 'case';
		filename = `Rendered_Template_${safe}_${new Date().toISOString().slice(0, 10)}.pdf`;
	}
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = filename;
	a.click();
	URL.revokeObjectURL(url);
}

export interface WarrantDraftCitation {
	claim: string;
	evidenceItemIds: string[];
}

export interface WarrantDraftResult {
	caseId: string;
	purpose: string;
	generatedAt: string;
	evidencePack: { packVersion: number; items: unknown[] };
	draft: {
		title: string;
		probableCauseNarrative: string;
		requestedItems: string[];
		locations: string[];
		people: string[];
		timelineHighlights?: string[];
		citations: WarrantDraftCitation[];
		confidenceNotes: string[];
		missingInfoQuestions: string[];
	};
	model: { provider: string; model: string };
}

/** Ticket 22: AI Case Summary Generator */
export interface CaseSummaryEvidenceItem {
	id: string;
	kind: 'timeline_entry' | 'case_file';
	sourceId: string;
	type: string;
	createdAt: string;
	createdBy?: string;
	excerpt: string;
}

export interface CaseSummaryResult {
	caseId: string;
	generatedAt: string;
	params: { maxSources: number; maxTextPerSource: number };
	evidencePack: { packVersion: number; items: CaseSummaryEvidenceItem[] };
	summary: {
		primarySuspects: string[];
		keyEvents: string[];
		evidenceHighlights: string[];
		recommendedNextSteps: string[];
		openQuestions: string[];
	};
	citations: Array<{
		evidenceItemIds: string[];
		note?: string;
	}>;
}

export interface CaseSummaryStatusResult {
	summary: CaseSummaryResult | null;
	lastSummaryGeneratedAt: string | null;
	latestActivityAt: string;
	isStale: boolean;
}

export interface CaseBriefEntry {
	entry_id: string;
	occurred_at: string;
	created_at: string;
	created_by: string;
	created_by_name: string;
	type: string;
	text: string;
	has_cleaned: boolean;
}

export interface CaseBriefSection {
	date: string;
	entries: CaseBriefEntry[];
}

export interface CaseBriefResponse {
	case: {
		case_id: string;
		case_number: string;
		title: string;
		unit: 'CID' | 'SIU';
	};
	sections: CaseBriefSection[];
}

export interface CaseBriefRequest {
	date_from?: string;
	date_to?: string;
	types?: string[];
}

export interface CaseBriefExportRequest extends CaseBriefRequest {
	format?: 'pdf' | 'docx';
}

export interface CaseBriefExportResult {
	blob: Blob;
	filename: string;
	/** P26-05: request_id echoed by Case Engine for export verification tracing. */
	requestId?: string;
}

export interface TimelineIntelligenceSummaryRequest {
	date_from?: string;
	date_to?: string;
	types?: string[];
}

export interface TimelineIntelligenceSummaryResult {
	summary: string;
	key_events: Array<{
		entry_id: string;
		reason: string;
	}>;
	gaps: Array<{
		description: string;
	}>;
	meta?: {
		entry_count: number;
		date_from: string | null;
		date_to: string | null;
		types: string[] | null;
	};
}

export async function requestCaseSummary(
	caseId: string,
	token: string,
	opts?: { maxSources?: number; maxTextPerSource?: number }
): Promise<CaseSummaryResult> {
	const body: Record<string, unknown> = {};
	if (opts?.maxSources != null) body.maxSources = opts.maxSources;
	if (opts?.maxTextPerSource != null) body.maxTextPerSource = opts.maxTextPerSource;
	const res = await fetch(`${CASE_ENGINE_BASE_URL}/cases/${caseId}/ai/case-summary`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${token}`
		},
		body: JSON.stringify(Object.keys(body).length ? body : {})
	});
	const data = await res.json().catch(() => ({}));
	if (!res.ok) {
		throw new Error((data as { error?: string })?.error ?? `Case summary failed (${res.status})`);
	}
	return data as CaseSummaryResult;
}

export async function getCaseSummaryStatus(
	caseId: string,
	token: string
): Promise<CaseSummaryStatusResult> {
	const res = await fetch(`${CASE_ENGINE_BASE_URL}/cases/${caseId}/ai/case-summary/status`, {
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${token}`
		}
	});
	const data = await res.json().catch(() => ({}));
	if (!res.ok) {
		throw new Error((data as { error?: string })?.error ?? `Case summary status failed (${res.status})`);
	}
	return data as CaseSummaryStatusResult;
}

export async function requestCaseBrief(
	caseId: string,
	token: string,
	filters?: CaseBriefRequest
): Promise<CaseBriefResponse> {
	const body: Record<string, unknown> = {};
	if (typeof filters?.date_from === 'string' && filters.date_from.trim()) {
		body.date_from = filters.date_from.trim();
	}
	if (typeof filters?.date_to === 'string' && filters.date_to.trim()) {
		body.date_to = filters.date_to.trim();
	}
	if (Array.isArray(filters?.types)) {
		const types = filters.types
			.filter((v): v is string => typeof v === 'string')
			.map((v) => v.trim())
			.filter((v) => v.length > 0);
		if (types.length > 0) body.types = types;
	}

	const outboundRequestId = newCaseEngineRequestId();
	const res = await fetch(`${CASE_ENGINE_BASE_URL}/cases/${caseId}/brief`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${token}`,
			'X-Request-Id': outboundRequestId
		},
		body: JSON.stringify(body)
	});
	const raw = await res.json().catch(() => ({}));
	if (!res.ok) {
		throw new Error((raw as { error?: string })?.error ?? `Case brief failed (${res.status})`);
	}
	return unwrapEnvelopeCanonicalFirst<CaseBriefResponse>(raw, 'requestCaseBrief');
}

export async function exportCaseBriefPdf(
	caseId: string,
	token: string,
	filters?: CaseBriefExportRequest
): Promise<CaseBriefExportResult> {
	const body: Record<string, unknown> = {
		format: filters?.format ?? 'pdf'
	};
	if (typeof filters?.date_from === 'string' && filters.date_from.trim()) {
		body.date_from = filters.date_from.trim();
	}
	if (typeof filters?.date_to === 'string' && filters.date_to.trim()) {
		body.date_to = filters.date_to.trim();
	}
	if (Array.isArray(filters?.types)) {
		const types = filters.types
			.filter((v): v is string => typeof v === 'string')
			.map((v) => v.trim())
			.filter((v) => v.length > 0);
		if (types.length > 0) body.types = types;
	}

	const outboundRequestId = newCaseEngineRequestId();
	const res = await fetch(`${CASE_ENGINE_BASE_URL}/cases/${caseId}/brief/export`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${token}`,
			'X-Request-Id': outboundRequestId
		},
		body: JSON.stringify(body)
	});
	if (!res.ok) {
		const raw = await res.json().catch(() => ({}));
		throw new Error((raw as { error?: string })?.error ?? `Case brief export failed (${res.status})`);
	}
	const blob = await res.blob();
	/** P26-05: read back correlator for export verification — ties download to backend audit log entry. */
	const requestId = responseRequestId(res) ?? outboundRequestId;
	let filename = `case-brief-${caseId.slice(0, 8)}.pdf`;
	const contentDisposition = res.headers.get('Content-Disposition');
	if (contentDisposition) {
		const match = contentDisposition.match(/filename="?([^";\n]+)"?/);
		if (match) filename = match[1].trim();
	}
	return { blob, filename, requestId };
}

export async function requestTimelineIntelligenceSummary(
	caseId: string,
	token: string,
	filters?: TimelineIntelligenceSummaryRequest
): Promise<TimelineIntelligenceSummaryResult> {
	const body: Record<string, unknown> = {};
	if (typeof filters?.date_from === 'string' && filters.date_from.trim()) {
		body.date_from = filters.date_from.trim();
	}
	if (typeof filters?.date_to === 'string' && filters.date_to.trim()) {
		body.date_to = filters.date_to.trim();
	}
	if (Array.isArray(filters?.types)) {
		const types = filters.types
			.filter((v): v is string => typeof v === 'string')
			.map((v) => v.trim())
			.filter((v) => v.length > 0);
		if (types.length > 0) body.types = types;
	}
	const outboundRequestId = newCaseEngineRequestId();
	const res = await fetch(`${CASE_ENGINE_BASE_URL}/cases/${caseId}/timeline-summary`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${token}`,
			'X-Request-Id': outboundRequestId
		},
		body: JSON.stringify(body)
	});
	const raw = await res.json().catch(() => ({}));
	if (!res.ok) {
		throw new Error((raw as { error?: string })?.error ?? `Timeline summary failed (${res.status})`);
	}
	return raw as TimelineIntelligenceSummaryResult;
}

export async function requestAiWarrantDraft(
	caseId: string,
	token: string,
	opts?: {
		factsFocus?: string;
		options?: {
			maxEvidenceItems?: number;
			includeFiles?: boolean;
			includeTimeline?: boolean;
			includeDeleted?: boolean;
		};
	}
): Promise<WarrantDraftResult> {
	const body: Record<string, unknown> = { purpose: 'probable_cause' };
	if (opts?.factsFocus) body.factsFocus = opts.factsFocus;
	body.options = opts?.options ?? {
		maxEvidenceItems: 25,
		includeFiles: true,
		includeTimeline: true
	};
	const res = await fetch(`${CASE_ENGINE_BASE_URL}/cases/${caseId}/ai/warrant-draft`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${token}`
		},
		body: JSON.stringify(body)
	});
	const data = await res.json().catch(() => ({}));
	if (!res.ok) {
		throw new Error((data as { error?: string })?.error ?? `AI warrant draft failed (${res.status})`);
	}
	return data as WarrantDraftResult;
}

/** P15-07: Narrative timeline (Phase 15). */
export interface NarrativeEvent {
	event_id: string;
	case_id: string;
	event_type: string;
	occurred_at: string;
	title: string | null;
	description: string | null;
	source_type: string;
	source_id: string;
	citations: Array<{ source_type: string; source_id: string }>;
}
export async function getNarrativeTimeline(
	caseId: string,
	token: string
): Promise<{ case_id: string; events: NarrativeEvent[] }> {
	const res = await fetch(`${CASE_ENGINE_BASE_URL}/cases/${caseId}/narrative/timeline`, {
		headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
	});
	const data = await res.json().catch(() => ({}));
	if (!res.ok) throw new Error((data as { error?: string })?.error ?? `Narrative timeline failed (${res.status})`);
	return data as { case_id: string; events: NarrativeEvent[] };
}

/** P15-07: Warrant narrative proposal (Phase 15). */
export interface WarrantNarrativeSection {
	section: string;
	text: string;
	citations: unknown[];
}
export async function postWarrantNarrativeProposal(
	caseId: string,
	token: string
): Promise<{ case_id: string; proposal: { sections: WarrantNarrativeSection[] } }> {
	const res = await fetch(`${CASE_ENGINE_BASE_URL}/cases/${caseId}/narrative/warrant-proposal`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
	});
	const data = await res.json().catch(() => ({}));
	if (!res.ok) throw new Error((data as { error?: string })?.error ?? `Warrant proposal failed (${res.status})`);
	return data as { case_id: string; proposal: { sections: WarrantNarrativeSection[] } };
}

/** P15-07: Exhibit list (Phase 15). */
export interface ExhibitItem {
	exhibit_id: string;
	case_id: string;
	title: string | null;
	description: string | null;
	source_type: string;
	source_id: string;
	occurred_at: string;
	citations: unknown[];
}
export async function getExhibits(
	caseId: string,
	token: string
): Promise<{ case_id: string; exhibits: ExhibitItem[] }> {
	const res = await fetch(`${CASE_ENGINE_BASE_URL}/cases/${caseId}/exhibits`, {
		headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
	});
	const data = await res.json().catch(() => ({}));
	if (!res.ok) throw new Error((data as { error?: string })?.error ?? `Exhibits failed (${res.status})`);
	return data as { case_id: string; exhibits: ExhibitItem[] };
}

/** P15-07: Prosecutor summary (Phase 15). */
export interface ProsecutorSummarySection {
	section: string;
	text: string;
	citations: unknown[];
}
export async function getProsecutorSummary(
	caseId: string,
	token: string
): Promise<{ case_id: string; summary: { sections: ProsecutorSummarySection[] } }> {
	const res = await fetch(`${CASE_ENGINE_BASE_URL}/cases/${caseId}/prosecutor-summary`, {
		headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
	});
	const data = await res.json().catch(() => ({}));
	if (!res.ok) throw new Error((data as { error?: string })?.error ?? `Prosecutor summary failed (${res.status})`);
	return data as { case_id: string; summary: { sections: ProsecutorSummarySection[] } };
}

export type NarrativeExportFormat = 'json' | 'md' | 'html';
const NARRATIVE_EXPORT_PATHS = [
	'narrative-timeline',
	'warrant-narrative',
	'exhibits',
	'prosecutor-summary',
	'court-packet'
] as const;

/** P15-07: Download or open narrative/court export. */
export async function fetchNarrativeExport(
	caseId: string,
	token: string,
	path: (typeof NARRATIVE_EXPORT_PATHS)[number],
	format: NarrativeExportFormat,
	action: 'download' | 'open'
): Promise<void> {
	const sp = new URLSearchParams();
	sp.set('format', format);
	const res = await fetch(`${CASE_ENGINE_BASE_URL}/cases/${caseId}/exports/${path}?${sp}`, {
		headers: { Authorization: `Bearer ${token}` }
	});
	if (!res.ok) {
		const data = await res.json().catch(() => ({}));
		throw new Error((data as { error?: string })?.error ?? `Export failed (${res.status})`);
	}
	const blob = await res.blob();
	const contentType = res.headers.get('Content-Type') ?? '';
	const contentDisposition = res.headers.get('Content-Disposition');
	const ext = format === 'json' ? 'json' : format === 'md' ? 'md' : 'html';
	const casePrefix = caseId.slice(0, 8);
	let filename = `case-${casePrefix}-${path}.${ext}`;
	if (contentDisposition) {
		const match = contentDisposition.match(/filename="?([^";\n]+)"?/);
		if (match) filename = match[1].trim();
	}
	const url = URL.createObjectURL(blob);
	if (action === 'open' && (contentType.includes('html') || contentType.includes('markdown'))) {
		window.open(url, '_blank', 'noopener');
		// Revoke after a delay so the new tab can load
		setTimeout(() => URL.revokeObjectURL(url), 5000);
	} else {
		const a = document.createElement('a');
		a.href = url;
		a.download = filename;
		a.click();
		URL.revokeObjectURL(url);
	}
}

export async function downloadWarrantPacket(
	caseId: string,
	token: string,
	opts?: { includeDeleted?: boolean; caseNumber?: string }
): Promise<void> {
	const sp = new URLSearchParams();
	sp.set('format', 'html');
	if (opts?.includeDeleted) sp.set('includeDeleted', 'true');
	const res = await fetch(`${CASE_ENGINE_BASE_URL}/cases/${caseId}/exports/warrant-packet?${sp}`, {
		headers: { Authorization: `Bearer ${token}` }
	});
	if (!res.ok) {
		const data = await res.json().catch(() => ({}));
		throw new Error((data as { error?: string })?.error ?? `Download failed (${res.status})`);
	}
	const blob = await res.blob();
	const contentDisposition = res.headers.get('Content-Disposition');
	let filename = `Warrant_Packet_${caseId.slice(0, 8)}_${new Date().toISOString().slice(0, 10)}.html`;
	if (contentDisposition) {
		const match = contentDisposition.match(/filename="?([^";\n]+)"?/);
		if (match) filename = match[1].trim();
	} else if (opts?.caseNumber) {
		const safe = (opts.caseNumber || '').replace(/[^a-zA-Z0-9_-]/g, '_') || 'case';
		filename = `Warrant_Packet_${safe}_${new Date().toISOString().slice(0, 10)}.html`;
	}
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = filename;
	a.click();
	URL.revokeObjectURL(url);
}

/** Ticket 20: Download warrant packet as PDF */
export async function downloadWarrantPacketPdf(
	caseId: string,
	token: string,
	opts?: { includeDeleted?: boolean; caseNumber?: string }
): Promise<void> {
	const sp = new URLSearchParams();
	sp.set('format', 'pdf');
	if (opts?.includeDeleted) sp.set('includeDeleted', 'true');
	const res = await fetch(`${CASE_ENGINE_BASE_URL}/cases/${caseId}/exports/warrant-packet?${sp}`, {
		headers: { Authorization: `Bearer ${token}` }
	});
	if (!res.ok) {
		const data = await res.json().catch(() => ({}));
		throw new Error((data as { error?: string })?.error ?? `PDF download failed (${res.status})`);
	}
	const blob = await res.blob();
	const contentDisposition = res.headers.get('Content-Disposition');
	let filename = `Warrant_Packet_${caseId.slice(0, 8)}_${new Date().toISOString().slice(0, 10)}.pdf`;
	if (contentDisposition) {
		const match = contentDisposition.match(/filename="?([^";\n]+)"?/);
		if (match) filename = match[1].trim();
	} else if (opts?.caseNumber) {
		const safe = (opts.caseNumber || '').replace(/[^a-zA-Z0-9_-]/g, '_') || 'case';
		filename = `Warrant_Packet_${safe}_${new Date().toISOString().slice(0, 10)}.pdf`;
	}
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = filename;
	a.click();
	URL.revokeObjectURL(url);
}

/** Ticket 19: Warrant Draft Workspace */
export interface WarrantDraftItem {
	id: string;
	caseId: string;
	templateId: string;
	title: string;
	latestVersionId: string;
	latestVersionAt: string;
	createdBy: string;
	createdAt: string;
	updatedAt: string;
	deletedAt: string | null;
}

export async function listWarrantDrafts(
	caseId: string,
	token: string,
	opts?: { includeDeleted?: boolean }
): Promise<{ items: WarrantDraftItem[] }> {
	const sp = new URLSearchParams();
	if (opts?.includeDeleted) sp.set('includeDeleted', 'true');
	const qs = sp.toString();
	const res = await fetch(`${CASE_ENGINE_BASE_URL}/cases/${caseId}/warrant-drafts${qs ? `?${qs}` : ''}`, {
		headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
	});
	const data = await res.json().catch(() => ({}));
	if (!res.ok) throw new Error((data as { error?: string })?.error ?? `Failed to list drafts (${res.status})`);
	return data as { items: WarrantDraftItem[] };
}

export interface WarrantDraftData {
	templateId?: string;
	facts?: {
		affiantName?: string;
		affiantBadge?: string;
		targetLocation?: string;
		requestedItemsText?: string;
		probableCauseText?: string;
		factsFocus?: string;
	};
	ai?: { used?: boolean; narrative?: string; generatedAt?: string };
}

export async function createWarrantDraft(
	caseId: string,
	token: string,
	payload: { templateId: string; title?: string; data: Record<string, unknown> }
): Promise<{ draft: WarrantDraftItem; version: { id: string; createdAt: string; createdBy: string } }> {
	const res = await fetch(`${CASE_ENGINE_BASE_URL}/cases/${caseId}/warrant-drafts`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
		body: JSON.stringify(payload)
	});
	const data = await res.json().catch(() => ({}));
	if (!res.ok) throw new Error((data as { error?: string })?.error ?? `Failed to create draft (${res.status})`);
	return data;
}

export async function getWarrantDraft(
	caseId: string,
	draftId: string,
	token: string,
	opts?: { includeDeleted?: boolean }
): Promise<{
	draft: WarrantDraftItem;
	latest: { versionId: string; data: Record<string, unknown>; createdAt: string; createdBy: string };
}> {
	const sp = new URLSearchParams();
	if (opts?.includeDeleted) sp.set('includeDeleted', 'true');
	const qs = sp.toString();
	const res = await fetch(`${CASE_ENGINE_BASE_URL}/cases/${caseId}/warrant-drafts/${draftId}${qs ? `?${qs}` : ''}`, {
		headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
	});
	const data = await res.json().catch(() => ({}));
	if (!res.ok) throw new Error((data as { error?: string })?.error ?? `Failed to get draft (${res.status})`);
	return data;
}

export async function createWarrantDraftVersion(
	caseId: string,
	draftId: string,
	token: string,
	payload: { data: Record<string, unknown> }
): Promise<{ version: { id: string; createdAt: string; createdBy: string } }> {
	const res = await fetch(`${CASE_ENGINE_BASE_URL}/cases/${caseId}/warrant-drafts/${draftId}/versions`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
		body: JSON.stringify(payload)
	});
	const data = await res.json().catch(() => ({}));
	if (!res.ok) throw new Error((data as { error?: string })?.error ?? `Failed to save version (${res.status})`);
	return data;
}

export async function deleteWarrantDraft(caseId: string, draftId: string, token: string): Promise<void> {
	const res = await fetch(`${CASE_ENGINE_BASE_URL}/cases/${caseId}/warrant-drafts/${draftId}`, {
		method: 'DELETE',
		headers: { Authorization: `Bearer ${token}` }
	});
	if (!res.ok) {
		const data = await res.json().catch(() => ({}));
		throw new Error((data as { error?: string })?.error ?? `Failed to delete draft (${res.status})`);
	}
}

export async function restoreWarrantDraft(
	caseId: string,
	draftId: string,
	token: string
): Promise<WarrantDraftItem> {
	const res = await fetch(`${CASE_ENGINE_BASE_URL}/cases/${caseId}/warrant-drafts/${draftId}/restore`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
	});
	const data = await res.json().catch(() => ({}));
	if (!res.ok) throw new Error((data as { error?: string })?.error ?? `Failed to restore draft (${res.status})`);
	return data as WarrantDraftItem;
}

// ─── Ticket 25: Evidence tags ───────────────────────────────────────────────

/** Add tag to timeline entry */
export async function addEntryTag(
	caseId: string,
	entryId: string,
	tag: string,
	token: string
): Promise<void> {
	const res = await fetch(`${CASE_ENGINE_BASE_URL}/cases/${caseId}/entries/${entryId}/tags`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${token}`
		},
		body: JSON.stringify({ tag })
	});
	const data = await res.json().catch(() => ({}));
	if (!res.ok) throw new Error((data as { error?: string })?.error ?? `Add tag failed (${res.status})`);
}

/** Remove tag from timeline entry */
export async function removeEntryTag(
	caseId: string,
	entryId: string,
	tag: string,
	token: string
): Promise<void> {
	const enc = encodeURIComponent(tag);
	const res = await fetch(`${CASE_ENGINE_BASE_URL}/cases/${caseId}/entries/${entryId}/tags/${enc}`, {
		method: 'DELETE',
		headers: { Authorization: `Bearer ${token}` }
	});
	if (res.status === 204) return;
	const data = await res.json().catch(() => ({}));
	throw new Error((data as { error?: string })?.error ?? `Remove tag failed (${res.status})`);
}

/** Add tag to case file */
export async function addFileTag(
	caseId: string,
	fileId: string,
	tag: string,
	token: string
): Promise<void> {
	const res = await fetch(`${CASE_ENGINE_BASE_URL}/cases/${caseId}/files/${fileId}/tags`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${token}`
		},
		body: JSON.stringify({ tag })
	});
	const data = await res.json().catch(() => ({}));
	if (!res.ok) throw new Error((data as { error?: string })?.error ?? `Add tag failed (${res.status})`);
}

/** Remove tag from case file */
export async function removeFileTag(
	caseId: string,
	fileId: string,
	tag: string,
	token: string
): Promise<void> {
	const enc = encodeURIComponent(tag);
	const res = await fetch(`${CASE_ENGINE_BASE_URL}/cases/${caseId}/files/${fileId}/tags/${enc}`, {
		method: 'DELETE',
		headers: { Authorization: `Bearer ${token}` }
	});
	if (res.status === 204) return;
	const data = await res.json().catch(() => ({}));
	throw new Error((data as { error?: string })?.error ?? `Remove tag failed (${res.status})`);
}

// ─── P13-05: Workflow items (Phase 13) ──────────────────────────────────────

export type WorkflowItemType = 'HYPOTHESIS' | 'GAP';
export type WorkflowItemOrigin = 'INVESTIGATOR' | 'PROPOSAL';

export interface WorkflowItemCitation {
	source_type: string;
	source_id: string;
	note?: string;
	[key: string]: unknown;
}

export interface WorkflowItem {
	id: string;
	case_id: string;
	type: string;
	title: string;
	description: string | null;
	status: string;
	priority: number | null;
	entity_type: string | null;
	entity_normalized_id: string | null;
	lead_id: string | null;
	citations: WorkflowItemCitation[];
	origin: WorkflowItemOrigin;
	created_by: string;
	created_at: string;
	updated_at: string;
	updated_by: string | null;
	deleted_at: string | null;
	deleted_by: string | null;
}

export interface WorkflowItemCreateInput {
	type: WorkflowItemType;
	title: string;
	description?: string;
	status?: string;
	priority?: number;
	entity_type?: string;
	entity_normalized_id?: string;
	citations?: WorkflowItemCitation[];
}

export interface WorkflowItemUpdateInput {
	title?: string;
	description?: string;
	status?: string;
	priority?: number;
}

export async function listWorkflowItems(
	caseId: string,
	token: string,
	params?: { type?: WorkflowItemType; includeDeleted?: boolean; entityType?: string; entityNormalizedId?: string }
): Promise<WorkflowItem[]> {
	const sp = new URLSearchParams();
	if (params?.type) sp.set('type', params.type);
	if (params?.includeDeleted) sp.set('includeDeleted', 'true');
	if (params?.entityType && params?.entityNormalizedId) {
		sp.set('entity_type', params.entityType);
		sp.set('entity_normalized_id', params.entityNormalizedId);
	}
	const qs = sp.toString();
	const url = `${CASE_ENGINE_BASE_URL}/cases/${caseId}/workflow-items${qs ? `?${qs}` : ''}`;
	const res = await fetch(url, {
		headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
	});
	const data = await res.json().catch(() => ({}));
	if (!res.ok) throw new Error((data as { error?: string })?.error ?? `Failed to list workflow items (${res.status})`);
	const items = (data as { workflow_items?: WorkflowItem[] }).workflow_items;
	return Array.isArray(items) ? items : [];
}

export async function getWorkflowItem(
	caseId: string,
	workflowItemId: string,
	token: string,
	opts?: { includeDeleted?: boolean }
): Promise<WorkflowItem> {
	const sp = new URLSearchParams();
	if (opts?.includeDeleted) sp.set('includeDeleted', 'true');
	const qs = sp.toString();
	const url = `${CASE_ENGINE_BASE_URL}/cases/${caseId}/workflow-items/${workflowItemId}${qs ? `?${qs}` : ''}`;
	const res = await fetch(url, {
		headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
	});
	const data = await res.json().catch(() => ({}));
	if (!res.ok) throw new Error((data as { error?: string })?.error ?? `Failed to get workflow item (${res.status})`);
	return data as WorkflowItem;
}

export async function createWorkflowItem(
	caseId: string,
	token: string,
	payload: WorkflowItemCreateInput
): Promise<WorkflowItem> {
	const outboundRequestId = newCaseEngineRequestId();
	const res = await fetch(`${CASE_ENGINE_BASE_URL}/cases/${caseId}/workflow-items`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, 'X-Request-Id': outboundRequestId },
		body: JSON.stringify(payload)
	});
	const data = await res.json().catch(() => ({}));
	if (!res.ok) throw new Error((data as { error?: string })?.error ?? `Failed to create workflow item (${res.status})`);
	return data as WorkflowItem;
}

export async function updateWorkflowItem(
	caseId: string,
	workflowItemId: string,
	token: string,
	payload: WorkflowItemUpdateInput
): Promise<WorkflowItem> {
	const res = await fetch(`${CASE_ENGINE_BASE_URL}/cases/${caseId}/workflow-items/${workflowItemId}`, {
		method: 'PATCH',
		headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
		body: JSON.stringify(payload)
	});
	const data = await res.json().catch(() => ({}));
	if (!res.ok) throw new Error((data as { error?: string })?.error ?? `Failed to update workflow item (${res.status})`);
	return data as WorkflowItem;
}

export async function deleteWorkflowItem(
	caseId: string,
	workflowItemId: string,
	token: string
): Promise<WorkflowItem> {
	const res = await fetch(`${CASE_ENGINE_BASE_URL}/cases/${caseId}/workflow-items/${workflowItemId}`, {
		method: 'DELETE',
		headers: { Authorization: `Bearer ${token}` }
	});
	const data = await res.json().catch(() => ({}));
	if (!res.ok) throw new Error((data as { error?: string })?.error ?? `Failed to delete workflow item (${res.status})`);
	return data as WorkflowItem;
}

export async function restoreWorkflowItem(
	caseId: string,
	workflowItemId: string,
	token: string
): Promise<WorkflowItem> {
	const res = await fetch(`${CASE_ENGINE_BASE_URL}/cases/${caseId}/workflow-items/${workflowItemId}/restore`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
	});
	const data = await res.json().catch(() => ({}));
	if (!res.ok) throw new Error((data as { error?: string })?.error ?? `Restore failed (${res.status})`);
	return data as WorkflowItem;
}

export interface WorkflowProposal {
	id: string;
	case_id: string;
	proposal_type: 'CREATE_HYPOTHESIS' | 'CREATE_GAP';
	status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
	suggested_payload: {
		type?: string;
		title?: string;
		description?: string;
		status?: string;
		priority?: number;
		entity_type?: string | null;
		entity_normalized_id?: string | null;
		[key: string]: unknown;
	} | null;
	citations: Array<{ source_type: string; source_id: string; note?: string; [key: string]: unknown }>;
	workflow_item_id: string | null;
	created_by: string;
	created_at: string;
	resolved_at: string | null;
	resolved_by: string | null;
}

/** List workflow proposals for a case. */
export async function listWorkflowProposals(
	caseId: string,
	token: string,
	params?: { status?: string }
): Promise<WorkflowProposal[]> {
	const sp = new URLSearchParams();
	if (params?.status) sp.set('status', params.status);
	const qs = sp.toString();
	const url = `${CASE_ENGINE_BASE_URL}/cases/${caseId}/workflow-proposals${qs ? `?${qs}` : ''}`;
	const res = await fetch(url, {
		headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
	});
	const data = await res.json().catch(() => ({}));
	if (!res.ok) throw new Error((data as { error?: string })?.error ?? `Failed to list workflow proposals (${res.status})`);
	const items = (data as { workflow_proposals?: WorkflowProposal[] }).workflow_proposals;
	return Array.isArray(items) ? items : [];
}

export async function acceptWorkflowProposal(
	caseId: string,
	proposalId: string,
	token: string
): Promise<{ proposal: WorkflowProposal; workflow_item: WorkflowItem }> {
	const url = `${CASE_ENGINE_BASE_URL}/cases/${caseId}/workflow-proposals/${proposalId}/accept`;
	const res = await fetch(url, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
	});
	const data = await res.json().catch(() => ({}));
	if (!res.ok) throw new Error((data as { error?: string })?.error ?? `Failed to accept proposal (${res.status})`);
	return data as { proposal: WorkflowProposal; workflow_item: WorkflowItem };
}

export async function rejectWorkflowProposal(
	caseId: string,
	proposalId: string,
	token: string,
	reason?: string
): Promise<WorkflowProposal> {
	const url = `${CASE_ENGINE_BASE_URL}/cases/${caseId}/workflow-proposals/${proposalId}/reject`;
	const body: { reason?: string } = {};
	if (reason && reason.trim()) body.reason = reason.trim();
	const res = await fetch(url, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
		body: JSON.stringify(body)
	});
	const data = await res.json().catch(() => ({}));
	if (!res.ok) throw new Error((data as { error?: string })?.error ?? `Failed to reject proposal (${res.status})`);
	return data as WorkflowProposal;
}

// ─── Search (Ticket 5 Part 5) ──────────────────────────────────────────────

export async function searchCases(
	params: { q: string; scope: SearchScope; caseId?: string; unit?: 'CID' | 'SIU'; tag?: string },
	token: string
): Promise<SearchResponse> {
	const sp = new URLSearchParams();
	sp.set('q', params.q);
	sp.set('scope', params.scope);
	if (params.caseId) sp.set('caseId', params.caseId);
	if (params.unit) sp.set('unit', params.unit);
	if (params.tag?.trim()) sp.set('tag', params.tag.trim());
	const res = await fetch(`${CASE_ENGINE_BASE_URL}/search?${sp}`, {
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${token}`
		}
	});
	const data = await res.json().catch(() => ({}));
	if (!res.ok) {
		throw new Error(data?.error ?? `Search failed (${res.status})`);
	}
	return data;
}

export interface CaseSearchResponse {
	q: string;
	results: SearchResultItem[];
}

export async function searchCaseIntelligence(
	caseId: string,
	params: { q: string; tag?: string },
	token: string
): Promise<CaseSearchResponse> {
	const sp = new URLSearchParams();
	sp.set('q', params.q);
	if (params.tag?.trim()) sp.set('tag', params.tag.trim());
	const res = await fetch(`${CASE_ENGINE_BASE_URL}/cases/${caseId}/search?${sp}`, {
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${token}`
		}
	});
	const data = await res.json().catch(() => ({}));
	if (!res.ok) {
		throw new Error(data?.error ?? `Case intelligence search failed (${res.status})`);
	}
	const obj = data as { q?: string; results?: SearchResultItem[] };
	return {
		q: typeof obj.q === 'string' ? obj.q : params.q,
		results: Array.isArray(obj.results) ? obj.results : []
	};
}

export interface IntelSearchResult {
	result_type: 'timeline_entry' | 'file_excerpt' | 'graph_entity';
	case: {
		id: string;
		case_number: string;
		title: string;
		unit: string;
	};
	source: {
		kind: 'timeline_entry' | 'file_excerpt' | 'graph_entity';
		id: string;
		occurred_at?: string;
		created_at?: string;
		uploaded_at?: string;
		created_by?: string;
		entry_type?: string;
		file_name?: string;
		entity_type?: string;
		value?: string;
		normalized_value?: string;
	};
	match: {
		field: string;
		excerpt: string;
	};
	citation: {
		label: string;
		case_id: string;
		source_kind: string;
		source_id: string;
	};
}

export interface IntelSearchResponse {
	query: string;
	scope_requested: string;
	scope_applied: string;
	unit_applied: string | null;
	result_count: number;
	results: IntelSearchResult[];
}

export async function searchCrossCaseIntelligence(
	params: { q: string; scope?: 'UNIT' | 'ALL'; unit?: 'CID' | 'SIU' },
	token: string
): Promise<IntelSearchResponse> {
	const sp = new URLSearchParams();
	sp.set('q', params.q);
	sp.set('scope', params.scope ?? 'UNIT');
	if (params.unit) sp.set('unit', params.unit);
	const res = await fetch(`${CASE_ENGINE_BASE_URL}/search/intel?${sp}`, {
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${token}`
		}
	});
	const data = await res.json().catch(() => ({}));
	if (!res.ok) {
		throw new Error(data?.error ?? `Cross-case intelligence search failed (${res.status})`);
	}
	return data as IntelSearchResponse;
}

// ─── P19-08: Thread Scope Associations ────────────────────────────────────

/**
 * Association between an OWUI chat thread (external_thread_id) and a case.
 * Returned by all case thread association endpoints.
 */
export interface CaseThreadAssociation {
	id: string;
	case_id: string;
	external_thread_id: string;
	scope_type: 'case';
	created_at: string;
	created_by: string;
	updated_at: string;
}

/**
 * Association between an OWUI chat thread (thread_id) and a user's personal desktop.
 * Returned by all personal thread association endpoints.
 */
export interface PersonalThreadAssociation {
	id: string;
	owner_user_id: string;
	thread_id: string;
	scope_type: 'personal';
	created_at: string;
	created_by: string;
	updated_at: string;
}

export interface ThreadScopeFile {
	id: string;
	original_filename: string;
	uploaded_at: string;
}

/** List all active case-scoped thread associations for a case. Requires case read access. */
export async function listCaseThreadAssociations(
	caseId: string,
	token: string
): Promise<CaseThreadAssociation[]> {
	const res = await fetch(`${CASE_ENGINE_BASE_URL}/cases/${caseId}/threads`, {
		headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
	});
	const data = await res.json().catch(() => ({}));
	if (!res.ok)
		throw new Error(extractApiErrorMessage(data, `Failed to list case threads (${res.status})`));
	return Array.isArray(data) ? (data as CaseThreadAssociation[]) : [];
}

/** Optional one-time 401 retry: caller provides a function to resolve a fresh token. */
export type BindRetryOptions = { getFreshToken?: () => Promise<string | null> };

/**
 * Create or restore a case thread association (idempotent upsert).
 * Requires case mutate access. Throws on scope conflict (400) or access denied (403).
 * On 401 only: if getFreshToken is provided, resolves once, retries once, then surfaces error if still failing.
 */
export async function upsertCaseThreadAssociation(
	caseId: string,
	threadId: string,
	token: string,
	options?: BindRetryOptions
): Promise<CaseThreadAssociation> {
	if (!token || String(token).trim() === '') {
		throw new Error('Case Engine token is required to bind thread to case');
	}
	const url = `${CASE_ENGINE_BASE_URL}/cases/${caseId}/threads/${encodeURIComponent(threadId)}`;
	const doRequest = (t: string) =>
		fetch(url, {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` }
		});
	let res = await doRequest(token);
	if (!res.ok && res.status === 401 && options?.getFreshToken) {
		const newToken = await options.getFreshToken();
		if (newToken && String(newToken).trim() !== '') {
			res = await doRequest(newToken);
		}
	}
	const data = await res.json().catch(() => ({}));
	if (!res.ok)
		throw new Error(extractApiErrorMessage(data, `Failed to bind thread to case (${res.status})`));
	return data as CaseThreadAssociation;
}

/** Soft-delete a case thread association. Requires case mutate access. */
export async function deleteCaseThreadAssociation(
	caseId: string,
	threadId: string,
	token: string
): Promise<void> {
	const res = await fetch(
		`${CASE_ENGINE_BASE_URL}/cases/${caseId}/threads/${encodeURIComponent(threadId)}`,
		{
			method: 'DELETE',
			headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
		}
	);
	if (!res.ok) {
		const data = await res.json().catch(() => ({}));
		throw new Error(
			extractApiErrorMessage(data, `Failed to remove case thread association (${res.status})`)
		);
	}
}

/** P22-09: list active selected files for a case thread scope. */
export async function getThreadScopeFiles(
	caseId: string,
	threadId: string,
	token: string
): Promise<{ thread_id: string; case_id: string; files: ThreadScopeFile[] }> {
	const sp = new URLSearchParams();
	sp.set('thread_id', threadId);
	const res = await fetch(`${CASE_ENGINE_BASE_URL}/cases/${caseId}/thread-scope/files?${sp.toString()}`, {
		headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
	});
	const data = await res.json().catch(() => ({}));
	if (!res.ok) {
		throw new Error(
			extractApiErrorMessage(data, `Failed to load thread scope files (${res.status})`)
		);
	}
	const files = Array.isArray((data as { files?: unknown }).files)
		? ((data as { files: ThreadScopeFile[] }).files ?? [])
		: [];
	return {
		thread_id: String((data as { thread_id?: string }).thread_id ?? threadId),
		case_id: String((data as { case_id?: string }).case_id ?? caseId),
		files
	};
}

/** P22-09: add a file to active case thread scope. */
export async function addThreadScopeFile(
	caseId: string,
	threadId: string,
	fileId: string,
	token: string
): Promise<{ thread_id: string; case_id: string; file_id: string; status: 'selected' | 'already_selected' }> {
	const res = await fetch(`${CASE_ENGINE_BASE_URL}/cases/${caseId}/thread-scope/files`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
		body: JSON.stringify({ thread_id: threadId, file_id: fileId })
	});
	const data = await res.json().catch(() => ({}));
	if (!res.ok) {
		throw new Error(
			extractApiErrorMessage(data, `Failed to add thread scope file (${res.status})`)
		);
	}
	return data as { thread_id: string; case_id: string; file_id: string; status: 'selected' | 'already_selected' };
}

/** P22-09: remove a file from active case thread scope. */
export async function removeThreadScopeFile(
	caseId: string,
	threadId: string,
	fileId: string,
	token: string
): Promise<{ thread_id: string; case_id: string; file_id: string; status: 'removed' | 'not_selected' }> {
	const sp = new URLSearchParams();
	sp.set('thread_id', threadId);
	const res = await fetch(
		`${CASE_ENGINE_BASE_URL}/cases/${caseId}/thread-scope/files/${encodeURIComponent(fileId)}?${sp.toString()}`,
		{
			method: 'DELETE',
			headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
		}
	);
	const data = await res.json().catch(() => ({}));
	if (!res.ok) {
		throw new Error(
			extractApiErrorMessage(data, `Failed to remove thread scope file (${res.status})`)
		);
	}
	return data as { thread_id: string; case_id: string; file_id: string; status: 'removed' | 'not_selected' };
}

/** List all active personal thread associations for the authenticated user. */
export async function listPersonalThreadAssociations(
	token: string
): Promise<PersonalThreadAssociation[]> {
	const res = await fetch(`${CASE_ENGINE_BASE_URL}/desktop/threads`, {
		headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
	});
	const data = await res.json().catch(() => ({}));
	if (!res.ok)
		throw new Error(extractApiErrorMessage(data, `Failed to list personal threads (${res.status})`));
	return Array.isArray(data) ? (data as PersonalThreadAssociation[]) : [];
}

/**
 * Create or restore a personal thread association (idempotent upsert).
 * Throws on scope conflict (400) — thread already active in case scope.
 * On 401 only: if getFreshToken is provided, resolves once, retries once, then surfaces error if still failing.
 */
export async function upsertPersonalThreadAssociation(
	threadId: string,
	token: string,
	options?: BindRetryOptions
): Promise<PersonalThreadAssociation> {
	if (!token || String(token).trim() === '') {
		throw new Error('Case Engine token is required to bind thread to personal desktop');
	}
	const url = `${CASE_ENGINE_BASE_URL}/desktop/threads/${encodeURIComponent(threadId)}`;
	const doRequest = (t: string) =>
		fetch(url, {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` }
		});
	let res = await doRequest(token);
	if (!res.ok && res.status === 401 && options?.getFreshToken) {
		const newToken = await options.getFreshToken();
		if (newToken && String(newToken).trim() !== '') {
			res = await doRequest(newToken);
		}
	}
	const data = await res.json().catch(() => ({}));
	if (!res.ok)
		throw new Error(
			extractApiErrorMessage(data, `Failed to bind thread to personal desktop (${res.status})`)
		);
	return data as PersonalThreadAssociation;
}

/** Soft-delete a personal thread association. */
export async function deletePersonalThreadAssociation(
	threadId: string,
	token: string
): Promise<void> {
	const res = await fetch(
		`${CASE_ENGINE_BASE_URL}/desktop/threads/${encodeURIComponent(threadId)}`,
		{
			method: 'DELETE',
			headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
		}
	);
	if (!res.ok) {
		const data = await res.json().catch(() => ({}));
		throw new Error(
			extractApiErrorMessage(data, `Failed to remove personal thread association (${res.status})`)
		);
	}
}

// ─── P19-09: Proposal Pipeline ────────────────────────────────────────────────

export type ProposalScope = 'case' | 'personal';
export type ProposalType = 'note' | 'timeline';
export type ProposalStatus = 'pending' | 'approved' | 'rejected' | 'committed';

/**
 * P41-04: `proposed_payload` JSON may include `deterministic_timestamp_candidates` (schema_version 2
 * per P41-03) for document-ingest timeline rows — preserved verbatim on list/get/update when unchanged.
 * P41-05: list/get/create/update/commit may add `occurred_at_timestamp_reconciliation` (computed, not stored).
 * P41-06: optional `operational_timezone` + `model_operational_calendar_ymd` — read-time date comparison context only.
 * P41-09: list/get may add `occurred_at_guidance` (computed, not stored; advisory only).
 */
export type OccurredAtTimestampReconciliationState =
	| 'no_model_timestamp'
	| 'no_deterministic_candidates'
	| 'exact_match'
	| 'date_match_precision_diff'
	| 'deterministic_more_precise'
	| 'model_more_precise'
	| 'conflict'
	| 'deterministic_ambiguous'
	| 'deterministic_partial_only'
	| 'unresolved';

export interface OccurredAtTimestampReconciliation {
	schema_version: 1;
	reconciliation_state: OccurredAtTimestampReconciliationState | string;
	compared_model_occurred_at: string | null;
	model_occurred_at_normalized_utc: string | null;
	matched_candidate_index: number | null;
	matched_candidate_summary: string | null;
	reason_codes: string[];
	/** P41-06: IANA zone used for calendar-date comparison (default America/New_York on server). */
	operational_timezone?: string;
	/** P41-06: Model instant’s calendar date in `operational_timezone` (YYYY-MM-DD). */
	model_operational_calendar_ymd?: string | null;
}

/** P41-09 — Read-time advisory synthesis (deterministic + reconciliation + optional P41-08 AI). */
export type OccurredAtGuidanceState =
	| 'clear_deterministic_exact'
	| 'deterministic_preferred'
	| 'model_preferred'
	| 'date_level_alignment'
	| 'ambiguous_requires_operator_choice'
	| 'partial_requires_operator_input'
	| 'conflict_requires_operator_review'
	| 'no_timestamp_available'
	| 'unresolved';

export interface OccurredAtGuidanceInputsSnapshot {
	reconciliation_state: string;
	deterministic_candidate_count: number;
	has_ai_assist: boolean;
	ai_suggested_candidate_index: number | null;
}

export interface OccurredAtGuidance {
	schema_version: 1;
	guidance_state: OccurredAtGuidanceState | string;
	recommended_candidate_index: number | null;
	recommended_summary: string | null;
	confidence_label: 'low' | 'medium' | 'high';
	reason_codes: string[];
	inputs_snapshot: OccurredAtGuidanceInputsSnapshot;
	operational_timezone: string;
}

export interface ProposalRecord {
	id: string;
	case_id: string;
	source_scope: ProposalScope;
	source_thread_id: string;
	source_message_id: string | null;
	proposal_type: ProposalType;
	proposed_payload: string; // JSON string — parse in callers
	status: ProposalStatus;
	created_by: string;
	created_at: string;
	reviewed_by: string | null;
	reviewed_at: string | null;
	committed_at: string | null;
	committed_record_id: string | null;
	rejection_reason: string | null;
	occurred_at_timestamp_reconciliation?: OccurredAtTimestampReconciliation;
	/** P41-09 — Advisory read-time guidance; does not change commit authority. */
	occurred_at_guidance?: OccurredAtGuidance;
}

/** P40-01 / P40-05E — POST /cases/:caseId/files/:fileId/propose-timeline-entries */
export type ProposeTimelineFromCaseFileResult =
	| {
			status: 'created';
			proposals: ProposalRecord[];
			proposal_count: number;
			bulk_threshold: number;
			source_text_truncated_for_model: boolean;
	  }
	| {
			status: 'confirmation_required';
			proposal_count: number;
			threshold: number;
			bulk_threshold: number;
			bulk_confirmation_token: string;
	  };

export async function proposeTimelineEntriesFromCaseFile(
	caseId: string,
	fileId: string,
	token: string,
	options?: { confirm_bulk?: boolean; model?: string; bulk_confirmation_token?: string }
): Promise<ProposeTimelineFromCaseFileResult> {
	const bulkTok =
		typeof options?.bulk_confirmation_token === 'string' && options.bulk_confirmation_token.trim()
			? options.bulk_confirmation_token.trim()
			: undefined;
	const res = await fetch(
		`${CASE_ENGINE_BASE_URL}/cases/${encodeURIComponent(caseId)}/files/${encodeURIComponent(fileId)}/propose-timeline-entries`,
		{
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${token}`
			},
			body: JSON.stringify({
				confirm_bulk: options?.confirm_bulk === true,
				...(options?.model ? { model: options.model } : {}),
				...(bulkTok ? { bulk_confirmation_token: bulkTok } : {})
			})
		}
	);
	const data = await res.json().catch(() => ({}));

	/** P40-05E transition: older Case Engine used 409 for threshold workflow — map to the same typed outcome. */
	if (res.status === 409) {
		const flat = data as Record<string, unknown>;
		if (flat.code === 'BULK_PROPOSAL_CONFIRMATION_REQUIRED') {
			const tok =
				typeof flat.bulk_confirmation_token === 'string' ? flat.bulk_confirmation_token.trim() : '';
			if (!tok) {
				throw new Error(extractApiErrorMessage(data, 'Bulk proposal confirmation required'));
			}
			const th =
				typeof flat.threshold === 'number'
					? flat.threshold
					: typeof flat.bulk_threshold === 'number'
						? flat.bulk_threshold
						: 10;
			return {
				status: 'confirmation_required',
				proposal_count: typeof flat.proposal_count === 'number' ? flat.proposal_count : 0,
				threshold: th,
				bulk_threshold: th,
				bulk_confirmation_token: tok
			};
		}
		throw new Error(extractApiErrorMessage(data, `Propose timeline from file failed (${res.status})`));
	}

	if (!res.ok) {
		throw new Error(extractApiErrorMessage(data, `Propose timeline from file failed (${res.status})`));
	}

	const payload = unwrapEnvelopeCanonicalFirst<Record<string, unknown>>(
		data,
		'proposeTimelineFromCaseFile'
	);

	if (payload.status === 'confirmation_required') {
		const th =
			typeof payload.threshold === 'number'
				? payload.threshold
				: typeof payload.bulk_threshold === 'number'
					? payload.bulk_threshold
					: 10;
		const tok =
			typeof payload.bulk_confirmation_token === 'string'
				? payload.bulk_confirmation_token.trim()
				: '';
		if (!tok) {
			throw new Error('Bulk confirmation required but server did not return bulk_confirmation_token');
		}
		return {
			status: 'confirmation_required',
			proposal_count: typeof payload.proposal_count === 'number' ? payload.proposal_count : 0,
			threshold: th,
			bulk_threshold: typeof payload.bulk_threshold === 'number' ? payload.bulk_threshold : th,
			bulk_confirmation_token: tok
		};
	}

	const proposals = Array.isArray(payload.proposals) ? (payload.proposals as ProposalRecord[]) : [];
	const proposal_count =
		typeof payload.proposal_count === 'number' ? payload.proposal_count : proposals.length;
	return {
		status: 'created',
		proposals,
		proposal_count,
		bulk_threshold: typeof payload.bulk_threshold === 'number' ? payload.bulk_threshold : 10,
		source_text_truncated_for_model: payload.source_text_truncated_for_model === true
	};
}

export interface CreateProposalParams {
	source_scope: ProposalScope;
	source_thread_id: string;
	source_message_id?: string;
	proposal_type: ProposalType;
	proposed_payload: Record<string, unknown>;
}

/** List all proposals for a case. Optionally filter by status. */
export async function listProposals(
	caseId: string,
	token: string,
	status?: ProposalStatus
): Promise<ProposalRecord[]> {
	// Relative `/case-api` base: do not use `new URL()` without a base (throws before fetch).
	const qs = status ? `?status=${encodeURIComponent(status)}` : '';
	const res = await fetch(`${CASE_ENGINE_BASE_URL}/cases/${caseId}/proposals${qs}`, {
		headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
	});
	const data = await res.json().catch(() => ({}));
	if (!res.ok)
		throw new Error(
			(data as { error?: string })?.error ?? `Failed to list proposals (${res.status})`
		);
	return Array.isArray(data) ? (data as ProposalRecord[]) : [];
}

/** Create a proposal from chat content. */
export async function createProposal(
	caseId: string,
	params: CreateProposalParams,
	token: string
): Promise<ProposalRecord> {
	const res = await fetch(`${CASE_ENGINE_BASE_URL}/cases/${caseId}/proposals`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
		body: JSON.stringify(params)
	});
	const data = await res.json().catch(() => ({}));
	if (!res.ok)
		throw new Error(
			(data as { error?: string })?.error ?? `Failed to create proposal (${res.status})`
		);
	return data as ProposalRecord;
}

/** Get a single proposal by id. */
export async function getProposal(
	caseId: string,
	proposalId: string,
	token: string
): Promise<ProposalRecord> {
	const res = await fetch(`${CASE_ENGINE_BASE_URL}/cases/${caseId}/proposals/${proposalId}`, {
		headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
	});
	const data = await res.json().catch(() => ({}));
	if (!res.ok)
		throw new Error(
			(data as { error?: string })?.error ?? `Failed to get proposal (${res.status})`
		);
	return data as ProposalRecord;
}

/**
 * Update proposal payload while **pending**, or while **approved** before commit (reviewer with
 * `can_approve_ai_proposals`). **Approved timeline (P40-03A):** server allows only chronology /
 * ambiguity / low-confidence confirmation fields, plus document-ingest body fields when applicable —
 * not arbitrary text rewrites on generic timeline proposals.
 */
export async function updateProposal(
	caseId: string,
	proposalId: string,
	newPayload: Record<string, unknown>,
	token: string
): Promise<ProposalRecord> {
	const res = await fetch(`${CASE_ENGINE_BASE_URL}/cases/${caseId}/proposals/${proposalId}`, {
		method: 'PUT',
		headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
		body: JSON.stringify({ proposed_payload: newPayload })
	});
	const data = await res.json().catch(() => ({}));
	if (!res.ok)
		throw new Error(
			(data as { error?: string })?.error ?? `Failed to update proposal (${res.status})`
		);
	return data as ProposalRecord;
}

/** Approve a pending proposal. */
export async function approveProposal(
	caseId: string,
	proposalId: string,
	token: string
): Promise<ProposalRecord> {
	const res = await fetch(
		`${CASE_ENGINE_BASE_URL}/cases/${caseId}/proposals/${proposalId}/approve`,
		{
			method: 'POST',
			headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
		}
	);
	const data = await res.json().catch(() => ({}));
	if (!res.ok)
		throw new Error(
			(data as { error?: string })?.error ?? `Failed to approve proposal (${res.status})`
		);
	return data as ProposalRecord;
}

/** Reject a pending proposal. rejection_reason is required. */
export async function rejectProposal(
	caseId: string,
	proposalId: string,
	rejectionReason: string,
	token: string
): Promise<ProposalRecord> {
	const res = await fetch(
		`${CASE_ENGINE_BASE_URL}/cases/${caseId}/proposals/${proposalId}/reject`,
		{
			method: 'POST',
			headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
			body: JSON.stringify({ rejection_reason: rejectionReason })
		}
	);
	const data = await res.json().catch(() => ({}));
	if (!res.ok)
		throw new Error(
			(data as { error?: string })?.error ?? `Failed to reject proposal (${res.status})`
		);
	return data as ProposalRecord;
}

/** Commit an approved proposal into an official case record. */
export async function commitProposal(
	caseId: string,
	proposalId: string,
	token: string
): Promise<ProposalRecord> {
	const res = await fetch(
		`${CASE_ENGINE_BASE_URL}/cases/${caseId}/proposals/${proposalId}/commit`,
		{
			method: 'POST',
			headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
		}
	);
	const data = await res.json().catch(() => ({}));
	if (!res.ok)
		throw new Error(
			(data as { error?: string })?.error ?? `Failed to commit proposal (${res.status})`
		);
	return data as ProposalRecord;
}

/** Server-side AI draft + P19 proposal (chat-intake marker; creator may approve in-app). */
export async function draftChatIntakeProposal(
	caseId: string,
	token: string,
	params: {
		raw_message: string;
		source_thread_id: string;
		source_message_id?: string | null;
		intake_kind: 'timeline' | 'note';
	}
): Promise<ProposalRecord> {
	const res = await fetch(`${CASE_ENGINE_BASE_URL}/cases/${caseId}/chat-intake/draft`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
		body: JSON.stringify({
			raw_message: params.raw_message,
			source_thread_id: params.source_thread_id,
			source_message_id: params.source_message_id ?? undefined,
			intake_kind: params.intake_kind,
			source_scope: 'case'
		})
	});
	const data = await res.json().catch(() => ({}));
	if (!res.ok)
		throw new Error(
			extractApiErrorMessage(data, `Failed to draft chat intake (${res.status})`)
		);
	return data as ProposalRecord;
}

export async function reviseChatIntakeProposal(
	caseId: string,
	proposalId: string,
	token: string,
	feedback: string
): Promise<ProposalRecord> {
	const res = await fetch(
		`${CASE_ENGINE_BASE_URL}/cases/${caseId}/chat-intake/proposals/${encodeURIComponent(proposalId)}/revise`,
		{
			method: 'POST',
			headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
			body: JSON.stringify({ feedback })
		}
	);
	const data = await res.json().catch(() => ({}));
	if (!res.ok)
		throw new Error(
			extractApiErrorMessage(data, `Failed to revise proposal (${res.status})`)
		);
	return data as ProposalRecord;
}

// ─── P19-14: Case Notebook Notes (working drafts) ─────────────────────────────
//
// Notebook notes are investigator working drafts scoped to a case.
// They are NOT official case records and must not be confused with the timeline.
// CRUD is private per-user (the backend enforces owner_user_id scoping).

export interface NotebookNote {
	/** Integer primary key returned by the backend. */
	id: number;
	case_id: string;
	owner_user_id: string;
	title: string | null;
	current_text: string;
	created_at: string;
	created_by: string;
	created_by_name?: string | null;
	updated_at: string;
	updated_by: string;
	updated_by_name?: string | null;
	deleted_at: string | null;
	deleted_by: string | null;
}

export interface NotebookNoteVersion {
	id: number;
	note_id: number;
	case_id: string;
	version_number: number;
	text_content: string;
	title: string | null;
	created_at: string;
	created_by: string;
	created_by_name?: string | null;
}

/** List the current user's notebook notes for a case (owner-scoped by backend). */
export async function listCaseNotebookNotes(caseId: string, token: string): Promise<NotebookNote[]> {
	const res = await fetch(`${CASE_ENGINE_BASE_URL}/cases/${caseId}/notebook`, {
		headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
	});
	const data = await res.json().catch(() => ({}));
	if (!res.ok) throw new Error((data as { error?: string })?.error ?? `Failed to load notes (${res.status})`);
	return data as NotebookNote[];
}

/** List saved notebook note versions (newest first). */
export async function listCaseNotebookNoteVersions(
	caseId: string,
	noteId: number,
	token: string
): Promise<NotebookNoteVersion[]> {
	const res = await fetch(`${CASE_ENGINE_BASE_URL}/cases/${caseId}/notebook/${noteId}/versions`, {
		headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
	});
	const data = await res.json().catch(() => ({}));
	if (!res.ok) {
		throw new Error((data as { error?: string })?.error ?? `Failed to load note history (${res.status})`);
	}
	return data as NotebookNoteVersion[];
}

/** Create a new notebook note. Returns the created note. */
export async function createCaseNotebookNote(
	caseId: string,
	input: { title?: string | null; text: string; integrity_baseline_text?: string },
	token: string
): Promise<NotebookNote> {
	const res = await fetch(`${CASE_ENGINE_BASE_URL}/cases/${caseId}/notebook`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
		body: JSON.stringify(input)
	});
	const data = await res.json().catch(() => ({}));
	if (!res.ok) {
		throw new CaseEngineRequestError(
			extractApiErrorMessage(data, `Failed to create note (${res.status})`),
			res.status,
			extractApiErrorCode(data),
			extractApiErrorDetails(data),
			responseRequestId(res)
		);
	}
	return data as NotebookNote;
}

/**
 * Update a notebook note by creating a new version (backend is versioned).
 * Returns the updated note row.
 */
export async function updateCaseNotebookNote(
	caseId: string,
	noteId: number,
	input: { title?: string | null; text: string; expected_updated_at?: string; integrity_baseline_text?: string },
	token: string
): Promise<NotebookNote> {
	const res = await fetch(`${CASE_ENGINE_BASE_URL}/cases/${caseId}/notebook/${noteId}/versions`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
		body: JSON.stringify(input)
	});
	const data = await res.json().catch(() => ({}));
	if (!res.ok) {
		throw new CaseEngineRequestError(
			extractApiErrorMessage(data, `Failed to update note (${res.status})`),
			res.status,
			extractApiErrorCode(data),
			extractApiErrorDetails(data),
			responseRequestId(res)
		);
	}
	return data as NotebookNote;
}

/** Soft-delete a notebook note. */
export async function deleteCaseNotebookNote(
	caseId: string,
	noteId: number,
	token: string
): Promise<void> {
	const res = await fetch(`${CASE_ENGINE_BASE_URL}/cases/${caseId}/notebook/${noteId}`, {
		method: 'DELETE',
		headers: { Authorization: `Bearer ${token}` }
	});
	if (!res.ok) {
		const data = await res.json().catch(() => ({}));
		throw new Error((data as { error?: string })?.error ?? `Failed to delete note (${res.status})`);
	}
}

/** Restore a soft-deleted notebook note. Returns the restored note row. */
export async function restoreCaseNotebookNote(
	caseId: string,
	noteId: number,
	token: string
): Promise<NotebookNote> {
	const res = await fetch(`${CASE_ENGINE_BASE_URL}/cases/${caseId}/notebook/${noteId}/restore`, {
		method: 'POST',
		headers: { Authorization: `Bearer ${token}` }
	});
	const data = await res.json().catch(() => ({}));
	if (!res.ok) {
		throw new Error((data as { error?: string })?.error ?? `Failed to restore note (${res.status})`);
	}
	return data as NotebookNote;
}

/** P34-09 — Minimal prototype: rule-based extract + deterministic render (no DB, no AI). */
export type P34PrototypeStatement = {
	id: string;
	text: string;
	source: 'ci' | 'officer' | 'neighbor' | 'unknown';
	certainty: 'certain' | 'uncertain';
};

export type P34PrototypePreviewData = {
	draft: string;
	statements: P34PrototypeStatement[];
	meta: { rawLength: number; statementCount: number; uncertainCount: number };
};

export async function previewP34Prototype(
	caseId: string,
	token: string,
	rawText: string
): Promise<{ success: true; data: P34PrototypePreviewData } | { success: false; errorMessage: string }> {
	const res = await fetch(`${CASE_ENGINE_BASE_URL}/cases/${caseId}/notebook/p34-prototype-preview`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
		body: JSON.stringify({ rawText })
	});
	const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
	if (!res.ok) {
		return {
			success: false,
			errorMessage: extractApiErrorMessage(data, `P34 prototype preview failed (${res.status})`)
		};
	}
	if (data.success !== true || data.data == null || typeof data.data !== 'object') {
		return { success: false, errorMessage: 'Invalid P34 prototype preview response.' };
	}
	const inner = data.data as Record<string, unknown>;
	if (typeof inner.draft !== 'string' || !Array.isArray(inner.statements) || inner.meta == null) {
		return { success: false, errorMessage: 'Invalid P34 prototype preview payload.' };
	}
	const meta = inner.meta as Record<string, unknown>;
	if (
		typeof meta.rawLength !== 'number' ||
		typeof meta.statementCount !== 'number' ||
		typeof meta.uncertainCount !== 'number'
	) {
		return { success: false, errorMessage: 'Invalid P34 prototype meta.' };
	}
	const statementsRaw = inner.statements as unknown[];
	if (!statementsRaw.every(isP34PrototypeStatementRow)) {
		return { success: false, errorMessage: 'Invalid P34 prototype statements.' };
	}
	return {
		success: true,
		data: {
			draft: inner.draft,
			statements: statementsRaw as P34PrototypeStatement[],
			meta: {
				rawLength: meta.rawLength,
				statementCount: meta.statementCount,
				uncertainCount: meta.uncertainCount
			}
		}
	};
}

function isP34PrototypeStatementRow(row: unknown): row is P34PrototypeStatement {
	if (row == null || typeof row !== 'object') return false;
	const s = row as Record<string, unknown>;
	return (
		typeof s.id === 'string' &&
		typeof s.text === 'string' &&
		(s.source === 'ci' ||
			s.source === 'officer' ||
			s.source === 'neighbor' ||
			s.source === 'unknown') &&
		(s.certainty === 'certain' || s.certainty === 'uncertain')
	);
}

/**
 * P34-18 — Request structured draft extraction from Case Engine (`extraction-preview` — proposal + validation + render + meta).
 * Notes UI primary action: "Structure Note" (extraction-preview — not the legacy prototype route).
 */
export async function previewStructuredNotesExtraction(
	caseId: string,
	token: string,
	rawText: string
): Promise<
	| { success: true; data: StructuredNotesExtractionPreviewData; requestId?: string }
	| { success: false; errorMessage: string; requestId?: string; errorCode?: string }
> {
	const res = await fetch(
		`${CASE_ENGINE_BASE_URL}/cases/${caseId}/notebook/structured-notes/extraction-preview`,
		{
			method: 'POST',
			headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
			body: JSON.stringify({ rawText })
		}
	);
	const reqId = responseRequestId(res);
	const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
	if (!res.ok) {
		return {
			success: false,
			errorMessage: extractApiErrorMessage(data, `Structured notes preview failed (${res.status})`),
			requestId: reqId,
			errorCode: extractApiErrorCode(data)
		};
	}
	if (data.success !== true || data.data == null || typeof data.data !== 'object') {
		return {
			success: false,
			errorMessage: 'Invalid structured draft response.',
			requestId: reqId,
			errorCode: extractApiErrorCode(data)
		};
	}
	const parsed = parseStructuredNotesExtractionPreviewData(data.data);
	if (parsed == null) {
		return {
			success: false,
			errorMessage: 'Structured notes preview payload did not match the expected contract.',
			requestId: reqId
		};
	}
	return { success: true, data: parsed, requestId: reqId };
}

/** P35-01 — Read-only narrative preview (no persistence). P35-08 — optional integrity (read-time). */
export type NarrativePreviewPayload = {
	narrative: string;
	trace: Array<{ statementId: string; sourceText: string }>;
	warnings: string[];
	previewOnly: true;
	compositionMode: 'deterministic' | 'ai';
	integrity?: NarrativeIntegrityResult;
	/** P37 — Only when AI output existed and was rejected for deterministic fallback (never persisted). */
	debug?: {
		rejectedAiNarrative: string;
		rejectedAiReasons: Array<{ code: string; label: string }>;
		rejectedAiReasonType: 'meaning_drift' | 'context_loss' | 'other';
		/** Optional; echoed when server includes them (UI-only). */
		model?: string;
		timeoutMs?: number;
	};
};

export type NarrativePreviewRequestBody =
	| { structuredNoteIds?: number[]; structuredStatementIds?: string[]; compositionMode?: 'deterministic' | 'ai' }
	| { transientSourceText: string; structuredStatementIds?: string[]; compositionMode?: 'deterministic' | 'ai' };

export async function postNarrativePreview(
	caseId: string,
	token: string,
	body: NarrativePreviewRequestBody
): Promise<
	| { success: true; data: NarrativePreviewPayload; requestId?: string }
	| { success: false; errorMessage: string; requestId?: string; errorCode?: string }
> {
	const res = await fetch(`${CASE_ENGINE_BASE_URL}/cases/${encodeURIComponent(caseId)}/narrative-preview`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${token}`,
			'X-Request-Id': newCaseEngineRequestId()
		},
		body: JSON.stringify(body)
	});
	const reqId = responseRequestId(res);
	const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
	if (!res.ok) {
		return {
			success: false,
			errorMessage: extractApiErrorMessage(data, `Narrative preview failed (${res.status})`),
			requestId: reqId,
			errorCode: extractApiErrorCode(data)
		};
	}
	const narrative = data.narrative;
	const trace = data.trace;
	const warnings = data.warnings;
	const previewOnly = data.previewOnly;
	const compositionMode = data.compositionMode;
	if (
		typeof narrative !== 'string' ||
		!Array.isArray(trace) ||
		!Array.isArray(warnings) ||
		previewOnly !== true ||
		(compositionMode !== 'deterministic' && compositionMode !== 'ai')
	) {
		return {
			success: false,
			errorMessage: 'Invalid narrative preview response.',
			requestId: reqId
		};
	}
	const integrityRaw = data.integrity;
	const integrityParsed =
		integrityRaw !== undefined ? parseNarrativeIntegrityPayload(integrityRaw) : null;
	const payload: NarrativePreviewPayload = {
		narrative,
		trace: trace as NarrativePreviewPayload['trace'],
		warnings: warnings as string[],
		previewOnly: true,
		compositionMode: compositionMode as NarrativePreviewPayload['compositionMode']
	};
	if (integrityParsed != null) {
		payload.integrity = integrityParsed;
	}
	const debugRaw = data.debug;
	const debugParsed = parseNarrativePreviewDebugPayload(data.debug);
	// TEMP P37 forensic — remove after audit
	{
		const reasonLabel =
			debugParsed != null
				? debugParsed.rejectedAiReasonType
				: debugRaw != null && typeof debugRaw === 'object'
					? 'parse_dropped_or_invalid'
					: 'absent';
		console.log(
			'[narrative-debug api] raw debug present=',
			debugRaw != null,
			'reasonType=',
			reasonLabel
		);
	}
	if (debugParsed != null) {
		payload.debug = debugParsed;
	}
	return {
		success: true,
		data: payload,
		requestId: reqId
	};
}

function parseRejectedAiReasonEntries(raw: unknown): Array<{ code: string; label: string }> | null {
	if (!Array.isArray(raw)) return null;
	const out: Array<{ code: string; label: string }> = [];
	for (const item of raw) {
		if (item == null || typeof item !== 'object') return null;
		const rec = item as Record<string, unknown>;
		const code = rec.code;
		const label = rec.label;
		if (typeof code !== 'string' || typeof label !== 'string') return null;
		const c = code.trim();
		const l = label.trim();
		if (!c || !l) return null;
		out.push({ code: c, label: l });
	}
	return out;
}

function parseNarrativePreviewDebugPayload(
	raw: unknown
): NarrativePreviewPayload['debug'] | null {
	if (raw == null || typeof raw !== 'object') return null;
	const o = raw as Record<string, unknown>;
	const text = o.rejectedAiNarrative;
	const reasonsRaw = o.rejectedAiReasons;
	const rt = o.rejectedAiReasonType;
	if (typeof text !== 'string') return null;
	const reasons = parseRejectedAiReasonEntries(reasonsRaw);
	if (reasons == null) return null;
	if (rt !== 'meaning_drift' && rt !== 'context_loss' && rt !== 'other') return null;
	const out: NonNullable<NarrativePreviewPayload['debug']> = {
		rejectedAiNarrative: text,
		rejectedAiReasons: reasons,
		rejectedAiReasonType: rt
	};
	const modelRaw = o.model;
	if (typeof modelRaw === 'string' && modelRaw.trim()) {
		out.model = modelRaw.trim();
	}
	const timeoutRaw = o.timeoutMs;
	if (typeof timeoutRaw === 'number' && Number.isFinite(timeoutRaw) && timeoutRaw >= 0) {
		out.timeoutMs = timeoutRaw;
	}
	return out;
}

/** P35-04 — Append-only derived narrative snapshot (non-authoritative). */
export type NarrativeRecordSaveBody = {
	narrative: string;
	trace: Array<{ statementId: string; sourceText: string }>;
	structuredNoteIds: number[];
	structuredStatementIds?: string[];
};

export async function postNarrativeRecord(
	caseId: string,
	token: string,
	body: NarrativeRecordSaveBody
): Promise<
	| { success: true; narrativeRecordId: number; requestId?: string }
	| { success: false; errorMessage: string; requestId?: string; errorCode?: string }
> {
	const res = await fetch(`${CASE_ENGINE_BASE_URL}/cases/${encodeURIComponent(caseId)}/narrative-records`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${token}`,
			'X-Request-Id': newCaseEngineRequestId()
		},
		body: JSON.stringify(body)
	});
	const reqId = responseRequestId(res);
	const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
	if (!res.ok) {
		return {
			success: false,
			errorMessage: extractApiErrorMessage(data, `Narrative save failed (${res.status})`),
			requestId: reqId,
			errorCode: extractApiErrorCode(data)
		};
	}
	const success = data.success === true;
	const narrativeRecordId = data.narrativeRecordId;
	if (!success || typeof narrativeRecordId !== 'number' || !Number.isInteger(narrativeRecordId)) {
		return {
			success: false,
			errorMessage: 'Invalid narrative save response.',
			requestId: reqId
		};
	}
	return { success: true, narrativeRecordId, requestId: reqId };
}

/** P36-01 — Soft-delete saved derived narrative (non-destructive; excluded from active list/detail). */
export async function postNarrativeRecordSoftDelete(
	caseId: string,
	recordId: number,
	token: string
): Promise<
	| { success: true; requestId?: string }
	| { success: false; errorMessage: string; requestId?: string; errorCode?: string }
> {
	const res = await fetch(
		`${CASE_ENGINE_BASE_URL}/cases/${encodeURIComponent(caseId)}/narrative-records/${encodeURIComponent(String(recordId))}/delete`,
		{
			method: 'POST',
			headers: {
				Authorization: `Bearer ${token}`,
				'Content-Type': 'application/json',
				'X-Request-Id': newCaseEngineRequestId()
			}
		}
	);
	const reqId = responseRequestId(res);
	const raw = (await res.json().catch(() => ({}))) as Record<string, unknown>;
	if (!res.ok) {
		return {
			success: false,
			errorMessage: extractApiErrorMessage(raw, `Narrative delete failed (${res.status})`),
			requestId: reqId,
			errorCode: extractApiErrorCode(raw)
		};
	}
	if (raw.success !== true) {
		return { success: false, errorMessage: 'Invalid narrative delete response.', requestId: reqId };
	}
	return { success: true, requestId: reqId };
}

/** P37-01 — Restore soft-deleted narrative (ADMIN-only; same DB row). */
export async function postNarrativeRecordRestore(
	caseId: string,
	recordId: number,
	token: string
): Promise<
	| { success: true; requestId?: string }
	| { success: false; errorMessage: string; requestId?: string; errorCode?: string }
> {
	const res = await fetch(
		`${CASE_ENGINE_BASE_URL}/cases/${encodeURIComponent(caseId)}/narrative-records/${encodeURIComponent(String(recordId))}/restore`,
		{
			method: 'POST',
			headers: {
				Authorization: `Bearer ${token}`,
				'Content-Type': 'application/json',
				'X-Request-Id': newCaseEngineRequestId()
			}
		}
	);
	const reqId = responseRequestId(res);
	const raw = (await res.json().catch(() => ({}))) as Record<string, unknown>;
	if (!res.ok) {
		return {
			success: false,
			errorMessage: extractApiErrorMessage(raw, `Narrative restore failed (${res.status})`),
			requestId: reqId,
			errorCode: extractApiErrorCode(raw)
		};
	}
	if (raw.success !== true) {
		return { success: false, errorMessage: 'Invalid narrative restore response.', requestId: reqId };
	}
	return { success: true, requestId: reqId };
}

/** P35-05 — List/browse saved derived narratives (read-only). */
export type NarrativeRecordListItemDto = {
	id: number;
	createdAt: string;
	createdBy: string;
	narrativeSnippet: string;
	structuredNoteIds: number[];
	structuredStatementIds?: string[];
	traceRowCount: number;
	/** P37-02 — Present on ADMIN `include_deleted=true` list only. */
	recordSoftDeleted?: boolean;
	deletedAt?: string | null;
	deletedBy?: string | null;
};

export type NarrativeRecordDetailDto = {
	id: number;
	caseId: string;
	narrative: string;
	trace: Array<{ statementId: string; sourceText: string }>;
	structuredNoteIds: number[];
	structuredStatementIds?: string[];
	createdAt: string;
	createdBy: string;
	derivedArtifact: true;
	nonAuthoritative: true;
};

/** P36-05 — Saved-record export governance (deterministic; from server detail). */
export type NarrativeExportEligibilityDto = {
	decision: 'eligible' | 'eligible_with_warning' | 'not_eligible';
	message: string;
};

function parseNarrativeExportEligibilityPayload(raw: unknown): NarrativeExportEligibilityDto | null {
	if (raw == null || typeof raw !== 'object') return null;
	const o = raw as Record<string, unknown>;
	const d = o.decision;
	const m = o.message;
	if (d !== 'eligible' && d !== 'eligible_with_warning' && d !== 'not_eligible') return null;
	if (typeof m !== 'string') return null;
	return { decision: d, message: m };
}

export async function getNarrativeRecordsList(
	caseId: string,
	token: string,
	opts?: { includeDeleted?: boolean }
): Promise<
	| { success: true; records: NarrativeRecordListItemDto[]; requestId?: string }
	| { success: false; errorMessage: string; requestId?: string; errorCode?: string }
> {
	const qs =
		opts?.includeDeleted === true
			? `?${new URLSearchParams({ include_deleted: 'true' }).toString()}`
			: '';
	const res = await fetch(
		`${CASE_ENGINE_BASE_URL}/cases/${encodeURIComponent(caseId)}/narrative-records${qs}`,
		{
			headers: {
				Authorization: `Bearer ${token}`,
				'X-Request-Id': newCaseEngineRequestId()
			}
		}
	);
	const reqId = responseRequestId(res);
	const raw = (await res.json().catch(() => ({}))) as Record<string, unknown>;
	if (!res.ok) {
		return {
			success: false,
			errorMessage: extractApiErrorMessage(raw, `Narrative list failed (${res.status})`),
			requestId: reqId,
			errorCode: extractApiErrorCode(raw)
		};
	}
	const data = raw.data;
	if (raw.success !== true || data == null || typeof data !== 'object') {
		return { success: false, errorMessage: 'Invalid narrative list response.', requestId: reqId };
	}
	const inner = data as Record<string, unknown>;
	if (!Array.isArray(inner.records)) {
		return { success: false, errorMessage: 'Invalid narrative list response.', requestId: reqId };
	}
	return { success: true, records: inner.records as NarrativeRecordListItemDto[], requestId: reqId };
}

export async function getNarrativeRecordDetail(
	caseId: string,
	recordId: number,
	token: string,
	opts?: { includeDeleted?: boolean }
): Promise<
	| {
			success: true;
			record: NarrativeRecordDetailDto;
			integrity?: NarrativeIntegrityResult;
			exportEligibility?: NarrativeExportEligibilityDto;
			recordSoftDeleted?: boolean;
			requestId?: string;
	  }
	| { success: false; errorMessage: string; requestId?: string; errorCode?: string }
> {
	const qs =
		opts?.includeDeleted === true
			? `?${new URLSearchParams({ include_deleted: 'true' }).toString()}`
			: '';
	const res = await fetch(
		`${CASE_ENGINE_BASE_URL}/cases/${encodeURIComponent(caseId)}/narrative-records/${encodeURIComponent(String(recordId))}${qs}`,
		{
			headers: {
				Authorization: `Bearer ${token}`,
				'X-Request-Id': newCaseEngineRequestId()
			}
		}
	);
	const reqId = responseRequestId(res);
	const raw = (await res.json().catch(() => ({}))) as Record<string, unknown>;
	if (!res.ok) {
		return {
			success: false,
			errorMessage: extractApiErrorMessage(raw, `Narrative record failed (${res.status})`),
			requestId: reqId,
			errorCode: extractApiErrorCode(raw)
		};
	}
	const data = raw.data;
	if (raw.success !== true || data == null || typeof data !== 'object') {
		return { success: false, errorMessage: 'Invalid narrative record response.', requestId: reqId };
	}
	const inner = data as Record<string, unknown>;
	const rec = inner.record;
	if (rec == null || typeof rec !== 'object') {
		return { success: false, errorMessage: 'Invalid narrative record response.', requestId: reqId };
	}
	const integrityParsed =
		inner.integrity !== undefined ? parseNarrativeIntegrityPayload(inner.integrity) : null;
	const exportEligibilityParsed =
		inner.exportEligibility !== undefined
			? parseNarrativeExportEligibilityPayload(inner.exportEligibility)
			: null;
	const out: {
		success: true;
		record: NarrativeRecordDetailDto;
		integrity?: NarrativeIntegrityResult;
		exportEligibility?: NarrativeExportEligibilityDto;
		recordSoftDeleted?: boolean;
		requestId?: string;
	} = { success: true, record: rec as NarrativeRecordDetailDto, requestId: reqId };
	if (integrityParsed != null) {
		out.integrity = integrityParsed;
	}
	if (exportEligibilityParsed != null) {
		out.exportEligibility = exportEligibilityParsed;
	}
	if (inner.recordSoftDeleted === true) {
		out.recordSoftDeleted = true;
	}
	return out;
}

/** P35-07 / P36-03 — Download saved derived narrative export (not live preview). Default HTML; `format=txt|pdf` optional. P36-05: `acknowledgeExportWarning` for degraded integrity. */
export async function downloadNarrativeRecordExport(
	caseId: string,
	recordId: number,
	token: string,
	opts?: { format?: 'html' | 'txt' | 'pdf'; acknowledgeExportWarning?: boolean }
): Promise<
	| { success: true; blob: Blob; filename: string; requestId?: string }
	| { success: false; errorMessage: string; requestId?: string; errorCode?: string }
> {
	const fmt = opts?.format ?? 'html';
	const params = new URLSearchParams();
	if (fmt !== 'html') params.set('format', fmt);
	if (opts?.acknowledgeExportWarning) params.set('acknowledge_export_warning', '1');
	const qs = params.toString() ? `?${params.toString()}` : '';
	const res = await fetch(
		`${CASE_ENGINE_BASE_URL}/cases/${encodeURIComponent(caseId)}/narrative-records/${encodeURIComponent(String(recordId))}/export${qs}`,
		{
			headers: {
				Authorization: `Bearer ${token}`,
				'X-Request-Id': newCaseEngineRequestId()
			}
		}
	);
	const reqId = responseRequestId(res);
	if (!res.ok) {
		const raw = (await res.json().catch(() => ({}))) as Record<string, unknown>;
		return {
			success: false,
			errorMessage: extractApiErrorMessage(raw, `Narrative export failed (${res.status})`),
			requestId: reqId,
			errorCode: extractApiErrorCode(raw)
		};
	}
	const blob = await res.blob();
	const cd = res.headers.get('Content-Disposition') ?? '';
	let filename =
		fmt === 'pdf'
			? `derived-narrative-record-${recordId}.pdf`
			: fmt === 'txt'
				? `derived-narrative-record-${recordId}.txt`
				: `derived-narrative-record-${recordId}.html`;
	const star = /filename\*=UTF-8''([^;\s]+)/i.exec(cd);
	const quoted = /filename="([^"]+)"/i.exec(cd);
	if (star?.[1]) {
		try {
			filename = decodeURIComponent(star[1]);
		} catch {
			filename = star[1];
		}
	} else if (quoted?.[1]) {
		filename = quoted[1];
	}
	return { success: true, blob, filename, requestId: reqId };
}

/** P34-19 — Minimal preview metadata replayed on accept/save-edited (proposal-origin only; not authoritative extraction storage). */
export type StructuredNotesSourcePreviewPayload = {
	schemaVersion: string;
	extractionStatus: string;
	rendererVersion?: string | null;
};

export type StructuredNotesReviewCommitResult = {
	note: NotebookNote;
	current_version_number: number;
	action: string;
};

function parseStructuredNotesReviewSuccessPayload(data: unknown): StructuredNotesReviewCommitResult | null {
	if (data == null || typeof data !== 'object') return null;
	const d = data as Record<string, unknown>;
	const note = d.note;
	const vn = d.current_version_number;
	const action = d.action;
	if (note == null || typeof note !== 'object') return null;
	if (typeof vn !== 'number' || !Number.isInteger(vn)) return null;
	if (typeof action !== 'string') return null;
	return { note: note as NotebookNote, current_version_number: vn, action };
}

type StructuredNotesReviewMutationFailure = {
	success: false;
	errorMessage: string;
	httpStatus?: number;
	errorCode?: string;
	requestId?: string | null;
};

/**
 * P34-19 — ACCEPT_STRUCTURED_DRAFT: saves rendered draft as a new note or new version (mutating).
 */
export async function acceptStructuredNotesDraft(
	caseId: string,
	token: string,
	body: {
		draftText: string;
		noteId?: number;
		title?: string | null;
		expected_updated_at?: string;
		sourcePreview: StructuredNotesSourcePreviewPayload;
	}
): Promise<{ success: true; data: StructuredNotesReviewCommitResult } | StructuredNotesReviewMutationFailure> {
	const res = await fetch(`${CASE_ENGINE_BASE_URL}/cases/${caseId}/notebook/structured-notes/accept`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
		body: JSON.stringify(body)
	});
	const reqId = responseRequestId(res);
	const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
	if (!res.ok) {
		return {
			success: false,
			errorMessage: extractApiErrorMessage(data, `Structured accept failed (${res.status})`),
			httpStatus: res.status,
			errorCode: extractApiErrorCode(data),
			requestId: reqId
		};
	}
	if (data.success !== true) {
		return {
			success: false,
			errorMessage: extractApiErrorMessage(data, 'Structured accept failed.'),
			requestId: reqId
		};
	}
	const parsed = parseStructuredNotesReviewSuccessPayload(data.data);
	if (parsed == null) {
		return { success: false, errorMessage: 'Invalid structured accept response.', requestId: reqId };
	}
	return { success: true, data: parsed };
}

/**
 * P34-19 — EDIT_STRUCTURED_DRAFT save path: user-edited text from structured review (mutating).
 */
export async function saveStructuredNotesEditedDraft(
	caseId: string,
	token: string,
	body: {
		editedText: string;
		noteId?: number;
		title?: string | null;
		expected_updated_at?: string;
		sourcePreview: StructuredNotesSourcePreviewPayload;
	}
): Promise<{ success: true; data: StructuredNotesReviewCommitResult } | StructuredNotesReviewMutationFailure> {
	const res = await fetch(`${CASE_ENGINE_BASE_URL}/cases/${caseId}/notebook/structured-notes/save-edited`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
		body: JSON.stringify(body)
	});
	const reqId = responseRequestId(res);
	const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
	if (!res.ok) {
		return {
			success: false,
			errorMessage: extractApiErrorMessage(data, `Structured save-edited failed (${res.status})`),
			httpStatus: res.status,
			errorCode: extractApiErrorCode(data),
			requestId: reqId
		};
	}
	if (data.success !== true) {
		return {
			success: false,
			errorMessage: extractApiErrorMessage(data, 'Structured save-edited failed.'),
			requestId: reqId
		};
	}
	const parsed = parseStructuredNotesReviewSuccessPayload(data.data);
	if (parsed == null) {
		return { success: false, errorMessage: 'Invalid structured save-edited response.', requestId: reqId };
	}
	return { success: true, data: parsed };
}

/**
 * P34-19 — REJECT_STRUCTURED_PREVIEW: server acknowledges dismiss; does not change note text.
 */
export async function rejectStructuredNotesPreview(
	caseId: string,
	token: string,
	body: { noteId?: number } = {}
): Promise<
	{ success: true; requestId?: string } | { success: false; errorMessage: string; requestId?: string }
> {
	const res = await fetch(`${CASE_ENGINE_BASE_URL}/cases/${caseId}/notebook/structured-notes/reject`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
		body: JSON.stringify(body)
	});
	const reqId = responseRequestId(res);
	const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
	if (!res.ok) {
		return {
			success: false,
			errorMessage: extractApiErrorMessage(data, `Structured reject failed (${res.status})`),
			requestId: reqId
		};
	}
	if (data.success !== true) {
		return { success: false, errorMessage: 'Structured reject failed.', requestId: reqId };
	}
	return { success: true, requestId: reqId };
}

/** P32-01 — Preview deterministic safe surface cleanup (server-validated). */
export type SafeSurfaceCleanupPreviewResponse = {
	success: true;
	mode: 'safe_cleanup';
	cleanedText: string;
	changesSummary: string[];
	valid: boolean;
	invalidReason?: string;
	/** P32-05: Case Engine includes in non-production when preview is invalid. */
	failedChecks?: string[];
};

export async function previewCaseNotebookSafeSurfaceCleanup(
	caseId: string,
	token: string,
	text: string
): Promise<SafeSurfaceCleanupPreviewResponse | { success: false; errorMessage: string }> {
	const res = await fetch(`${CASE_ENGINE_BASE_URL}/cases/${caseId}/notebook/safe-surface-cleanup-preview`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
		body: JSON.stringify({ text })
	});
	const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
	if (!res.ok) {
		return {
			success: false,
			errorMessage: extractApiErrorMessage(data, `Safe cleanup preview failed (${res.status})`)
		};
	}
	if (data.success !== true || typeof data.cleanedText !== 'string' || !Array.isArray(data.changesSummary)) {
		return { success: false, errorMessage: 'Invalid safe cleanup preview response.' };
	}
	const failedChecksRaw = data.failedChecks;
	const failedChecks =
		Array.isArray(failedChecksRaw) && failedChecksRaw.every((x) => typeof x === 'string')
			? (failedChecksRaw as string[])
			: undefined;
	return {
		success: true,
		mode: 'safe_cleanup',
		cleanedText: data.cleanedText,
		changesSummary: data.changesSummary as string[],
		valid: data.valid === true,
		...(typeof data.invalidReason === 'string' ? { invalidReason: data.invalidReason } : {}),
		...(failedChecks != null && failedChecks.length > 0 ? { failedChecks } : {})
	};
}

/** P32-01 — Persist audit row when investigator applies safe cleanup to the draft. */
export async function auditCaseNotebookSafeSurfaceCleanupApplied(
	caseId: string,
	token: string,
	payload: {
		original_text: string;
		cleaned_text: string;
		changes_summary: string[];
		note_id?: number | null;
	}
): Promise<{ success: true } | { success: false; errorMessage: string }> {
	const res = await fetch(`${CASE_ENGINE_BASE_URL}/cases/${caseId}/notebook/safe-surface-cleanup-audit`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
		body: JSON.stringify(payload)
	});
	const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
	if (!res.ok) {
		return {
			success: false,
			errorMessage: extractApiErrorMessage(data, `Safe cleanup audit failed (${res.status})`)
		};
	}
	if (data.success !== true) {
		return { success: false, errorMessage: 'Invalid safe cleanup audit response.' };
	}
	return { success: true };
}

// ── P30-02: Note Attachments ─────────────────────────────────────────────────

export interface NoteAttachment {
	id: string;
	case_id: string;
	note_id: number | null;
	draft_session_id: string | null;
	original_filename: string;
	mime_type: string | null;
	file_size_bytes: number;
	uploaded_by: string;
	created_at: string;
}

/** List attachments for a saved notebook note. */
export async function listNoteAttachments(
	caseId: string,
	noteId: number,
	token: string
): Promise<NoteAttachment[]> {
	const res = await fetch(
		`${CASE_ENGINE_BASE_URL}/cases/${caseId}/notebook/${noteId}/attachments`,
		{ headers: { Authorization: `Bearer ${token}` } }
	);
	const data = await res.json().catch(() => ({}));
	if (!res.ok)
		throw new Error(
			(data as { error?: string })?.error ?? `Failed to load attachments (${res.status})`
		);
	return data as NoteAttachment[];
}

/** Upload a file and link it to a saved notebook note. */
export async function uploadNoteAttachment(
	caseId: string,
	noteId: number,
	file: File,
	token: string
): Promise<NoteAttachment> {
	const body = new FormData();
	body.append('file', file);
	const res = await fetch(
		`${CASE_ENGINE_BASE_URL}/cases/${caseId}/notebook/${noteId}/attachments`,
		{ method: 'POST', headers: { Authorization: `Bearer ${token}` }, body }
	);
	const data = await res.json().catch(() => ({}));
	if (!res.ok)
		throw new Error(
			(data as { error?: string })?.error ?? `Failed to upload attachment (${res.status})`
		);
	return data as NoteAttachment;
}

/** List draft attachments for a create-mode session (not yet linked to a note). */
export async function listDraftNoteAttachments(
	caseId: string,
	sessionId: string,
	token: string
): Promise<NoteAttachment[]> {
	const res = await fetch(
		`${CASE_ENGINE_BASE_URL}/cases/${caseId}/notebook/draft-attachments?session_id=${encodeURIComponent(sessionId)}`,
		{ headers: { Authorization: `Bearer ${token}` } }
	);
	const data = await res.json().catch(() => ({}));
	if (!res.ok)
		throw new Error(
			(data as { error?: string })?.error ?? `Failed to load draft attachments (${res.status})`
		);
	return data as NoteAttachment[];
}

/** Upload a file during create mode, linked by draft_session_id (no note_id yet). */
export async function uploadDraftNoteAttachment(
	caseId: string,
	sessionId: string,
	file: File,
	token: string
): Promise<NoteAttachment> {
	const body = new FormData();
	body.append('file', file);
	body.append('draft_session_id', sessionId);
	const res = await fetch(
		`${CASE_ENGINE_BASE_URL}/cases/${caseId}/notebook/draft-attachments`,
		{ method: 'POST', headers: { Authorization: `Bearer ${token}` }, body }
	);
	const data = await res.json().catch(() => ({}));
	if (!res.ok)
		throw new Error(
			(data as { error?: string })?.error ?? `Failed to upload draft attachment (${res.status})`
		);
	return data as NoteAttachment;
}

/**
 * P30-28: Download the original file for a note attachment.
 * Fetches GET /cases/:caseId/note-attachments/:attachmentId/file and triggers a browser download.
 */
export async function downloadNoteAttachment(
	caseId: string,
	attachmentId: string,
	filename: string,
	token: string
): Promise<void> {
	const res = await fetch(
		`${CASE_ENGINE_BASE_URL}/cases/${caseId}/note-attachments/${attachmentId}/file`,
		{ headers: { Authorization: `Bearer ${token}` } }
	);
	if (!res.ok) {
		const data = await res.json().catch(() => ({}));
		throw new Error((data as { error?: string })?.error ?? `Download failed (${res.status})`);
	}
	const blob = await res.blob();
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = filename;
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
	URL.revokeObjectURL(url);
}

/**
 * Claim draft attachments after a note is created.
 * Links any attachments uploaded with the given draft_session_id to the new note_id.
 */
export async function claimDraftNoteAttachments(
	caseId: string,
	noteId: number,
	draftSessionId: string,
	token: string
): Promise<{ claimed: number }> {
	const res = await fetch(
		`${CASE_ENGINE_BASE_URL}/cases/${caseId}/notebook/${noteId}/claim-draft-attachments`,
		{
			method: 'POST',
			headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
			body: JSON.stringify({ draft_session_id: draftSessionId })
		}
	);
	const data = await res.json().catch(() => ({}));
	if (!res.ok)
		throw new Error(
			(data as { error?: string })?.error ?? `Failed to claim draft attachments (${res.status})`
		);
	return data as { claimed: number };
}

// ── Note Attachment Extractions (P30-03) ─────────────────────────────────────

export interface ExtractionRecord {
	id: string;
	attachment_id: string;
	case_id: string;
	method: 'plain_text' | 'pdf_text' | 'docx_mammoth_raw_text' | 'unsupported';
	status: 'extracted' | 'unsupported' | 'failed' | 'no_text_found';
	extracted_text: string | null;
	text_length: number;
	error_message: string | null;
	/** Parser advisories (e.g. Mammoth); not used for failure text — see error_message when status is failed. */
	extraction_warnings: string | null;
	created_at: string;
	created_by: string;
	updated_at: string;
}

/** Trigger deterministic text extraction for a note attachment. */
export async function extractNoteAttachment(
	caseId: string,
	attachmentId: string,
	token: string
): Promise<ExtractionRecord> {
	const res = await fetch(
		`${CASE_ENGINE_BASE_URL}/cases/${caseId}/note-attachments/${attachmentId}/extract`,
		{ method: 'POST', headers: { Authorization: `Bearer ${token}` } }
	);
	const data = await res.json().catch(() => ({}));
	if (!res.ok)
		throw new Error(
			(data as { error?: string })?.error ?? `Extraction failed (${res.status})`
		);
	return data as ExtractionRecord;
}

/** Get the extraction record for a single attachment. Returns null if not yet extracted. */
export async function getNoteAttachmentExtraction(
	caseId: string,
	attachmentId: string,
	token: string
): Promise<ExtractionRecord | null> {
	const res = await fetch(
		`${CASE_ENGINE_BASE_URL}/cases/${caseId}/note-attachments/${attachmentId}/extraction`,
		{ headers: { Authorization: `Bearer ${token}` } }
	);
	if (res.status === 404) return null;
	const data = await res.json().catch(() => ({}));
	if (!res.ok)
		throw new Error(
			(data as { error?: string })?.error ?? `Failed to get extraction (${res.status})`
		);
	return data as ExtractionRecord;
}

/** Batch-retrieve extraction records for a set of attachment IDs. */
export async function listNoteAttachmentExtractions(
	caseId: string,
	attachmentIds: string[],
	token: string
): Promise<ExtractionRecord[]> {
	if (attachmentIds.length === 0) return [];
	const params = new URLSearchParams({ attachment_ids: attachmentIds.join(',') });
	const res = await fetch(
		`${CASE_ENGINE_BASE_URL}/cases/${caseId}/note-attachments/extractions?${params}`,
		{ headers: { Authorization: `Bearer ${token}` } }
	);
	const data = await res.json().catch(() => ({}));
	if (!res.ok)
		throw new Error(
			(data as { error?: string })?.error ?? `Failed to list extractions (${res.status})`
		);
	return data as ExtractionRecord[];
}

// ── Note Attachment OCR (P30-04) ─────────────────────────────────────────────

export interface OcrRecord {
	id: string;
	attachment_id: string;
	case_id: string;
	method: 'ocr_image' | 'unsupported';
	status: 'extracted' | 'low_confidence' | 'failed' | 'no_text_found' | 'unsupported';
	derived_text: string | null;
	text_length: number;
	confidence_pct: number | null;
	error_message: string | null;
	created_at: string;
	created_by: string;
	updated_at: string;
}

/** Trigger OCR on a note attachment (images: PNG, JPEG, WebP). */
export async function runNoteAttachmentOcr(
	caseId: string,
	attachmentId: string,
	token: string
): Promise<OcrRecord> {
	const res = await fetch(
		`${CASE_ENGINE_BASE_URL}/cases/${caseId}/note-attachments/${attachmentId}/ocr`,
		{ method: 'POST', headers: { Authorization: `Bearer ${token}` } }
	);
	const data = await res.json().catch(() => ({}));
	if (!res.ok)
		throw new Error((data as { error?: string })?.error ?? `OCR failed (${res.status})`);
	return data as OcrRecord;
}

/** Get the OCR record for a single attachment. Returns null if OCR not yet run. */
export async function getNoteAttachmentOcr(
	caseId: string,
	attachmentId: string,
	token: string
): Promise<OcrRecord | null> {
	const res = await fetch(
		`${CASE_ENGINE_BASE_URL}/cases/${caseId}/note-attachments/${attachmentId}/ocr`,
		{ headers: { Authorization: `Bearer ${token}` } }
	);
	if (res.status === 404) return null;
	const data = await res.json().catch(() => ({}));
	if (!res.ok)
		throw new Error((data as { error?: string })?.error ?? `Failed to get OCR record (${res.status})`);
	return data as OcrRecord;
}

// ── Note Attachment Proposals (P30-05) ───────────────────────────────────────

export interface SourceLineageItem {
	type: 'extraction' | 'ocr';
	record_id: string;
	attachment_id: string;
	attachment_filename: string;
	method: string;
	status: string;
	text_length: number;
	low_confidence: boolean;
	confidence_pct: number | null;
}

export interface EligibleSource extends SourceLineageItem {
	full_text: string;
	text_preview: string;
}

export interface AttachmentProposal {
	id: string;
	case_id: string;
	note_id: number | null;
	draft_session_id: string | null;
	proposed_text: string;
	source_lineage: SourceLineageItem[];
	has_low_confidence_ocr: boolean;
	model_used: string | null;
	status: 'pending' | 'dismissed';
	created_at: string;
	created_by: string;
	dismissed_at: string | null;
}

/** Get eligible attachment-derived sources (extracted text + OCR) for selected attachment IDs. */
export async function getNoteAttachmentProposalSources(
	caseId: string,
	attachmentIds: string[],
	token: string
): Promise<EligibleSource[]> {
	if (attachmentIds.length === 0) return [];
	const params = new URLSearchParams({ attachment_ids: attachmentIds.join(',') });
	const res = await fetch(
		`${CASE_ENGINE_BASE_URL}/cases/${caseId}/note-attachments/proposal-sources?${params}`,
		{ headers: { Authorization: `Bearer ${token}` } }
	);
	const data = await res.json().catch(() => ({}));
	if (!res.ok)
		throw new Error(
			(data as { error?: string })?.error ?? `Failed to get proposal sources (${res.status})`
		);
	return data as EligibleSource[];
}

/** Persist an AI-generated note attachment proposal with source lineage. */
export async function createNoteAttachmentProposal(
	caseId: string,
	payload: {
		proposed_text: string;
		sources: Array<{ type: 'extraction' | 'ocr'; record_id: string }>;
		note_id?: number | null;
		draft_session_id?: string | null;
		model_used?: string | null;
	},
	token: string
): Promise<AttachmentProposal> {
	const res = await fetch(
		`${CASE_ENGINE_BASE_URL}/cases/${caseId}/note-attachments/proposals`,
		{
			method: 'POST',
			headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
			body: JSON.stringify(payload)
		}
	);
	const data = await res.json().catch(() => ({}));
	if (!res.ok)
		throw new Error(
			(data as { error?: string })?.error ?? `Failed to create proposal (${res.status})`
		);
	return data as AttachmentProposal;
}

/** List proposals for a note/draft context (pending only by default). */
export async function listNoteAttachmentProposals(
	caseId: string,
	params: { noteId?: number | null; draftSessionId?: string | null; includeDismissed?: boolean },
	token: string
): Promise<AttachmentProposal[]> {
	const qp = new URLSearchParams();
	if (params.noteId != null) qp.set('note_id', String(params.noteId));
	if (params.draftSessionId) qp.set('draft_session_id', params.draftSessionId);
	if (params.includeDismissed) qp.set('include_dismissed', 'true');
	const res = await fetch(
		`${CASE_ENGINE_BASE_URL}/cases/${caseId}/note-attachments/proposals?${qp}`,
		{ headers: { Authorization: `Bearer ${token}` } }
	);
	const data = await res.json().catch(() => ({}));
	if (!res.ok)
		throw new Error(
			(data as { error?: string })?.error ?? `Failed to list proposals (${res.status})`
		);
	return data as AttachmentProposal[];
}

/** Dismiss a proposal (soft, idempotent). */
export async function dismissNoteAttachmentProposal(
	caseId: string,
	proposalId: string,
	token: string
): Promise<void> {
	const res = await fetch(
		`${CASE_ENGINE_BASE_URL}/cases/${caseId}/note-attachments/proposals/${proposalId}/dismiss`,
		{ method: 'PATCH', headers: { Authorization: `Bearer ${token}` } }
	);
	const data = await res.json().catch(() => ({}));
	if (!res.ok)
		throw new Error(
			(data as { error?: string })?.error ?? `Failed to dismiss proposal (${res.status})`
		);
}

/** Batch-retrieve OCR records for a set of attachment IDs. */
export async function listNoteAttachmentOcrResults(
	caseId: string,
	attachmentIds: string[],
	token: string
): Promise<OcrRecord[]> {
	if (attachmentIds.length === 0) return [];
	const params = new URLSearchParams({ attachment_ids: attachmentIds.join(',') });
	const res = await fetch(
		`${CASE_ENGINE_BASE_URL}/cases/${caseId}/note-attachments/ocr-results?${params}`,
		{ headers: { Authorization: `Bearer ${token}` } }
	);
	const data = await res.json().catch(() => ({}));
	if (!res.ok)
		throw new Error(
			(data as { error?: string })?.error ?? `Failed to list OCR results (${res.status})`
		);
	return data as OcrRecord[];
}

/** Soft-delete a note attachment. Works for draft and saved-note attachments. */
export async function deleteNoteAttachment(
	caseId: string,
	attachmentId: string,
	token: string
): Promise<void> {
	const res = await fetch(
		`${CASE_ENGINE_BASE_URL}/cases/${caseId}/note-attachments/${attachmentId}`,
		{ method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }
	);
	const data = await res.json().catch(() => ({}));
	if (!res.ok)
		throw new Error(
			(data as { error?: string })?.error ?? `Failed to delete attachment (${res.status})`
		);
}
