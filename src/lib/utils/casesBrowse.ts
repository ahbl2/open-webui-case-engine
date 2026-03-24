import type { CaseEngineCase } from '$lib/apis/caseEngine';

export type CasesBrowseSort =
	| 'created_desc'
	| 'created_asc'
	| 'case_number_asc'
	| 'incident_date_desc'
	| 'incident_date_asc';

export type CasesBrowseOptions = {
	unit: 'ALL' | 'CID' | 'SIU';
	status: 'ALL' | 'OPEN' | 'CLOSED';
	searchQuery: string;
	sortBy: CasesBrowseSort;
};

function toEpoch(value: unknown): number {
	if (typeof value !== 'string' || !value.trim()) return 0;
	const t = Date.parse(value);
	return Number.isFinite(t) ? t : 0;
}

function incidentDateEpoch(value: unknown): number | null {
	if (typeof value !== 'string' || !value.trim()) return null;
	const t = Date.parse(`${value}T00:00:00.000Z`);
	return Number.isFinite(t) ? t : null;
}

function stableCaseTieBreak(a: CaseEngineCase, b: CaseEngineCase): number {
	const byNumber = String(a.case_number ?? '').localeCompare(String(b.case_number ?? ''), undefined, {
		sensitivity: 'base'
	});
	if (byNumber !== 0) return byNumber;
	return String(a.id ?? '').localeCompare(String(b.id ?? ''), undefined, {
		sensitivity: 'base'
	});
}

function compareIncidentDates(a: CaseEngineCase, b: CaseEngineCase, newestFirst: boolean): number {
	const aDate = incidentDateEpoch(a.incident_date);
	const bDate = incidentDateEpoch(b.incident_date);
	if (aDate === null && bDate === null) return stableCaseTieBreak(a, b);
	if (aDate === null) return 1;
	if (bDate === null) return -1;
	const byDate = newestFirst ? bDate - aDate : aDate - bDate;
	if (byDate !== 0) return byDate;
	return stableCaseTieBreak(a, b);
}

export function applyCaseBrowse(cases: CaseEngineCase[], options: CasesBrowseOptions): CaseEngineCase[] {
	const q = options.searchQuery.trim().toLowerCase();
	const filtered = cases.filter((c) => {
		const unit = String(c.unit ?? '').toUpperCase();
		if (options.unit !== 'ALL' && unit !== options.unit) return false;
		const status = String(c.status ?? '').toUpperCase();
		if (options.status !== 'ALL' && status !== options.status) return false;
		if (!q) return true;
		const numberText = String(c.case_number ?? '').toLowerCase();
		const titleText = String(c.title ?? '').toLowerCase();
		return numberText.includes(q) || titleText.includes(q);
	});

	const rows = [...filtered];
	if (options.sortBy === 'created_desc') {
		rows.sort((a, b) => {
			const byCreated = toEpoch(b.created_at) - toEpoch(a.created_at);
			if (byCreated !== 0) return byCreated;
			return stableCaseTieBreak(a, b);
		});
	} else if (options.sortBy === 'created_asc') {
		rows.sort((a, b) => {
			const byCreated = toEpoch(a.created_at) - toEpoch(b.created_at);
			if (byCreated !== 0) return byCreated;
			return stableCaseTieBreak(a, b);
		});
	} else if (options.sortBy === 'case_number_asc') {
		rows.sort((a, b) => stableCaseTieBreak(a, b));
	} else if (options.sortBy === 'incident_date_desc') {
		rows.sort((a, b) => compareIncidentDates(a, b, true));
	} else if (options.sortBy === 'incident_date_asc') {
		rows.sort((a, b) => compareIncidentDates(a, b, false));
	}
	return rows;
}
