/**
 * P131-02 — Command Center cross-case case list: GET-only aggregation for display.
 * P132-03 — Uses `listCases` as the only case set; no merge, no client-side scope filtering.
 *
 * Ordering: `last_timeline_entry_occurred_at` descending is explicit ISO timestamp sort only,
 * not prioritization or ranking.
 */
import {
	listCases,
	listCaseTimelineEntriesPage,
	type CaseEngineCase
} from '$lib/apis/caseEngine';

/** Display row — only explicit Case Engine–sourced fields (plus deterministic sort key). */
export type CommandCenterCaseRow = {
	case_id: string;
	case_number: string;
	title: string;
	unit: string;
	status: string;
	/** Max `occurred_at` from Timeline (GET snapshot from paginated entries); null if none / unavailable. */
	last_timeline_entry_occurred_at: string | null;
};

export function mapCaseEngineCaseToRow(
	c: CaseEngineCase,
	lastOccurredAt: string | null
): CommandCenterCaseRow {
	return {
		case_id: String(c.id),
		case_number: String(c.case_number),
		title: String(c.title),
		unit: String(c.unit),
		status: String(c.status),
		last_timeline_entry_occurred_at: lastOccurredAt
	};
}

/**
 * Deterministic sort by ISO `occurred_at` descending; nulls last. Timestamp ordering only.
 */
export function sortCommandCenterRowsByLastTimelineDesc(
	rows: CommandCenterCaseRow[]
): CommandCenterCaseRow[] {
	return [...rows].sort((a, b) => {
		const ta = a.last_timeline_entry_occurred_at;
		const tb = b.last_timeline_entry_occurred_at;
		if (ta == null && tb == null) return 0;
		if (ta == null) return 1;
		if (tb == null) return -1;
		return tb.localeCompare(ta);
	});
}

/**
 * Reads last Timeline `occurred_at` via GET /cases/:id/entries?limit=1&offset=0 envelope `snapshotMaxOccurredAt`
 * (same boundary the timeline UI uses for stable pagination — last row by occurred_at).
 * P132-03: any failure → null (no inferred last activity; no retry or alternate scope).
 */
export async function fetchLastTimelineOccurredAt(
	caseId: string,
	token: string
): Promise<string | null> {
	try {
		const page = await listCaseTimelineEntriesPage(caseId, token, { limit: 1, offset: 0 });
		const at = page.snapshotMaxOccurredAt;
		if (at == null || typeof at !== 'string' || !at.trim()) return null;
		return at.trim();
	} catch {
		return null;
	}
}

/**
 * Builds case list rows from an already-loaded `listCases` result (P131.5-02 bundle: single list fetch).
 */
export async function buildCommandCenterCaseRowsFromCases(
	cases: CaseEngineCase[],
	token: string
): Promise<CommandCenterCaseRow[]> {
	const rows: CommandCenterCaseRow[] = [];
	for (const c of cases) {
		const lastAt = await fetchLastTimelineOccurredAt(c.id, token);
		rows.push(mapCaseEngineCaseToRow(c, lastAt));
	}
	return sortCommandCenterRowsByLastTimelineDesc(rows);
}

/**
 * Loads cases for unit scope, then fetches last timeline occurred_at per case (GET only).
 */
export async function fetchCommandCenterCaseRows(
	token: string,
	unit: 'CID' | 'SIU' | 'ALL'
): Promise<CommandCenterCaseRow[]> {
	const cases = await listCases(unit, token);
	return buildCommandCenterCaseRowsFromCases(cases, token);
}
