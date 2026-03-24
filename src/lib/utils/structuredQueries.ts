import type {
	SearchResultItem,
	TimelineEntry,
	TimelineIntelligenceEntry,
	TimelineIntelligenceParams
} from '$lib/apis/caseEngine';

export type StructuredQueryActionId =
	| 'recent_timeline_activity'
	| 'phone_mentions'
	| 'location_mentions'
	| 'person_mentions'
	| 'file_text_hits';

export interface StructuredQueryAction {
	id: StructuredQueryActionId;
	label: string;
	requiresInput: boolean;
	inputLabel?: string;
	inputPlaceholder?: string;
}

export type StructuredQueryPlan =
	| { kind: 'timeline_entries'; limit: number; label: string }
	| {
			kind: 'timeline_intelligence';
			label: string;
			limit: number;
			params: TimelineIntelligenceParams;
	  }
	| { kind: 'case_search'; label: string; limit: number; q: string; resultFilter: 'file' | 'entry' | 'all' };

export interface StructuredQueryResultItem {
	id: string;
	type: 'timeline' | 'file';
	timestamp?: string;
	label: string;
	excerpt: string;
	sourcePath: string;
}

function truncate(value: string, max = 180): string {
	const s = String(value ?? '').trim();
	return s.length <= max ? s : `${s.slice(0, max - 1)}…`;
}

function rankNewest(a?: string, b?: string): number {
	const ta = a ? Date.parse(a) : Number.NaN;
	const tb = b ? Date.parse(b) : Number.NaN;
	const va = Number.isNaN(ta) ? -Infinity : ta;
	const vb = Number.isNaN(tb) ? -Infinity : tb;
	return vb - va;
}

export const STRUCTURED_QUERY_ACTIONS: StructuredQueryAction[] = [
	{
		id: 'recent_timeline_activity',
		label: 'Recent timeline activity',
		requiresInput: false
	},
	{
		id: 'phone_mentions',
		label: 'Find phone mentions',
		requiresInput: true,
		inputLabel: 'Phone value',
		inputPlaceholder: 'Enter phone number (example: 555-111-2222)'
	},
	{
		id: 'location_mentions',
		label: 'Find location mentions',
		requiresInput: true,
		inputLabel: 'Location value',
		inputPlaceholder: 'Enter address or location text'
	},
	{
		id: 'person_mentions',
		label: 'Find person mentions',
		requiresInput: true,
		inputLabel: 'Person value',
		inputPlaceholder: 'Enter person name'
	},
	{
		id: 'file_text_hits',
		label: 'Find file text hits',
		requiresInput: true,
		inputLabel: 'Keyword',
		inputPlaceholder: 'Enter keyword or phrase'
	}
];

export function actionById(id: StructuredQueryActionId): StructuredQueryAction {
	return STRUCTURED_QUERY_ACTIONS.find((a) => a.id === id) ?? STRUCTURED_QUERY_ACTIONS[0];
}

export function buildStructuredQueryPlan(
	actionId: StructuredQueryActionId,
	inputRaw: string
): { ok: true; plan: StructuredQueryPlan } | { ok: false; error: string } {
	const input = inputRaw.trim();
	if (actionId === 'recent_timeline_activity') {
		return {
			ok: true,
			plan: {
				kind: 'timeline_entries',
				limit: 20,
				label: 'Recent timeline activity (current case only)'
			}
		};
	}
	if (!input) {
		if (actionId === 'phone_mentions') {
			return { ok: false, error: 'Enter a phone number to run this query.' };
		}
		if (actionId === 'location_mentions') {
			return { ok: false, error: 'Enter a location value to run this query.' };
		}
		if (actionId === 'person_mentions') {
			return { ok: false, error: 'Enter a person name to run this query.' };
		}
		if (actionId === 'file_text_hits') {
			return { ok: false, error: 'Enter a keyword or phrase to search file text.' };
		}
		return { ok: false, error: 'Enter a value to run this query.' };
	}
	if (actionId === 'phone_mentions') {
		return {
			ok: true,
			plan: {
				kind: 'timeline_intelligence',
				label: `Phone mentions: ${input}`,
				limit: 40,
				params: { phone: input }
			}
		};
	}
	if (actionId === 'location_mentions') {
		return {
			ok: true,
			plan: {
				kind: 'timeline_intelligence',
				label: `Location mentions: ${input}`,
				limit: 40,
				params: { location: input }
			}
		};
	}
	if (actionId === 'person_mentions') {
		return {
			ok: true,
			plan: {
				kind: 'timeline_intelligence',
				label: `Person mentions: ${input}`,
				limit: 40,
				params: { person: input }
			}
		};
	}
	return {
		ok: true,
		plan: {
			kind: 'case_search',
			label: `File text hits: ${input}`,
			limit: 40,
			q: input,
			resultFilter: 'file'
		}
	};
}

export function mapTimelineEntriesToStructuredResults(
	rows: TimelineEntry[],
	caseId: string,
	limit: number
): StructuredQueryResultItem[] {
	return [...rows]
		.sort((a, b) => rankNewest(a.created_at, b.created_at))
		.slice(0, limit)
		.map((row) => ({
			id: row.id,
			type: 'timeline',
			timestamp: row.occurred_at,
			label: row.type || 'Timeline',
			excerpt: truncate(row.text_cleaned?.trim() || row.text_original || 'Timeline entry'),
			sourcePath: `/case/${caseId}/timeline`
		}));
}

export function mapTimelineIntelToStructuredResults(
	rows: TimelineIntelligenceEntry[],
	caseId: string,
	limit: number
): StructuredQueryResultItem[] {
	return [...rows]
		.sort((a, b) => rankNewest(a.occurred_at, b.occurred_at))
		.slice(0, limit)
		.map((row) => ({
			id: row.id,
			type: 'timeline',
			timestamp: row.occurred_at,
			label: row.type || 'Timeline',
			excerpt: truncate(row.text_cleaned?.trim() || row.text_original || 'Timeline entry'),
			sourcePath: `/case/${caseId}/timeline`
		}));
}

export function mapCaseSearchToStructuredResults(
	rows: SearchResultItem[],
	caseId: string,
	limit: number,
	filter: 'file' | 'entry' | 'all'
): StructuredQueryResultItem[] {
	const filtered =
		filter === 'all' ? rows : rows.filter((row) => (filter === 'file' ? row.type === 'file' : row.type === 'entry'));
	return [...filtered]
		.sort((a, b) => rankNewest(a.sort_time, b.sort_time))
		.slice(0, limit)
		.map((row) => ({
			id: row.id,
			type: row.type === 'file' ? 'file' : 'timeline',
			timestamp: row.sort_time,
			label: row.type === 'file' ? 'File excerpt' : 'Timeline hit',
			excerpt: truncate(row.snippet || 'Search hit'),
			sourcePath: row.type === 'file' ? `/case/${caseId}/files` : `/case/${caseId}/timeline`
		}));
}

