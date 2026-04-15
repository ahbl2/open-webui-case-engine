/**
 * P131-03 — Command Center cross-case activity: GET-only merge of per-case activity-events.
 * P132-03 — Case set from `listCases` only; events from successful GETs only (no silent per-case
 * swallow; any failure fails the whole load so the UI does not imply completeness).
 *
 * Ordering: `occurred_at` descending is explicit ISO timestamp sort only (matches Case Engine
 * default for GET /cases/:id/activity-events), not prioritization.
 */
import {
	listCases,
	listCaseActivityEvents,
	type CaseActivityEvent,
	type CaseEngineCase
} from '$lib/apis/caseEngine';

/** Max events fetched per case (first page only); merged then sorted globally by occurred_at. */
export const COMMAND_CENTER_ACTIVITY_EVENTS_PER_CASE = 50;

/** One row per event — only API-sourced fields (plus case_identifier for display rule). */
export type CommandCenterActivityRow = {
	event_id: string;
	actor_user_id: string;
	/** Verbatim `event_type` from Case Engine. */
	event_type: string;
	case_id: string;
	/** `case_number` when known from list scope; otherwise `case_id`. */
	case_identifier: string;
	/** When the action occurred (ISO string as returned). */
	occurred_at: string;
};

function caseIdentifierForEvent(c: CaseEngineCase | undefined, caseId: string): string {
	if (c != null && typeof c.case_number === 'string' && c.case_number.trim() !== '') {
		return c.case_number.trim();
	}
	return caseId;
}

export function mapActivityEventToRow(
	ev: CaseActivityEvent,
	caseById: Map<string, CaseEngineCase>
): CommandCenterActivityRow {
	const c = caseById.get(ev.case_id);
	return {
		event_id: String(ev.event_id),
		actor_user_id: String(ev.actor_user_id ?? ''),
		event_type: String(ev.event_type),
		case_id: String(ev.case_id),
		case_identifier: caseIdentifierForEvent(c, ev.case_id),
		occurred_at: String(ev.occurred_at ?? '')
	};
}

export function sortCommandCenterActivityRowsByOccurredDesc(
	rows: CommandCenterActivityRow[]
): CommandCenterActivityRow[] {
	return [...rows].sort((a, b) => {
		const ta = a.occurred_at;
		const tb = b.occurred_at;
		return tb.localeCompare(ta);
	});
}

/**
 * Activity rows from an already-loaded `listCases` result (P131.5-02 bundle: single list fetch).
 */
export async function buildCommandCenterActivityRowsFromCases(
	cases: CaseEngineCase[],
	token: string
): Promise<CommandCenterActivityRow[]> {
	const caseById = new Map(cases.map((c) => [c.id, c]));
	const rows: CommandCenterActivityRow[] = [];

	await Promise.all(
		cases.map(async (c) => {
			const res = await listCaseActivityEvents(c.id, token, {
				limit: COMMAND_CENTER_ACTIVITY_EVENTS_PER_CASE,
				offset: 0
			});
			for (const ev of res.activity_events) {
				rows.push(mapActivityEventToRow(ev, caseById));
			}
		})
	);

	return sortCommandCenterActivityRowsByOccurredDesc(rows);
}

/**
 * Lists cases for unit scope, then GET /cases/:id/activity-events (limit/offset) per case.
 */
export async function fetchCommandCenterActivityRows(
	token: string,
	unit: 'CID' | 'SIU' | 'ALL'
): Promise<CommandCenterActivityRow[]> {
	const cases = await listCases(unit, token);
	return buildCommandCenterActivityRowsFromCases(cases, token);
}
