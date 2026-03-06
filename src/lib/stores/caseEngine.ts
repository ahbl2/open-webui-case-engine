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
