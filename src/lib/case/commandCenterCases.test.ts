/**
 * P131-02 — Pure mapping and ordering for Command Center case rows.
 */
import { describe, expect, it } from 'vitest';
import {
	mapCaseEngineCaseToRow,
	sortCommandCenterRowsByLastTimelineDesc,
	type CommandCenterCaseRow
} from './commandCenterCases';
import type { CaseEngineCase } from '$lib/apis/caseEngine';

const sampleCase = (over?: Partial<CaseEngineCase>): CaseEngineCase => ({
	id: 'c1',
	case_number: '2025-001',
	title: 'T',
	unit: 'CID',
	status: 'OPEN',
	...over
});

describe('commandCenterCases', () => {
	it('mapCaseEngineCaseToRow preserves explicit fields only', () => {
		const r = mapCaseEngineCaseToRow(sampleCase(), '2026-01-01T00:00:00.000Z');
		expect(r).toEqual({
			case_id: 'c1',
			case_number: '2025-001',
			title: 'T',
			unit: 'CID',
			status: 'OPEN',
			last_timeline_entry_occurred_at: '2026-01-01T00:00:00.000Z'
		});
		expect(Object.keys(r).sort()).toEqual(
			[
				'case_id',
				'case_number',
				'title',
				'unit',
				'status',
				'last_timeline_entry_occurred_at'
			].sort()
		);
	});

	it('sortCommandCenterRowsByLastTimelineDesc orders by ISO timestamp descending; nulls last', () => {
		const rows: CommandCenterCaseRow[] = [
			mapCaseEngineCaseToRow(sampleCase({ id: 'a' }), '2025-01-01T00:00:00.000Z'),
			mapCaseEngineCaseToRow(sampleCase({ id: 'b' }), '2026-01-01T00:00:00.000Z'),
			mapCaseEngineCaseToRow(sampleCase({ id: 'c' }), null)
		];
		const sorted = sortCommandCenterRowsByLastTimelineDesc(rows);
		expect(sorted.map((x) => x.case_id)).toEqual(['b', 'a', 'c']);
	});
});
