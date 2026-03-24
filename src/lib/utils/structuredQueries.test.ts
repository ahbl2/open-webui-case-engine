import { describe, expect, it } from 'vitest';
import {
	STRUCTURED_QUERY_ACTIONS,
	buildStructuredQueryPlan,
	mapCaseSearchToStructuredResults,
	mapTimelineEntriesToStructuredResults,
	mapTimelineIntelToStructuredResults
} from './structuredQueries';
import type { SearchResultItem, TimelineEntry, TimelineIntelligenceEntry } from '$lib/apis/caseEngine';

describe('structuredQueries', () => {
	it('defines explicit non-agentic quick query actions', () => {
		expect(STRUCTURED_QUERY_ACTIONS.map((a) => a.id)).toEqual([
			'recent_timeline_activity',
			'phone_mentions',
			'location_mentions',
			'person_mentions',
			'file_text_hits'
		]);
		expect(STRUCTURED_QUERY_ACTIONS.find((a) => a.id === 'phone_mentions')?.label).toBe('Find phone mentions');
		expect(STRUCTURED_QUERY_ACTIONS.find((a) => a.id === 'phone_mentions')?.inputPlaceholder).toBe(
			'Enter phone number (example: 555-111-2222)'
		);
		expect(STRUCTURED_QUERY_ACTIONS.find((a) => a.id === 'file_text_hits')?.inputPlaceholder).toBe(
			'Enter keyword or phrase'
		);
	});

	it('builds deterministic plans and enforces required input', () => {
		const noInput = buildStructuredQueryPlan('phone_mentions', '  ');
		expect(noInput.ok).toBe(false);
		if (!noInput.ok) {
			expect(noInput.error).toBe('Enter a phone number to run this query.');
		}
		const noLocation = buildStructuredQueryPlan('location_mentions', '');
		expect(noLocation.ok).toBe(false);
		if (!noLocation.ok) {
			expect(noLocation.error).toBe('Enter a location value to run this query.');
		}
		const noPerson = buildStructuredQueryPlan('person_mentions', '');
		expect(noPerson.ok).toBe(false);
		if (!noPerson.ok) {
			expect(noPerson.error).toBe('Enter a person name to run this query.');
		}
		const noFileTerm = buildStructuredQueryPlan('file_text_hits', '');
		expect(noFileTerm.ok).toBe(false);
		if (!noFileTerm.ok) {
			expect(noFileTerm.error).toBe('Enter a keyword or phrase to search file text.');
		}
		const phone = buildStructuredQueryPlan('phone_mentions', '5551112222');
		expect(phone.ok).toBe(true);
		if (phone.ok) {
			expect(phone.plan.kind).toBe('timeline_intelligence');
			if (phone.plan.kind === 'timeline_intelligence') {
				expect(phone.plan.params.phone).toBe('5551112222');
			}
		}
		const recent = buildStructuredQueryPlan('recent_timeline_activity', '');
		expect(recent.ok).toBe(true);
		if (recent.ok) expect(recent.plan.kind).toBe('timeline_entries');
	});

	it('maps timeline and search responses to structured, linked result rows', () => {
		const timelineRows: TimelineEntry[] = [
			{
				id: 't1',
				case_id: 'c1',
				occurred_at: '2026-03-24T11:00:00Z',
				created_at: '2026-03-24T11:01:00Z',
				created_by: 'u1',
				type: 'CALL',
				location_text: null,
				tags: [],
				text_original: 'Call entry',
				text_cleaned: null,
				deleted_at: null
			}
		];
		const intelRows: TimelineIntelligenceEntry[] = [
			{
				id: 'i1',
				occurred_at: '2026-03-24T10:00:00Z',
				type: 'SURVEILLANCE',
				location_text: null,
				text_original: 'Intel row text',
				text_cleaned: null
			}
		];
		const searchRows: SearchResultItem[] = [
			{
				type: 'file',
				caseId: 'c1',
				id: 'f1',
				snippet: 'keyword excerpt',
				sort_time: '2026-03-24T09:00:00Z'
			}
		];
		expect(mapTimelineEntriesToStructuredResults(timelineRows, 'c1', 10)[0].sourcePath).toBe('/case/c1/timeline');
		expect(mapTimelineIntelToStructuredResults(intelRows, 'c1', 10)[0].sourcePath).toBe('/case/c1/timeline');
		expect(mapCaseSearchToStructuredResults(searchRows, 'c1', 10, 'file')[0].sourcePath).toBe('/case/c1/files');
	});
});

