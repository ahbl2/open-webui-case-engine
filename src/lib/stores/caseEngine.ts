/**
 * Case Engine state (Ticket 5) – persisted in localStorage.
 */
import { writable, derived } from 'svelte/store';
import { browser } from '$app/environment';

const KEY_TOKEN = 'caseEngineToken';
const KEY_USER = 'caseEngineUser';
const KEY_ACTIVE_CASE_ID = 'caseEngineActiveCaseId';
const KEY_ACTIVE_CASE_NUMBER = 'caseEngineActiveCaseNumber';
const KEY_SCOPE = 'caseEngineScope';
const KEY_UNIT_FILTER = 'caseEngineUnitFilter';

function persisted<T>(key: string, defaultValue: T, serialize?: (v: T) => string, deserialize?: (s: string) => T) {
	const _ser = serialize ?? JSON.stringify;
	const _des = deserialize ?? ((s: string) => {
		try { return JSON.parse(s) as T; } catch { return defaultValue; }
	});

	const store = writable<T>(defaultValue);

	if (browser) {
		try {
			const raw = localStorage.getItem(key);
			if (raw != null) {
				store.set(_des(raw));
			}
		} catch {}

		store.subscribe((v) => {
			try {
				localStorage.setItem(key, _ser(v));
			} catch {}
		});
	}

	return store;
}

export const caseEngineToken = persisted<string | null>(KEY_TOKEN, null, (v) => v ?? '', (s) => s || null);
export const caseEngineUser = persisted<{ id: string; name: string; role: string } | null>(KEY_USER, null);
export const activeCaseId = persisted<string | null>(KEY_ACTIVE_CASE_ID, null, (v) => v ?? '', (s) => s || null);
export const activeCaseNumber = persisted<string | null>(KEY_ACTIVE_CASE_NUMBER, null, (v) => v ?? '', (s) => s || null);
export const scope = persisted<'THIS_CASE' | 'CID' | 'SIU' | 'ALL'>(KEY_SCOPE, 'THIS_CASE');
export const unitFilter = persisted<'CID' | 'SIU' | 'ALL'>(KEY_UNIT_FILTER, 'ALL');

/** Ticket 7: Case context (case + recent_entries) - not persisted */
export const caseContext = writable<{ case: { id: string; case_number: string; title: string; unit: string; status: string }; recent_entries: Array<{ id: string; occurred_at: string; type: string; location_text: string | null; text_original: string; created_by: string; created_at: string; tags?: string[] }> } | null>(null);

/** Ticket 8: AI context bundle (case + timeline + files + citations) - for prompt injection */
export const aiCaseContext = writable<import('$lib/apis/caseEngine').AiContextBundle | null>(null);

export const isCaseEngineConnected = derived(caseEngineToken, (t) => !!t);

/**
 * P19-05: Backend-resolved Case Engine authorization state.
 * Populated once per session after OWUI login by calling POST /auth/owui/browser-resolve.
 * NOT persisted to localStorage — resolved fresh on each session start.
 * Frontend routing decisions (active/pending/disabled) are derived from this state.
 */
export type CaseEngineAuthState = {
	/**
	 * 'active'            — user is approved and may enter the workspace
	 * 'pending'           — user profile exists but is awaiting admin approval
	 * 'disabled'          — user profile has been disabled
	 * 'denied_no_profile' — no Case Engine profile found and auto-create is off
	 * 'unavailable'       — Case Engine backend could not be reached (true network failure)
	 * 'rate_limited'      — P19.75-02: CE reachable; POST /auth/owui/browser-resolve returned 429
	 * 'auth_http_error'   — P19.75-02: 401/403 on browser-resolve (not “service down”)
	 * 'ce_server_error'   — P19.75-02: 5xx on browser-resolve
	 * 'ce_client_error'   — P19.75-02: other 4xx (not 401/403/429)
	 */
	state:
		| 'active'
		| 'pending'
		| 'disabled'
		| 'denied_no_profile'
		| 'unavailable'
		| 'rate_limited'
		| 'auth_http_error'
		| 'ce_server_error'
		| 'ce_client_error';
	user: null | { id: string; role: string; units: string[]; capabilities: string[] };
	reason?: string;
};

export const caseEngineAuthState = writable<CaseEngineAuthState | null>(null);

/**
 * P19-06: True while the user is inside the case workspace shell.
 * Used by (app)/+layout.svelte to suppress the global Open WebUI sidebar.
 * Set to true synchronously when the case layout mounts; false on destroy.
 */
export const caseModeActive = writable<boolean>(false);

/**
 * P19-06: Metadata for the currently open case, populated by the case layout shell.
 * Used by the case header and any child components that need case context without
 * re-fetching the case list.
 */
export type CaseMeta = {
	id: string;
	case_number: string;
	title: string;
	unit: string;
	status: string;
	incident_date?: string | null;
	/** ISO timestamp from Case Engine `getCaseById` when present (read-only display). */
	created_at?: string | null;
};
export const activeCaseMeta = writable<CaseMeta | null>(null);

/**
 * P19-08: The scope binding for the currently active (or most recently bound) OWUI thread.
 *
 * Populated when the user opens or creates a thread from:
 *   - /case/[id]/chat  → scope 'case', caseId set, caseMeta set
 *   - /home            → scope 'personal', caseId/caseMeta absent
 *
 * NOT persisted to localStorage. Cleared on page reload. This is intentional:
 * the scope indicator on /c/[id] only appears when the user navigated from a
 * known scope context in the same session. If the store is absent on direct
 * navigation, no badge is shown (honest unknown state).
 */
export type ActiveThreadScope = {
	/** OWUI chat ID (= external_thread_id in Case Engine). */
	threadId: string;
	scope: 'case' | 'personal';
	/** Set when scope === 'case'. */
	caseId?: string;
	/** Set when scope === 'case'. Mirrors activeCaseMeta at time of binding. */
	caseMeta?: { id: string; case_number: string; title: string };
} | null;

export const activeThreadScope = writable<ActiveThreadScope>(null);

/**
 * P19-08: Stores the most recent thread binding error.
 * Set when upsertCaseThreadAssociation or upsertPersonalThreadAssociation throws.
 * Cleared before each new binding attempt.
 */
export type ThreadScopeErrorKind =
	| 'scope_conflict'
	| 'access_denied'
	| 'not_found'
	| 'backend_unavailable'
	| 'unknown';

export type ThreadScopeError = {
	kind: ThreadScopeErrorKind;
	message: string;
	threadId: string;
} | null;

export const threadScopeError = writable<ThreadScopeError>(null);
