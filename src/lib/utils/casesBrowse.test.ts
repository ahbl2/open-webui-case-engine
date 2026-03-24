import { describe, expect, it } from 'vitest';
import { applyCaseBrowse } from './casesBrowse';
import type { CaseEngineCase } from '$lib/apis/caseEngine';

const cases: CaseEngineCase[] = [
	{
		id: '1',
		case_number: 'CID-100',
		title: 'Alpha theft',
		unit: 'CID',
		status: 'OPEN',
		created_at: '2026-03-20T12:00:00.000Z',
		incident_date: '2026-03-19'
	},
	{
		id: '2',
		case_number: 'SIU-200',
		title: 'Bravo fraud',
		unit: 'SIU',
		status: 'CLOSED',
		created_at: '2026-03-22T12:00:00.000Z',
		incident_date: '2026-03-21'
	},
	{
		id: '3',
		case_number: 'CID-050',
		title: 'Zeta follow-up',
		unit: 'CID',
		status: 'OPEN',
		created_at: '2026-03-18T12:00:00.000Z',
		incident_date: null
	},
	{
		id: '4',
		case_number: 'CID-075',
		title: 'No date another',
		unit: 'CID',
		status: 'OPEN',
		created_at: '2026-03-19T12:00:00.000Z',
		incident_date: null
	}
];

describe('applyCaseBrowse', () => {
	it('filters by unit and status', () => {
		const out = applyCaseBrowse(cases, {
			unit: 'CID',
			status: 'OPEN',
			searchQuery: '',
			sortBy: 'created_desc'
		});
		expect(out.map((c) => c.id)).toEqual(['1', '4', '3']);
	});

	it('searches case number and title', () => {
		const byNumber = applyCaseBrowse(cases, {
			unit: 'ALL',
			status: 'ALL',
			searchQuery: 'siu-200',
			sortBy: 'created_desc'
		});
		expect(byNumber.map((c) => c.id)).toEqual(['2']);

		const byTitle = applyCaseBrowse(cases, {
			unit: 'ALL',
			status: 'ALL',
			searchQuery: 'alpha',
			sortBy: 'created_desc'
		});
		expect(byTitle.map((c) => c.id)).toEqual(['1']);
	});

	it('sorts by incident date newest and oldest', () => {
		const newest = applyCaseBrowse(cases, {
			unit: 'ALL',
			status: 'ALL',
			searchQuery: '',
			sortBy: 'incident_date_desc'
		});
		expect(newest.map((c) => c.id)).toEqual(['2', '1', '3', '4']);

		const oldest = applyCaseBrowse(cases, {
			unit: 'ALL',
			status: 'ALL',
			searchQuery: '',
			sortBy: 'incident_date_asc'
		});
		expect(oldest.map((c) => c.id)).toEqual(['1', '2', '3', '4']);
	});

	it('keeps no-incident-date rows in deterministic order for both incident-date sorts', () => {
		const newest = applyCaseBrowse(cases, {
			unit: 'ALL',
			status: 'ALL',
			searchQuery: '',
			sortBy: 'incident_date_desc'
		});
		const newestNoDate = newest.filter((c) => !c.incident_date).map((c) => c.case_number);
		expect(newestNoDate).toEqual(['CID-050', 'CID-075']);

		const oldest = applyCaseBrowse(cases, {
			unit: 'ALL',
			status: 'ALL',
			searchQuery: '',
			sortBy: 'incident_date_asc'
		});
		const oldestNoDate = oldest.filter((c) => !c.incident_date).map((c) => c.case_number);
		expect(oldestNoDate).toEqual(['CID-050', 'CID-075']);
	});
});
