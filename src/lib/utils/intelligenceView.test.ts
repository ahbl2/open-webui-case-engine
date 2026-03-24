import { describe, expect, it } from 'vitest';
import {
	buildEvidenceCaseGroups,
	groupEntityEvidenceByType,
	mapCaseSearchResultToEvidenceItem,
	mapIntelResultToEvidenceItem,
	type IntelligenceEvidenceItem
} from './intelligenceView';
import type { IntelSearchResult, SearchResultItem } from '$lib/apis/caseEngine';

describe('intelligenceView', () => {
	it('maps intel results to explicit source labels', () => {
		const row: IntelSearchResult = {
			result_type: 'timeline_entry',
			case: { id: 'c1', case_number: 'CID-1', title: 'Case One', unit: 'CID' },
			source: { kind: 'timeline_entry', id: 'e1', occurred_at: '2026-03-24T01:00:00Z' },
			match: { field: 'text', excerpt: 'match excerpt' },
			citation: { label: 'x', case_id: 'c1', source_kind: 'timeline_entry', source_id: 'e1' }
		};
		const out = mapIntelResultToEvidenceItem(row);
		expect(out.sourceType).toBe('timeline');
		expect(out.label).toBe('Timeline');
	});

	it('groups evidence by case then source type', () => {
		const items: IntelligenceEvidenceItem[] = [
			{
				id: 'a1',
				caseId: 'case-a',
				caseNumber: 'CID-1',
				caseTitle: 'A',
				unit: 'CID',
				sourceType: 'timeline',
				sourceKind: 'timeline_entry',
				excerpt: 'one',
				timestamp: '2026-01-01T00:00:00Z',
				label: 'Timeline'
			},
			{
				id: 'a2',
				caseId: 'case-a',
				caseNumber: 'CID-1',
				caseTitle: 'A',
				unit: 'CID',
				sourceType: 'file',
				sourceKind: 'file_excerpt',
				excerpt: 'two',
				timestamp: '2026-01-02T00:00:00Z',
				label: 'File'
			},
			{
				id: 'b1',
				caseId: 'case-b',
				caseNumber: 'SIU-1',
				caseTitle: 'B',
				unit: 'SIU',
				sourceType: 'timeline',
				sourceKind: 'timeline_entry',
				excerpt: 'three',
				timestamp: '2026-01-03T00:00:00Z',
				label: 'Timeline'
			}
		];
		const groups = buildEvidenceCaseGroups(items);
		expect(groups[0].caseId).toBe('case-a');
		expect(groups[0].matchCount).toBe(2);
		expect(groups[0].typeGroups.map((g) => g.type)).toEqual(['timeline', 'file']);
	});

	it('maps case-scoped search results with current case metadata', () => {
		const row: SearchResultItem = {
			type: 'entry',
			caseId: 'ignored',
			id: 'x1',
			snippet: 'snippet',
			sort_time: '2026-01-01T00:00:00Z'
		};
		const out = mapCaseSearchResultToEvidenceItem(row, {
			id: 'case-1',
			caseNumber: 'CID-77',
			caseTitle: 'Current',
			unit: 'CID'
		});
		expect(out.caseId).toBe('case-1');
		expect(out.sourceType).toBe('timeline');
	});

	it('groups entity evidence by backend type key', () => {
		const grouped = groupEntityEvidenceByType([
			{
				id: 'g1',
				caseId: 'case-1',
				caseNumber: 'CID-1',
				caseTitle: 'A',
				unit: 'CID',
				sourceType: 'entity',
				sourceKind: 'graph_entity',
				excerpt: 'person x',
				label: 'Entity'
			}
		]);
		expect(grouped).toHaveLength(1);
		expect(grouped[0].type).toBe('graph_entity');
	});
});
